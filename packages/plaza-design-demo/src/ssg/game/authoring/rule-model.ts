/**
 * Pure projection of a chunk's existing logic sources into rules (WHEN / IF / DO / ORDER) for the
 * Logic workspace's rule view. Nothing here is saved: the clauses are read from the scene and
 * gameplay documents and every edit goes back to those same fields.
 */
import type { Condition, GameplayAction, GameplayDefinition } from '../engine/gameplay/types';
import type { ScalarRead } from '../engine/gameplay/queries';
import type {
  SceneDocument,
  UseDocument,
  InteractionRoute,
} from '../engine/gameplay/scene-document';
import type { NativeLiveCondition } from '../engine/gameplay/native-live-conditions';

export type RuleGroup = 'Interactions' | 'Triggers' | 'Objectives' | 'Story phases';
export const RULE_GROUPS: readonly RuleGroup[] = [
  'Interactions',
  'Triggers',
  'Objectives',
  'Story phases',
];
/** A rule's identity: stable across edits that do not rename the source row. */
export type RuleKey =
  | { kind: 'use'; use: string; item?: number }
  | { kind: 'trigger'; id: string }
  | { kind: 'objective'; index: number }
  | { kind: 'phase'; id: string };
export interface RuleListItem {
  key: string;
  group: RuleGroup;
  label: string;
  detail?: string;
  /** One line per broken reference, shown inline in the list. */
  issues: string[];
}
export type TokenTone = 'subject' | 'condition' | 'action' | 'order' | 'refusal';
export interface RuleToken {
  /** Inspector address inside the rule: `when`, `if:3`, `access:0`, `do:1`, `purchase`, `order:target`… */
  id: string;
  text: string;
  tone: TokenTone;
  /** Short guard shown before an outcome ("if metFixer"). */
  guard?: string;
  issue?: string;
  removable?: boolean;
}
export interface RuleClauses {
  title: string;
  /** Plain-language reading of the whole rule. */
  reads: string;
  when: RuleToken[];
  if: RuleToken[];
  do: RuleToken[];
  order: RuleToken[];
  /** In-place additions this rule supports. */
  canAddCondition: boolean;
  canAddAction: boolean;
  /** Composition instances the rule is about, for the scene strip. */
  subjects: string[];
  /** Outcomes stop at the first match unless they rotate. */
  doLabel: string;
}

export const ruleKey = (key: RuleKey) =>
  key.kind === 'use'
    ? 'use:' + key.use + (key.item !== undefined ? ':item:' + key.item : '')
    : key.kind === 'trigger'
      ? 'trigger:' + key.id
      : key.kind === 'objective'
        ? 'objective:' + key.index
        : 'phase:' + key.id;
export function parseRuleKey(key: string): RuleKey | undefined {
  const use = /^use:(.+?)(?::item:(\d+))?$/.exec(key);
  if (use) return { kind: 'use', use: use[1], ...(use[2] ? { item: Number(use[2]) } : {}) };
  const [kind, ...rest] = key.split(':'),
    id = rest.join(':');
  if (!id) return undefined;
  if (kind === 'trigger') return { kind, id };
  if (kind === 'phase') return { kind, id };
  if (kind === 'objective' && /^\d+$/.test(id)) return { kind, index: Number(id) };
  return undefined;
}

const quote = (s: string) => '“' + s + '”';
const clip = (s: string, n = 48) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
export function describeRead(read: ScalarRead): string {
  if ('literal' in read)
    return typeof read.literal === 'string' ? quote(read.literal) : String(read.literal);
  if ('state' in read) return read.state;
  return read.query + '()';
}
const ops = { eq: '=', ne: '≠', lt: '<', lte: '≤', gt: '>', gte: '≥' } as const;
/** Compact, readable condition text. Identifiers stay as authored so they can be found again. */
export function describeCondition(
  c: Condition | undefined,
  objectives: readonly { id: string; text: string }[] = [],
): string {
  if (!c) return 'always';
  const inner = (x: Condition) => {
    const text = describeCondition(x, objectives);
    return 'all' in x || 'any' in x ? '(' + text + ')' : text;
  };
  if ('all' in c) return c.all.length ? c.all.map(inner).join(' and ') : 'always';
  if ('any' in c) return c.any.length ? c.any.map(inner).join(' or ') : 'never';
  if ('not' in c) {
    const n = c.not;
    if ('flag' in n) return n.flag + (n.is === false ? ' is on' : ' is off');
    if ('objective' in n) return 'goal ' + objectiveName(n.objective, objectives) + ' is done';
    if ('player' in n && 'field' in n.player && n.player.field === 'handle' && n.player.is === '')
      return 'player has a name';
    if ('player' in n && 'collection' in n.player)
      return describeCondition(n, objectives)
        .replace(/^player controls/, 'player does not control')
        .replace(/^keyring has/, 'keyring lacks');
    return 'not ' + inner(n);
  }
  if ('flag' in c) return c.flag + (c.is === false ? ' is off' : ' is on');
  if ('state' in c) return c.state + ' = ' + JSON.stringify(c.is);
  if ('objective' in c) return 'goal is ' + objectiveName(c.objective, objectives);
  if ('tokensAtLeast' in c) return 'tokens ≥ ' + c.tokensAtLeast;
  if ('item' in c) return c.item + ' ≥ ' + c.atLeast;
  if ('time' in c) return c.time.from + '–' + c.time.to;
  if ('weather' in c) return 'weather ' + c.weather.join('/');
  if ('compare' in c)
    return (
      describeRead(c.compare.left) + ' ' + ops[c.compare.op] + ' ' + describeRead(c.compare.right)
    );
  const p = c.player;
  if ('field' in p)
    return p.field === 'handle'
      ? p.is === ''
        ? 'player has no name'
        : 'player name is ' + quote(p.is)
      : p.is
        ? 'player can jump'
        : 'player cannot jump';
  const what =
    p.contains === undefined
      ? 'anything'
      : typeof p.contains === 'string'
        ? p.contains
        : describeRead(p.contains);
  return p.collection === 'controlled' ? 'player controls ' + what : 'keyring has ' + what;
}
const objectiveName = (id: string, objectives: readonly { id: string; text: string }[]) => {
  const row = objectives.find((o) => o.id === id);
  return row ? quote(clip(row.text, 32)) : id;
};
export function describeAction(a: GameplayAction): string {
  if ('flag' in a) return (a.value ? 'set ' : 'clear ') + a.flag;
  if ('state' in a)
    return 'set' in a
      ? 'set ' +
          a.state +
          ' = ' +
          (typeof a.set === 'object' && a.set !== null
            ? describeRead(a.set)
            : JSON.stringify(a.set))
      : 'add ' + (typeof a.add === 'number' ? a.add : describeRead(a.add)) + ' to ' + a.state;
  if ('item' in a)
    return 'give ' + (typeof a.add === 'number' ? a.add : describeRead(a.add)) + ' ' + a.item;
  if ('tokens' in a)
    return (
      'tokens ' +
      (typeof a.tokens === 'number'
        ? (a.tokens >= 0 ? '+' : '') + a.tokens
        : describeRead(a.tokens))
    );
  if ('purchase' in a) return 'charge ' + a.purchase;
  if ('emit' in a) return 'emit ' + a.emit;
  if ('grant' in a) {
    const g = a.grant;
    return 'keyring' in g
      ? 'grant key ' + g.keyring
      : 'ability' in g
        ? 'grant ' + g.ability
        : 'grant control of ' +
          (typeof g.controlled === 'string' ? g.controlled : describeRead(g.controlled));
  }
  if ('world' in a) return 'change world';
  if ('wire' in a)
    return a.wire.op === 'connect'
      ? 'connect ' + a.wire.from + '→' + a.wire.to
      : 'cut ' + a.wire.from + '→' + a.wire.to;
  if ('trace' in a) return 'trace ' + a.trace.device;
  return 'move ' + a.mover.device;
}
/** What a command does, in one line ("set metFixer · charge downtown.fixer.hint"). */
export function describeCommand(g: GameplayDefinition, id: string): string {
  const c = g.commands[id];
  if (!c) return 'missing command ' + id;
  return c.actions.length ? c.actions.map(describeAction).join(' · ') : 'no actions';
}
const conjuncts = (c: Condition | undefined): Condition[] => (!c ? [] : 'all' in c ? c.all : [c]);
/** Prompt label without the key hint: "[E] TALK · HINT" → "TALK · HINT". */
export const promptVerb = (label: string) => label.replace(/^\s*\[[^\]]*\]\s*/, '').trim() || label;

export function subjectInstances(doc: SceneDocument, id: string): string[] {
  const actor = doc.actors?.find((a) => a.id === id)?.instance;
  const device = (doc.manifest as { devices?: Record<string, { instance?: string }> } | undefined)
    ?.devices?.[id]?.instance;
  return [...new Set([actor, device, id].filter((x): x is string => !!x))];
}

function routeText(r: InteractionRoute) {
  if (r.conversation) return 'open conversation ' + r.conversation;
  const say = r.pages?.length ? 'say ' + quote(clip(r.pages[0], 40)) : '';
  if (r.command) return 'run ' + r.command + (say ? ' · ' + say : '');
  return say || 'do nothing';
}
function routeIssue(g: GameplayDefinition, r: InteractionRoute) {
  if (r.conversation && !g.conversations[r.conversation])
    return 'missing conversation ' + r.conversation;
  if (r.command && !g.commands[r.command]) return 'missing command ' + r.command;
  return undefined;
}

export function chunkRuleList(doc: SceneDocument, g: GameplayDefinition): RuleListItem[] {
  const items: RuleListItem[] = [];
  for (const u of doc.uses) {
    const issues = [...u.routes, ...(u.items ?? []).flatMap((i) => i.routes)]
      .map((r) => routeIssue(g, r))
      .filter((x): x is string => !!x);
    for (const a of u.access ?? [])
      if (a.command && !g.commands[a.command]) issues.push('missing command ' + a.command);
    if (u.purchase && !g.purchases?.[u.purchase]) issues.push('missing purchase ' + u.purchase);
    items.push({
      key: ruleKey({ kind: 'use', use: u.id }),
      group: 'Interactions',
      label: u.name || u.id,
      detail: promptVerb(u.label),
      issues,
    });
    u.items?.forEach((item, i) =>
      items.push({
        key: ruleKey({ kind: 'use', use: u.id, item: i }),
        group: 'Interactions',
        label: (u.name || u.id) + ' + ' + item.item,
        detail: promptVerb(item.label),
        issues: item.routes.map((r) => routeIssue(g, r)).filter((x): x is string => !!x),
      }),
    );
  }
  for (const [id, t] of Object.entries(g.native?.triggers ?? {}))
    items.push({
      key: ruleKey({ kind: 'trigger', id }),
      group: 'Triggers',
      label: id,
      detail: describeCondition(t.when, doc.objectives),
      issues: g.commands[t.command] ? [] : ['missing command ' + t.command],
    });
  doc.objectives?.forEach((o, i) =>
    items.push({
      key: ruleKey({ kind: 'objective', index: i }),
      group: 'Objectives',
      label: i + 1 + '. ' + o.text,
      issues:
        o.target && !doc.uses.some((u) => u.id === o.target) && !subjectKnown(doc, o.target)
          ? ['missing target ' + o.target]
          : [],
    }),
  );
  for (const id of Object.keys(doc.phases ?? {}))
    items.push({
      key: ruleKey({ kind: 'phase', id }),
      group: 'Story phases',
      label: id,
      detail: doc.phases![id].goal ? clip(doc.phases![id].goal!, 40) : undefined,
      issues: [],
    });
  return items;
}
const subjectKnown = (doc: SceneDocument, id: string) =>
  !!doc.actors?.some((a) => a.id === id) ||
  !!doc.exits?.some((e) => e.id === id) ||
  !!doc.readables?.some((r) => r.id === id) ||
  !!doc.people?.some((p) => p.id === id) ||
  !!(doc.manifest as { devices?: Record<string, unknown> } | undefined)?.devices?.[id];

export function useRuleClauses(
  doc: SceneDocument,
  g: GameplayDefinition,
  u: UseDocument,
  item?: number,
): RuleClauses {
  const variant = item !== undefined ? u.items?.[item] : undefined,
    routes = variant ? variant.routes : u.routes,
    rotating = !variant && !!u.cycle,
    who = u.name || u.id,
    verb = promptVerb(variant ? variant.label : u.label),
    avail = conjuncts(u.when),
    objectives = doc.objectives ?? [];
  const when: RuleToken[] = [
    { id: 'when', text: (variant ? 'uses ' + variant.item + ' · ' : '') + verb, tone: 'subject' },
    { id: 'subject', text: who, tone: 'subject' },
  ];
  const ifTokens: RuleToken[] = avail.map((c, i) => ({
    id: 'if:' + i,
    text: describeCondition(c, objectives),
    tone: 'condition',
    removable: true,
  }));
  (u.access ?? []).forEach((a, i) =>
    ifTokens.push({
      id: 'access:' + i,
      text:
        (a.command ? a.command : describeCondition(a.when, objectives)) +
        ' else ' +
        (a.hidden ? 'hide' : 'refuse'),
      tone: 'refusal',
      ...(a.command && !g.commands[a.command] ? { issue: 'missing command ' + a.command } : {}),
    }),
  );
  if (!ifTokens.length) ifTokens.push({ id: 'if:always', text: 'always', tone: 'condition' });
  const doTokens: RuleToken[] = [];
  if (!variant && u.purchase)
    doTokens.push({
      id: 'purchase',
      text: 'quote ' + u.purchase,
      tone: 'action',
      ...(g.purchases?.[u.purchase] ? {} : { issue: 'missing purchase ' + u.purchase }),
    });
  routes.forEach((r, i) => {
    const issue = routeIssue(g, r),
      guarded = !rotating && i < routes.length - 1;
    doTokens.push({
      id: 'do:' + i,
      text: routeText(r),
      tone: 'action',
      ...(guarded ? { guard: 'if ' + describeCondition(r.when, objectives) } : {}),
      ...(!rotating && i === routes.length - 1 && routes.length > 1 ? { guard: 'otherwise' } : {}),
      ...(issue ? { issue } : {}),
    });
  });
  const order: RuleToken[] = [
    {
      id: 'order:target',
      text:
        (u.targetOrder ?? 'after-devices') === 'before-devices'
          ? 'before devices'
          : 'after devices',
      tone: 'order',
    },
  ];
  if (!variant)
    order.push({
      id: 'order:rotation',
      text: rotating ? 'rotate via ' + (u.cycleState ?? '(no state)') : 'first match wins',
      tone: 'order',
    });
  const outcome = (r: InteractionRoute) =>
    r.conversation
      ? 'open the conversation ' + r.conversation
      : r.command
        ? 'run ' + r.command + (r.pages?.length ? ' and say ' + quote(clip(r.pages[0], 40)) : '')
        : r.pages?.length
          ? 'say ' + quote(clip(r.pages[0], 40))
          : 'do nothing';
  const conditionText = avail.length
    ? ' while ' + avail.map((c) => describeCondition(c, objectives)).join(' and ')
    : '';
  const refusals = (u.access ?? []).length ? ', unless an access check refuses' : '';
  const charge = !variant && u.purchase ? 'quote ' + u.purchase + ', then ' : '';
  const body =
    routes.length === 1
      ? outcome(routes[0])
      : rotating
        ? 'take turns: ' + routes.map(outcome).join('; ')
        : routes
            .map((r, i) =>
              i < routes.length - 1
                ? 'if ' + describeCondition(r.when, objectives) + ', ' + outcome(r)
                : 'otherwise ' + outcome(r),
            )
            .join('; ');
  return {
    title: who + (variant ? ' + ' + variant.item : ''),
    reads:
      'When the player ' +
      (variant ? 'uses ' + variant.item + ' on ' : 'picks ' + quote(verb) + ' at ') +
      who +
      conditionText +
      refusals +
      ', ' +
      charge +
      body +
      '.',
    when,
    if: ifTokens,
    do: doTokens,
    order,
    canAddCondition: !variant,
    canAddAction: routes.length < 32,
    subjects: subjectInstances(doc, u.id),
    doLabel: rotating ? 'in rotation' : routes.length > 1 ? 'first match wins' : '',
  };
}

export function triggerRuleClauses(
  doc: SceneDocument,
  g: GameplayDefinition,
  id: string,
  t: NativeLiveCondition,
): RuleClauses {
  const parts = conjuncts(t.when),
    objectives = doc.objectives ?? [];
  const phase =
    t.phase === 'beforeNative'
      ? 'before devices update'
      : t.phase === 'onPersist'
        ? 'when the game saves'
        : 'after devices update';
  return {
    title: id,
    reads:
      'When ' +
      (parts.length ? parts.map((c) => describeCondition(c, objectives)).join(' and ') : 'always') +
      (t.edge ? ' becomes true' : ' holds') +
      ', run ' +
      t.command +
      (g.commands[t.command] ? ' (' + describeCommand(g, t.command) + ')' : '') +
      (t.once ? ', once per save' : '') +
      '.',
    when: [
      { id: 'trigger', text: t.edge ? 'becomes true' : 'every tick while true', tone: 'subject' },
    ],
    if: parts.length
      ? parts.map((c, i) => ({
          id: 'if:' + i,
          text: describeCondition(c, objectives),
          tone: 'condition' as const,
          removable: parts.length > 1,
        }))
      : [{ id: 'if:always', text: 'always', tone: 'condition' }],
    do: [
      {
        id: 'command',
        text: 'run ' + t.command,
        tone: 'action',
        ...(g.commands[t.command] ? {} : { issue: 'missing command ' + t.command }),
      },
    ],
    order: [
      { id: 'order:phase', text: phase, tone: 'order' },
      ...(t.once ? [{ id: 'order:once', text: 'once', tone: 'order' as const }] : []),
    ],
    canAddCondition: true,
    canAddAction: false,
    subjects: [],
    doLabel: '',
  };
}

export function objectiveRuleClauses(doc: SceneDocument, index: number): RuleClauses {
  const rows = doc.objectives ?? [],
    o = rows[index],
    last = index === rows.length - 1,
    parts = conjuncts(o.when);
  return {
    title: 'Objective ' + (index + 1),
    reads: last
      ? 'Once every earlier objective is done, the goal reads ' + quote(o.text) + '.'
      : 'While ' +
        (parts.length ? parts.map((c) => describeCondition(c, rows)).join(' and ') : 'always') +
        ' (and no earlier goal applies), the goal reads ' +
        quote(o.text) +
        (o.target ? ' and guidance points at ' + o.target : '') +
        '.',
    when: [
      { id: 'when', text: last ? 'earlier goals done' : 'earlier goals done', tone: 'subject' },
    ],
    if: last
      ? [{ id: 'if:final', text: 'final goal', tone: 'condition' }]
      : parts.length
        ? parts.map((c, i) => ({
            id: 'if:' + i,
            text: describeCondition(c, rows),
            tone: 'condition' as const,
            removable: true,
          }))
        : [{ id: 'if:always', text: 'always', tone: 'condition' }],
    do: [
      { id: 'goal', text: 'show goal ' + quote(clip(o.text, 40)), tone: 'action' },
      ...(o.target
        ? [{ id: 'target', text: 'point at ' + o.target, tone: 'action' as const }]
        : []),
    ],
    order: [
      {
        id: 'order:position',
        text: 'position ' + (index + 1) + ' of ' + rows.length,
        tone: 'order',
      },
    ],
    canAddCondition: !last,
    canAddAction: false,
    subjects: o.target ? subjectInstances(doc, o.target) : [],
    doLabel: '',
  };
}

/** Add one condition to an optional `when`, keeping a flat `all` list. */
export function addConjunct(when: Condition | undefined, leaf: Condition): Condition {
  if (!when) return leaf;
  if ('all' in when) return { all: [...when.all, leaf] };
  return { all: [when, leaf] };
}
/** Replace or remove conjunct `index` of a `when` produced by `conjuncts`. */
export function replaceConjunct(
  when: Condition | undefined,
  index: number,
  next: Condition | undefined,
): Condition | undefined {
  const parts = conjuncts(when).slice();
  if (next) parts[index] = next;
  else parts.splice(index, 1);
  return !parts.length ? undefined : parts.length === 1 ? parts[0] : { all: parts };
}
export const conditionPart = (when: Condition | undefined, index: number) => conjuncts(when)[index];
/** First default leaf the shared condition control would offer. */
export const defaultLeaf = (g: GameplayDefinition): Condition =>
  g.flags.length ? { flag: g.flags[0] } : { tokensAtLeast: 0 };
