/** Current public placement contracts: typed defaults, finite geometry, repeatable drawing and explicit context. */
import assert from 'node:assert/strict';
import {art,resolveComposition,drawCompositionSlot,type Composition} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {assetInventory} from '../../src/ssg/game/authoring/asset-browser';
import {drawSkyShips,createSkyShips} from '../../src/ssg/game/art/environment/sky-ships';
import {SCENES} from '../../src/ssg/game/scenes';
import shop from '../../src/ssg/game/scenes/shop/composition.json';
import {shelf,type ShelfSpec} from '../../src/ssg/game/art/assemblies/construction';
import {createCornerShopArtwork} from '../../src/ssg/game/art/assemblies/corner-shop';
import {shopDefaultLayout} from '../../src/ssg/game/art/assemblies/shop-layout';
const view={...frameView(137),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h};
function record(){const ops:unknown[]=[],state:Record<string,any>={canvas:{width:640,height:360},getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(s:string)=>({width:String(s).length*5})};const ctx=new Proxy(state,{get(o,k:string){if(k in o)return o[k];if(k.startsWith('create'))return()=>({addColorStop(...a:unknown[]){ops.push(['stop',...a]);}});return(...a:unknown[])=>ops.push([k,...a]);},set(o,k:string,v){o[k]=v;ops.push([k,v]);return true;}}) as CanvasRenderingContext2D;return{ctx,ops};}
let reusable=0,context=0,helpers=0;
const originalDocument=globalThis.document;
Object.assign(globalThis,{document:{createElement:(tag:string)=>{assert.equal(tag,'canvas');return{width:0,height:0,getContext:()=>record().ctx};}}});
for(const entry of assetInventory(art,[])){
 const e=art.get(entry.id);
 if(entry.usability==='helper'){helpers++;continue;}
 if(entry.usability==='context'){context++;continue;}
 reusable++;
 const props=art.properties(e.type,{}),state=art.visualProperties(e.type,{});
 const layer=e.framePhase==='sky'?'distance':e.parts.length?'set':'logic';
 const composition:Composition={version:1,scene:'placement',instances:[{id:'original',type:e.type,props,placement:{x:80,h:20},layer,order:0},{id:'copy',type:e.type,props:structuredClone(props),placement:{x:140,h:30},layer,order:1}]};
 const rows=resolveComposition(art,art.validate(composition),{view,state:{},reduced:false}),before=JSON.stringify({props,state});
 assert.equal(rows.length,2);assert.equal(rows[1].placement.x-rows[0].placement.x,60);
 for(const row of rows){const b=e.bounds(row.props,row.state,{view,placement:row.placement});for(const v of Object.values(b))assert(Number.isFinite(v),e.type+' finite bounds');}
 const draw=()=>{const r=record();for(const pass of e.parts)e.draw(r.ctx,view,props,state,pass,rows[0].placement);return JSON.stringify(r.ops.filter(op=>(op as unknown[])[0]!=='stop'));};
 assert.deepEqual(draw(),draw(),e.type+' repeatable standalone picture');
 assert.equal(JSON.stringify({props,state}),before,e.type+' painting keeps source/state immutable');
 if(['warehouse','library','market','moth','capsule','landmark','laundromat','downtown','shop','beach','harbor','metro','yard','mall','sandbox','station','dockwork','terminal','shift','train'].includes(e.type.split('.')[0])){
  const original=record(),moved=record();for(const pass of e.parts){e.draw(original.ctx,view,props,state,pass,rows[0].placement);e.draw(moved.ctx,view,props,state,pass,rows[1].placement);}
  assert.notEqual(JSON.stringify(original.ops),JSON.stringify(moved.ops),e.type+' moves its actual drawing, not only its selection bounds');
  assert(original.ops.some(op=>['fillRect','strokeRect','fillText','stroke','fill','drawImage'].includes(String((op as unknown[])[0]))),e.type+' produces actual paint commands without source context');
 }
}
// The extracted default fleet retains exactly the original primitive's commands inside its placement transform.
const sky=art.get('environment.sky-traffic'),props=art.properties(sky.type,{}),a=record(),b=record();
drawSkyShips(a.ctx,view,createSkyShips());sky.draw(b.ctx,view,props,{},'backdrop',{x:0,h:0,scale:1,facing:1,parallax:1});
assert.equal(JSON.stringify(b.ops.slice(2,-1)),JSON.stringify(a.ops),'sky extraction preserves default fleet drawing');
assert.throws(()=>art.properties(sky.type,{ships:[{kind:'unknown'}] as never}));
// Sky rows are excluded from ordinary world slots, painted once in their explicit phase,
// and scaled only by composition's existing transform (never again inside the kernel).
const fleetDoc:Composition={version:1,scene:'fleet',instances:[{id:'fleet',type:sky.type,props:{ships:[{kind:'freighter',ps:1,y:60,speed:.1,offset:800,flip:false,depth:.4}]},placement:{x:0,h:0,scale:2},layer:'distance',order:0}]};
const fleet=record();drawCompositionSlot(fleet.ctx,art,fleetDoc,{view,state:{},reduced:false},'behind-player');assert.equal(fleet.ops.length,0,'sky rows never paint in the ordinary slot');
drawCompositionSlot(fleet.ctx,art,fleetDoc,{view,state:{},reduced:false},'behind-player',undefined,'sky');assert.equal(fleet.ops.filter(op=>JSON.stringify(op)==='["scale",2,2]').length,1,'one scale at the composition boundary');
for(const scene of Object.values(SCENES))if(scene.ambient?.sky)assert.equal(typeof scene.drawSkyArtwork,'function',scene.id+' sky is authored, not an automatic runtime fallback');
// The Shop uses the shared shelf kernel directly: no numbered type or source-layout wrapper survives.
const shelves=shop.instances.filter(n=>n.type==='furniture.shelf');assert.deepEqual(shelves.map(n=>n.id),['shelf-0','shelf-1','shelf-2']);
for(const row of shelves)for(const cam of [0,133.5,400])for(const h of [0,25]){
 const v={...view,cam,sx:(wx:number,depth=1)=>Math.round(wx-cam*depth)},a=record(),b=record(),p=art.properties('furniture.shelf',row.props),at={...row.placement,h,scale:1,facing:1 as const,parallax:1};
 shelf(a.ctx,{...v,gy:v.gy-h,y:q=>v.y(q+h)},{x:at.x,w:Number(p.width),h:Number(p.height),rows:Number(p.rows),seed:Number(p.seed),stock:p.stock as ShelfSpec['stock']});
 art.get('furniture.shelf').draw(b.ctx,v,p,{},'backdrop',at);assert.equal(JSON.stringify(b.ops),JSON.stringify(a.ops),'shared shelf preserves the source shelf drawing commands');
}
for(const old of ['shop.shelf-0','shop.shelf-1','shop.shelf-2'])assert.throws(()=>art.get(old),'superseded numbered shelf types must not survive as aliases');
assert.throws(()=>art.properties('furniture.shelf',{rows:1.5}),'fractional stock rows reject');
const tubes=shop.instances.filter(n=>n.type==='furniture.strip-light');assert.deepEqual(tubes.map(n=>n.id),['tube-0','tube-1','tube-2']);
for(const row of tubes)for(const [t,failed] of [[0,false],[151,true],[155,false],[181,true]] as const){
 const r=record(),at={...row.placement,scale:1,facing:1 as const,parallax:1},p=art.properties('furniture.strip-light',row.props);
 art.get('furniture.strip-light').draw(r.ctx,{...view,t},p,{},'backdrop',at);
 assert(r.ops.some(op=>JSON.stringify(op)===JSON.stringify(['moveTo',at.x-30,view.y(156)])),'tube cone starts two pixels below its mount');
 assert(r.ops.some(op=>JSON.stringify(op)===JSON.stringify(['lineTo',at.x-110,view.y(0)])),'tube cone keeps its original floor endpoint');
 const color=row.id==='tube-1'&&failed?'rgba(255,230,190,.25)':'rgba(255,240,215,.9)';assert(r.ops.some(op=>JSON.stringify(op)===JSON.stringify(['fillStyle',color])),'source-selected failing tube retains its exact cadence');
}
for(const old of ['shop.tube-0','shop.tube-1','shop.tube-2'])assert.throws(()=>art.get(old),'numbered light variants must not survive as aliases');
const rooms=shop.instances.filter(n=>n.type==='shop.upstairs-room');assert.deepEqual(rooms.map(n=>n.props.variation),[0,1,2,3,4,5,6,7]);
for(const row of rooms)for(const cam of [0,200]){
 const v={...view,cam,gy:1100,y:(h:number)=>1100-h,sx:(wx:number,depth=1)=>Math.round(wx-cam*depth)},a=record(),b=record(),p=art.properties(row.type,row.props),at={...row.placement,scale:1,facing:1 as const,parallax:1};
 const native=createCornerShopArtwork({L:structuredClone(shopDefaultLayout),lighting:v.lighting});native.upstairsRoom(a.ctx,v,Number(p.variation));art.get(row.type).draw(b.ctx,v,p,{},'backdrop',at);
 assert.equal(JSON.stringify(b.ops),JSON.stringify(a.ops),'one room type preserves every original room variation at its source position');
 assert.throws(()=>art.get('shop.upstairs-room-'+p.variation),'numbered upper-room types must not survive as aliases');
}
assert.throws(()=>art.properties('shop.upstairs-room',{variation:8}),'unsupported room variation rejects');
console.log(JSON.stringify({status:'PASS',reusable,context,helpers,checks:['standalone move/duplicate geometry','read-only repeatable paint','typed fleet rejection','fleet drawing preservation','source-owned scene sky']}));
Object.assign(globalThis,{document:originalDocument});
