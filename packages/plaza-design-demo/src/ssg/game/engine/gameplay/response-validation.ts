import type {GameplayDefinition} from './types';
import type {SceneData} from '../../data/types';
/** Bind ordinary text outcomes to the same graph/cursor used by character dialogue. */
export function validateResponseConversations(d:GameplayDefinition,data?:SceneData){
 const bindings=d.native?.responseConversations??{};
 if(!bindings||typeof bindings!=='object'||Array.isArray(bindings)||Object.keys(bindings).length>64)throw Error('Invalid response conversation bindings');
 for(const[ref,row]of Object.entries(bindings)){
  if(!/^[-\w.]{1,128}$/.test(ref)||!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['conversation','variable'].includes(k))||typeof row.variable!=='string'||!/^[-\w.]{1,128}$/.test(row.variable)||!Object.prototype.hasOwnProperty.call(d.conversations,row.conversation))throw Error('Invalid response conversation reference '+ref);
  const graph=d.conversations[row.conversation];
  if(graph.free||Object.values(graph.nodes).some(n=>n.pages.length!==1||n.choices?.length||n.completion))throw Error('Response conversation requires one-page outcomes without choices: '+row.conversation);
  if(data){const text=data.texts[ref];if(!Array.isArray(text)||!text.slice(0,2).some(s=>typeof s==='string'&&s.includes('{'+row.variable+'}')))throw Error('Response conversation text slot missing: '+ref);}
 }
}
