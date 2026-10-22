/** City destination locks (city.json `LOCKS`) and the metro source's locked stations: the harbor lock is data, not the string 'harbor' in the access code. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {mountRules} from './rules-harness.mts';
import * as city from '../../src/ssg/game/world/city';
import {validateCitySource} from '../../src/ssg/game/world/city-source';
import cityJson from '../../src/ssg/game/world/city.json';
import {METRO_SOURCE,validateMetroSource,validateMetroLocks,type MetroSource} from '../../src/ssg/game/world/transport/metro-source';
import {createLineSystem} from '../../src/ssg/game/world/transport/line';
import {lockedTransport} from '../../src/ssg/game/world/access';
import {metroStartingState} from '../../src/ssg/game/authoring/metro-starting-state';
import {mountCityAuthoring} from '../../src/ssg/game/authoring/city-authoring';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {validatePendingCity,createPendingCity} from '../../src/ssg/game/authoring/pending-city';
import {platformFrame} from '../../src/ssg/game/world/transport/platform-frame';

// the shipped data is the old rule: only the harbor is locked, by the harbor flag, with the old refusal
const flag=city.HARBOR_FLAG;
assert.deepEqual(city.LOCKS,{'harbor-lock':{unlockedBy:'HARBOR_FLAG',destinations:['harbor'],reason:'HARBOR CLOSED · LINE 0 DOES NOT STOP'}});
assert.deepEqual(METRO_SOURCE.locked,{harbor:'harbor-lock'});
// every destination, both flag states: the old `destination!=='harbor'||open`
for(const destination of ['downtown','galleria','harbor','market','nowhere'])for(const open of [false,true]){
 const got=city.transportPermission(destination,open),want=destination!=='harbor'||open;
 assert.equal(got.ok,want,destination+' '+open);if(!want)assert.equal((got as {reason:string}).reason,'HARBOR CLOSED · LINE 0 DOES NOT STOP');
 assert.equal(city.transportAccess(destination,open?{[flag]:true}:{}).ok,want);
}
assert.equal(city.lockOf('harbor')!.reason,city.LOCKS['harbor-lock'].reason);assert.equal(city.lockOf('downtown'),undefined);assert.equal(city.lockOpen('harbor-lock',{}),false);assert.equal(city.lockOpen('harbor-lock',{[flag]:true}),true);
assert.equal(lockedTransport(undefined,false).ok,true);assert.equal(lockedTransport({reason:'SHUT'},false).ok,false);assert.equal(lockedTransport({reason:'SHUT'},true).ok,true);

// the metro: locked stations follow their lock through the line system (the old per-frame `lineOpen.harbor=…`)
const metro=createLineSystem();assert.equal(metro.lockOf('harbor'),'harbor-lock');assert.equal(metro.lockOf('downtown'),undefined);
metro.syncLocks(city,{});assert.deepEqual({...metro.lineOpen},{downtown:true,galleria:true,harbor:false});
metro.syncLocks(city,{[flag]:true});assert.deepEqual({...metro.lineOpen},{downtown:true,galleria:true,harbor:true});
{const none=createLineSystem(city,{...structuredClone(METRO_SOURCE),locked:{}});none.syncLocks(city,{});assert.equal(none.lineOpen.harbor,true,'nothing locked, nothing shut');
 const gal=createLineSystem(city,{...structuredClone(METRO_SOURCE),locked:{galleria:'harbor-lock'}});gal.syncLocks(city,{});assert.deepEqual({...gal.lineOpen},{downtown:true,galleria:false,harbor:true},'the metro source decides which station');}
// the editor's starting states shut the same stations
assert.equal(metroStartingState('at-station','downtown',city,METRO_SOURCE).lineOpen.harbor,false);
assert.equal(metroStartingState('at-station','downtown',city,{...structuredClone(METRO_SOURCE),locked:{}}).lineOpen.harbor,true);
// platform pictures: the harbor platform is closed until the lock opens
const view=(flags:Record<string,boolean>)=>({t:0,flags}) as never;
assert.equal(platformFrame('harborStation',0,view({}),createLineSystem(),city)['transit.closed'],true);assert.equal(platformFrame('harborStation',0,view({[flag]:true}),createLineSystem(),city)['transit.closed'],false);assert.equal(platformFrame('metro',0,view({}),createLineSystem(),city)['transit.closed'],false);

// validation
const shipped=()=>structuredClone(cityJson) as any;
validateCitySource(shipped());
for(const [name,mutate] of Object.entries({
 'unknown destination':(d:any)=>{d.LOCKS['harbor-lock'].destinations=['atlantis'];},'no destination':(d:any)=>{d.LOCKS['harbor-lock'].destinations=[];},'duplicate destination':(d:any)=>{d.LOCKS['harbor-lock'].destinations=['harbor','harbor'];},
 'unknown flag role':(d:any)=>{d.LOCKS['harbor-lock'].unlockedBy='SOME_FLAG';},'blank reason':(d:any)=>{d.LOCKS['harbor-lock'].reason=' ';},'extra field':(d:any)=>{d.LOCKS['harbor-lock'].code='x';},'missing locks':(d:any)=>{delete d.LOCKS;},
})){const bad=shipped();mutate(bad);assert.throws(()=>validateCitySource(bad),undefined,name);}
validateMetroLocks(validateMetroSource(structuredClone(METRO_SOURCE)),city.LOCKS);
for(const [name,mutate] of Object.entries({
 'unknown station':(d:any)=>{d.locked.moon='harbor-lock';},'blank lock id':(d:any)=>{d.locked.harbor='';},'locked not an object':(d:any)=>{d.locked=['harbor'];},'locked missing':(d:any)=>{delete d.locked;},
})){const bad=structuredClone(METRO_SOURCE) as any;mutate(bad);assert.throws(()=>validateMetroSource(bad),undefined,name);}
assert.throws(()=>validateMetroLocks({...structuredClone(METRO_SOURCE),locked:{harbor:'no-such-lock'}} as MetroSource,city.LOCKS),/unknown city lock/);

// prospective documents: removing a lock a station names fails; so does naming a lock the city lacks; saves are atomic
const evidence=path.resolve('../../.game-test-output/city-locks');fs.mkdirSync(evidence,{recursive:true});const root=fs.mkdtempSync(path.join(evidence,'run-'));
for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),citySaved=()=>fs.readFileSync(path.join(root,'world/city.json'),'utf8'),metroSaved=()=>fs.readFileSync(path.join(root,'world/transport/metro.json'),'utf8');
const originalCity=citySaved(),originalMetro=metroSaved(),docs=()=>new Map(store.list().map(d=>[d.id,d.value]));
const noLock=store.read('city-source').value as any;const withoutLock=structuredClone(noLock);delete withoutLock.LOCKS['harbor-lock'];
assert.throws(()=>validatePendingCity(withoutLock,docs()),/unknown city lock/);assert.throws(()=>store.save([{id:'city-source',revision:store.read('city-source').revision,value:withoutLock}]));assert.equal(citySaved(),originalCity);
const badMetro=structuredClone(store.read('metro-source').value) as any;badMetro.locked.harbor='no-such-lock';assert.throws(()=>store.save([{id:'metro-source',revision:store.read('metro-source').revision,value:badMetro}]));assert.equal(metroSaved(),originalMetro);
// a grouped edit that renames the lock in both documents is fine
const renamedCity=structuredClone(noLock);renamedCity.LOCKS.gate=renamedCity.LOCKS['harbor-lock'];delete renamedCity.LOCKS['harbor-lock'];const renamedMetro=structuredClone(store.read('metro-source').value) as any;renamedMetro.locked.harbor='gate';
const saved=store.save([{id:'city-source',revision:store.read('city-source').revision,value:renamedCity},{id:'metro-source',revision:store.read('metro-source').revision,value:renamedMetro}]);
const pending=createPendingCity(store.read('city-source').value,docs());assert.equal(pending.lockOf('harbor')!.reason,city.LOCKS['harbor-lock'].reason);assert.equal(pending.transportAccess('harbor',{}).ok,false);assert.equal(pending.transportAccess('harbor',{[flag]:true}).ok,true);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(citySaved(),originalCity);assert.equal(metroSaved(),originalMetro);

// editor controls: the lock's refusal and destinations, new locks, and each station's lock
const all=new Map<string,unknown>(store.list().map(d=>[d.id,structuredClone(d.value)])),ui=mountRules(mountCityAuthoring,all),cityDoc=()=>all.get('city-source') as any,metroDoc=()=>all.get('metro-source') as MetroSource;
ui.change('Lock harbor-lock refusal','HARBOR SHUT');assert.equal(cityDoc().LOCKS['harbor-lock'].reason,'HARBOR SHUT');
ui.change('Lock harbor-lock holds galleria',true);assert.deepEqual(cityDoc().LOCKS['harbor-lock'].destinations.sort(),['galleria','harbor']);ui.change('Lock harbor-lock holds galleria',false);assert.deepEqual(cityDoc().LOCKS['harbor-lock'].destinations,['harbor']);
const kept=structuredClone(cityDoc());ui.change('Lock harbor-lock holds harbor',false);assert.deepEqual(cityDoc(),kept,'a lock keeps at least one destination');
ui.change('New lock ID','tunnel-lock');ui.click('Add destination lock');assert(cityDoc().LOCKS['tunnel-lock']);
ui.change('Station galleria lock','tunnel-lock');assert.equal(metroDoc().locked.galleria,'tunnel-lock');ui.change('Station galleria lock','');assert.equal(metroDoc().locked.galleria,undefined);
ui.click('Remove lock tunnel-lock');assert.equal(cityDoc().LOCKS['tunnel-lock'],undefined);
const used=structuredClone(cityDoc());ui.click('Remove lock harbor-lock');assert.deepEqual(cityDoc(),used,'a lock a station still names stays');
assert.deepEqual(ui.optionValues('Station harbor lock'),['','harbor-lock']);
// no harbor ids in the access code or the loop
const code=fs.readFileSync('src/ssg/game/world/access.ts','utf8')+fs.readFileSync('src/ssg/game/runtime/game.ts','utf8');
assert(!/harborTransportPermission|lineOpen\.harbor|=== ?'harbor'|!== ?'harbor'/.test(code),'no harbor id in access.ts or game.ts');
console.log('City locks PASS: shipped lock equals the old harbor rule, metro stations follow it, validation, cross-document references, grouped save and undo, editor controls.');
process.exit(0);
