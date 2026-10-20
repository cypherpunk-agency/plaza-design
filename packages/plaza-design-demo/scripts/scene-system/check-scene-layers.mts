/** Layered compositions: validation rules, slot drawing, editor restacking and Library paint parity with the pass format. */
import assert from 'node:assert/strict';
import {canonicalPaint} from './canonical-paint.mts';
import {art} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {drawCompositionSlot, isLayered, resolveComposition, slotHasContent, type Composition, type Instance, type LayerSlot} from '../../src/ssg/game/art/core/composition';
import {layerRows, restack} from '../../src/ssg/game/authoring/layer-stack';
import {libraryComposition, libraryEnvironment, libraryGeometry} from '../../src/ssg/game/scenes/library/composition';
import {libraryActors} from '../../src/ssg/game/scenes/library/scene';

function recorder(){const commands:unknown[][]=[];let gradient=0;const values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(text:string)=>({width:text.length*6}),getImageData:(_x:number,_y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})};const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return(...args:unknown[])=>{const id=++gradient;commands.push([k,...args,id]);return{id,addColorStop:(...a:unknown[])=>commands.push(['stop',id,...a]),setTransform:()=>{}};};return(...args:unknown[])=>{commands.push([k,...args]);};},set(t,k:string,value){t[k]=value;commands.push(['set',k,value]);return true;}});return{ctx:ctx as unknown as CanvasRenderingContext2D,commands};}
(globalThis as any).document={createElement:()=>{const rec=recorder();return{width:0,height:0,getContext:()=>rec.ctx,style:{}};},fonts:{load:async()=>[],ready:Promise.resolve()}};
const {createNativePreview}=await import('../../src/ssg/game/authoring/native-preview.ts');
const {nativeSceneAdapters}=await import('../../src/ssg/game/authoring/scene-adapters.ts');

const copy=<T,>(v:T):T=>structuredClone(v);
const flat=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flat(n.children??[])]);
const doc=art.validate(copy(libraryComposition));
assert.ok(isLayered(doc),'Library is layered');
const node=(d:Composition,id:string)=>flat(d.instances).find(n=>n.id===id)!;

// Validation: no mixtures, drawn artwork in visual layers, markers in logic, one player row in the playfield.
const rejects=(edit:(d:Composition)=>void,pattern:RegExp)=>{const d=copy(doc);edit(d);assert.throws(()=>art.validate(d),pattern);};
rejects(d=>{const n=node(d,'counter');delete n.layer;(n as any).pass='backdrop';},/layer on every instance|order\/pass/);
rejects(d=>{(node(d,'counter') as any).pass='backdrop';},/order\/pass/);
rejects(d=>{node(d,'counter').layer='logic';},/visual layer/);
rejects(d=>{node(d,'spawn').layer='set';},/logic layer/);
rejects(d=>{node(d,'player').layer='set';},/player row belongs in the playfield/);
rejects(d=>{d.instances.push({...copy(node(d,'player')),id:'player-2'});},/exactly one player row/);
rejects(d=>{d.instances=d.instances.filter(n=>n.id!=='player');},/exactly one player row/);
assert.throws(()=>art.validate({version:1,scene:'x',instances:[{id:'p',type:'scene.player',props:{},placement:{x:0,h:0},order:0,pass:'backdrop'}]}),/requires a layered composition/);

// Sorting follows layer, then order: a low order key in a front layer still draws later.
const sorted=copy(doc);node(sorted,'room').layer='foreground';node(sorted,'room').order=-50;
{const ids=libraryGeometry(art.validate(sorted)).map(r=>r.instance.id);assert.ok(ids.indexOf('room')>ids.indexOf('player'),'foreground sorts after the playfield');assert.equal(ids.at(-1),'spawn','logic sorts last');}

// Slots: Library starts with everything behind the player.
assert.equal(slotHasContent(doc,'behind-player'),true);
assert.equal(slotHasContent(doc,'over-player'),false);
assert.equal(slotHasContent(doc,'foreground'),false);

// Restacking: moving the counter to the foreground and the player to the back of the playfield.
const moved=copy(doc);restack(moved,'counter','foreground',0);restack(moved,'player','playfield',0);art.validate(moved);
assert.deepEqual(layerRows(moved,'foreground').map(n=>n.id),['counter']);
assert.equal(layerRows(moved,'playfield')[0].id,'player');
assert.deepEqual(layerRows(moved,'playfield').map(n=>n.order),layerRows(moved,'playfield').map((_,i)=>i),'restack renumbers the layer');
assert.equal(slotHasContent(moved,'over-player'),true);assert.equal(slotHasContent(moved,'foreground'),true);
assert.throws(()=>restack(copy(doc),'player','set',0),/stays in the playfield/);

// Each slot draws only its own rows.
const actors=libraryActors(moved),engine={m:{value:()=>false},hover:null,layer:'all'} as any,view={...frameView(0),sx:(x:number)=>x,y:(h:number)=>300-h,gy:300,viewW:960,viewH:360};
const env=libraryEnvironment(moved,view,engine,actors),drawn=(slot:LayerSlot)=>{const ids:string[]=[];const registry=new Proxy(art,{get(t,k){if(k==='get')return(type:string)=>{const e=t.get(type);return{...e,draw:(...a:unknown[])=>{ids.push(type);return (e.draw as any)(...a);}};};const v=(t as any)[k];return typeof v==='function'?v.bind(t):v;}});drawCompositionSlot(recorder().ctx,registry as typeof art,moved,env,slot);return ids;};
assert.deepEqual(drawn('foreground'),['library.counter']);
assert.ok(drawn('over-player').includes('library.printer')&&!drawn('over-player').includes('library.counter'));
assert.ok(!drawn('behind-player').includes('library.printer')&&drawn('behind-player').includes('library.room'));

// Parity: layered Library paints exactly as the same document in the older single-pass format.
const legacy=copy(doc);legacy.instances=legacy.instances.filter(n=>n.type!=='scene.player');for(const n of flat(legacy.instances)){delete n.layer;n.pass='backdrop';}
const configs=[{width:640,height:360,minute:580,time:0,weather:'clear',reduced:false,hack:false},{width:960,height:540,minute:0,time:2.25,weather:'rain',reduced:false,hack:false},{width:1280,height:720,minute:1100,time:5,weather:'storm',reduced:false,hack:false},{width:400,height:900,minute:1200,time:3.3,weather:'fog',reduced:true,hack:false},{width:960,height:540,minute:580,time:1,weather:'clear',reduced:false,hack:true}];
const paint=(composition:Composition,c:typeof configs[number],index:number)=>{const rec=recorder();createNativePreview(nativeSceneAdapters).render({width:c.width,height:c.height,getContext:()=>rec.ctx,style:{}} as any,{composition,time:c.time,reduced:c.reduced,overlays:false,environment:{day:1,minute:c.minute,seed:3,weather:c.weather,cameraX:index%2?150:0,zoom:1,flags:'{}',state:'{}',hack:c.hack,hover:''}} as any);return JSON.stringify(canonicalPaint(rec.commands));};
for(const [index,c]of configs.entries())assert.equal(paint(doc,c,index),paint(legacy,c,index),`Library paint parity, case ${index}`);
assert.notEqual(paint(moved,configs[0],0),paint(doc,configs[0],0),'moving the counter to the foreground changes the frame');
console.log('Scene layers PASS: validation, layer-then-order sorting, slots, restacking, and Library paint parity with the pass format in 5 cases.');
