import assert from 'node:assert/strict';
import originalModule from '../../../../.scene-system/baseline/source/ssg/game/title/glide';
import originalLight from '../../../../.scene-system/baseline/source/ssg/game/light';
import{renderOpeningDocument,nativeOpeningFrame}from'../../src/ssg/game/story/title/render';
import{openingDocuments}from'../../src/ssg/game/story/title/documents';
import{renderOpeningSequence}from'../../src/ssg/game/art/sequences/opening/sequence';
import{lightAt,setLight}from'../../src/ssg/game/world/light';
import{canonicalPaint}from'./canonical-paint.mts';
function recorder(){const commands:unknown[][]=[];let gradient=0;const values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',getTransform:()=>({a:2}),measureText:(text:string)=>({width:text.length*6})};const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return(...args:unknown[])=>{const id=++gradient;commands.push([k,...args,id]);return{id,addColorStop:(...args:unknown[])=>commands.push(['stop',id,...args])};};return(...args:unknown[])=>commands.push([k,...args]);},set(t,k:string,value){t[k]=value;commands.push(['set',k,value]);return true;}})as unknown as CanvasRenderingContext2D;return{ctx,commands};}
(globalThis as any).document={createElement:()=>({width:0,height:0,getContext:()=>recorder().ctx})};
for(const reduced of[false,true])for(const minute of[0,480,1100]){
 const lighting=lightAt(1,minute,90,null),view={W:640,H:360,reduced,lighting},a=recorder(),b=recorder();originalLight.setLight(lighting);setLight(lightAt(7,600,270,null));originalModule.drawGlide(a.ctx,view,7,null);renderOpeningDocument(b.ctx,view,openingDocuments,'title',7);const oldPaint=canonicalPaint(a.commands),newPaint=canonicalPaint(b.commands);const index=oldPaint.findIndex((p,i)=>JSON.stringify(p)!==JSON.stringify(newPaint[i]));if(index>=0){console.log({reduced,minute,index,old:oldPaint[index],current:newPaint[index],lengths:[oldPaint.length,newPaint.length]});assert.fail('Captured light changed original paint');}
 const frame=nativeOpeningFrame(recorder().ctx,view,7,null),before=JSON.stringify(frame.coast.actors),c=recorder();renderOpeningSequence(c.ctx,view,openingDocuments,'title',7,{actors:frame.coast.actors});assert.equal(JSON.stringify(frame.coast.actors),before,'Library rendering must not mutate prepared poses');
}
console.log('Sequence contexts passed: six selected-light comparisons against original and immutable prepared-pose rendering with independently changed world light.');
