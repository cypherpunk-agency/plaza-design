/**
 * Scene values (scene.json stage.values / atrium / actors.held / actors.hide): the typed controls in Scene › Stage & compile
 * edit them, the edited scene saves through the composer, and the declaration is what drives the pictures: the
 * same scene built from the edited document paints different binding values.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FOLDER_SOURCES as FOLDER} from '../../src/ssg/game/scenes/folder-scenes';
import {folderSceneDefinition} from '../../src/ssg/game/engine/gameplay/folder-scene';
import {renderSceneStage} from '../../src/ssg/game/authoring/scene-stage-authoring';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {emptyData} from '../../src/ssg/game/engine/empty-data';
import {newSave} from '../../src/ssg/game/runtime/save';
import {referenceView} from './reference-view';
import {art} from '../../src/ssg/game/art';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

import {harborEntry} from './harbor-source-fixture.mts';
const FOLDER_SOURCES={...FOLDER,'harbor-yard':harborEntry('harbor-yard')};
performance.now=()=>1000;
class Element{children:Element[]=[];attrs:Record<string,string>={};value='';checked=false;textContent='';className='';open=false;disabled=false;type='';min='';max='';step='';
 onchange?:()=>void;onclick?:()=>void;ontoggle?:()=>void;
 append(...e:Element[]){this.children.push(...e);}replaceChildren(...e:Element[]){this.children=[...e];}setAttribute(k:string,v:string){this.attrs[k]=v;}remove(){}}
(globalThis as Record<string,unknown>).document={createElement:()=>new Element()};
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
const player=new Proxy({save:()=>newSave()} as Record<string,unknown>,{get(o,k){return k in o?o[k as string]:()=>undefined;}});
type Id=keyof typeof FOLDER_SOURCES;

/** The scene built from a document, and the binding values it gives one frame. */
function bindings(id:Id,scene:SceneDocument,flags:Record<string,boolean>={},values:Record<string,Record<string,boolean>>={}):Record<string,unknown>{
 const def:SceneDef=folderSceneDefinition(id,{...FOLDER_SOURCES[id],scene} as never);
 const rules=typeof def.rules==='function'?def.rules(player as never):def.rules??{effects:{}};
 const m=new SceneModel({say(){},changed(){},open(){}} as never,def.data??emptyData(def.id,def.name),rules as never,undefined,undefined,undefined,undefined,def.gameplay);m.setPaused(true);
 const view=referenceView({sx:(wx:number,p=1)=>Math.round(wx-p*100),y:(h:number)=>300-h,t:4321,cam:100,gy:300,viewW:960,viewH:390,flags,values});
 return def.visualEnvironment!(view,{m,hover:null,layer:'all'}).bindings as Record<string,unknown>;
}
/** An editing session on one scene document: the form renders the real controls, every edit changes the document and re-renders. */
function session(id:Id){
 let doc=structuredClone(FOLDER_SOURCES[id].scene) as unknown as SceneDocument,host=new Element();
 const form=new TypedForm(e=>{throw e;});
 const types=[...new Set((function walk(ns:{type:string;children?:unknown[]}[]):string[]{return ns.flatMap(n=>[n.type,...walk((n.children??[]) as never)]);})((FOLDER_SOURCES[id].composition as unknown as {instances:never[]}).instances))].sort();
 const render=()=>{host=new Element();renderSceneStage(form,host,doc,(_label,change)=>{const next=structuredClone(doc);change(next);bindings(id,next);doc=next;render();},types);};
 render();
 const control=(name:string)=>{const c=all(host).find(e=>e.attrs['aria-label']===name);assert.ok(c,'control "'+name+'" exists');return c;};
 const button=(label:string)=>{const b=all(host).find(e=>e.textContent===label&&e.onclick);assert.ok(b,'button "'+label+'" exists');b.onclick!();};
 const choose=(name:string,value:string)=>{const c=control(name);c.value=value;c.onchange!();};
 const check=(name:string,on:boolean)=>{const c=control(name);c.checked=on;c.onchange!();};
 return{get doc(){return doc;},control,button,choose,check,has:(name:string)=>all(host).some(e=>e.attrs['aria-label']===name)};
}

// 1. Every declared value has its typed controls, and an edit changes what the artwork is given.
{
 const s=session('moth'),before=bindings('moth',s.doc),desk=(before['scene.deskHeight']) as number;
 assert.ok(s.has('Value deskHeight name')&&s.has('Value deskHeight kind')&&s.has('Value deskHeight artwork role')&&s.has('Value deskHeight geometry'),'role value controls');
 assert.ok(s.has('Value fed kind')&&s.has('Value fed controller picture field'),'picture value controls');
 s.choose('Value deskHeight geometry','h');
 assert.deepEqual(s.doc.stage!.values!.deskHeight,{role:'deskSurface',get:'h'});
 const after=bindings('moth',s.doc)['scene.deskHeight'] as number;
 assert.ok(after!==desk&&after<desk,'the desk geometry value follows its declaration ('+desk+' -> '+after+')');
 // a new value: added, typed as a literal, renamed
 s.button('Add value');assert.equal(s.doc.stage!.values!.value1,false);
 s.choose('Value value1 kind','if');
 assert.deepEqual(s.doc.stage!.values!.value1,{if:false,then:false,else:false});
 s.choose('Value value1 kind','literal');s.control('Value value1 literal (true, false, null, a number or text)').value='7';s.control('Value value1 literal (true, false, null, a number or text)').onchange!();
 assert.equal(s.doc.stage!.values!.value1,7);
 s.control('Value value1 name').value='seven';s.control('Value value1 name').onchange!();
 assert.equal(s.doc.stage!.values!.seven,7);assert.equal('value1' in s.doc.stage!.values!,false);
 s.button('Remove value seven');assert.equal('seven' in s.doc.stage!.values!,false);
 // a value naming a picture field its controller does not prepare is refused, and nothing changes
 const bad=structuredClone(s.doc);bad.stage!.values!.fed={picture:'nope'};
 assert.throws(()=>bindings('moth',bad),/picture field/);
}

// 2. Current harbor artwork reads the same saved owner block as its interactions.
{
 const s=session('harbor-yard'),view=(shift:Record<string,boolean>)=>bindings('harbor-yard',s.doc,{}, {shift});
 assert.notEqual(view({trolleyMoved:true})['scene.trolleyX'],view({trolleyMoved:false})['scene.trolleyX']);
 assert.equal(view({parcelDelivered:true,caseCollected:false})['scene.casePresent'],true);
 assert.equal(view({parcelDelivered:true,caseCollected:true})['scene.casePresent'],false);
 const field=s.control('Value casePresent 1 saved state (owner.key, declared by the gameplay or a shared owner it uses)');
 field.value='shift.parcelCollected';field.onchange!();
 assert.equal(view({parcelCollected:true,caseCollected:false})['scene.casePresent'],true);
 assert.equal(view({parcelDelivered:true,caseCollected:false})['scene.casePresent'],false,'pending state rebinding changes the picture');
 const def=folderSceneDefinition('harbor-yard',FOLDER_SOURCES['harbor-yard'] as never);
 assert.equal(def.dockworkerCarry!({}, {shift:{parcelCollected:true}}),'parcel');
 assert.equal(def.dockworkerCarry!({}, {shift:{caseCollected:true,parcelDelivered:true}}),'case');
 assert.equal(def.dockworkerCarry!({}, {shift:{}}),null);
}

// 3. Actor rules: a hide rule keeps the beach guests ashore out of sight; removing it shows them.
{
 const s=session('beach'),id=(FOLDER_SOURCES.beach.scene as unknown as SceneDocument).presentation!.actors!.ashore as string[],key='actor.'+id[0]+'.pose';
 assert.equal((bindings('beach',s.doc)[key] as {visible:boolean}).visible,false,'ashore guests hidden until the beach is dangerous');
 assert.ok(s.has('Hidden actors (presentation role)'),'hide rule controls');
 s.button('Remove hide rule 2 (values)');
 assert.equal((bindings('beach',s.doc)[key] as {visible:boolean}).visible,true,'without the rule they are shown');
 s.button('Add hide rule (values)');assert.equal(s.doc.stage!.actors!.hide!.length,2);
}

// 4. A holder paints its actor (market stalls): removing the held rule gives the vendor back to the actor artwork.
{
 const s=session('market'),src=FOLDER_SOURCES.market.scene as unknown as SceneDocument,before=bindings('market',s.doc);
 const vendor='actor.cook.pose';
 assert.equal((before[vendor] as {visible:boolean}).visible,false,'a stall holds its vendor');
 assert.ok(s.has('Held by (artwork type, or none)'));
 s.button('Remove held rule 1');s.button('Remove held rule 1');
 assert.equal(s.doc.stage!.actors,undefined,'no rules left');
 assert.equal((bindings('market',s.doc)[vendor] as {visible:boolean}).visible,true,'the vendor shows as an ordinary actor');
 void src;
}

// 5. The atrium: its roles are typed choices; without it the atrium snapshot falls back to the artwork default.
{
 const s=session('mall');
 assert.ok(s.has('Atrium room (artwork role)')&&s.has('Atrium escalator (artwork role)'));
 assert.ok((bindings('mall',s.doc)['scene.snapshot'] as {layout:unknown}).layout,'the atrium layout comes from the stage roles');
 s.check('Scene has an atrium (far, gallery and riders actors stand on it)',false);
 assert.equal(s.doc.stage!.atrium,undefined);
}

// 6. Edited scenes save: the composer validates the declared scene and keeps the edit.
{
 const base=new Map(sourceDocuments.map(d=>[d.id,JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8'))]));
 const model=new ComposerModel(art,createSequenceValidationContext(art,{}),(d,list)=>{if(d.id==='moth-scene')pendingRegistry(new Map(list.map(x=>[x.id,x.value])));});
 model.load(sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:structuredClone(base.get(d.id))})));
 const s=session('moth');s.choose('Value deskHeight geometry','h');
 model.edit('moth-scene','Edit scene value',()=>s.doc);
 assert.deepEqual((model.get('moth-scene').value as SceneDocument).stage!.values!.deskHeight,{role:'deskSurface',get:'h'});
 const broken=structuredClone(s.doc);broken.stage!.values!.fed={picture:'nope'};
 const before=JSON.stringify(model.edits());
 assert.throws(()=>model.edit('moth-scene','Break a value',()=>broken),/picture field/);
 assert.equal(JSON.stringify(model.edits()),before,'the refused edit changed nothing');
}
console.log('Scene values PASS: typed controls edit values, atrium and actor rules; edits drive the pictures and save through the composer.');
process.exit(0);
