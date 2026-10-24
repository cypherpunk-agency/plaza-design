/** Scene mechanisms as cable endpoints: a mechanism signal fires a device verb, a device event runs a mechanism effect, and the Wiring panel creates and saves both. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {art} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {sceneRuleContract} from '../../src/ssg/game/engine/scene-rule-contract';
import {validateDeviceSource,applyDeviceSource,deviceSourceIdentity} from '../../src/ssg/game/authoring/device-sources';
import {nativeVocabulary} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {mountDeviceAuthoring} from '../../src/ssg/game/authoring/device-authoring';
import {pendingNetworkContext} from '../../src/ssg/game/authoring/pending-network';
import {mechanismDeviceId} from '../../src/ssg/game/engine/gameplay/mechanism-parts';
import {buildEventInspection} from '../../src/ssg/game/authoring/event-inspector-model';
import {FOLDER_SOURCES} from '../../src/ssg/game/scenes/folder-scenes';
import {steaming} from '../../src/ssg/game/engine/gameplay/mechanisms/thermal';

const thermal=mechanismDeviceId('thermal'),gantry=mechanismDeviceId('gantryLift');
assert.equal(thermal,'mechanism-thermal');

// 1. The scene's mechanisms are cable endpoints: in the rules, the built data and the vocabulary; not devices of the world.
const capsule=SCENES.capsule,data0=capsule.data!;
const device=sceneRuleContract(capsule).mechanisms?.find(m=>m.id===thermal);assert(device,'capsule data carries the thermal mechanism device');
const part=(id:string)=>device!.parts.find(p=>p.id===id);
assert.deepEqual(part('effects')!.verbs,['router.boot','kettle.boil'],'effects are the verbs a cable may send');
assert(part('milestones')!.events.includes('capsule.router.onlineDue'),'milestones are signals');
assert.deepEqual(part('routerUp')!.events,['changed'],'a derived value raises changed');assert.deepEqual(part('routerUp')!.verbs,[],'a read is not an action');
assert(!device!.parts.some(p=>p.id==='panels'),'a mechanism without panels has no panels part');
assert(sceneRuleContract(capsule).mechanisms?.some(m=>m.id===thermal),'the scene rules carry the devices');
const vocab=nativeVocabulary(data0,sceneRuleContract(capsule).mechanisms);
assert(vocab.some(n=>n.key===thermal+'.effects'&&n.verbs.includes('kettle.boil')),'vocabulary lists the effects');
assert(vocab.some(n=>n.key===thermal+'.milestones'&&n.events.includes('capsule.router.rebooted')),'vocabulary lists the milestones');
const stacksDevice=sceneRuleContract(SCENES.stacks).mechanisms?.find(m=>m.id===gantry)!;
assert(stacksDevice.parts.find(p=>p.id==='effects')!.verbs.includes('port.return'));assert(!stacksDevice.parts.some(p=>p.id==='panels'),'panels are listed by the face but cannot be wired');
assert(stacksDevice.parts.find(p=>p.id==='milestones')!.events.includes('stacks.crane.landed'));
// the tag is not part of the rules as a value: a recorded fingerprint (scene-parity) is unchanged
const stub={save:()=>({}),persist(){},nodes:()=>0,granted(){},end(){}} as never;
assert(!Object.keys(sceneRuleContract(capsule)).includes('mechanisms')&&!Object.keys(typeof SCENES.stacks.rules==='function'?SCENES.stacks.rules(stub):SCENES.stacks.rules!).includes('mechanisms'),'the mechanisms tag is not enumerable');
assert(!('mechanisms' in (SCENES.capsule.data as object)),'the device document data carries no projection');

// 2. The device document (stacks keeps its cables there) and the shared gameplay source (capsule keeps them in native.wires)
//    accept cables to and from a mechanism and refuse a part, signal or action it does not have.
const stacksJson=JSON.parse(fs.readFileSync('src/ssg/game/scenes/stacks/devices.json','utf8'));
const stacksWired=(c:unknown[])=>({...structuredClone(stacksJson),cables:[...stacksJson.cables,...c]});
validateDeviceSource('stacks',stacksWired([{id:'m1',from:gantry+'.milestones:stacks.crane.landed',to:'port.alarm',verb:'sound'},{id:'m2',from:'port.scanner:warm',to:gantry+'.effects',verb:'port.return'},{id:'m3',from:gantry+'.craneBusy:changed',to:'port.alarm',verb:'sound'}]));
for(const [bad,why] of [
 [{id:'x',from:gantry+'.milestones:nope',to:'port.alarm',verb:'sound'},'unknown signal'],
 [{id:'x',from:'port.scanner:warm',to:gantry+'.effects',verb:'nope'},'unknown effect'],
 [{id:'x',from:'port.scanner:warm',to:gantry+'.craneBusy',verb:'read'},'a read is not wireable'],
 [{id:'x',from:'port.scanner:warm',to:gantry+'.panels',verb:'scope'},'panels are not wireable'],
 [{id:'x',from:'mechanism-nope.effects:a',to:'port.alarm',verb:'sound'},'no such mechanism'],
 [{id:'x',from:'port.scanner:warm',to:thermal+'.effects',verb:'kettle.boil'},'a mechanism the scene does not name'],
] as const)assert.throws(()=>validateDeviceSource('stacks',stacksWired([bad as any])),undefined,why);
assert.throws(()=>validateDeviceSource('stacks',{...stacksWired([]),mechanisms:[]}),/mechanisms/,'a mechanisms key is not authorable');
const devicesJson=JSON.parse(fs.readFileSync('src/ssg/game/scenes/capsule/devices.json','utf8'));
const cables=[
 {id:'milestone-blinds',from:thermal+'.milestones:capsule.router.onlineDue',to:'blinds.motor',verb:'open'},
 {id:'kettle-steam',from:'kettle.kettle:boiled',to:thermal+'.effects',verb:'kettle.boil'},
 {id:'router-blinds',from:thermal+'.routerUp:changed',to:'blinds.motor',verb:'close'},
];
const composition=FOLDER_SOURCES.capsule.composition as any;
const withWires=(c:unknown[])=>({...capsule,gameplay:{...capsule.gameplay!,native:{...capsule.gameplay!.native!,wires:c as any}}}) as typeof capsule;
const make=(c:unknown[])=>applyDeviceSource('capsule',withWires(c),composition,devicesJson);
make(cables);
for(const bad of [{id:'x',from:thermal+'.milestones:nope',to:'blinds.motor',verb:'open'},{id:'x',from:'kettle.kettle:boiled',to:thermal+'.effects',verb:'nope'},{id:'x',from:'kettle.kettle:boiled',to:thermal+'.routerUp',verb:'read'}])assert.throws(()=>make([bad]),/wire endpoint/,'native wires validate mechanism endpoints');

// 3. The model carries the signals and runs the effects.
const hooks=(lines:unknown[]=[])=>({say:(l:unknown)=>lines.push(l),open(){},changed(){}});
const build=(c:unknown[])=>{const scene=make(c);return new SceneModel(hooks() as any,scene.data!,sceneRuleContract(scene));};
const bare=build([]);
assert.equal(bare.devices.has(thermal),false,'a mechanism is not a device of the world, the board or hack vision');
assert(bare.mechanisms.has(thermal));
bare.input('capsule.router.onlineDue');assert.equal(bare.inspect().time.pending.length,0,'a milestone nobody listens to schedules nothing');
let m=build(cables);
assert.equal(m.links.length,3);
m.set('sun',false);m.input('capsule.router.onlineDue');m.tick(400,false);
assert.equal(m.get('sun'),true,'a mechanism milestone carried by a cable ran a device verb (blinds open)');
assert(!steaming(m),'no steam yet');
m.emit('kettle.kettle:boiled');m.tick(400,false);
assert(steaming(m),'a device event ran the mechanism effect through a cable (kettle steam)');
// a derived value raises changed when it differs between ticks (the first sight only notes it)
m.set('plugOn',false);m.tick(50,true);m.set('sun',true);m.tick(50,true);m.tick(400,false);assert.equal(m.get('sun'),true,'no change, no signal');
m.set('plugOn',true);m.tick(50,true);m.tick(400,false);assert.equal(m.get('sun'),false,'routerUp changed: the cable closed the blinds');
// cut cables stay cut; a snapshot keeps the cables and a restore wires them again
const snap=m.snapshot();assert(snap.links.some(l=>l.from===thermal+'.milestones:capsule.router.onlineDue'&&l.to==='blinds.motor'));
const again=build(cables);again.restore(snap);assert.equal(again.links.length,3);
again.set('sun',false);again.input('capsule.router.onlineDue');again.tick(400,false);assert.equal(again.get('sun'),true,'a restored cable fires');
const cut=build(cables);cut.cut(cut.links.find(l=>l.from.startsWith(thermal+'.milestones'))!);cut.set('sun',false);cut.input('capsule.router.onlineDue');cut.tick(400,false);assert.equal(cut.get('sun'),false,'a cut mechanism cable is cut');
// the player can wire to a mechanism part through the model as to any noun
const loose=build([]);assert.equal(loose.wireEligibility(thermal+'.milestones:capsule.router.rebooted','blinds.motor','open').ok,true);
assert.equal(loose.wireEligibility(thermal+'.milestones:capsule.router.rebooted',thermal+'.routerUp','read').ok,false);

// 4. The event inspector lists the mechanism's signals as sources.
const inspection=buildEventInspection({documents:[]});
assert(inspection.nodes.some(n=>n.id==='event:capsule:'+thermal+'.milestones:capsule.router.onlineDue'),'inspector lists mechanism signals');

// 5. The Wiring panel creates and saves cables from a mechanism signal and to a mechanism effect (stacks: gantryLift).
class Element {children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';className='';onchange?:()=>void;onclick?:()=>void;append(...nodes:Element[]){this.children.push(...nodes);}replaceChildren(...nodes:Element[]){this.children=[...nodes];}setAttribute(key:string,value:string){this.attributes[key]=value;}}
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Element()}});
const docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8'))}));
const model=new ComposerModel(art,createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)]))),(d,docs)=>{if(d.id===docs[0].id)validateSourceDocuments(new Map(docs.filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value])));},[sceneCatalogueProjection]);model.load(docs);
const all=(n:Element):Element[]=>[n,...n.children.flatMap(all)];
const mount=(scene:string,selection:any)=>{
 const host=new Element(),context:any={scene,documents:model.list(),authoring:{get:(id:string)=>model.get(id),edit:(id:string,label:string,v:unknown)=>{model.edit(id,label,()=>v);context.documents=model.list();},editDocuments:(changes:any[],label:string)=>{model.importDocuments(changes,label);context.documents=model.list();}}},network=()=>pendingNetworkContext(new Map(model.list().filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value])));
 const handle=mountDeviceAuthoring(host as unknown as HTMLElement,context,selection,true,network);
 const field=(name:string)=>{const n=all(host).find(n=>n.attributes['aria-label']===name);assert(n,'field '+name);return n;};
 return{host,handle,field,pick:(name:string,value:string)=>{const f=field(name);assert(all(f).some(o=>o.value===value),name+' offers '+value);f.value=value;f.onchange!();},click:(name:string)=>{const b=all(host).find(n=>n.textContent===name&&n.onclick);assert(b,'button '+name);b.onclick!();}};
};
const ids=deviceSourceIdentity('stacks');
const savedCables=()=>(model.get(ids.devices).value as any).cables as {id:string;from:string;to:string;verb:string}[];
const before=savedCables().length;
let w=mount('stacks',{scene:'stacks'});
assert(!all(w.host).some(n=>/cables to them are not supported/i.test(n.textContent)),'the not-supported note is gone');
// mechanism milestone -> device verb
w.click('Add cable');
let added=savedCables().at(-1)!;assert.equal(savedCables().length,before+1);
w=mount('stacks',{scene:'stacks'});
w.pick('Cable '+added.id+' event',gantry+'.milestones:stacks.crane.landed');
w.pick('Cable '+added.id+' target','port.alarm');w=mount('stacks',{scene:'stacks'});w.pick('Cable '+added.id+' verb','sound');
assert.deepEqual(savedCables().find(c=>c.id===added.id),{id:added.id,from:gantry+'.milestones:stacks.crane.landed',to:'port.alarm',verb:'sound'},'a cable from a mechanism signal to a device verb is saved');
// device event -> mechanism effect
w=mount('stacks',{scene:'stacks'});w.click('Add cable');
const second=savedCables().at(-1)!;assert.notEqual(second.id,added.id);
w=mount('stacks',{scene:'stacks'});
w.pick('Cable '+second.id+' event','port.scanner:warm');
w.pick('Cable '+second.id+' target',gantry+'.effects');w=mount('stacks',{scene:'stacks'});w.pick('Cable '+second.id+' verb','port.return');
assert.deepEqual(savedCables().find(c=>c.id===second.id),{id:second.id,from:'port.scanner:warm',to:gantry+'.effects',verb:'port.return'},'a cable from a device event to a mechanism effect is saved');
// the saved document is the shipping one: it validates and builds a model whose links carry both cables
const saved=model.get(ids.devices).value as any;validateDeviceSource('stacks',saved);
const built=applyDeviceSource('stacks',SCENES.stacks,FOLDER_SOURCES.stacks.composition as any,saved);
const sm=new SceneModel(hooks() as any,built.data!,sceneRuleContract(built));
assert(sm.links.some(l=>l.from===gantry+'.milestones:stacks.crane.landed'&&l.to==='port.alarm'));assert(sm.links.some(l=>l.from==='port.scanner:warm'&&l.to===gantry+'.effects'&&l.verb==='port.return'));
// a focused device view lists the cable that touches the mechanism
w=mount('stacks',{scene:'stacks',device:gantry,focused:true});assert(all(w.host).some(n=>n.attributes['aria-label']==='Cable '+added.id+' event'),'the mechanism’s focused wiring lists its cables');
// removing the cable saves too
w.click('Remove cable '+added.id);assert(!savedCables().some(c=>c.id===added.id));
console.log('Mechanism cables PASS: milestone and derived-value signals fire device verbs, device events run mechanism effects, snapshot/restore/cut keep them, validation rejects bad endpoints, and the Wiring panel creates, saves and removes both directions.');
