/**
 * Hacking capability stages: what of the hacking layer the player can use yet. The story hands them
 * out one at a time (the opening's PHASES `hackStages`, and `hack:<stage>` flags any gameplay command
 * sets), so the first scenes can teach one thing at a time. The device data does not change: a stage
 * only decides whether the player may use a part of the toolkit.
 *
 * - inspect: hack vision (H, `⌁ hack it`): every device's parts in place; tapping a verb runs it.
 *   Without it nothing else counts: no hacking at all.
 * - wire: run a new cable from an event to a verb, and place logic modules (TIMER, SWITCH) between cables.
 * - cut: cut a cable.
 * - board: the board (B), `⌁ jack in` and the deck's own view of a machine's schematic.
 * - guard: try a password on a GUARD (a fragment, a typed guess, the deck's `login`).
 * - link: use a LINK (`scan`, `connect`) and, with the scanner program, the net map.
 */
export const HACK_STAGES = ['inspect', 'wire', 'cut', 'board', 'guard', 'link'] as const;
export type HackStage = (typeof HACK_STAGES)[number];

/** The flag that grants a stage (`hack:wire`): any gameplay command can set it, a checkpoint can start with it. */
export const hackStageFlag = (stage: HackStage) => 'hack:' + stage;
export const HACK_STAGE_FLAGS = HACK_STAGES.map(hackStageFlag);

export const isHackStage = (s: unknown): s is HackStage =>
  typeof s === 'string' && (HACK_STAGES as readonly string[]).includes(s);

export const ALL_HACK_STAGES: ReadonlySet<HackStage> = new Set(HACK_STAGES);
export const NO_HACK_STAGES: ReadonlySet<HackStage> = new Set();

/**
 * The stages the player has: those a phase gives, plus those granted by flags. Without `inspect` the
 * rest mean nothing, so the result is empty. Pure; it stores nothing.
 */
export function grantedHackStages(
  given: readonly HackStage[],
  flags: Readonly<Record<string, boolean>>,
): ReadonlySet<HackStage> {
  const out = new Set<HackStage>(given);
  for (const s of HACK_STAGES) if (flags[hackStageFlag(s)]) out.add(s);
  return out.has('inspect') ? out : NO_HACK_STAGES;
}
