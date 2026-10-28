/** Temporary preview properties/state use registered validation and the real artwork renderer. */
import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {assetInventory} from '../../src/ssg/game/authoring/asset-browser';
import {createAssetPreview} from '../../src/ssg/game/authoring/asset-preview';
const preview=createAssetPreview(art,{render(){throw Error('Independent preview requested scene state');}}),entries=assetInventory(art,[]);
function draw(id:string,overrides={}){
 const ops:unknown[]=[],values:Record<string,unknown>={getImageData:()=>({data:new Uint8ClampedArray([0,0,0,255])}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(s:string)=>({width:s.length*5})};
 const ctx=new Proxy(values,{get(o,k:string){if(k in o)return o[k];if(k.startsWith('create'))return()=>({addColorStop(){}});return(...args:unknown[])=>ops.push([k,...args]);},set(o,k:string,value){o[k]=value;ops.push([k,value]);return true;}}) as CanvasRenderingContext2D;
 const canvas={width:480,height:320,getContext:()=>ctx} as unknown as HTMLCanvasElement;
 const input={time:2,reduced:false,environment:{day:1,minute:580},...overrides},before=JSON.stringify(input),result=preview(canvas,entries.find(e=>e.id===id)!,undefined,[],input);
 assert.equal(JSON.stringify(input),before,'rendering never writes preview inputs');return{ops,result};
}
for(const [id,change] of [['train.brake',{state:{pulled:true}}],['shift.printer',{state:{checked:true}}],['shop.counter-label',{props:{text:'TEST LABEL'}}],['train.drawPole',{props:{ceilingHeight:120}}]] as const){
 const original=draw(id),changed=draw(id,change),reset=draw(id);
 assert.notDeepEqual(changed.ops,original.ops,id+' actual drawing responds to typed preview settings');
 assert.deepEqual(reset.ops,original.ops,id+' reset does not retain another preview state');
 assert(typeof changed.result!=='string'&&changed.result.message.includes('temporary preview settings'));
}
assert.throws(()=>draw('train.brake',{state:{pulled:'yes'}}),'invalid visual types reject');
assert.throws(()=>draw('train.brake',{state:{unknown:true}}),'unknown state fields reject');
assert.throws(()=>draw('shop.counter-label',{props:{unknown:'x'}}),'unknown properties reject');
console.log('Asset preview state PASS: real drawing changes, typed rejection, isolated inputs and repeatable reset.');
