import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {pendingScene} from '../../src/ssg/game/authoring/pending-scene';
import {pendingNetworkContext} from '../../src/ssg/game/authoring/pending-network';
import {nativeSceneAdapters} from '../../src/ssg/game/authoring/scene-adapters';
import {mountSceneAuthoring} from '../../src/ssg/game/authoring/scene-authoring';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {SCENES} from '../../src/ssg/game/scenes';
import {LOGIC} from '../../src/ssg/game/data';
const root=path.resolve('src/ssg/game');
export const targetSources=new Map(sourceDocuments.map(d=>[d.id,JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))]));
const ids=['capsule','beach','sandbox','moth','yard'];
const key='review-target-key',network=structuredClone(targetSources.get('network'));network.keyring.push({id:key,kind:'key',label:'Review target key'});targetSources.set('network',network);
class Element {children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';onchange?:()=>void;onclick?:()=>void;append(...rows:Element[]){this.children.push(...rows);}replaceChildren(...rows:Element[]){this.children=[...rows];}setAttribute(k:string,v:string){this.attributes[k]=v;}}
const prior=globalThis.document;(globalThis as any).document={createElement:()=>new Element()};
const history:{id:string;value:unknown}[]=[],all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
function devicesId(id:string){return id==='sandbox'?'sandbox-behavior':id+'-devices';}
export function exerciseTargets(values:ReadonlyMap<string,unknown>){const net=pendingNetworkContext(values);for(const id of ids){const source=values.get(id+'-scene'),gameplay=values.get(id+'-gameplay'),scene=pendingScene(id,values.get(id),{sceneDocument:source,gameplay,devices:values.get(devicesId(id))},net),rules=typeof scene.rules==='function'?scene.rules({save:()=>({flags:{},tokens:0,keyring:[],controlled:[],handle:'',jump:false}),nodes:()=>0,persist(){},granted(){},end(){},cutscene(){}} as any):scene.rules!;const lines:any[]=[],m=new SceneModel({say:l=>lines.push(l),changed(){},open(){}},scene.data!,rules,LOGIC,net.net,net.keyring,undefined,scene.gameplay);m.setPaused(true);try{const target=(source as any).nativeTargets[0];assert.equal(scene.targets!(m)[0].label,'REVIEW '+id.toUpperCase());scene.use!(target.id,m,l=>lines.push(l));assert.equal(lines.at(-1)[1],'EDITED '+id.toUpperCase());assert(m.keyring().includes(key));m.set('reviewReady',false);assert.equal(scene.targets!(m).length,0);}finally{m.setPaused(true);}}}
try{
 for(const id of ids){const source=structuredClone(targetSources.get(id+'-scene')),g=structuredClone(targetSources.get(id+'-gameplay')),devices=structuredClone(targetSources.get(devicesId(id)));g.state[id+'.reviewReady']={owner:id,lifetime:'save',type:'boolean',default:true};devices.texts['review.prompt']='REVIEW '+id.toUpperCase();devices.texts['review.reply']=['review','EDITED '+id.toUpperCase(),'dim'];source.nativeTargets[0].if='reviewReady';source.nativeTargets[0].labels=[{text:'review.prompt'}];source.nativeTargets[0].routes=[{steps:[{do:[{give:key}]},{say:'review.reply'}]}];targetSources.set(id+'-scene',source);targetSources.set(id+'-gameplay',g);targetSources.set(devicesId(id),devices);}
 validateSourceDocuments(targetSources);exerciseTargets(targetSources);
 for(const id of ids){const source=targetSources.get(id+'-scene'),host=new Element(),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'review',value:targetSources.get(d.id)})),get=(id:string)=>({...documents.find(d=>d.id===id)!,value:targetSources.get(id)}),handle=mountSceneAuthoring(host as any,{documents,authoring:{get,edit:(id:string,_label:string,value:unknown)=>{const next=new Map(targetSources);next.set(id,value);validateSourceDocuments(next);history.push({id,value:targetSources.get(id)});targetSources.set(id,value);}}} as any,{scene:id,fixed:true,focus:{only:['target:'+source.nativeTargets[0].id]}});
  const field=(name:string)=>{const e=all(host).find(e=>e.attributes['aria-label']===name);assert(e,name);return e;};
  assert(field('Label reference').children.some(e=>e.value==='review.prompt'));assert(field('Grant').children.some(e=>e.value===key));
  // Actual pending state (not shipping closure) appears in the action picker.
  field('Action kind').value='set';field('Action kind').onchange!();handle.refresh!();assert(field('State key').children.some(e=>e.value==='reviewReady'));
  const priorEdit=history.pop()!;targetSources.set(priorEdit.id,priorEdit.value);handle.refresh!();
  field('Prompt height').value='123';field('Prompt height').onchange!();assert.equal(targetSources.get(id+'-scene').nativeTargets[0].promptH,123);
  const safe=JSON.stringify(targetSources.get(id+'-scene'));field('Visible while').value='unknownReviewState';field('Visible while').onchange!();assert.equal(JSON.stringify(targetSources.get(id+'-scene')),safe,'bad pending reference rejected atomically');
  handle();const scene=nativeSceneAdapters[id].pendingDefinition!(targetSources.get(id),{},{reduced:true},targetSources);assert.equal(scene.data!.texts['review.prompt'],'REVIEW '+id.toUpperCase(),'native preview uses assembled pending source');
 }
 for(const id of ids){for(const kind of ['text','state','key','anchor','reset']){const docs=new Map(targetSources),source=structuredClone(docs.get(id+'-scene'));if(kind==='text')source.nativeTargets[0].labels[0].text='missing-review-label';if(kind==='state')source.nativeTargets[0].if='missing-review-state';if(kind==='key')source.nativeTargets[0].routes[0].steps[0].do[0].give='missing-review-key';if(kind==='anchor')source.nativeTargets[0].anchor='missing-review-anchor';if(kind==='reset')source.nativeTargets[0].routes[0].steps=[{reset:true}];docs.set(id+'-scene',source);if(kind==='reset'&&id==='sandbox')continue;assert.throws(()=>pendingScene(id,docs.get(id),{sceneDocument:source,gameplay:docs.get(id+'-gameplay'),devices:docs.get(devicesId(id))},pendingNetworkContext(docs)),undefined,id+' rejects '+kind);}}
 assert.deepEqual(SCENES.harbor.presentationTargets,['craneCall']);assert.deepEqual(SCENES.beach.presentationTargets,['gullShooed']);assert(Object.isFrozen(SCENES.harbor.presentationTargets));
 exerciseTargets(targetSources);validateSourceDocuments(targetSources);console.log('Native targets pending/forms PASS: all five actual pending states/texts/keys, real typed callbacks, native preview metadata, runtime visibility/grants/replies, strict foreign references, fixed anchor/reset permissions and registered cue metadata.');
}finally{globalThis.document=prior;}
