import authored from '../scenes/authored.json';
import {declaredScene} from '../engine/gameplay/declared-scene';
import type {AuthoredScene} from '../engine/gameplay/scene-catalogue';
import type {SceneDef} from '../scenes/kit';
import {plainReviewScene,reviewVisibility} from './review-room';
/** Test District uses native factories and the shared game; only its source/save namespace differs. */
import {workshopScene,WORKSHOP_GAMEPLAY,sandboxComposition} from './workshop';
import source from '../scenes/demo-counter/gameplay.json';
import counterSource from '../scenes/demo-counter/scene.json';
import deskSource from '../scenes/demo-desk/scene.json';
import {validateGameplay} from '../engine/gameplay/validation';
import {validateSceneDocument} from '../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {Composition} from '../art/core/composition';
import {emptyDeviceSource} from '../engine/empty-data';
import {folderSceneDefinition} from '../engine/gameplay/folder-scene';
import {FOLDER_SOURCES} from '../scenes/folder-scenes';
import {art as shopArt} from '../art';
const shopComposition=shopArt.validate(FOLDER_SOURCES.shop.composition),libraryComposition=shopArt.validate(FOLDER_SOURCES.library.composition);
export function validateDemoGameplay(value:unknown){const d=validateGameplay(value);if(d.native)throw new Error('Native bindings are not registered for this demo role');if(JSON.stringify(d.flags)!==JSON.stringify(source.flags)||JSON.stringify(d.items)!==JSON.stringify(source.items)||JSON.stringify(Object.keys(d.commands))!==JSON.stringify(Object.keys(source.commands))||JSON.stringify(Object.keys(d.purchases??{}))!==JSON.stringify(['demo.goods'])||JSON.stringify(Object.keys(d.state??{}))!==JSON.stringify(Object.keys(source.state))||Object.entries(d.state??{}).some(([id,state])=>state.lifetime!==source.state[id as keyof typeof source.state].lifetime||state.owner!==source.state[id as keyof typeof source.state].owner))throw new Error('Demo identities/lifetime protected. If importing older gameplay edits, reload current sources and reapply those edits; composition-only edits remain compatible.');for(const[id,c]of Object.entries(d.commands))if(JSON.stringify(c.sources)!==JSON.stringify(source.commands[id as keyof typeof source.commands].sources))throw new Error('Demo command permissions protected');return d;}
export const DEMO_GAMEPLAY=validateDemoGameplay(source);
export function validateDemoScene(value:unknown,gameplay:GameplayDefinition=DEMO_GAMEPLAY){const d=validateSceneDocument(value,validateDemoGameplay(gameplay),{actors:true,manifest:true});if(!['shop','library'].includes(d.id))throw new Error('Demo scene identity');const expected=d.id==='shop'?counterSource:deskSource;for(const key of ['uses','people','readables','exits'] as const)if(JSON.stringify(d[key]?.map(r=>r.id))!==JSON.stringify(expected[key]?.map(r=>r.id)))throw new Error('Demo binding IDs protected');const exit=d.exits![0];if(exit.to!==(d.id==='shop'?'library':'shop')||exit.at!=='downtown')throw new Error('Demo exits remain inside district');return d;}
export const DEMO_COUNTER=validateDemoScene(counterSource),DEMO_DESK=validateDemoScene(deskSource);
export function demoCounterScene(composition:Composition=shopComposition,state={},options={},scene=DEMO_COUNTER,gameplay=DEMO_GAMEPLAY){
 const d=validateDemoScene(scene,gameplay);if(d.id!=='shop')throw new Error('Counter identity');
 const base=folderSceneDefinition('shop',FOLDER_SOURCES.shop,{composition,state,options:{...options,visibility:reviewVisibility(composition,['counter','till'])},scene:d,gameplay:validateDemoGameplay(gameplay)});
 return {...plainReviewScene(base,[],['buy']),name:'Purchases',spawn:base.uses![0].x-20,attention:(flags:Readonly<Record<string,boolean>>)=>flags['demo.mission']?base.attention?.(flags)??null:null,objective:(flags:Readonly<Record<string,boolean>>)=>flags['demo.mission']?base.objective?.(flags)??'':''};
}
export function demoDeskScene(composition:Composition=libraryComposition,state={},options={},scene=DEMO_DESK,gameplay=DEMO_GAMEPLAY){
 composition=structuredClone(composition);for(const[id,x]of [['shelfe',320],['librarian',440],['armchair-4',590]] as const)composition.instances.find(i=>i.id===id)!.placement.x=x;
 const d=validateDemoScene(scene,gameplay);if(d.id!=='library')throw new Error('Desk identity');
 const base=folderSceneDefinition('library',FOLDER_SOURCES.library,{composition,state,options:{...options,visibility:reviewVisibility(composition,['shelfe','librarian'])},scene:d,gameplay:validateDemoGameplay(gameplay),devices:emptyDeviceSource('library',d.name)});
 return {...plainReviewScene(base,['shelfe','librarian'],['chair']),name:'Conversations',spawn:420,data:undefined,rules:undefined,uses:[]};
}
export function demoContent(values:{gameplay?:unknown;counter?:unknown;desk?:unknown;shop?:Composition;library?:Composition;sandbox?:Composition;workshop?:unknown;vehicle?:SceneDef;routes?:SceneDef}={}){const game=validateDemoGameplay(values.gameplay??DEMO_GAMEPLAY);const pilot=authored.scenes.find(s=>s.scene.id==='vehicle-lab') as unknown as AuthoredScene;const routes=authored.scenes.find(s=>s.scene.id==='vehicle-routes') as unknown as AuthoredScene;return{'vehicle-routes':values.routes??declaredScene(routes.scene,routes.composition,validateGameplay(routes.gameplay),{},routes.devices),'vehicle-lab':values.vehicle??declaredScene(pilot.scene,pilot.composition,validateGameplay(pilot.gameplay),{},pilot.devices),sandbox:workshopScene(values.sandbox??sandboxComposition,values.workshop===undefined?WORKSHOP_GAMEPLAY:values.workshop as import('../engine/gameplay/types').GameplayDefinition),shop:demoCounterScene(values.shop,{}, {},validateDemoScene(values.counter??DEMO_COUNTER,game),game),library:demoDeskScene(values.library,{}, {},validateDemoScene(values.desk??DEMO_DESK,game),game)};}
