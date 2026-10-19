/** One-time Harbor body/ordinary-binding source lift; preserves native seeds and actor identities. */
import fs from 'node:fs';
import {HARBOR_ACTORS,harborScene} from '../../src/ssg/game/scenes/harbor';
import {harborGeometry} from '../../src/ssg/game/scenes/harbor/composition';
const file='src/ssg/game/scenes/harbor/scene.json',source=JSON.parse(fs.readFileSync(file,'utf8'));
if(source.actors||source.manifest)throw new Error('Harbor source lift already applied');
const original=harborScene(),rows=harborGeometry();
fs.mkdirSync('../../.scene-system/harbor-source-lift',{recursive:true});fs.writeFileSync('../../.scene-system/harbor-source-lift/before.json',JSON.stringify({actors:HARBOR_ACTORS,ordinary:{width:original.width,spawn:original.spawn,exits:original.exits,readables:original.readables,uses:original.uses!.map(({use,items,...u})=>u)}},null,2));
const world=['customs','docker','tide','fisher','jogger','bird0','bird1','bird2','bird3','bird4','bird5'];
source.actors=[...world,...Object.keys(HARBOR_ACTORS).filter(id=>!world.includes(id))].map(id=>{const actor=HARBOR_ACTORS[id],{id:target,x,h,name,talk,lines,conversation,...body}=actor;return {...body,...(Array.isArray(body.range)?{range:body.range.map(n=>n-x)}:{}),id,instance:id,...(target?{target}:{}),band:world.includes(id)?'world':'background',reaction:target??(world.includes(id)?'slot-'+world.indexOf(id):'actor.'+id),...(body.seed===undefined?{bakeSeed:Math.round(x*7+3)}:{}),...(h!==undefined?{height:'artwork'}:{})};});
const uses:Record<string,string>={fish:'fish-use',drink:'drink-use',crane:'call-box',bribe:'bribe-use',mark:'ghost-use',cat:'cat-use'},exits:Record<string,string>={metro:'metro',taxi:'taxi',stacks:'terminal',beach:'beach-exit'};
source.manifest={version:1,width:{instance:'scene',property:'width'},spawn:'spawn',uses:{},readables:{},exits:{},rests:{}};
for(const use of source.uses){const instance=uses[use.id],p=rows.find(r=>r.instance.id===instance)!.placement,old=original.uses!.find(r=>r.id===use.id)!;source.manifest.uses[use.id]={instance,promptH:old.promptH!-p.h,responseH:old.h!==undefined?old.h-p.h:0,responseAboveFloor:true};delete use.promptH;}
for(const r of source.readables){const p=rows.find(row=>row.instance.id===r.id)!.placement,old=original.readables!.find(row=>row.id===r.id)!;source.manifest.readables[r.id]={instance:r.id,promptH:old.promptH!-p.h,responseH:old.h!==undefined?old.h-p.h:0,responseAboveFloor:true};delete r.promptH;}
for(const exit of source.exits){source.manifest.exits[exit.id]={instance:exits[exit.id],...(exit.promptH!==undefined?{promptH:exit.promptH}:{})};delete exit.promptH;}
fs.writeFileSync(file,JSON.stringify(source,null,2)+'\n');
const comp='src/ssg/game/scenes/harbor/composition.json',doc=JSON.parse(fs.readFileSync(comp,'utf8'));for(const id of ['fishSeller','teaMan']){const n=doc.instances.find((n:any)=>n.id===id);n.type='character.prepared';n.props={actor:id};n.bindings={pose:'actor.'+id+'.pose'};}fs.writeFileSync(comp,JSON.stringify(doc,null,2)+'\n');
console.log('Lifted 30 Harbor actors and ordinary bindings.');
