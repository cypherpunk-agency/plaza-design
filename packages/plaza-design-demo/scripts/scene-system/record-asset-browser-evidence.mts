/** Validate complete bounded F1 coverage and retain acceptance-time source pins. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve('../..'), evidence = path.join(root, '.scene-system/evidence');
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8'));
const comparison = read('S8-final-reset-hierarchy-images.json'), png = read('S8-final-reset-independent-png-verification.json'), ui = read('S8-final-reset-editor-operations.json');
assert.equal(comparison.status, 'PASS'); assert.equal(png.status, 'PASS'); assert.equal(ui.status, 'PASS');
assert.equal(comparison.defaults, 832); assert.equal(comparison.pairs.length, 40); assert.equal(png.pairs, 40);
assert.equal(new Set(comparison.pairs.map((row: { scene: string }) => row.scene)).size, 19);
for (const row of comparison.pairs) assert.equal(row.differences, 0);
const reports = [read('S8-final-reset-usage-previews.json')];
const rows = reports.flatMap(report => { assert.equal(report.status, 'PASS'); assert.equal(report.total, 582); return report.rows; });
assert.equal(rows.length, 582); assert.equal(new Set(rows.map(row => row.id)).size, 582);
for (const row of rows) assert.equal(row.differences, 0);
for (const key of ['exactUsageLink', 'retainedUsage', 'retainedZoom', 'sourceUnchanged', 'saveDisabled', 'playerStorageUnchanged']) assert.equal(ui[key], true, key);
assert.ok(ui.pixelsAt1x > 0 && ui.pixelsAt8x > ui.pixelsAt1x);
const files = [...['asset-browser.ts', 'asset-preview.ts', 'app.ts', 'native-preview.ts', 'native-camera.ts', 'entry.ts', 'styles.ts', 'inventories/S8.json'].map(file => `src/ssg/game/authoring/${file}`),
  ...['asset-browser-fixture.ts', 'build-asset-browser-fixture.mts', 'check-asset-browser.mts', 'check-asset-browser-ui.js', 'check-native-camera.mts', 'check-native-camera-bounds.mts', 'check-native-preview-clock.mts', 'check-native-preview-context.mts', 'verify-asset-browser-images.py'].map(file => `scripts/scene-system/${file}`)];
const sha = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const formatting = read('SOURCE-WHITESPACE-CLEANUP.json');
assert.equal(formatting.byteIdenticalExecutedBundles, true);
assert.equal(formatting.bundlesAfter['fixture/s8-assets.js'], sha(path.join(root, '.scene-system/fixture/s8-assets.js')));
const formattedPins = Object.fromEntries(files.filter(file => formatting.files[file]).map(file => {
  const change = formatting.files[file]; assert.equal(change.normalizationOnly, true); assert.equal(sha(file), change.afterSha256);
  return [file, { capturedSourceSha256: change.beforeSha256, finalSourceSha256: change.afterSha256 }];
}));
const result = { milestone: 'S8', gate: 'F1', status: 'PASS', baseline: 'd619294',
  coverage: { registered: 832, placements: 1938, embeddedComponents: 18, nativeSceneTypesReplayed: 582, invisibleAtChosenSnapshot: rows.filter(row => !row.pixels).length,
    hierarchyPixelPairs: 40, pngImages: 80, nativeScenes: 19, pixelChannelDifferences: 0 },
  evidence: ['S8-final-reset-hierarchy-images.json', 'S8-final-reset-independent-png-verification.json', 'S8-final-reset-editor-operations.json', 'S8-final-reset-usage-previews.json', 'native-preview-frozen-clock-contract.json', 'native-preview-context-history-contract.json', 'S11-native-camera-guardrails.json'],
  previewBundleSha256: sha(path.join(root, '.scene-system/fixture/s8-assets.js')),
  finalIntegration: 'Fresh final-source hierarchy images, complete native type replay and actual mounted browser operations. Browser readback mode is fixed and warmed before repeat comparisons; private preview simulation time is frozen before source state overlays. Historical acceptance artifacts remain retained.',
  sourcePinsAtAcceptance: Object.fromEntries(files.map(file => [file, sha(file)])),
  formattingVerification: { certificate: 'SOURCE-WHITESPACE-CLEANUP.json', byteIdenticalExecutedBundles: true, changedSourcePins: formattedPins,
    explanation: 'After capture, only trailing horizontal whitespace and EOF blank lines were removed. The rebuilt executed asset fixture and composer bundles are byte-identical. Captured source hashes are retained here; current acceptance pins describe final formatting.' },
  scope: 'Frozen bounded support matrix; native isolated registered passes. Cinematic-only pieces retain explicit context-required support and open their actual source sequence. No assertion of all theoretical states or isolated scene-grade parity.' };
fs.writeFileSync('src/ssg/game/authoring/inventories/S8-acceptance.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, ...result.coverage }));
