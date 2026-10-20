/** Current game contracts. Each check runs in a fresh process; output is disposable. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(here,'../..'));
const args=process.argv.slice(2), selectors=args.filter(a=>!a.startsWith('--'));
if(args.some(a=>a.startsWith('--')&&!['--list'].includes(a)))throw Error('Supported option: --list');
const checks=fs.readdirSync(here).filter(n=>/^check-.*\.mts$/.test(n)).sort();
const selected=selectors.length?checks.filter(n=>selectors.some(s=>n.includes(s))):checks;
if(!selected.length)throw Error('No checks match: '+selectors.join(', '));
if(args.includes('--list')){console.log(selected.join('\n'));process.exit(0);}
const output=path.resolve('../../.game-test-output');fs.mkdirSync(output,{recursive:true});fs.mkdirSync(path.join(output,'evidence'),{recursive:true});
const results:{check:string;ok:boolean;milliseconds:number}[]=[];
let next=0;
async function worker(){while(next<selected.length){
 const check=selected[next++],start=Date.now();
 const result=await new Promise<{ok:boolean;log:string}>(resolve=>{
  const child=spawn(process.execPath,['--import','tsx',path.join(here,check)],{stdio:['ignore','pipe','pipe']});
  let log='',settled=false;
  const finish=(ok:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);resolve({ok,log});};
  child.stdout.on('data',value=>log+=value);child.stderr.on('data',value=>log+=value);
  child.on('error',error=>{log+=error.message;finish(false);});child.on('close',code=>finish(code===0));
  const timer=setTimeout(()=>{log+='\nTimed out after 600 seconds';child.kill();finish(false);},600000);
 });
 fs.writeFileSync(path.join(output,check+'.log'),result.log);
 results.push({check,ok:result.ok,milliseconds:Date.now()-start});
 console.log(`${result.ok?'PASS':'FAIL'} ${check}`);
 if(!result.ok)console.error(result.log.slice(-2000));
}}
// Checks own distinct scratch directories; each has a separate JS process and source-store copy.
await Promise.all(Array.from({length:3},()=>worker()));
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
console.log(`${results.filter(r=>r.ok).length}/${results.length} checks passed. Logs: ${output}`);
if(results.some(r=>!r.ok))process.exitCode=1;
