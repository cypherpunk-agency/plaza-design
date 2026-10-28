/**
 * The editor's one screen frame, shared with the Scene editor's layout: a navigator on the left, the stage in the
 * middle and an inspector on the right. Columns follow the same resizable widths (--left-w / --right-w) as the
 * Scene outline and inspector. Workbenches put their pieces into the regions; empty regions collapse.
 */
export interface Frame { root: HTMLElement; nav: HTMLElement; stage: HTMLElement; inspector: HTMLElement }
export interface FrameParts { nav?: (Node | string)[]; stage?: (Node | string)[]; inspector?: (Node | string)[] }

export function createFrame(host: HTMLElement, parts: FrameParts = {}, label = 'Panel'): Frame {
  const region = (tag: 'nav' | 'main' | 'aside', className: string, name: string) => { const node = document.createElement(tag); node.className = className; node.setAttribute('aria-label', name); return node; };
  const root = document.createElement('div'), nav = region('nav', 'frame-nav', `${label} navigation`), stage = region('main', 'frame-stage', label), inspector = region('aside', 'frame-inspector', `${label} settings`);
  root.className = 'frame'; nav.append(...(parts.nav ?? [])); stage.append(...(parts.stage ?? [])); inspector.append(...(parts.inspector ?? []));
  root.append(nav, stage, inspector); host.replaceChildren(root); host.classList.add('framed');
  const sync = () => { root.classList.toggle('no-nav', !nav.childNodes.length); root.classList.toggle('no-inspector', !inspector.childNodes.length); };
  sync(); for (const r of [nav, inspector]) new MutationObserver(sync).observe(r, { childList: true });
  return { root, nav, stage, inspector };
}

/** Panels the editor frames itself ask modules to lay out into a frame (see `framed`). */
export const framed = (host: HTMLElement) => host.dataset.layout === 'frame';

const remembered = new Map<string, string>();
/**
 * A navigator for form-style panels: their top-level sections (`details`) become the left list and the stage shows
 * one section at a time, instead of one long column. Forms re-render on edits, so the list follows the content.
 */
export function sectionNavigator(nav: HTMLElement, content: HTMLElement, key: string): () => void {
  const list = document.createElement('ul'); list.className = 'frame-sections'; nav.replaceChildren(list);
  const sections = () => [...content.querySelectorAll('details')].filter(d => { const outer = d.parentElement?.closest('details'); return (!outer || !content.contains(outer)) && !!d.querySelector(':scope > summary'); });
  const titleOf = (d: HTMLDetailsElement) => d.querySelector(':scope > summary')!.textContent!.trim();
  let pending = false, stopped = false;
  const render = () => {
    pending = false; if (stopped) return; const all = sections(), current = remembered.get(key);
    const chosen = all.find(d => titleOf(d) === current) ?? (current === '' ? undefined : all[0]);
    content.classList.toggle('one-section', !!chosen);
    for (const d of all) { const on = d === chosen; d.classList.add('frame-section'); d.classList.toggle('frame-current', on); if (on && !d.open) d.open = true; }
    const item = (text: string, pressed: boolean, choose: () => void, title?: string) => { const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.setAttribute('aria-pressed', String(pressed)); if (title) b.title = title; b.onclick = choose; li.append(b); return li; };
    list.replaceChildren(item('Everything', !chosen, () => { remembered.set(key, ''); render(); }, 'Show every section in one list'), ...all.map(d => item(titleOf(d), d === chosen, () => { remembered.set(key, titleOf(d)); render(); content.scrollTop = 0; })));
    if (!all.length) list.replaceChildren();
  };
  // Coalesce a re-render's many mutations into one update, right after it (not on the next frame, which hidden pages skip).
  const observer = new MutationObserver(() => { if (!pending) { pending = true; queueMicrotask(render); } });
  observer.observe(content, { childList: true, subtree: true }); render();
  return () => { stopped = true; observer.disconnect(); content.classList.remove('one-section'); };
}

export const frameStyles = `.scene-composer .tool-panel>section.framed,.scene-composer .tool-panel>div.framed{padding:0;height:100%}
.scene-composer .tool-panel[open]:has(>.framed){overflow:hidden;display:flex;flex-direction:column}
.scene-composer .tool-panel[open]:has(>.framed)::details-content{display:contents}
.scene-composer .tool-panel>.framed{flex:1;min-height:0}
.scene-composer .frame{display:grid;grid-template-columns:var(--left-w,240px) minmax(0,1fr) var(--right-w,340px);height:100%;min-height:0}
.scene-composer .frame.no-nav{grid-template-columns:minmax(0,1fr) var(--right-w,340px)}.scene-composer .frame.no-nav>.frame-nav{display:none}
.scene-composer .frame.no-inspector{grid-template-columns:var(--left-w,240px) minmax(0,1fr)}.scene-composer .frame.no-inspector>.frame-inspector{display:none}
.scene-composer .frame.no-nav.no-inspector{grid-template-columns:minmax(0,1fr)}
.scene-composer .frame>.frame-nav,.scene-composer .frame>.frame-inspector{min-height:0;overflow:auto;padding:10px 12px;background:var(--panel)}
.scene-composer .frame>.frame-nav{border-right:1px solid var(--separator)}.scene-composer .frame>.frame-inspector{border-left:1px solid var(--separator)}
.scene-composer .frame>.frame-stage{min-width:0;min-height:0;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.scene-composer .frame-stage canvas{max-width:100%;height:auto;align-self:center;background:var(--stage);border:1px solid var(--separator)}
.scene-composer .frame-nav h2,.scene-composer .frame-inspector h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 8px}
.scene-composer .frame-inspector label{display:flex;flex-direction:column;align-items:stretch;gap:3px;margin:0 0 8px!important}
.scene-composer .frame-inspector label>input:not([type=checkbox]),.scene-composer .frame-inspector label>select{width:100%!important;min-width:0!important}
.scene-composer .frame-inspector label:has(>input[type=checkbox]){flex-direction:row;align-items:center}
.scene-composer .frame-nav>div,.scene-composer .frame-nav>select{margin-bottom:8px}.scene-composer .frame-nav select{width:100%}
.scene-composer .frame-nav .segmented,.scene-composer .frame-nav>div:has(>button[data-mode]){display:flex;flex-wrap:wrap;gap:4px}
.scene-composer .frame-sections{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
.scene-composer .frame-sections button{display:block;width:100%;text-align:left;margin:0;border:0;border-left:2px solid transparent;border-radius:0;background:none;padding:5px 8px;font:12px/1.4 system-ui,sans-serif;color:var(--ink);white-space:normal}
.scene-composer .frame-sections button:hover{background:var(--raised)}
.scene-composer .frame-sections button[aria-pressed=true]{border-left-color:var(--select);background:var(--raised);color:var(--select)}
.scene-composer .one-section .frame-section:not(.frame-current){display:none}
.scene-composer .one-section details.frame-current>summary{font-size:14px;color:var(--ink)}
@media(max-width:760px){.scene-composer .frame,.scene-composer .frame.no-nav,.scene-composer .frame.no-inspector{grid-template-columns:1fr;height:auto}.scene-composer .frame>.frame-nav,.scene-composer .frame>.frame-inspector{border:0;border-bottom:1px solid var(--separator)}}
`;
