/**
 * One render path (AGENTS.md; ROADMAP item 0): only runtime/render-scene.ts assembles a frame. Everything else that draws
 * a frame (play, editor, cutscenes, the taxi flight, later the title glide) configures `renderWorldFrame` with a director.
 * Source rules over the game (comments and string literals stripped):
 *  1. the frame's clear and its slot ordering (clearWorld, beginLayeredFrame, flushLayeredSlot, flushLayeredDocs) are called
 *     only by the one frame;
 *  2. the frame's own passes (shade, casters, lights, weather in front/middle/sky, puddles, hack vision's muting) are called
 *     only by the one frame (artwork may still paint a window's sky or grade as part of a piece);
 *  3. a module that resets the canvas transform and paints compositions or scene backdrops goes through renderWorldFrame
 *     (or a director adapter that does), unless it is listed below as not a frame;
 *  4. the named second frame paths (the opening's) are referenced only by the temporary allow-list, which must shrink to
 *     empty as the title glide moves onto the one frame.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), game = path.resolve(here, '../../src/ssg/game');
const FRAME = 'runtime/render-scene.ts';
/** Where the frame's kernels are defined (not called). */
const DEFINES = new Set(['art/core/canvas.ts', 'art/core/composition.ts', 'art/atmosphere/lighting.ts', 'art/atmosphere/weather.ts', 'art/atmosphere/hack-vision.ts']);
/** Rule 3 exceptions that are not frames of the world, with why. */
const NOT_FRAMES: Record<string, string> = {
  'authoring/asset-preview.ts': 'one registered piece as an asset-browser thumbnail: no camera, zone, sky or passes',
};
/** TEMPORARY: the opening (title glide) and its callers, being moved onto renderWorldFrame (ROADMAP item 0 c). Must shrink to empty. */
const OPENING_ALLOW = [
  'art/sequences/opening/glide.ts',
  'art/sequences/opening/sequence.ts',
  'authoring/sequence-preview.ts',
  'authoring/vehicle-workbench.ts',
  'story/title/index.ts',
  'story/title/render.ts',
];
const SECOND_PATHS = /\b(renderOpeningSequence|renderOpeningDocument|openingFrame|nativeOpeningFrame|renderCinematicPicture|renderCinematicTransition)\b/;
const CLEAR = /\b(clearWorld|beginLayeredFrame|flushLayeredSlot|flushLayeredDocs)\s*\(/;
const PASSES = /\b(drawShade|drawCasters|drawLights|weatherFront|weatherMid|weatherSky|puddles|muteWorld)\s*\(/;
const ASSEMBLES = /\bsetTransform\s*\(/, PAINTS = /\b(drawComposition|drawCompositionSlot)\s*\(|\.drawBackdrop\s*\(/, ONE = /\b(renderWorldFrame|renderSequenceFrame)\s*\(/;

/** Source without comments and string literals (template literal text too; their expressions stay). */
function code(src: string) {
  let out = '', i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      i++;
      while (i < n && src[i] !== c) { if (src[i] === '\\') i++; else if (c === '`' && src[i] === '$' && src[i + 1] === '{') { let depth = 1; i += 2; const start = i; while (i < n && depth) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; } out += ' ' + src.slice(start, i - 1) + ' '; continue; } i++; }
      i++; out += '""'; continue;
    }
    out += c; i++;
  }
  return out;
}
const files: string[] = [];
const walk = (dir: string) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(path.relative(game, p).split(path.sep).join('/')); } };
walk(game);
const problems: string[] = [], seenAllowed = new Set<string>();
for (const file of files.sort()) {
  if (file === FRAME) continue;
  const src = code(fs.readFileSync(path.join(game, file), 'utf8'));
  const defines = DEFINES.has(file);
  const allowed = OPENING_ALLOW.includes(file) || file.startsWith('art/sequences/opening/');
  if (!defines && CLEAR.test(src)) problems.push(`${file}: clears the canvas or orders the frame's slots (${src.match(CLEAR)![1]}): only ${FRAME} assembles a frame`);
  if (!defines && PASSES.test(src)) problems.push(`${file}: calls a frame pass (${src.match(PASSES)![1]}): only ${FRAME} runs the passes; configure them with a FrameDirector`);
  if (ASSEMBLES.test(src) && PAINTS.test(src) && !ONE.test(src) && !NOT_FRAMES[file] && !allowed) problems.push(`${file}: sets the canvas transform and paints compositions without renderWorldFrame: draw the frame through it`);
  if (SECOND_PATHS.test(src)) { if (allowed) seenAllowed.add(file); else problems.push(`${file}: uses a second frame path (${src.match(SECOND_PATHS)![1]})`); }
}
for (const file of OPENING_ALLOW) if (!files.includes(file)) problems.push(`allow-list names a missing file: ${file} (remove it)`);
else if (!seenAllowed.has(file)) problems.push(`allow-list entry no longer needed: ${file} (remove it so the list shrinks)`);
const openingDir = files.filter(f => f.startsWith('art/sequences/opening/'));
console.log(`Temporary allow-list (the opening's frame path and its callers, ${OPENING_ALLOW.length} files + art/sequences/opening/* (${openingDir.length} files)):\n  ${OPENING_ALLOW.join('\n  ')}`);
if (problems.length) { console.error('One render path FAIL:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('One render path PASS: only runtime/render-scene.ts assembles a frame; cutscenes and the taxi flight are on it; the opening is the remaining allow-list.');
