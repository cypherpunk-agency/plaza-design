import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCENES} from '../../src/ssg/game/scenes';
import source from '../../src/ssg/game/world/compositions.json';
import base from '../../src/ssg/game/world/zone-graph.json';
import {compileWorldGraph,compileWorldComposition,editWorldComposition,validateWorldCompositions} from '../../src/ssg/game/world/compositions';
import {worldCompositionContext,compileGameWorld} from '../../src/ssg/game/world/compiled-world';
import {placeFrom,residency,seamsOf,validateZoneGraph} from '../../src/ssg/game/world/zone-graph';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';

const context=worldCompositionContext(SCENES),world=validateWorldCompositions(source),key='boundary-example';
world.compositions[key].members=world.compositions[key].members.filter(m=>m.id==='street');
const compiled=compileWorldComposition(world,key,context);
assert.deepEqual(compiled.chunks.map(c=>[c.chunk,c.x,c.h]),[['boundary-west',0,0],['boundary-east',320,0]]);
assert.deepEqual(placeFrom(compiled.graph,'boundary-east',Infinity).get('boundary-west'),{dx:-320,dh:0,hops:1});
assert.equal(seamsOf(compiled.graph,'boundary-west')[0].other,'boundary-east');
assert(!validateZoneGraph(base).seams.some(s=>s.a.zone==='boundary-west'),'composition replaces the old offset authority');
const graph=compileGameWorld(SCENES);assert.equal(placeFrom(graph,'boundary-west',Infinity).get('boundary-east')?.dx,320);
assert.throws(()=>compileWorldGraph(world,{version:1,seams:[{id:'duplicate',kind:'walk',a:{zone:'boundary-west'},b:{zone:'boundary-east'},dx:320,dh:0}]},context),/both graph and composition/);
for(const change of [
 (s:any)=>s.groups['boundary-street'].members[1].placement.x=321,
 (s:any)=>s.groups['boundary-street'].members[1].chunk='missing',
 (s:any)=>s.groups['boundary-street'].connections[0].a.anchor='missing',
 (s:any)=>s.compositions[key].members.push(s.compositions[key].members[0]),
 (s:any)=>s.compositions[key].members.push({id:'duplicate',chunk:'boundary-west',placement:{x:0,h:0}}),
 (s:any)=>s.groups['boundary-street'].members[0].group='boundary-street',
 (s:any)=>s.compositions[key].members[0].placement.h=Infinity,
 (s:any)=>s.groups['boundary-street'].exports.west.export='loop',
 (s:any)=>s.compositions[key].variant='not-supported',
]){const next=structuredClone(world);change(next);assert.throws(()=>compileWorldComposition(validateWorldCompositions(next),key,context));}
const original=structuredClone(world);
assert.throws(()=>editWorldComposition(world,{composition:key,remove:['street'],add:[{id:'bad',chunk:'absent',placement:{x:0,h:0}}]},context));
assert.deepEqual(world,original,'a failed prospective edit does not change the input');
const empty=editWorldComposition(world,{composition:key,remove:['street'],add:[]},context);assert.equal(empty.compositions[key].members.length,0);
const single=editWorldComposition(empty,{composition:key,remove:[],add:[{id:'west',chunk:'boundary-west',placement:{x:100,h:20}}]},context);
assert.deepEqual(compileWorldComposition(single,key,context).chunks,[{chunk:'boundary-west',path:'west',x:100,h:20}]);
// Placement is independent of traversal. A distant chunk is visible to a directing camera,
// while the stationary player's chunk remains active and intermediate chunks may unload.
const distant=structuredClone(world);distant.groups['boundary-street'].connections=[];distant.groups['boundary-street'].members[1].placement.x=10000;
const far=compileWorldComposition(distant,key,context).graph;
assert.equal(seamsOf(far,'boundary-west').length,0,'layout alone never creates a walk crossing');
const r=residency(far,{active:'boundary-west',camera:{x:10000,w:320},viewW:320,zones:SCENES,hosted:['boundary-west']});
assert.equal(r.zones.get('boundary-west')?.tier,'active');assert.equal(r.zones.get('boundary-east')?.tier,'visible');
const docs=new Map(sourceDocuments.map(d=>[d.id,d.validate(JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8')))]));
validateSourceDocuments(docs);assert.equal(compileGameWorld(pendingRegistry(docs),docs).seams.find(s=>s.a.zone==='boundary-west')?.dx,320);
console.log('World compositions: authored anchors, single/group edits, prospective rejection, one graph authority and remote camera residency PASS');

// The opening is arranged by one composition; external rail seams remain ordinary connections.
const coast=compileWorldComposition(validateWorldCompositions(source),'harbor-world',context);
assert.deepEqual(coast.chunks.map(c=>[c.chunk,c.x,c.h]),[
 ['harbor-station',0,0],['harbor-quay',900,-160],['glide-beach',-13290,-160],['glide-downtown-west',-8790,-160],['glide-downtown',-5400,-160],['glide-galleria',-2460,-160],['glide-spire-bay',-1380,-160],['harbor-checkout',2500,-160],['harbor-yard',3140,-160],['harbor-shed',4420,-160],
]);
const connected=compileGameWorld(SCENES);assert.equal(placeFrom(connected,'harbor-station',Infinity).get('line-harbor-1')?.dx,-1600,'external rail connection survives composition compilation');
const missingLanding=structuredClone(source);delete (missingLanding.groups['harbor-arrival'].connections[0].b as any).offset;
assert.throws(()=>compileWorldComposition(validateWorldCompositions(missingLanding),'harbor-world',context),'stair landing offset is required for the authored geometry');
const ensure={composition:key,remove:['already-gone'],add:[],ensure:true as const};
assert.deepEqual(editWorldComposition(world,ensure,context),world,'explicit ensure makes repeated unmount harmless');
const member=world.compositions[key].members[0];assert.deepEqual(editWorldComposition(world,{composition:key,remove:[],add:[structuredClone(member)],ensure:true},context),world,'identical mount is idempotent');
assert.throws(()=>editWorldComposition(world,{composition:key,remove:[],add:[{...member,placement:{x:100,h:0}}],ensure:true},context),'ensure never replaces a conflicting live member');

const station=SCENES['harbor-station'],movedFloor=structuredClone(station.artwork!);
const findFloor=(nodes:any[]):any=>nodes.find(n=>n.id==='floor-platform')??nodes.flatMap(n=>n.children??[]).map(n=>findFloor([n])).find(Boolean);
const platform=findFloor(movedFloor.instances);assert(platform,'The real arrival platform floor is present');platform.placement.h+=10;
assert.throws(()=>compileGameWorld({...SCENES,'harbor-station':{...station,artwork:movedFloor}}),/anchors do not meet/,'The same world compiler rejects a disconnected floor before previewing a drag');
