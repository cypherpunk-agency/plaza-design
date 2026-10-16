/** Browser-only G5 evidence capture. Never imported by shipping game or authoring code.
 *
 * const run = await createArtifactCapture({run:'S7-images-scenes-v1', family:'scenes',
 *   beforeURL:'/baseline.html', afterURL:'/candidate.html', viewport:{width:1280,height:720},
 *   expectedEnvironment:manifest.environment,
 *   expectedManifest:{url:'/v2-scenes.json',sha256:'PINNED FILE SHA256'},
 *   bundleHashes:{before:'PINNED BASELINE JS SHA256',after:'PINNED CANDIDATE JS SHA256'},
 *   cases:manifest.cases.map(c=>({id:c.id,before:{method:'render',args:[c]},after:{method:'render',args:[c]}}))});
 * await run.chunk(); // Repeat bounded chunks; run.progress() reports durable position.
 * await run.finish(); await run.close();
 *
 * Use a fresh instance/pair per family; harborShift URLs carry ?play=harborShift.
 * For offscreen flight/composer captures use imageField:'beforeCapture'/'afterCapture'.
 * The immutable expected manifest must already exist; this helper NEVER invents expected hashes.
 */
const realNow=()=>new Date().getTime(); // Fixtures intentionally replace Date.now/performance.now.
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const json=value=>JSON.stringify(value);
const pin=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const allowed=new Set(['render','sequence','composedMap','map','harborCraneCall','composer','flight']);
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
function pngChunk(name,data){const out=new Uint8Array(data.length+12),view=new DataView(out.buffer);view.setUint32(0,data.length);out.set(new TextEncoder().encode(name),4);out.set(data,8);view.setUint32(out.length-4,crc(out.subarray(4,-4)));return out;}
/** Exact unpremultiplied RGBA PNG; no canvas encode/decode color conversion. */
export async function encodeRgbaPNG(value){const {width,height,rgba}=value,row=width*4;assert(rgba.length===row*height,'Invalid PNG input');const scan=new Uint8Array((row+1)*height);for(let y=0;y<height;y++)scan.set(rgba.subarray(y*row,(y+1)*row),y*(row+1)+1);const data=new Uint8Array(await new Response(new Blob([scan]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()),header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header.set([8,6,0,0,0],8);return new Blob([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk('IHDR',header),pngChunk('IDAT',data),pngChunk('IEND',new Uint8Array())],{type:'image/png'});}
/** Decode our PNG bytes and validate CRC/filter/header, independently of the encoder's input. */
export async function decodeRgbaPNG(blob){const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),ids=[];assert(bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10','Invalid PNG signature');let width=0,height=0,end=false;for(let at=8;at<bytes.length;){const length=view.getUint32(at),name=new TextDecoder().decode(bytes.subarray(at+4,at+8));assert(at+length+12<=bytes.length,'Truncated PNG chunk');const data=bytes.subarray(at+8,at+8+length);assert(crc(bytes.subarray(at+4,at+8+length))===view.getUint32(at+8+length),'PNG CRC mismatch');if(name==='IHDR'){width=view.getUint32(at+8);height=view.getUint32(at+12);assert(data.slice(8).join(',')==='8,6,0,0,0','Unsupported PNG format');}else if(name==='IDAT')ids.push(data);else if(name==='IEND')end=true;at+=length+12;}assert(end&&width&&height&&ids.length,'Incomplete PNG');const scan=new Uint8Array(await new Response(new Blob(ids).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()),row=width*4,rgba=new Uint8ClampedArray(row*height);assert(scan.length===(row+1)*height,'PNG scanline length changed');for(let y=0;y<height;y++){assert(scan[y*(row+1)]===0,'Unexpected PNG filter');rgba.set(scan.subarray(y*(row+1)+1,(y+1)*(row+1)),y*row);}return{width,height,rgba};}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchJSON(url){const r=await fetch(url,{cache:'no-store'});if(r.status===404)return null;assert(r.ok,`${url}: HTTP ${r.status}`);return r.json();}
async function write(name,data){const r=await fetch('/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:json({name,data})});assert(r.ok,`Evidence ${name}: HTTP ${r.status} ${await r.text()}`);}
async function pinned(url,expected){assert(pin(expected),`Missing SHA-256 pin for ${url}`);const r=await fetch(url,{cache:'no-store'});assert(r.ok,`${url}: HTTP ${r.status}`);const bytes=await r.arrayBuffer(),actual=await hash(bytes);assert(actual===expected,`${url}: file pin changed (${actual})`);return{bytes,sha256:actual};}
function urlAt(url){const parsed=new URL(url,location.href);assert(parsed.origin===location.origin,'Capture frames must have the same loopback origin');assert(/^\/(baseline|baseline-original-capture|candidate|candidate-final-g4)\.html$/.test(parsed.pathname),'Only isolated fixture pages can be captured');return parsed;}
function sameEnvironment(actual,expected){for(const k of ['userAgent','dpr','fonts'])assert(actual[k]===expected[k],`Pinned ${k} changed: ${actual[k]}`);assert(actual.fonts==='loaded','Fonts are not ready');}
async function frame(url,viewport,expected){const node=document.createElement('iframe');node.width=String(viewport.width);node.height=String(viewport.height);Object.assign(node.style,{position:'fixed',left:'-20000px',top:'0',width:viewport.width+'px',height:viewport.height+'px',border:'0'});node.src=url.href;document.body.append(node);const start=realNow();
 try{while(!node.contentWindow?.fixtureReady){assert(realNow()-start<25000,'Fixture initialization timed out');await delay(25);}const w=node.contentWindow;await w.document.fonts.ready;sameEnvironment(w.fixture.environment(),expected);assert(w.innerWidth===viewport.width&&w.innerHeight===viewport.height,'Fixture viewport changed');for(const weight of [400,500,600,700])assert(w.document.fonts.check(`${weight} 16px "IBM Plex Mono"`),`Missing font weight ${weight}`);return{node,fixture:w.fixture,window:w};}catch(error){node.remove();throw error;}}
function pixels(value){assert(value&&Number.isInteger(value.width)&&Number.isInteger(value.height)&&value.width>0&&value.height>0,'Missing actual canvas capture dimensions');assert(value.rgba?.length===value.width*value.height*4,'Missing actual RGBA capture');return{width:value.width,height:value.height,rgba:new Uint8ClampedArray(value.rgba)};}
async function render(target,call){assert(call&&allowed.has(call.method)&&Array.isArray(call.args),'Unknown fixture capture call');const result=await target.fixture[call.method](...call.args);return pixels(call.imageField?result[call.imageField]:target.fixture.snapshot());}

export async function createArtifactCapture(config){
 assert(location.hostname==='127.0.0.1','Capture must run on the isolated loopback fixture origin');
 assert(/^[a-zA-Z0-9_.-]+$/.test(config.run)&&typeof config.family==='string','Invalid evidence run/family');
 assert(config.viewport&&Number.isInteger(config.viewport.width)&&Number.isInteger(config.viewport.height)&&config.viewport.width>0&&config.viewport.height>0,'Explicit iframe viewport required');
 assert(config.expectedEnvironment&&Array.isArray(config.cases)&&config.cases.length,'Pinned environment and ordered cases required');
 const beforeURL=urlAt(config.beforeURL),afterURL=urlAt(config.afterURL),manifest=await pinned(config.expectedManifest.url,config.expectedManifest.sha256);
 const input=JSON.parse(new TextDecoder().decode(manifest.bytes)),expectedRows=Array.isArray(input)?input:input.results;
 assert(Array.isArray(expectedRows),'Expected immutable manifest results array');
 const pixelHashKey=config.expectedManifest.pixelHashKey??'hash';assert(['hash','original','game'].includes(pixelHashKey),'Unsupported expected pixel hash field');
 const expected=new Map(expectedRows.map(row=>[row.id,row[pixelHashKey]]));assert(expected.size===expectedRows.length,'Expected manifest contains duplicate ids');
 const seen=new Set();for(const c of config.cases){assert(typeof c.id==='string'&&!seen.has(c.id),'Capture case ids must be unique');seen.add(c.id);assert(pin(expected.get(c.expectedId??c.id)),`${c.id}: no immutable expected pixel hash`);}
 const beforeBundle=await pinned('/'+beforeURL.pathname.slice(1).replace('.html','.js'),config.bundleHashes.before),afterBundle=await pinned('/'+afterURL.pathname.slice(1).replace('.html','.js'),config.bundleHashes.after);
 const description={version:1,run:config.run,family:config.family,comparison:config.comparison??'original-to-migrated',viewport:config.viewport,environment:config.expectedEnvironment,beforeURL:beforeURL.href,afterURL:afterURL.href,expectedManifest:{url:new URL(config.expectedManifest.url,location.href).href,sha256:manifest.sha256,pixelHashKey},bundles:{before:beforeBundle.sha256,after:afterBundle.sha256},cases:config.cases};
 const fingerprint=await hash(new TextEncoder().encode(json(description))),headerName=config.run+'-header.json',existing=await fetchJSON('/evidence/'+headerName);
 if(existing){assert(config.resume===true,'Run already exists; pass resume:true or choose a fresh run id');assert(existing.fingerprint===fingerprint,'Resume configuration differs from the pinned run');}else await write(headerName,json({...description,fingerprint}));
 let index=0,chunkIndex=0,busy=false,closed=false,failed=false,bytesWritten=0,replayIndex=0;const chunks=[],assets=new Map(),durable=[];
 while(existing){const name=config.run+'-chunk-'+String(chunkIndex).padStart(5,'0')+'.json',chunk=await fetchJSON('/evidence/'+name);if(!chunk)break;assert(chunk.fingerprint===fingerprint&&chunk.start===index,'Invalid durable chunk sequence');assert(chunk.records.length&&chunk.records.every(r=>r.status==='equal'),'Cannot resume a failed run; preserve it and choose a new run id');for(const row of chunk.records){assert(row.id===config.cases[index]?.id,'Durable case order changed');for(const image of [row.before,row.after,row.diff])assets.set(`${image.width}x${image.height}:${image.rgbaSha256}`,image);durable.push(row);index++;}chunks.push(name);chunkIndex++;}
 const replayTotal=index;
 let before,after;try{before=await frame(beforeURL,config.viewport,config.expectedEnvironment);after=await frame(afterURL,config.viewport,config.expectedEnvironment);}catch(e){before?.node.remove();throw e;}
 async function asset(value,rgbaSha256){const key=`${value.width}x${value.height}:${rgbaSha256}`,had=assets.get(key);if(had)return had;
  // Exact encoding is from THIS capture's actual RGBA bytes, not a copied counterpart.
  const blob=await encodeRgbaPNG(value),decoded=await decodeRgbaPNG(blob);assert(decoded.width===value.width&&decoded.height===value.height&&await hash(decoded.rgba)===rgbaSha256,'Encoded PNG does not preserve captured RGBA bytes');const bytes=await blob.arrayBuffer(),pngSha256=await hash(bytes),name='png-'+pngSha256+'.png';
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});await write(name,data);bytesWritten+=bytes.byteLength;
  const ref={file:name,pngSha256,rgbaSha256,width:value.width,height:value.height,bytes:bytes.byteLength};assets.set(key,ref);return ref;
 }
 async function caseRecord(c){const a=await render(before,c.before),beforeHash=await hash(a.rgba),expectedHash=expected.get(c.expectedId??c.id),beforeRef=await asset(a,beforeHash);
  // Never let a matching candidate legitimize a nonreproducible original.
  if(beforeHash!==expectedHash)return{id:c.id,status:'baseline-diverged',expectedHash,before:beforeRef};
  const b=await render(after,c.after),afterHash=await hash(b.rgba);assert(a.width===b.width&&a.height===b.height,`${c.id}: canvas dimensions differ`);const diff=new Uint8ClampedArray(a.rgba.length);let differentPixels=0,differentChannels=0;
  for(let p=0;p<a.rgba.length;p+=4){let changed=false;for(let k=0;k<4;k++){if(a.rgba[p+k]!==b.rgba[p+k]){changed=true;differentChannels++;}diff[p+k]=Math.abs(a.rgba[p+k]-b.rgba[p+k]);}if(changed){differentPixels++;diff[p+3]=255;}}
  const afterRef=await asset(b,afterHash),difference={width:a.width,height:a.height,rgba:diff},diffRef=await asset(difference,await hash(diff));
  return{id:c.id,status:differentPixels?'different':'equal',expectedHash,before:beforeRef,after:afterRef,diff:diffRef,differentPixels,differentChannels,actualCaptures:{before:beforeHash,after:afterHash}};
 }
 const progress=()=>({run:config.run,family:config.family,phase:failed?'failed':replayIndex<replayTotal?'replay':index===config.cases.length?'complete':'capture',replayIndex,replayTotal,nextIndex:index,total:config.cases.length,chunks:chunks.length,done:index===config.cases.length&&replayIndex===replayTotal&&!failed,failed,bytesWrittenThisSession:bytesWritten,uniqueAssetsKnown:assets.size});
 return{
  progress,
  async chunk({maxCases=8,maxMillis=18000}={}){assert(!closed&&!busy&&!failed,'Capture is closed, busy or failed');assert(Number.isInteger(maxCases)&&maxCases>0&&maxCases<=100&&Number.isFinite(maxMillis)&&maxMillis>0&&maxMillis<=25000,'Chunk limits invalid');busy=true;const start=index,began=realNow(),records=[],bytesBefore=bytesWritten;let work=0,replayed=0;
   try{while(replayIndex<replayTotal&&work<maxCases&&(work===0||realNow()-began<maxMillis)){const c=config.cases[replayIndex],a=await render(before,c.before),beforeHash=await hash(a.rgba);assert(beforeHash===expected.get(c.expectedId??c.id)&&beforeHash===durable[replayIndex].before.rgbaSha256,`${c.id}: original prefix replay changed`);const b=await render(after,c.after);assert(await hash(b.rgba)===durable[replayIndex].after.rgbaSha256,`${c.id}: candidate prefix replay changed`);replayIndex++;replayed++;work++;}
    while(replayIndex===replayTotal&&index<config.cases.length&&work<maxCases&&(work===0||realNow()-began<maxMillis)){const row=await caseRecord(config.cases[index]);records.push(row);work++;if(row.status!=='equal'){failed=true;break;}index++;}
    if(records.length){const name=config.run+'-chunk-'+String(chunkIndex).padStart(5,'0')+'.json';await write(name,json({version:1,fingerprint,start,end:index,records,elapsedMs:realNow()-began,bytesWritten:bytesWritten-bytesBefore}));chunks.push(name);chunkIndex++;}
    assert(!failed,`G5 capture stopped at ${config.cases[index]?.id}; failing actual images and chunk retained`);return{...progress(),elapsedMs:realNow()-began,casesCaptured:records.length,replayed,bytesWritten:bytesWritten-bytesBefore};
   }catch(error){failed=true;throw error;}finally{busy=false;}
  },
  async finish(){assert(!closed&&!busy&&!failed&&index===config.cases.length&&replayIndex===replayTotal,'Capture has unfinished or failed cases');await pinned('/'+beforeURL.pathname.slice(1).replace('.html','.js'),config.bundleHashes.before);await pinned('/'+afterURL.pathname.slice(1).replace('.html','.js'),config.bundleHashes.after);await pinned(config.expectedManifest.url,config.expectedManifest.sha256);const name=config.run+'-complete.json';await write(name,json({version:1,fingerprint,header:headerName,count:index,differentPixels:0,chunks,allBeforeHashesMatchedImmutableManifest:true,actualIndependentAfterCaptures:true,sourcePinsRecheckedAtFinish:true}));return{...progress(),manifest:name};},
  async close(){assert(!busy,'Cannot close during a chunk');before.node.remove();after.node.remove();closed=true;},
 };
}
