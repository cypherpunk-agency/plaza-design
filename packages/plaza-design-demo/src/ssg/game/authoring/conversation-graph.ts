/**
 * Logic workspace · conversation graph. Cards on a canvas for one named conversation graph,
 * joined by its entry routes, choices, redirects and fallbacks. Edits use the same gameplay
 * source and validator as the conversation library; card positions are browser preferences.
 */
import { element, button } from './controls';
import { TypedForm } from './typed-form';
import { renderConversationStructure } from './conversation-structure-authoring';
import {
  conversationSources,
  conversationSourceOptions,
  conversationSourceLabel,
  conversationUsages,
  type ConversationSelection,
} from './conversation-library';
import {
  conversationGraph,
  freshNodeId,
  freshChoiceId,
  ENTRY,
  CARD_WIDTH,
  type GraphCard,
  type GraphPort,
} from './conversation-graph-model';
import { describeCondition, describeCommand } from './rule-model';
import { gameplayScene } from './gameplay-scenes';
import { nativeGameplayScene } from './native-gameplay-scenes';
import { withSharedState, sourceGameplay } from '../engine/gameplay/shared-state';
import { validateGameplay } from '../engine/gameplay/validation';
import { GameplaySession } from '../engine/gameplay/session';
import { ConversationSession } from '../engine/gameplay/conversation';
import type {
  GameplayDefinition,
  GameplayState,
  ConversationDefinition,
} from '../engine/gameplay/types';
import type { WorkbenchContext, WorkbenchHandle } from './contracts';

const SHARED = ['companion-gameplay', 'bot-gameplay', 'critter-gameplay'];
const pages = (v: string) =>
  v
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
type Pick = { card: string; port?: string };
const storageKey = (source: string, graph: string) =>
  'plaza.conversation-graph.' + source + '.' + graph;
function readPositions(source: string, graph: string): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(storageKey(source, graph));
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}
function writePositions(
  source: string,
  graph: string,
  value: Record<string, { x: number; y: number }>,
) {
  try {
    if (Object.keys(value).length)
      localStorage.setItem(storageKey(source, graph), JSON.stringify(value));
    else localStorage.removeItem(storageKey(source, graph));
  } catch {
    /* View preference only; the graph still lays itself out. */
  }
}

export function mountConversationGraph(
  host: HTMLElement,
  context: WorkbenchContext,
  selection: ConversationSelection,
  publicEditor = false,
): WorkbenchHandle {
  const root = element('div', 'conversation-graph'),
    list = element('nav', 'graph-list'),
    centre = element('section', 'graph-centre'),
    toolbar = element('div', 'graph-toolbar'),
    viewport = element('div', 'graph-viewport'),
    plane = element('div', 'graph-plane'),
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    overlay = element('div', 'graph-overlay'),
    inspector = element('aside', 'graph-inspector'),
    error = element('p', 'error');
  error.setAttribute('role', 'alert');
  list.setAttribute('aria-label', 'Conversations');
  inspector.setAttribute('aria-label', 'Conversation inspector');
  svg.classList.add('graph-links');
  plane.append(svg);
  viewport.append(plane, overlay);
  centre.append(toolbar, viewport);
  root.append(list, centre, inspector);
  host.replaceChildren(root);
  let pick: Pick = { card: ENTRY },
    filter = '',
    newName = '',
    zoom = 1,
    pan = { x: 24, y: 24 },
    disposed = false,
    tryRun: { session: ConversationSession; gameplay: GameplaySession; log: string[] } | undefined;
  const sectionOpen = new Map<string, boolean>(),
    draft: Record<string, string> = {};
  const report = (e: unknown) => (error.textContent = e instanceof Error ? e.message : String(e));

  const chunkSource = () => {
    if (!context.scene) return undefined;
    try {
      return (nativeGameplayScene(context.scene) ?? gameplayScene(context.scene, context.documents))
        .gameplayId;
    } catch {
      return undefined;
    }
  };
  const options = () => conversationSourceOptions(context, selection.document, publicEditor);
  const definition = (): GameplayDefinition => {
    const o = options();
    return withSharedState(o.sharedStateSource?.(), () =>
      (o.validate ?? validateGameplay)(o.document()),
    );
  };
  const edit = (label: string, change: (doc: GameplayDefinition) => void) => {
    const o = options();
    const valid = withSharedState(o.sharedStateSource?.(), () => {
      const doc = (o.validate ?? validateGameplay)(o.document());
      change(doc);
      return (o.validate ?? validateGameplay)(doc);
    });
    error.textContent = '';
    o.onEdit(sourceGameplay(valid), label);
  };
  const run = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      report(e);
    }
    render();
  };
  const graphOf = (d: GameplayDefinition) => d.conversations[selection.conversation];

  function chooseDefaults() {
    const sources = conversationSources(context.documents);
    const local = chunkSource();
    if (!sources.some((d) => d.id === selection.document))
      selection.document =
        (local && sources.some((d) => d.id === local) ? local : undefined) ??
        sources.find((d) => d.id === 'companion-gameplay')?.id ??
        sources[0]?.id ??
        '';
    const value = sources.find((d) => d.id === selection.document)?.value as
      GameplayDefinition | undefined;
    if (value && !value.conversations[selection.conversation]) {
      selection.conversation = Object.keys(value.conversations)[0] ?? '';
      pick = { card: ENTRY };
    }
  }

  function render() {
    if (disposed) return;
    chooseDefaults();
    renderList();
    let doc: GameplayDefinition;
    try {
      doc = definition();
    } catch (e) {
      toolbar.replaceChildren();
      plane.replaceChildren(svg);
      inspector.replaceChildren(element('p', 'error', 'Conversation unavailable: ' + String(e)));
      return;
    }
    const def = graphOf(doc);
    if (!def) {
      toolbar.replaceChildren();
      plane.replaceChildren(svg);
      inspector.replaceChildren(element('p', 'muted', 'Choose a conversation.'));
      return;
    }
    if (pick.card !== ENTRY && !def.nodes[pick.card]) pick = { card: ENTRY };
    renderToolbar(doc, def);
    renderCanvas(doc, def);
    renderInspector(doc, def);
    renderTry();
  }

  function renderList() {
    list.replaceChildren();
    const search = element('input', 'graph-filter');
    search.type = 'search';
    search.placeholder = 'Filter conversations';
    search.value = filter;
    search.setAttribute('aria-label', 'Filter conversations');
    search.oninput = () => {
      filter = search.value;
      renderList();
      list.querySelector<HTMLInputElement>('.graph-filter')?.focus();
    };
    list.append(search);
    const sources = conversationSources(context.documents),
      local = chunkSource(),
      groups: { title: string; ids: string[] }[] = [];
    if (local && sources.some((d) => d.id === local))
      groups.push({ title: 'This chunk', ids: [local] });
    groups.push({ title: 'Shared', ids: SHARED.filter((id) => sources.some((d) => d.id === id)) });
    if (filter.trim())
      groups.push({
        title: 'Other chunks',
        ids: sources.map((d) => d.id).filter((id) => id !== local && !SHARED.includes(id)),
      });
    const needle = filter.trim().toLowerCase();
    for (const group of groups) {
      const rows: HTMLElement[] = [];
      for (const id of group.ids) {
        const value = sources.find((d) => d.id === id)!.value as GameplayDefinition;
        for (const graph of Object.keys(value.conversations)) {
          if (needle && !graph.toLowerCase().includes(needle)) continue;
          const uses = conversationUsages(context.documents, id, graph).length;
          const row = button('', () => {
            selection.document = id;
            selection.conversation = graph;
            pick = { card: ENTRY };
            tryRun = undefined;
            render();
          });
          row.className = 'rule-row';
          row.setAttribute(
            'aria-pressed',
            String(id === selection.document && graph === selection.conversation),
          );
          row.append(element('span', 'rule-row-label', graph));
          row.append(
            element(
              'small',
              '',
              (group.title === 'This chunk' ? '' : conversationSourceLabel(id) + ' · ') +
                uses +
                (uses === 1 ? ' use' : ' uses'),
            ),
          );
          rows.push(row);
        }
      }
      list.append(element('h3', 'rule-group', group.title + ' · ' + rows.length));
      if (rows.length) list.append(...rows);
      else list.append(element('p', 'rule-empty', 'none'));
    }
    if (local) {
      const add = element('div', 'graph-new');
      const name = element('input');
      name.placeholder = 'new.conversation.id';
      name.value = newName;
      name.setAttribute('aria-label', 'New conversation ID');
      name.oninput = () => (newName = name.value);
      const create = button('＋ New conversation', () =>
        run(() => {
          const id = newName.trim();
          if (!/^[-a-zA-Z0-9_.]{1,128}$/.test(id))
            throw Error('Use letters, digits, dots, dashes or underscores for the ID');
          selection.document = local;
          edit('Add conversation', (d) => {
            if (d.conversations[id]) throw Error('A conversation named ' + id + ' already exists');
            d.conversations[id] = {
              entry: [{ node: 'start' }],
              nodes: { start: { speaker: 'SPEAKER', pages: ['New conversation.'] } },
            };
          });
          selection.conversation = id;
          newName = '';
          pick = { card: 'start' };
        }),
      );
      add.append(name, create);
      list.append(add);
    }
  }

  function renderToolbar(doc: GameplayDefinition, def: ConversationDefinition) {
    toolbar.replaceChildren();
    const uses = conversationUsages(context.documents, selection.document, selection.conversation);
    const crumb = element('span', 'graph-crumb');
    crumb.append(
      element('span', 'muted', conversationSourceLabel(selection.document) + ' › '),
      element('strong', '', selection.conversation),
      element('span', 'muted', ' · ' + uses.length + (uses.length === 1 ? ' use' : ' uses')),
    );
    toolbar.append(crumb);
    const node = pick.card !== ENTRY ? def.nodes[pick.card] : undefined;
    const addPage = button(
      '＋ Page',
      () =>
        run(() => {
          const id = freshNodeId(def);
          edit('Add dialogue node', (d) => {
            const g = graphOf(d);
            g.nodes[id] = {
              speaker: node?.speaker ?? Object.values(g.nodes)[0]?.speaker ?? 'SPEAKER',
              pages: ['New line.'],
            };
            // A page added from a choice becomes where that choice leads.
            if (pick.port?.startsWith('choice:')) {
              const c = g.nodes[pick.card].choices!.find((c) => 'choice:' + c.id === pick.port)!;
              c.next = id;
            }
          });
          pick = { card: id };
        }),
      'Add a page; with a choice selected, the choice leads to it',
    );
    const addChoice = button(
      '＋ Choice',
      () =>
        run(() => {
          edit('Add dialogue choice', (d) => {
            const n = graphOf(d).nodes[pick.card];
            const id = freshChoiceId(n);
            (n.choices ??= []).push({ id, label: 'New choice', next: pick.card });
            pick = { card: pick.card, port: 'choice:' + id };
          });
        }),
      'Add a choice to the selected page',
    );
    addChoice.disabled = !node || (node.choices?.length ?? 0) >= 8;
    const addCondition = button(
      '＋ Condition',
      () =>
        run(() => {
          const leaf = doc.flags.length ? { flag: doc.flags[0] } : { tokensAtLeast: 0 };
          if (pick.port?.startsWith('choice:'))
            edit('Change choice condition', (d) => {
              const c = graphOf(d).nodes[pick.card].choices!.find(
                (c) => 'choice:' + c.id === pick.port,
              )!;
              c.when = c.when
                ? 'all' in c.when
                  ? { all: [...c.when.all, leaf] }
                  : { all: [c.when, leaf] }
                : leaf;
            });
          else if (node)
            edit('Add conversation redirect', (d) => {
              const n = graphOf(d).nodes[pick.card];
              (n.redirect ??= []).push({
                when: leaf,
                node: Object.keys(graphOf(d).nodes).find((k) => k !== pick.card)!,
              });
              pick = { card: pick.card, port: 'redirect:' + (n.redirect.length - 1) };
            });
          else
            edit('Add conversation entry route', (d) => {
              const rows = graphOf(d).entry;
              rows.splice(rows.length - 1, 0, { when: leaf, node: rows[rows.length - 1].node });
              pick = { card: ENTRY, port: 'entry:' + (rows.length - 2) };
            });
        }),
      'Add a condition to the selected choice, a conditional jump to the selected page, or a conditional start',
    );
    addCondition.disabled =
      !!node && !pick.port?.startsWith('choice:') && Object.keys(def.nodes).length < 2;
    const tryButton = button(
      tryRun ? '■ Stop trying' : '▶ Try conversation',
      () => {
        if (tryRun) tryRun = undefined;
        else startTry();
        render();
      },
      'Run this pending graph from default state; nothing is saved',
    );
    tryButton.className = 'primary';
    const frame = button('Frame all', () => {
      frameAll();
    });
    const tidy = button(
      'Tidy',
      () => {
        writePositions(selection.document, selection.conversation, {});
        render();
        frameAll();
      },
      'Forget dragged positions and lay the graph out again',
    );
    const zoomOut = button('−', () => setZoom(zoom / 1.25), 'Zoom out'),
      zoomIn = button('＋', () => setZoom(zoom * 1.25), 'Zoom in');
    zoomOut.setAttribute('aria-label', 'Zoom out');
    zoomIn.setAttribute('aria-label', 'Zoom in');
    for (const b of [addPage, addChoice, addCondition]) b.classList.add('quiet');
    toolbar.append(
      addPage,
      addChoice,
      addCondition,
      element('span', 'grow'),
      zoomOut,
      element('span', 'graph-zoom', Math.round(zoom * 100) + '%'),
      zoomIn,
      frame,
      tidy,
      tryButton,
    );
  }
  const setZoom = (z: number) => {
    zoom = Math.min(2, Math.max(0.3, z));
    applyTransform();
    const label = toolbar.querySelector('.graph-zoom');
    if (label) label.textContent = Math.round(zoom * 100) + '%';
  };
  const applyTransform = () =>
    (plane.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`);
  function frameAll() {
    const cards = [...plane.querySelectorAll<HTMLElement>('.graph-card')];
    if (!cards.length) return;
    let maxX = 0,
      maxY = 0;
    for (const c of cards) {
      maxX = Math.max(maxX, c.offsetLeft + c.offsetWidth);
      maxY = Math.max(maxY, c.offsetTop + c.offsetHeight);
    }
    const w = viewport.clientWidth - 48,
      h = viewport.clientHeight - 48;
    zoom = Math.min(1, Math.max(0.3, Math.min(w / maxX, h / maxY)));
    pan = { x: 24, y: 24 };
    applyTransform();
    const label = toolbar.querySelector('.graph-zoom');
    if (label) label.textContent = Math.round(zoom * 100) + '%';
  }

  function renderCanvas(doc: GameplayDefinition, def: ConversationDefinition) {
    const graph = conversationGraph(def),
      saved = readPositions(selection.document, selection.conversation);
    plane.replaceChildren(svg);
    const elements = new Map<string, HTMLElement>();
    for (const card of graph.cards) {
      const el = cardElement(doc, card);
      plane.append(el);
      elements.set(card.id, el);
    }
    // Lay out columns from measured card heights; a column taller than the view wraps into
    // sub-columns so hub conversations (many entry routes) stay readable. Dragged positions win.
    const limit = Math.max(480, viewport.clientHeight * 1.4 || 720),
      gapX = 80,
      columns = [...new Set(graph.cards.map((c) => c.column))].sort((a, b) => a - b);
    let x = 0;
    for (const column of columns) {
      let y = 0,
        sub = 0;
      for (const card of graph.cards.filter((c) => c.column === column)) {
        const el = elements.get(card.id)!;
        if (y > 0 && y + el.offsetHeight > limit) {
          sub++;
          y = 0;
        }
        const at = saved[card.id] ?? { x: x + sub * (CARD_WIDTH + 24), y };
        y += el.offsetHeight + 20;
        el.style.left = at.x + 'px';
        el.style.top = at.y + 'px';
      }
      x += (sub + 1) * (CARD_WIDTH + 24) - 24 + gapX;
    }
    applyTransform();
    drawLinks(graph, elements);
    if (graph.unreachable.length)
      overlay.replaceChildren(
        element('span', 'graph-note', '! Not reachable: ' + graph.unreachable.join(', ')),
      );
    else overlay.replaceChildren();
  }
  function drawLinks(
    graph: ReturnType<typeof conversationGraph>,
    elements: Map<string, HTMLElement>,
  ) {
    let w = 0,
      h = 0;
    for (const el of elements.values()) {
      w = Math.max(w, el.offsetLeft + el.offsetWidth + 80);
      h = Math.max(h, el.offsetTop + el.offsetHeight + 80);
    }
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.replaceChildren();
    for (const link of graph.links) {
      const from = elements.get(link.from),
        to = elements.get(link.to);
      if (!from || !to) continue;
      const port = from.querySelector<HTMLElement>(`[data-port="${CSS.escape(link.port)}"]`);
      const x1 = from.offsetLeft + from.offsetWidth,
        y1 = from.offsetTop + (port ? port.offsetTop + port.offsetHeight / 2 : 20),
        x2 = to.offsetLeft,
        y2 = to.offsetTop + 18;
      const back = x2 <= x1;
      const d = back
        ? `M${x1} ${y1} C${x1 + 60} ${y1}, ${x1 + 60} ${Math.max(y1, y2) + 60}, ${(x1 + x2) / 2} ${Math.max(y1, y2) + 60} S${x2 - 60} ${y2}, ${x2} ${y2}`
        : `M${x1} ${y1} C${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute(
        'class',
        'graph-link ' +
          link.kind +
          (pick.card === link.from && pick.port === link.port ? ' selected' : ''),
      );
      svg.append(path);
    }
  }
  function cardElement(doc: GameplayDefinition, card: GraphCard) {
    const el = element('div', 'graph-card ' + card.kind + (card.reachable ? '' : ' unreachable'));
    el.dataset.card = card.id;
    el.setAttribute('aria-selected', String(pick.card === card.id && !pick.port));
    el.style.width = CARD_WIDTH + 'px';
    const head = element('div', 'graph-card-head');
    head.append(
      element(
        'span',
        'graph-kind',
        card.kind === 'entry' ? 'start' : card.kind === 'input' ? 'text input' : card.kind,
      ),
    );
    if (card.node) head.append(element('span', 'graph-id', card.id));
    if (card.node) head.append(element('span', 'graph-speaker', card.node.speaker));
    el.append(head);
    if (card.node) {
      const text = element('p', 'graph-line', card.node.pages[0] ?? '');
      el.append(text);
      if (card.node.pages.length > 1)
        el.append(
          element(
            'small',
            'graph-more',
            '+' +
              (card.node.pages.length - 1) +
              ' more page' +
              (card.node.pages.length > 2 ? 's' : ''),
          ),
        );
      if (card.node.onEnter) {
        const chips = element('div', 'graph-chips');
        chips.append(element('span', 'graph-chip command', card.node.onEnter));
        el.append(chips);
      }
    }
    for (const port of card.ports) el.append(portElement(doc, card, port));
    el.onclick = (event) => {
      if ((event.target as HTMLElement).closest('[data-port]')) return;
      pick = { card: card.id };
      render();
    };
    dragCard(el, card.id);
    return el;
  }
  function portElement(doc: GameplayDefinition, card: GraphCard, port: GraphPort) {
    const row = element('div', 'graph-port ' + port.kind);
    row.dataset.port = port.id;
    row.setAttribute('aria-selected', String(pick.card === card.id && pick.port === port.id));
    if (port.when)
      row.append(element('span', 'graph-chip condition', 'if ' + describeCondition(port.when)));
    row.append(element('span', 'graph-port-label', port.label));
    if (port.command) {
      const chip = element('span', 'graph-chip command', port.command);
      chip.title = describeCommand(doc, port.command);
      row.append(chip);
    }
    row.append(element('span', 'graph-port-dot'));
    row.onclick = (event) => {
      event.stopPropagation();
      pick = { card: card.id, port: port.id };
      render();
    };
    return row;
  }
  /** Drag moves a card and remembers the spot in this browser; a click without movement selects. */
  function dragCard(el: HTMLElement, id: string) {
    el.onpointerdown = (event) => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('[data-port]')) return;
      const start = { x: event.clientX, y: event.clientY, left: el.offsetLeft, top: el.offsetTop };
      let moved = false;
      const move = (e: PointerEvent) => {
        const dx = (e.clientX - start.x) / zoom,
          dy = (e.clientY - start.y) / zoom;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true;
        el.style.left = Math.round(start.left + dx) + 'px';
        el.style.top = Math.round(start.top + dy) + 'px';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        if (!moved) return;
        const saved = readPositions(selection.document, selection.conversation);
        saved[id] = { x: el.offsetLeft, y: el.offsetTop };
        writePositions(selection.document, selection.conversation, saved);
        el.dataset.dragged = '';
        render();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
    el.addEventListener(
      'click',
      (event) => {
        if (el.dataset.dragged !== undefined) {
          delete el.dataset.dragged;
          event.stopImmediatePropagation();
        }
      },
      true,
    );
  }
  // Pan by dragging empty canvas; wheel scrolls, Ctrl+wheel zooms.
  viewport.onpointerdown = (event) => {
    if ((event.target as HTMLElement).closest('.graph-card') || event.button !== 0) return;
    const start = { x: event.clientX, y: event.clientY, pan: { ...pan } };
    const move = (e: PointerEvent) => {
      pan = { x: start.pan.x + e.clientX - start.x, y: start.pan.y + e.clientY - start.y };
      applyTransform();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  viewport.onwheel = (event) => {
    event.preventDefault();
    if (event.ctrlKey) setZoom(zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
    else {
      pan = { x: pan.x - event.deltaX, y: pan.y - event.deltaY };
      applyTransform();
    }
  };

  // ---- Inspector ------------------------------------------------------------------------------
  function renderInspector(doc: GameplayDefinition, def: ConversationDefinition) {
    inspector.replaceChildren(error);
    const form = new TypedForm(report, sectionOpen);
    const box = element('div', 'rule-inspector-body logic-detail gameplay-fields');
    const commands = [
      '',
      ...Object.keys(doc.commands).filter((id) =>
        doc.commands[id].sources.includes('conversation'),
      ),
    ];
    const nodes = Object.keys(def.nodes);
    const change = (label: string, fn: (d: GameplayDefinition) => void) =>
      run(() => edit(label, fn));
    const section = (parent: HTMLElement, title: string, collapsed = false) => {
      const d = element('details');
      const key = selection.conversation + '/' + pick.card + ':' + title;
      d.open = sectionOpen.get(key) ?? !collapsed;
      d.ontoggle = () => sectionOpen.set(key, d.open);
      d.append(element('summary', '', title));
      const body = element('div', 'gameplay-fields');
      d.append(body);
      parent.append(d);
      return body;
    };
    if (pick.card === ENTRY) {
      const index = pick.port ? Number(pick.port.split(':')[1]) : undefined;
      inspector.append(
        element(
          'h3',
          'rule-inspector-title',
          index === undefined ? 'Start' : 'Start route ' + (index + 1),
        ),
      );
      inspector.append(box);
      const rows = index === undefined ? def.entry.map((_, i) => i) : [index];
      for (const i of rows) {
        const route = def.entry[i],
          parent =
            index === undefined ? section(box, 'Route ' + (i + 1) + ' → ' + route.node, true) : box;
        form.select(parent, 'Route ' + (i + 1) + ' leads to', nodes, route.node, (node) =>
          change('Change conversation entry', (d) => {
            graphOf(d).entry[i].node = node;
          }),
        );
        if (i < def.entry.length - 1)
          form.condition(
            parent,
            'Route ' + (i + 1) + ' shown when',
            route.when,
            (when) =>
              change('Change entry condition', (d) => {
                const r = graphOf(d).entry[i];
                if (when) r.when = when;
                else delete r.when;
              }),
            doc,
          );
        else
          parent.append(
            element('p', 'muted', 'Final fallback · used when no earlier route matches.'),
          );
      }
      box.append(
        element('p', 'muted', 'The first route whose condition holds picks the opening page.'),
      );
      return;
    }
    const node = def.nodes[pick.card];
    const at = (d: GameplayDefinition) => graphOf(d).nodes[pick.card];
    if (pick.port?.startsWith('choice:')) {
      const index = node.choices!.findIndex((c) => 'choice:' + c.id === pick.port),
        choice = node.choices![index];
      inspector.append(element('h3', 'rule-inspector-title', 'Choice · ' + choice.label));
      inspector.append(box);
      const mutate = (label: string, fn: (c: NonNullable<typeof node.choices>[number]) => void) =>
        change(label, (d) => fn(at(d).choices![index]));
      form.text(box, 'Label', choice.label, (label) =>
        mutate('Change dialogue choice', (c) => {
          c.label = label;
        }),
      );
      form.select(box, 'Leads to', nodes, choice.next, (next) =>
        mutate('Change choice destination', (c) => {
          c.next = next;
        }),
      );
      form.condition(
        box,
        'Shown when',
        choice.when,
        (when) =>
          mutate('Change choice condition', (c) => {
            if (when) c.when = when;
            else delete c.when;
          }),
        doc,
      );
      form.select(box, 'On choose', commands, choice.command ?? '', (command) =>
        mutate('Change choice command', (c) => {
          if (command) c.command = command;
          else delete c.command;
        }),
      );
      if (choice.command) box.append(element('p', 'muted', describeCommand(doc, choice.command)));
      const row = element('div', 'row');
      box.append(row);
      form.button(
        row,
        '↑ Earlier',
        () =>
          change('Reorder dialogue choices', (d) => {
            const list = at(d).choices!;
            [list[index - 1], list[index]] = [list[index], list[index - 1]];
          }),
        index === 0,
      );
      form.button(
        row,
        '↓ Later',
        () =>
          change('Reorder dialogue choices', (d) => {
            const list = at(d).choices!;
            [list[index + 1], list[index]] = [list[index], list[index + 1]];
          }),
        index === node.choices!.length - 1,
      );
      form.button(row, 'Remove choice', () => {
        change('Remove dialogue choice', (d) => {
          const n = at(d);
          n.choices!.splice(index, 1);
          if (!n.choices!.length) delete n.choices;
        });
        pick = { card: pick.card };
      });
      footer(box, node.speaker);
      return;
    }
    if (pick.port?.startsWith('redirect:')) {
      const i = Number(pick.port.split(':')[1]),
        r = node.redirect![i];
      inspector.append(element('h3', 'rule-inspector-title', 'Jump ' + (i + 1) + ' → ' + r.node));
      inspector.append(box);
      form.select(box, 'Jumps to', nodes, r.node, (value) =>
        change('Edit redirect', (d) => {
          at(d).redirect![i].node = value;
        }),
      );
      form.condition(
        box,
        'When',
        r.when,
        (when) =>
          change('Edit redirect condition', (d) => {
            if (!when) throw new Error('A jump needs a condition');
            at(d).redirect![i].when = when;
          }),
        doc,
      );
      box.append(
        element('p', 'muted', 'Checked on arrival: the first matching jump replaces this page.'),
      );
      form.button(box, 'Remove jump', () => {
        change('Remove conversation redirect', (d) => {
          const n = at(d);
          n.redirect!.splice(i, 1);
          if (!n.redirect!.length) delete n.redirect;
        });
        pick = { card: pick.card };
      });
      return;
    }
    if ((pick.port === 'free' || pick.port === 'retry') && def.free) {
      inspector.append(element('h3', 'rule-inspector-title', 'Typed input'));
      inspector.append(box);
      const free = def.free,
        f = (fn: (f: NonNullable<ConversationDefinition['free']>) => void) =>
          change('Edit free-text rule', (d) => fn(graphOf(d).free!));
      form.text(
        box,
        'Matched fragments (one per line)',
        free.containsAny.join('\n'),
        (v) =>
          f((x) => {
            x.containsAny = v
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean);
          }),
        true,
      );
      form.select(box, 'Match leads to', nodes, free.next, (v) => f((x) => void (x.next = v)));
      form.text(box, 'Unmatched reply', free.miss, (v) => f((x) => void (x.miss = v)), true);
      form.text(box, 'Retry label', free.retry, (v) => f((x) => void (x.retry = v)));
      form.select(box, 'Retry leads to', nodes, free.retryNext, (v) =>
        f((x) => void (x.retryNext = v)),
      );
      box.append(
        element('p', 'muted', 'Fragments match anywhere, ignoring case; they are literal text.'),
      );
      return;
    }
    // A page.
    inspector.append(element('h3', 'rule-inspector-title', pick.card));
    inspector.append(box);
    form.text(box, 'Speaker', node.speaker, (speaker) =>
      change('Change dialogue speaker', (d) => {
        at(d).speaker = speaker;
      }),
    );
    form.text(
      box,
      'Pages (blank line between pages)',
      node.pages.join('\n\n'),
      (value) =>
        change('Change dialogue pages', (d) => {
          at(d).pages = pages(value);
        }),
      true,
    );
    form.select(box, 'On arrival', commands, node.onEnter ?? '', (value) =>
      change('Edit node entry command', (d) => {
        const n = at(d);
        if (value) n.onEnter = value;
        else {
          delete n.onEnter;
          delete n.onEnterFailure;
        }
      }),
    );
    if (node.onEnter) {
      box.append(element('p', 'muted', describeCommand(doc, node.onEnter)));
      form.select(
        box,
        'If refused, go to',
        [
          '',
          ...Object.entries(def.nodes)
            .filter(([id, n]) => id !== pick.card && !n.onEnter && !n.redirect)
            .map(([id]) => id),
        ],
        node.onEnterFailure ?? '',
        (value) =>
          change('Edit node entry failure', (d) => {
            if (value) at(d).onEnterFailure = value;
            else delete at(d).onEnterFailure;
          }),
      );
    }
    form.check(box, 'Expand text templates', node.template === true, (on) =>
      change('Edit dialogue templates', (d) => {
        if (on) at(d).template = true;
        else delete at(d).template;
      }),
    );
    form.check(box, 'Accept typed input', !!def.free, (on) =>
      change('Edit free-text input', (d) => {
        const c = graphOf(d);
        if (on)
          c.free = {
            containsAny: ['hello'],
            next: pick.card,
            miss: 'Not understood.',
            retry: 'Try again.',
            retryNext: pick.card,
          };
        else delete c.free;
      }),
    );
    if (def.free)
      box.append(
        element(
          'p',
          'muted',
          'Typed input applies on every page with choices in this conversation.',
        ),
      );
    renderConversationStructure(box, doc, selection.conversation, pick.card, {
      form,
      section: (parent, title, collapsed) => section(parent, title, collapsed),
      edit: (label, fn) => edit(label, fn),
      draft,
      refresh: render,
      selectNode: (id) => {
        pick = { card: id };
      },
    });
    footer(box, node.speaker);
  }
  function footer(box: HTMLElement, speaker: string) {
    const foot = element('div', 'graph-footer');
    foot.append(element('span', 'muted', 'Speaker '), element('span', 'graph-speaker', speaker));
    const usage = conversationUsages(
      context.documents,
      selection.document,
      selection.conversation,
    ).find((u) => u.scene);
    if (usage) foot.append(button('Open where it is used', () => context.openScene(usage.scene!)));
    box.append(foot);
  }

  // ---- Try conversation: the shared ConversationSession on a private default state ------------
  function startTry() {
    try {
      const o = options();
      withSharedState(o.sharedStateSource?.(), () => {
        const doc = definition();
        let state: GameplayState = {
          flags: {},
          items: {},
          tokens: 0,
          values: {},
          player: { handle: '', jump: false, controlled: [], keyring: [] },
        };
        const gameplay = new GameplaySession(sourceGameplay(doc), {
          read: () => state,
          write: (next) => {
            state = next;
          },
        });
        tryRun = {
          gameplay,
          session: new ConversationSession(gameplay, selection.conversation),
          log: [],
        };
      });
    } catch (e) {
      report(e);
      tryRun = undefined;
    }
  }
  const shared = <T>(fn: () => T) => withSharedState(options().sharedStateSource?.(), fn);
  function renderTry() {
    overlay.querySelector('.graph-try')?.remove();
    if (!tryRun) return;
    const panel = element('div', 'graph-try');
    panel.append(element('div', 'graph-try-head', 'Trying · default state · nothing is saved'));
    for (const line of tryRun.log) panel.append(element('p', 'graph-try-log', line));
    try {
      const frame = shared(() => tryRun!.session.frame());
      panel.append(element('p', 'graph-try-speaker', frame.speaker));
      for (const p of frame.pages) panel.append(element('p', 'graph-try-page', p));
      const choices = element('div', 'graph-try-choices');
      for (const c of frame.choices ?? [])
        choices.append(
          button(c.label, () => {
            const result = shared(() => tryRun!.session.choose(c.id));
            tryRun!.log.push(
              '› ' + c.label + (result.ok ? '' : ' (refused: ' + result.reason + ')'),
            );
            render();
          }),
        );
      if (frame.acceptsText) {
        const input = element('input');
        input.placeholder = 'Type a reply';
        input.onkeydown = (e) => {
          if (e.key !== 'Enter') return;
          shared(() => tryRun!.session.submit(input.value));
          tryRun!.log.push('› “' + input.value + '”');
          render();
        };
        choices.append(input);
      }
      if (!frame.choices?.length && !frame.acceptsText)
        choices.append(element('span', 'muted', 'End of conversation'));
      choices.append(
        button('Restart', () => {
          startTry();
          render();
        }),
      );
      panel.append(choices);
    } catch (e) {
      panel.append(element('p', 'error', String(e)));
    }
    overlay.append(panel);
  }

  // Opened from a chunk with nothing chosen yet: start on that chunk's own conversations.
  {
    const local = chunkSource();
    if (
      !selection.conversation &&
      local &&
      conversationSources(context.documents).some((d) => d.id === local)
    )
      selection.document = local;
  }
  render();
  requestAnimationFrame(() => {
    if (!disposed) frameAll();
  });
  const dispose = (() => {
    disposed = true;
    host.replaceChildren();
  }) as WorkbenchHandle;
  dispose.refresh = render;
  return dispose;
}
