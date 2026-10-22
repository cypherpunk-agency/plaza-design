/** The device editor's typed controls for movers, zones and milestones (authoring/mover-authoring.ts): every option the engine reads is editable, and an invalid edit rejects without changing the document. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {art} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {mountDeviceAuthoring} from '../../src/ssg/game/authoring/device-authoring';
import {deviceSourceIdentity} from '../../src/ssg/game/authoring/device-sources';
import {pendingNetworkContext} from '../../src/ssg/game/authoring/pending-network';

class Element {children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';className='';disabled=false;onchange?:()=>void;onclick?:()=>void;append(...nodes:Element[]){this.children.push(...nodes);}replaceChildren(...nodes:Element[]){this.children=[...nodes];}setAttribute(key:string,value:string){this.attributes[key]=value;}}
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Element()}});
const docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8'))}));
const model=new ComposerModel(art,createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)]))),(d,docs)=>{if(d.id===docs[0].id)validateSourceDocuments(new Map(docs.filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value])));},[sceneCatalogueProjection]);model.load(docs);
const all=(n:Element):Element[]=>[n,...n.children.flatMap(all)];
const mount=(scene:string,selection:any)=>{
 const host=new Element(),context:any={scene,documents:model.list(),authoring:{get:(id:string)=>model.get(id),edit:(id:string,label:string,v:unknown)=>{model.edit(id,label,()=>v);context.documents=model.list();},editDocuments:(changes:any[],label:string)=>{model.importDocuments(changes,label);context.documents=model.list();}}},network=()=>pendingNetworkContext(new Map(model.list().filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value])));
 const handle=mountDeviceAuthoring(host as unknown as HTMLElement,context,selection,false,network);
 return{host,handle,field:(name:string)=>{const n=all(host).find(n=>n.attributes['aria-label']===name);assert(n,'field '+name);return n;},maybe:(name:string)=>all(host).find(n=>n.attributes['aria-label']===name),button:(text:string)=>{const n=all(host).find(n=>n.onclick&&n.textContent===text);assert(n,'button '+text);return n;},hasButton:(text:string)=>all(host).some(n=>n.onclick&&n.textContent===text),alert:()=>all(host).find(n=>n.attributes.role==='alert')?.textContent??''};
};
const ids=deviceSourceIdentity('downtown'),doc=()=>model.get(ids.devices).value as any,part=(dev:string,noun:string)=>doc().devices.find((d:any)=>d.id===dev).nouns.find((n:any)=>n.id===noun);
const di=doc().devices.findIndex((d:any)=>d.id==='dlv9'),ni=doc().devices[di].nouns.findIndex((n:any)=>n.id==='chassis');
const stem=`devices · ${di} · nouns · ${ni} · mover`;
const set=(m:ReturnType<typeof mount>,name:string,value:string)=>{const f=m.field(name);f.value=value;f.onchange!();};

// a mover's stops: each is a number, a named place, a spot or a point; changing the kind edits the document
let m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
assert.equal(m.field('Stop gate kind').value,'spot','the van\'s gate stop is a spot of the gate');
set(m,'Stop gate kind','number');assert.equal(typeof part('dlv9','chassis').mover.stops.gate,'number');
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
set(m,'Stop gate kind','spot');assert.deepEqual(Object.keys(part('dlv9','chassis').mover.stops.gate),['spot'],'back to a spot');
set(m,'Stop gate kind','point');assert.deepEqual(Object.keys(part('dlv9','chassis').mover.stops.gate).sort(),['h','x']);
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
set(m,`${stem} · stops · gate · x kind`,'spot');assert.equal(typeof part('dlv9','chassis').mover.stops.gate.x,'object','a point\'s coordinates take references too');
// put the van's real gate stop back (undo what the kind tests did)
while(model.canUndo&&JSON.stringify(part('dlv9','chassis').mover.stops.gate)!==JSON.stringify({spot:'gate',edge:'right',plus:22}))model.undo();
assert.deepEqual(part('dlv9','chassis').mover.stops.gate,{spot:'gate',edge:'right',plus:22});

// a number may name a tuning value, and take a number back
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
assert.equal(m.field(`${stem} · speed`).value,'dlvSpeed','speed names the scene\'s tuning');
m.button(`Use a number for ${stem} · speed`).onclick!();assert.equal(part('dlv9','chassis').mover.speed,160,'the tuning value, as a number');
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button(`Use a tuning value for ${stem} · speed`).onclick!();assert.equal(typeof part('dlv9','chassis').mover.speed,'string');
model.undo();model.undo();assert.equal(part('dlv9','chassis').mover.speed,'dlvSpeed');

// settings: add and remove the optional ones; an invalid number is refused and leaves the document alone
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
assert(m.hasButton(`Set ms of ${stem}`)&&m.hasButton(`Remove ease of ${stem}`)&&m.hasButton(`Remove wired of ${stem}`)&&!m.hasButton(`Add paths to ${stem}`),'optional settings offer add or remove');
m.button(`Remove ease of ${stem}`).onclick!();assert(!('ease'in part('dlv9','chassis').mover));
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button(`Set ease of ${stem}`).onclick!();assert.equal(part('dlv9','chassis').mover.ease,'linear');
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
set(m,`${stem} · ease`,'timing table');assert.deepEqual(part('dlv9','chassis').mover.ease,[[0.5,0.5]],'a timing table starts as one point');
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button(`Add point to ${stem} · ease`).onclick!();assert.equal(part('dlv9','chassis').mover.ease.length,2);
const before=JSON.stringify(doc());
set(m,`${stem} · ease · 0 · 0`,'7');assert.equal(JSON.stringify(doc()),before,'a table time outside 0 to 1 is refused by the document check');
for(const _ of [0,1])model.undo();assert.equal(part('dlv9','chassis').mover.ease,'linear');

// paths: legs and choices
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
const paths=`${stem} · paths`;
m.button(`Add path to ${paths.split(' · ').slice(0,-1).join(' · ')}`).onclick!();assert.deepEqual(Object.keys(part('dlv9','chassis').mover.paths),['inward','outward','path1']);
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
set(m,'Rename path path1','round');assert('round'in part('dlv9','chassis').mover.paths);
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button(`Add leg to ${paths} · round`).onclick!();assert.equal(part('dlv9','chassis').mover.paths.round.length,2,'a leg to the first stop');
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button(`Add choice to ${paths} · round`).onclick!();assert.equal(part('dlv9','chassis').mover.paths.round[2].then.length,1);
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
assert(m.hasButton(`Add else to ${paths} · round · 2`),'a choice may get an else');
m.button(`Add else to ${paths} · round · 2`).onclick!();assert.equal(part('dlv9','chassis').mover.paths.round[2].else.length,1);
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
set(m,`${paths} · round · 1 · to`,'door');assert.equal(part('dlv9','chassis').mover.paths.round[1].to,'door');
m.button(`Set ms of ${paths} · round · 1`).onclick!();assert.equal(part('dlv9','chassis').mover.paths.round[1].ms,500);
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button(`Move step 2 of ${paths} · round up`).onclick!();assert.equal(part('dlv9','chassis').mover.paths.round[0].to,'door');
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button(`Raise an event at the end of ${paths} · round · 0`).onclick!();assert.match(part('dlv9','chassis').mover.paths.round[0].event,/^leg-/,'a leg\'s event joins the part\'s events');assert(part('dlv9','chassis').events.includes(part('dlv9','chassis').mover.paths.round[0].event));
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button(`Remove path round`).onclick!();assert(!('round'in part('dlv9','chassis').mover.paths));

// milestones: a part's event reports to one of the code's physical milestones
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
const mi=`devices · ${di} · nouns · ${ni} · milestone · door`;
assert.equal(m.field(mi).value,'downtown.dlv.door');
set(m,mi,'downtown.dlv.back');assert.equal(part('dlv9','chassis').milestone.door,'downtown.dlv.back');
m=mount('downtown',{scene:'downtown',device:'dlv9',noun:'chassis',focused:true});
m.button('Stop reporting door of chassis').onclick!();assert(!('door'in part('dlv9','chassis').milestone));
for(const _ of [0,1])model.undo();assert.equal(part('dlv9','chassis').milestone.door,'downtown.dlv.door');

// a zone's edges: a number, a place, a spot; and its milestone
const gi=doc().devices.findIndex((d:any)=>d.id==='gate'),gn=doc().devices[gi].nouns.findIndex((n:any)=>n.id==='beam'),zone=`devices · ${gi} · nouns · ${gn} · zone`;
m=mount('downtown',{scene:'downtown',device:'gate',noun:'beam',focused:true});
assert.equal(m.field(`${zone} from kind`).value,'spot');
set(m,`${zone} from kind`,'number');assert.equal(typeof part('gate','beam').zone.from,'number');
m=mount('downtown',{scene:'downtown',device:'gate',noun:'beam',focused:true});
set(m,`${zone} from kind`,'spot');assert.equal(part('gate','beam').zone.from.spot,'gate');
m=mount('downtown',{scene:'downtown',device:'gate',noun:'beam',focused:true});
m.button(`Set edge of ${zone} · from`).onclick!();assert.equal(part('gate','beam').zone.from.edge,'center');
m=mount('downtown',{scene:'downtown',device:'gate',noun:'beam',focused:true});
set(m,`${zone} · from · edge`,'right');assert.equal(part('gate','beam').zone.from.edge,'right');
for(const _ of [0,1,2,3])model.undo();assert.deepEqual(part('gate','beam').zone.from,{spot:'gate',edge:'left',plus:-32});

// the stacks: named places of the artwork are a select of what the scene's code measured
const sids=deviceSourceIdentity('stacks'),sdoc=()=>model.get(sids.devices).value as any,si=sdoc().devices.findIndex((d:any)=>d.id==='sts2'),sn=sdoc().devices[si].nouns.findIndex((n:any)=>n.id==='trolley');
m=mount('stacks',{scene:'stacks',device:'sts2',noun:'trolley',focused:true});
const place=m.field(`devices · ${si} · nouns · ${sn} · mover · stops · slot · x · place`);
assert.deepEqual(all(place).filter(o=>o!==place).map(o=>o.value).sort(),['chassis','deck','gate','hatch','rest','slot'],'the places the gantry measured from the artwork');
set(m,`devices · ${si} · nouns · ${sn} · mover · stops · slot · x · place`,'deck');assert.equal(sdoc().devices[si].nouns[sn].mover.stops.slot.x.place,'deck');model.undo();
assert.equal(m.alert(),'');
console.log('Mover authoring PASS: stops of every kind, tuning names, optional settings, ease tables, paths with legs and choices, milestones, zone edges and the gantry\'s places are typed controls that save through the document check.');
process.exit(0);
