import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {frameView,type View} from '../../src/ssg/game/art/core/view';
import {resolveComposition,type Composition,type Environment,type Bounds,type Properties,type Value} from '../../src/ssg/game/art/core/composition';
import {beachComposition,beachGeometry} from '../../src/ssg/game/scenes/beach/composition';
import {harborComposition,harborEnvironment} from '../../src/ssg/game/scenes/harbor/composition';
import {HARBOR_ACTORS} from '../../src/ssg/game/scenes/harbor';
import type {HarborVisual} from '../../src/ssg/game/art/assemblies/harbor-pier';
const view=(cam:number,t:number):View=>({...frameView(t),sx:(x,p=1)=>Math.round(x-cam*p),y:h=>300-h,gy:300,viewW:640,viewH:360,cam});
function beachEnv(v:View):Environment{
 const bindings:Record<string,Value>={};
 for(const row of beachComposition.instances){const e=art.get(row.type);for(const[key,b]of Object.entries(row.bindings??{}))bindings[b]=e.visualFields![key].default;}
 const rows=beachGeometry(),get=(id:string)=>rows.find(r=>r.instance.id===id)!;
 bindings['beach.horizon']=get('horizon').placement.h;bindings['beach.waterline']=get('waterline').placement.h;bindings['beach.barWidth']=get('bar').props.width;
 return{view:v,bindings,state:{},reduced:false};
}
function rows(doc:Composition,env:Environment){return resolveComposition(art,doc,env).filter(r=>r.instance.type.startsWith(doc.scene+'.'));}
function screen(b:Bounds,row:ReturnType<typeof rows>[number],v:View){return{x:v.sx(row.placement.x)+b.x,y:v.y(row.placement.h)-b.h,w:b.w,h:b.tall};}
let count=0;
for(const cam of [0,380,1700])for(const t of [0,137,500])for(const scene of ['beach','harbor']){
 const v=view(cam,t),env=scene==='beach'?beachEnv(v):harborEnvironment(harborComposition,v,HARBOR_ACTORS,-1e9),doc=scene==='beach'?beachComposition:harborComposition,serialized=JSON.stringify(env);
 for(const row of rows(doc,env)){
  const e=art.get(row.instance.type),b=e.bounds(row.props,row.state,{view:v,placement:row.placement});
  assert.ok(Object.values(b).every(Number.isFinite),row.instance.id+' finite');assert.ok(b.w>=0&&b.tall>=0,row.instance.id+' nonnegative');
  assert.notDeepEqual(b,{x:-80,h:150,w:160,tall:150},'blind shared bounds removed: '+row.instance.type);
  for(const point of Object.values(e.anchors(row.props,row.state)))assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.h));
  count++;
 }
 assert.equal(JSON.stringify(env),serialized,'bounds must not mutate controller snapshots');
}
const v=view(380,137),beach=rows(beachComposition,beachEnv(v)),byBeach=(id:string)=>beach.find(r=>r.instance.id===id)!;
for(const type of ['beach.boardwalk','beach.bar-under','beach.pier-deck']){
 const row=beach.find(r=>r.instance.type===type)!,b=art.get(type).bounds(row.props,row.state,{view:v,placement:row.placement});assert.ok(b.w>0&&b.tall>0,type+' actual source extent');
}
const bed=beach.find(r=>r.instance.type==='beach.sunbed')!,bedElement=art.get(bed.instance.type);assert.equal(bedElement.anchors(bed.props,bed.state).seat.h,10);assert.equal(bedElement.bounds(bed.props,bed.state,{view:v,placement:bed.placement}).w,48);
const bar=beach.find(r=>r.instance.type==='beach.bar-shell')!,barElement=art.get(bar.instance.type),barBounds=barElement.bounds(bar.props,bar.state,{view:v,placement:bar.placement});assert.equal(barBounds.w,Number(bar.state.barWidth)+32);assert.equal(barElement.anchors(bar.props,bar.state).floor.h,64);
const pier=beach.find(r=>r.instance.type==='beach.pier-deck')!,pierScreen=screen(art.get(pier.instance.type).bounds(pier.props,pier.state,{view:v,placement:pier.placement}),pier,v);assert.equal(pierScreen.y+pierScreen.h,v.viewH,'piles reach viewport bottom');
const mixer=byBeach('mixer'),mixerElement=art.get(mixer.instance.type),poured:Properties={...mixer.state,freeDrink:true,drinkX:mixer.placement.x+150,drinkH:10};assert.ok(mixerElement.bounds(mixer.props,poured,{view:v,placement:mixer.placement}).w>=160,'poured glass included at its independent source position');
const env=harborEnvironment(harborComposition,v,HARBOR_ACTORS,-1e9),harbor=rows(harborComposition,env),vis=env.bindings!['harbor.visual'] as unknown as HarborVisual;
const container=harbor.find(r=>r.instance.type==='harbor.container')!,containerElement=art.get(container.instance.type);assert.equal(containerElement.bounds(container.props,container.state,{view:v,placement:container.placement}).w,Number(container.props.width));assert.equal(containerElement.anchors(container.props,container.state).top.h,Number(container.props.height));
const cab=harbor.find(r=>r.instance.type==='harbor.craneCabBack')!,cabElement=art.get(cab.instance.type),cabScreen=screen(cabElement.bounds(cab.props,cab.state,{view:v,placement:cab.placement}),cab,v);assert.equal(cabScreen.x,v.sx(vis.cranes[Number(cab.props.index)].twx)-44);
const crane=harbor.find(r=>r.instance.type==='harbor.craneFrame')!,craneBounds=art.get(crane.instance.type).bounds(crane.props,crane.state,{view:v,placement:crane.placement});assert.ok(craneBounds.w>=380&&craneBounds.h>=329,'gantry geometry includes full boom and warning mast');
const fork=harbor.find(r=>r.instance.type==='harbor.forkliftBody')!,forkElement=art.get(fork.instance.type),a=screen(forkElement.bounds(fork.props,fork.state,{view:v,placement:fork.placement}),fork,v),moved=structuredClone(fork.state),movedVis=moved.visual as unknown as HarborVisual;movedVis.forklift.x+=100;const b=screen(forkElement.bounds(fork.props,moved,{view:v,placement:fork.placement}),fork,v);assert.equal(b.x-a.x,100,'bounds follow immutable forklift pose');
console.log('Coastal bounds checks passed: '+count+' resolved frame selections; no blind rectangles; native viewport piles, bar/sunbed anchors, poured glass, exact source container sizes, animated crane/forklift state and immutable snapshots.');
