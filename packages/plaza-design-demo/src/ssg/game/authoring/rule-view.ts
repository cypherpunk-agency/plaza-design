/**
 * Logic workspace · rule view. Shows the open chunk's interactions, triggers, objectives and
 * story phases as WHEN / IF / DO / ORDER rules over the existing scene and gameplay sources.
 * Every token edits the same field as Interactions & story, through the same validated
 * ComposerModel edit; nothing here is a second copy of the logic.
 */
import { element, button } from './controls';
import { TypedForm } from './typed-form';
import { sceneLogicSource } from './scene-logic-source';
import { mountSceneAuthoring } from './scene-authoring';
import { rotationStateIds } from '../engine/gameplay/scene-document';
import {
  addInteractionOutcome,
  removeInteractionOutcome,
  moveInteractionOutcome,
  setInteractionRotation,
} from './interaction-content';
import {
  RULE_GROUPS,
  chunkRuleList,
  parseRuleKey,
  useRuleClauses,
  triggerRuleClauses,
  objectiveRuleClauses,
  addConjunct,
  replaceConjunct,
  conditionPart,
  defaultLeaf,
  describeCommand,
  describeCondition,
  type RuleClauses,
  type RuleToken,
} from './rule-model';
import type { WorkbenchContext, WorkbenchHandle } from './contracts';
import type { GameplayDefinition } from '../engine/gameplay/types';
import type { SceneDocument, InteractionRoute } from '../engine/gameplay/scene-document';
import type { NativeLiveCondition } from '../engine/gameplay/native-live-conditions';

export interface RuleViewSelection {
  scene?: string;
  rule?: string;
  token?: string;
  stripOpen?: boolean;
}
const pages = (v: string) =>
  v
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function mountRuleView(
  host: HTMLElement,
  context: WorkbenchContext,
  selection: RuleViewSelection,
): WorkbenchHandle {
  const source = sceneLogicSource(context, () => selection.scene ?? context.scene ?? 'downtown');
  const root = element('div', 'rule-view'),
    list = element('nav', 'rule-list'),
    centre = element('section', 'rule-centre'),
    inspector = element('aside', 'rule-inspector'),
    error = element('p', 'error rule-error');
  error.setAttribute('role', 'alert');
  list.setAttribute('aria-label', 'Chunk logic');
  inspector.setAttribute('aria-label', 'Rule inspector');
  root.append(list, centre, inspector);
  host.replaceChildren(root);
  const sectionOpen = new Map<string, boolean>();
  const report = (e: unknown) => (error.textContent = e instanceof Error ? e.message : String(e));
  let child: WorkbenchHandle | undefined,
    disposed = false;
  const edit = (label: string, fn: (d: SceneDocument, g: GameplayDefinition) => void) => {
    source.edit(label, fn);
    error.textContent = '';
  };
  const editGameplay = (label: string, fn: (g: GameplayDefinition) => void) => {
    source.editGameplay(label, fn);
    error.textContent = '';
  };
  const run = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      report(e);
    }
    render();
  };

  function render() {
    if (disposed) return;
    child?.();
    child = undefined;
    let doc: SceneDocument, g: GameplayDefinition;
    try {
      doc = source.doc();
      g = source.gameplay();
    } catch (e) {
      list.replaceChildren();
      centre.replaceChildren(element('p', 'error', 'Rules unavailable: ' + String(e)));
      inspector.replaceChildren();
      return;
    }
    const items = chunkRuleList(doc, g);
    if (!items.some((i) => i.key === selection.rule)) {
      selection.rule = items[0]?.key;
      selection.token = undefined;
    }
    renderList(items);
    const key = selection.rule ? parseRuleKey(selection.rule) : undefined;
    centre.replaceChildren();
    inspector.replaceChildren(error);
    if (!key) {
      centre.append(
        element(
          'p',
          'muted',
          'This chunk has no interactions, triggers, objectives or story phases yet.',
        ),
      );
      return;
    }
    if (key.kind === 'phase') {
      renderPhase(doc, key.id);
      return;
    }
    let clauses: RuleClauses;
    if (key.kind === 'use') {
      const use = doc.uses.find((u) => u.id === key.use)!;
      clauses = useRuleClauses(doc, g, use, key.item);
    } else if (key.kind === 'trigger')
      clauses = triggerRuleClauses(doc, g, key.id, g.native!.triggers![key.id]);
    else clauses = objectiveRuleClauses(doc, key.index);
    const tokens = [...clauses.when, ...clauses.if, ...clauses.do, ...clauses.order];
    if (!tokens.some((t) => t.id === selection.token)) selection.token = clauses.when[0]?.id;
    renderStrip(clauses);
    renderClauses(doc, g, clauses);
    if (key.kind === 'objective' || (doc.objectives?.length ?? 0) > 1)
      renderObjectiveChain(doc, key);
    renderInspector(doc, g, clauses);
  }

  function renderList(items: ReturnType<typeof chunkRuleList>) {
    list.replaceChildren();
    for (const group of RULE_GROUPS) {
      const rows = items.filter((i) => i.group === group);
      list.append(element('h3', 'rule-group', group + ' · ' + rows.length));
      for (const item of rows) {
        const row = button('', () => {
          selection.rule = item.key;
          selection.token = undefined;
          render();
        });
        row.className = 'rule-row';
        row.setAttribute('aria-pressed', String(item.key === selection.rule));
        row.append(element('span', 'rule-row-label', item.label));
        if (item.detail) row.append(element('small', '', item.detail));
        for (const issue of item.issues) row.append(element('small', 'rule-issue', '! ' + issue));
        list.append(row);
      }
      if (!rows.length) list.append(element('p', 'rule-empty', 'none'));
    }
  }

  /** A dimmed picture of the chunk with the rule's subjects outlined; Show in Layout selects one. */
  function renderStrip(clauses: RuleClauses) {
    const strip = element('div', 'rule-strip'),
      head = element('div', 'rule-strip-head'),
      toggle = button(selection.stripOpen === false ? '▸ Scene' : '▾ Scene', () => {
        selection.stripOpen = selection.stripOpen === false;
        render();
      });
    toggle.className = 'quiet';
    toggle.setAttribute('aria-expanded', String(selection.stripOpen !== false));
    head.append(toggle);
    const chunkDoc = source.identity().composition;
    const subject = clauses.subjects.find((id) => instanceExists(chunkDoc, id));
    if (subject)
      head.append(
        button(
          'Show in Layout',
          () => context.openInstance(chunkDoc, subject),
          'Select ' + subject + ' in the scene',
        ),
      );
    const test = button(
      '▶ Test this rule',
      () => context.playScene?.(),
      'Private Play in this chunk from the chosen checkpoint',
    );
    test.className = 'primary';
    test.disabled = !context.playScene;
    head.append(test);
    strip.append(head);
    if (selection.stripOpen !== false) {
      const shot = context.sceneSnapshot?.(chunkDoc, clauses.subjects);
      const frame = element('div', 'rule-strip-frame');
      if (shot) {
        const picture = element('div', 'rule-strip-picture');
        picture.style.aspectRatio = shot.canvas.width + ' / ' + shot.canvas.height;
        picture.append(shot.canvas);
        for (const box of shot.boxes) {
          const mark = element('div', 'rule-strip-mark');
          Object.assign(mark.style, {
            left: (box.x / shot.canvas.width) * 100 + '%',
            top: (box.y / shot.canvas.height) * 100 + '%',
            width: (box.width / shot.canvas.width) * 100 + '%',
            height: (box.height / shot.canvas.height) * 100 + '%',
          });
          picture.append(mark);
        }
        frame.append(picture);
        if (clauses.subjects.length && !shot.boxes.length)
          frame.append(element('span', 'rule-strip-note corner', 'Subject not in view'));
      } else
        frame.append(
          element(
            'span',
            'rule-strip-note',
            'The scene appears here once Layout has drawn this chunk.',
          ),
        );
      strip.append(frame);
    }
    centre.append(strip);
  }
  const instanceExists = (document: string, id: string) => {
    try {
      return JSON.stringify(source.api.get(document).value).includes('"id":"' + id + '"');
    } catch {
      return false;
    }
  };

  function renderClauses(doc: SceneDocument, g: GameplayDefinition, clauses: RuleClauses) {
    centre.append(element('h2', 'rule-title', clauses.title));
    const reads = element('p', 'rule-reads');
    reads.append(
      element('span', 'rule-reads-label', 'Reads as '),
      document.createTextNode(clauses.reads),
    );
    centre.append(reads);
    const key = parseRuleKey(selection.rule!)!;
    const clause = (
      name: string,
      tokens: RuleToken[],
      add?: { label: string; run: () => void },
      note?: string,
    ) => {
      const row = element('div', 'rule-clause');
      row.append(element('span', 'rule-clause-name', name));
      const body = element('div', 'rule-tokens');
      tokens.forEach((t, i) => {
        if (name === 'DO' && i > 0) body.append(element('span', 'rule-then', '→'));
        body.append(token(t));
      });
      if (add) {
        const b = button(add.label, add.run);
        b.className = 'rule-add quiet';
        body.append(b);
      }
      if (note) body.append(element('small', 'rule-clause-note', note));
      row.append(body);
      centre.append(row);
    };
    clause('WHEN', clauses.when);
    clause(
      'IF',
      clauses.if,
      clauses.canAddCondition
        ? { label: '＋ condition', run: () => run(() => addCondition(key, g)) }
        : undefined,
    );
    clause(
      'DO',
      clauses.do,
      clauses.canAddAction && key.kind === 'use'
        ? { label: '＋ action', run: () => run(() => addAction(doc, key.use, key.item)) }
        : undefined,
      clauses.doLabel,
    );
    clause('ORDER', clauses.order);
  }
  function token(t: RuleToken) {
    const chip = button('', () => {
      selection.token = t.id;
      render();
    });
    chip.className = 'rule-token ' + t.tone + (t.issue ? ' broken' : '');
    chip.setAttribute('aria-pressed', String(t.id === selection.token));
    if (t.guard) chip.append(element('span', 'rule-guard', t.guard));
    chip.append(element('span', '', t.text));
    if (t.issue) chip.append(element('span', 'rule-token-issue', '! ' + t.issue));
    chip.title = t.issue ? t.issue : 'Edit in the inspector';
    return chip;
  }
  function addCondition(key: NonNullable<ReturnType<typeof parseRuleKey>>, g: GameplayDefinition) {
    const leaf = defaultLeaf(g);
    if (key.kind === 'use')
      edit('Add interaction condition', (d) => {
        const u = d.uses.find((u) => u.id === key.use)!;
        u.when = addConjunct(u.when, leaf);
        selection.token = 'if:' + (('all' in u.when && u.when.all.length - 1) || 0);
      });
    else if (key.kind === 'trigger')
      editGameplay('Add trigger condition', (g) => {
        const t = g.native!.triggers![key.id];
        t.when = addConjunct(t.when, leaf);
        selection.token = 'if:' + (('all' in t.when && t.when.all.length - 1) || 0);
      });
    else if (key.kind === 'objective')
      edit('Add objective condition', (d) => {
        const o = d.objectives![key.index];
        o.when = addConjunct(o.when, leaf);
        selection.token = 'if:' + (('all' in o.when && o.when.all.length - 1) || 0);
      });
  }
  function addAction(doc: SceneDocument, use: string, item?: number) {
    const rotating = item === undefined && !!doc.uses.find((u) => u.id === use)?.cycle;
    edit('Add interaction outcome', (d) => {
      const u = d.uses.find((u) => u.id === use)!,
        routes = item !== undefined ? u.items![item].routes : u.routes;
      addInteractionOutcome(routes, rotating);
      selection.token = 'do:' + (rotating ? routes.length - 1 : Math.max(0, routes.length - 2));
    });
  }

  function renderObjectiveChain(
    doc: SceneDocument,
    key: NonNullable<ReturnType<typeof parseRuleKey>>,
  ) {
    const rows = doc.objectives ?? [];
    if (!rows.length) return;
    const card = element('div', 'rule-chain');
    card.append(element('h3', 'rule-group', 'Objective chain'));
    const ol = element('ol');
    rows.forEach((o, i) => {
      const li = element('li');
      const b = button(o.text, () => {
        selection.rule = 'objective:' + i;
        selection.token = undefined;
        render();
      });
      b.className = 'quiet';
      const current = key.kind === 'objective' && key.index === i;
      if (current) b.setAttribute('aria-current', 'step');
      li.append(b);
      if (i < rows.length - 1 && o.when)
        li.append(element('small', '', 'while ' + describeCondition(o.when, rows)));
      ol.append(li);
    });
    card.append(ol);
    centre.append(card);
  }

  function renderPhase(doc: SceneDocument, id: string) {
    const phase = doc.phases![id];
    const clauses: RuleClauses = {
      title: 'Story phase · ' + id,
      reads:
        'While the story is in phase ' +
        id +
        ', this chunk ' +
        [
          phase.goal ? 'shows the goal “' + phase.goal + '”' : '',
          phase.intro ? 'plays its arrival intro' : '',
          phase.arrival?.length
            ? 'runs ' +
              phase.arrival.length +
              ' arrival rule' +
              (phase.arrival.length > 1 ? 's' : '')
            : '',
          phase.lines ? 'changes ' + Object.keys(phase.lines).length + ' line(s)' : '',
          phase.exits ? 'changes exits ' + Object.keys(phase.exits).join(', ') : '',
          phase.time ? 'sets the clock to ' + phase.time : '',
        ]
          .filter(Boolean)
          .join(', ')
          .replace(/^$/, 'keeps its normal behaviour') +
        '.',
      when: [{ id: 'when', text: 'story phase is ' + id, tone: 'subject' }],
      if: [{ id: 'if:always', text: 'always', tone: 'condition' }],
      do: [
        ...(phase.goal
          ? [{ id: 'goal', text: 'goal “' + phase.goal + '”', tone: 'action' as const }]
          : []),
        ...(phase.intro ? [{ id: 'intro', text: 'arrival intro', tone: 'action' as const }] : []),
        ...(phase.arrival?.length
          ? [
              {
                id: 'arrival',
                text: phase.arrival.length + ' arrival rules',
                tone: 'action' as const,
              },
            ]
          : []),
        ...(phase.exits
          ? [
              {
                id: 'exits',
                text: 'exits ' + Object.keys(phase.exits).join(', '),
                tone: 'action' as const,
              },
            ]
          : []),
        ...(phase.time
          ? [{ id: 'time', text: 'clock ' + phase.time, tone: 'action' as const }]
          : []),
      ],
      order: [{ id: 'order:phase', text: 'story order', tone: 'order' }],
      canAddCondition: false,
      canAddAction: false,
      subjects: [],
      doLabel: '',
    };
    renderStrip(clauses);
    centre.append(element('h2', 'rule-title', clauses.title));
    const reads = element('p', 'rule-reads');
    reads.append(
      element('span', 'rule-reads-label', 'Reads as '),
      document.createTextNode(clauses.reads),
    );
    centre.append(reads);
    for (const [name, tokens] of [
      ['WHEN', clauses.when],
      [
        'DO',
        clauses.do.length
          ? clauses.do
          : [{ id: 'none', text: 'no changes', tone: 'action' as const }],
      ],
    ] as const) {
      const row = element('div', 'rule-clause');
      row.append(element('span', 'rule-clause-name', name));
      const body = element('div', 'rule-tokens');
      for (const t of tokens) {
        const chip = element('span', 'rule-token ' + t.tone, t.text);
        body.append(chip);
      }
      row.append(body);
      centre.append(row);
    }
    inspector.append(element('h3', 'rule-inspector-title', 'Story phases'));
    const box = element('div', 'rule-inspector-body logic-detail');
    inspector.append(box);
    child = mountSceneAuthoring(box, context, {
      scene: source.selected().id,
      fixed: true,
      focus: { only: ['phases'], empty: 'This chunk has no story phases.' },
    });
  }

  // ---- Inspector: the selected token's own fields --------------------------------------------
  function renderInspector(doc: SceneDocument, g: GameplayDefinition, clauses: RuleClauses) {
    const key = parseRuleKey(selection.rule!)!,
      id = selection.token ?? 'when',
      all = [...clauses.when, ...clauses.if, ...clauses.do, ...clauses.order],
      t = all.find((x) => x.id === id);
    inspector.append(element('h3', 'rule-inspector-title', t ? t.text : clauses.title));
    if (t?.issue) inspector.append(element('p', 'error', t.issue));
    const box = element('div', 'rule-inspector-body logic-detail gameplay-fields');
    inspector.append(box);
    const form = new TypedForm(report, sectionOpen);
    form.objectiveIds = doc.objectives?.map((o) => o.id) ?? [];
    if (key.kind === 'use') useInspector(box, form, doc, g, key.use, key.item, id);
    else if (key.kind === 'trigger')
      triggerInspector(box, form, g, key.id, g.native!.triggers![key.id], id);
    else if (key.kind === 'objective') objectiveInspector(box, form, doc, g, key.index, id);
  }
  const hint = (parent: HTMLElement, text: string) => parent.append(element('p', 'muted', text));

  function useInspector(
    box: HTMLElement,
    form: TypedForm,
    doc: SceneDocument,
    g: GameplayDefinition,
    uid: string,
    item: number | undefined,
    id: string,
  ) {
    const u = doc.uses.find((u) => u.id === uid)!,
      variant = item !== undefined ? u.items![item] : undefined,
      rows = variant ? variant.routes : u.routes,
      rotating = !variant && !!u.cycle,
      getRoutes = (d: SceneDocument) => {
        const v = d.uses.find((x) => x.id === uid)!;
        return item !== undefined ? v.items![item].routes : v.routes;
      },
      use = (d: SceneDocument) => d.uses.find((x) => x.id === uid)!;
    const change = (label: string, fn: (d: SceneDocument) => void) => run(() => edit(label, fn));
    if (id === 'when' || id === 'subject') {
      if (variant) {
        form.text(box, 'Carried item label', variant.label, (label) =>
          change('Edit carried-item label', (d) => {
            use(d).items![item!].label = label;
          }),
        );
        hint(box, 'Shown when the player carries ' + variant.item + '.');
      } else {
        form.text(box, 'Prompt', u.label, (label) =>
          change('Edit interaction prompt', (d) => {
            use(d).label = label;
          }),
        );
        form.text(box, 'Name', u.name, (name) =>
          change('Edit interaction speaker', (d) => {
            use(d).name = name;
          }),
        );
        form.select(
          box,
          'Speaker type',
          ['character', 'device', 'system'],
          u.speakerKind ?? 'character',
          (kind) =>
            change('Edit interaction source', (d) => {
              use(d).speakerKind = kind as 'character' | 'device' | 'system';
            }),
        );
        form.select(
          box,
          'Conversation presentation',
          ['panel', 'bubble'],
          u.conversationPresentation ?? 'panel',
          (value) =>
            change('Edit interaction conversation presentation', (d) => {
              use(d).conversationPresentation = value as 'panel' | 'bubble';
            }),
        );
      }
    } else if (id.startsWith('if:') && id !== 'if:always') {
      const index = Number(id.slice(3));
      form.condition(
        box,
        'Condition',
        conditionPart(u.when, index),
        (when) =>
          change('Edit interaction availability', (d) => {
            const v = use(d),
              next = replaceConjunct(v.when, index, when);
            if (next) v.when = next;
            else delete v.when;
          }),
        g,
        true,
      );
      form.button(box, 'Remove condition', () =>
        change('Remove interaction condition', (d) => {
          const v = use(d),
            next = replaceConjunct(v.when, index, undefined);
          if (next) v.when = next;
          else delete v.when;
          selection.token = undefined;
        }),
      );
      hint(box, 'The prompt is hidden unless every IF condition holds.');
    } else if (id === 'if:always') {
      hint(
        box,
        'No conditions: the prompt is always offered. Use ＋ condition to add one, or add an access check below.',
      );
      accessAdd(box, form, u, change);
    } else if (id.startsWith('access:')) {
      const i = Number(id.slice(7)),
        rule = u.access![i],
        at = (d: SceneDocument) => use(d).access![i];
      form.select(
        box,
        'Access command',
        [
          '',
          ...Object.entries(g.commands)
            .filter(([, c]) => c.sources.includes('interaction'))
            .map(([k]) => k),
        ],
        rule.command ?? '',
        (command) =>
          change('Edit interaction access', (d) => {
            const r = at(d);
            if (command) r.command = command;
            else delete r.command;
            if (!r.command && !r.when) r.when = { all: [] };
          }),
      );
      form.condition(
        box,
        'Access condition',
        rule.when,
        (when) =>
          change('Edit interaction access', (d) => {
            at(d).when = when ?? { all: [] };
          }),
        g,
      );
      form.check(box, 'Hide while refused', !!rule.hidden, (hidden) =>
        change('Edit interaction access', (d) => {
          at(d).hidden = hidden;
        }),
      );
      form.text(box, 'Refusal', rule.reason, (reason) =>
        change('Edit interaction access', (d) => {
          at(d).reason = reason;
        }),
      );
      form.button(box, 'Remove access check', () =>
        change('Remove access requirement', (d) => {
          use(d).access!.splice(i, 1);
          if (!use(d).access!.length) delete use(d).access;
          selection.token = undefined;
        }),
      );
      accessAdd(box, form, u, change);
    } else if (id === 'purchase') {
      form.select(
        box,
        'Purchase',
        ['', ...Object.keys(g.purchases ?? {})],
        u.purchase ?? '',
        (purchase) =>
          change('Bind interaction purchase', (d) => {
            const row = use(d);
            if (purchase) {
              row.purchase = purchase;
              delete row.price;
            } else delete row.purchase;
          }),
      );
      form.text(box, 'Priced prompt label', u.pricedLabel ?? '', (value) =>
        change('Edit priced interaction label', (d) => {
          if (value) use(d).pricedLabel = value;
          else delete use(d).pricedLabel;
        }),
      );
      hint(
        box,
        'The prompt quotes this purchase. An outcome command that performs the purchase charges it.',
      );
    } else if (id.startsWith('do:')) {
      const i = Number(id.slice(3));
      routeInspector(box, form, g, rows[i], i, rows.length, rotating, getRoutes, change);
    } else if (id === 'order:target') {
      form.select(
        box,
        'Target order',
        ['after-devices', 'before-devices'],
        u.targetOrder ?? 'after-devices',
        (value) =>
          change('Edit interaction target order', (d) => {
            use(d).targetOrder = value as 'after-devices' | 'before-devices';
          }),
      );
      hint(box, 'Where this prompt sits relative to device prompts at the same spot.');
    } else if (id === 'order:rotation') {
      form.select(
        box,
        'Rotation state',
        ['', ...rotationStateIds(g)],
        u.cycleState ?? '',
        (state) => {
          if (u.cycle)
            change('Bind interaction rotation state', (d) => {
              use(d).cycleState = state;
            });
          else rotationDraft = state;
        },
      );
      form.check(box, 'Rotating outcomes', !!u.cycle, (on) =>
        change('Set interaction rotation', (d) =>
          setInteractionRotation(use(d), on, rotationDraft || undefined),
        ),
      );
      hint(
        box,
        u.cycle
          ? 'Outcomes take turns. Turning rotation off adds always-matching conditions before the fallback.'
          : 'Rotation needs a whole-number state and command/page outcomes without conditions or conversations.',
      );
    }
    if (!variant) fullForm(box, 'All interaction settings', ['use:' + uid]);
  }
  let rotationDraft = '';
  function accessAdd(
    box: HTMLElement,
    form: TypedForm,
    u: SceneDocument['uses'][number],
    change: (label: string, fn: (d: SceneDocument) => void) => void,
  ) {
    form.button(
      box,
      '＋ Access check',
      () =>
        change('Add access requirement', (d) => {
          const row = d.uses.find((v) => v.id === u.id)!;
          (row.access ??= []).push({
            when: { all: [] },
            reason: 'This action is not available yet.',
          });
          selection.token = 'access:' + (row.access.length - 1);
        }),
      (u.access?.length ?? 0) >= 32,
    );
  }
  function routeInspector(
    box: HTMLElement,
    form: TypedForm,
    g: GameplayDefinition,
    r: InteractionRoute,
    i: number,
    count: number,
    rotating: boolean,
    get: (d: SceneDocument) => InteractionRoute[],
    change: (label: string, fn: (d: SceneDocument) => void) => void,
  ) {
    const at = (fn: (r: InteractionRoute) => void) =>
      change('Edit interaction route', (d) => fn(get(d)[i]));
    if (!rotating && i < count - 1)
      form.condition(
        box,
        'Only if',
        r.when,
        (when) =>
          at((r) => {
            r.when = when ?? { tokensAtLeast: 0 };
          }),
        g,
      );
    else if (!rotating && count > 1) hint(box, 'Fallback: runs when no earlier outcome matches.');
    if (!rotating)
      form.select(
        box,
        'Conversation',
        ['', ...Object.keys(g.conversations)],
        r.conversation ?? '',
        (conversation) =>
          at((r) => {
            if (conversation) {
              r.conversation = conversation;
              delete r.command;
              delete r.pages;
              delete r.failure;
              delete r.template;
              delete r.speaker;
            } else {
              delete r.conversation;
              r.pages = ['Nothing happens.'];
            }
          }),
      );
    if (r.conversation) {
      if (context.openConversation)
        form.button(box, 'Open conversation graph', () =>
          context.openConversation!(source.selected().gameplayId, r.conversation!),
        );
    } else {
      form.select(
        box,
        'Command',
        [
          '',
          ...Object.entries(g.commands)
            .filter(([, c]) => c.sources.includes('interaction'))
            .map(([k]) => k),
        ],
        r.command ?? '',
        (command) =>
          at((r) => {
            if (command) r.command = command;
            else {
              delete r.command;
              delete r.failure;
            }
          }),
      );
      if (r.command && g.commands[r.command]) hint(box, describeCommand(g, r.command));
      form.text(
        box,
        'Says (blank line between pages)',
        (r.pages ?? []).join('\n\n'),
        (v) =>
          at((r) => {
            r.pages = pages(v);
          }),
        true,
      );
      if (r.command)
        form.text(
          box,
          'Says when refused',
          (r.failure ?? []).join('\n\n'),
          (v) =>
            at((r) => {
              if (v.trim()) r.failure = pages(v);
              else delete r.failure;
            }),
          true,
        );
      form.text(box, 'Speaker override', r.speaker ?? '', (speaker) =>
        at((r) => {
          if (speaker.trim()) r.speaker = speaker;
          else delete r.speaker;
        }),
      );
    }
    const row = element('div', 'row');
    box.append(row);
    const limit = count - (rotating ? 0 : 1);
    form.button(
      row,
      '↑ Earlier',
      () =>
        change('Reorder interaction outcomes', (d) => {
          moveInteractionOutcome(get(d), i, -1, rotating);
          selection.token = 'do:' + (i - 1);
        }),
      i >= limit || i - 1 < 0,
    );
    form.button(
      row,
      '↓ Later',
      () =>
        change('Reorder interaction outcomes', (d) => {
          moveInteractionOutcome(get(d), i, 1, rotating);
          selection.token = 'do:' + (i + 1);
        }),
      i >= limit || i + 1 >= limit,
    );
    form.button(
      row,
      'Remove',
      () =>
        change('Remove interaction outcome', (d) => {
          removeInteractionOutcome(get(d), i, rotating);
          selection.token = undefined;
        }),
      count <= 1,
    );
  }

  function triggerInspector(
    box: HTMLElement,
    form: TypedForm,
    g: GameplayDefinition,
    id: string,
    t: NativeLiveCondition,
    token: string,
  ) {
    const change = (label: string, fn: (t: NativeLiveCondition, g: GameplayDefinition) => void) =>
      run(() => editGameplay(label, (next) => fn(next.native!.triggers![id], next)));
    if (token === 'trigger') {
      form.check(box, 'Only when it becomes true', !!t.edge, (on) =>
        change('Edit trigger activation', (t) => {
          if (on) t.edge = 'rising';
          else delete t.edge;
        }),
      );
      hint(
        box,
        'Rising activation fires once each time the condition turns true; restoring a save sets the baseline without firing.',
      );
    } else if (token.startsWith('if:') && token !== 'if:always') {
      const index = Number(token.slice(3));
      form.condition(
        box,
        'Condition',
        conditionPart(t.when, index),
        (when) =>
          change('Edit trigger condition', (t) => {
            t.when = replaceConjunct(t.when, index, when) ?? { all: [] };
          }),
        g,
      );
      form.button(
        box,
        'Remove condition',
        () =>
          change('Remove trigger condition', (t) => {
            t.when = replaceConjunct(t.when, index, undefined) ?? { all: [] };
            selection.token = undefined;
          }),
        !('all' in t.when && t.when.all.length > 1),
      );
    } else if (token === 'if:always') hint(box, 'No conditions. Use ＋ condition to add one.');
    else if (token === 'command') {
      form.select(
        box,
        'System command',
        Object.entries(g.commands)
          .filter(([, c]) => c.sources.length === 1 && c.sources[0] === 'system')
          .map(([k]) => k),
        t.command,
        (command) =>
          change('Edit trigger command', (t) => {
            t.command = command;
          }),
      );
      hint(box, describeCommand(g, t.command));
      hint(box, 'Edit what the command does under Commands & dialogue.');
    } else if (token === 'order:phase' || token === 'order:once') {
      form.select(
        box,
        'Phase',
        ['afterNative', 'beforeNative', 'onPersist'],
        t.phase ?? 'afterNative',
        (phase) =>
          change('Edit trigger phase', (t) => {
            if (phase === 'afterNative') delete t.phase;
            else t.phase = phase as NonNullable<NativeLiveCondition['phase']>;
          }),
      );
      form.check(box, 'Once per save', !!t.once, (on) =>
        change('Edit trigger once', (t) => {
          if (on) t.once = true;
          else delete t.once;
        }),
      );
    }
    fullForm(box, 'All chunk triggers', ['triggers']);
  }

  function objectiveInspector(
    box: HTMLElement,
    form: TypedForm,
    doc: SceneDocument,
    g: GameplayDefinition,
    index: number,
    token: string,
  ) {
    const o = doc.objectives![index],
      change = (label: string, fn: (o: NonNullable<SceneDocument['objectives']>[number]) => void) =>
        run(() => edit(label, (d) => fn(d.objectives![index])));
    if (token.startsWith('if:') && token !== 'if:always' && token !== 'if:final') {
      const part = Number(token.slice(3));
      form.allowObjectiveContext = false;
      form.condition(
        box,
        'Condition',
        conditionPart(o.when, part),
        (when) =>
          change('Edit objective condition', (o) => {
            const next = replaceConjunct(o.when, part, when);
            if (next) o.when = next;
            else delete o.when;
          }),
        g,
        false,
      );
      form.button(box, 'Remove condition', () =>
        change('Remove objective condition', (o) => {
          const next = replaceConjunct(o.when, part, undefined);
          if (next) o.when = next;
          else delete o.when;
          selection.token = undefined;
        }),
      );
      hint(box, 'The goal stays current while its conditions hold; the first matching goal wins.');
    } else {
      form.text(
        box,
        'Goal text',
        o.text,
        (text) =>
          change('Edit objective', (o) => {
            o.text = text;
          }),
        true,
      );
      form.select(
        box,
        'Guidance target',
        ['', ...doc.uses.map((u) => u.id)],
        o.target ?? '',
        (target) =>
          change('Edit guidance', (o) => {
            if (target) o.target = target;
            else delete o.target;
          }),
      );
      form.check(box, 'Gentle guidance', !!o.gentle, (gentle) =>
        change('Edit guidance urgency', (o) => {
          o.gentle = gentle;
        }),
      );
      if (index === doc.objectives!.length - 1)
        hint(box, 'The last objective applies once the earlier ones are complete.');
    }
  }
  /** Fallback to the complete existing form for fields the tokens do not cover. */
  function fullForm(box: HTMLElement, title: string, only: string[]) {
    const details = element('details', 'rule-full-form');
    details.open = sectionOpen.get('full:' + title) ?? false;
    details.append(element('summary', '', title));
    const body = element('div');
    details.append(body);
    box.append(details);
    const mount = () => {
      if (child || !details.open) return;
      child = mountSceneAuthoring(body, context, {
        scene: source.selected().id,
        fixed: true,
        focus: { only, empty: 'Nothing more to edit.' },
      });
    };
    details.ontoggle = () => {
      sectionOpen.set('full:' + title, details.open);
      mount();
    };
    mount();
  }

  render();
  const dispose = (() => {
    disposed = true;
    child?.();
    host.replaceChildren();
  }) as WorkbenchHandle;
  dispose.refresh = render;
  return dispose;
}
