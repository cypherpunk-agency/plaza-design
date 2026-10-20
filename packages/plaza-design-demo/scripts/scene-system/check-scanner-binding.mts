import assert from 'node:assert/strict';
import {NET,LOGIC} from '../../src/ssg/game/data';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {deviceRules} from '../../src/ssg/game/authoring/device-sources';
import {capabilityView} from '../../src/ssg/game/world/access';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {defaultPlayFixture} from '../../src/ssg/game/authoring/play-fixtures';
import {drawNetMap,openNet,type NetState} from '../../src/ssg/game/ui/netmap';
import {run} from '../../src/ssg/game/ui/terminal/commands';

const methods=Game.prototype as any,netOk=Object.getOwnPropertyDescriptor(Game.prototype,'netOk')!.get!;
for(const binding of ['scan.so','review-scan.so',null])for(const owned of [[],['scan.so'],['review-scan.so']])for(const locked of [false,true]){
 const network={...structuredClone(NET),scanProgram:binding},save=newSave();save.programs=[...owned];
 const expected=binding!==null&&owned.includes(binding);
 const model=new SceneModel({say:()=>{},open:()=>{},changed:()=>{},programs:()=>save.programs},SCENES.library.data!,deviceRules(SCENES.library),LOGIC,network);
 assert.equal(model.canScan,expected,'device scanner ownership');
 assert.equal(capabilityView(save,!locked,network).network,!locked&&expected,'shared capability view');
 assert.equal(netOk.call({save,networkContext:{net:network},openingStory:{hackLocked:()=>locked}}),!locked&&expected,'actual Game NET gate');
 if(!expected)assert.match(model.scanHere()[1],new RegExp((binding??'scanner').replaceAll('.','\\.')+' is not installed'));
}
for(const binding of ['scan.so','review-scan.so',null]){
 const lines:string[]=[],save=newSave(),game:any={save,networkContext:{net:{...NET,scanProgram:binding}},here:'library',persistSave(){},syncHud(){},flash:(line:string)=>lines.push(line),touch:false};
 methods.grantProgram.call(game,'scan.so');methods.grantProgram.call(game,'review-scan.so');methods.grantProgram.call(game,'review-scan.so');
 assert.deepEqual(save.programs,['scan.so','review-scan.so']);assert.equal(lines.length,binding===null?0:1,'only the selected scanner announces NET once');
 assert.deepEqual(defaultPlayFixture('library',binding).programs,binding===null?[]:[binding]);assert.deepEqual(defaultPlayFixture('harborShift',binding).programs,[]);
 const manual:string[]=[];run({save,machine:null,shell:null,scanProgram:binding,print:(line:string)=>manual.push(line)} as any,'man scan');
 assert.equal(manual[0],'scan: lists the machines you reach from where you are plugged in. needs '+(binding??'an installed scanner program')+'.');
 const painted:string[]=[],canvas=new Proxy({measureText:(s:string)=>({width:s.length*5}),fillText:(s:string)=>painted.push(s)} as any,{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});
 const state:NetState={scanner:binding,view:openNet(),nets:[],reached:new Set(),plugged:new Set(),found:new Set(),where:'Review room',ports:[],controlled:[],name:m=>m.id,state:()=> 'out',touch:false,tapMin:44,avoid:null,t:0};
 drawNetMap(canvas,1000,600,state);assert(painted.includes((binding??'')+' · Review room'),'actual net map draws the source binding');
}
assert.equal(NET.scanProgram,'scan.so');assert.deepEqual(defaultPlayFixture('library').programs,['scan.so']);
console.log('Scanner binding PASS: 54 model/capability/Game ownership-lock cases, source-bound acquisition deduplication, starting fixtures, actual terminal manual and net-map header, no filename fallback.');
