import {validValue,stateAddress} from '../engine/gameplay/state';
import type {StateDeclaration,StateValue} from '../engine/gameplay/types';
import type {SceneDef} from '../scenes/kit';
import {validateMetroStart,type MetroStart} from '../world/transport/metro-start';
import * as defaultCity from '../world/city';
import type {CityModel} from '../world/city';
import {SCENES,type SceneId} from '../scenes';
import {ITEMS} from '../scenes/kit';

import {LOGIC,NET,KEYRING} from '../data';

import {OPENING,openingStoryModel} from '../story/opening';

import shiftGameplay from '../scenes/harbor-shift/gameplay.json';

import {WEATHER_KINDS,type WeatherKind} from '../world/weather';

import {newSave,type Save} from '../runtime/save';

export const playScenes=Object.keys(SCENES) as SceneId[];

export type PlayScene=typeof playScenes[number];

export interface PlayFixture {metro?:MetroStart;id:string;name:string;scene:PlayScene;flags:Record<string,boolean>;items:Record<string,number>;tokens:number;modules:string[];programs:string[];keyring:string[];state:Record<string,StateValue>;day:number;minute:number;seed:number;weather:'forecast'|WeatherKind;clock:'story'|'fixed'|'running';spawn:number|null}

export interface PlayFixtures {version:1;fixtures:PlayFixture[]}
export interface PlayFixtureVocabulary {flags:ReadonlySet<string>;programs:ReadonlySet<string>;keyring:ReadonlySet<string>;states?:FixtureStateMetadata}

export type FixtureStateMetadata=Readonly<Record<string,Readonly<Record<string,StateDeclaration>>>>;
/** Scene-local fixture keys address the same canonical scene owner as gameplay. */
export function fixtureStateMetadata(registry:Readonly<Record<string,SceneDef>>):FixtureStateMetadata{return Object.fromEntries(Object.entries(registry).map(([scene,def])=>[scene,Object.fromEntries(Object.entries(def.gameplay?.state??{}).filter(([id,d])=>d.owner===scene&&stateAddress(id)[0]===scene).map(([id,d])=>[stateAddress(id)[1],d]))]));}
export function fixtureStateDeclarations(scene:string,vocabulary?:PlayFixtureVocabulary){return (vocabulary?vocabulary.states:fixtureStateMetadata(SCENES))?.[scene]??{};}

/** Prospective composition bounds are checked in both editor history and grouped source saves. */

export function validateFixtureBounds(doc:PlayFixtures,widths:Readonly<Record<string,number>>){for(const f of doc.fixtures)if(f.spawn!==null&&(!Number.isFinite(widths[f.scene])||f.spawn>widths[f.scene]-12))throw new Error('Play fixture '+f.id+': starting X is outside the pending scene');return doc;}

export const fixtureFlags=Array.from(new Set([...shiftGameplay.flags,...Object.values(OPENING),...openingStoryModel.GAMEPLAY.flags,...Object.values(SCENES).flatMap(s=>s.gameplay?.flags??[]),...Object.values(SCENES).flatMap(s=>s.exits.flatMap(e=>[...(e.requires?[e.requires]:[]),...(e.sets?[e.sets]:[])])),defaultCity.HARBOR_FLAG,'shop:bought','end','pixel']));

export const fixtureModules=LOGIC.modules.map(m=>m.id),fixturePrograms=(NET.programs??[]).map(p=>p.id),fixtureKeys=[...KEYRING.keys()];

export function validatePlayFixtures(value:unknown,single=false,additionalScenes:readonly string[]=[],vocabulary?:PlayFixtureVocabulary):PlayFixtures {

 const fail=(message:string):never=>{throw new Error('Invalid Play fixtures: '+message);};

 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('plain document required');

 const doc=value as PlayFixtures;if(Object.keys(doc).sort().join()!=='fixtures,version'||doc.version!==1||!Array.isArray(doc.fixtures)||!doc.fixtures.length||doc.fixtures.length>32)fail('version/list');

 const ids=new Set<string>(),fields='clock,day,flags,id,items,keyring,minute,modules,name,programs,scene,seed,spawn,state,tokens,weather';

 const record=(v:unknown)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain record');return v as Record<string,unknown>;};

 const integer=(n:unknown,min:number,max:number)=>{if(!Number.isSafeInteger(n)||Number(n)<min||Number(n)>max)fail('integer range');};

 for(const f of doc.fixtures){if(Object.keys(record(f)).filter(k=>k!=='metro').sort().join()!==fields)fail('unsupported/missing fields');if(typeof f.id!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(f.id)||ids.has(f.id))fail('fixture ID');ids.add(f.id);if(typeof f.name!=='string'||!f.name.trim()||f.name.length>120)fail('name');if(!playScenes.includes(f.scene)&&!additionalScenes.includes(f.scene))fail('scene');integer(f.tokens,0,1000000);integer(f.day,1,10000);integer(f.minute,0,1439);integer(f.seed,0,2147483647);if(f.spawn!==null){if(!Number.isFinite(f.spawn)||f.spawn<12||f.spawn>100000)fail('spawn');}if(!['story','fixed','running'].includes(f.clock)||!['forecast',...WEATHER_KINDS].includes(f.weather))fail('clock/weather');

  if(f.metro!==undefined)validateMetroStart(f.metro);
  for(const[k,v]of Object.entries(record(f.flags)))if(!(vocabulary?vocabulary.flags.has(k):fixtureFlags.includes(k))||typeof v!=='boolean')fail('flag');

  for(const[k,v]of Object.entries(record(f.items))){if(!Object.prototype.hasOwnProperty.call(ITEMS,k))fail('item');integer(v,0,1000000);}

  for(const[k,v]of Object.entries(record(f.state))){const declarations=fixtureStateDeclarations(f.scene,vocabulary);if(!Object.prototype.hasOwnProperty.call(declarations,k)||!validValue(declarations[k],v))fail('scene state declaration/value');}

  for(const[name,allowed]of [['modules',fixtureModules],['programs',fixturePrograms],['keyring',fixtureKeys]] as const){const list=f[name];if(!Array.isArray(list)||new Set(list).size!==list.length||list.some(v=>!(name==='modules'?fixtureModules.includes(v):vocabulary?vocabulary[name].has(v):allowed.includes(v))))fail(name);}

 }

 if(!single&&['harborShift','sandbox'].some(scene=>!doc.fixtures.some(f=>f.scene===scene)))fail('retain the original Harbor Shift and Sandbox fixtures');

 if(JSON.stringify(doc).length>128000)fail('size');return structuredClone(doc);

}

export function fixtureSave(fixture:PlayFixture,additionalScenes:readonly string[]=[],vocabulary?:PlayFixtureVocabulary):Save {const f=validatePlayFixtures({version:1,fixtures:[fixture]},true,additionalScenes,vocabulary).fixtures[0],save=newSave();save.scene=f.scene;save.flags={...f.flags};save.items={...f.items};save.tokens=f.tokens;save.modules=[...f.modules];save.programs=[...f.programs];save.keyring=[...f.keyring];save.clock={day:f.day,min:f.minute,seed:f.seed};const declarations=fixtureStateDeclarations(f.scene,vocabulary);save.gameplay={[f.scene]:{...Object.fromEntries(Object.entries(declarations).map(([key,d])=>[key,d.default])),...f.state}};return save;}



/** Source-based starting state template for newly created Play fixtures. */

export function defaultPlayFixture(scene:PlayScene,scanner:string|null=NET.scanProgram):PlayFixture {return {id:scene==='harborShift'?'harbor-start':scene.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+'-start',name:scene==='harborShift'?'Harbor Shift · start':scene==='sandbox'?'Sandbox · QA start':scene[0].toUpperCase()+scene.slice(1)+' · start',scene,flags:{},items:{},tokens:scene==='harborShift'?0:5,modules:scene==='harborShift'?['timer.so']:['timer.so','switch.so'],programs:scene==='harborShift'||scanner===null?[]:[scanner],keyring:[],state:{},day:1,minute:scene==='harborShift'?1120:580,seed:3,weather:'forecast',clock:scene==='harborShift'?'story':'fixed',spawn:null};}

/** Route and phase-offset validation uses the complete prospective world/transport source. */
export function validateFixtureMetro(doc:PlayFixtures,world:CityModel=defaultCity){for(const f of doc.fixtures)if(f.metro)validateMetroStart(f.metro,world.LINE);return doc;}
