import fs from 'node:fs';
import { art } from '../../src/ssg/game/art';
import { SETS } from '../../src/ssg/game/art/catalog';
import { sourceDocuments } from '../../src/ssg/game/authoring/source-documents';
import { assetInventory } from '../../src/ssg/game/authoring/asset-browser';
const documents = sourceDocuments.map(doc => ({ id: doc.id, kind: doc.kind, revision: 'inventory', value: JSON.parse(fs.readFileSync(`src/ssg/game/${doc.file}`, 'utf8')) }));
const entries = assetInventory(art, documents);
const inventory = { version: 1, milestone: 'S8', source: 'd619294', registered: entries.map(({ id, family, tags, preview, usages }) => ({ id, family, tags, preview, usages: usages.map(({ document, instance, path }) => ({ document, instance, path })) })),
  embeddedSets: SETS.map(({ id, file, what }) => ({ id, file, description: what, support: 'embedded-library-component; inspect registered assembly usages; no independent registered element' })),
  documents: documents.map(doc => ({ id: doc.id, kind: doc.kind })) };
const target = 'src/ssg/game/authoring/inventories/S8.json'; fs.mkdirSync('src/ssg/game/authoring/inventories', { recursive: true });
fs.writeFileSync(target, JSON.stringify(inventory, null, 2) + '\n');
console.log(JSON.stringify({ registered: entries.length, families: [...new Set(entries.map(e => e.family))], usages: entries.reduce((n, e) => n + e.usages.length, 0), embeddedSets: SETS.length, documents: documents.length }));
