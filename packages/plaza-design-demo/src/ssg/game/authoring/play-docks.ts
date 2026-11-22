/**
 * Review arrangement for a private Play run in the Scene stage (editor phase 7d): Run and
 * Shortcuts on the left, Live state and Watch on the right, Events / Console / Issues under the
 * game, and two overlay tools (Show triggers, Pick object → edit). Everything here reads the
 * detached snapshots the isolated frame already posts; the only messages sent back are review
 * station jumps the in-game review navigator also offers.
 */
import { watchChoices, watchRows, type LiveEvent, type LiveSnapshot } from './play-live-state';

export interface PlayDockSelection {
  tabs?: Record<string, string>;
  watch?: string[];
  showTriggers?: boolean;
}
export interface RunEvent {
  at: number;
  type: LiveEvent['type'];
  message: string;
}
export interface ReviewShortcut {
  id: string;
  label: string;
  scene?: string;
}
/** Snapshot fields the docks read beyond the live-state comparison. */
export interface DockSnapshot extends LiveSnapshot {
  residency?: { camera?: { x: number; width: number } };
  layout?: {
    uses: { id: string; x: number; label: string; name: string }[];
    exits: { id: string; x: number; label: string; to: string }[];
  };
  engine?: {
    zones?: { key: string; from: number; to: number; armed?: boolean; inside?: boolean | null }[];
    watchdog?: unknown;
  };
  worldComposition?: { blockers?: { chunk: string; reason: string }[] };
}
export interface PlayDocks {
  runPane: HTMLElement;
  livePane: HTMLElement;
  watchPane: HTMLElement;
  /** The game's screen: the viewport plus its overlay; goes in the stage above the bottom dock. */
  screen: HTMLElement;
  update(now: DockSnapshot, prev: DockSnapshot | undefined, events: readonly RunEvent[]): void;
  reset(): void;
  dispose(): void;
}
const WATCH_KEY = 'plaza.play.watch';
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
/** Nearest interaction to a world x, within `reach` world units. */
export function pickUse(layout: DockSnapshot['layout'], x: number, reach = 48) {
  let best: { id: string; d: number } | undefined;
  for (const u of layout?.uses ?? []) {
    const d = Math.abs(u.x - x);
    if (d <= reach && (!best || d < best.d)) best = { id: u.id, d };
  }
  return best?.id;
}
/** Horizontal screen fraction for a world x in the run's camera. */
export const screenFraction = (camera: { x: number; width: number }, x: number) =>
  (x - camera.x) / camera.width;

export function mountPlayDocks(options: {
  host: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
  viewport: HTMLElement;
  status: HTMLElement;
  error: HTMLElement;
  selection: PlayDockSelection;
  frame: () => HTMLIFrameElement | undefined;
  shortcuts: () => readonly ReviewShortcut[];
  scene: () => string | undefined;
  openRule?(scene: string, rule: string): void;
}): PlayDocks {
  const { selection } = options;
  selection.tabs ??= {};
  try {
    selection.watch ??= JSON.parse(localStorage.getItem(WATCH_KEY) ?? '[]');
  } catch {
    selection.watch ??= [];
  }
  if (!Array.isArray(selection.watch)) selection.watch = [];
  const saveWatch = () => {
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(selection.watch));
    } catch {
      /* per-browser convenience only */
    }
  };
  /** A tab strip and its panes; the chosen tab is remembered per dock. */
  const tabbed = (dock: string, panes: [string, HTMLElement][], extra?: HTMLElement) => {
    const root = el('section', 'play-dock play-dock-' + dock),
      strip = el('div', 'play-dock-tabs');
    strip.setAttribute('role', 'tablist');
    const show = (name: string) => {
      selection.tabs![dock] = name;
      for (const [title, pane] of panes) pane.hidden = title !== name;
      for (const b of strip.querySelectorAll('button[role=tab]'))
        b.setAttribute('aria-selected', String(b.textContent === name));
    };
    for (const [title, pane] of panes) {
      const tab = el('button', '', title);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.onclick = () => show(title);
      strip.append(tab);
      pane.classList.add('play-dock-pane');
      pane.setAttribute('role', 'tabpanel');
      pane.setAttribute('aria-label', title);
    }
    if (extra) strip.append(extra);
    root.append(strip, ...panes.map(([, p]) => p));
    show(panes.some(([t]) => t === selection.tabs![dock]) ? selection.tabs![dock] : panes[0][0]);
    return root;
  };

  // Left: Run (filled by the workbench) and Shortcuts.
  const runPane = el('div', 'play-run-pane'),
    shortcutsPane = el('div', 'play-shortcuts');
  const renderShortcuts = () => {
    shortcutsPane.replaceChildren(
      el(
        'p',
        'muted',
        'Review stations from the review navigator. Jumping moves the player inside this run only.',
      ),
    );
    const here = options.scene(),
      stations = options.shortcuts();
    if (!stations.length) shortcutsPane.append(el('p', 'muted', 'No review stations defined.'));
    const list = el('ul');
    for (const s of [...stations].sort(
      (a, b) => Number(b.scene === here) - Number(a.scene === here),
    )) {
      const li = el('li'),
        go = el('button', '', s.label);
      go.type = 'button';
      go.title = s.id + (s.scene ? ' · ' + s.scene : '');
      go.onclick = () =>
        options
          .frame()
          ?.contentWindow?.postMessage(
            { channel: 'editor-play', type: 'review', value: s.id },
            '*',
          );
      li.append(go, el('small', '', s.scene ?? 'any scene'));
      list.append(li);
    }
    shortcutsPane.append(list);
  };
  // The workbench's run state is declared after the docks mount; read it once mounting is done.
  queueMicrotask(renderShortcuts);
  options.left.replaceChildren(
    tabbed('left', [
      ['Run', runPane],
      ['Shortcuts', shortcutsPane],
    ]),
  );

  // Right: Live state (filled by the workbench) and Watch.
  const livePane = el('div', 'play-live-pane'),
    watchPane = el('div', 'play-watch'),
    watchList = el('div', 'play-watch-list'),
    watchAdd = el('div', 'play-watch-add'),
    watchExtra = el('div');
  watchPane.append(watchAdd, watchList, watchExtra);
  options.right.replaceChildren(
    tabbed('right', [
      ['Live state', livePane],
      ['Watch', watchPane],
    ]),
  );
  let choiceSignature = '';
  const renderWatch = (now: DockSnapshot, prev?: DockSnapshot) => {
    const pinned = selection.watch!,
      choices = watchChoices(now).filter((c) => !pinned.includes(c.key)),
      signature = choices.map((c) => c.key).join('|');
    if (signature !== choiceSignature) {
      choiceSignature = signature;
      const picker = el('select'),
        add = el('button', '', 'Watch');
      picker.setAttribute('aria-label', 'Value to watch');
      for (const c of choices) {
        const option = el('option', '', c.label);
        option.value = c.key;
        picker.append(option);
      }
      add.type = 'button';
      add.disabled = !choices.length;
      add.onclick = () => {
        if (!picker.value) return;
        pinned.push(picker.value);
        saveWatch();
        choiceSignature = '';
        renderWatch(now, prev);
      };
      watchAdd.replaceChildren(picker, add);
    }
    watchList.replaceChildren();
    if (!pinned.length)
      watchList.append(
        el('p', 'muted', 'Pin flags, items or scene state to follow them while you play.'),
      );
    for (const row of watchRows(pinned, now, prev)) {
      const line = el('div', 'live-row' + (row.changed ? ' changed' : '')),
        remove = el('button', 'play-watch-remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Stop watching ' + row.label);
      remove.onclick = () => {
        selection.watch = pinned.filter((k) => k !== row.key);
        saveWatch();
        choiceSignature = '';
        renderWatch(now, prev);
      };
      line.append(el('span', '', row.label), el('span', '', row.value), remove);
      watchList.append(line);
    }
  };

  // Screen: the viewport with an overlay for triggers and picking.
  const screen = el('div', 'play-screen'),
    overlay = el('div', 'play-overlay'),
    pick = el('div', 'play-pick');
  pick.hidden = true;
  pick.setAttribute('aria-label', 'Pick an interaction to edit');
  options.viewport.append(overlay, pick);
  screen.append(options.viewport);
  let latest: DockSnapshot | undefined, hover: string | undefined;
  const worldX = (event: MouseEvent) => {
    const camera = latest?.residency?.camera;
    if (!camera) return undefined;
    const rect = pick.getBoundingClientRect();
    return camera.x + ((event.clientX - rect.left) / rect.width) * camera.width;
  };
  const drawOverlay = () => {
    overlay.replaceChildren();
    const camera = latest?.residency?.camera;
    if (!camera || (!selection.showTriggers && pick.hidden)) return;
    const at = (x: number) => screenFraction(camera, x) * 100;
    if (selection.showTriggers)
      for (const z of latest?.engine?.zones ?? []) {
        const left = at(Math.min(z.from, z.to)),
          right = at(Math.max(z.from, z.to));
        if (right < 0 || left > 100) continue;
        const band = el(
          'div',
          'play-zone' + (z.inside ? ' inside' : '') + (z.armed ? ' armed' : ''),
        );
        band.style.left = left + '%';
        band.style.width = Math.max(0.4, right - left) + '%';
        band.append(el('span', '', z.key));
        overlay.append(band);
      }
    for (const u of latest?.layout?.uses ?? []) {
      const x = at(u.x);
      if (x < 0 || x > 100) continue;
      const mark = el('div', 'play-use' + (u.id === hover ? ' hover' : ''));
      mark.style.left = x + '%';
      mark.append(el('span', '', u.id));
      overlay.append(mark);
    }
  };
  pick.onmousemove = (event) => {
    const x = worldX(event),
      next = x === undefined ? undefined : pickUse(latest?.layout, x);
    if (next !== hover) {
      hover = next;
      pick.style.cursor = next ? 'pointer' : 'crosshair';
      drawOverlay();
    }
  };
  pick.onclick = (event) => {
    const x = worldX(event),
      id = x === undefined ? undefined : pickUse(latest?.layout, x),
      scene = latest?.scene;
    if (!id || !scene) {
      options.status.textContent = 'Nothing to edit there. Pick near an interaction marker.';
      return;
    }
    setPicking(false);
    options.openRule?.(scene, 'use:' + id);
  };

  // Bottom: Events, Console, Issues, with the overlay tools on the tab strip.
  const eventsPane = el('div', 'play-events'),
    consolePane = el('div', 'play-console'),
    issuesPane = el('div', 'play-issues'),
    tools = el('div', 'play-dock-tools'),
    triggers = el('button', '', 'Show triggers'),
    picker = el('button', '', 'Pick object → edit');
  for (const b of [triggers, picker]) b.type = 'button';
  triggers.setAttribute('aria-pressed', String(!!selection.showTriggers));
  triggers.onclick = () => {
    selection.showTriggers = !selection.showTriggers;
    triggers.setAttribute('aria-pressed', String(selection.showTriggers));
    drawOverlay();
  };
  const setPicking = (on: boolean) => {
    pick.hidden = !on;
    picker.setAttribute('aria-pressed', String(on));
    hover = undefined;
    drawOverlay();
  };
  picker.hidden = !options.openRule;
  picker.title = 'Click an interaction in the game to open its rule. This stops the run.';
  picker.onclick = () => setPicking(pick.hidden);
  tools.append(triggers, picker);
  const bottom = tabbed(
    'bottom',
    [
      ['Events', eventsPane],
      ['Console', consolePane],
      ['Issues', issuesPane],
    ],
    tools,
  );
  options.host.classList.add('play-docked');
  options.host.replaceChildren(screen, bottom);

  // Console: every status and error line the run reports, with its time.
  const started = performance.now(),
    consoleLines: { at: number; kind: string; text: string }[] = [],
    errors: string[] = [];
  const renderConsole = () => {
    const list = el('ol', 'play-log');
    for (const line of consoleLines.slice(-200)) {
      const li = el('li', line.kind);
      li.append(
        el('span', '', ((line.at - started) / 1000).toFixed(1) + ' s'),
        el('span', '', line.text),
      );
      list.append(li);
    }
    consolePane.replaceChildren(list);
    list.lastElementChild?.scrollIntoView?.({ block: 'nearest' });
  };
  const watchText = (node: HTMLElement, kind: string) => {
    let previous = '';
    const observer = new MutationObserver(() => {
      const text = node.textContent ?? '';
      if (!text || text === previous) return;
      previous = text;
      consoleLines.push({ at: performance.now(), kind, text });
      if (kind === 'error') errors.push(text);
      renderConsole();
      renderIssues();
    });
    observer.observe(node, { childList: true, characterData: true, subtree: true });
    return observer;
  };
  const observers = [watchText(options.status, 'status'), watchText(options.error, 'error')];
  renderConsole();

  const renderIssues = () => {
    const issues = [
      ...errors.map((e) => 'Error: ' + e),
      ...(latest?.worldComposition?.blockers ?? []).map(
        (b) => 'World edit waits for ' + b.chunk + ': ' + b.reason,
      ),
      ...(Array.isArray(latest?.engine?.watchdog)
        ? (latest!.engine!.watchdog as unknown[])
            .filter((w) => w && typeof w === 'object' && (w as { tripped?: unknown }).tripped)
            .map((w) => 'Watchdog: ' + JSON.stringify(w))
        : []),
    ];
    const list = el('ul');
    for (const issue of issues) list.append(el('li', '', issue));
    issuesPane.replaceChildren(issues.length ? list : el('p', 'muted', 'No issues in this run.'));
    const tab = bottom.querySelectorAll('button[role=tab]')[2];
    if (tab) tab.textContent = issues.length ? 'Issues · ' + issues.length : 'Issues';
  };
  renderIssues();

  const renderEvents = (events: readonly RunEvent[]) => {
    if (!events.length) {
      eventsPane.replaceChildren(
        el(
          'p',
          'muted',
          'Scene changes, goals, conversations, interactions and state changes appear here.',
        ),
      );
      return;
    }
    const table = el('table');
    for (const e of [...events].reverse().slice(0, 200)) {
      const row = el('tr');
      row.append(
        el('td', 'play-event-time', e.at.toFixed(1) + ' s'),
        el('td', 'live-type ' + e.type, e.type),
        el('td', '', e.message),
      );
      table.append(row);
    }
    eventsPane.replaceChildren(table);
  };
  renderEvents([]);

  return {
    runPane,
    livePane,
    watchPane: watchExtra,
    screen,
    update(now, prev, events) {
      latest = now;
      renderWatch(now, prev);
      renderEvents(events);
      renderIssues();
      drawOverlay();
    },
    reset() {
      latest = undefined;
      errors.length = 0;
      renderEvents([]);
      renderIssues();
      drawOverlay();
      renderShortcuts();
    },
    dispose() {
      for (const o of observers) o.disconnect();
      options.host.classList.remove('play-docked');
      options.left.replaceChildren();
    },
  };
}
