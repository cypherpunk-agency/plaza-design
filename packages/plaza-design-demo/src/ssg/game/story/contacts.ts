/**
 * Contacts on your deck: people who reach you through the terminal. After Act I,
 * Moth is the first (STORY.md, Decided 4: "messages and calls through the
 * terminal; can go dark again for drama").
 *
 * Kept small on purpose. A contact appears once its save flag is set (`when`);
 * each message appears once its own flag is set, and is read with `msg <contact>`
 * in the deck (level.ts). The game prints the unread ones as they arrive (game.ts
 * `inbox`) and marks them read with the flag `read:<message id>`.
 *
 * HOW ACT II EXTENDS IT
 * - A new message: one entry in a contact's `messages`, with the flag that
 *   releases it (a fragment found, a place visited: `p16`, `seen:canals`, …).
 *   Scenes set those flags as they already do (`SceneModel.flag`, `UseCtx.set`).
 * - A new contact (Captain Brine, Lux): one entry here with its own `when`.
 * - Moth going dark: a `dark` flag on the contact (`dark: 'moth:dark'`); while it is
 *   set the deck shows the contact as "no signal" and holds new messages back.
 * - Calls (a dialogue rather than lines) would open the engine's talk panel with a
 *   dialogue from a data file; not needed yet.
 * - If messages get many, this list moves to a data file (`data/contacts.json`)
 *   with the same shape; the check can then hold flags and ids together.
 */

export interface ContactMessage {
  id: string;
  /** The save flag that releases it. */
  when: string;
  /** Lines, printed one after another. */
  text: string[];
}

export interface Contact {
  id: string;
  name: string;
  /** The save flag that puts the contact on your deck. */
  when: string;
  /** While this flag is set, the contact has no signal (and holds new messages back). */
  dark?: string;
  /** What the deck says about where they are. */
  status: string;
  messages: ContactMessage[];
}

export const CONTACTS: Contact[] = [
  {
    id: 'moth',
    name: 'MOTH',
    when: 'contact:moth',
    dark: 'moth:dark',
    status: 'on NIGHT FERRY 7 · signal comes and goes',
    messages: [
      { id: 'moth.1', when: 'act1:done', text: [
        'moth> on the water. signal is one bar and a seagull.',
        'moth> the list: seven pieces. you already held one (the relay roof). I\'ll find where the other six live and send you there.',
        'moth> the warehouse by the stacks is where the Registry keeps what it takes. remember the door.',
        'moth> and feed Sprat. — m',
      ] },
    ],
  },
];

type Flags = Readonly<Record<string, boolean>>;

/** The contacts on your deck now. */
export const contactsOf = (f: Flags) => CONTACTS.filter((c) => f[c.when]);
/** A contact's messages released so far (none while dark). */
export const messagesOf = (c: Contact, f: Flags) => (c.dark && f[c.dark] ? [] : c.messages.filter((m) => f[m.when]));
/** Messages released and not yet read, across contacts. */
export const unread = (f: Flags) => contactsOf(f).flatMap((c) => messagesOf(c, f).filter((m) => !f['read:' + m.id]).map((m) => ({ contact: c, message: m })));
export const readFlag = (m: ContactMessage) => 'read:' + m.id;
