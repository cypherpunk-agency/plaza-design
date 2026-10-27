import type {ChunkDocument,AssetInstance} from '../art/core/composition';
import type {EditorDocument} from './contracts';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import {validateWorldCompositions,worldCompositionChunks,type CompositionEdit} from '../world/compositions';
import type {GameplayDefinition} from '../engine/gameplay/types';
/** Stable source membership of the assembled picture. Selection and playhead time do not change it. */
export function outlineDocuments(view:EditorDocument|undefined,documents:readonly EditorDocument[],neighbours:readonly string[]=[]):EditorDocument[]{
  if(!view||view.kind!=='composition')return[];
  const result=[view],seen=new Set([view.id]),composition=view.value as ChunkDocument;
  const add=(doc:EditorDocument|undefined)=>{if(doc?.kind==='composition'&&!seen.has(doc.id)){seen.add(doc.id);result.push(doc);}};
  const addChunk=(zone:string)=>{
    add(documents.find(doc=>doc.kind==='composition'&&(doc.value as ChunkDocument).scene===zone));
    const scene=documents.find(doc=>doc.kind==='scene'&&(doc.value as SceneDocument).id===zone)?.value as SceneDocument|undefined;
    if(scene?.environment?.backdrop?.id)add(documents.find(doc=>doc.id==='backdrop-'+scene.environment!.backdrop!.id));
  };
  if(!composition.sequence){for(const zone of [composition.scene,...neighbours])addChunk(zone);return result;}
  const visit=(nodes:AssetInstance[])=>{for(const node of nodes){
    if(node.type==='sequence.world-control'){
     let zones=node.props.zones as string[]??[];
     if(node.props.worldComposition){
      const source=validateWorldCompositions(documents.find(d=>d.id==='world-compositions')?.value),edits:CompositionEdit[]=[];
      const read=(d:GameplayDefinition)=>{for(const c of Object.values(d.commands??{}))for(const a of c.actions)if('world'in a)edits.push(a.world);};
      for(const doc of documents){const value=doc.value as any;if(value?.commands)read(value);if(value?.GAMEPLAY)read(value.GAMEPLAY);for(const row of Array.isArray(value?.scenes)?value.scenes:[])if(row.gameplay)read(row.gameplay);}
      zones=worldCompositionChunks(source,String(node.props.worldComposition),edits);
     }
     for(const zone of zones)addChunk(zone);
    }
    visit(node.children??[]);
  }};visit(composition.instances);return result;
}
