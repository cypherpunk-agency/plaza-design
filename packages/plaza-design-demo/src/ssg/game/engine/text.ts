/** One-pass native field substitution. Unknown fields remain visible; inserted text is not re-evaluated. */
export function formatNativeText(text:string,read:(key:string)=>unknown):string {
 return text.replace(/\{(query:[\w.:-]+|[\w.-]+)\}/g,(match,key:string)=>{const value=read(key);return value===undefined?match:String(value);});
}
