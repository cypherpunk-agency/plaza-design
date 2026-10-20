/** Current lighting frame ownership: no collector or shadow-policy leakage. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { addLight, castShadow, createLightingFrame, drawGrade, drawShade } from '../../src/ssg/game/art/atmosphere/lighting';
import { frameView } from '../../src/ssg/game/art/core/view';
import { lightAt, smooth, windowLit, type Light } from '../../src/ssg/game/world/light';
function paint(draw: (context: CanvasRenderingContext2D) => void) {
  const commands: unknown[][] = [];
  const context = new Proxy({}, { set(_object, key, value) { commands.push(['set', String(key), value]); return true; },
    get(_object, key) { return (...args: unknown[]) => { commands.push([String(key), ...args]); }; } }) as CanvasRenderingContext2D;
  draw(context); return commands;
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
console.log('Lighting frame collectors and shadow-enable state remain isolated.');
