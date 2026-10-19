/** One-time ordinary Downtown source lift, keeping source prompt heights absolute as before. */
import fs from 'node:fs';import {downtownGeometry} from '../../src/ssg/game/scenes/downtown/composition';
const sceneFile='src/ssg/game/scenes/downtown/scene.json',source=JSON.parse(fs.readFileSync(sceneFile,'utf8'));if(source.manifest)throw new Error('Downtown manifest lift already applied');
source.manifest={version:1,width:{instance:'scene',property:'width'},spawn:'spawn',uses:{},rests:{},exits:Object.fromEntries(source.exits.map((e:any)=>[e.id,'exit-'+e.id])),readables:{plaque:{instance:'readable-plaque',responseH:0,responseAboveFloor:true}}};
fs.writeFileSync(sceneFile,JSON.stringify(source,null,2)+'\n');
const file='src/ssg/game/scenes/downtown/composition.json',doc=JSON.parse(fs.readFileSync(file,'utf8')),rows=downtownGeometry();doc.instances.find((n:any)=>n.id==='yard-alley').props.doorOffset=rows.find(n=>n.instance.id==='exit-yard')!.placement.x-rows.find(n=>n.instance.id==='yard-alley')!.placement.x;fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n');
console.log('Lifted Downtown width/spawn/nine exits/one readable bindings; alley picture owns its door offset.');
