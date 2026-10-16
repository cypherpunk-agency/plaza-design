import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {characterWorkbenchCases} from '../../src/ssg/game/authoring/character-workbench';
const read=(name:string)=>JSON.parse(fs.readFileSync(`../../.scene-system/evidence/${name}`,'utf8'));
const cases=characterWorkbenchCases(),normal=read('S9-character-v3-normal.json'),reduced=read('S9-character-v3-reduced.json'),visible=read('S9-character-v3-visible-output.json'),png=read('S9-v3-independent-png-verification.json'),ui=read('S9-v3-editor-operations.json');
assert.equal(cases.length,2286);
for(const report of [normal,reduced]){assert.equal(report.status,'PASS');assert.equal(report.total,cases.length);assert.deepEqual(report.results.map((r:{id:string})=>r.id),cases.map(c=>c.id));for(const row of report.results){assert.equal(row.differentPixels,0);assert.equal(row.originalHash,row.candidateHash);}}
assert.equal(visible.status,'PASS');assert.equal(visible.total,cases.length);assert.ok(visible.minimumArtworkPixels>0);assert.equal(png.status,'PASS');assert.equal(png.pairs,438);assert.equal(png.images,876);
assert.equal(ui.status,'PASS');for(const key of ['reducedHoldsNativeTime','appearanceReachesNativeSnapshot','nativeCarry','playAdvances','pauseHolds','sourceUnchanged','playerStorageUnchanged'])assert.equal(ui[key],true);
const files=['src/ssg/game/authoring/character-workbench.ts','src/ssg/game/authoring/workbench-playback.ts','src/ssg/game/authoring/inventories/S9.json','scripts/scene-system/character-workbench-fixture.ts','scripts/scene-system/check-character-workbench.mts'];
const sha=(file:string)=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const acceptance={milestone:'S9',gate:'F2',status:'PASS',coverage:{families:33,normalCases:2286,reducedCases:2286,retainedPixelPairs:438,retainedImages:876,environmentCases:24,minimumVisibleArtworkPixels:visible.minimumArtworkPixels,channelDifferences:0},
 evidence:['S9-character-v3-normal.json','S9-character-v3-reduced.json','S9-character-v3-visible-output.json','S9-v3-images-{0,100,200,300,400}.json','S9-v3-environment-images.json','S9-v3-independent-png-verification.json','S9-v3-editor-operations.json'],
 sourcePinsAtAcceptance:Object.fromEntries(files.map(file=>[file,sha(file)])),fixtureBundleSha256:sha('../../.scene-system/fixture/s9-characters.js'),
 scope:'Frozen independent appearance axes and supported family/action/variant/facing/time matrix; actual prepared/native renderers. Pixel random autonomous controller excluded; supplied pose/particle snapshots. Reduced motion explicitly holds effective preview time rather than inventing per-action support. No player/world/source writes.'};
fs.writeFileSync('src/ssg/game/authoring/inventories/S9-acceptance.json',JSON.stringify(acceptance,null,2)+'\n');console.log(JSON.stringify({status:acceptance.status,...acceptance.coverage}));
