import {mountResolvedInspector} from './resolved-inspector';
import type {ArtworkInspection} from '../art/core/presentation';
import {selectionKey} from './selection';
/** Inspector DOM lifecycle. Commands and documents remain owned by the composer model. */
import type {ArtRegistry,Instance} from '../art/core/composition';
import type {EditorDocument,InspectorSection,WorkbenchContext,WorkbenchHandle} from './contracts';
import {element,button} from './controls';
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
interface InspectorOptions {
 node?:Instance;scene:string;doc?:EditorDocument;sceneName:string;sharedSource:boolean;registry:ArtRegistry;
 duplicate():void;remove():void;deselect():void;openSource():void;refresh():void;
 resolved?():ArtworkInspection|undefined;
 sections():InspectorSection[];context():WorkbenchContext;appearance(host:HTMLElement,node:Instance):void;
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
      head.append(element('h2', '', node.id), element('p', 'muted', `${art.label} · ${node.type}`));
      actions.append(button('Duplicate', options.duplicate), button('Delete', options.remove, 'Delete this artwork (Delete)'), button('Deselect', options.deselect, 'Back to the scene’s own settings (Esc)'));
      head.append(actions);
    } else head.append(element('h2', '', options.sceneName || 'Scene'), element('p', 'muted', 'Nothing selected, so these are the scene’s own settings. Click artwork in the preview or the outline to inspect it.'));
    if(options.sharedSource)head.append(element('p','muted','Editing '+options.sceneName+'; these changes also appear in the game.'),button('Open source scene',()=>options.openSource()));
    right.append(head);
    if(node&&options.resolved){updateResolved=mountResolvedInspector(right,options.resolved,()=>{inspectorTab='appearance';options.refresh();},resolvedState);updateResolved();}
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
 return{render,dispose,updateResolved:()=>updateResolved(),appearance(){inspectorTab='appearance';}};
}
