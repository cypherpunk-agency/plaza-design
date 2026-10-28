import {fieldUnit} from '../art/core/fields';
import {COMPOSER_HISTORY_LIMIT} from './composer-model';
import type {Field,Value,Properties} from '../art/core/composition';
const copy=<T>(value:T):T=>structuredClone(value);
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
export const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
export const button = (text: string, action: () => void, title?: string) => { const node = element('button', '', text); node.type = 'button'; node.onclick = action; if (title) node.title = title; return node; };
export const select = (values: { value: string; label: string }[], value: string, onChange: (v: string) => void) => { const node = element('select'); for (const item of values) { const option = element('option', '', item.label); option.value = item.value; node.append(option); } node.value = value; node.onchange = () => onChange(node.value); return node; };
/** Option lists longer than this get a search field. Native type-ahead alone does not find words inside labels. */
const SEARCHABLE_OPTIONS = 15;
/** Adds a search field to every select in scope with more than 15 options; filtering only hides options, so values and change handlers stay as they are. */
export function enhanceLongSelects(scope: ParentNode) {
  for (const node of scope.querySelectorAll<HTMLSelectElement>('select:not([data-searchable])')) {
    if (node.closest('header') || node.multiple || node.options.length <= SEARCHABLE_OPTIONS) continue;
    node.dataset.searchable = '';
    const search = element('input', 'select-search'); search.type = 'search'; search.placeholder = `Search ${node.options.length}`; search.setAttribute('aria-label', `Search ${node.getAttribute('aria-label') ?? 'options'}`);
    const filter = () => {
      const query = search.value.trim().toLowerCase(); let first: HTMLOptionElement | undefined;
      for (const option of node.options) { const shown = !query || option.text.toLowerCase().includes(query) || option.value.toLowerCase().includes(query); option.hidden = !shown; if (shown && !option.disabled && !first) first = option; }
      for (const group of node.querySelectorAll('optgroup')) group.hidden = ![...group.children].some(option => !(option as HTMLOptionElement).hidden);
      return first;
    };
    search.oninput = () => { filter(); };
    search.onkeydown = event => {
      if (event.key === 'Enter') { event.preventDefault(); const first = filter(); if (first && first.value !== node.value) { node.value = first.value; node.dispatchEvent(new Event('change')); } }
      else if (event.key === 'Escape' && search.value) { event.stopPropagation(); search.value = ''; filter(); }
    };
    const wrap = element('span', 'searchable-select'); node.replaceWith(wrap); wrap.append(search, node);
  }
}
/** Explanations longer than a line that come before a panel's first field or section move into one "About this" fold at its end. Warnings, errors and status lines stay. */
export function demoteLeadingNotes(scope: HTMLElement) {
  const first = [...scope.querySelectorAll('input,select,textarea,summary')].find(item => !item.closest('.about-notes,.inspector-head,.inspector-tabs')); if (!first) return;
  const notes = [...scope.querySelectorAll<HTMLElement>('p')].filter(note => (note.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING) && !note.closest('.about-notes,.inspector-head,.inspector-warning,[role=alert],[role=status]') && !note.matches('.error,.inspector-error,.field-problem') && !note.querySelector('button,input,select,textarea') && (note.textContent ?? '').trim().length > 60);
  if (!notes.length) return;
  let about = scope.querySelector<HTMLDetailsElement>(':scope > details.about-notes');
  if (!about) { about = element('details', 'about-notes'); about.append(element('summary', '', 'ⓘ About this')); }
  scope.append(about); for (const note of notes) about.append(note);
}
export const label = (text: string, control: HTMLElement) => { const structured=control.className.split(' ').includes('structured-field'),node = element(structured?'div':'label');if(structured){node.setAttribute('role','group');node.setAttribute('aria-label',text);}node.append(element('span', '', text), control); return node; };

export function createFieldControls(notice:(message:string,error?:boolean)=>void,openSection?:(section:string)=>void,selectionScope:()=>string=()=> ''){
  // Only editor selection keys are retained here. Values and history remain in ComposerModel.
  // Remembering a bounded set of source signatures also restores row identity after Undo.
  type Rows={revision:number;next:number;signature:string;keys:string[];selected?:string;history:Map<string,string[]>;pending?:{signature:string;keys:string[];selected?:string}};
  const selections=new Map<string,Rows>();
  let activeScope:string|undefined;
  function rowSelection(identity:string,rows:Value[]){
    const scope=selectionScope();if(scope!==activeScope){for(const state of selections.values())state.revision++;selections.clear();activeScope=scope;}
    let state=selections.get(identity);if(!state){state={revision:0,next:0,signature:'',keys:[],history:new Map()};selections.set(identity,state);}
    const signature=JSON.stringify(rows),pending=state.pending;state.pending=undefined;if(pending||state.signature!==signature)state.revision++;
    if(pending?.signature===signature){state.keys=pending.keys;state.selected=pending.selected;}
    else if(state.signature!==signature)state.keys=state.history.get(signature)?.slice()??rows.map(()=> 'row-'+(++state!.next));
    state.signature=signature;if(!state.keys.includes(state.selected??''))state.selected=undefined;
    state.history.delete(signature);state.history.set(signature,state.keys.slice());if(state.history.size>COMPOSER_HISTORY_LIMIT+1)state.history.delete(state.history.keys().next().value!);
    return state;
  }
  function numberInput(value: number, apply: (n: number) => void, min?: number, step = 'any') { const input = element('input'); input.type = 'number'; input.step = step; if (min !== undefined) input.min = String(min); input.value = String(value); input.onchange = () => { const number = Number(input.value),minimum=input.min===''?undefined:Number(input.min),maximum=input.max===''?undefined:Number(input.max); if (!input.value.trim() || !Number.isFinite(number) || minimum !== undefined && number < minimum || maximum !== undefined && number > maximum) { notice('Enter a finite number within the field range.', true); return; } apply(number); }; return input; }
  /** Structured JSON fields with an inspector editor: rows of small fields, or a set of checkboxes. */
  function structuredInput(editor: NonNullable<Field["editor"]>, value: Value, apply: (v: Value) => void,identity:string): HTMLElement {
    const wrap = element('div', 'structured-field'), auto = value === 'auto';
    if(editor.kind==='contextual'){const go=button(editor.label,()=>openSection?.(editor.section));go.disabled=!openSection;wrap.append(go);return wrap;}
    if (editor.kind === 'colour') {
      const box = element('input'), pick = element('input'), own = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); box.type = 'checkbox'; box.checked = !own; pick.type = 'color'; pick.value = own ? value as string : '#808080'; pick.disabled = !own;
      box.onchange = () => apply(box.checked ? '' : pick.value); pick.onchange = () => apply(pick.value); wrap.append(label(editor.empty, box), pick); return wrap;
    }
    if (editor.auto) { const box = element('input'); box.type = 'checkbox'; box.checked = auto; box.onchange = () => apply(box.checked ? 'auto' : editor.kind === 'set' ? [] : []); wrap.append(label(editor.auto, box)); }
    if (auto) return wrap;
    if(editor.kind==='tuple'){
      const values=Array.isArray(value)?value:[];
      if(editor.empty){const enabled=element('input');enabled.type='checkbox';enabled.checked=values.length>0;enabled.onchange=()=>apply(enabled.checked?editor.items.map(f=>copy(f.default)):[]);wrap.append(label(editor.empty,enabled));if(!values.length)return wrap;}
      editor.items.forEach((field,index)=>wrap.append(label(field.label+(fieldUnit(field)?` (${fieldUnit(field)})`:''),fieldInput(field,values[index]??field.default,next=>{const result=editor.items.map((f,i)=>copy(values[i]??f.default));result[index]=next;apply(result);},identity+'/'+index))))
      return wrap;
    }
    if (editor.kind === 'set') {
      const chosen = new Set(Array.isArray(value) ? value.map(String) : []);
      for (const option of editor.options) { const box = element('input'); box.type = 'checkbox'; box.checked = chosen.has(option); box.onchange = () => apply(editor.options.filter(o => o === option ? box.checked : chosen.has(o))); wrap.append(label(option, box)); }
      return wrap;
    }
    const rows=Array.isArray(value)?value:[],state=rowSelection(identity,rows),signature=state.signature,revision=state.revision,scope=selectionScope(),lines=new Map<string,HTMLElement>();
    const current=()=>{if(selectionScope()===scope&&state.signature===signature&&state.revision===revision)return true;notice('This list changed. Select the row again before editing it.',true);return false;};
    const update=(next:Value[],keys=state.keys.slice(),selected=state.selected)=>{if(!current())return;state.pending={signature:JSON.stringify(next),keys,selected};try{apply(next);}catch(error){state.pending=undefined;throw error;}};
    const choose=(key:string)=>{if(!current()||!state.keys.includes(key))return;state.selected=key;for(const[id,line]of lines){line.dataset.selected=String(id===key);line.querySelector('button[data-row-select]')?.setAttribute('aria-pressed',String(id===key));}};
    rows.forEach((row,index)=>{
      const key=state.keys[index],line=element('div','structured-row'),actions=element('div','structured-row-actions');line.dataset.rowKey=key;line.dataset.selected=String(state.selected===key);lines.set(key,line);
      const pick=button('Row '+(index+1),()=>choose(key));pick.dataset.rowSelect='';pick.setAttribute('aria-pressed',String(state.selected===key));actions.append(pick);
      for(const[step,text]of [[-1,'↑'],[1,'↓']]as const){const move=button(text,()=>{const target=index+step;if(target<0||target>=rows.length)return;const next=rows.slice(),keys=state.keys.slice();[next[index],next[target]]=[next[target],next[index]];[keys[index],keys[target]]=[keys[target],keys[index]];update(next,keys,key);},step<0?'Move row up':'Move row down');move.setAttribute('aria-label',step<0?'Move row up':'Move row down');move.disabled=index+step<0||index+step>=rows.length;actions.append(move);}
      const remove=button('Remove',()=>{const keys=state.keys.filter(k=>k!==key);update(rows.filter((_,i)=>i!==index),keys,state.selected===key?keys[Math.min(index,keys.length-1)]:state.selected);},'Remove this row');remove.disabled=editor.kind==='array'&&rows.length<=(editor.minItems??0);actions.append(remove);line.append(actions);
      line.addEventListener('focusin',()=>choose(key));
      if(editor.kind==='array')line.append(label(editor.item.label+' '+(index+1),fieldInput(editor.item,row,next=>update(rows.map((v,i)=>i===index?next:v)),identity+'/'+key)));
      else for(const[name,sub]of Object.entries(editor.item)){const object=row as Properties;line.append(label(sub.label+(fieldUnit(sub)?` (${fieldUnit(sub)})`:''),fieldInput(sub,object[name]??sub.default,next=>update(rows.map((v,i)=>i===index?{...object,[name]:next}:v)),identity+'/'+key+'/'+name)));}
      wrap.append(line);
    });
    const add=button(editor.addLabel??'Add',()=>{const row=editor.kind==='array'?copy(editor.item.default):editor.next?.(rows as Properties[])??Object.fromEntries(Object.entries(editor.item).map(([k,f])=>[k,copy(f.default)])),key='row-'+(++state.next);update([...rows,row],[...state.keys,key],key);});add.disabled=editor.kind==='array'&&rows.length>=(editor.maxItems??Infinity);wrap.append(add);
    return wrap;
  }
  function fieldInput(field: Field, value: Value, apply: (v: Value) => void,identity=selectionScope()+'/'+field.label): HTMLElement {
    const kind = field.kind as string;
    if (field.editor) return structuredInput(field.editor, value, apply,identity);
    if (kind === 'select') return select((field.options ?? []).map(v => ({ value: String(v), label: String(v) })), String(value), v => { const actual = field.options?.find(x => String(x) === v); if (actual !== undefined) apply(actual); });
    if (kind === 'number') {
      const input = numberInput(value as number, apply, field.min, String(field.step ?? 'any'));
      if (field.max !== undefined) input.max = String(field.max);
      // For continuous quantities, step is a scrub increment, not a second source validator.
      // Converted units and sampled animation may legitimately lie between those increments.
      if (field.semantics && ['length','position','speed','duration','angle','frequency','factor','ratio','time-of-day'].includes(field.semantics.quantity)) {
        if (field.step !== undefined) input.dataset.scrubStep = String(field.step);
        input.step = 'any';
      }
      return input;
    }
    if (kind === 'boolean') { const input = element('input'); input.type = 'checkbox'; input.checked = value as boolean; input.onchange = () => apply(input.checked); return input; }
    if (kind === 'color') { const input = element('input'); input.type = 'color'; input.value = /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#808080'; input.onchange = () => apply(input.value); return input; }
    if (kind === 'json') { const wrap = element('div'), input = element('textarea'); input.value = JSON.stringify(value, null, 2); input.setAttribute('aria-label', field.label); wrap.append(input, button('Apply JSON field', () => { try { apply(JSON.parse(input.value) as Value); } catch (e) { notice(message(e), true); } })); return wrap; }
    const input = element('input'); input.type = 'text'; input.value = String(value); input.onchange = () => apply(input.value); return input;
  }
  return{numberInput,fieldInput};
}
