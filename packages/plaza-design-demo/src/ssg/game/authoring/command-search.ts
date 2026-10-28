import {element,button} from './controls';
/** One searchable entry: an object to select, a command to run, a setting to open or a library piece to add. */
export interface SearchEntry { group: 'Objects' | 'Commands' | 'Settings' | 'Library'; label: string; where?: string; keys?: string; run(): void }
const GROUPS: SearchEntry['group'][] = ['Objects', 'Commands', 'Settings', 'Library'];
const PER_GROUP = 6;
/** Ctrl K search over entries collected when it opens. Running an entry closes the search; nothing here owns editor state. */
export function mountCommandSearch(host: HTMLElement, collect: () => SearchEntry[]) {
  const backdrop = element('div', 'command-search'), dialog = element('div', 'command-dialog'), input = element('input'), results = element('div', 'command-results'), foot = element('div', 'command-foot', '↑↓ move · ↵ run · Esc close');
  backdrop.hidden = true; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-label', 'Search objects, commands, settings and library'); input.type = 'search'; input.placeholder = 'Search objects, commands, settings, library…'; input.setAttribute('aria-label', 'Search');
  results.setAttribute('role', 'listbox'); dialog.append(input, results, foot); backdrop.append(dialog); host.append(backdrop);
  let entries: SearchEntry[] = [], shown: SearchEntry[] = [], active = 0;
  const matches = (entry: SearchEntry, words: string[]) => { const text = `${entry.label} ${entry.where ?? ''} ${entry.group}`.toLowerCase(); return words.every(word => text.includes(word)); };
  const render = () => {
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean); results.replaceChildren(); shown = [];
    for (const group of GROUPS) {
      const found = entries.filter(entry => entry.group === group && matches(entry, words)).slice(0, PER_GROUP); if (!found.length) continue;
      results.append(element('div', 'command-group', group));
      for (const entry of found) {
        const index = shown.length, row = button('', () => run(entry)); row.className = 'command-row'; row.setAttribute('role', 'option'); row.setAttribute('aria-selected', String(index === active));
        row.append(element('span', 'command-label', entry.label)); if (entry.where) row.append(element('span', 'command-where', entry.where)); if (entry.keys) row.append(element('kbd', '', entry.keys));
        row.onmouseenter = () => { active = index; mark(); }; results.append(row); shown.push(entry);
      }
    }
    if (!shown.length) results.append(element('div', 'command-empty', 'Nothing matches.'));
    active = Math.min(active, Math.max(0, shown.length - 1)); mark();
  };
  const mark = () => { results.querySelectorAll('.command-row').forEach((row, index) => { row.setAttribute('aria-selected', String(index === active)); if (index === active) row.scrollIntoView({ block: 'nearest' }); }); };
  // Focus goes back where it was, so scene shortcuts work again after a search.
  let returnFocus: HTMLElement | null = null;
  const close = () => { backdrop.hidden = true; input.value = ''; input.blur(); if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); returnFocus = null; };
  const run = (entry: SearchEntry) => { close(); entry.run(); };
  input.oninput = () => { active = 0; render(); };
  input.onkeydown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); active = (active + (event.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(1, shown.length); mark(); }
    else if (event.key === 'Enter') { event.preventDefault(); const entry = shown[active]; if (entry) run(entry); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  };
  backdrop.onpointerdown = event => { if (event.target === backdrop) close(); };
  return {
    open() { if (backdrop.hidden) returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null; entries = collect(); active = 0; backdrop.hidden = false; render(); input.focus(); },
    close,
    get open_() { return !backdrop.hidden; },
    dispose() { backdrop.remove(); },
  };
}
