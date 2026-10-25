/** Authoring definitions compiled into the ordinary world graph. No live state or renderer. */
import {SEAM_KINDS,worldProblems,type SeamKind,type ZoneGraphSource,type ZoneInfo} from './zone-graph';

export interface WorldPosition {x:number;h:number}
export type WorldMember = {id:string;placement:WorldPosition}&({chunk:string;group?:never}|{group:string;chunk?:never});
export type WorldEndpoint = {member:string}&({instance:string;anchor:string;export?:never}|{export:string;instance?:never;anchor?:never});
export interface WorldConnection {id:string;kind:SeamKind;a:WorldEndpoint;b:WorldEndpoint}
export interface WorldComposition {name:string;members:WorldMember[];connections:WorldConnection[]}
export interface ChunkGroup extends WorldComposition {exports:Record<string,WorldEndpoint>}
export interface WorldCompositions {version:1;groups:Record<string,ChunkGroup>;compositions:Record<string,WorldComposition>}
export interface WorldChunk extends WorldPosition {chunk:string;path:string}
export interface WorldCompositionContext {
 chunks:Readonly<Record<string,ZoneInfo>>;
 /** Registered artwork anchor in chunk coordinates, including its authored transforms. */
 anchor(chunk:string,instance:string,anchor:string):WorldPosition|undefined;
}
export interface CompositionEdit {composition:string;remove:string[];add:WorldMember[]}
export type WorldMembership=Record<string,WorldMember[]>;
/** Authoring outline membership includes explicitly authored alternatives, independent of playhead. */
export function worldCompositionChunks(source:WorldCompositions,key:string,edits:readonly CompositionEdit[]=[]){
 const definition=source.compositions[key];if(!definition)throw Error('Unknown world composition '+key);
 const members=[...definition.members,...edits.filter(e=>e.composition===key).flatMap(e=>e.add)];
 return [...new Set(members.flatMap(m=>m.chunk?[m.chunk]:(source.groups[m.group!]?.members??[]).map(c=>c.chunk!)))];
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function fail(where:string):never {throw Error('World compositions: '+where);}
function fields(v:unknown,keys:string[],where:string):Record<string,unknown>{if(!object(v))fail(where+' must be an object');for(const k of Object.keys(v))if(!keys.includes(k))fail(where+': unknown field '+k);return v;}
function id(v:unknown,where:string):string {if(typeof v!=='string'||v.length>128||!/^[a-z0-9][a-z0-9-]*$/.test(v)||['constructor','prototype','__proto__'].includes(v))fail(where+' requires a stable lower-case ID');return v;}
function name(v:unknown,where:string):string {if(typeof v!=='string'||!v.trim()||v.length>256)fail(where+' requires a name');return v;}
function rows(v:unknown,where:string):unknown[]{if(!Array.isArray(v)||v.length>256)fail(where+' requires at most 256 rows');return v;}
function position(v:unknown,where:string):WorldPosition {const p=fields(v,['x','h'],where);if(typeof p.x!=='number'||!Number.isFinite(p.x)||typeof p.h!=='number'||!Number.isFinite(p.h))fail(where+' requires finite x and h');return{x:p.x,h:p.h};}
function member(v:unknown,group:boolean):WorldMember {const m=fields(v,['id','chunk','group','placement'],'member');if((m.chunk!==undefined)===(m.group!==undefined)||group&&m.group!==undefined)fail('member requires exactly one chunk or group; nested groups are unsupported');return{id:id(m.id,'member'),placement:position(m.placement,'placement'),...(m.chunk!==undefined?{chunk:id(m.chunk,'chunk')}:{group:id(m.group,'group')})} as WorldMember;}
function endpoint(v:unknown):WorldEndpoint {const e=fields(v,['member','instance','anchor','export'],'endpoint');const common={member:id(e.member,'endpoint member')};if(e.export!==undefined){if(e.instance!==undefined||e.anchor!==undefined)fail('export endpoint cannot also name an instance');return{...common,export:id(e.export,'export')};}return{...common,instance:name(e.instance,'instance'),anchor:name(e.anchor,'anchor')};}
function unique<T extends{id:string}>(values:T[],where:string):T[]{if(new Set(values.map(v=>v.id)).size!==values.length)fail(where+' has duplicate IDs');return values;}
function definition(v:unknown,group:boolean):WorldComposition|ChunkGroup {const d=fields(v,group?['name','members','connections','exports']:['name','members','connections'],'definition');const members=unique(rows(d.members,'members').map(m=>member(m,group)),'members');const connections=unique(rows(d.connections,'connections').map(v=>{const c=fields(v,['id','kind','a','b'],'connection');if(!SEAM_KINDS.includes(c.kind as SeamKind))fail('unknown connection kind');return{id:id(c.id,'connection'),kind:c.kind as SeamKind,a:endpoint(c.a),b:endpoint(c.b)};}),'connections');const result={name:name(d.name,'definition'),members,connections};if(!group)return result;if(!object(d.exports)||Object.keys(d.exports).length>256)fail('group exports must be a map');return{...result,exports:Object.fromEntries(Object.entries(d.exports).map(([k,v])=>[id(k,'export'),endpoint(v)]))};}
export function validateWorldCompositions(value:unknown):WorldCompositions {
 const d=fields(value,['version','groups','compositions'],'source');if(d.version!==1||!object(d.groups)||!object(d.compositions))fail('expected version 1, groups and compositions');
 const map=<T>(raw:Record<string,unknown>,group:boolean):Record<string,T>=>{if(Object.keys(raw).length>256)fail('too many definitions');return Object.fromEntries(Object.entries(raw).map(([k,v])=>[id(k,'definition'),definition(v,group)])) as Record<string,T>;};
 const source={version:1 as const,groups:map<ChunkGroup>(d.groups,true),compositions:map<WorldComposition>(d.compositions,false)};
 for(const def of [...Object.values(source.groups),...Object.values(source.compositions)]){
  for(const m of def.members)if(m.group&&!source.groups[m.group])fail('unknown group '+m.group);
  for(const e of [...def.connections.flatMap(c=>[c.a,c.b]),...('exports'in def?Object.values(def.exports as Record<string,WorldEndpoint>):[])]){
   const m=def.members.find(m=>m.id===e.member);if(!m)fail('unknown member '+e.member);
   if(m.group){if(!e.export||!source.groups[m.group].exports[e.export])fail('group endpoint requires an existing export');}else if(e.export)fail('chunk endpoint requires instance and anchor');
  }
 }
 return source;
}
/** Resolve placements once; graph consumers retain their existing coordinate and physics contracts. */
export function compileWorldComposition(source:WorldCompositions,key:string,context:WorldCompositionContext){
 const definition=source.compositions[key];if(!definition)fail('unknown composition '+key);
 const chunks:WorldChunk[]=[],seams:ZoneGraphSource['seams']=[],seen=new Set<string>();
 const add=(m:WorldMember,path:string,origin:WorldPosition)=>{if(!m.chunk)return; if(!context.chunks[m.chunk])fail('unknown chunk '+m.chunk);if(seen.has(m.chunk))fail('ambiguous repeated stateful chunk '+m.chunk);seen.add(m.chunk);chunks.push({chunk:m.chunk,path,x:origin.x+m.placement.x,h:origin.h+m.placement.h});};
 for(const m of definition.members){if(m.group){for(const child of source.groups[m.group].members)add(child,m.id+'/'+child.id,m.placement);}else add(m,m.id,{x:0,h:0});}
 type End={chunk:WorldChunk;instance:string;anchor:WorldPosition};
 const resolve=(e:WorldEndpoint,def:WorldComposition,prefix:string):End=>{
  const m=def.members.find(m=>m.id===e.member)!;
  if(m.group)return resolve(source.groups[m.group].exports[e.export!],source.groups[m.group],m.id+'/');
  const chunk=chunks.find(c=>c.path===prefix+m.id);if(!chunk)fail('unplaced endpoint '+e.member);
  const at=context.anchor(chunk.chunk,e.instance!,e.anchor!);if(!at)fail('unknown anchor '+chunk.chunk+'/'+e.instance+'.'+e.anchor);
  return{chunk,instance:e.instance!,anchor:{x:chunk.x+at.x,h:chunk.h+at.h}};
 };
 const connect=(c:WorldConnection,def:WorldComposition,prefix:string)=>{
  const a=resolve(c.a,def,prefix),b=resolve(c.b,def,prefix);
  if(Math.abs(a.anchor.x-b.anchor.x)>.001||Math.abs(a.anchor.h-b.anchor.h)>.001)fail('anchors do not meet: '+key+'/'+prefix+c.id);
  seams.push({id:key+'-'+(prefix+c.id).replace(/\//g,'-'),kind:c.kind,a:{zone:a.chunk.chunk,...(c.kind==='walk'?{}:{piece:a.instance})},b:{zone:b.chunk.chunk,...(c.kind==='walk'?{}:{piece:b.instance})},dx:b.chunk.x-a.chunk.x,dh:b.chunk.h-a.chunk.h});
 };
 for(const m of definition.members)if(m.group){const group=source.groups[m.group];for(const c of group.connections)connect(c,group,m.id+'/');for(const e of Object.values(group.exports))resolve(e,group,m.id+'/');}
 for(const c of definition.connections)connect(c,definition,'');
 const first=chunks[0];
 const graph:ZoneGraphSource={version:1,seams,placements:chunks.slice(1).map(c=>({a:first.chunk,b:c.chunk,dx:c.x-first.x,dh:c.h-first.h}))};const problems=worldProblems(graph,context.chunks);if(problems.length)fail(problems.join('; '));
 return{chunks,graph};
}
/** Prospective source edit: mutation happens only after the complete resulting graph validates. */
export function editWorldComposition(source:WorldCompositions,edit:CompositionEdit,context:WorldCompositionContext):WorldCompositions {
 const patch=validateCompositionEdit(edit),key=patch.composition,current=source.compositions[key];if(!current)fail('unknown composition '+key);
 const remove=rows(patch.remove,'remove').map(v=>id(v,'removed member'));if(new Set(remove).size!==remove.length||remove.some(id=>!current.members.some(m=>m.id===id)))fail('remove requires distinct existing member IDs');
 const next=structuredClone(source);next.compositions[key].members=[...current.members.filter(m=>!remove.includes(m.id)),...rows(patch.add,'add').map(v=>member(v,false))];
 const validated=validateWorldCompositions(next);compileWorldComposition(validated,key,context);return validated;
}
export function validateCompositionEdit(value:unknown):CompositionEdit {
 const patch=fields(value,['composition','remove','add'],'edit');
 return{composition:id(patch.composition,'composition'),remove:rows(patch.remove,'remove').map(v=>id(v,'removed member')),add:rows(patch.add,'add').map(v=>member(v,false))};
}
/** Current membership is ordinary saved world data; source definitions still own chunk content. */
export function worldWithMembership(source:WorldCompositions,membership:WorldMembership={}):WorldCompositions {
 if(!object(membership))fail('saved membership must be a map');
 const result=structuredClone(source);
 for(const[key,members]of Object.entries(membership)){
  if(!Object.prototype.hasOwnProperty.call(result.compositions,key))fail('unknown saved composition '+key);
  result.compositions[key].members=rows(members,'saved members').map(m=>member(m,false));
  // Connections to an unmounted member are inactive. They remain authored in the source and
  // return on an explicit remount; no physical crossing points into absent geometry.
  const present=new Set(result.compositions[key].members.map(m=>m.id));
  result.compositions[key].connections=result.compositions[key].connections.filter(c=>present.has(c.a.member)&&present.has(c.b.member));
 }
 return validateWorldCompositions(result);
}
export function editWorldMembership(source:WorldCompositions,membership:WorldMembership,edits:readonly CompositionEdit[],context:WorldCompositionContext,base:ZoneGraphSource){
 const next=structuredClone(membership);
 for(const raw of edits){const edit=validateCompositionEdit(raw),def=source.compositions[edit.composition];if(!def)fail('unknown composition '+edit.composition);
  const current=next[edit.composition]??def.members;
  if(new Set(edit.remove).size!==edit.remove.length||edit.remove.some(id=>!current.some(m=>m.id===id)))fail('remove requires distinct existing member IDs');
  next[edit.composition]=[...current.filter(m=>!edit.remove.includes(m.id)),...structuredClone(edit.add)];
 }
 const desired=worldWithMembership(source,next),graph=compileWorldGraph(desired,base,context);
 return{membership:next,source:desired,graph};
}
/** Link commands against the complete prospective source set, without assuming their runtime order. */
export function validateWorldEditReferences(source:WorldCompositions,edits:readonly CompositionEdit[],context:WorldCompositionContext){
 const members=new Map(Object.entries(source.compositions).map(([key,def])=>[key,new Set(def.members.map(m=>m.id))]));
 for(const edit of edits){const known=members.get(edit.composition);if(!known)fail('unknown command composition '+edit.composition);for(const m of edit.add)known.add(m.id);}
 for(const edit of edits){const known=members.get(edit.composition)!;
  for(const id of edit.remove)if(!known.has(id))fail('unknown command member '+edit.composition+'/'+id);
  for(const m of edit.add){if(m.chunk&&!Object.prototype.hasOwnProperty.call(context.chunks,m.chunk))fail('unknown command chunk '+m.chunk);if(m.group&&!Object.prototype.hasOwnProperty.call(source.groups,m.group))fail('unknown command group '+m.group);}
 }
}
/** Combine disjoint authored components. Duplicate authority is an error, never an offset override. */
export function compileWorldGraph(source:WorldCompositions,base:ZoneGraphSource,context:WorldCompositionContext):ZoneGraphSource {
 // Unmounted definitions are still authored content: bad chunks/anchors must fail Save now,
 // rather than waiting until a story command first mounts them.
 for(const group of Object.keys(source.groups))compileWorldComposition({...source,compositions:{probe:{name:'Group validation',members:[{id:'group',group,placement:{x:0,h:0}}],connections:[]}}},'probe',context);
 const compiled=Object.keys(source.compositions).map(id=>compileWorldComposition(source,id,context)),assigned=new Set<string>();
 for(const c of compiled)for(const p of c.chunks){if(assigned.has(p.chunk))fail('chunk belongs to multiple compositions: '+p.chunk);assigned.add(p.chunk);}
 for(const seam of base.seams)if(assigned.has(seam.a.zone)||assigned.has(seam.b.zone))fail('chunk has both graph and composition placement authority: '+seam.id);
 for(const link of base.placements??[])if(assigned.has(link.a)||assigned.has(link.b))fail('chunk has both graph and composition placement authority');
 const graph={version:1 as const,seams:[...base.seams,...compiled.flatMap(c=>c.graph.seams)],placements:[...(base.placements??[]),...compiled.flatMap(c=>c.graph.placements??[])]};if(new Set(graph.seams.map(s=>s.id)).size!==graph.seams.length)fail('duplicate compiled seam IDs');return graph;
}
