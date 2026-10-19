/** Local technical fixture only. Archives browser-produced raster results in the ignored evidence dir. */
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const port=Number(process.argv[2]??4205);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Valid loopback port required');
const root=path.resolve('../../.scene-system/all-game-pixel-check'),origin='http://127.0.0.1:'+port;
const ids=new Set(JSON.parse(fs.readFileSync('scripts/scene-system/fixtures/all-game-initial-inventory.json','utf8')).rows.map((r:any)=>r.id));
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url??'/',origin);
  if(req.method==='POST'&&url.pathname==='/report'){
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'){res.writeHead(403);res.end('Only this fixture may archive a report');return;}
   let bytes=0,body='';for await(const chunk of req){bytes+=chunk.length;if(bytes>256000)throw new Error('Report size limit');body+=chunk;}
   const report=JSON.parse(body),hash=/^sha256:([0-9a-f]{64})$/.exec(report.source??'');
   if(!hash||report.scenes!==ids.size||report.cases!==ids.size*5||report.rows?.length!==report.cases||!['PASS','FAIL'].includes(report.status))throw new Error('Invalid raster evidence');
   const pairs=new Set<string>();for(const row of report.rows){const pair=row.scene+':'+row.case;if(!ids.has(row.scene)||!Number.isInteger(row.case)||row.case<0||row.case>4||pairs.has(pair)||!Number.isInteger(row.different)||row.different<0||!Number.isInteger(row.maxDelta)||row.maxDelta<0||row.maxDelta>255||(row.error!==null&&typeof row.error!=='string'))throw new Error('Invalid raster row');pairs.add(pair);}
   if(report.mapRows!==undefined){if(report.mapCases!==8||!Array.isArray(report.mapRows)||report.mapRows.length!==8)throw new Error('Invalid map evidence');const cases=new Set<number>();for(const row of report.mapRows){if(!Number.isInteger(row.case)||row.case<0||row.case>7||cases.has(row.case)||typeof row.name!=='string'||!Number.isInteger(row.different)||row.different<0||!Number.isInteger(row.maxDelta)||row.maxDelta<0||row.maxDelta>255||(row.error!==null&&typeof row.error!=='string'))throw new Error('Invalid map row');cases.add(row.case);}}
   if(report.boundRows!==undefined){if(report.boundCases!==20||report.boundRows?.length!==20)throw new Error('Invalid bound metro evidence');const pairs=new Set();for(const r of report.boundRows){const pair=r.scene+':'+r.case;if(!['metro','galleriaStation','harborStation','train'].includes(r.scene)||!Number.isInteger(r.case)||r.case<0||r.case>4||pairs.has(pair)||!Number.isInteger(r.different)||r.different<0||!Number.isInteger(r.maxDelta)||r.maxDelta<0||r.maxDelta>255||(r.error!==null&&typeof r.error!=='string'))throw new Error('Invalid bound metro row');pairs.add(pair);}}
   if(report.deviceRows!==undefined){if(![45,50].includes(report.deviceCases)||report.deviceRows?.length!==report.deviceCases)throw new Error('Invalid device-source evidence');const pairs=new Set();for(const r of report.deviceRows){const pair=r.scene+':'+r.case;if(!['capsule','yard','downtown','moth','beach','laundromat','library','stacks','train',...(report.deviceCases===50?['sandbox']:[])].includes(r.scene)||!Number.isInteger(r.case)||r.case<0||r.case>4||pairs.has(pair)||!Number.isInteger(r.different)||r.different<0||!Number.isInteger(r.maxDelta)||r.maxDelta<0||r.maxDelta>255||(r.error!==null&&typeof r.error!=='string'))throw new Error('Invalid device-source row');pairs.add(pair);}}
   const success=(report.deviceRows??[]).every((r:any)=>r.error===null&&r.different===0)&&(report.boundRows??[]).every((r:any)=>r.error===null&&r.different===0)&&report.rows.every((r:any)=>r.error===null&&r.different===0)&&(report.mapRows??[]).every((r:any)=>r.error===null&&r.different===0);if((report.status==='PASS')!==success)throw new Error('Inconsistent raster status');
   const evidence=path.join(root,'evidence');fs.mkdirSync(evidence,{recursive:true});
   const file=hash[1]+'-'+Date.now()+'.json';fs.writeFileSync(path.join(evidence,file),JSON.stringify({...report,recordedAt:new Date().toISOString(),userAgent:req.headers['user-agent']},null,2)+'\n',{flag:'wx'});
   res.writeHead(201,{'Content-Type':'text/plain'});res.end('evidence/'+file);return;
  }
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  const relative=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!/^(index\.html|check\.js|fonts\/ibm-plex-mono-latin-(400|500|600|700)-normal\.woff2)$/.test(relative)){res.writeHead(404);res.end();return;}
  const target=path.resolve(root,relative);if(!target.startsWith(root+path.sep))throw new Error('Outside fixture');
  res.writeHead(200,{'Content-Type':relative.endsWith('.js')?'application/javascript':relative.endsWith('.woff2')?'font/woff2':'text/html','Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);
 }catch(error){res.writeHead(400,{'Content-Type':'text/plain'});res.end(String(error));}
});
server.listen(port,'127.0.0.1',()=>console.log('Native raster fixture: '+origin));
process.on('SIGINT',()=>server.close());process.on('SIGTERM',()=>server.close());
