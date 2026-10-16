import fs from 'node:fs';
import { build } from 'esbuild';
import { sourceDocuments } from '../../src/ssg/game/authoring/source-documents';
const output = '../../.scene-system/fixture'; fs.mkdirSync(output, { recursive: true });
const documents = sourceDocuments.map(doc => ({ id: doc.id, kind: doc.kind, revision: 'fixture', value: JSON.parse(fs.readFileSync(`src/ssg/game/${doc.file}`, 'utf8')) }));
fs.writeFileSync(`${output}/s8-documents.json`, JSON.stringify(documents));
await build({ entryPoints: ['scripts/scene-system/asset-browser-fixture.ts'], bundle: true, format: 'esm', outfile: `${output}/s8-assets.js` });
console.log('S8 fixture ready; import /s8-assets.js and fetch /s8-documents.json from the loopback fixture host.');
