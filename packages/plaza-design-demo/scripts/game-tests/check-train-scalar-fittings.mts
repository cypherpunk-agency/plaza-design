/** Portable train fittings use scalar native bindings and retain their drawing/animation geometry. */
import assert from 'node:assert/strict';
import composition from '../../src/ssg/game/scenes/train/composition.json';
import {art,resolveComposition} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {createTrainInteriorArtwork} from '../../src/ssg/game/art/assemblies/train-interior';
import {drawCabCeilingLight,drawCabAdvert,drawCabAdTell,drawCabCarPlate,drawCabRegistry,drawCabHandrail,drawCabStrap} from '../../src/ssg/game/art/vehicles/train-fittings';
const ids=['ceilingLight','advert','adTell','carPlate','registryScreen','handrail','strap'];
function record(){const ops:any[]=[],state:Record<string,unknown>={};const ctx=new Proxy(state,{get(o,k:string){
 if(k in o)return o[k];if(k==='measureText')return(text:string)=>({width:text.length*5});
 if(k.startsWith('create'))return(...args:unknown[])=>{ops.push([k,...args]);return{addColorStop:(...args:unknown[])=>ops.push(['stop',...args])};};
 return(...args:unknown[])=>ops.push([k,...args]);
},set(o,k:string,value:any){o[k]=value;ops.push(['set',k,value&&typeof value==='object'&&'addColorStop'in value?'gradient':value]);return true;}}) as unknown as CanvasRenderingContext2D;return{ops,ctx};}
for(const id of ids)for(const home of [false,true])for(const t of [0,137,181])for(const x of [70,500,1000])for(const h of [0,25]){
 const element=art.get('train.'+id),props=art.properties(element.type,{}),state=art.visualProperties(element.type,Object.fromEntries(Object.entries({home,news:'NATIVE NEWS',running:true,run:.5}).filter(([k])=>element.visualFields?.[k])));
 assert.equal(element.libraryUse,'reusable');assert(!element.visualFields?.frame,'a portable fitting has no room-frame input');
 const v={...frameView(t),viewW:640,viewH:360,gy:300,y:(q:number)=>300-q},V={...v,gy:300-h,y:(q:number)=>300-q-h},a=record(),b=record();
 element.draw(a.ctx,v,props,state,'backdrop',{x,h,scale:1,facing:1,parallax:1});
 switch(id){case'ceilingLight':drawCabCeilingLight(b.ctx,V,x,Number(props.width),Number(props.ceiling));break;
  case'advert':drawCabAdvert(b.ctx,V,x,String(props.text),String(props.homeText),Number(props.index),home,'NATIVE NEWS');break;
  case'adTell':drawCabAdTell(b.ctx,V,x);break;
  case'carPlate':drawCabCarPlate(b.ctx,V,x,String(props.text),Number(props.width),Number(props.height));break;
  case'registryScreen':drawCabRegistry(b.ctx,V,x,(home?props.homePages:props.pages) as string[][]);break;
  case'handrail':drawCabHandrail(b.ctx,v,x,Number(props.width),h);break;
  case'strap':drawCabStrap(b.ctx,v,x,h,true,.5);break;
 }
 assert.deepEqual(a.ops,b.ops,id+' registered placement consumes the shared kernel at '+x+'/'+h+'/'+t);
 const bounds=element.bounds(props,state,{view:v,placement:{x,h,scale:1,facing:1,parallax:1}});assert(Object.values(bounds).every(Number.isFinite));
}
const view={...frameView(137),viewW:640,viewH:360,gy:300,y:(q:number)=>300-q};
function draw(id:string,props:any={},state:any={},x=70,h=25){const e=art.get('train.'+id),r=record();e.draw(r.ctx,view,art.properties(e.type,props),art.visualProperties(e.type,state),'backdrop',{x,h,scale:1,facing:1,parallax:1});return r.ops;}
assert(draw('ceilingLight').some(op=>JSON.stringify(op)===JSON.stringify(['fillRect',70,111,1200,3])),'ceiling tube retains its native strip coordinates');
assert(draw('ceilingLight').some(op=>JSON.stringify(op)===JSON.stringify(['createLinearGradient',0,109,0,149])),'ceiling glow retains its native gradient');
assert(draw('handrail',{width:80}).some(op=>JSON.stringify(op)===JSON.stringify(['fillRect',70,275,80,2])));
assert(draw('strap',{}, {running:true,run:.5}).some(op=>JSON.stringify(op)===JSON.stringify(['moveTo',70.5,277])));
assert(draw('strap',{}, {running:true,run:.5}).some(op=>JSON.stringify(op)===JSON.stringify(['strokeRect',71.5,287.5,6,5])),'strap retains its positional phase and swing');
assert(draw('carPlate').some(op=>JSON.stringify(op)===JSON.stringify(['fillRect',72,201,66,12])));
assert(draw('registryScreen').some(op=>JSON.stringify(op)===JSON.stringify(['fillRect',74,151,62,30])));
assert(draw('advert',{index:1},{home:true,news:'NATIVE NEWS'}).some(op=>op[0]==='fillText'&&op[1]==='NEWS'));
assert(draw('advert',{index:1},{home:true,news:'NATIVE NEWS'}).some(op=>op[0]==='fillText'&&String(op[1]).includes('NATIVE NEWS')),'the explicit news input still scrolls');
assert.throws(()=>art.properties('train.registryScreen',{pages:[]}),/nonempty/);
assert.throws(()=>art.properties('train.registryScreen',{pages:[[12]]}),/text lines/);
// Actual source compilation supplies scalar bindings; the room factory no longer executes these pieces.
const scene=SCENES.train,model=new SceneModel({say(){},open(){},changed(){}},scene.data!,typeof scene.rules==='function'?scene.rules({} as never):scene.rules);
scene.preparePresentation!(view,{m:model,hover:null,layer:'all'});
const env=scene.visualEnvironment!(view,{m:model,hover:null,layer:'all'}),rows=resolveComposition(art,composition as never,env),frame=env.bindings!['train.frame'] as any;
const room=createTrainInteriorArtwork(frame);
for(const id of ids){assert(!(id in room),'removed room-factory method '+id);for(const row of rows.filter(r=>r.instance.type==='train.'+id)){
 assert(!('frame'in row.state));assert(!('frame'in(row.instance.bindings??{})));
 if('width'in row.state)assert.equal(row.state.width,frame.L.width);
 if('ceiling'in row.state)assert.equal(row.state.ceiling,frame.L.ceil);
 if('home'in row.state)assert.equal(row.state.home,frame.visual.home);
 if('running'in row.state)assert.equal(row.state.running,frame.visual.ride.phase==='running');
 if('run'in row.state)assert.equal(row.state.run,frame.visual.run);
 const r=record();row.element.draw(r.ctx,view,row.props,row.state,'backdrop',row.placement);
}}
console.log('Train scalar fittings PASS: seven independent kernels, native scalar bindings, preserved coordinates/news/swing, strict pages and removed room-factory methods.');
