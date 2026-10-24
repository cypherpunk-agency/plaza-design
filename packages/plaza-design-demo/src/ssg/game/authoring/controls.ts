import type {Field,Value,Properties} from '../art/core/composition';
const copy=<T>(value:T):T=>structuredClone(value);
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
export const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
export const button = (text: string, action: () => void, title?: string) => { const node = element('button', '', text); node.type = 'button'; node.onclick = action; if (title) node.title = title; return node; };
export const select = (values: { value: string; label: string }[], value: string, onChange: (v: string) => void) => { const node = element('select'); for (const item of values) { const option = element('option', '', item.label); option.value = item.value; node.append(option); } node.value = value; node.onchange = () => onChange(node.value); return node; };
export const label = (text: string, control: HTMLElement) => { const node = element('label'); node.append(element('span', '', text), control); return node; };

export function createFieldControls(notice:(message:string,error?:boolean)=>void){
  function numberInput(value: number, apply: (n: number) => void, min?: number, step = 'any') { const input = element('input'); input.type = 'number'; input.step = step; if (min !== undefined) input.min = String(min); input.value = String(value); input.onchange = () => { const number = Number(input.value); if (!Number.isFinite(number) || min !== undefined && number < min) { notice('Enter a finite number within the field range.', true); return; } apply(number); }; return input; }
  /** Structured JSON fields with an inspector editor: rows of small fields, or a set of checkboxes. */
  function structuredInput(editor: NonNullable<Field["editor"]>, value: Value, apply: (v: Value) => void): HTMLElement {
    const wrap = element('div', 'structured-field'), auto = value === 'auto';
    if (editor.kind === 'colour') {
      const box = element('input'), pick = element('input'), own = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); box.type = 'checkbox'; box.checked = !own; pick.type = 'color'; pick.value = own ? value as string : '#808080'; pick.disabled = !own;
      box.onchange = () => apply(box.checked ? '' : pick.value); pick.onchange = () => apply(pick.value); wrap.append(label(editor.empty, box), pick); return wrap;
    }
    if (editor.auto) { const box = element('input'); box.type = 'checkbox'; box.checked = auto; box.onchange = () => apply(box.checked ? 'auto' : editor.kind === 'set' ? [] : []); wrap.append(label(editor.auto, box)); }
    if (auto) return wrap;
    if (editor.kind === 'set') {
      const chosen = new Set(Array.isArray(value) ? value.map(String) : []);
      for (const option of editor.options) { const box = element('input'); box.type = 'checkbox'; box.checked = chosen.has(option); box.onchange = () => apply(editor.options.filter(o => o === option ? box.checked : chosen.has(o))); wrap.append(label(option, box)); }
      return wrap;
    }
    const rows = (Array.isArray(value) ? value : []) as Properties[];
    rows.forEach((row, i) => {
      const line = element('div', 'structured-row');
      for (const [key, sub] of Object.entries(editor.item)) line.append(label(sub.label + (sub.unit ? ` (${sub.unit})` : ''), fieldInput(sub, row[key] ?? sub.default, v => apply(rows.map((r, j) => j === i ? { ...r, [key]: v } : r)))));
      line.append(button('Remove', () => apply(rows.filter((_, j) => j !== i)), 'Remove this row'));
      wrap.append(line);
    });
    wrap.append(button(editor.addLabel ?? 'Add', () => apply([...rows, editor.next?.(rows) ?? Object.fromEntries(Object.entries(editor.item).map(([k, f]) => [k, copy(f.default) as Value]))])));
    return wrap;
  }
  function fieldInput(field: Field, value: Value, apply: (v: Value) => void): HTMLElement {
    const kind = field.kind as string;
    if (field.editor) return structuredInput(field.editor, value, apply);
    if (kind === 'select') return select((field.options ?? []).map(v => ({ value: String(v), label: String(v) })), String(value), v => { const actual = field.options?.find(x => String(x) === v); if (actual !== undefined) apply(actual); });
    if (kind === 'number') { const input = numberInput(value as number, apply, field.min, String(field.step ?? 'any')); if (field.max !== undefined) input.max = String(field.max); return input; }
    if (kind === 'boolean') { const input = element('input'); input.type = 'checkbox'; input.checked = value as boolean; input.onchange = () => apply(input.checked); return input; }
    if (kind === 'color') { const input = element('input'); input.type = 'color'; input.value = /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#808080'; input.onchange = () => apply(input.value); return input; }
    if (kind === 'json') { const wrap = element('div'), input = element('textarea'); input.value = JSON.stringify(value, null, 2); input.setAttribute('aria-label', field.label); wrap.append(input, button('Apply JSON field', () => { try { apply(JSON.parse(input.value) as Value); } catch (e) { notice(message(e), true); } })); return wrap; }
    const input = element('input'); input.type = 'text'; input.value = String(value); input.onchange = () => apply(input.value); return input;
  }
  return{numberInput,fieldInput};
}
