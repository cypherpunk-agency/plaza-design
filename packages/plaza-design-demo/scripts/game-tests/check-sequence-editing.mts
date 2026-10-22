/** Current sequence editing contracts: ordinary world artwork and the shared timeline/frame. */
import assert from 'node:assert/strict';
import {art,type Composition,type Instance,type Properties} from '../../src/ssg/game/art';
import {evaluateTimeline,type TimelineDocument} from '../../src/ssg/game/art/core/timeline';
import {renderOpeningDocument} from '../../src/ssg/game/story/title/render';
import {openingDocuments} from '../../src/ssg/game/story/title/documents';
import {renderSequenceFrame} from '../../src/ssg/game/runtime/sequence-frame';
import {cinematicDocuments} from '../../src/ssg/game/story/cutscenes/documents';
import {cinematicRegistry} from '../../src/ssg/game/art/sequences/cinematics';
import {lightAt} from '../../src/ssg/game/world/light';
import {SCENES,NATIVE_SCENES} from '../../src/ssg/game/scenes';
import {createSceneRegistry} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
import {BACKDROP_SOURCES} from '../../src/ssg/game/world/backdrops';
import authored from '../../src/ssg/game/scenes/authored.json';
function recorder(){const commands:unknown[][]=[],stack:Record<string,unknown>[]=[];const values:Record<string,unknown>={globalAlpha:1,getTransform:()=>({a:1}),measureText:(s:string)=>({width:s.length*6})};const ctx=new Proxy(values,{get(t,k:string){if(k==='save')return()=>{stack.push({...t});commands.push(['save']);};if(k==='restore')return()=>{Object.assign(t,stack.pop());commands.push(['restore']);};if(k in t)return t[k];if(k.startsWith('create'))return()=>({addColorStop(){}});return(...args:unknown[])=>commands.push([k,...args]);},set(t,k:string,v){t[k]=v;commands.push(['set',k,v]);return true;}}) as unknown as CanvasRenderingContext2D;return{ctx,commands};}
(globalThis as unknown as {document:unknown}).document={createElement:()=>({width:0,height:0,getContext:()=>recorder().ctx})};
const lighting=lightAt(1,1075,243,null),view={W:1280,H:720,reduced:false,lighting};
const timeline:TimelineDocument={version:1,sequences:[{id:'editable',duration:10,composition:'editable',shots:[{id:'one',from:0,to:10,camera:{x:0,h:0,zoom:1}}],tracks:[],text:[],fades:[],beats:[]}]};
function world(scenes=SCENES,time=0){const r=recorder();renderOpeningDocument(r.ctx,view,openingDocuments,'glide',time,{scenes,ambientTime:7+time});return r.commands;}
const draft=structuredClone(authored),beach=draft.scenes.find(s=>s.scene.id==='glide-beach')!,lounger=beach.composition.instances.find(n=>n.type==='props.lounger')!;
lounger.placement={...lounger.placement,x:1400,h:-69};lounger.props={...lounger.props,color:'#123456'} as typeof lounger.props;
const copy=structuredClone(lounger);copy.id='second-lounger';copy.placement.x=1600;copy.props={...copy.props,color:'#654321'} as typeof copy.props;beach.composition.instances.push(copy);
const pending=createSceneRegistry(NATIVE_SCENES,draft),paint=world(pending);
for(const color of ['#123456','#654321'])assert.ok(paint.some(c=>c[0]==='set'&&c[2]===color),'Pending scene artwork reaches the sequence frame: '+color);
for(const time of [0,19,55,65])assert.equal(JSON.stringify(world(SCENES,time)),JSON.stringify(world(SCENES,time)),'Drawing twice at the same time is deterministic: '+time);
const frame=evaluateTimeline(openingDocuments.timeline,'glide',55,{registry:art,compositions:{[openingDocuments.compositionId]:openingDocuments.composition}});
const moved=recorder();renderOpeningDocument(moved.ctx,view,openingDocuments,'glide',55,{frame:{...frame,camera:{...frame.camera,x:frame.camera.x+200}},ambientTime:62});assert.notDeepEqual(moved.commands,world(SCENES,55),'Pending camera changes reach the world frame');
const background=structuredClone(BACKDROP_SOURCES['glide-coast'].composition);background.instances.find(n=>n.id==='spire')!.placement.x+=300;
const changedBackground=recorder();renderOpeningDocument(changedBackground.ctx,view,openingDocuments,'glide',55,{ambientTime:62,documents:new Map([['backdrop-glide-coast',background]])});assert.notEqual(JSON.stringify(changedBackground.commands),JSON.stringify(world(SCENES,55)),'Pending backdrop artwork reaches the sequence, not just its scene preview');
assert.ok(!art.catalog().some(e=>e.type.startsWith('sequence.opening.')),'No legacy opening artwork wrappers');
function cinematic(id:'act2'|'taxi',instances:Instance[],time=1){
  const context=recorder(),composition:Composition={version:1,scene:'sequence-'+id,instances};
  const custom:TimelineDocument={...timeline,sequences:[{...timeline.sequences[0],id,composition:'editable'}]};
  renderSequenceFrame(context.ctx,{documents:{...cinematicDocuments,timeline:custom,compositions:{editable:composition}},sequenceId:id,composition,scale:2,width:640,height:360,reduced:false,lighting,time});return context.commands;
}
const piece=(id:string,type:string,props:Properties):Instance=>({id,type,version:1,placement:{x:0,h:0,scale:1,facing:1,parallax:1},props,order:0,layer:'set'});
const ferries=cinematic('act2',[piece('ferry-a','sequence.act2.ferry',{paint:'#112233'}),piece('ferry-b','sequence.act2.ferry',{paint:'#334455'})]);
for(const color of ['#112233','#334455'])assert.ok(ferries.some(c=>c[0]==='set'&&c[2]===color),'Independent ferry paint '+color);
const towers=cinematic('taxi',[piece('towers','sequence.taxi.towers',{fill:'#223344'})]);assert.ok(towers.some(c=>c[0]==='set'&&c[2]==='#223344'),'Taxi tower fill');
assert.notDeepEqual(cinematic('taxi',[piece('lights','sequence.taxi.lights',{far:0,middle:0,near:0})]),cinematic('taxi',[piece('lights','sequence.taxi.lights',{far:2,middle:3,near:4})]),'Light speed fields drive the native motion kernel');
assert.throws(()=>cinematicRegistry.properties('sequence.taxi.lights',{far:-1}));
console.log('World sequence editing PASS: pending scene appearance and duplication, deterministic seek, camera changes, cinematic appearance and motion, no legacy wrappers.');
