/** Navigation over existing sources. Never manufactures a chunk, sequence or runtime. */
import type {ChunkDocument} from '../art/core/composition';
import {validateWorldCompositions,worldCompositionChunks,worldWithMembership,type WorldMembership,type WorldCompositions} from '../world/compositions';
import type {EditorDocument} from './contracts';

/** Each draw asks for workspace members; the layout is validated once per source object (frozen per version). */
const validatedLayouts=new WeakMap<object,WorldCompositions>();
const validatedLayout=(raw:unknown)=>{if(!raw||typeof raw!=='object'||!Object.isFrozen(raw))return validateWorldCompositions(raw);let layout=validatedLayouts.get(raw);if(!layout){layout=validateWorldCompositions(raw);validatedLayouts.set(raw,layout);}return layout;};
export interface CompositionWorkspace {id:string;name:string;chunks:EditorDocument[]}
function memberDocuments(id:string,source:WorldCompositions,documents:readonly EditorDocument[]){
 const chunks=new Map<string,EditorDocument>();for(const document of documents)if(document.kind==='composition'){const scene=(document.value as ChunkDocument).scene;if(!chunks.has(scene))chunks.set(scene,document);}
 return worldCompositionChunks(source,id).map(chunk=>{
  const document=chunks.get(chunk);if(!document)throw Error('Composition '+id+': missing chunk source '+chunk);return document;
 });
}
export function compositionWorkspaces(documents:readonly EditorDocument[],membership?:WorldMembership):CompositionWorkspace[]{
 const raw=documents.find(d=>d.id==='world-compositions')?.value;if(!raw)return[];
 const source=worldWithMembership(validatedLayout(raw),membership);
 return Object.entries(source.compositions).map(([id,definition])=>({id,name:definition.name,chunks:memberDocuments(id,source,documents)}));
}
/** Membership describes authoring, never an assertion that these chunks are loaded in Play. */
export function workspaceDocuments(id:string,documents:readonly EditorDocument[],membership?:WorldMembership):EditorDocument[]{
 const raw=documents.find(d=>d.id==='world-compositions')?.value;
 const source=raw?worldWithMembership(validatedLayout(raw),membership):undefined;
 if(!source||!Object.prototype.hasOwnProperty.call(source.compositions,id))throw Error('Unknown composition '+id);
 return memberDocuments(id,source,documents);
}
/** Resolve a sequence through the same scope used by the workspace chooser. */
export function sequenceSource(id:string,documents:readonly EditorDocument[],workspace=''):EditorDocument|undefined{
 return(workspace?workspaceSequences(workspace,documents):documents).find(d=>d.kind==='composition'&&(d.value as ChunkDocument).sequence?.id===id);
}
/** Direction is optional context, never the identity of a spatial workspace. */
export function workspaceSequences(id:string,documents:readonly EditorDocument[]):EditorDocument[]{
 const members=new Set(workspaceDocuments(id,documents).map(d=>(d.value as ChunkDocument).scene));
 return documents.filter(d=>{if(d.kind!=='composition')return false;const chunk=d.value as ChunkDocument;if(!chunk.sequence)return false;
  return members.has(chunk.scene)||chunk.instances.some(n=>n.type==='sequence.world-control'&&(n.props.worldComposition===id||!n.props.worldComposition&&Array.isArray(n.props.zones)&&n.props.zones.length>0&&(n.props.zones as string[]).every(c=>members.has(c))));
 });
}
