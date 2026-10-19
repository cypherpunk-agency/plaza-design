import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';import {fixtureGameplayPort} from './model-gameplay-fixture.mts';import {renameGameplayVocabulary} from '../../src/ssg/game/authoring/gameplay-bindings-authoring';
import assert from 'node:assert/strict';
import path from 'node:path';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {createTrainRules} from '../../src/ssg/game/scenes/train/rules';
import {createLineSystem} from '../../src/ssg/game/world/transport/line';
import * as shippingCity from '../../src/ssg/game/world/city';
import rawSource from '../../src/ssg/game/scenes/train/devices.json';
import gameplay from '../../src/ssg/game/scenes/train/gameplay.json';import {projectSceneState} from '../../src/ssg/game/engine/gameplay/scene-state';import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
const source=projectSceneState(rawSource as any,validateGameplay(gameplay));
import {validateDeviceSource} from '../../src/ssg/game/authoring/device-sources';
const file=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/scenes/train/rules.ts');let frozen=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,frozen,99,true);for(const row of ast.statements.filter(ts.isImportDeclaration).reverse())frozen=frozen.slice(0,row.getStart(ast))+frozen.slice(row.end);const javascript=ts.transpileModule(frozen,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:99}}).outputText;
function originalRules(metro:any,city:any){const exports:any={};vm.runInNewContext(javascript,{exports,...metro,...city});return exports.TRAIN_RULES;}
function plain(v:unknown){return JSON.parse(JSON.stringify(v));}
const oldData=structuredClone(source) as any;const oldOn=oldData.devices[0].nouns.find((n:any)=>n.id==='doors').on;oldOn.open={do:[{effect:'train.doors'}]};oldOn.lock={do:[{effect:'train.lock'}]};
function make(old:boolean,phase:string,halt:null|'track'|'siding',pass:number,pulls:number,flag:string){
 const metro=createLineSystem(),city={...shippingCity,HARBOR_FLAG:flag},rules=(old?originalRules:createTrainRules)(metro,city),events:any[]=[],definition=validateGameplay(gameplay);if(flag!==shippingCity.HARBOR_FLAG)renameGameplayVocabulary(definition,'flags',shippingCity.HARBOR_FLAG,flag);
 let root:any={flags:{},items:{...(pass?{'maglev.pass':pass}:{})},tokens:0};const m=new SceneModel({say:(line,from)=>events.push(['say',line,from]),open:()=>{},changed:()=>events.push(['changed']),flag:key=>{root.flags[key]=true;events.push(['flag',key]);},carry:()=>pass},structuredClone(old?oldData:source)as any,rules);
 if(!old){const session=new GameplaySession(definition,fixtureGameplayPort(definition,{read:()=>root,write:(next,committed=[])=>{if(next.flags[flag]&&!committed.length)events.push(['flag',flag]);root=next;}},()=>m));attachNativeGameplay(m,session);}
 m.state.pulls=pulls;Object.assign(metro.ride,{phase,halt,pos:5000,open:.2,doors:false});return{m,metro,events,snapshot:()=>({save:m.snapshot(),scratch:m.scratch,ride:{...metro.ride},flags:root.flags,events})};}

let cases=0;for(const phase of ['dwell','closing','opening','running','braking','halted','resuming'])for(const halt of [null,'track','siding'] as const)for(const pass of [0,1])for(const pulls of [0,1,12,99])for(const signal of [false,true])for(const flag of [shippingCity.HARBOR_FLAG,'review.harbor.open']){const a=make(true,phase,halt,pass,pulls,flag),b=make(false,phase,halt,pass,pulls,flag);for(const verb of ['open','lock','open']){a.m.act('train','doors',verb,signal);b.m.act('train','doors',verb,signal);assert.deepEqual(plain(b.snapshot()),plain(a.snapshot()),JSON.stringify({phase,halt,pass,pulls,signal,verb,flag}));}const saved=a.m.snapshot(),reload=make(false,phase,halt,pass,pulls,flag);reload.m.restore(saved);assert.deepEqual(reload.m.snapshot(),saved,'legacy scene save remains authoritative');cases++;}
validateDeviceSource('train',rawSource);
const bad=structuredClone(rawSource) as any;bad.devices[0].nouns.find((n:any)=>n.id==='doors').on.open[0].if='unknownPhysical';assert.throws(()=>validateDeviceSource('train',bad));
console.log('Train source permission cases PASS: '+cases+' immutable original phase/halt/pass/pulls/manual/signal/world-flag histories, exact reply/change order/transport/goal/save, current checkpoint and finite reference rejection; custom world roles use paired authored flag references.');
