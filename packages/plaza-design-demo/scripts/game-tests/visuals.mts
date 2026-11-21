/**
 * Current-renderer snapshots. Compare by default; --accept explicitly replaces expectations.
 * Runs headless Chrome by default and exits non-zero on any difference; --serve keeps the old manual mode
 * (print a URL, open it in your own browser).
 */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath}from'node:url';import{build}from'esbuild';
import{launch}from'../opening-playthrough/cdp.mjs';
import{sourceDocuments}from'../../src/ssg/game/authoring/source-documents';import{nativeSceneAdapters}from'../../src/ssg/game/authoring/scene-adapters';
const here=path.dirname(fileURLToPath(import.meta.url)),pkg=path.resolve(here,'../..'),root=path.resolve(pkg,'../..');
const accept=process.argv.includes('--accept'),platform=process.env.GAME_VISUAL_PLATFORM??process.platform,expected=path.join(here,'fixtures/visuals',platform),output=path.join(root,'.game-test-output/visuals');fs.mkdirSync(output,{recursive:true});
const serveOnly=process.argv.includes('--serve');
let finished:(results:any[])=>void=()=>{};const done=new Promise<any[]>(resolve=>{finished=resolve;});
const introOnly=process.argv.includes('--intro-only');if(introOnly&&accept)throw Error('Intro lifecycle comparison has no stored expectations to accept');
if(accept)fs.mkdirSync(expected,{recursive:true});
// Text and curve antialiasing differ by operating system, so each platform keeps its own approved images (see README).
else if(!introOnly&&!fs.existsSync(expected))throw Error(`No approved images for platform "${platform}" in ${path.relative(root,expected)}. Inspect the current rendering (--serve) and run --accept once on this platform.`);
const samples=Object.keys(nativeSceneAdapters).map(scene=>({id:scene+'-day',scene,time:0,minute:580,weather:'clear',reduced:false,hack:false}));
samples.push(...['downtown','harbor','mall','beach'].map(scene=>({id:scene+'-night-rain',scene,time:2.5,minute:1200,weather:'rain',reduced:false,hack:false})),{id:'sandbox-hack-reduced',scene:'sandbox',time:1,minute:580,weather:'clear',reduced:true,hack:true});
if(introOnly)samples.length=0;
await build({entryPoints:[path.join(here,'visual-browser.ts')],outfile:path.join(output,'visuals.js'),bundle:true,platform:'browser',format:'iife',target:'es2022',logLevel:'warning'});
const html='<!doctype html><meta charset="utf-8"><title>Current game visual contracts</title><style>body{background:#151319;color:#eee;font:14px monospace}section{display:inline-grid;margin:8px}canvas{display:block}</style><h1>Current game visual contracts</h1><pre>Rendering...</pre><script src="/visuals.js"></script>';
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url!,'http://127.0.0.1'),route=url.pathname;
 const send=(value:string|Buffer,type='text/plain')=>{res.setHeader('Content-Type',type);res.end(value);};
 if(req.method==='POST'){
  if(req.headers.origin!==`http://127.0.0.1:${(server.address()as any).port}`)throw Error('Origin refused');
  const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw Error('Too large');chunks.push(chunk);}const body=Buffer.concat(chunks);
  if(route==='/results'){const results=JSON.parse(body.toString());fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(`${accept?'ACCEPT':'COMPARE'} ${results.filter((r:any)=>r.ok).length}/${results.length}`);send('Recorded');finished(results);return;}
  const id=route.startsWith('/accept/')?route.slice(8):'';if(!accept||!samples.some(s=>s.id===id))throw Error('Not an accepted snapshot');if(body.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG required');fs.writeFileSync(path.join(expected,id+'.png'),body);send('Accepted');return;
 }
 if(req.method!=='GET')throw Error('Method refused');
 if(route==='/'){send(html,'text/html');return;}if(route==='/config'){send(JSON.stringify({accept,introOnly,samples}),'application/json');return;}
 if(route==='/visuals.js'){send(fs.readFileSync(path.join(output,'visuals.js')),'text/javascript');return;}
 if(route.startsWith('/source/')){const id=decodeURIComponent(route.slice(8)),doc=sourceDocuments.find(d=>d.id===id&&d.kind==='composition');if(!doc)throw Error('Unknown composition');send(fs.readFileSync(path.join(pkg,'src/ssg/game',doc.file)),'application/json');return;}
 if(route.startsWith('/expected/')){const name=route.slice(10);if(!samples.some(s=>s.id+'.png'===name))throw Error('Unknown image');send(fs.readFileSync(path.join(expected,name)),'image/png');return;}
 if(/^\/fonts\/ibm-plex-mono-latin-(400|500|600|700)-normal\.woff2$/.test(route)){send(fs.readFileSync(path.join(root,'packages/plaza-design-core',route.slice(1))),'font/woff2');return;}
 res.statusCode=404;send('Unknown route');
 }catch(error){res.statusCode=400;res.end(String(error));}});
const port=await new Promise<number>(resolve=>server.listen(Number(process.env.GAME_VISUAL_PORT??0),'127.0.0.1',()=>resolve((server.address()as any).port)));
const url=`http://127.0.0.1:${port}/`;
if(serveOnly){
 console.log(`Open ${url} (${accept?'ACCEPT current pixels':'COMPARE; never writes expected images'})`);
}else{
 console.log(`Headless ${accept?'ACCEPT':'COMPARE'} against ${path.relative(root,expected)}`);
 const browser=await launch({port:Number(process.env.GAME_VISUAL_CDP_PORT??9356),size:[1280,720]});
 let results:any[]=[];
 try{
  await browser.send('Page.navigate',{url});
  const timeout=Number(process.env.GAME_VISUAL_TIMEOUT_MS??180000);
  results=await Promise.race([done,new Promise<never>((_,reject)=>setTimeout(async()=>reject(Error(`No results after ${timeout} ms; the page said: `+String(await browser.eval("document.querySelector('pre')?.textContent?.slice(0,400)").catch(()=>'?')))),timeout))]);
 if(!accept){
  // Keep the rendered pixels of every failed view next to results.json, so a difference can be inspected without a browser.
  const failed=results.filter(r=>!r.ok&&!r.error).map(r=>r.id);fs.rmSync(path.join(output,'actual'),{recursive:true,force:true});
  if(failed.length){fs.mkdirSync(path.join(output,'actual'),{recursive:true});
   const shots:Record<string,string>=await browser.eval(`Object.fromEntries([...document.querySelectorAll('section')].filter(s=>${JSON.stringify(failed)}.includes(s.firstChild.textContent)).map(s=>[s.firstChild.textContent,s.querySelector('canvas').toDataURL('image/png')]))`);
   for(const[id,data]of Object.entries(shots))fs.writeFileSync(path.join(output,'actual',id+'.png'),Buffer.from(data.split(',')[1],'base64'));}
 }
 }finally{await browser.close();server.close();}
 for(const r of results.filter(r=>!r.ok))console.log(`  FAIL ${r.id}: ${r.error??`${r.differences} px differ in ${JSON.stringify(r.differenceBounds)}`}`);
 console.log(`Results: ${path.relative(root,path.join(output,'results.json'))}`);
 process.exit(results.length&&results.every(r=>r.ok)?0:1);
}
