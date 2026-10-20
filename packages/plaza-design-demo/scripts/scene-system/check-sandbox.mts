import bindingSource from '../../src/ssg/game/scenes/sandbox/scene.json';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import type {SceneData as GeometryDeviceData} from '../../src/ssg/game/data/types';
import {projectDeviceBindings} from '../../src/ssg/game/engine/gameplay/device-bindings';
import {manifestGeometry} from '../../src/ssg/game/engine/gameplay/manifest-geometry';
import assert from 'node:assert/strict';
import { sandboxArt,sandboxComposition,sandboxGeometry,sandboxStations,validateSandboxComposition } from '../../src/ssg/game/scenes/sandbox/composition';
import { sandboxScene,sandboxFrameEnvironment } from '../../src/ssg/game/scenes/sandbox';
import { SandboxViewState,validateSandboxSnapshot,type SandboxSnapshot } from '../../src/ssg/game/art/assemblies/sandbox-state';
import { resolveComposition,type Composition,type Value } from '../../src/ssg/game/art';
import type { EngineDraw } from '../../src/ssg/game/engine/host';
import type { SceneData } from '../../src/ssg/game/data/types';
import devices from '../../src/ssg/game/scenes/sandbox/devices.json';
import { createSandboxArtwork } from '../../src/ssg/game/art/assemblies/sandbox';
import { emptySandboxSnapshot } from '../../src/ssg/game/art/assemblies/sandbox-state';
import { box,onScreen,O,PAPER } from '../../src/ssg/game/art/core/primitives';
import type { View } from '../../src/ssg/game/art/core/view';
const sandboxDeviceData=(data:GeometryDeviceData,composition=sandboxComposition)=>{const source=bindingSource as unknown as SceneDocument,rows=sandboxGeometry(composition);return projectDeviceBindings(source,rows,data,manifestGeometry(source,rows,[],{groundSpawn:false}).width);};
const normalizeGeometry=(data:GeometryDeviceData)=>({...data,devices:data.devices.map(d=>({...d,...(d.layout?.spot?{layout:{...d.layout,spot:{y:0,...d.layout.spot}}}:{})}))});
// Frozen picture-kernel fixture parameters; not a shipping scene configuration.
function sandboxLayout(doc:Composition=sandboxComposition):import('../../src/ssg/game/art/assemblies/sandbox').SandboxLayout{const rows=sandboxGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,x=(id:string)=>get(id).placement.x,w=get('window');return{door:x('door'),spawn:x('spawn'),plan:x('plan'),reset:x('reset'),dispenser:x('chip-dispenser'),radiator:x('radiator'),bench:x('wait-bench'),window:{x0:w.placement.x,x1:w.placement.x+Number(w.props.width),h0:w.placement.h,h1:w.placement.h+Number(w.props.height)},end:x('end-wall')};}
const doc=validateSandboxComposition(JSON.parse(JSON.stringify(sandboxComposition)));
assert.deepEqual(doc,sandboxComposition);assert.equal(doc.instances.length,155);
assert.deepEqual(sandboxDeviceData(devices as SceneData),normalizeGeometry(devices as SceneData),'all37 original physical device spots remain exact');
assert.equal(sandboxLayout().spawn,80);assert.equal(sandboxStations().length,10);assert.deepEqual(sandboxStations()[2],{n:3,x0:1210,x1:1610,sign:1215,title:'GUARDS',sub:'PASSWORD · RINGS · CIPHER · CRYPTEX · MORSE'});
const edit=structuredClone(doc);edit.instances.find(i=>i.id==='workbench-1')!.placement.x+=10;edit.instances.find(i=>i.id==='workbench-1')!.placement.h+=4;edit.instances.find(i=>i.id==='zone-3')!.placement.x+=20;edit.instances.find(i=>i.id==='radiator')!.placement.x+=12;
const data=sandboxDeviceData(devices as SceneData,edit),spot=data.devices.find(d=>d.id==='sensor')!.layout!.spot!;
assert.deepEqual(spot,{x:355,y:32,w:22,h:24});
const native=sandboxScene(edit);assert.deepEqual(native.data!.devices.find(d=>d.id==='sensor')!.layout!.spot,spot);assert.equal(native.readables!.find(r=>r.id==='card3')!.x,1235);assert.equal(native.people!.find(p=>p.look==='cat')!.x,3382);assert.equal(native.exits[0].to,'downtown');assert.equal(native.exits[0].at,'metro');
function rejects(change:(d:Composition)=>void,pattern:RegExp){const bad=structuredClone(doc);change(bad);assert.throws(()=>validateSandboxComposition(bad),pattern);assert.deepEqual(doc,sandboxComposition);}
assert.doesNotThrow(()=>{const removable=structuredClone(doc);removable.instances=removable.instances.filter(i=>i.id!=='sensor');validateSandboxComposition(removable);});rejects(d=>{d.instances.find(i=>i.id==='lamp')!.bindings!.snapshot='absent';},/unknown Sandbox visual binding/);
const view={sx:(x:number)=>x-3200,y:(h:number)=>300-h,gy:300,t:137,cam:3200,viewW:640,viewH:360,flags:{}};
const values:Record<string,Value>={lampOn:true,auditOn:true,phase:'tick',count:7};
const model={get:(key:string)=>values[key],value:()=>true,net:{get:()=> 'connected'},clocks:{next:()=>({ms:750})},scratch:{'pulse.sensor':550},data:{...devices,tuning:{pulseMs:900}},now:()=>1000,frozen:(id:string)=>id==='stamp',opened:new Set(['cabinet/keyed']),links:[{from:'audit.log:entry'}],traceOf:()=>35,lockLeft:(id:string)=>id==='audit'?40:20,spots:()=>data.devices.map(d=>({id:d.id,...d.layout!.spot!,y:d.layout!.spot!.y??0}))};
const engine={hover:'sensor',layer:'all',m:model} as unknown as EngineDraw;
const env=sandboxFrameEnvironment(view,engine,edit),rows=resolveComposition(sandboxArt,edit,env),state=rows.find(r=>r.instance.id==='sensor')!.state.snapshot as unknown as SandboxSnapshot;
validateSandboxSnapshot(state as unknown as Value);assert.equal(state.values.lampOn,true);assert.equal(state.pulses.sensor,.5);assert.equal(state.traces.audit,35);assert.equal(state.lockouts.audit,40);assert.equal(state.clocks['metronome.beat']!.ms,750);assert.equal(state.frozen.includes('stamp'),true);assert.deepEqual(state.hoverSpot,{x:355,y:32,w:22,h:24});
const readOnly=new SandboxViewState(state);assert.equal(readOnly.opened.has('cabinet/keyed'),true);assert.equal(readOnly.frozen('stamp'),true);assert.equal(readOnly.net.get('qasrv'),'connected');assert.equal('act' in readOnly,false);assert.equal('set' in readOnly,false);assert.equal('later' in readOnly,false);assert.deepEqual(model.scratch,{'pulse.sensor':550});
assert.deepEqual(rows.find(r=>r.instance.id==='outside')!.state.clip,[252,148,260,122]);
const malformed=structuredClone(state);malformed.weather.wind=NaN;assert.throws(()=>validateSandboxSnapshot(malformed as unknown as Value),/weather/);
const nested=structuredClone(doc),nestedLamp=nested.instances.find(i=>i.id==='lamp')!;nested.instances=nested.instances.filter(i=>i!==nestedLamp);(nested.instances.find(i=>i.id==='workbench-1')!.children??=[]).push(nestedLamp);assert.doesNotThrow(()=>validateSandboxComposition(nested));const nestedEnv=sandboxFrameEnvironment(view,engine,nested);assert.equal((resolveComposition(sandboxArt,nested,nestedEnv).find(r=>r.instance.id==='lamp')!.state.snapshot as unknown as SandboxSnapshot).values.lampOn,true);
const shared=structuredClone(doc);shared.instances.push({id:'extra-stool',type:'furniture.stool',props:{seed:1},placement:{x:100,h:0},order:1000,layer:'set'});assert.doesNotThrow(()=>sandboxScene(shared));
assert.equal(sandboxGeometry(edit).find(r=>r.instance.id==='sensor')!.placement.h,32);

// Frozen pre-composition tea-table commands: the stool was positioned by SB.tech,
// independent of the table's screen coordinate. Cover the far-end fixture cameras.
function originalTeaTable(x:CanvasRenderingContext2D,v:View){
  const {sx,y,t}=v,tx=sx(3300),rgba=(c:string,a:number)=>'rgba('+c+','+a+')';
  if(onScreen(v,tx-60,120)){
    box(x,tx-14,y(24),28,3,'#5a4a3a',rgba(PAPER,.4));
    x.fillStyle='#2a1d14';x.fillRect(tx-1,y(21),2,21);
    box(x,tx-8,y(31),7,7,'#d8d2c6');box(x,tx+3,y(30),5,6,'#c86a3a');
    x.fillStyle='rgba(230,230,230,.35)';x.fillRect(tx-5,y(34+(t*.2)%6),1,2);
    box(x,sx(3275)-7,y(16),14,3,'#3a2a1c',rgba(O,.5));x.fillStyle='#241a12';x.fillRect(sx(3275)-1,y(13),2,13);
    const px=sx(3240);box(x,px-6,y(12),12,12,'#5a3a24',rgba(O,.4));
    x.fillStyle='rgba(60,140,70,.85)';for(let k=0;k<5;k++)x.fillRect(px-6+k*3,y(24+(k%2)*6),2,12+(k%2)*6);
  }
}
function commands(draw:(x:CanvasRenderingContext2D)=>void){
  const rows:unknown[][]=[];
  const context=new Proxy({}, {set:(_target,key,value)=>{rows.push(['set',key,value]);return true;},get:(_target,key)=>(...args:unknown[])=>{rows.push([key,...args]);}}) as CanvasRenderingContext2D;
  draw(context);return rows;
}
const tea=createSandboxArtwork({SANDBOX_W:3740,STATIONS:[],SB:{...sandboxLayout(),tech:0},visual:emptySandboxSnapshot,decorX:3300});
for(const [width,cam] of [[640,2657],[640,3100],[420,2988]])for(const t of [0,137]){
  const v={...view,viewW:width,cam,t,sx:(x:number)=>Math.round(x-cam)};
  assert.deepEqual(commands(x=>{tea.drawTeaTable(x,v,new SandboxViewState(emptySandboxSnapshot));const base={SANDBOX_W:3740,STATIONS:[],SB:sandboxLayout(),visual:emptySandboxSnapshot};createSandboxArtwork({...base,decorX:3275}).drawTeaStool(x,v,new SandboxViewState(emptySandboxSnapshot));createSandboxArtwork({...base,decorX:3240}).drawTeaPlant(x,v,new SandboxViewState(emptySandboxSnapshot));}),commands(x=>originalTeaTable(x,v)),`original tea-table/stool/plant canvas commands at ${width}/${cam}/${t}`);
}
console.log('Sandbox checks passed:155-instance roundtrip;37 original device spots;workbench/machine,station/card andradiator/cat attachments;native scene factory;pure pulse/clock/watchdog/net/trace/lockout/weather snapshots;window clip;readonly artwork facade;invalid data rejected;shared furniture accepted.');
