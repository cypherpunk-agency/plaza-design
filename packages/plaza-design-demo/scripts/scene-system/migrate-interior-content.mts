/** One-time extraction from the immutable original, never from already-migrated content. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const targets:Record<string,unknown[]>={
 capsule:[{id:'door',anchor:'door',promptH:66,labels:[{if:'doorOpen',text:'prompt.out'},{text:'prompt.door'}],routes:[{if:'!doorOpen',steps:[{say:'door.locked'}]},{steps:[{do:[{goal:'out'}]},{exit:'door'}]}]}],
 yard:[{id:'tray',anchor:'tray',promptH:26,if:'parcelAt=tray',labels:[{text:'prompt.take'}],routes:[{steps:[{do:[{set:'parcelAt',to:'taken'},{goal:'take'}]},{say:'parcel.take'},{do:[{give:'moth.key'},{give:'uplink'}]}]}]}],
 moth:[{id:'door',anchor:'door',promptH:88,labels:[{text:'prompt.out'}],routes:[{steps:[{say:'door.out'},{exit:'door'}]}]}],
};
for(const id of ['capsule','yard','moth']){
 const dir='src/ssg/game/scenes/'+id;
 if(fs.existsSync(dir+'/scene.json')||fs.existsSync(dir+'/gameplay.json'))throw new Error('Refusing to overwrite extracted source '+id);
 const mod=await import(pathToFileURL(path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/scenes/'+id+'/index.ts')).href),scene=mod[id];
 const doc={version:1,id,name:scene.name,intro:typeof scene.intro==='function'?scene.intro(false):scene.intro,...(typeof scene.intro==='function'?{introTouch:scene.intro(true)}:{}),uses:[],exits:scene.exits.map(({x,...e}:any)=>e),nativeTargets:targets[id]};
 fs.writeFileSync(dir+'/scene.json',JSON.stringify(doc,null,2)+'\n');
 fs.writeFileSync(dir+'/gameplay.json',JSON.stringify({version:1,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}},null,2)+'\n');
 console.log('Extracted original '+id+' content and declared engine targets');
}
