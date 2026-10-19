/** One-time transit ordinary-source lift; original presentation timings and world controllers are untouched. */
import fs from 'node:fs';import {SCENES} from '../../src/ssg/game/scenes';
const ids=['metro','galleriaStation','harborStation','train'];
for(const id of ids){const file='src/ssg/game/scenes/'+id+'/scene.json',source=JSON.parse(fs.readFileSync(file,'utf8'));if(source.manifest)throw new Error('Transit manifest lift already applied: '+id);
 const scene=SCENES[id],exits=id==='metro'?{downtown:'downtown',train:'train-exit',citymap:'citymap'}:id==='train'?{line:'line-map',out:'door1',out2:'door0'}:Object.fromEntries(source.exits.map((e:any)=>[e.id,e.id==='train'?'train-exit':'street-exit'])),readables=id==='train'?{ad:'ad1',gangway:'gang-door'}:{};
 source.manifest={version:1,width:{instance:'scene',property:'width'},spawn:'spawn',uses:{},rests:{},exits:Object.fromEntries(source.exits.map((e:any)=>[e.id,exits[e.id]])),readables:Object.fromEntries(source.readables.map((r:any)=>[r.id,{instance:readables[r.id]??r.id,...(id==='train'?{responseH:0,responseAboveFloor:true}:{})}]))};
 if(scene.rests?.length){source.rests=scene.rests.map(({x,h,...r})=>r);for(const rest of scene.rests){const index=Number(rest.id.slice(5)),bench=scene.id==='metro'?index===0?930:1235:id==='galleriaStation'?index===0?620:940:index===0?760:980;source.manifest.rests[rest.id]={instance:rest.id,x:rest.x-bench};}}
 fs.writeFileSync(file,JSON.stringify(source,null,2)+'\n');
}
console.log('Lifted four transit width/spawn/ordinary manifests and six rests; native train/crowd/world paths unchanged.');
