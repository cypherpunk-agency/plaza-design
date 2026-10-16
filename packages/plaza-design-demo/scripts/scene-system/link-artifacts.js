/** Final-bundle evidence linkage by actual RGBA byte comparison. No renderer or PNG regeneration. */
import {decodeRgbaPNG} from './capture-artifacts.js';
const now=()=>new Date().getTime();
const assert=(v,m)=>{if(!v)throw new Error(m);};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value)),b=>b.toString(16).padStart(2,'0')).join('');
const encode=value=>new TextEncoder().encode(JSON.stringify(value));
const pin=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const name=v=>{assert(typeof v==='string'&&/^[a-zA-Z0-9_.-]+$/.test(v),'Unsafe evidence name');return v;};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const allowed=new Set(['render','sequence','composedMap','map','harborCraneCall','flight']);
async function bytes(url,expected){const response=await fetch(url,{cache:'no-store'});assert(response.ok,`${url}: HTTP ${response.status}`);const value=await response.arrayBuffer(),sha256=await hash(value);if(expected!==undefined)assert(pin(expected)&&sha256===expected,`${url}: immutable file pin changed`);return{value,sha256};}
async function read(url,expected){const value=await bytes(url,expected);return{...value,document:JSON.parse(new TextDecoder().decode(value.value))};}
async function optional(url){const response=await fetch(url,{cache:'no-store'});if(response.status===404)return null;assert(response.ok,`${url}: HTTP ${response.status}`);return response.json();}
async function write(file,data){const response=await fetch('/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name(file),data:JSON.stringify(data)})});assert(response.ok,`Evidence ${file}: HTTP ${response.status} ${await response.text()}`);}
function sameOrigin(value){const url=new URL(value,location.href);assert(url.origin===location.origin,'Evidence and frames must use this loopback origin');return url;}
function bundleURL(value){const url=sameOrigin(value);url.pathname=url.pathname.replace(/\.html$/,'.js');url.search='';return url.href;}
async function makeFrame(url,viewport,environment){const node=document.createElement('iframe');node.width=String(viewport.width);node.height=String(viewport.height);Object.assign(node.style,{position:'fixed',left:'-20000px',top:'0',width:viewport.width+'px',height:viewport.height+'px',border:'0'});node.src=url.href;document.body.append(node);const start=now();try{while(!node.contentWindow?.fixtureReady){assert(now()-start<25000,'Final fixture initialization timed out');await delay(25);}const win=node.contentWindow;await win.document.fonts.ready;for(const key of ['userAgent','dpr','fonts'])assert(win.fixture.environment()[key]===environment[key],`Final fixture ${key} differs from pinned environment`);assert(environment.fonts==='loaded','Fonts are not loaded');for(const weight of [400,500,600,700])assert(win.document.fonts.check(`${weight} 16px "IBM Plex Mono"`),`Font weight ${weight} missing`);assert(win.innerWidth===viewport.width&&win.innerHeight===viewport.height,'Final fixture viewport changed');return{node,fixture:win.fixture};}catch(error){node.remove();throw error;}}
function capture(value){assert(value&&Number.isInteger(value.width)&&Number.isInteger(value.height)&&value.width>0&&value.height>0&&value.rgba?.length===value.width*value.height*4,'Final fixture did not return actual RGBA capture');return{width:value.width,height:value.height,rgba:new Uint8ClampedArray(value.rgba)};}

/**
 * const link=await createFinalArtifactLinks({run:'S7-final-links-animations-v1',
 *   priorCompletion:'S7-artifact-animations-20261016-v1-complete.json',
 *   priorCompletionSHA256:'PINNED JSON SHA256',finalAfterURL:'/candidate-final-g4.html',
 *   finalBundleSHA256:'PINNED FINAL JS SHA256'});
 * await link.chunk({maxCases:100,maxMillis:18000}); // Repeat; progress also reports prefix replay.
 * await link.finish();await link.close();
 * A resumed run replays every prior call, asserting durable final RGBA hashes before new work.
 */
export async function createFinalArtifactLinks(config){
 assert(location.hostname==='127.0.0.1','Use the isolated loopback fixture origin');name(config.run);name(config.priorCompletion);assert(pin(config.priorCompletionSHA256)&&pin(config.finalBundleSHA256),'Pinned prior completion/final bundle SHA256 required');
 const evidence=sameOrigin(config.evidenceURL??'/evidence/');assert(evidence.pathname.endsWith('/'),'Evidence URL must end with /');const evidenceURL=file=>new URL(name(file),evidence).href;
 const priorCompletion=await read(evidenceURL(config.priorCompletion),config.priorCompletionSHA256),footer=priorCompletion.document;
 assert(footer.differentPixels===0&&footer.allBeforeHashesMatchedImmutableManifest===true&&footer.actualIndependentAfterCaptures===true&&footer.sourcePinsRecheckedAtFinish===true,'Prior capture is not a completed, verified original comparison');
 const priorHeader=await read(evidenceURL(footer.header)),header=priorHeader.document,{fingerprint:priorFingerprint,...priorDescription}=header;
 assert(await hash(encode(priorDescription))===priorFingerprint&&footer.fingerprint===priorFingerprint,'Prior header fingerprint changed');
 const expectedFile=await read(sameOrigin(header.expectedManifest.url),header.expectedManifest.sha256),expectedDoc=expectedFile.document,expectedRows=Array.isArray(expectedDoc)?expectedDoc:expectedDoc.results;
 assert(Array.isArray(expectedRows),'Missing immutable expected rows');const expected=new Map(expectedRows.map(row=>[row.id,row[header.expectedManifest.pixelHashKey??'hash']]));assert(expected.size===expectedRows.length,'Duplicate immutable expected ids');
 const cases=header.cases,rows=[];assert(footer.count===cases.length,'Prior capture coverage count changed');
 for(const file of footer.chunks){const part=(await read(evidenceURL(file))).document;assert(part.fingerprint===priorFingerprint&&part.start===rows.length&&part.records.length,'Prior chunks are not contiguous');rows.push(...part.records);assert(part.end===rows.length,'Prior chunk end changed');}
 assert(rows.length===cases.length&&new Set(cases.map(c=>c.id)).size===cases.length,'Prior captured case coverage changed');
 for(let i=0;i<cases.length;i++){const row=rows[i],c=cases[i],wanted=expected.get(c.expectedId??c.id);assert(row.id===c.id&&row.status==='equal'&&pin(wanted)&&row.expectedHash===wanted&&row.before.rgbaSha256===wanted&&row.after.rgbaSha256===wanted&&row.differentPixels===0&&row.differentChannels===0,`${c.id}: prior case failed or changed`);assert(allowed.has(c.after.method)&&Array.isArray(c.after.args),'Unsupported final replay fixture call');}
 const finalURL=sameOrigin(config.finalAfterURL);assert(/^\/candidate[-a-zA-Z0-9_.]*\.html$/.test(finalURL.pathname),'Final URL must be a distinct candidate fixture page');assert(finalURL.search===new URL(header.afterURL).search,'Final launch query differs (including harborShift mode)');
 await bytes(bundleURL(finalURL),config.finalBundleSHA256);
 for(const role of ['before','after'])await bytes(bundleURL(header[role+'URL']),header.bundles[role]);
 const description={version:1,run:config.run,family:header.family,comparison:header.comparison,viewport:header.viewport,environment:header.environment,count:cases.length,
  priorCompletion:{file:config.priorCompletion,sha256:priorCompletion.sha256},priorHeader:{file:footer.header,sha256:priorHeader.sha256,fingerprint:priorFingerprint},
  expectedManifest:header.expectedManifest,priorBundles:header.bundles,caseOrderSHA256:await hash(encode(cases)),finalAfterURL:finalURL.href,finalBundleSHA256:config.finalBundleSHA256};
 const fingerprint=await hash(encode(description)),headerName=config.run+'-header.json',existing=await optional(evidenceURL(headerName));
 if(existing){assert(config.resume===true,'Link run exists; use resume:true or a fresh run id');assert(existing.fingerprint===fingerprint,'Final linkage resume configuration changed');}else await write(headerName,{...description,fingerprint});
 let index=0,replayIndex=0,chunkIndex=0,busy=false,closed=false,failed=false,imageBytesRead=0;const durable=[],chunks=[],cache=new Map();
 while(existing){const file=config.run+'-chunk-'+String(chunkIndex).padStart(5,'0')+'.json',part=await optional(evidenceURL(file));if(!part)break;assert(part.fingerprint===fingerprint&&part.start===index&&part.records.length,'Invalid durable final linkage chunk');for(const row of part.records){assert(row.id===cases[index]?.id&&row.status==='equal'&&row.finalBundleSHA256===config.finalBundleSHA256,'Failed or changed final linkage cannot be resumed');durable.push(row);index++;}assert(part.end===index,'Durable final linkage end changed');chunks.push(file);chunkIndex++;}
 const replayTotal=index,frame=await makeFrame(finalURL,header.viewport,header.environment);
 async function actual(c){const call=c.after,result=await frame.fixture[call.method](...call.args);return capture(call.imageField?result[call.imageField]:frame.fixture.snapshot());}
 async function decoded(ref){const had=cache.get(ref.file);if(had){cache.delete(ref.file);cache.set(ref.file,had);return had;}const source=await bytes(evidenceURL(ref.file),ref.pngSha256);assert(ref.file==='png-'+source.sha256+'.png','PNG content-address changed');imageBytesRead+=source.value.byteLength;const image=await decodeRgbaPNG(new Blob([source.value],{type:'image/png'}));assert(image.width===ref.width&&image.height===ref.height&&await hash(image.rgba)===ref.rgbaSha256,'Stored PNG no longer matches its captured RGBA');cache.set(ref.file,image);if(cache.size>4)cache.delete(cache.keys().next().value);return image;}
 async function compare(c,prior){const value=await actual(c),finalRGBA=await hash(value.rgba),stored=await decoded(prior.after);assert(value.width===stored.width&&value.height===stored.height,`${c.id}: final canvas dimensions differ`);let differentPixels=0,differentChannels=0;const actualWords=new Uint32Array(value.rgba.buffer,value.rgba.byteOffset,value.rgba.length/4),storedWords=new Uint32Array(stored.rgba.buffer,stored.rgba.byteOffset,stored.rgba.length/4);for(let p=0;p<actualWords.length;p++)if(actualWords[p]!==storedWords[p]){differentPixels++;for(let k=0;k<4;k++)if(value.rgba[p*4+k]!==stored.rgba[p*4+k])differentChannels++;}const immutable=expected.get(c.expectedId??c.id),equal=differentPixels===0&&finalRGBA===immutable;
  return{id:c.id,priorIndex:index,priorHeaderFingerprint:priorFingerprint,status:equal?'equal':'different',expectedHash:immutable,finalBundleSHA256:config.finalBundleSHA256,finalRGBA,width:value.width,height:value.height,differentPixels,differentChannels,before:prior.before,after:prior.after,diff:prior.diff,storedAfterPNGByteCompared:true};}
 const progress=()=>({run:config.run,family:header.family,phase:failed?'failed':replayIndex<replayTotal?'replay':index===cases.length?'complete':'capture',nextIndex:index,total:cases.length,replayIndex,replayTotal,chunks:chunks.length,imageBytesReadThisSession:imageBytesRead,done:index===cases.length&&replayIndex===replayTotal&&!failed,failed});
 return{progress,
  async chunk({maxCases=100,maxMillis=18000}={}){assert(!busy&&!closed&&!failed,'Final linkage is closed, busy or failed');assert(Number.isInteger(maxCases)&&maxCases>0&&maxCases<=1000&&Number.isFinite(maxMillis)&&maxMillis>0&&maxMillis<=25000,'Invalid bounded chunk limits');busy=true;const began=now(),start=index,records=[],readBefore=imageBytesRead;let work=0,replayed=0;
   try{while(replayIndex<replayTotal&&work<maxCases&&(work===0||now()-began<maxMillis)){const c=cases[replayIndex],value=await actual(c),sha256=await hash(value.rgba);assert(sha256===durable[replayIndex].finalRGBA&&sha256===expected.get(c.expectedId??c.id)&&value.width===durable[replayIndex].width&&value.height===durable[replayIndex].height,`${c.id}: final prefix replay changed`);replayIndex++;replayed++;work++;}
    while(replayIndex===replayTotal&&index<cases.length&&work<maxCases&&(work===0||now()-began<maxMillis)){const row=await compare(cases[index],rows[index]);records.push(row);work++;if(row.status!=='equal'){failed=true;break;}index++;}
    if(records.length){const file=config.run+'-chunk-'+String(chunkIndex).padStart(5,'0')+'.json';await write(file,{version:1,fingerprint,start,end:index,records,elapsedMs:now()-began,imageBytesRead:imageBytesRead-readBefore});chunks.push(file);chunkIndex++;}
    assert(!failed,`Final G5 linkage failed at ${cases[index]?.id}; no completion claimed`);return{...progress(),elapsedMs:now()-began,linked:records.length,replayed,imageBytesRead:imageBytesRead-readBefore};
   }catch(error){failed=true;throw error;}finally{busy=false;}},
  async finish(){assert(!busy&&!closed&&!failed&&index===cases.length&&replayIndex===replayTotal,'Final linkage has unfinished cases');await bytes(bundleURL(finalURL),config.finalBundleSHA256);await bytes(evidenceURL(config.priorCompletion),priorCompletion.sha256);await bytes(evidenceURL(footer.header),priorHeader.sha256);await bytes(sameOrigin(header.expectedManifest.url),header.expectedManifest.sha256);for(const role of ['before','after'])await bytes(bundleURL(header[role+'URL']),header.bundles[role]);const file=config.run+'-complete.json';await write(file,{version:1,fingerprint,header:headerName,count:index,chunks,differentPixels:0,allFinalActualRGBAByteComparedToStoredPNG:true,allFinalActualRGBAMatchedImmutableExpected:true,originalPNGTripletsReusedByVerifiedContent:true,sourcePinsRecheckedAtFinish:true});return{...progress(),manifest:file};},
  async close(){assert(!busy,'Cannot close during a final linkage chunk');frame.node.remove();cache.clear();closed=true;},
 };
}
