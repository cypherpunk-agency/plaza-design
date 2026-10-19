import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
import {validateReport} from './validate-report';
const port=Number(process.argv[2]??4210);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Valid loopback port required');
const root=path.resolve('../../.performance/native-workloads'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')),origin='http://127.0.0.1:'+port;
const run=path.join(root,'recordings','run-'+Date.now());fs.mkdirSync(run,{recursive:true});fs.copyFileSync(path.join(root,'manifest.json'),path.join(run,'manifest.json'));
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url??'/',origin);
 if(req.method==='POST'&&url.pathname==='/report'){
  if(req.headers.origin!==origin||req.headers['content-type']!=='application/json')throw new Error('Only this local runner may archive reports');let bytes=0,body='';for await(const chunk of req){bytes+=chunk.length;if(bytes>64000000)throw new Error('Report size limit');body+=chunk;}
  const report=JSON.parse(body),quality=validateReport(report,manifest.source),file=(quality.smoke?'smoke-':'')+quality.workload+'-'+quality.repeat+'.json';fs.writeFileSync(path.join(run,file),JSON.stringify({...report,quality,harness:manifest.harness,recordedAt:new Date().toISOString()})+'\n',{flag:'wx'});res.writeHead(201,{'Content-Type':'application/json'});res.end(JSON.stringify({file:path.basename(run)+'/'+file,quality}));return;
 }
 if(req.method!=='GET')throw new Error('Unsupported method');const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!['index.html','runner.js','frame.html','frame.js','manifest.json'].includes(file)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':'text/html','Cache-Control':'no-store'});fs.createReadStream(path.join(root,file)).pipe(res);
 }catch(e){res.writeHead(400,{'Content-Type':'text/plain'});res.end(String(e));}});
server.listen(port,'127.0.0.1',()=>console.log('Local performance runner: '+origin+'; evidence '+run));process.on('SIGINT',()=>server.close());process.on('SIGTERM',()=>server.close());
