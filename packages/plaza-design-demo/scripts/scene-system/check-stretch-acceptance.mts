/** Verify the recorded finite F1-F6 gates; never regenerate evidence or publish. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const demo = path.resolve('.'), game = path.join(demo, 'src/ssg/game');
const sha = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files = ['S8-acceptance.json', 'S9-acceptance.json', 'S10-acceptance.json', 'S11-acceptance.json', 'S12.acceptance.json', 'S13.acceptance.json'];
const gates = files.map((file, index) => {
  const report = JSON.parse(fs.readFileSync(path.join(game, 'authoring/inventories', file), 'utf8'));
  assert.equal(report.gate, `F${index + 1}`);
  if (index < 4) assert.equal(report.status, 'PASS');
  const pins = report.sourcePinsAtAcceptance ?? report.sourcePins;
  assert.ok(Object.keys(pins).length > 0, 'Missing source pins');
  for (const [file, expected] of Object.entries(pins)) assert.equal(sha(path.join(index < 4 ? demo : game, file)), expected, `${report.gate}: stale ${file}`);
  if (index === 4) for (const [key, value] of Object.entries(report.browser)) assert.equal(value, true, `F5 browser: ${key}`);
  if (index === 5) {
    assert.equal(report.browser.actualUiSave, true); assert.equal(report.browser.staleRevisionStatus, 409); assert.equal(report.browser.unsupportedRewardStatus, 422);
    assert.equal(report.restoration.byteExactSandbox, true); assert.equal(report.restoration.all26RevisionsMatchOriginalRootCapture, true);
  }
  return { gate: report.gate, milestone: report.milestone, sourcePins: Object.keys(pins).length };
});
await import('./check-event-inspector-acceptance.mts');
await import('./check-behavior-acceptance-manifest.mts');
const root = path.resolve(demo, '../..');
const shipping = ['art', 'scenes', 'data', 'runtime', 'world', 'story'].map(dir => `packages/plaza-design-demo/src/ssg/game/${dir}`);
execFileSync('git', ['diff', '--quiet', 'd619294', '--', ...shipping], { cwd: root });
assert.equal(execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...shipping], { cwd: root, encoding: 'utf8' }).trim(), '', 'Unexpected untracked shipping source');
console.log(JSON.stringify({ status: 'PASS', gates, shippingArtworkSceneDataWorldAndStoryUnchanged: true, scope: 'Recorded finite acceptance and current source pins; does not rerun browser comparisons or a campaign playthrough.' }));
