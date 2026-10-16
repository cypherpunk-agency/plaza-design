/** Focused mounted-handle lifetime proof; DOM paint is separately exercised in browser. */
import assert from 'node:assert/strict';
import {SANDBOX} from '../../src/ssg/game/data';
import {cloneBehavior,behaviorNoun} from '../../src/ssg/game/authoring/behavior-validation';
import {mountBehaviorWorkbench,type BehaviorWorkbenchHandle} from '../../src/ssg/game/authoring/behavior-authoring';
import {SceneModel} from '../../src/ssg/game/engine/model';
class Node {children:Node[]=[];attrs:Record<string,string>={};value='';textContent='';parent?:Node;onchange?:()=>void;onclick?:()=>void;append(...nodes:(Node|string)[]){for(const n of nodes){const node=typeof n==='string'?new Node():n;node.parent=this;this.children.push(node);}}replaceChildren(...nodes:Node[]){this.children=[];this.append(...nodes);}setAttribute(k:string,v:string){this.attrs[k]=v;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}}
Object.assign(globalThis,{document:{createElement:()=>new Node(),createTextNode:(text:string)=>{const n=new Node();n.textContent=text;return n;}}});
const root=new Node(),all=()=>{const list:Node[]=[];const visit=(n:Node)=>{list.push(n);n.children.forEach(visit);};visit(root);return list;},input=(name:string)=>all().find(n=>n.attrs['aria-label']===name)!,button=(name:string)=>all().find(n=>n.textContent===name)!;
let data=cloneBehavior(SANDBOX),edits=0,resets=0,handle:BehaviorWorkbenchHandle;
const nativeReset=SceneModel.prototype.reset;SceneModel.prototype.reset=function(){resets++;nativeReset.call(this);};
try{
 handle=mountBehaviorWorkbench(root as unknown as HTMLElement,{document:()=>data,onEdit:d=>{edits++;data=d;handle.refresh();},save:()=>{handle.refresh();}});
 input('Handler noun').value='lamp.lamp';input('Handler noun').onchange!();assert.equal(input('Verb').value,'on');
 let before=resets;input('Reply').value='New response';input('Reply').onchange!();assert.equal(edits,1);assert.equal(resets-before,2,'synchronous shell refresh disposes and initializes exactly one session');assert.equal(input('Handler noun').value,'lamp.lamp');assert.equal(input('Reply').value,'New response');
 behaviorNoun(data,'lamp.lamp').on!.on={say:['ON','External undo/reload response']};before=resets;handle.refresh();assert.equal(resets-before,2);assert.equal(input('Reply').value,'External undo/reload response');assert.equal(input('Handler noun').value,'lamp.lamp');
 before=resets;button('Save').onclick!();await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(resets-before,2,'Save callback synchronous refresh does not reinitialize twice');
 before=resets;handle();handle();handle.refresh();assert.equal(resets-before,1,'dispose is idempotent; late shell refresh is inert');assert.equal(root.children.length,0);
 console.log('S13 mounted refresh preserves selection, updates external edits, handles synchronous onEdit/Save once, and disposes without late-session leaks');
}finally{SceneModel.prototype.reset=nativeReset;}
