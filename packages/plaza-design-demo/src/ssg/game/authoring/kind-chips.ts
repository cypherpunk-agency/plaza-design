/** A labelled block of single-choice filter chips ("All" plus one per option), shared by the artwork filters. */
export interface ChipOption { value: string; label: string; title?: string; count?: number }
export function filterChips(heading: string, options: readonly ChipOption[], value: string, choose: (value: string) => void, all: string | null = 'All'): HTMLElement {
  const block = document.createElement('div'), title = document.createElement('div'), row = document.createElement('div');
  block.className = 'filter-chips'; title.className = 'filter-chips-title'; title.textContent = heading; row.className = 'chips';
  row.setAttribute('role', 'group'); row.setAttribute('aria-label', heading);
  const chips: HTMLButtonElement[] = [];
  const mark = (current: string) => chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.value === current)));
  for (const option of [...(all === null ? [] : [{ value: '', label: all }]), ...options]) {
    const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'kind-chip'; chip.dataset.value = option.value;
    chip.textContent = option.label; if (option.count !== undefined) { const n = document.createElement('span'); n.className = 'chip-count'; n.textContent = String(option.count); chip.append(n); }
    if (option.title) chip.title = option.title;
    // Clicking the active chip clears it (back to All).
    chip.onclick = () => { const next = chip.getAttribute('aria-pressed') === 'true' && option.value ? '' : option.value; mark(next); choose(next); };
    chips.push(chip); row.append(chip);
  }
  mark(value); block.append(title, row); return block;
}
export const chipStyles = '.scene-composer .filter-chips{margin:6px 0}.scene-composer .filter-chips-title{font:600 10px/1.6 var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:3px}.scene-composer .chips{display:flex;flex-wrap:wrap;gap:4px}.scene-composer .kind-chip{margin:0;padding:2px 9px;min-height:24px;border:1px solid var(--line);border-radius:999px;background:none;color:var(--ink);font:12px/1.4 system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:5px}.scene-composer .kind-chip:hover{border-color:var(--line-strong);background:var(--raised)}.scene-composer .kind-chip[aria-pressed=true]{border-color:var(--accent);background:var(--accent);color:var(--accent-ink)}.scene-composer .chip-count{font:10px/1 var(--mono);opacity:.7}.scene-composer .add-picker .filter-chips{margin:0 0 8px}';
