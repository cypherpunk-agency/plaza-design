/**
 * The deck's keyboard on a scene: the old terminal commands, kept as the last
 * resort. Every tap on a schematic prints its shell line; this goes the other
 * way, so what you type does what the tap would:
 *
 *   ls                     the nouns of the machine (sealed ones as ???)
 *   cat <noun>             its `read`
 *   login <user> <pass>    tries the machine's GUARD (the user must match, if the scene names one)
 *   install <module>       its `install`
 *   use <noun> --<verb>    any verb, as the shell lines print it (use drawer --open)
 *   <verb> <noun>          the same, the short way (open drawer, scan, connect dispatch)
 *
 * "The machine" is the one whose schematic is open, else the one you stand at
 * (the game decides). Lines come from the engine, so the wording is the scene's.
 * Written for Downtown; nothing in it is Downtown-only (the yard uses it too).
 */

import type { LineData } from '../data/types';
import type { LineKind } from '../terminal';
import type { SceneHost } from '../engine';
import type { Noun } from '../engine/model';

/** What level.ts's terminal asks of a scene (its `Shell`). */
export interface SceneShell {
  ls(dev: string): string;
  readable(dev: string): string[];
  installable(dev: string): string[];
  hasGuard(dev: string): boolean;
  cat(dev: string, file: string): void;
  login(dev: string, user: string, pass: string): void;
  install(dev: string, name: string): void;
  /** Any other line: a verb on a noun. False when it means nothing here. */
  use(dev: string | null, line: string): boolean;
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '');

export function sceneShell(host: SceneHost, print: (text: string, kind?: LineKind) => void): SceneShell {
  const m = host.model;
  const say = (l: LineData) => { if (l[1]) print(l[1], l[2] ?? 'out'); };
  /** The nouns you can reach on a device: not sealed. */
  const open = (dev: string) => (m.devices.get(dev)?.nouns ?? []).filter((n) => !n.sector || !m.sealed(dev, n.sector));
  const find = (dev: string, name: string) => open(dev).find((n) => n.id.toLowerCase() === name.toLowerCase());
  const run = (dev: string, n: Noun, verb: string) => host.typed(() => m.act(dev, n.id, verb));
  const verbOf = (n: Noun, words: string) => n.verbs.find((v) => squash(v) === squash(words));

  return {
    ls(dev) {
      const d = m.devices.get(dev);
      if (!d) return '(nothing)';
      const sealed = [...new Set(d.nouns.filter((n) => n.sector && m.sealed(dev, n.sector)).map((n) => n.sector!))];
      return [...open(dev).filter((n) => n.kind !== 'SEAL').map((n) => n.id), ...sealed.map((s) => '???(' + (m.sector(dev, s)?.label ?? s) + ')')].join('   ') || '(nothing)';
    },
    readable: (dev) => open(dev).filter((n) => n.verbs.includes('read')).map((n) => n.id),
    installable: (dev) => open(dev).filter((n) => n.verbs.includes('install')).map((n) => n.id),
    hasGuard: (dev) => open(dev).some((n) => n.kind === 'GUARD'),
    cat(dev, file) {
      const n = find(dev, file);
      if (!n) { print('cat: ' + (file || '<file>') + ': no such file', 'err'); return; }
      if (!n.verbs.includes('read')) { print('cat: ' + n.id + ' is not something you read. try: ' + n.verbs.join(', '), 'dim'); return; }
      run(dev, n, 'read');
    },
    login(dev, user, pass) {
      if (!user || !pass) { print('usage: login <user> <password>', 'dim'); return; }
      const g = open(dev).find((n) => n.kind === 'GUARD');
      if (!g) { say(m.line(('login.none.' + dev) in m.texts ? 'login.none.' + dev : 'login.none')); return; }
      const want = m.texts['login.user.' + dev];
      if (typeof want === 'string' && want.toLowerCase() !== user.toLowerCase()) {
        say(m.line(('login.baduser.' + dev) in m.texts ? 'login.baduser.' + dev : 'login.baduser', { user }));
        return;
      }
      host.typed(() => m.guess(dev, g.id, pass));
    },
    install(dev, name) {
      const n = find(dev, name);
      if (!n || !n.verbs.includes('install')) { print('install: no module named ' + (name || '?') + ' here.', 'err'); return; }
      run(dev, n, 'install');
    },
    use(dev, line) {
      if (!dev) return false;
      const words = line.trim().split(/\s+/);
      // use <noun> --<verb>   (the shell lines' own form)
      if (words[0].toLowerCase() === 'use' && words[1]) {
        const n = find(dev, words[1]), verb = n && verbOf(n, words.slice(2).join(' ').replace(/^--/, ''));
        if (!n) { print('use: ' + words[1] + ': no such thing here', 'err'); return true; }
        if (!verb) { print('use ' + n.id + ': try ' + n.verbs.map((v) => '--' + v.replace(/\s+/g, '-')).join(', '), 'dim'); return true; }
        run(dev, n, verb);
        return true;
      }
      // <verb> <noun>, or a verb some noun here has (scan, connect dispatch, open drawer)
      for (let i = words.length - 1; i >= 1; i--) {
        const n = find(dev, words.slice(i).join(' ')), verb = n && verbOf(n, words.slice(0, i).join(' '));
        if (n && verb) { run(dev, n, verb); return true; }
      }
      const hits = open(dev).map((n) => [n, verbOf(n, line)] as const).filter(([, v]) => v);
      if (hits.length === 1) { run(dev, hits[0][0], hits[0][1]!); return true; }
      return false;
    },
  };
}
