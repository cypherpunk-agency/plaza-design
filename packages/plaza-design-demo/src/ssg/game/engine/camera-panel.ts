/**
 * The shared camera panel: looking through a scene camera (the yard's CAM-1,
 * the stacks' STS-2 scope, downtown's CAM-3). The engine owns the mechanics:
 * the 320×150 feed fitted into the panel, tap-to-aim, the eased crosshair and
 * what is under it, ZOOM ×3 on the crosshair, scanlines and the blinking HUD.
 * A scene supplies the picture (a painter registered by name), the text-key
 * prefix, and its buttons. The feed's things are the scene's `camera.crates`
 * and every word comes from the scene's texts.
 *
 * The CSS is `.cam`, `.cam-feed`, `.cam-btns` (render.tsx).
 */

import type { CrateData } from '../data/types';
import type { Line, SceneModel } from './model';
import { button, el, type PanelFn } from './panels';

/** The feed's virtual size; painters draw in these units. */
export const CAMERA_W = 320, CAMERA_H = 150;
const ZOOM = 3, CENTRE = { x: CAMERA_W / 2, y: CAMERA_H / 2 };

type Point = { x: number; y: number };

/** What a painter sees each frame. The transform and clip to the feed are already set. */
export interface CameraView {
  readonly m: SceneModel;
  /** The scene's `camera.crates`. */
  readonly things: readonly CrateData[];
  /** 1, or 3 while zoomed. */
  readonly zoom: number;
  /** Things tagged locally with TAG during this viewing. */
  readonly tags: ReadonlySet<string>;
  /** Frame time (ms). */
  readonly t: number;
}
/** Draws a scene's picture into the feed (CAMERA_W × CAMERA_H). Scanlines go on top afterwards. */
export type CameraPainter = (g: CanvasRenderingContext2D, view: CameraView) => void;

const painters = new Map<string, CameraPainter>();
/** Register a scene's camera picture under a name (e.g. `yard.approach`). */
export function registerCameraPainter(name: string, painter: CameraPainter) { painters.set(name, painter); }
export const cameraPainter = (name: string) => painters.get(name);

/** What a button's press gets: the view plus the panel's controls. */
export interface CameraControls extends CameraView {
  /** The (visible) thing under the crosshair, if any. */
  under(): CrateData | undefined;
  zoomIn(): void;
  zoomOut(): void;
  tag(id: string): void;
  say(line: Line): void;
}
export interface CameraButton {
  /** Text key of the button's label. */
  label: string;
  /** Shown only when this holds at opening. */
  when?: (m: SceneModel) => boolean;
  press: (c: CameraControls) => void;
}

export interface CameraPanelOptions {
  /** Registered painter name. */
  painter: string;
  /** Text-key prefix for the HUD: `<texts>.hud`, `<texts>.aim`, `<texts>.on` ({id}). */
  texts: string;
  buttons: readonly CameraButton[];
  /** Where the crosshair starts (default 160,80). */
  start?: Point;
  /** How far outside a thing still counts as on it (default 3). */
  reach?: number;
  /** Horizontal shift of the things in the feed (the yard's pan). */
  offset?: (m: SceneModel) => number;
  /** Whether a thing is in the picture to be aimed at (default: all). */
  visible?: (thing: CrateData, m: SceneModel) => boolean;
}

/** ZOOM: toggles ×3 on the crosshair. Zooming out says `out`; zooming in hands what was under the crosshair to `read`. */
export const zoomButton = (label: string, out: string, read: (thing: CrateData | undefined, c: CameraControls) => void): CameraButton => ({
  label,
  press: (c) => {
    if (c.zoom > 1) { c.zoomOut(); c.say(c.m.line(out)); return; }
    const k = c.under();
    c.zoomIn(); read(k, c);
  },
});

/** The shared camera panel, configured per scene. */
export function cameraPanel(options: CameraPanelOptions): PanelFn {
  return ({ body, m, say, frame }) => {
    const paint = cameraPainter(options.painter);
    if (!paint) throw new Error('Unknown camera painter: ' + options.painter);
    body.classList.add('cam');
    const c = el('canvas', 'cam-feed'); const g = c.getContext('2d')!;
    const btns = el('div', 'cam-btns');
    body.append(c, btns);
    const W = CAMERA_W, H = CAMERA_H, reach = options.reach ?? 3, start = options.start ?? { x: 160, y: 80 };
    const things = m.data.camera?.crates ?? [];
    let s = 1, ox = 0, oy = 0, zoom = 1, focus: Point = { ...CENTRE }, cross: Point = { ...start }, aim: Point = { ...start };
    const tags = new Set<string>();
    const under = (p: Point) => {
      const dx = options.offset ? options.offset(m) : 0;
      return things.find((k) => (!options.visible || options.visible(k, m)) && p.x >= k.x - dx - reach && p.x <= k.x - dx + k.w + reach && p.y >= k.y - reach && p.y <= k.y + k.h + reach);
    };
    const fit = () => {
      const d = window.devicePixelRatio || 1;
      c.width = Math.max(1, Math.round(c.clientWidth * d)); c.height = Math.max(1, Math.round(c.clientHeight * d));
      s = Math.min(c.width / W, c.height / H); ox = (c.width - W * s) / 2; oy = (c.height - H * s) / 2;
    };
    c.addEventListener('pointerdown', (e) => {
      const r = c.getBoundingClientRect(), d = c.width / r.width;
      const vx = ((e.clientX - r.left) * d - ox) / s, vy = ((e.clientY - r.top) * d - oy) / s;
      aim = { x: (vx - CENTRE.x) / zoom + focus.x, y: (vy - CENTRE.y) / zoom + focus.y };
    });
    let t = 0;
    const controls: CameraControls = {
      m, things, tags,
      get zoom() { return zoom; },
      get t() { return t; },
      under: () => under(cross),
      zoomIn: () => { zoom = ZOOM; focus = { ...cross }; },
      zoomOut: () => { zoom = 1; focus = { ...CENTRE }; },
      tag: (id) => { tags.add(id); },
      say,
    };
    btns.append(...options.buttons.filter((b) => !b.when || b.when(m)).map((b) => button(m.label(b.label), 'hack-btn', () => b.press(controls))));
    let fitted = false;
    frame((now) => {
      t = now;
      if (!fitted || c.width !== Math.round(c.clientWidth * (window.devicePixelRatio || 1))) { fit(); fitted = true; }
      cross.x += (aim.x - cross.x) * 0.2; cross.y += (aim.y - cross.y) * 0.2;
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
      g.setTransform(s * zoom, 0, 0, s * zoom, ox + s * (CENTRE.x - focus.x * zoom), oy + s * (CENTRE.y - focus.y * zoom));
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
      paint(g, controls);
      // scanlines
      g.fillStyle = 'rgba(0,255,255,0.04)'; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
      g.restore();
      // the crosshair: bright when something is under it
      const k = under(cross), r = 8 / zoom;
      g.strokeStyle = k ? '#00ffff' : 'rgba(0,255,255,.6)'; g.lineWidth = 1 / zoom;
      g.beginPath(); g.arc(cross.x, cross.y, r, 0, 7);
      for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.moveTo(cross.x + a * r * 0.5, cross.y + b * r * 0.5); g.lineTo(cross.x + a * r * 1.8, cross.y + b * r * 1.8); }
      g.stroke();
      // the HUD, blinking
      g.setTransform(1, 0, 0, 1, 0, 0);
      const fs = Math.round(11 * (window.devicePixelRatio || 1));
      g.font = fs + 'px "IBM Plex Mono", monospace';
      g.fillStyle = Math.floor(now / 600) % 2 ? '#ff2a44' : '#5a0a14'; g.fillText(m.label(options.texts + '.hud') + (zoom > 1 ? ' ×3' : ''), ox + fs * 0.6, oy + fs * 1.4);
      g.fillStyle = '#00ffff'; g.fillText(k ? m.label(options.texts + '.on', { id: k.id }) : m.label(options.texts + '.aim'), ox + fs * 0.6, oy + fs * 2.8);
    });
  };
}
