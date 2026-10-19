/** One-time source lift from the pre-actor Stacks checkpoint. */
import fs from 'node:fs';
import {STACKS_ACTORS} from '../../src/ssg/game/scenes/stacks/scene';
import {stacksGeometry} from '../../src/ssg/game/scenes/stacks/composition';
const file='src/ssg/game/scenes/stacks/scene.json',source=JSON.parse(fs.readFileSync(file,'utf8'));
if(source.actors||source.manifest)throw new Error('Stacks actor lift already applied');
const rows=stacksGeometry();
source.actors=Object.entries(STACKS_ACTORS).map(([id,actor])=>{
 const {id:target,x,h,name:_name,talk:_talk,lines:_lines,conversation:_conversation,...body}=actor;
 const row=rows.find(r=>r.instance.type==='character.prepared'&&r.props.actor===id)!;
 const world=id.startsWith('person-'),slot=world?Number(id.slice(7)):undefined;
 return {...body,...(Array.isArray(body.range)?{range:body.range.map(n=>n-x)}:{}),id,instance:row.instance.id,...(target?{target}:{}),band:world?'world':'background',reaction:target??(world?'slot-'+slot:'actor.'+id),...(body.seed===undefined?{bakeSeed:Math.round(x*7+3)}:{}),...(h!==undefined||world?{height:'artwork'}:{})};
});
source.manifest={version:1,width:{instance:'scene',property:'width'},spawn:'spawn',uses:{urn:{instance:'urn',promptH:52}},readables:{notice:{instance:'board',promptH:source.readables[0].promptH}},rests:{},exits:Object.fromEntries(source.exits.map((e:any)=>{const target={instance:'exit-'+e.id,promptH:e.promptH};delete e.promptH;return[e.id,target];}))};
delete source.readables[0].promptH;
fs.writeFileSync(file,JSON.stringify(source,null,2)+'\n');
console.log('Lifted thirteen Stacks actors and ordinary content bindings without changing composition artwork.');
