import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import assert from 'node:assert/strict';
const root = path.resolve('../..');
const dir = path.join(root, 'packages/plaza-design-demo/src/ssg/game');
function load(file: string, name: string) {
  const text = fs.readFileSync(file, 'utf8'), source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const klass = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name) as ts.ClassDeclaration;
  const methods = new Map(klass.members.filter(ts.isMethodDeclaration).map(m => [m.name.getText(source), m.body!.getText(source).replaceAll('\r', '')]));
  return { source, methods };
}
const original = load(path.join(root, '.scene-system/baseline/source/ssg/game/game.ts'), 'Game');
const current = load(path.join(dir, 'runtime/game.ts'), 'Game');
const artwork = load(path.join(dir, 'art/assemblies/downtown.ts'), 'DowntownArtwork');
const moved = ['drawSkyline','drawAntenna','winsFor','neon','drawFronts','drawAlley','drawDoors','drawFront','drawWindow','drawBay','plate','drawStall','drawStreet','drawStallPeople'];
for (const name of moved) {
  assert.equal(artwork.methods.get(name), original.methods.get(name), `${name}: drawing body changed`);
  assert.ok(!current.methods.has(name), `${name}: Downtown drawing remains in Game`);
}
const unchanged = [];
for (const [name, body] of original.methods) if (!moved.includes(name) && !['drawWorld','drawCharacters'].includes(name)) {
  assert.equal(current.methods.get(name), body, `${name}: unrelated runtime behavior changed`);
  unchanged.push(name);
}
const evidence = { movedVerbatim: moved, unaffectedRuntimeMethods: unchanged,
  orchestrationChanges: ['drawWorld supplies current view and calls extracted methods', 'drawCharacters delegates Downtown stall people'],
  note: 'Body comparison supplements pixel checks; it does not replace runtime behavior checks for later migrations.' };
fs.writeFileSync(path.join(root, '.scene-system/evidence/S2-body-equivalence.json'), JSON.stringify(evidence, null, 2));
console.log(`Verified ${moved.length} verbatim drawing bodies and ${unchanged.length} unchanged runtime methods.`);
