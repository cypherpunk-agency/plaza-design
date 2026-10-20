/** Every scene is layered, its manifest spawn is its single player row, and it paints exactly as the same
 * document in the older pass format (Downtown: city/street/devices/people passes) in five preview cases. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {canonicalPaint} from './canonical-paint.mts';
import {art} from '../../src/ssg/game/art';
import {LAYERS, isLayered, type Composition, type Instance} from '../../src/ssg/game/art/core/composition';

// Artwork may cache gradients across frames; ids are global so a cached gradient made on an earlier canvas still resolves.
let gradientIds=0;const gradientDefs=new Map<number,unknown[][]>();
function recorder(){const commands:unknown[][]=[];const values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(text:string)=>({width:text.length*6}),getImageData:(_x:number,_y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})};const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return(...args:unknown[])=>{const id=++gradientIds,def:unknown[][]=[[k,...args,id]];gradientDefs.set(id,def);commands.push(def[0]);return{id,addColorStop:(...a:unknown[])=>{const stop=['stop',id,...a];def.push(stop);commands.push(stop);},setTransform:()=>{}};};return(...args:unknown[])=>{commands.push([k,...args]);};},set(t,k:string,value){t[k]=value;commands.push(['set',k,value]);return true;}});return{ctx,commands};}
/** Prepend definitions of gradients this canvas used but did not create (cached from an earlier render). */
function withCachedGradients(commands:unknown[][]){const own=new Set(commands.filter(c=>typeof c[0]==='string'&&(c[0] as string).startsWith('create')).map(c=>c[c.length-1]));const foreign=new Set<number>();for(const c of commands)if(c[0]==='set'&&c[2]&&typeof c[2]==='object'&&'id' in (c[2] as object)){const id=(c[2] as {id:number}).id;if(!own.has(id))foreign.add(id);}return[...[...foreign].flatMap(id=>gradientDefs.get(id)??[]),...commands];}
(globalThis as any).document={createElement:()=>{const rec=recorder();return{width:0,height:0,getContext:()=>rec.ctx,style:{}};},fonts:{load:async()=>[],ready:Promise.resolve()}};
const {createNativePreview}=await import('../../src/ssg/game/authoring/native-preview.ts');
const {nativeSceneAdapters}=await import('../../src/ssg/game/authoring/scene-adapters.ts');

const flat=(ns:Instance[]):Instance[]=>ns.flatMap(n=>[n,...flat(n.children??[])]);
const STREET=new Set(['downtown.street','downtown.stall-pool','downtown.smear']);
/** The same document in pass format: one back-to-front sequence, the player row as a plain group. */
function passFormat(doc:Composition):Composition{
 const copy=structuredClone(doc),rows=flat(copy.instances);
 rows.map((n,i)=>({n,i})).sort((a,b)=>LAYERS.indexOf(a.n.layer!)-LAYERS.indexOf(b.n.layer!)||a.n.order-b.n.order||a.i-b.i).forEach(({n},i)=>{n.order=i;});
 for(const n of rows){
  const l=n.layer!;delete n.layer;
  n.pass=doc.scene==='downtown'?(STREET.has(n.type)?'foreground':l==='set'?'devices':l==='playfield'?'people':'backdrop'):(l==='foreground'?'foreground':'backdrop');
  if(n.type==='scene.player'){n.type='assembly.group';n.props={};}
 }
 return copy;
}
const configs=[{width:640,height:360,minute:580,time:0,weather:'clear',reduced:false,hack:false},{width:960,height:540,minute:0,time:2.25,weather:'rain',reduced:false,hack:false},{width:1280,height:720,minute:1100,time:5,weather:'storm',reduced:false,hack:false},{width:400,height:900,minute:1200,time:3.3,weather:'fog',reduced:true,hack:false},{width:960,height:540,minute:580,time:1,weather:'clear',reduced:false,hack:true}];
const paint=(composition:Composition,c:typeof configs[number],index:number)=>{const rec=recorder();createNativePreview(nativeSceneAdapters).render({width:c.width,height:c.height,getContext:()=>rec.ctx,style:{}} as any,{composition,time:c.time,reduced:c.reduced,overlays:false,environment:{day:1,minute:c.minute,seed:3,weather:c.weather,cameraX:index%2?150:0,zoom:1,flags:'{}',state:'{}',hack:c.hack,hover:''}} as any);return JSON.stringify(canonicalPaint(withCachedGradients(rec.commands)));};

const root='src/ssg/game/scenes',checked:string[]=[];
for(const dir of fs.readdirSync(root).sort()){
 const file=path.join(root,dir,'composition.json');if(!fs.existsSync(file))continue;
 const doc=art.validate(JSON.parse(fs.readFileSync(file,'utf8'))) as Composition;
 assert.ok(isLayered(doc),dir+' is layered');
 const players=flat(doc.instances).filter(n=>n.type==='scene.player');
 assert.equal(players.length,1,dir+' has one player row');
 const scene=JSON.parse(fs.readFileSync(path.join(root,dir,'scene.json'),'utf8'));
 assert.equal(typeof scene.manifest.spawn==='string'?scene.manifest.spawn:scene.manifest.spawn.instance,players[0].id,dir+': the manifest spawn is the player row');
 if(!nativeSceneAdapters[doc.scene as keyof typeof nativeSceneAdapters])continue;
 const legacy=passFormat(doc);
 for(const [index,c] of configs.entries())assert.equal(paint(doc,c,index),paint(legacy,c,index),`${dir}: layered paint matches the pass format, case ${index}`);
 checked.push(dir);
}
console.log(`All scene layers PASS: every scene is layered with its spawn as the player row; paint parity with the pass format in 5 cases for ${checked.length} scenes (${checked.join(', ')}).`);
