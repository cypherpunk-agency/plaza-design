import type {TypedForm} from './typed-form';
import type {SceneData} from '../data';
import {mechanismNumbers,type MechanismFace} from '../engine/gameplay/mechanism-face';
import {mechanismDeviceId} from '../engine/gameplay/mechanism-parts';
/**
 * Registered scene mechanisms as devices in the Logic view (Devices and Wiring panels): the engine
 * code a scene names under Stage & compile, shown with the parts its rules expose and the numbers it
 * reads from the scene's device document. Numbers save through the ordinary device-document edit.
 * Cables start at a mechanism's signals (a milestone it emits, `changed` on a value it computes) and
 * end at its effects; the Wiring panel offers them beside every device's parts and the cable is saved
 * like any other (scene devices.json `cables`, or the shared gameplay source's `native.wires`).
 * Panels are listed but cannot be wired: a cable does not open a screen. Reads have no action.
 */
export {mechanismDeviceId};
const text=(parent:HTMLElement,line:string,cls='')=>{const p=document.createElement('p');p.textContent=line;if(cls)p.className=cls;parent.append(p);return p;};
/** The face's nouns as rows, under a heading naming the mechanism, with what a cable can do with each. */
export function renderMechanismNouns(parent:HTMLElement,form:TypedForm,face:MechanismFace){
 text(parent,face.label+' · engine mechanism · '+face.function+' · '+face.layer+' · device '+mechanismDeviceId(face.name),'muted');
 if(!face.nouns.length)text(parent,'This mechanism publishes no values and accepts no commands; it changes how the scene is built or painted.','muted');
 for(const noun of face.nouns){
  const s=form.section(parent,'Mechanism part '+face.name+'.'+noun.id+' · '+noun.function+' · '+noun.layer);
  text(s,'Layer '+noun.layer+', function '+noun.function+(noun.type?', value type '+noun.type:''));
  if(noun.verbs.length)text(s,'Actions: '+noun.verbs.join(', '));
  if(noun.events.length)text(s,'Signals: '+noun.events.join(', '));
  const cable=[...noun.events.length?['starts cables: '+noun.events.join(', ')]:[],...noun.wire.length?['ends cables: '+noun.wire.join(', ')]:[]];
  text(s,cable.length?'Cables '+cable.join(' · '):'No cable can start or end here.','muted');
 }
}
/** Inspector for one mechanism: its parts, then its editable numbers. */
export function renderMechanism(host:HTMLElement,form:TypedForm,face:MechanismFace,data:SceneData,edit:(label:string,change:(d:SceneData)=>void)=>void){
 const title=document.createElement('h3');title.textContent='Engine mechanism · '+face.name;host.append(title);
 renderMechanismNouns(host,form,face);
 const numbers=mechanismNumbers(face,data),section=form.section(host,'Mechanism numbers '+face.name);
 if(!numbers.length)text(section,face.controller?'No numbers in this scene’s '+face.controller+' controller.':'This mechanism reads no numbers from the device document.','muted');
 else text(section,'Numbers it reads from this scene’s device document (controller and tuning).','muted');
 for(const n of numbers)form.decimal(section,'Mechanism '+face.name+' '+n.label,n.value,v=>edit('Edit mechanism number '+n.label,d=>{
  let owner:any=d;for(const key of n.path.slice(0,-1))owner=owner[key];owner[n.path.at(-1)!]=v;
 }),-1000000,10000000);
 text(host,'Wire this mechanism under Logic › Wiring: its signals start cables and its actions end them.','muted');
}
