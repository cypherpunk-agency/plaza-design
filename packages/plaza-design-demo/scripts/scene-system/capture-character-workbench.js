/** Browser fixture helper; copies to the existing loopback fixture directory. */
import {characterCases,compareCharacterCase,characterCanvas} from './s9-characters.js?v=3';
const normal=characterCases.flatMap((test,index)=>test.time===1.25&&test.config.facing===1?[{index,reduced:false}]:[]);
const seen=new Set(),reduced=characterCases.flatMap((test,index)=>{if(seen.has(test.config.family))return[];seen.add(test.config.family);return[{index,reduced:true}];});
export const captureCases=[...normal,...reduced];
export async function captureCharacters(start=0,count=100){
 const results=[];
 const save=async(name,data)=>{const response=await fetch('/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,data})});if(!response.ok)throw Error(`Cannot save ${name}: ${response.status}`);};
 for(const row of captureCases.slice(start,start+count)){
  const result=await compareCharacterCase(row.index,true,row.reduced),stem=`S9-v3-${row.index}-${row.reduced?'reduced':'normal'}`;
  if(result.differentPixels)throw Error(`Character pixels differ: ${result.id}`);
  await save(stem+'-source.png',result.original);await save(stem+'-workbench.png',result.candidate);
  const{original,candidate,...numeric}=result;results.push({...numeric,sourceImage:stem+'-source.png',workbenchImage:stem+'-workbench.png'});
 }
 const report={status:'PASS',totalCaptureCases:captureCases.length,start,results};await save(`S9-v3-images-${start}.json`,JSON.stringify(report,null,2));
 return{status:report.status,total:captureCases.length,start,pairs:results.length};
}
export async function captureCharacterEnvironments(){
 const results=[];
 const save=async(name,data)=>{const response=await fetch('/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,data})});if(!response.ok)throw Error(`Cannot save ${name}: ${response.status}`);};
 for(const family of ['human','cat','servbot'])for(const minute of [0,360,720,1080])for(const facing of [1,-1]){
  const base=characterCases.find(row=>row.config.family===family),test={...base,id:`environment-${family}-${minute}-${facing}`,time:1.25,config:{...base.config,minute,facing}};
  const original=characterCanvas(test,true),candidate=characterCanvas(test),left=original.canvas.getContext('2d').getImageData(0,0,640,360).data,right=candidate.canvas.getContext('2d').getImageData(0,0,640,360).data;
  let differences=0;for(let i=0;i<left.length;i++)if(left[i]!==right[i])differences++;
  if(differences)throw Error(test.id+' changed '+differences+' channels');
  const stem=`S9-${test.id}`,hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',right))).map(n=>n.toString(16).padStart(2,'0')).join('');
  await save(stem+'-source.png',original.canvas.toDataURL('image/png'));await save(stem+'-workbench.png',candidate.canvas.toDataURL('image/png'));
  results.push({id:test.id,config:test.config,time:test.time,sourceImage:stem+'-source.png',workbenchImage:stem+'-workbench.png',differentPixels:0,originalHash:hash,candidateHash:hash});
 }
 for(const family of ['human','cat','servbot']){const hashes=results.filter(row=>row.config.family===family&&row.config.facing===1).map(row=>row.candidateHash);if(new Set(hashes).size<2)throw Error(family+' native lighting never affected output');}
 await save('S9-v3-environment-images.json',JSON.stringify({status:'PASS',total:results.length,results},null,2));return{status:'PASS',pairs:results.length,nativeLightingChangesOutput:true};
}
