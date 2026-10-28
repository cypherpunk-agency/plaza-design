/** The sole pending-document model and undo history; independent of editor DOM. */
import {ArtRegistry,type ChunkDocument,type AssetInstance,type Value,type Properties,type Layer} from '../art/core/composition';
import {validateSequence} from '../art/core/sequence';
import type {TimelineContext} from '../art/core/timeline';
import {perfMeasure,perfBegin,perfEnd} from '../runtime/diagnostics/performance';
import {mutableActorArtwork} from '../engine/gameplay/native-actor-bindings';
import {preserveBoundIdentity} from './bound-identity';
import {frontOrder,restack} from './layer-stack';
import type {DocumentProjection} from './document-projection';
import type {EditorDocument,ComposerConfig} from './contracts';
interface Snapshot { id: string; value: unknown }
interface Command { label: string; before: Snapshot[]; after: Snapshot[] }
export const COMPOSER_HISTORY_LIMIT=100;
const copy = <T>(value:T):T=>structuredClone(value);
const equal = (a:unknown,b:unknown)=>a===b||JSON.stringify(a)===JSON.stringify(b);
const message = (e:unknown)=>e instanceof Error?e.message:String(e);
const flatten=(doc:ChunkDocument)=>{const list:{node:AssetInstance;depth:number}[]=[];const visit=(nodes:AssetInstance[],depth:number)=>nodes.forEach(node=>{list.push({node,depth});visit(node.children??[],depth+1);});visit(doc.instances,0);return list;};
/** Preserve unchanged JSON subtrees, so one visual edit does not invalidate every scene's dependencies. */
function retainUnchanged(before:unknown,after:unknown):unknown{
 if(before===after)return before;
 if(!before||!after||typeof before!=='object'||typeof after!=='object'||Array.isArray(before)!==Array.isArray(after)||!Array.isArray(after)&&![Object.prototype,null].includes(Object.getPrototypeOf(after)))return after;
 const a=before as Record<string,unknown>,b=after as Record<string,unknown>,keys=Object.keys(b);let same=Object.keys(a).length===keys.length;
 for(const key of keys){const next=retainUnchanged(a[key],b[key]);b[key]=next;if(next!==a[key]||!Object.prototype.hasOwnProperty.call(a,key))same=false;}return same?before:after;
}
/** Pure editing history; saved revisions are metadata and are deliberately outside undo history. */
export class ComposerModel {
  private documents = new Map<string, EditorDocument>();
  private saved = new Map<string, unknown>();
  private savedDocuments?:Map<string,EditorDocument>;
  private dirtyCache=new WeakMap<object,Map<string,boolean>>();
  private savedComparisons=new WeakMap<object,Map<unknown,boolean>>();
  private differsFromSaved(value:unknown,saved:unknown){
    if(value===saved)return false;
    if(!value||typeof value!=='object')return !equal(value,saved);
    let cache=this.savedComparisons.get(value);if(!cache)this.savedComparisons.set(value,cache=new Map());
    if(!cache.has(saved))cache.set(saved,!equal(value,saved));return cache.get(saved)!;
  }
  /** Opaque immutable-snapshot identity for derived preview caches; edits/history replace it. */
  get sourceVersion():object{return this.documents;}
  private past: Command[] = [];
  private future: Command[] = [];
  private validatedInputs?: readonly unknown[];
  private interaction?:{documents:Map<string,EditorDocument>;label:string;composition?:string;deferred?:boolean;full?:boolean};
  /** Pointer previews use ordinary validated edits, but own only one history command. */
  beginInteraction(label:string){
    if(this.interaction)throw Error('An editor interaction is already active');
    const interaction:NonNullable<ComposerModel['interaction']>={documents:this.documents,label};this.interaction=interaction;
    const finish=(cancel:boolean)=>{
      if(this.interaction!==interaction)return;this.interaction=undefined;
      const restore=()=>{const revisions=[...interaction.documents].some(([id,doc])=>this.documents.get(id)?.revision!==doc.revision);return revisions?new Map([...interaction.documents].map(([id,doc])=>[id,{...doc,revision:this.documents.get(id)?.revision??doc.revision}])):interaction.documents;};
      if(cancel){this.documents=restore();return;}
      const before:Snapshot[]=[],after:Snapshot[]=[];
      for(const[id,doc]of this.documents){const previous=interaction.documents.get(id);if(!previous)throw Error('An interaction cannot introduce source documents');if(equal(previous.value,doc.value))continue;before.push({id,value:copy(previous.value)});after.push({id,value:copy(doc.value)});}
      if(!before.length){this.documents=restore();return;}
      if(interaction.deferred){try{this.validate(this.documents);}catch(e){this.documents=restore();throw e;}}
      this.record({label,before,after});
    };
    return{commit:()=>finish(false),cancel:()=>finish(true)};
  }
  /** An artwork gesture reuses the existing transient preview, not a newly compiled world per pixel. */
  interactionPreview(){const drag=this.interaction;if(!drag?.deferred||drag.full||!drag.composition)return;return{sourceVersion:drag.documents,documents:this.inspectDocuments(drag.documents),transient:{document:drag.composition,composition:this.get(drag.composition).value as ChunkDocument}};}
  private record(command:Command){
    if(this.interaction)return;
    this.past.push(command);if(this.past.length>COMPOSER_HISTORY_LIMIT)this.past.shift();this.future=[];
  }

  constructor(readonly registry: ArtRegistry, readonly context: Omit<TimelineContext, 'registry' | 'compositions'> = {}, readonly validateDocument?: ComposerConfig['validateDocument'],readonly projections:readonly DocumentProjection[]=[],readonly destinationsFor?:ComposerConfig['destinationsFor'],readonly validationInputs?:ComposerConfig['validationInputs']) {}
  load(documents: EditorDocument[]) {
    if(this.interaction)throw Error('Finish the active interaction before loading source');
    const next = new Map<string, EditorDocument>();
    for (const doc of documents) { if (next.has(doc.id)) throw new Error('Duplicate document id'); next.set(doc.id, copy(doc)); }
    this.validate(next); this.documents = next; this.saved = new Map([...next].map(([id, d]) => [id, copy(d.value)]));this.savedDocuments=undefined;this.dirtyCache=new WeakMap(); this.past = []; this.future = [];
  }
  private expansions=new WeakMap<object,Map<string,EditorDocument>>();
  private children=new WeakMap<object,Map<DocumentProjection,EditorDocument[]>>();
  private validatedCompositions=new WeakSet<object>();
  private projectionChildren(projection:DocumentProjection,source:EditorDocument){
    let rows=this.children.get(source);if(!rows){rows=new Map();this.children.set(source,rows);}
    let children=rows.get(projection);if(!children){children=projection.children(source);rows.set(projection,children);}return children;
  }
  private expanded(documents:ReadonlyMap<string,EditorDocument>){
    const cached=this.expansions.get(documents);if(cached)return cached;
    const result=new Map(documents);for(const projection of this.projections){const source=documents.get(projection.sourceId);if(!source)throw new Error('Missing projection source: '+projection.sourceId);
      for(const child of this.projectionChildren(projection,source)){if(result.has(child.id))throw new Error('Duplicate projected document ID: '+child.id);result.set(child.id,child);}
    }this.expansions.set(documents,result);return result;
  }
  private projected(id:string,documents:ReadonlyMap<string,EditorDocument>=this.documents){
    for(const projection of this.projections){const source=documents.get(projection.sourceId);if(source&&this.projectionChildren(projection,source).some(d=>d.id===id))return projection;}
  }
  private inspectionViews=new WeakMap<object,EditorDocument[]>();
  private detachedDocs=new WeakMap<object,EditorDocument>();
  private frozenValues=new WeakMap<object,unknown>();
  private frozenCopy<T>(value:T):T{if(!value||typeof value!=='object')return value;const cached=this.frozenValues.get(value);if(cached)return cached as T;const result=Array.isArray(value)?value.map(v=>this.frozenCopy(v)):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,this.frozenCopy(v)]));Object.freeze(result);this.frozenValues.set(value,result);return result as T;}
  /** Immutable read snapshot shared by validators and editor consumers. get/list remain detached mutable copies. */
  inspectDocuments(documents:ReadonlyMap<string,EditorDocument>=this.documents):EditorDocument[]{
    let view=this.inspectionViews.get(documents);if(view)return view;
    view=[...this.expanded(documents).values()].map(doc=>{let detached=this.detachedDocs.get(doc);if(!detached){detached=this.frozenCopy(doc);this.detachedDocs.set(doc,detached);}return detached;});Object.freeze(view);this.inspectionViews.set(documents,view);return view;
  }
  list() { return perfMeasure('editor.documents', () => [...this.expanded(this.documents).values()].map(copy)); }
  get(id: string) { const doc = this.expanded(this.documents).get(id); if (!doc) throw new Error(`Unknown document: ${id}`); return copy(doc); }
  /** A transient drag uses the same source projection as a committed edit, without history or mutation. */
  previewDocuments(id:string,value:unknown):ReadonlyMap<string,unknown>{
    const projection=this.projected(id),owner=projection?.sourceId??id,source=this.documents.get(owner);
    if(!source)throw new Error('Unknown preview source: '+id);
    const next=new Map(this.documents);next.set(owner,{...source,value:projection?projection.replace(source.value,id,value):copy(value)});
    return new Map([...this.expanded(next)].map(([key,doc])=>[key,doc.value]));
  }

  private timelineContexts=new WeakMap<object,TimelineContext>();
  timelineContext(documents = this.documents): TimelineContext {
    const cached=this.timelineContexts.get(documents);if(cached)return cached;
    const all=this.inspectDocuments(documents),compositions:Record<string,ChunkDocument>={};
    for(const doc of all)if(doc.kind==='composition')compositions[doc.id]=doc.value as ChunkDocument;
    const context={...this.context,...(this.destinationsFor?{destinations:this.destinationsFor(all)}:{}),registry:this.registry,compositions};this.timelineContexts.set(documents,context);return context;
  }
  private validate(documents: Map<string, EditorDocument>) { return perfMeasure('editor.validate', () => this.validateAll(documents)); }
  private validateCompositions(documents:Map<string,EditorDocument>){
    for (const doc of this.expanded(documents).values()) if (doc.kind === 'composition'&&!this.validatedCompositions.has(doc.value as object)){this.registry.validate(doc.value);this.validatedCompositions.add(doc.value as object);}
    const ctx = this.timelineContext(documents);
    for (const doc of this.expanded(documents).values()) if(doc.kind==='composition'&&(doc.value as ChunkDocument).sequence)validateSequence(doc.value as ChunkDocument,ctx);
  }
  private validateAll(documents:Map<string,EditorDocument>){
    this.validateCompositions(documents);
    const all = this.inspectDocuments(documents), inputs = this.validationInputs?.(all);
    const unchanged = inputs && this.validatedInputs && inputs.length === this.validatedInputs.length && inputs.every((value, i) => value === this.validatedInputs![i]);
    for (const doc of unchanged ? [] : all) {
      if ((['gameplay','scene','fixtures','conversations','city','transport','devices','people','presets','profiles','rules','storyboard'].includes(doc.kind)) && !this.validateDocument) throw new Error('Behavior/gameplay/scene/fixture documents require their registered validator');
      const span=perfBegin('editor.validate-document',doc.id);try{this.validateDocument?.(doc,all);}finally{perfEnd(span);}
    }
    if (inputs) this.validatedInputs = inputs;
  }
  edit(id:string,label:string,operation:(value:unknown)=>unknown){
    const projection=this.projected(id),doc=projection?this.get(id):this.documents.get(id);if(!doc)throw Error('Unknown document: '+id);
    if(projection){const value=operation(doc.value);this.checkCompositionEdit(doc,value);this.editSource(projection.sourceId,label,source=>projection.replace(source,id,value),doc.kind==='composition'?id:undefined);}
    else this.editSource(id,label,operation,doc.kind==='composition'?id:undefined);
  }
  private editSource(id:string,label:string,operation:(value:unknown)=>unknown,composition?:string){
    const doc = this.documents.get(id);if(!doc)throw Error('Unknown document: '+id); if (doc.kind === 'world') throw new Error('World structure is read-only in this composer');
    const value = retainUnchanged(doc.value,operation(copy(doc.value))); if (value===doc.value) return;
    if (doc.kind === 'composition') {
      const before = doc.value as ChunkDocument, after = this.registry.validate(value);
      if (after.scene !== before.scene) throw new Error('Scene identity cannot be changed by the local composer');
      preserveBoundIdentity(before, after,this.registry);
    }
    const next = new Map(this.documents); next.set(id, { ...doc, value });
    const drag=this.interaction;
    if(drag&&composition&&!drag.full&&(!drag.composition||drag.composition===composition)){
      this.validateCompositions(next);drag.composition=composition;drag.deferred=true;
    }else{this.validate(next);if(drag)drag.full=true;}

    this.documents = next; this.record({ label, before: [{ id, value: doc.value }], after: [{ id, value: copy(value) }] });
  }
  private checkCompositionEdit(doc:EditorDocument,value:unknown){
    if(doc.kind==='composition'){const composition=this.registry.validate(value);if(composition.scene!==(doc.value as ChunkDocument).scene)throw new Error('Scene identity cannot be changed');preserveBoundIdentity(doc.value as ChunkDocument,composition,this.registry);}
  }
  /** Downloaded edits enter one validated history transaction; projected edits update their source owner. */
  importDocuments(changes: { id: string; value: unknown }[],label='Import downloaded edits') {
    const next=new Map(this.documents),ids=new Set<string>(),roots=new Set<string>();
    for(const item of changes){if(ids.has(item.id))throw new Error('Duplicate imported document');ids.add(item.id);
      const doc=this.get(item.id);if(doc.kind==='world')throw new Error('World structure is read-only');const value=copy(item.value);this.checkCompositionEdit(doc,value);
      const projection=this.projected(item.id),rootId=projection?.sourceId??item.id;
      if((projection&&ids.has(rootId))||(!projection&&changes.some(c=>this.projected(c.id)?.sourceId===item.id)))throw new Error('Import must use source owners or projected children, not both');
      const root=next.get(rootId)!;next.set(rootId,{...root,value:projection?projection.replace(copy(root.value),item.id,value):value});roots.add(rootId);
    }
    const before:Snapshot[]=[],after:Snapshot[]=[];for(const id of roots){if(equal(next.get(id)!.value,this.documents.get(id)!.value))continue;before.push({id,value:copy(this.documents.get(id)!.value)});after.push({id,value:copy(next.get(id)!.value)});}
    if(!before.length)return;this.validate(next);if(this.interaction)this.interaction.full=true;this.documents=next;this.record({label,before,after});
  }
  private restore(snapshots: Snapshot[]) { const next = new Map(this.documents); for (const item of snapshots) next.set(item.id, { ...this.get(item.id), value: copy(item.value) }); this.validate(next); this.documents = next; }
  undo() { if(this.interaction)throw Error('Finish the active interaction before Undo');const command = this.past[this.past.length - 1]; if (!command) return; this.restore(command.before); this.past.pop(); this.future.push(command); }
  redo() { if(this.interaction)throw Error('Finish the active interaction before Redo');const command = this.future[this.future.length - 1]; if (!command) return; this.restore(command.after); this.future.pop(); this.past.push(command); }
  get canUndo() { return !!this.past.length; } get canRedo() { return !!this.future.length; }
  get undoLabel() { return this.past[this.past.length - 1]?.label ?? ''; }
  dirty(id?:string):boolean{
    let cache=this.dirtyCache.get(this.documents);if(!cache){cache=new Map();this.dirtyCache.set(this.documents,cache);}const key=id??'';if(cache.has(key))return cache.get(key)!;
    this.savedDocuments??=new Map([...this.documents].map(([key,d])=>[key,{...d,value:this.saved.get(key)}]));
    const dirty=id?this.differsFromSaved(this.expanded(this.documents).get(id)?.value,this.expanded(this.savedDocuments).get(id)?.value):[...this.documents.keys()].some(id=>this.dirty(id));cache.set(key,dirty);return dirty;
  }

  edits() { return [...this.documents.values()].filter(d => d.kind !== 'world' && this.dirty(d.id)).map(d => ({ id: d.id, revision: d.revision, value: copy(d.value) })); }
  confirmSaved(documents: EditorDocument[]) {const next=new Map(this.documents);for(const saved of documents){const current=next.get(saved.id);if(!current)throw Error('Save returned an unknown document');next.set(saved.id,{...current,revision:saved.revision});this.saved.set(saved.id,copy(saved.value));}this.documents=next;this.savedDocuments=undefined;this.dirtyCache=new WeakMap();}
  /** Restore the current saved/loaded baseline in one undoable editor command; no repository writes. */
  discard(){const before:Snapshot[]=[],after:Snapshot[]=[];for(const doc of this.documents.values())if(doc.kind!=='world'&&this.dirty(doc.id)){before.push({id:doc.id,value:copy(doc.value)});after.push({id:doc.id,value:copy(this.saved.get(doc.id))});}if(!before.length)return;this.restore(after);this.record({label:'Discard all changes',before,after});}
  updateInstance(id: string, instanceId: string, label: string, edit: (node: AssetInstance) => void) {
    this.edit(id, label, value => { const doc = value as ChunkDocument, node = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!node) throw new Error('Selected instance no longer exists'); edit(node); return doc; });
  }
  add(id: string, type: string, placement: AssetInstance['placement'] = { x: 0, h: 0 }, settings?: Properties,children?:AssetInstance[]) {
    let instanceId = '';
    this.edit(id, 'Add artwork', value => { const doc = value as ChunkDocument; instanceId = this.insert(doc, type, placement, settings,children); return doc; }); return instanceId;
  }
  /** The composition as it would be after `add`, without touching history (used to measure placement). */
  draftAdd(id: string, type: string, settings?: Properties,children?:AssetInstance[]) { const doc = copy(this.get(id).value as ChunkDocument), instanceId = this.insert(doc, type, { x: 0, h: 0 }, settings,children); return { composition: this.registry.validate(doc), instanceId }; }
  /** `settings`: a kit preset's settings over the element's defaults. */
  private insert(doc: ChunkDocument, type: string, placement: AssetInstance['placement'], settings: Properties = {},children?:AssetInstance[]) {
    const element = this.registry.get(type), instanceId = this.unique(doc, type.replace(/[^a-zA-Z0-9_-]/g, '-')), props: Properties = {};
    for (const [key, field] of Object.entries(element.fields)) props[key] = copy(settings[key] ?? field.default) as Value;
    const bindings=element.bindingIdentity==='presentation'?Object.fromEntries(Object.entries(element.bindingChoices?.(doc)??{}).filter(([,choices])=>choices.length).map(([key,choices])=>[key,choices[0]])):{};
    const layer: Layer = element.defaultLayer??(element.framePhase==='sky'?'distance':element.parts.length || element.role === 'group' ? 'set' : 'logic'), order = frontOrder(doc, layer);
    const node:AssetInstance={ id: instanceId, type, props,...(Object.keys(bindings).length?{bindings}:{}), placement: { ...placement }, order, layer };
    if(children){if(type!=='assembly.group')throw Error('Only groups can add preset children');const ids=new Map<string,string>(),used=new Set(flatten(doc).map(x=>x.node.id));used.add(instanceId);node.children=copy(children);const walk=(n:AssetInstance)=>{const old=n.id;let next=instanceId+'-'+old,i=2;while(used.has(next))next=instanceId+'-'+old+'-'+i++;used.add(next);ids.set(old,next);n.id=next;n.children?.forEach(walk);};node.children.forEach(walk);const attach=(n:AssetInstance)=>{if(n.attach){const id=ids.get(n.attach.instance);if(!id)throw Error('Preset attachment points outside its group');n.attach.instance=id;}n.children?.forEach(attach);};node.children.forEach(attach);}
    doc.instances.push(node); return instanceId;
  }
  /** Layered compositions: move artwork to a back-to-front position in a layer. */
  restack(id: string, instanceId: string, layer: Layer, index: number) {
    this.edit(id, 'Move in layer stack', value => { const doc = value as ChunkDocument; restack(doc, instanceId, layer, index); return doc; });
  }
  private unique(doc: ChunkDocument, prefix: string) { const ids = new Set(flatten(doc).map(x => x.node.id)); let i = 1; while (ids.has(`${prefix}-${i}`)) i++; return `${prefix}-${i}`; }
  duplicate(id: string, instanceId: string) {
    let created = '';
    this.edit(id, 'Duplicate artwork', value => {
      const doc = value as ChunkDocument, source = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!source) throw new Error('Missing instance');
      const duplicate = copy(source), ids = new Map<string, string>();
      const walk = (node: AssetInstance) => { if (Object.keys(node.bindings ?? {}).length&&this.registry.get(node.type).bindingIdentity!=='presentation') throw new Error('Gameplay-bound artwork cannot be duplicated; add a decorative catalog element instead'); const old = node.id; node.id = this.unique(doc, old + '-copy'); ids.set(old, node.id); node.children?.forEach(walk); };
      walk(duplicate); const attach = (node: AssetInstance) => { if (node.attach && ids.has(node.attach.instance)) node.attach.instance = ids.get(node.attach.instance)!; node.children?.forEach(attach); }; attach(duplicate);
      const siblings = (nodes: AssetInstance[]): AssetInstance[] | undefined => nodes.includes(source) ? nodes : nodes.map(n => siblings(n.children ?? [])).find(Boolean);
      duplicate.placement.x += 12; duplicate.order += 1; siblings(doc.instances)!.push(duplicate); created = duplicate.id; return doc;
    }); return created;
  }
  /**
   * What deleting an instance takes with it: its children and, with `cascade`, everything attached to anything removed
   * (and their children), in document order. Gameplay-bound artwork refuses with the reason.
   */
  removal(id: string, instanceId: string, cascade = false): string[] {
    const doc = this.get(id).value as ChunkDocument, rows = flatten(doc), source = rows.find(x => x.node.id === instanceId)?.node; if (!source) throw new Error('Missing instance');
    const removed = new Set<string>();
    const visit = (node: AssetInstance) => {
      if (removed.has(node.id)) return;
      if (Object.keys(node.bindings ?? {}).length&&!mutableActorArtwork(doc.scene,node)&&this.registry.get(node.type).bindingIdentity!=='presentation') throw new Error(`${node.id} is used by gameplay; resolve its bindings in Logic before deleting${node.id === instanceId ? '' : ` ${instanceId}`}`);
      removed.add(node.id); node.children?.forEach(visit);
    };
    visit(source);
    for (let grew = true; grew;) { grew = false; for (const { node } of rows) if (!removed.has(node.id) && node.attach && removed.has(node.attach.instance)) {
      if (!cascade) throw new Error(`${node.id} is attached here; detach it first`);
      visit(node); grew = true;
    } }
    return rows.map(row => row.node.id).filter(nodeId => removed.has(nodeId));
  }
  /** Runs edits and rolls them back: the reason they would be refused, or '' when they would apply. */
  trial(change: () => void): string {
    const documents = this.documents, past = [...this.past], future = [...this.future];
    try { change(); return ''; } catch (error) { return message(error); } finally { this.documents = documents; this.past = past; this.future = future; }
  }
  remove(id: string, instanceId: string, cascade = false) {
    const removed = new Set(this.removal(id, instanceId, cascade));
    this.edit(id, removed.size > 1 ? `Delete artwork and ${removed.size - 1} attached` : 'Delete artwork', value => {
      const doc = value as ChunkDocument;
      const filter = (nodes: AssetInstance[]): AssetInstance[] => nodes.filter(node => !removed.has(node.id)).map(node => { if (node.children) node.children = filter(node.children); return node; }); doc.instances = filter(doc.instances); return doc;
    });
  }
}
