/** Compare real shade/shadow paint against the immutable original, then test frame isolation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { addLight, castShadow, createLightingFrame, drawGrade, drawShade } from '../../src/ssg/game/art/atmosphere/lighting';
import { frameView } from '../../src/ssg/game/art/core/view';
import { lightAt, smooth, windowLit, type Light } from '../../src/ssg/game/world/light';
const root = path.resolve('../..');
const originalFile = path.join(root, '.scene-system/baseline/source/ssg/game/sets/lighting.ts');
let selected: Light = lightAt(1, 580, 90, null);
const original: Record<string, (...args: any[]) => any> = {};
const compiled = ts.transpileModule(fs.readFileSync(originalFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', 'require', compiled)(original, () => ({ light: () => selected, smooth, windowLit: (seed: number, lighting = selected) => windowLit(seed, lighting) }));
function paint(draw: (context: CanvasRenderingContext2D) => void) {
  const commands: unknown[][] = [];
  const context = new Proxy({}, { set(_object, key, value) { commands.push(['set', String(key), value]); return true; },
    get(_object, key) { return (...args: unknown[]) => { commands.push([String(key), ...args]); }; } }) as CanvasRenderingContext2D;
  draw(context); return commands;
}
let cases = 0;
for (const minute of [0, 360, 580, 720, 1200]) for (const facing of [0, 90, 180, 270]) for (const outdoor of [false, true]) for (const shaded of [false, true]) for (const shadows of [false, true]) {
  selected = lightAt(1, minute, facing, null, outdoor);
  const shade = shaded ? { front: { h: 100, gaps: [[80, 130]] as [number, number][] }, back: { h: 150 }, depth: 60 } : undefined;
  const lamps = [{ x: 180, h: 90, kind: 'lamp' as const }];
  original.prepareLights(lamps); original.prepareShade(shade, 900, selected); original.shadowsOn(shadows);
  const view = { ...frameView(137, selected), sx: (x: number) => Math.round(x - 40), y: (h: number) => 306 - h, cam: 40, gy: 306, viewW: 640, viewH: 360,
    illumination: createLightingFrame(selected, lamps, shade, 900, shadows) };
  const draw = (kernel: typeof original) => paint(context => {
    kernel.drawGrade(context, view, selected);
    for (const x of [30, 100, 190, 400]) for (const foot of [0, 30]) kernel.castShadow(context, view, x, 48, 14, foot, 1, .2);
    kernel.drawShade(context, view);
  });
  assert.deepEqual(draw({ drawGrade, castShadow, drawShade }), draw(original), `original lighting: minute=${minute}, facing=${facing}, outdoor=${outdoor}, shade=${shaded}, shadows=${shadows}`);
  cases++;
}
const dawn = frameView(0, lightAt(1, 380, 90, null)), night = frameView(0, lightAt(1, 1200, 270, null));
const before = structuredClone(night.illumination);
addLight(dawn, { x: 40, h: 20, kind: 'screen' });
assert.deepEqual(night.illumination, before, 'drawing into one frame cannot add lamps to another frame');
assert.equal(dawn.illumination.extra.length, 1);
assert.equal(frameView(0).illumination.extra.length, 0, 'each standalone frame starts with its own collector');
const isolatedPaint = paint(context => castShadow(context, night, 190, 48, 14));
dawn.illumination.shadows = true;
assert.deepEqual(paint(context => castShadow(context, night, 190, 48, 14)), isolatedPaint, 'shadow enable state cannot leak between frames');
fs.writeFileSync(path.join(root, '.scene-system/evidence/S7-lighting-context-contracts.json'), JSON.stringify({ originalPaintCases: cases, isolatedCollectors: true, isolatedShadowEnable: true, originalSource: originalFile }, null, 2));
console.log(`Lighting context checks passed: ${cases} exact original grade/shade/shadow cases; independent frame collectors and shadow state.`);
