import type {Instance,Composition} from '../art/core/composition';
import type {EditorDocument} from './contracts';
import {validateWorldCompositions} from '../world/compositions';
import {TypedForm} from './typed-form';
/** Source references are typed controls; camera framing remains ordinary numeric artwork fields. */
export function renderWorldDirectionAuthoring(host:HTMLElement,node:Instance,documents:readonly EditorDocument[],edit:(label:string,change:(node:Instance)=>void)=>void,report:(e:unknown)=>void){
 const form=new TypedForm(report),value=documents.find(d=>d.id==='world-compositions')?.value;
 const source=value?validateWorldCompositions(value):undefined;
 const chunks=[...new Set(documents.filter(d=>d.kind==='composition').map(d=>(d.value as Composition).scene))];
 const members=(id:string)=>source?.compositions[id]?.members.flatMap(m=>m.chunk?[m.chunk]:source.groups[m.group!].members.map(m=>m.chunk!))??[];
 const scope=String(node.props.worldComposition??''),zones=(node.props.zones??[]) as string[];
 form.select(host,'World composition',['Explicit zones',...Object.keys(source?.compositions??{})],scope||'Explicit zones',id=>edit('Change directed world scope',n=>{
  n.props.worldComposition=id==='Explicit zones'?'':id;
  const allowed=id==='Explicit zones'?chunks:members(id);if(!allowed.includes(String(n.props.origin)))n.props.origin=allowed[0]??'';
  n.props.zones=id==='Explicit zones'?[String(n.props.origin)]:[];
 }));
 form.select(host,'World origin chunk',scope?members(scope):chunks,String(node.props.origin??''),origin=>edit('Change world origin',n=>{n.props.origin=origin;}));
 if(scope){const p=document.createElement('p');p.textContent='Chunks follow this composition’s current membership, including command-driven mounts and unmounts.';host.append(p);return;}
 for(const [index,id]of zones.entries()){
  form.select(host,'World zone '+(index+1),chunks.filter(c=>c===id||!zones.includes(c)),id,chunk=>edit('Change directed zone',n=>{(n.props.zones as string[])[index]=chunk;}));
  form.button(host,'Remove world zone '+(index+1),()=>edit('Remove directed zone',n=>{(n.props.zones as string[]).splice(index,1);}),zones.length<=1||id===node.props.origin);
 }
 form.button(host,'Add world zone',()=>edit('Add directed zone',n=>{(n.props.zones as string[]).push(chunks.find(c=>!zones.includes(c))!);}),chunks.every(c=>zones.includes(c)));
}
