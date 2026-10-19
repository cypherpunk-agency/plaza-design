/** One-time source lift. Run only against the pre-actor Sandbox checkpoint. */
import fs from 'node:fs';
import {sandboxScene} from '../../src/ssg/game/scenes/sandbox';
import {sandboxGeometry} from '../../src/ssg/game/scenes/sandbox/composition';
import type {Character} from '../../src/ssg/game/runtime/characters';
const file='src/ssg/game/scenes/sandbox/scene.json',source=JSON.parse(fs.readFileSync(file,'utf8'));
if(source.actors||source.manifest)throw new Error('Sandbox actor lift already applied');
const original=sandboxScene(),rows=sandboxGeometry();
const world=original.people!,outside:Character={seed:9201,x:3500,act:'walk',range:180,ps:2,dim:.55,parallax:1,h:40,speed:.25,look:{extras:['umbrella']}};
source.actors=[...world,outside].map((actor,index)=>{
 const {id:target,x,h,name:_name,talk:_talk,lines:_lines,conversation:_conversation,...body}=actor;
 const id=index===4?'outside':target??'cat',row=rows.find(r=>r.instance.type==='character.prepared'&&r.props.actor===id)!;
 return {...body,...(Array.isArray(body.range)?{range:body.range.map(n=>n-x)}:{}),id,instance:row.instance.id,...(target?{target}:{}),band:index===4?'background':'world',reaction:target??(index===4?'actor.outside':'slot-'+index),...(h!==undefined?{height:'artwork'}:{})};
});
source.manifest={version:1,width:{instance:'hall',property:'width'},spawn:'spawn',uses:{chips:{instance:'chip-dispenser',promptH:100,responseH:80}},readables:Object.fromEntries(source.readables.map((r:any)=>{const row=rows.find(p=>p.instance.id===r.id)!;const offset=r.promptH-(r.id==='plan'?98:0);delete r.promptH;return[r.id,{instance:r.id,promptH:offset}];})),exits:{out:{instance:'exit-out',promptH:source.exits[0].promptH}},rests:{bench:{instance:'wait-bench',promptH:52}}};
source.rests=original.rests!.map(({x:_x,promptH:_prompt,...r})=>r);delete source.exits[0].promptH;
fs.writeFileSync(file,JSON.stringify(source,null,2)+'\n');
console.log('Lifted five Sandbox bodies and ordinary source bindings; no composition pixels changed.');
