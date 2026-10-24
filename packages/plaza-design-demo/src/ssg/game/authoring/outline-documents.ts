import type {Composition,Instance} from '../art/core/composition';
import type {EditorDocument} from './contracts';
import type {SceneDocument} from '../engine/gameplay/scene-document';
/** Stable source membership of the assembled picture. Selection and playhead time do not change it. */
export function outlineDocuments(view:EditorDocument|undefined,documents:readonly EditorDocument[]):EditorDocument[]{
  if(!view||view.kind!=='composition')return[];
  const result=[view],seen=new Set([view.id]),composition=view.value as Composition;
  if(!composition.sequence)return result;
  const add=(doc:EditorDocument|undefined)=>{if(doc?.kind==='composition'&&!seen.has(doc.id)){seen.add(doc.id);result.push(doc);}};
  const visit=(nodes:Instance[])=>{for(const node of nodes){
    if(node.type==='sequence.world-control'&&Array.isArray(node.props.zones))for(const zone of node.props.zones){
      add(documents.find(doc=>doc.kind==='composition'&&(doc.value as Composition).scene===zone));
      const scene=documents.find(doc=>doc.kind==='scene'&&(doc.value as SceneDocument).id===zone)?.value as SceneDocument|undefined;
      const backdrop=scene?.environment?.backdrop?.id;
      if(backdrop)add(documents.find(doc=>doc.id==='backdrop-'+backdrop));
    }
    visit(node.children??[]);
  }};visit(composition.instances);return result;
}
