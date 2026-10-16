/** Local read-only source access. The launcher freezes exact inspector-derived paths once per session. */
import *as fs from'node:fs';
import *as path from'node:path';
export class SourceReadError extends Error{constructor(public status:number,message:string){super(message);}}
const inside=(root:string,file:string)=>{const rel=path.relative(root,file);return rel!==''&&!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep);};
export interface SourceText{file:string;text:string}
export class SourceReader{
 private root:string;private files=new Map<string,string>();
 constructor(root:string,files:Iterable<string>,private maxBytes=512*1024){
  this.root=fs.realpathSync(root);if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>2*1024*1024)throw new Error('Invalid source read limit');
  for(const file of files){this.validName(file);const real=this.resolve(file);if(!fs.statSync(real).isFile())throw new SourceReadError(403,'Source must be a regular file');this.files.set(file,real);}
 }
 private validName(file:string){if(!file||file.includes('\\')||file.includes('\0')||file.includes(':')||file.startsWith('/')||file.split('/').some(s=>!s||s==='.'||s==='..')||!/\.(?:ts|json)$/.test(file)||path.isAbsolute(file))throw new SourceReadError(400,'Invalid source path');}
 private resolve(file:string){let real:string;try{real=fs.realpathSync(path.resolve(this.root,file));}catch{throw new SourceReadError(404,'Source file unavailable');}if(!inside(this.root,real))throw new SourceReadError(403,'Source path escapes game root');return real;}
 read(file:string):SourceText{
  this.validName(file);const expected=this.files.get(file);if(!expected)throw new SourceReadError(404,'Source is not in this inspector session');const real=this.resolve(file);if(real!==expected)throw new SourceReadError(403,'Source path changed since session start');
  let fd:number|undefined;try{fd=fs.openSync(real,'r');const stat=fs.fstatSync(fd);if(!stat.isFile())throw new SourceReadError(403,'Source must be a regular file');if(stat.size>this.maxBytes)throw new SourceReadError(413,'Source exceeds read limit');const bytes=Buffer.alloc(this.maxBytes+1);let total=0,count=0;while(total<bytes.length&&(count=fs.readSync(fd,bytes,total,bytes.length-total,null))>0)total+=count;if(total>this.maxBytes)throw new SourceReadError(413,'Source exceeds read limit');if(this.resolve(file)!==expected)throw new SourceReadError(403,'Source path changed during read');const current=fs.statSync(expected);if(current.dev!==stat.dev||current.ino!==stat.ino)throw new SourceReadError(403,'Source file replaced during read');let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,total));}catch{throw new SourceReadError(422,'Source is not valid UTF-8');}return{file,text};}catch(error){if(error instanceof SourceReadError)throw error;throw new SourceReadError(404,'Source file unavailable');}finally{if(fd!==undefined)fs.closeSync(fd);}
 }
}
/** Called only after the launcher's loopback/origin/GET guards. */
export function readSourceRequest(reader:SourceReader,url:URL):SourceText{
 if(url.pathname!=='/source'||[...url.searchParams.keys()].length!==1||!url.searchParams.has('file'))throw new SourceReadError(400,'Exactly one file parameter is required');return reader.read(url.searchParams.get('file')!);
}
