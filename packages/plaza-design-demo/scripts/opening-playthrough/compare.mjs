// node scripts/opening-playthrough/compare.mjs <before/trace.json> <after/trace.json>
// Compares two recorded playthroughs beat by beat. HARD fields must match exactly; SOFT fields (timing-dependent: the hint lane,
// the running clock, the player's x, the terminal tail, pings) are reported as notes. Exit 1 when a hard field differs.
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const hard = [], soft = [];
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const sorted = v => (v ? [...v].sort() : v);
const minutes = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
if (a.length !== b.length) hard.push(`beat count ${a.length} vs ${b.length}`);
for (let i = 0; i < Math.min(a.length, b.length); i++) {
  const x = a[i], y = b[i], at = `#${x.n} ${x.name}`;
  if (x.name !== y.name) { hard.push(`${at}: beat name ${y.name}`); continue; }
  for (const k of ['here', 'phase', 'goal', 'gate', 'acknowledging', 'popup', 'pingShown', 'jackChip']) if (!same(x[k], y[k])) hard.push(`${at}: ${k}: ${JSON.stringify(x[k])} -> ${JSON.stringify(y[k])}`);
  if (!same(x.flags, y.flags)) hard.push(`${at}: flags differ: ${JSON.stringify(Object.keys(x.flags).filter(f => !(f in y.flags)))} only before, ${JSON.stringify(Object.keys(y.flags).filter(f => !(f in x.flags)))} only after`);
  if (!same(x.bubble, y.bubble)) hard.push(`${at}: bubble ${JSON.stringify(x.bubble)} -> ${JSON.stringify(y.bubble)}`);
  if (!same(x.said, y.said)) hard.push(`${at}: said ${JSON.stringify(x.said)} -> ${JSON.stringify(y.said)}`);
  if (!same(x.prompt, y.prompt)) hard.push(`${at}: prompt ${JSON.stringify(x.prompt)} -> ${JSON.stringify(y.prompt)}`);
  if (!same(x.card, y.card)) hard.push(`${at}: card ${JSON.stringify(x.card)} -> ${JSON.stringify(y.card)}`);
  if (!same(sorted(x.captions), sorted(y.captions))) hard.push(`${at}: captions ${JSON.stringify(x.captions)} -> ${JSON.stringify(y.captions)}`);
  if (!same(sorted(x.chips), sorted(y.chips))) hard.push(`${at}: chips ${JSON.stringify(x.chips)} -> ${JSON.stringify(y.chips)}`);
  if (!same(sorted(x.targets), sorted(y.targets))) hard.push(`${at}: targets ${JSON.stringify(sorted(x.targets))} -> ${JSON.stringify(sorted(y.targets))}`);
  // the clock: pinned minutes are exact; a running clock may drift with wall time
  if (x.clock.pinned !== null || y.clock.pinned !== null) { if (x.clock.pinned !== y.clock.pinned) hard.push(`${at}: clock pin ${x.clock.pinned} -> ${y.clock.pinned}`); else if (x.clock.text !== y.clock.text) hard.push(`${at}: clock ${x.clock.text} -> ${y.clock.text}`); }
  else if (Math.abs(minutes(x.clock.text) - minutes(y.clock.text)) > 4) hard.push(`${at}: running clock ${x.clock.text} -> ${y.clock.text}`);
  else if (x.clock.text !== y.clock.text) soft.push(`${at}: running clock ${x.clock.text} -> ${y.clock.text}`);
  for (const k of ['hint', 'term']) if (!same(x[k], y[k])) soft.push(`${at}: ${k} ${JSON.stringify(x[k]).slice(0, 90)} -> ${JSON.stringify(y[k]).slice(0, 90)}`);
  if (x.pings !== y.pings) soft.push(`${at}: pings ${x.pings} -> ${y.pings}`);
  if (Math.abs(x.player.x - y.player.x) > 6) soft.push(`${at}: player x ${x.player.x} -> ${y.player.x}`);
  if (x.pingAfterS !== undefined && Math.abs(x.pingAfterS - y.pingAfterS) > 3) soft.push(`${at}: idle ping after ${x.pingAfterS}s -> ${y.pingAfterS}s`);
}
console.log(`compared ${Math.min(a.length, b.length)} beats: ${hard.length} hard difference(s), ${soft.length} soft note(s)`);
for (const h of hard) console.log('HARD', h);
for (const s of soft) console.log('soft', s);
process.exit(hard.length ? 1 : 0);
