import{renderOpeningDocument as renderOpeningSequence}from'../../src/ssg/game/story/title/render';
import{lightAt}from'../../src/ssg/game/world/light';
const lighting=lightAt(1,580,90,null);
import assert from 'node:assert/strict';
import {openingElements,openingRegistry} from '../../src/ssg/game/art/sequences/opening/sequence';
import {openingDocuments} from '../../src/ssg/game/story/title/documents';
import {cinematicElements,cinematicRegistry,renderCinematicPicture,cutView} from '../../src/ssg/game/art/sequences/cinematics';
import type {Composition,Instance,Properties} from '../../src/ssg/game/art/core/composition';
import type {TimelineDocument} from '../../src/ssg/game/art/core/timeline';
import {cinematicDocuments} from '../../src/ssg/game/story/cutscenes/documents';
import {visiblePoint} from '../../src/ssg/game/art/sequences/opening/piece-inputs';
import {measureArtwork} from '../../src/ssg/game/art/sequences/opening/measure';

function recorder(){const commands:unknown[][]=[];const values:Record<string,unknown>={globalAlpha:1,getTransform:()=>({a:2}),measureText:(s:string)=>({width:s.length*6})};const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k.startsWith('create'))return()=>({addColorStop(){}});return(...args:unknown[])=>commands.push([k,...args]);},set(t,k:string,v){t[k]=v;commands.push(['set',k,v]);return true;}}) as unknown as CanvasRenderingContext2D;return{ctx,commands};}
(globalThis as unknown as {document:unknown}).document={createElement:()=>({width:0,height:0,getContext:()=>recorder().ctx})};
const source=(id:string)=>{let found:Instance|undefined;const walk=(nodes:Instance[])=>nodes.forEach(n=>{if(n.id===id)found=n;walk(n.children??[]);});walk(openingDocuments.composition.instances);assert.ok(found);return structuredClone(found);};
const timeline:TimelineDocument={version:1,sequences:[{id:'editable',duration:5,composition:'editable',shots:[{id:'shot',from:0,to:5,camera:{x:0,h:0,zoom:1}}],tracks:[],text:[],fades:[],beats:[]}]};
function render(instances:Instance[]){const context=recorder(),composition:Composition={version:1,scene:'sequence-opening',instances};renderOpeningSequence(context.ctx,{W:640,H:360,reduced:false,lighting},{composition,compositionId:'editable',timeline},'editable',0,{ambientTime:7});return context.commands;}
const paints=(commands:unknown[][])=>commands.filter(c=>['fillRect','strokeRect','fill','stroke','drawImage','fillText'].includes(c[0] as string));
const distant=source('coast-crane-sts2');
assert.equal(paints(render([distant])).length,0,'Unedited distant crane must retain native culling');
distant.placement.x=1800;assert.ok(paints(render([distant])).length>0,'Composition offset must move a previously culled crane into view');
const crane=source('coast-crane-sts2');crane.props.worldX=100;assert.ok(paints(render([crane])).length>0,'Crane world-position edit must escape its original quay envelope');
const lounger=source('coast-mid-lounger-0'),duplicate=structuredClone(lounger);duplicate.id='separate-lounger';duplicate.placement.x=40;lounger.props.color='#123456';duplicate.props.color='#654321';
const duplicated=render([lounger,duplicate]);assert.ok(duplicated.some(c=>c[0]==='set'&&c[2]==='#123456'));assert.ok(duplicated.some(c=>c[0]==='set'&&c[2]==='#654321'),'Duplicate instances must retain independent appearance');
assert.throws(()=>openingRegistry.properties('sequence.opening.coast.stack-0',{boxes:[{w:320,p:99,seed:1}]}));
assert.throws(()=>openingRegistry.properties('sequence.opening.town.tower-99001',{signs:[{kind:'script',text:'invalid',h:10,col:'255,136,0'}]}));
assert.throws(()=>openingRegistry.properties('sequence.opening.coast-mid.person-0',{act:'not-an-activity'}));
assert.equal(visiblePoint({W:100},-20,20),true);assert.equal(visiblePoint({W:100,cull:{x:200,scale:1,facing:-1,width:100}},150,10),true);
const stool=source('coast-salt-stool-0');stool.props.seatPaint='#00aabb';const stoolPaint=render([stool]);assert.ok(stoolPaint.some(c=>c[0]==='set'&&c[2]==='#00aabb'),'SALT stool has independent common furniture paint');assert.equal(stoolPaint.filter(c=>c[0]==='fillRect').length,2,'Stool must not redraw the complete bar');
const kiosk=source('coast-pier-kiosk');kiosk.props.text='CUSTOM KIOSK';kiosk.placement.x=1000;assert.ok(render([kiosk]).some(c=>c[0]==='fillText'&&c[1]==='CUSTOM KIOSK'),'Moved pier kiosk exposes its own sign');
const plate=source('coast-buffer-sign-1');plate.props.text='CUSTOM FENCE';plate.placement.x=1500;assert.ok(render([plate]).some(c=>c[0]==='fillText'&&c[1]==='CUSTOM FENCE'),'Buffer plate is independent');
const door=source('coast-hub-door-1');door.placement.x=1400;door.props.paint='#aabbcc';const doorDraw=render([door]);assert.ok(doorDraw.some(c=>c[0]==='set'&&c[2]==='#aabbcc'),'Hub roller door color is independent');assert.equal(doorDraw.filter(c=>c[0]==='fillRect').length,8,'One door must not redraw whole hub');
const cargo=source('coast-ship-stack-1');cargo.placement.x=1600;cargo.props.boxes=[{w:320,p:2,seed:999}];assert.ok(paints(render([cargo])).length>0,'Deck cargo is independently movable');
const advert=source('coast-galleria-advert');advert.placement.x=3000;advert.props.text='CUSTOM AD';assert.ok(render([advert]).some(c=>c[0]==='fillText'&&c[1]==='CUSTOM AD'),'Galleria advert override');
const dome=source('coast-galleria-dome');dome.placement.x=3000;dome.props.paintMode='fixed';dome.props.paint='#1122aa';assert.ok(render([dome]).some(c=>c[0]==='set'&&c[2]==='#1122aa'),'Dome has native appearance control');
for(const element of [...openingElements,...cinematicElements]){
  const registry=element.type.startsWith('sequence.opening.')?openingRegistry:cinematicRegistry;
  const props=registry.properties(element.type,{}),state=registry.visualProperties(element.type,{time:7,reduced:false,width:420,height:240,...(element.type.startsWith('sequence.opening.')?{tau:0,cameraX:0,cameraH:0}:element.type.startsWith('sequence.intro.')?{cameraX:0}:{})});
  const box=element.bounds(props,state);assert.ok([box.x,box.h,box.w,box.tall].every(Number.isFinite),element.type+' finite bounds');assert.ok(box.w>=0&&box.tall>=0);
  const anchors=element.anchors(props,state);assert.ok(Object.values(anchors).every(a=>Number.isFinite(a.x)&&Number.isFinite(a.h)),element.type+' finite anchors');
}
const palm=openingRegistry.get('sequence.opening.coast.palm-1'),props=openingRegistry.properties(palm.type,{}),state:Properties={time:7,tau:0,reduced:false,width:420,height:240,cameraX:0,cameraH:0};
assert.ok(palm.bounds(props,state).w<420);assert.ok(palm.anchors(props,state).crown);
const bed=openingRegistry.get('sequence.opening.coast-mid.lounger-0'),bedProps=openingRegistry.properties(bed.type,{});assert.ok(bed.bounds({...bedProps,parasol:false},state).tall<bed.bounds(bedProps,state).tall,'Removing parasol changes visual bounds');
const bounds=measureArtwork(ctx=>{ctx.translate(10,20);ctx.scale(-2,2);ctx.fillRect(-5,-10,10,10);});assert.deepEqual(bounds,{x:0,y:0,width:20,height:20});
function cinematic(id:'act2'|'taxi',instances:Instance[],time=1){
  const context=recorder(),composition:Composition={version:1,scene:'sequence-'+id,instances};
  const custom:TimelineDocument={...timeline,sequences:[{...timeline.sequences[0],id,composition:'editable'}]};
  renderCinematicPicture(context.ctx,cutView(640,360,false,lighting),{...cinematicDocuments,timeline:custom,compositions:{editable:composition}},id,time,{composition});return context.commands;
}
const piece=(id:string,type:string,props:Properties):Instance=>({id,type,version:1,placement:{x:0,h:0,scale:1,facing:1,parallax:1},props});
const ferries=cinematic('act2',[piece('ferry-a','sequence.act2.ferry',{paint:'#112233'}),piece('ferry-b','sequence.act2.ferry',{paint:'#334455'})]);
for(const color of ['#112233','#334455'])assert.ok(ferries.some(c=>c[0]==='set'&&c[2]===color),'Independent ferry paint '+color);
const towers=cinematic('taxi',[piece('towers','sequence.taxi.towers',{fill:'#223344'})]);assert.ok(towers.some(c=>c[0]==='set'&&c[2]==='#223344'),'Taxi tower fill');
assert.notDeepEqual(cinematic('taxi',[piece('lights','sequence.taxi.lights',{far:0,middle:0,near:0})]),cinematic('taxi',[piece('lights','sequence.taxi.lights',{far:2,middle:3,near:4})]),'Light speed fields drive the native motion kernel');
assert.throws(()=>cinematicRegistry.properties('sequence.taxi.lights',{far:-1}));
console.log('Sequence editing checks passed: relocation/culling, independent furniture and ferry appearance, taxi light motion/tower fill, schema rejection, all registered geometry/anchor contracts, and common-kit-driven bounds.');
