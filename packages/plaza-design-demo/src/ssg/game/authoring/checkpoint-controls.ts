import {TypedForm} from './typed-form';
import {validateWorldCompositions,worldWithMembership,worldCompositionChunks} from '../world/compositions';
import {fixtureSequences} from './pending-fixtures';
import type {PlayFixture} from '../world/checkpoints';
import type {SceneDef} from '../scenes/kit';

/** Extends the existing fixture form; there is no parallel checkpoint document/editor. */
export function checkpointControls(host:HTMLElement,fixture:PlayFixture,documents:ReadonlyMap<string,unknown>,scenes:Readonly<Record<string,SceneDef>>,edit:(label:string,change:(f:PlayFixture)=>void)=>void,report:(e:unknown)=>void){
 const form=new TypedForm(report),source=validateWorldCompositions(documents.get('world-compositions'));
 const panel=form.section(host,'Checkpoint · world and direction');
 form.select(panel,'Composition',['Single chunk',...Object.keys(source.compositions)],fixture.composition??'Single chunk',id=>edit('Change checkpoint composition',f=>{
  if(id==='Single chunk'){delete f.composition;return;}f.composition=id;const members=worldCompositionChunks(worldWithMembership(source,f.membership),id);if(!members.includes(f.scene)){f.scene=members[0] as PlayFixture['scene'];delete f.entrance;f.state={};f.spawn=null;}
 }));
 const available=fixture.composition?worldCompositionChunks(worldWithMembership(source,fixture.membership),fixture.composition):Object.keys(scenes);
 form.select(panel,'Player chunk',available,fixture.scene,scene=>edit('Change checkpoint player chunk',f=>{f.scene=scene as PlayFixture['scene'];delete f.entrance;f.spawn=null;f.state={};}));
 for(const [id,definition]of Object.entries(source.compositions)){
  const row=form.section(panel,definition.name+' membership');
  form.check(row,'Override '+id,!!fixture.membership?.[id],on=>edit('Change checkpoint membership',f=>{f.membership??={};if(on)f.membership[id]=structuredClone(definition.members);else delete f.membership[id];if(!Object.keys(f.membership).length)delete f.membership;}));
  const override=fixture.membership?.[id];if(!override)continue;
  for(const [index,member]of override.entries()){
   const name=id+' / '+member.id,kind=member.chunk?'chunk':'group';
   form.select(row,name+' '+kind,member.chunk?Object.keys(scenes):Object.keys(source.groups),member.chunk??member.group!,value=>edit('Change checkpoint member',f=>{const m=f.membership![id][index];if(m.chunk)m.chunk=value;else m.group=value;}));
   for(const axis of ['x','h']as const)form.number(row,name+' '+(axis==='h'?'Y':'X'),member.placement[axis],value=>edit('Move checkpoint member',f=>{f.membership![id][index].placement[axis]=value;}));
   form.button(row,'Unmount '+name,()=>edit('Unmount checkpoint member',f=>{f.membership![id].splice(index,1);}));
  }
  for(const kind of ['chunk','group']as const){const placeholder='Choose '+kind+' to mount',values=kind==='chunk'?Object.keys(scenes):Object.keys(source.groups);form.select(row,'Mount '+kind+' in '+id,[placeholder,...values],placeholder,value=>{if(value===placeholder)return;edit('Mount checkpoint member',f=>{
   const members=f.membership![id];let index=1;while(members.some(m=>m.id==='member-'+index))index++;members.push({id:'member-'+index,...(kind==='chunk'?{chunk:value}:{group:value}),placement:{x:0,h:0}});
  });});}
 }
 const sequences=fixtureSequences(documents,scenes).program.sequences;
 form.select(panel,'Sequence',['No sequence',...sequences.map(s=>s.id)],fixture.sequence?.id??'No sequence',id=>edit('Change checkpoint sequence',f=>{if(id==='No sequence')delete f.sequence;else f.sequence={id,time:0};}));
 if(fixture.sequence)form.number(panel,'Sequence time (seconds)',fixture.sequence.time,time=>edit('Change checkpoint playhead',f=>{f.sequence!.time=time;}),0,sequences.find(s=>s.id===fixture.sequence!.id)!.duration);
 const note=document.createElement('p');note.textContent='An isolated authored starting situation. Sequence commands before the playhead are reconstructed once; loading does not replay arrivals or once triggers. Membership overrides affect this checkpoint, not source geometry.';panel.append(note);
}
