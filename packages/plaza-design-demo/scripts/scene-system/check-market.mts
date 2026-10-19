import assert from 'node:assert/strict';
import {marketScene,marketFrameEnvironment} from '../../src/ssg/game/scenes/market';
import {marketArt,marketComposition,validateMarketComposition,marketGeometry,marketStalls} from '../../src/ssg/game/scenes/market/composition';
import {stallBox} from '../../src/ssg/game/art/assemblies/construction';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
import type {PreparedCharacter} from '../../src/ssg/game/runtime/characters';
const doc=validateMarketComposition(structuredClone(marketComposition));assert.deepEqual(doc,marketComposition);const native=marketScene();assert.equal(native.width,2080);assert.equal(native.people!.length,41);assert.deepEqual(native.exits.map(e=>e.x),[32,2036,616]);assert.equal(native.lights!.length,9);
const edit=structuredClone(doc);edit.instances.find(i=>i.id==='stall-2')!.placement.x+=14;edit.instances.find(i=>i.id==='laundry')!.placement.x+=30;edit.instances.find(i=>i.id==='fortune')!.placement.x-=20;
const moved=marketScene(edit);assert.equal(moved.uses!.find(u=>u.id==='haggle')!.x,500);assert.equal(moved.uses!.find(u=>u.id==='fortune')!.x,1188);assert.equal(moved.exits.find(e=>e.id==='laundromat')!.x,646);assert.equal(moved.readables!.find(r=>r.id==='rules')!.x,604);assert.equal(moved.lights![2].x,native.lights![2].x+14);
const view={sx:(x:number,p=1)=>Math.round(x-500*p),y:(h:number)=>300-h,gy:300,t:137,cam:500,viewW:640,viewH:360,flags:{}},env=marketFrameEnvironment(view,{} as EngineDraw),movedEnv=marketFrameEnvironment(view,{} as EngineDraw,edit);
const pose=(key:string)=>env.bindings![key] as unknown as PreparedCharacter;
const fortune=pose('market.vendor.fortune');assert.equal(fortune.character.x,1206);assert.equal(fortune.character.h,0);assert.equal((movedEnv.bindings!['market.vendor.fortune'] as unknown as PreparedCharacter).character.x,1186);
const cook=pose('market.vendor.stall-0');assert.equal(cook.character.x,150);assert.equal(cook.visible,true);const sleeper=pose('market.actor.sleeper');assert.equal(sleeper.character.h,stallBox(marketStalls()[8]).counter);const crawler=pose('market.actor.street-33');assert.equal(crawler.character.h,stallBox(marketStalls()[6]).awning);
const bad=structuredClone(doc);bad.instances.find(i=>i.id==='fortune')!.bindings!.vendorPose='missing';assert.throws(()=>validateMarketComposition(bad),/unknown Market/);const g=marketGeometry();assert.equal(g.filter(r=>r.instance.type==='market.stall').length,10);assert.equal(g.filter(r=>r.instance.type==='character.prepared').length,67);
for(const row of g.filter(r=>r.instance.type==='market.stall'||r.instance.type==='market.booth')){
 const e=marketArt.get(row.instance.type),shape=stallBox(marketStalls().find(s=>s.x===row.placement.x)??{x:0,w:Number(row.props.width),seed:Number(row.props.seed)}),bounds=e.bounds(row.props,row.state),anchors=e.anchors(row.props,row.state),booth=row.instance.type==='market.booth';
 assert.equal(bounds.w>=Number(row.props.width)+16,true,'assembly bounds include awning overhang');
 assert.equal(bounds.h>=shape.panel+22,true,'bounds include the hanging sign');
 assert.equal(anchors.counter.x,Number(row.props.width)/2);assert.equal(anchors.counter.h,shape.counter+(booth?4:0));
 assert.equal(anchors.vendor.x,Number(row.props.vendorX));assert.equal(anchors.vendor.h,Number(row.props.vendorH));
 assert.equal(anchors.sign.role,'mount');assert.equal(anchors.counterLeft.role,'surface');
}
const vendorRow=g.find(r=>r.instance.id==='stall-0')!,vendorElement=marketArt.get(vendorRow.instance.type),highVendor={...cook,visible:true as const,height:200};
const tallBounds=vendorElement.bounds(vendorRow.props,{vendorPose:highVendor as never},{view,placement:vendorRow.placement});assert.equal(tallBounds.h,200,'unclipped tall vendor extends stall bounds');
console.log('Market checks passed:source roundtrip;41talkable/source people;3exits;10independent stalls;9lights;stall/laundry/fortune interactions follow source;prepared cook/booth vendor/sleeper/crawler elevations;67 source actor bodies including9 embedded vendor placements;invalid bindings rejected.');
