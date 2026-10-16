/** Extracted dialogue responsibilities; function bodies and stored identifiers are preserved. */
import { type Save, who } from '../../runtime/save';
import { type Objective, objective } from './progression';


// ---------- people ----------

const NPC_LINES: Record<string, [string[], string[]]> = {
  hood: [['Not authenticated. Not my problem.'], ['A box on this street went dark.', 'Registry is sending a van. Wasn\'t you, right?']],
  umbrella: [['I don\'t see you. That\'s the deal.', 'Unless you\'re selling Registry Premium. Terms: forever. Cancellation: see Terms. I read them twice.'], ['Still nobody. A louder nobody, though.']],
  hat: [['Keep walking, ghost.'], ['Heard the noodle guy talks to ghosts now.', 'Bad for business. His, not mine.']],
};


export function npcTalk(id: string, s: Save): string[] {
  if (id === 'hood' && s.controlled.includes('0x3C')) return ['Billboard\'s showing a pigeon.', 'Best thing it ever ran.'];
  const [before, after] = NPC_LINES[id] ?? [['...'], ['...']];
  return s.controlled.length ? after : before;
}


const HINTS: Record<Objective, string[]> = {
  handle: [],
  till: [],
  box: ['Signs on this street never fully light. Read what the one above the box really says.', 'The box only takes maintenance logins. It says so itself, if you ask it to list its files.'],
  install: ['Found something on that box? Modules don\'t install themselves.', 'Go back to the box. What does it list now that it trusts you?'],
  relay: ['Admins write everything down. Read their notes.', 'Rotation policies are lazy. Same password, different direction.'],
  gate: [
    'The gate wants a scanner signature. Nobody on this street has one. Nobody human.',
    'Robots get their routes from DISPATCH. DISPATCH hides behind shields. Shields come down outside in.',
    'That gate shuts behind everything that goes through. Something tells it to. Read its wiring.',
  ],
  done: [],
};


/** `ask`: after the last page, the deck opens with this already typed (the keyboard is right here). */
export interface Talk { pages: string[]; spend?: boolean; ask?: string }


/** What talking to the fixer costs now: 1 when the next thing he says is a hint for a bowl, else 0 (the prompt shows it). */
export function fixerPrice(s: Save): number {
  if (!s.flags.metFixer || !s.flags.greeted) return 0;
  const goal = objective(s);
  if (goal === 'handle' || goal === 'till') return 0;
  if (s.keyring.includes('glove.left') && s.keyring.includes('glove.right') && !s.flags.gloves) return 0;
  return (s.hints[goal] ?? 0) < HINTS[goal].length ? 1 : 0;
}


/** What the fixer says. Hints cost one noodle token and never give the answer. */
export function fixerTalk(s: Save): Talk {
  const name = who(s);
  if (!s.flags.metFixer) {
    s.flags.metFixer = true;
    return { pages: ['Another ghost. Sit.', 'Noodles are free for the dead.', 'Registry pulled your key? Then nobody on this street sees you.', 'Got a name, ghost? Your deck has a keyboard. Type it.'], ask: 'set handle ' };
  }
  const goal = objective(s);
  if (goal === 'handle') return { pages: ['Name first. Your deck, the keyboard: set handle, then the name.'], ask: 'set handle ' };
  if (!s.flags.greeted) {
    s.flags.greeted = true;
    return { pages: [name + '. Fine name for a nobody.', 'House rule: hints cost a bowl. Answers aren\'t on the menu.', 'You\'re broke, though. And my till still runs on factory settings. Don\'t tell anyone.'] };
  }
  if (goal === 'till') return { pages: ['The till is right there. Factory settings. Every manual prints them.'] };
  // P13's payoff: DLV-9's left glove (P12) and the right one from Moth's jacket (washer 3), once
  if (s.keyring.includes('glove.left') && s.keyring.includes('glove.right') && !s.flags.gloves) {
    s.flags.gloves = true;
    return { pages: ['Two gloves. Left and right. Let me see.', "Moth's gloves. Moth loses one of everything.", 'Keys, gloves, sleep, flats. Never a friend, though. Eat something.'] };
  }

  const used = s.hints[goal] ?? 0, hints = HINTS[goal];
  const remark: Record<Objective, string> = {
    handle: '', till: '',
    box: 'That junction box under the VERIFY sign belongs to the Registry. Older than you.',
    install: 'The box went dark. Half the street noticed. Use what you took.',
    relay: 'Legs. Good. Rooftops are where the Registry forgot to look.',
    gate: 'The Market is west. Their gate wants a scanner signature. That\'s tomorrow\'s problem.',
    done: 'A delivery robot. Of course. Nobody checks the help.',
  };
  if (used >= hints.length) return { pages: [remark[goal], 'That\'s all I know. The rest is yours.'] };
  if (s.tokens <= 0) return { pages: [remark[goal], 'No tokens, no hints. Noodles aren\'t free twice.'] };
  s.tokens -= 1;
  s.hints[goal] = used + 1;
  return { pages: [remark[goal], 'One bowl. Here:', hints[used]], spend: true };
}
