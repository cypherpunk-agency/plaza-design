/** The sole pending-document model and undo history; independent of editor DOM. */
import {ArtRegistry,type Composition,type Instance,type Value,type Properties,type Layer} from '../art/core/composition';
import {validateSequence} from '../art/core/sequence';
import type {TimelineContext} from '../art/core/timeline';
import {perfMeasure} from '../runtime/diagnostics/performance';
import {mutableActorArtwork} from '../engine/gameplay/native-actor-bindings';
import {preserveBoundIdentity} from './bound-identity';
import {frontOrder,restack} from './layer-stack';
import type {DocumentProjection} from './document-projection';
import type {EditorDocument,ComposerConfig} from './contracts';
interface Snapshot { id: string; value: unknown }
interface Command { label: string; before: Snapshot[]; after: Snapshot[] }
const copy = <T>(value:T):T=>structuredClone(value);
const equal = (a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const message = (e:unknown)=>e instanceof Error?e.message:String(e);
const flatten=(doc:Composition)=>{const list:{node:Instance;depth:number}[]=[];const visit=(nodes:Instance[],depth:number)=>nodes.forEach(node=>{list.push({node,depth});visit(node.children??[],depth+1);});visit(doc.instances,0);return list;};
/** Pure editing history; saved revisions are metadata and are deliberately outside undo history. */
export class ComposerModel {
  private documents = new Map<string, EditorDocument>();
  private saved = new Map<string, unknown>();
  /** Opaque immutable-snapshot identity for derived preview caches; edits/history replace it. */
  get sourceVersion():object{return this.documents;}
  private past: Command[] = [];
  private future: Command[] = [];
  private validatedInputs?: readonly unknown[];
  constructor(readonly registry: ArtRegistry, readonly context: Omit<TimelineContext, 'registry' | 'compositions'> = {}, readonly validateDocument?: ComposerConfig['validateDocument'],readonly projections:readonly DocumentProjection[]=[],readonly destinationsFor?:ComposerConfig['destinationsFor'],readonly validationInputs?:ComposerConfig['validationInputs']) {}
  load(documents: EditorDocument[]) {
    const next = new Map<string, EditorDocument>();
    for (const doc of documents) { if (next.has(doc.id)) throw new Error('Duplicate document id'); next.set(doc.id, copy(doc)); }
    this.validate(next); this.documents = next; this.saved = new Map([...next].map(([id, d]) => [id, copy(d.value)])); this.past = []; this.future = [];
  }
  private expanded(documents:ReadonlyMap<string,EditorDocument>){
    const result=new Map(documents);for(const projection of this.projections){const source=documents.get(projection.sourceId);if(!source)throw new Error('Missing projection source: '+projection.sourceId);
      for(const child of projection.children(source)){if(result.has(child.id))throw new Error('Duplicate projected document ID: '+child.id);result.set(child.id,child);}
    }return result;
  }
  private projected(id:string,documents:ReadonlyMap<string,EditorDocument>=this.documents){
    for(const projection of this.projections){const source=documents.get(projection.sourceId);if(source&&projection.children(source).some(d=>d.id===id))return projection;}
  }
  list() { return perfMeasure('editor.documents', () => [...this.expanded(this.documents).values()].map(copy)); }
  get(id: string) { const doc = this.expanded(this.documents).get(id); if (!doc) throw new Error(`Unknown document: ${id}`); return copy(doc); }
  /** A transient drag uses the same source projection as a committed edit, without history or mutation. */
  previewDocuments(id:string,value:unknown):ReadonlyMap<string,unknown>{
    const projection=this.projected(id),owner=projection?.sourceId??id,source=this.documents.get(owner);
    if(!source)throw new Error('Unknown preview source: '+id);
    const next=new Map(this.documents);next.set(owner,{...source,value:projection?projection.replace(source.value,id,value):copy(value)});
    return new Map([...this.expanded(next)].map(([key,doc])=>[key,copy(doc.value)]));
  }

  timelineContext(documents = this.documents): TimelineContext {
    const compositions: Record<string, Composition> = {};
    for (const doc of this.expanded(documents).values()) if (doc.kind === 'composition') compositions[doc.id] = doc.value as Composition;
    return { ...this.context, ...(this.destinationsFor?{destinations:this.destinationsFor([...this.expanded(documents).values()])}:{}), registry: this.registry, compositions };
  }
  private validate(documents: Map<string, EditorDocument>) { return perfMeasure('editor.validate', () => this.validateAll(documents)); }
  private validateAll(documents: Map<string, EditorDocument>) {
    for (const doc of this.expanded(documents).values()) if (doc.kind === 'composition') this.registry.validate(doc.value);
    const ctx = this.timelineContext(documents);
    for (const doc of this.expanded(documents).values()) if(doc.kind==='composition'&&(doc.value as Composition).sequence)validateSequence(doc.value as Composition,ctx);
    const all = [...this.expanded(documents).values()], inputs = this.validationInputs?.(all);
    const unchanged = inputs && this.validatedInputs && inputs.length === this.validatedInputs.length && inputs.every((value, i) => value === this.validatedInputs![i]);
    for (const doc of unchanged ? [] : all) {
      if ((['gameplay','scene','fixtures','conversations','city','transport','devices','people','presets','profiles','rules','storyboard'].includes(doc.kind)) && !this.validateDocument) throw new Error('Behavior/gameplay/scene/fixture documents require their registered validator');
      this.validateDocument?.(doc, all);
    }
    if (inputs) this.validatedInputs = inputs;
  }
  edit(id: string, label: string, operation: (value: unknown) => unknown) {
    const projection=this.projected(id);if(projection){const value=operation(this.get(id).value);this.checkCompositionEdit(this.get(id),value);this.edit(projection.sourceId,label,source=>projection.replace(source,id,value));return;}
    const doc = this.get(id); if (doc.kind === 'world') throw new Error('World structure is read-only in this composer');
    const value = operation(copy(doc.value)); if (equal(value, doc.value)) return;
    if (doc.kind === 'composition') {
      const before = doc.value as Composition, after = this.registry.validate(value);
      if (after.scene !== before.scene) throw new Error('Scene identity cannot be changed by the local composer');
      preserveBoundIdentity(before, after,this.registry);
    }
    const next = new Map(this.documents); next.set(id, { ...doc, value }); this.validate(next);
    this.documents = next; this.past.push({ label, before: [{ id, value: doc.value }], after: [{ id, value: copy(value) }] });
    if (this.past.length > 100) this.past.shift(); this.future = [];
  }
  private checkCompositionEdit(doc:EditorDocument,value:unknown){
    if(doc.kind==='composition'){const composition=this.registry.validate(value);if(composition.scene!==(doc.value as Composition).scene)throw new Error('Scene identity cannot be changed');preserveBoundIdentity(doc.value as Composition,composition,this.registry);}
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
    if(!before.length)return;this.validate(next);this.documents=next;this.past.push({label,before,after});if(this.past.length>100)this.past.shift();this.future=[];
  }
  private restore(snapshots: Snapshot[]) { const next = new Map(this.documents); for (const item of snapshots) next.set(item.id, { ...this.get(item.id), value: copy(item.value) }); this.validate(next); this.documents = next; }
  undo() { const command = this.past[this.past.length - 1]; if (!command) return; this.restore(command.before); this.past.pop(); this.future.push(command); }
  redo() { const command = this.future[this.future.length - 1]; if (!command) return; this.restore(command.after); this.future.pop(); this.past.push(command); }
  get canUndo() { return !!this.past.length; } get canRedo() { return !!this.future.length; }
  get undoLabel() { return this.past[this.past.length - 1]?.label ?? ''; }
  dirty(id?:string){if(!id)return [...this.documents].some(([key,d])=>!equal(d.value,this.saved.get(key)));
    const saved=new Map([...this.documents].map(([key,d])=>[key,{...d,value:this.saved.get(key)}]));return !equal(this.expanded(this.documents).get(id)?.value,this.expanded(saved).get(id)?.value);
  }
  edits() { return [...this.documents.values()].filter(d => d.kind !== 'world' && this.dirty(d.id)).map(d => ({ id: d.id, revision: d.revision, value: copy(d.value) })); }
  confirmSaved(documents: EditorDocument[]) { for (const saved of documents) { const current = this.documents.get(saved.id); if (!current) throw new Error('Save returned an unknown document'); current.revision = saved.revision; this.saved.set(saved.id, copy(saved.value)); } }
  /** Restore the current saved/loaded baseline in one undoable editor command; no repository writes. */
  discard(){const before:Snapshot[]=[],after:Snapshot[]=[];for(const doc of this.documents.values())if(doc.kind!=='world'&&this.dirty(doc.id)){before.push({id:doc.id,value:copy(doc.value)});after.push({id:doc.id,value:copy(this.saved.get(doc.id))});}if(!before.length)return;this.restore(after);this.past.push({label:'Discard all changes',before,after});this.future=[];}
  updateInstance(id: string, instanceId: string, label: string, edit: (node: Instance) => void) {
    this.edit(id, label, value => { const doc = value as Composition, node = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!node) throw new Error('Selected instance no longer exists'); edit(node); return doc; });
  }
  add(id: string, type: string, placement: Instance['placement'] = { x: 0, h: 0 }, settings?: Properties) {
    let instanceId = '';
    this.edit(id, 'Add artwork', value => { const doc = value as Composition; instanceId = this.insert(doc, type, placement, settings); return doc; }); return instanceId;
  }
  /** The composition as it would be after `add`, without touching history (used to measure placement). */
  draftAdd(id: string, type: string, settings?: Properties) { const doc = copy(this.get(id).value as Composition), instanceId = this.insert(doc, type, { x: 0, h: 0 }, settings); return { composition: this.registry.validate(doc), instanceId }; }
  /** `settings`: a kit preset's settings over the element's defaults. */
  private insert(doc: Composition, type: string, placement: Instance['placement'], settings: Properties = {}) {
    const element = this.registry.get(type), instanceId = this.unique(doc, type.replace(/[^a-zA-Z0-9_-]/g, '-')), props: Properties = {};
    for (const [key, field] of Object.entries(element.fields)) props[key] = copy(settings[key] ?? field.default) as Value;
    const bindings=element.bindingIdentity==='presentation'?Object.fromEntries(Object.entries(element.bindingChoices?.(doc)??{}).filter(([,choices])=>choices.length).map(([key,choices])=>[key,choices[0]])):{};
    const layer: Layer = element.framePhase==='sky'?'distance':element.parts.length || element.role === 'group' ? 'set' : 'logic', order = frontOrder(doc, layer);
    doc.instances.push({ id: instanceId, type, props,...(Object.keys(bindings).length?{bindings}:{}), placement: { ...placement }, order, layer }); return instanceId;
  }
  /** Layered compositions: move artwork to a back-to-front position in a layer. */
  restack(id: string, instanceId: string, layer: Layer, index: number) {
    this.edit(id, 'Move in layer stack', value => { const doc = value as Composition; restack(doc, instanceId, layer, index); return doc; });
  }
  private unique(doc: Composition, prefix: string) { const ids = new Set(flatten(doc).map(x => x.node.id)); let i = 1; while (ids.has(`${prefix}-${i}`)) i++; return `${prefix}-${i}`; }
  duplicate(id: string, instanceId: string) {
    let created = '';
    this.edit(id, 'Duplicate artwork', value => {
      const doc = value as Composition, source = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!source) throw new Error('Missing instance');
      const duplicate = copy(source), ids = new Map<string, string>();
      const walk = (node: Instance) => { if (Object.keys(node.bindings ?? {}).length&&this.registry.get(node.type).bindingIdentity!=='presentation') throw new Error('Gameplay-bound artwork cannot be duplicated; add a decorative catalog element instead'); const old = node.id; node.id = this.unique(doc, old + '-copy'); ids.set(old, node.id); node.children?.forEach(walk); };
      walk(duplicate); const attach = (node: Instance) => { if (node.attach && ids.has(node.attach.instance)) node.attach.instance = ids.get(node.attach.instance)!; node.children?.forEach(attach); }; attach(duplicate);
      const siblings = (nodes: Instance[]): Instance[] | undefined => nodes.includes(source) ? nodes : nodes.map(n => siblings(n.children ?? [])).find(Boolean);
      duplicate.placement.x += 12; duplicate.order += 1; siblings(doc.instances)!.push(duplicate); created = duplicate.id; return doc;
    }); return created;
  }
  /**
   * What deleting an instance takes with it: its children and, with `cascade`, everything attached to anything removed
   * (and their children), in document order. Gameplay-bound artwork refuses with the reason.
   */
  removal(id: string, instanceId: string, cascade = false): string[] {
    const doc = this.get(id).value as Composition, rows = flatten(doc), source = rows.find(x => x.node.id === instanceId)?.node; if (!source) throw new Error('Missing instance');
    const removed = new Set<string>();
    const visit = (node: Instance) => {
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
      const doc = value as Composition;
      const filter = (nodes: Instance[]): Instance[] => nodes.filter(node => !removed.has(node.id)).map(node => { if (node.children) node.children = filter(node.children); return node; }); doc.instances = filter(doc.instances); return doc;
    });
  }
}
