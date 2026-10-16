/** Browser-only bounded F2 parity harness, separate from the game and player storage. */
import {characterWorkbenchCases,characterWorkbenchView,createCharacterWorkbenchSession,drawCharacterWorkbenchSnapshot,drawNativeCharacterReference,mountCharacterWorkbench,type CharacterWorkbenchCase} from '../../src/ssg/game/authoring/character-workbench';
export {mountCharacterWorkbench};
export const characterCases=characterWorkbenchCases();
const session=createCharacterWorkbenchSession();
export function characterCanvas(test:CharacterWorkbenchCase,reference=false,reduced=false){
 const t=reduced?0:test.time,snapshot=session.prepare(test.config,t),view=characterWorkbenchView(test.config,t),canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#070809';ctx.fillRect(0,0,640,360);
 (reference?drawNativeCharacterReference:drawCharacterWorkbenchSnapshot)(ctx,view,snapshot);return{canvas,snapshot};
}
export async function compareCharacterCase(index:number,capture=false,reduced=false){
 const test=characterCases[index];if(!test)throw new Error('Unknown frozen character case');const a=characterCanvas(test,true,reduced),b=characterCanvas(test,false,reduced),original=a.canvas.getContext('2d')!.getImageData(0,0,640,360).data,candidate=b.canvas.getContext('2d')!.getImageData(0,0,640,360).data;let differentPixels=0,maxChannelDelta=0;
 for(let i=0;i<original.length;i+=4){let changed=false;for(let c=0;c<4;c++){const delta=Math.abs(original[i+c]-candidate[i+c]);if(delta)changed=true;maxChannelDelta=Math.max(maxChannelDelta,delta);}if(changed)differentPixels++;}
 const hash=async(data:Uint8ClampedArray)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(b=>b.toString(16).padStart(2,'0')).join('');
 return{id:test.id,index,reduced,differentPixels,maxChannelDelta,originalHash:await hash(original),candidateHash:await hash(candidate),...(capture?{original:a.canvas.toDataURL('image/png'),candidate:b.canvas.toDataURL('image/png')}:{})};
}
export async function runCharacterWorkbenchParity(indices=characterCases.map((_c,i)=>i)){
 const results=[];for(const i of indices)results.push(await compareCharacterCase(i));return{total:results.length,failures:results.filter(r=>r.differentPixels!==0),results};
}
