// Helpers to drive ACCESS DENIED through its read-only `?probe` handle (window.__game.probe(), runtime/game.ts probeFrame).
// Nothing here reaches into the game: it presses keys, watches the snapshot, and records beats.
import fs from 'node:fs';
import path from 'node:path';
import { sleep } from './cdp.mjs';

export const SOFT = new Set(['hint', 'term', 'player', 'targets', 'clockSoft']);

export function driver(b, outDir) {
  const beats = [];
  const d = {
    beats,
    async probe() { return JSON.parse(await b.eval('JSON.stringify(window.__game.probe())')); },
    /** Poll until pred(snapshot) holds; throws with the last snapshot after `timeout` ms (wall time). */
    async until(label, pred, timeout = 30000, every = 80) {
      const t0 = Date.now(); let p;
      for (;;) {
        p = await d.probe();
        if (pred(p)) return p;
        if (Date.now() - t0 > timeout) throw new Error('timeout waiting for ' + label + ' at ' + JSON.stringify({ here: p.here, phase: p.phase, bubble: p.bubble?.text, prompt: p.prompt?.label, x: p.player.x, gate: p.gate, card: p.card, clock: p.clock.text }));
        await sleep(every);
      }
    },
    /** Hold an arrow until the player is within `tol` of x (or stop when a talk bubble closes us in). */
    async walkTo(x, { tol = 3, timeout = 60000 } = {}) {
      const t0 = Date.now(); let key = null;
      try {
        for (;;) {
          const p = await d.probe(); const dx = x - p.player.x;
          if (Math.abs(dx) <= tol) return p;
          const want = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
          if (want !== key) { if (key) await b.keyUp(key); key = want; await b.keyDown(key); }
          if (Date.now() - t0 > timeout) throw new Error('walkTo ' + x + ' timed out at ' + p.player.x);
          // a fine approach: short taps near the target so we do not overshoot (1.3 px/frame)
          if (Math.abs(dx) < 14) { await b.keyUp(key); key = null; await b.keyDown(want); await sleep(Math.abs(dx) < 6 ? 25 : 60); await b.keyUp(want); await sleep(80); }
          else await sleep(40);
        }
      } finally { if (key) await b.keyUp(key); }
    },
    /** DOM texts the player sees besides the canvas: device captions, the open popup's chips, pings. */
    async dom() { return JSON.parse(await b.eval(`JSON.stringify({captions:[...document.querySelectorAll('.fx-cap')].filter(e=>e.offsetParent!==null&&!e.hidden).map(e=>e.textContent.trim()),chips:[...document.querySelectorAll('.thing-item')].filter(e=>e.offsetParent!==null).map(e=>e.textContent.trim()),pings:[...document.querySelectorAll('.fx-ping')].filter(e=>e.offsetParent!==null).length})`)); },
    /** Click a popup chip by (part of) its label, like a tap on it. */
    async chip(label) { const ok = await b.eval(`(()=>{const e=[...document.querySelectorAll('.thing-item')].filter(e=>e.offsetParent!==null).find(e=>e.textContent.includes(${JSON.stringify(label)}));if(!e)return false;e.click();return true})()`); if (!ok) throw new Error('no popup chip ' + label + ': ' + JSON.stringify((await d.dom()).chips)); await sleep(200); },
    /** Close a popup that is still open (a chip usually closes it itself; Esc on nothing would open the deck). */
    async closePopup(b2) { await sleep(300); if ((await d.probe()).popup) { await b2.tap('Escape'); await d.until('popup closed', p => !p.popup && !p.menu, 4000, 80); } },
    /** Hold an arrow until pred(snapshot) holds, crossing zone boundaries (x is local to each zone). Talk bubbles that open on
     *  the way are read and attached to the next beat. Throws with the last snapshot after `timeout` ms. */
    async walkUntil(key, label, pred, timeout = 60000) {
      const t0 = Date.now(); let p;
      await b.keyDown(key);
      try {
        for (;;) {
          p = await d.probe();
          if (pred(p)) return p;
          if (p.bubble) { await b.keyUp(key); d.pending.push(...await d.readBubbles()); await b.keyDown(key); }
          if (Date.now() - t0 > timeout) throw new Error('walking ' + key + ' timed out before ' + label + ' at ' + JSON.stringify({ here: p.here, x: p.player.x, goal: p.goal, targets: p.targets.map(t => t.id) }));
          await sleep(80);
        }
      } finally { await b.keyUp(key); }
    },
    /** Walk in a direction until a target with this id is listed, then stand on it. */
    async find(key, id, timeout) { await d.walkUntil(key, id, p => p.targets.some(t => t.id === id), timeout); return d.goTo(id); },
    /** Lines read while walking, attached to the next recorded beat as `said`. */
    pending: [],
    /** Fail with a readable message unless the current snapshot satisfies pred. */
    async expect(label, pred) { const p = await d.probe(); if (!pred(p)) throw new Error('expected ' + label + ', got ' + JSON.stringify({ here: p.here, phase: p.phase, goal: p.goal, prompt: p.prompt?.id })); return p; },
    async target(id) { const p = await d.probe(); return p.targets.find(t => t.id === id); },
    /** Walk to a target of the scene by id and stand on it. */
    async goTo(id, opts) { const t = await d.target(id); if (!t) throw new Error('no target ' + id + ' in ' + (await d.probe()).here); return d.walkTo(t.x, opts); },
    /** Press E on whatever is nearest (checks the nearest prompt is the wanted id). */
    async use(id) {
      await d.goTo(id); await sleep(120);
      const p = await d.probe();
      if (p.prompt?.id !== id) throw new Error('nearest is ' + JSON.stringify(p.prompt) + ', wanted ' + id);
      await b.tap('e'); await sleep(150);
    },
    /** Read every page of the open bubble: record each page's text, advance with E. Returns the texts. */
    async readBubbles(limit = 30) {
      const seen = [];
      for (let i = 0; i < limit; i++) {
        let p = await d.probe();
        if (!p.bubble) { await sleep(150); p = await d.probe(); if (!p.bubble) break; }
        const name = p.bubble.name, page = p.bubble.page;
        // finish the typing (first E completes the text), record the page, then E goes on
        await d.until('bubble text complete', q => !q.bubble || q.bubble.full, 8000, 40);
        p = await d.probe(); if (!p.bubble) break;
        seen.push(name + ': ' + p.bubble.text);
        await b.tap('e'); await sleep(120);
        void page;
      }
      return seen;
    },
    /** Record the state as a beat: probe summary and a screenshot. `note` is free text (what the script just did). */
    async beat(name, note = '', extra = {}) {
      const p = await d.probe(), dom = await d.dom();
      const shot = String(beats.length + 1).padStart(2, '0') + '-' + name + '.png';
      await b.shot(path.join(outDir, shot));
      if (d.pending.length) { extra = { walkedPast: d.pending.splice(0), ...extra }; }
      const rec = { n: beats.length + 1, name, note, shot, here: p.here, phase: p.phase, flags: Object.fromEntries(Object.entries(p.flags).filter(([, v]) => v).sort(([a], [c]) => a < c ? -1 : 1)), clock: p.clock, bubble: p.bubble && { name: p.bubble.name, text: p.bubble.text }, prompt: p.prompt && { id: p.prompt.id, label: p.prompt.label }, goal: p.goal, hint: p.hint, gate: p.gate, card: p.card, acknowledging: p.acknowledging, popup: p.popup, captions: dom.captions, chips: dom.chips, pings: dom.pings, player: p.player, targets: p.targets.map(t => t.id), term: p.term, ...extra };
      beats.push(rec); console.log('beat', rec.n, name, '|', p.here, p.phase, p.clock.text, extra.said ? JSON.stringify(extra.said).slice(0, 120) : '');
      return rec;
    },
    save() { fs.writeFileSync(path.join(outDir, 'trace.json'), JSON.stringify(beats, null, 1)); },
  };
  return d;
}
