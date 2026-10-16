/** Recoverable, content-hashed local checkpoint; never overwrites an existing checkpoint. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const name = process.argv[2];
if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Supply a checkpoint name');
const root = path.resolve('../..');
const target = path.join(root, '.scene-system/checkpoints', name);
if (fs.existsSync(target)) throw new Error(`Checkpoint already exists: ${name}`);
fs.mkdirSync(target, { recursive: true });
const source = path.join(root, 'packages/plaza-design-demo/src/ssg');
fs.cpSync(source, path.join(target, 'source/ssg'), { recursive: true });
fs.cpSync(path.join(root, 'packages/plaza-design-demo/scripts/scene-system'), path.join(target, 'scripts'), { recursive: true });
const diff = fs.openSync(path.join(target, 'working.diff'), 'wx');
try { execFileSync('git', ['-c', 'core.safecrlf=false', 'diff', '--binary'], { cwd: root, stdio: ['ignore', diff, 'pipe'] }); }
finally { fs.closeSync(diff); }
const hashes: Record<string, string> = {};
function walk(dir: string) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p); else hashes[path.relative(target, p).replaceAll('\\', '/')] = createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  }
}
walk(target);
fs.writeFileSync(path.join(target, 'checkpoint.json'), JSON.stringify({ name, head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(), files: hashes }, null, 2));
console.log(`Checkpoint retained: ${target}`);
