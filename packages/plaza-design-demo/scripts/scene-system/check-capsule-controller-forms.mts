import assert from 'node:assert/strict';
import sourceJSON from '../../src/ssg/game/scenes/capsule/devices.json';
import gameplayJSON from '../../src/ssg/game/scenes/capsule/gameplay.json';
import {NET} from '../../src/ssg/game/data';
import {pendingScene} from '../../src/ssg/game/authoring/pending-scene';
import {capsuleComposition} from '../../src/ssg/game/scenes/capsule/composition';
import {content} from '../../src/ssg/game/scenes/capsule/scene-document';
import {renderCapsuleController} from '../../src/ssg/game/authoring/capsule-controller-authoring';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';
class Element {children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';onchange?:()=>void;onclick?:()=>void;append(...nodes:Element[]){this.children.push(...nodes);}setAttribute(key:string,value:string){this.attributes[key]=value;}}
const previous=globalThis.document;(globalThis as any).document={createElement:()=>new Element()};
try{
 let source=structuredClone(sourceJSON)as any;const gameplay=structuredClone(gameplayJSON)as any;
 gameplay.state['capsule.reviewPower']={owner:'capsule',lifetime:'save',type:'boolean',default:true};source.tuning.reviewBoot=25;
 const pending=(devices=source)=>pendingScene('capsule',capsuleComposition,{gameplay,devices,sceneDocument:content.scene});
 let host:Element;const errors:unknown[]=[],edit=(_label:string,change:(d:any)=>void)=>{const draft=structuredClone(source);change(draft);pending(draft);source=draft;};
 const refresh=()=>{host=new Element();renderCapsuleController(host as any,new TypedForm(e=>errors.push(e)),pending().data!,edit,NET);},all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
 const change=(name:string,value:string)=>{const field=all(host).find(e=>e.attributes['aria-label']===name);assert(field,name);field.value=value;field.onchange!();refresh();};
 refresh();change('Capsule plugOn state','reviewPower');change('Capsule bootMs tuning','reviewBoot');change('Capsule online notice delay ms','7');change('Capsule temperature notice step','2');
 assert.deepEqual(errors,[]);assert.equal(source.controller.state.plugOn,'reviewPower');assert.equal(source.controller.tuning.bootMs,'reviewBoot');assert.equal(source.controller.devices.pixel,'pixel');assert.equal(source.controller.onlineNoticeDelayMs,7);assert.equal(source.controller.temperatureNoticeStep,2);
 const before=structuredClone(source);change('Capsule pixel device','pc');assert.equal(errors.length,1);assert.match(String(errors[0]),/reply device pixel/);assert.deepEqual(source,before,'speaker rebind cannot strand shared replies');change('Capsule pixel device','missing');assert.equal(errors.length,2);assert.deepEqual(source,before);change('Capsule online notice delay ms','-1');assert.equal(errors.length,3);assert.deepEqual(source,before);
 assert(!all(host).some(e=>['Capsule reboot text','Capsule online text','Capsule router device'].includes(e.attributes['aria-label'])),'response-only physical aliases are removed');
 console.log('Capsule controller forms PASS: current shared-state/tuning/speaker/timing controls, source validation, atomic bad reference/timing rejection and no response aliases.');
}finally{globalThis.document=previous;}
