import {mountResolvedInspector,type VisibilityActions} from './resolved-inspector';
import type {ArtworkInspection} from '../art/core/presentation';
import {selectionKey} from './selection';
/** Inspector DOM lifecycle. Commands and documents remain owned by the composer model. */
import type {ArtRegistry,AssetInstance} from '../art/core/composition';
import type {EditorDocument,InspectorSection,WorkbenchContext,WorkbenchHandle} from './contracts';
import {element,button} from './controls';
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
interface InspectorOptions {
 node?:AssetInstance;scene:string;doc?:EditorDocument;sceneName:string;sharedSource:boolean;registry:ArtRegistry;
 duplicate():void;remove():void;deselect():void;openSource():void;refresh():void;
 resolved?():ArtworkInspection|undefined;
 visibility?:VisibilityActions;
 sections():InspectorSection[];context():WorkbenchContext;appearance(host:HTMLElement,node:AssetInstance):void;
}
export function createInspector(){
 const resolvedState={open:false};
 let updateResolved:()=>void=()=>{};
 let inspectorTab='appearance',inspectedId='';
 let inspectorMount:{key:string;host:HTMLElement;handle?:WorkbenchHandle}|undefined;
 const dispose=()=>{inspectorMount?.handle?.();inspectorMount=undefined;};
 const render=(right:HTMLElement,options:InspectorOptions)=>{
  updateResolved=()=>{};
  const{node,scene,doc}=options;
    if (!doc) { dispose(); right.append(element('h2', '', 'Inspector'), element('p', 'muted', 'Open a scene to inspect it.')); return; }
    const head = element('div', 'inspector-head');
    if (node) {
      const art = options.registry.get(node.type), actions = element('div', 'row');
      const identity = element('div', 'identity'), icon = (text: string, name: string, action: () => void, title: string) => { const item = button(text, action, title); item.className = 'icon'; item.setAttribute('aria-label', name); return item; };
      identity.append(element('h2', '', node.id), element('div', 'kind', `${art.label} · ${node.type}`));
      actions.className = 'identity-actions'; actions.append(icon('⧉', 'Duplicate', options.duplicate, 'Duplicate (Ctrl D)'), icon('⌫', 'Delete', options.remove, 'Delete this artwork (Delete)'), icon('×', 'Deselect', options.deselect, 'Back to the chunk’s own settings (Esc)'));
      head.append(identity, actions);
    } else { const identity = element('div', 'identity'); identity.append(element('h2', '', options.sceneName || 'Scene'), element('div', 'kind', 'Chunk · its own settings. Select artwork to inspect it.')); head.append(identity); }
    if(options.sharedSource){const shared=element('div','kind');shared.append('Shared source · changes also appear in the game · ',button('Open source',()=>options.openSource()));head.append(shared);}
    right.append(head);
    if(node&&options.resolved){updateResolved=mountResolvedInspector(right,options.resolved,()=>{inspectorTab='appearance';options.refresh();},resolvedState,options.visibility);updateResolved();}
    let sections: InspectorSection[] = [];
    try { sections = options.sections(); } catch (e) { right.append(element('p', 'error', `Inspector unavailable: ${message(e)}`)); }
    // a primary section (a barrier's Access) comes first and opens first each time the selection changes
    const primary = sections.find(section => section.primary);
    const identity=selectionKey(doc.id,node?.id??'');
    if (identity !== inspectedId) { inspectedId = identity; if (primary) inspectorTab = primary.id; }
    const tabs = [...(primary ? [primary] : []), ...(node ? [{ id: 'appearance', label: 'Appearance', title: 'Position, look and attachment' }] : []), ...sections.filter(section => section !== primary)];
    if (!tabs.length) { dispose(); right.append(element('p', 'muted', 'This scene has no editable logic yet.')); return; }
    if (!tabs.some(tab => tab.id === inspectorTab)) inspectorTab = tabs[0].id;
    if (tabs.length > 1) {
      const strip = element('div', 'inspector-tabs'); strip.setAttribute('role', 'tablist'); strip.setAttribute('aria-label', 'Inspector sections');
      for (const tab of tabs) { const pick = button(tab.label, () => { inspectorTab = tab.id; options.refresh(); }, tab.title); pick.setAttribute('role', 'tab'); pick.setAttribute('aria-selected', String(tab.id === inspectorTab)); strip.append(pick); }
      right.append(strip);
    }
    const body = element('div', 'inspector-body'); body.setAttribute('role', 'tabpanel'); right.append(body);
    if (inspectorTab === 'appearance' && node) { dispose(); options.appearance(body,node); return; }
    const section = sections.find(item => item.id === inspectorTab)!, key = `${doc.id}|${scene}|${node?.id ?? ''}|${section.id}|${section.title ?? section.label}`;
    if (inspectorMount?.key === key && inspectorMount.handle?.refresh) { body.append(inspectorMount.host); inspectorMount.handle.refresh(); return; }
    dispose(); const host = element('div', 'inspector-mount'); body.append(host); inspectorMount = { key, host };
    try { inspectorMount.handle = section.mount(host, options.context()); } catch (e) { host.replaceChildren(element('p', 'error', `Unavailable: ${message(e)}`)); }
 };
 return{render,dispose,selectSection(id:string){const changed=inspectorTab!==id;inspectorTab=id;return changed;},updateResolved:()=>updateResolved(),appearance(){inspectorTab='appearance';}};
}
