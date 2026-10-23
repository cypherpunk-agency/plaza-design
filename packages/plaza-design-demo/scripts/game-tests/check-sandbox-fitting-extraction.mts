/** A rack/spool can be placed alone; cables keep explicit endpoint and owner dependencies. */
import assert from 'node:assert/strict';
import {art,resolveComposition} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import source from '../../src/ssg/game/scenes/sandbox/composition.json';
import {emptySandboxSnapshot} from '../../src/ssg/game/art/assemblies/sandbox-state';
import {bindingDefaults} from '../../src/ssg/game/engine/gameplay/binding-sources';
const view={...frameView(100),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h};
function paint(type:string,x:number,state:unknown,props={}){
 const ops:unknown[][]=[],values:Record<string,unknown>={};
 const ctx=new Proxy(values,{get(o,k:string){if(k in o)return o[k];return(...args:unknown[])=>ops.push([k,...args]);},set(o,k:string,value){o[k]=value;ops.push([k,value]);return true;}}) as CanvasRenderingContext2D;
 const element=art.get(type);element.draw(ctx,view,art.properties(type,props),art.visualProperties(type,{snapshot:state as never}),'backdrop',{x,h:0,scale:1,facing:1,parallax:1});return ops;
}
for(const type of ['sandbox.server-rack','sandbox.spool']){
 const a=paint(type,100,emptySandboxSnapshot),b=paint(type,180,emptySandboxSnapshot);
 assert.notDeepEqual(a,b,type+' actual picture follows placement without other device spots');
 assert(a.some(op=>op[0]==='fillRect'));
}
const state=structuredClone(emptySandboxSnapshot);
state.spots={netjack:{x:40,y:30,w:26,h:32},bell:{x:200,y:30,w:28,h:30},spool:{x:150,y:40,w:30,h:32},audit:{x:80,y:30,w:30,h:40}};
const original=JSON.stringify(state),cables=paint('sandbox.server-cables',100,state);
assert(cables.some(op=>JSON.stringify(op)===JSON.stringify(['moveTo',53,250])),'jack cable starts at the actual jack edge');
assert(cables.some(op=>JSON.stringify(op)===JSON.stringify(['quadraticCurveTo',76,284,83,240])),'rack endpoint retains its exact curve');
assert(cables.some(op=>JSON.stringify(op)===JSON.stringify(['lineTo',186,250])),'bell cable ends at the actual bell edge');
const spool=paint('sandbox.spool-cable',150,state,{width:30,height:32});
assert(spool.some(op=>JSON.stringify(op)===JSON.stringify(['moveTo',87,236])),'spool cable begins on the audit device');
state.net.qasrv='connected';assert.notDeepEqual(paint('sandbox.server-rack',100,state),paint('sandbox.server-rack',100,emptySandboxSnapshot),'independent rack still previews its connected state');
delete state.net.qasrv;assert.equal(JSON.stringify(state),original,'painting cannot write the visual snapshot');
const document=art.validate(source),env={view,bindings:bindingDefaults(document),state:{},reduced:false},rows=resolveComposition(art,document,env);
for(const [id,owner] of [['server-cables','server-rack'],['spool-cable','spool']]){
 const cable=rows.find(r=>r.instance.id===id)!,body=rows.find(r=>r.instance.id===owner)!;
 assert.equal(cable.placement.x,body.placement.x);assert.equal(cable.placement.h,body.placement.h);
 assert.equal(cable.instance.order,body.instance.order+1,'cables retain original paint order immediately after their body');
 const moved=structuredClone(document);moved.instances.find(n=>n.id===owner)!.placement.x+=80;
 const next=resolveComposition(art,moved,env).find(r=>r.instance.id===id)!;
 assert.equal(next.placement.x,cable.placement.x+80,'explicit attachment carries the cable end with its owner');
 assert.equal(cable.instance.bindings?.snapshot,'scene.visual','cross-device endpoints remain explicit source context');
 assert.equal(cable.element.libraryUse,undefined);
}
console.log('Sandbox fitting extraction PASS: standalone bodies, explicit cables, exact endpoints/order, state preview and source-owned attachment.');
