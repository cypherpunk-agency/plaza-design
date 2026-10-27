/** Authoring definitions compiled into the ordinary world graph. No live state or renderer. */
import {SEAM_KINDS,worldProblems,type SeamKind,type ZoneGraphSource,type ZoneInfo} from './zone-graph';

export interface WorldPosition {x:number;h:number}
export type WorldMember = {id:string;placement:WorldPosition}&({chunk:string;group?:never}|{group:string;chunk?:never});
export type WorldEndpoint = {member:string;offset?:WorldPosition}&({instance:string;anchor:string;export?:never}|{export:string;instance?:never;anchor?:never});
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
export interface CompositionEdit {composition:string;remove:string[];add:WorldMember[];/** Explicit idempotent mount/unmount, while conflicting existing member definitions still reject. */ensure?:true}
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
/** References preserve registered native chunk identities, including their existing casing. */
function chunkId(v:unknown):string {if(typeof v!=='string'||v.length>128||!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(v)||['constructor','prototype','__proto__'].includes(v))fail('invalid chunk reference');return v;}
function name(v:unknown,where:string):string {if(typeof v!=='string'||!v.trim()||v.length>256)fail(where+' requires a name');return v;}
function rows(v:unknown,where:string):unknown[]{if(!Array.isArray(v)||v.length>256)fail(where+' requires at most 256 rows');return v;}
function position(v:unknown,where:string):WorldPosition {const p=fields(v,['x','h'],where);if(typeof p.x!=='number'||!Number.isFinite(p.x)||typeof p.h!=='number'||!Number.isFinite(p.h))fail(where+' requires finite x and h');return{x:p.x,h:p.h};}
function member(v:unknown,group:boolean):WorldMember {const m=fields(v,['id','chunk','group','placement'],'member');if((m.chunk!==undefined)===(m.group!==undefined)||group&&m.group!==undefined)fail('member requires exactly one chunk or group; nested groups are unsupported');return{id:id(m.id,'member'),placement:position(m.placement,'placement'),...(m.chunk!==undefined?{chunk:chunkId(m.chunk)}:{group:id(m.group,'group')})} as WorldMember;}
function endpoint(v:unknown):WorldEndpoint {const e=fields(v,['member','instance','anchor','export','offset'],'endpoint');const common={member:id(e.member,'endpoint member'),...(e.offset===undefined?{}:{offset:position(e.offset,'endpoint offset')})};if(e.export!==undefined){if(e.instance!==undefined||e.anchor!==undefined)fail('export endpoint cannot also name an instance');return{...common,export:id(e.export,'export')};}return{...common,instance:name(e.instance,'instance'),anchor:name(e.anchor,'anchor')};}
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
/** The authoritative endpoint position, shared by compilation and authoring alignment. */
export function worldEndpointPosition(source:WorldCompositions,definition:WorldComposition,e:WorldEndpoint,context:WorldCompositionContext):{path:string;chunk:string;instance:string;anchor:WorldPosition}{
 const m=definition.members.find(m=>m.id===e.member);if(!m)fail('unknown member '+e.member);
 if(m.group){const group=source.groups[m.group],exported=group?.exports[e.export!];if(!exported)fail('unknown export '+e.export);
  const end=worldEndpointPosition(source,group,exported,context);
  return{...end,path:m.id+'/'+end.path,anchor:{x:end.anchor.x+m.placement.x+(e.offset?.x??0),h:end.anchor.h+m.placement.h+(e.offset?.h??0)}};
 }
 const at=context.anchor(m.chunk!,e.instance!,e.anchor!);if(!at)fail('unknown anchor '+m.chunk+'/'+e.instance+'.'+e.anchor);
 return{path:m.id,chunk:m.chunk!,instance:e.instance!,anchor:{x:m.placement.x+at.x+(e.offset?.x??0),h:m.placement.h+at.h+(e.offset?.h??0)}};
}
/** Resolve placements once; graph consumers retain their existing coordinate and physics contracts. */
export function worldChunkPlacements(source:WorldCompositions,key:string):WorldChunk[]{
 const definition=source.compositions[key];if(!definition)fail('unknown composition '+key);
 const chunks:WorldChunk[]=[],seen=new Set<string>();
 const add=(m:WorldMember,path:string,origin:WorldPosition)=>{if(!m.chunk)return; if(seen.has(m.chunk))fail('ambiguous repeated stateful chunk '+m.chunk);seen.add(m.chunk);chunks.push({chunk:m.chunk,path,x:origin.x+m.placement.x,h:origin.h+m.placement.h});};
 for(const m of definition.members){if(m.group){for(const child of source.groups[m.group].members)add(child,m.id+'/'+child.id,m.placement);}else add(m,m.id,{x:0,h:0});}
 return chunks;
}
export function compileWorldComposition(source:WorldCompositions,key:string,context:WorldCompositionContext){
 const definition=source.compositions[key],chunks=worldChunkPlacements(source,key),seams:ZoneGraphSource['seams']=[];
 for(const chunk of chunks)if(!context.chunks[chunk.chunk])fail('unknown chunk '+chunk.chunk);
 type End={chunk:WorldChunk;instance:string;anchor:WorldPosition};
 const resolve=(e:WorldEndpoint,def:WorldComposition,prefix:string):End=>{
  const end=worldEndpointPosition(source,def,e,context),chunk=chunks.find(c=>c.path===prefix+end.path);if(!chunk)fail('unplaced endpoint '+e.member);
  // Group-local connections acquire their containing group's placement exactly once.
  const origin=prefix?definition.members.find(m=>prefix===m.id+'/')!.placement:{x:0,h:0};
  return{chunk,instance:end.instance,anchor:{x:end.anchor.x+origin.x,h:end.anchor.h+origin.h}};
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
 const next=structuredClone(source);next.compositions[key].members=editedMembers(current.members,patch);
 const validated=validateWorldCompositions(next);compileWorldComposition(validated,key,context);return validated;
}
export function validateCompositionEdit(value:unknown):CompositionEdit {
 const patch=fields(value,['composition','remove','add','ensure'],'edit');if(patch.ensure!==undefined&&patch.ensure!==true)fail('ensure must be true when supplied');
 return{composition:id(patch.composition,'composition'),remove:rows(patch.remove,'remove').map(v=>id(v,'removed member')),add:rows(patch.add,'add').map(v=>member(v,false)),...(patch.ensure?{ensure:true as const}:{})};
}
/** Shared source/runtime lowering. Ensure tolerates absence, never an implicit replacement. */
function editedMembers(current:readonly WorldMember[],edit:CompositionEdit):WorldMember[]{
 if(new Set(edit.remove).size!==edit.remove.length||!edit.ensure&&edit.remove.some(id=>!current.some(m=>m.id===id)))fail('remove requires distinct existing member IDs');
 const next=structuredClone(current.filter(m=>!edit.remove.includes(m.id)));
 for(const addition of edit.add){const existing=next.find(m=>m.id===addition.id);if(edit.ensure&&existing){if(existing.chunk!==addition.chunk||existing.group!==addition.group||existing.placement.x!==addition.placement.x||existing.placement.h!==addition.placement.h)fail('ensure cannot replace existing member '+addition.id);continue;}next.push(structuredClone(addition));}
 return next;
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
  next[edit.composition]=editedMembers(current,edit);
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
 const compiled=Object.entries(source.compositions).map(([id])=>({id,...compileWorldComposition(source,id,context)})),assigned=new Map<string,string>();
 for(const c of compiled)for(const p of c.chunks){if(assigned.has(p.chunk))fail('chunk belongs to multiple compositions: '+p.chunk);assigned.set(p.chunk,c.id);}
 const duplicate=(a:string,b:string)=>assigned.has(a)&&assigned.get(a)===assigned.get(b);
 for(const seam of base.seams)if(duplicate(seam.a.zone,seam.b.zone))fail('chunk has both graph and composition placement authority: '+seam.id);
 for(const link of base.placements??[])if(duplicate(link.a,link.b))fail('chunk has both graph and composition placement authority');
 const graph={version:1 as const,seams:[...base.seams,...compiled.flatMap(c=>c.graph.seams)],placements:[...(base.placements??[]),...compiled.flatMap(c=>c.graph.placements??[])]};if(new Set(graph.seams.map(s=>s.id)).size!==graph.seams.length)fail('duplicate compiled seam IDs');const problems=worldProblems(graph,context.chunks);if(problems.length)fail(problems.join('; '));return graph;
}
