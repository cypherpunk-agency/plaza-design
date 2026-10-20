/** Layered compositions: validation rules (per-instance passes are rejected), slot drawing, editor restacking and the editor's player figure and eyes. */
import assert from 'node:assert/strict';
import {canonicalPaint} from './canonical-paint.mts';
import {art} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {drawCompositionSlot, resolveComposition, slotHasContent, type Composition, type Instance, type LayerSlot} from '../../src/ssg/game/art/core/composition';
import {layerRows, restack} from '../../src/ssg/game/authoring/layer-stack';
import {libraryComposition, libraryEnvironment, libraryGeometry} from '../../src/ssg/game/scenes/library/composition';
import {libraryActors} from '../../src/ssg/game/scenes/library/scene';
import {libraryScene} from '../../src/ssg/game/scenes/library';

function recorder(){const commands:unknown[][]=[];let gradient=0;const values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(text:string)=>({width:text.length*6}),getImageData:(_x:number,_y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})};const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return(...args:unknown[])=>{const id=++gradient;commands.push([k,...args,id]);return{id,addColorStop:(...a:unknown[])=>commands.push(['stop',id,...a]),setTransform:()=>{}};};return(...args:unknown[])=>{commands.push([k,...args]);};},set(t,k:string,value){t[k]=value;commands.push(['set',k,value]);return true;}});return{ctx:ctx as unknown as CanvasRenderingContext2D,commands};}
(globalThis as any).document={createElement:()=>{const rec=recorder();return{width:0,height:0,getContext:()=>rec.ctx,style:{}};},fonts:{load:async()=>[],ready:Promise.resolve()}};
const {createNativePreview}=await import('../../src/ssg/game/authoring/native-preview.ts');
const {nativeSceneAdapters}=await import('../../src/ssg/game/authoring/scene-adapters.ts');

const copy=<T,>(v:T):T=>structuredClone(v);
const flat=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flat(n.children??[])]);
const doc=art.validate(copy(libraryComposition));
const node=(d:Composition,id:string)=>flat(d.instances).find(n=>n.id===id)!;
assert.equal(node(doc,'spawn').type,'scene.player','the spawn is the player row');
assert.equal(libraryScene().spawn,74,'the player row is still where the player arrives');

// Validation: a layer on every instance, no drawing passes, drawn artwork in visual layers, markers in logic, at most one player row, in the playfield.
const rejects=(edit:(d:Composition)=>void,pattern:RegExp)=>{const d=copy(doc);edit(d);assert.throws(()=>art.validate(d),pattern);};
rejects(d=>{const n=node(d,'counter');delete (n as Partial<Instance>).layer;(n as any).pass='backdrop';},/drawing passes are retired/);
rejects(d=>{(node(d,'counter') as any).pass='backdrop';},/drawing passes are retired/);
rejects(d=>{delete (node(d,'counter') as Partial<Instance>).layer;},/missing layer/);
rejects(d=>{node(d,'counter').layer='logic';},/visual layer/);
rejects(d=>{d.instances.push({id:'marker',type:'library.spawn-marker',props:{},placement:{x:90,h:0},order:0,layer:'set'});},/logic layer/);
rejects(d=>{node(d,'spawn').layer='set';},/player row belongs in the playfield/);
rejects(d=>{d.instances.push({...copy(node(d,'spawn')),id:'player-2'});},/at most one player row/);
assert.throws(()=>art.validate({version:1,scene:'sequence-x',instances:[{id:'p',type:'scene.player',props:{},placement:{x:0,h:0},order:0,layer:'playfield'}]}),/sequence has no player row/);

// Sorting follows layer, then order: a low order key in a front layer still draws later.
const sorted=copy(doc);node(sorted,'room').layer='foreground';node(sorted,'room').order=-50;
{const ids=libraryGeometry(art.validate(sorted)).map(r=>r.instance.id);assert.ok(ids.indexOf('room')>ids.indexOf('spawn'),'foreground sorts after the playfield');}

// Slots: Library starts with everything behind the player.
assert.equal(slotHasContent(doc,'behind-player'),true);
assert.equal(slotHasContent(doc,'over-player'),false);
assert.equal(slotHasContent(doc,'foreground'),false);

// Restacking: moving the counter to the foreground and the player to the back of the playfield.
const moved=copy(doc);restack(moved,'counter','foreground',0);restack(moved,'spawn','playfield',0);art.validate(moved);
assert.deepEqual(layerRows(moved,'foreground').map(n=>n.id),['counter']);
assert.equal(layerRows(moved,'playfield')[0].id,'spawn');
assert.deepEqual(layerRows(moved,'playfield').map(n=>n.order),layerRows(moved,'playfield').map((_,i)=>i),'restack renumbers the layer');
assert.equal(slotHasContent(moved,'over-player'),true);assert.equal(slotHasContent(moved,'foreground'),true);
assert.throws(()=>restack(copy(doc),'spawn','set',0),/stays in the playfield/);

// Each slot draws only its own rows.
const actors=libraryActors(moved),engine={m:{value:()=>false},hover:null,layer:'all'} as any,view={...frameView(0),sx:(x:number)=>x,y:(h:number)=>300-h,gy:300,viewW:960,viewH:360};
const env=libraryEnvironment(moved,view,engine,actors),drawn=(slot:LayerSlot)=>{const ids:string[]=[];const registry=new Proxy(art,{get(t,k){if(k==='get')return(type:string)=>{const e=t.get(type);return{...e,draw:(...a:unknown[])=>{ids.push(type);return (e.draw as any)(...a);}};};const v=(t as any)[k];return typeof v==='function'?v.bind(t):v;}});drawCompositionSlot(recorder().ctx,registry as typeof art,moved,env,slot);return ids;};
assert.deepEqual(drawn('foreground'),['library.counter']);
assert.ok(drawn('over-player').includes('library.printer')&&!drawn('over-player').includes('library.counter'));
assert.ok(!drawn('behind-player').includes('library.printer')&&drawn('behind-player').includes('library.room'));

// Painting through the native preview, for the layer and editor-view checks below.
const configs=[{width:640,height:360,minute:580,time:0,weather:'clear',reduced:false,hack:false},{width:960,height:540,minute:0,time:2.25,weather:'rain',reduced:false,hack:false},{width:1280,height:720,minute:1100,time:5,weather:'storm',reduced:false,hack:false},{width:400,height:900,minute:1200,time:3.3,weather:'fog',reduced:true,hack:false},{width:960,height:540,minute:580,time:1,weather:'clear',reduced:false,hack:true}];
const paint=(composition:Composition,c:typeof configs[number],index:number,view:{player?:boolean;hidden?:string[]}={})=>{const rec=recorder();createNativePreview(nativeSceneAdapters).render({width:c.width,height:c.height,getContext:()=>rec.ctx,style:{}} as any,{...view,composition,time:c.time,reduced:c.reduced,overlays:false,environment:{day:1,minute:c.minute,seed:3,weather:c.weather,cameraX:index%2?150:0,zoom:1,flags:'{}',state:'{}',hack:c.hack,hover:''}} as any);return JSON.stringify(canonicalPaint(rec.commands));};
assert.notEqual(paint(moved,configs[0],0),paint(doc,configs[0],0),'moving the counter to the foreground changes the frame');
// Editor view state: the player figure is drawn only on request, at the player row; eyes hide objects.
const base=paint(doc,configs[0],0),withPlayer=paint(doc,configs[0],0,{player:true});assert.notEqual(withPlayer,base,'the editor preview draws the player');
const placed=copy(doc);node(placed,'spawn').placement.x=300;assert.notEqual(paint(placed,configs[0],0,{player:true}),withPlayer,'the figure follows the player row');
assert.equal(paint(doc,configs[0],0,{player:true,hidden:['spawn']}),base,'hiding the player row hides the figure');
assert.notEqual(paint(doc,configs[0],0,{hidden:['notice']}),base,'a hidden object drops out of the frame');
console.log('Scene layers PASS: validation, layer-then-order sorting, slots, restacking, drawing passes rejected, the editor player figure and hidden objects.');
