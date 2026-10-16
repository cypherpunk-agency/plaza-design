import {canonicalPaint} from './canonical-paint.mts';
import assert from 'node:assert/strict';
import originalModule from '../../../../.scene-system/baseline/source/ssg/game/title/glide';
import { drawGlide as moved } from '../../src/ssg/game/art/sequences/opening/glide';
import { renderOpeningSequence } from '../../src/ssg/game/art/sequences/opening/sequence';
import { openingDocuments } from '../../src/ssg/game/story/title/documents';
import cutsceneModule from '../../../../.scene-system/baseline/source/ssg/game/cutscenes/index';
import cityModule from '../../../../.scene-system/baseline/source/ssg/game/city';
import { CutscenePlay, CUTSCENES } from '../../src/ssg/game/story/cutscenes';
import { drawFlight } from '../../src/ssg/game/art/sequences/taxi-flight';
const original = originalModule.drawGlide;
(globalThis as unknown as { document: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => recorder().ctx }) };

function recorder() {
  const commands: unknown[][] = []; let gradient = 0;
  const values: Record<string, unknown> = { globalAlpha: 1, lineWidth: 1, font: '', getTransform: () => ({ a: 2 }), measureText: (value: string) => ({ width: value.length * 6 }) };
  const ctx = new Proxy(values, { get(target, key: string) {
    if (key in target) return target[key];
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return (...args: unknown[]) => { const id = ++gradient; commands.push([key, ...args, id]); return { id, addColorStop: (...xs: unknown[]) => commands.push(['stop', id, ...xs]) }; };
    return (...args: unknown[]) => { commands.push([key, ...args]); };
  }, set(target, key: string, value) { target[key] = value; commands.push(['set', key, value]); return true; } }) as unknown as CanvasRenderingContext2D;
  return { ctx, commands };
}
for (const reduced of [false, true]) for (const tau of [null, 0, 20, 62, 75, 78.5]) {
  const t = tau === null ? reduced ? 7 : 0 : 7 + tau;
  const a = recorder(), b = recorder(), c = recorder();
  original(a.ctx, { W: 640, H: 360, reduced }, t, tau);
  moved(b.ctx, { W: 640, H: 360, reduced }, t, tau);
  renderOpeningSequence(c.ctx, { W: 640, H: 360, reduced }, openingDocuments, tau === null ? 'title' : 'glide', tau ?? t, { ambientTime: t });
  const first = (x: unknown[][], y: unknown[][]) => { const i = x.findIndex((value, i) => JSON.stringify(value) !== JSON.stringify(y[i])); return { index: i, original: x.slice(Math.max(0, i - 2), i + 3), current: y.slice(Math.max(0, i - 2), i + 3), lengths: [x.length, y.length] }; };
  if (JSON.stringify(canonicalPaint(a.commands)) !== JSON.stringify(canonicalPaint(b.commands))) { console.log('native mismatch', reduced, tau, first(a.commands, b.commands)); process.exitCode = 1; break; }
  if (JSON.stringify(canonicalPaint(a.commands)) !== JSON.stringify(canonicalPaint(c.commands))) { console.log('composed mismatch', reduced, tau, JSON.stringify(first(canonicalPaint(a.commands), canonicalPaint(c.commands)),null,2)); process.exitCode = 1; break; }
}
assert.equal(process.exitCode ?? 0, 0); console.log('Opening effective paint commands/transforms match original at bounded native/composed frames (independent kernel scopes permitted).');
for (const id of ['intro', 'act2']) for (const reduced of [false, true]) {
  for (const time of [0, 1 / 60, 0.8, 1.2, 2.6, 5.4, 6, 7.6, 10, 13.5, 15.4, 16, ...(id === 'intro' ? [17.5, 24.5, 26] : [])]) {
    const a = recorder(), b = recorder();
    const oldPlay = new cutsceneModule.CutscenePlay(cutsceneModule.CUTSCENES[id], { reduced, touch: false }); oldPlay.t = time; oldPlay.draw(a.ctx, 640, 360);
    const newPlay = new CutscenePlay(CUTSCENES[id as 'intro' | 'act2'], { reduced, touch: false }); newPlay.t = time; newPlay.draw(b.ctx, 640, 360);
    if (JSON.stringify(a.commands) !== JSON.stringify(b.commands)) {
      const index = a.commands.findIndex((v, i) => JSON.stringify(v) !== JSON.stringify(b.commands[i])); console.log('cutscene mismatch', id, reduced, time, index, a.commands.slice(index, index + 3), b.commands.slice(index, index + 3)); process.exitCode = 1; break;
    }
  }
}
for (const progress of [0, 0.1, 0.15, 0.5, 0.85, 0.9, 1]) {
  const a = recorder(), b = recorder(), ambient = 1240 + progress * 200;
  cityModule.drawFlight(a.ctx, 640, 360, progress, ambient, 'DOWNTOWN'); drawFlight(b.ctx, 640, 360, progress, ambient, 'DOWNTOWN');
  if (JSON.stringify(a.commands) !== JSON.stringify(b.commands)) { const index = a.commands.findIndex((v, i) => JSON.stringify(v) !== JSON.stringify(b.commands[i])); console.log('taxi mismatch', progress, index, a.commands.slice(index, index + 3), b.commands.slice(index, index + 3)); process.exitCode = 1; break; }
}
assert.equal(process.exitCode ?? 0, 0); console.log('Cutscene and taxi command traces match at bounded cards/fades/arrival boundaries.');
