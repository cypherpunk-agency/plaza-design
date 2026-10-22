/**
 * The state a level hands its pieces (engine/level.ts `levelVisualState`: lift cars and doors, call buttons, room openness)
 * must be declared by each piece's artwork, or the scene fails to draw ('unknown property'). Every scene and proposal frame
 * with a level is resolved from its real composition, and each piece's state, resting and as seen from each floor,
 * goes through the art registry's own validation.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {art} from '../../src/ssg/game/art';
import {resolveComposition, type Composition, type Instance} from '../../src/ssg/game/art/core/composition';
import {compileLevel, levelVisualState, restingLevelView} from '../../src/ssg/game/engine/level';

const root = 'src/ssg/game';
const files = [
  ...fs.readdirSync(path.join(root, 'scenes'), {withFileTypes: true}).filter(d => d.isDirectory()).map(d => path.join(root, 'scenes', d.name, 'composition.json')),
  ...fs.readdirSync(path.join(root, 'art/proposals')).filter(n => n.endsWith('.composition.json')).map(n => path.join(root, 'art/proposals', n)),
].filter(f => fs.existsSync(f));
// bindings are the scene's runtime sources; the level's state does not depend on them
const unbind = (nodes: Instance[]): Instance[] => nodes.map(({bindings: _, children, ...n}) => ({...n, ...(children ? {children: unbind(children)} : {})}) as Instance);
let scenes = 0, pieces = 0;
for (const file of files) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as Composition;
  const rows = resolveComposition(art, {...doc, instances: unbind(doc.instances)}, {view: {t: 0} as never, state: {}, reduced: true});
  const source = compileLevel(rows);
  if (!source) continue;
  scenes++;
  const type = new Map(rows.map(r => [r.instance.id, r.instance.type]));
  const views = [restingLevelView(source, true), restingLevelView(source, false), ...source.floors.map(f => restingLevelView(source, false, f.id))];
  for (const view of views) for (const [id, state] of Object.entries(levelVisualState(view))) {
    const t = type.get(id);
    assert.ok(t, `${file}: level state for a piece that is not in the composition: ${id}`);
    assert.doesNotThrow(() => art.visualProperties(t!, state), undefined, `${file}: ${id} (${t}) does not declare the level's state ${Object.keys(state).join(', ')}`);
    pieces++;
  }
}
assert.ok(scenes > 3, 'level scenes were found');
console.log(`Level visual state PASS: ${scenes} level scenes and frames; every lift, button and room declares the state the level hands it (${pieces} checks).`);
