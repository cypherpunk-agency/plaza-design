import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NATIVE_SCENES} from '../../src/ssg/game/scenes';
import {gameSourceIdentity} from './source-identity.mts';

// This checks the registered execution surface, not just a list of source filenames.
const rows=Object.entries(NATIVE_SCENES).map(([scene,definition])=>{
 const rules=typeof definition.rules==='function'?definition.rules({save:()=>({handle:'',tokens:0,jump:false,controlled:[],flags:{}}),persist(){},nodes:()=>42,granted(){},end(){}}):definition.rules;
 const functions=Object.fromEntries([
  ...Object.entries(rules?.effects??{}).map(([id,fn])=>['effect:'+id,fn] as const),
  ...Object.entries(rules?.derived??{}).map(([id,fn])=>['read:'+id,fn] as const),
  ...(['tick','place','check'] as const).flatMap(id=>rules?.[id]?[[id,rules[id]!] as const]:[]),
 ]);
 return {scene,controller:definition.data?.controller?.kind??null,inputs:[...(rules?.inputs??[])],panels:[...(rules?.panels??[])],functions:Object.fromEntries(Object.entries(functions).map(([id,fn])=>[id,createHash('sha256').update(fn.toString()).digest('hex')]))};
});
if(process.argv.includes('--inspect')){console.log(JSON.stringify(rows,null,2));process.exit(0);}
const inventory=JSON.parse(fs.readFileSync('src/ssg/game/docs/reference/NATIVE-EXECUTION-AUDIT.json','utf8'));
assert.equal(rows.length,19);
assert.deepEqual(inventory.scenes.map((row:any)=>row.scene),rows.map(row=>row.scene));
const classes=new Set(['simulation','presentation','canonical-read','validation','ordinary-gap']);
for(const row of rows){
 const expected=inventory.scenes.find((value:any)=>value.scene===row.scene);
 assert.equal(row.controller,expected.controller,row.scene+' controller');
 assert.deepEqual(row.inputs,expected.inputs,row.scene+' physical inputs');
 assert.deepEqual(row.panels,expected.panels,row.scene+' native panels');
 assert.deepEqual(Object.keys(row.functions).sort(),Object.keys(expected.functions).sort(),row.scene+' must classify every registered callable');
 for(const [id,value] of Object.entries(expected.functions) as [string,any][]){assert(classes.has(value.classification),row.scene+'/'+id);assert.equal(typeof value.reason,'string');assert(value.reason.length>=20,row.scene+'/'+id+' requires a semantic retention or migration reason');}
 for(const file of expected.sourcePaths)assert(fs.existsSync(path.resolve('src/ssg/game',file)),row.scene+' missing source '+file);
}
const gaps=inventory.scenes.flatMap((row:any)=>Object.entries(row.functions).filter(([,value]:any)=>value.classification==='ordinary-gap').map(([id,value]:any)=>({scene:row.scene,callable:id,reason:value.reason})));
const report={status:'PASS',source:gameSourceIdentity(path.resolve('src/ssg/game')),scope:'19 registered SceneRules surfaces only; composition/runtime/engine ownership and behavioral/editor gates require their separate evidence',ordinaryRemovalComplete:gaps.length===0,scenes:rows.length,callables:rows.reduce((n,row)=>n+Object.keys(row.functions).length,0),ordinaryGaps:gaps,rows};
const evidence=fs.mkdtempSync(path.resolve('../../.scene-system/controller-inventory-'));
fs.writeFileSync(path.join(evidence,'evidence.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined,evidence}));
