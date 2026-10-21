/** Focused adapter checks, including pause-menu slot/reload paths, in isolated Node processes. */
import assert from 'node:assert/strict';
const native=process.argv.includes('--native'), target=new EventTarget();
Object.assign(target,{name:native?'':'access-denied-editor-play',parent:native?target:{}});
Object.defineProperty(globalThis,'window',{value:target,configurable:true});
let reads=0,writes=0,reloads=0;
const browserStore=()=>{const map=new Map<string,string>();return{getItem(k:string){reads++;return map.get(k)??null;},setItem(k:string,v:string){writes++;map.set(k,v);},removeItem(k:string){writes++;map.delete(k);}};};
for(const name of ['localStorage','sessionStorage'])Object.defineProperty(globalThis,name,native?{value:browserStore(),configurable:true}:{get(){throw new Error('Native '+name+' accessed');},configurable:true});
Object.defineProperty(globalThis,'location',{value:{search:'?play=harborShift',reload(){reloads++;}},configurable:true});
target.addEventListener('editor-runtime-reload',()=>reloads++);
const {gameStorage,gameSessionStorage,reloadRuntime,capturePrivateStorage,restorePrivateStorage}=await import('../../src/ssg/game/runtime/storage');
const {EDITOR_PLAY}=await import('../../src/ssg/game/runtime/mode');const {saveKey}=await import('../../src/ssg/game/runtime/play-profile');const SAVE_KEY=saveKey();
const {loadSave,newSave,storeSave}=await import('../../src/ssg/game/runtime/save');
const {writeSlot,readSlot,resumeInto,takeResume}=await import('../../src/ssg/game/runtime/slots');
assert.equal(EDITOR_PLAY,!native);
gameStorage.setItem('scope','local');gameSessionStorage.setItem('scope','session');assert.equal(gameStorage.getItem('scope'),'local');assert.equal(gameSessionStorage.getItem('scope'),'session');
const save=newSave();save.tokens=17;save.flags['shift:assigned']=true;storeSave(save);assert.equal(loadSave().tokens,17);
assert.equal(writeSlot(1,save,'harborShift','Harbor'),true);save.tokens=99;assert.equal(readSlot(1)!.save.tokens,17);
resumeInto(readSlot(1)!);assert.equal(reloads,1);assert.equal(takeResume(),'harborShift');assert.equal(loadSave().tokens,17);assert.equal(takeResume(),null);
if(!native){const snapshot=capturePrivateStorage();gameStorage.removeItem(SAVE_KEY);restorePrivateStorage(snapshot);assert.equal(loadSave().tokens,17);assert.equal(readSlot(1)!.save.tokens,17);}
gameStorage.removeItem(SAVE_KEY);reloadRuntime();assert.equal(reloads,2);assert.equal(loadSave().tokens,0);
if(native)assert(reads>0&&writes>0);else assert.equal(reads+writes,0);
console.log(`Play storage ${native?'native-default':'private-editor'} PASS: independent stores, save, slots, resume, reset and reload.`);
