// node scripts/opening-playthrough/summary.mjs <trace.json>: one line per beat.
import fs from 'node:fs';
const t = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const b of t) {
  console.log(String(b.n).padStart(2), b.name.padEnd(26), b.here.padEnd(8), b.phase.padEnd(8), b.clock.text, b.clock.pinned === null ? 'run' : 'pin',
    '| goal:', b.goal ?? '-', '| bubble:', b.bubble ? b.bubble.text.slice(0, 50) : '-', '| said:', b.said ? b.said.length : '-',
    '| prompt:', b.prompt?.id ?? '-', '| gate:', b.gate ?? '-', '| card:', b.card ? b.card.stage + '/' + b.card.text : '-', '| ack:', b.acknowledging ? b.acknowledging.slice(0, 30) : '-',
    '| caps:', JSON.stringify(b.captions), '| chips:', JSON.stringify(b.chips), '| pings:', b.pings, '| flags:', Object.keys(b.flags).length);
}
