/** Scene mechanisms as Circuit devices: registry -> nouns, and the inspector's numbers saving through the device document. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {art} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {mountDeviceAuthoring} from '../../src/ssg/game/authoring/device-authoring';
import {deviceSourceIdentity} from '../../src/ssg/game/authoring/device-sources';
import {pendingNetworkContext} from '../../src/ssg/game/authoring/pending-network';
import {SCENE_MECHANISMS,mechanismsRulesShape} from '../../src/ssg/game/engine/gameplay/scene-mechanisms';
import {mechanismFace,mechanismFaces,mechanismNumbers} from '../../src/ssg/game/engine/gameplay/mechanism-face';
import {PART_FUNCTIONS,LAYERS} from '../../src/ssg/game/data/types';

// 1. Every registered mechanism has a face; its nouns are exactly its rules shape.
for(const name of Object.keys(SCENE_MECHANISMS)){
 const face=mechanismFace(name)!;assert(face,name);
 assert(PART_FUNCTIONS.includes(face.function),name+' function');assert(LAYERS.includes(face.layer),name+' layer');
 assert(SCENE_MECHANISMS[name].face,name+' declares its face');
 const rules=SCENE_MECHANISMS[name].rulesShape?.();
 if(!rules){assert.deepEqual(face.nouns,[],name+' has no rules, so no nouns');continue;}
 for(const key of Object.keys(rules.derived??{})){const n=face.nouns.find(n=>n.id===key);assert(n&&n.function==='sense'&&n.verbs.includes('read'),name+' derived '+key);}
 const effects=face.nouns.find(n=>n.id==='effects');assert.deepEqual(effects?.verbs??[],Object.keys(rules.effects),name+' effects');
 assert.deepEqual(face.nouns.find(n=>n.id==='milestones')?.events??[],rules.inputs??[],name+' milestones');
}
assert.deepEqual(mechanismFace('nope'),undefined);
const stacks=mechanismFace('gantryLift')!;
assert(stacks.nouns.some(n=>n.function==='act'&&n.verbs.length),'gantryLift accepts effects');
assert(stacks.nouns.some(n=>n.events.includes('stacks.crane.landed')),'gantryLift raises milestones');
assert(mechanismFaces(['gantryLift','nope','devicePulse']).length===2);
assert(mechanismsRulesShape(['gantryLift']));

// 2. Numbers come from the controller of its kind and the tuning it names, and the tuning its mover runs on.
const stacksData=(SCENES as any).stacks.data;
const lift=mechanismNumbers(stacks,stacksData);
assert(lift.some(n=>n.label==='tuning.liftOverMs'&&n.value===700),'gantryLift lift.overMs (the tuning its trolley mover runs on)');
assert.deepEqual(mechanismNumbers(mechanismFace('devicePulse')!,stacksData),[]);
assert.deepEqual(mechanismNumbers(mechanismFace('yardCrane')!,stacksData),[],'a controller of another kind is not read');
const capsule=mechanismNumbers(mechanismFace('thermal')!,(SCENES as any).capsule.data);
assert(capsule.some(n=>n.path[0]==='tuning'),'thermal reads tuning through its controller');

// 3. The inspector lists mechanisms as devices and its numbers save through the device document.
class Element {children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';className='';onchange?:()=>void;onclick?:()=>void;append(...nodes:Element[]){this.children.push(...nodes);}replaceChildren(...nodes:Element[]){this.children=[...nodes];}setAttribute(key:string,value:string){this.attributes[key]=value;}}
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Element()}});
const docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8'))}));
const model=new ComposerModel(art,createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)]))),(d,docs)=>{if(d.id===docs[0].id)validateSourceDocuments(new Map(docs.filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value])));},[sceneCatalogueProjection]);model.load(docs);
const all=(n:Element):Element[]=>[n,...n.children.flatMap(all)];
const mount=(scene:string,wiring:boolean,selection:any)=>{
 const host=new Element(),context:any={scene,documents:model.list(),authoring:{get:(id:string)=>model.get(id),edit:(id:string,label:string,v:unknown)=>{model.edit(id,label,()=>v);context.documents=model.list();},editDocuments:(changes:any[],label:string)=>{model.importDocuments(changes,label);context.documents=model.list();}}},network=()=>pendingNetworkContext(new Map(model.list().filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value])));
 const handle=mountDeviceAuthoring(host as unknown as HTMLElement,context,selection,wiring,network);
 return{host,handle,field:(name:string)=>{const n=all(host).find(n=>n.attributes['aria-label']===name);assert(n,'field '+name);return n;},has:(name:string)=>all(host).some(n=>n.attributes['aria-label']===name||n.textContent===name)};
};
// the device list names the scene's mechanisms
const ids=deviceSourceIdentity('stacks');
let m=mount('stacks',false,{scene:'stacks'});
const picker=m.field('Device configuration') as any;
assert(all(picker).some(o=>o.value==='mechanism-gantryLift'),'device picker lists the mechanism');
// select it: parts and numbers show
m=mount('stacks',false,{scene:'stacks',device:'mechanism-gantryLift'});
assert(all(m.host).some(n=>/Engine mechanism · gantryLift/.test(n.textContent)),'inspector heading');
assert(all(m.host).some(n=>/^Mechanism part gantryLift\.effects/.test(n.textContent)),'inspector lists the effects part');
const before=(model.get(ids.devices).value as any).tuning.liftOverMs;assert.equal(before,700);
const f=m.field('Mechanism gantryLift tuning.liftOverMs');f.value='777';f.onchange!();
assert.equal((model.get(ids.devices).value as any).tuning.liftOverMs,777,'the number saved into the device document');
// capsule: a tuning value reached through the controller edits tuning, not the controller
const cap=deviceSourceIdentity('capsule'),tuningKey=mechanismNumbers(mechanismFace('thermal')!,(model.get(cap.devices).value as any)).find(n=>n.path[0]==='tuning')!;
m=mount('capsule',false,{scene:'capsule',device:'mechanism-thermal'});
const t=m.field('Mechanism thermal '+tuningKey.label);t.value=String(tuningKey.value+1);t.onchange!();
assert.equal((model.get(cap.devices).value as any).tuning[tuningKey.path[1] as string],tuningKey.value+1);
// the wiring panel lists the mechanism's parts
m=mount('stacks',true,{scene:'stacks'});
assert(all(m.host).some(n=>/^Engine mechanism gantryLift/.test(n.textContent)),'wiring panel lists the mechanism');
console.log('Mechanism face PASS: registry -> nouns for '+Object.keys(SCENE_MECHANISMS).length+' mechanisms; inspector numbers save (controller and tuning); wiring panel lists parts.');
