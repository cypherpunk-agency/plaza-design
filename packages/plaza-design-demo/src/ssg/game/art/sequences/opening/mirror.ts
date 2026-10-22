/**
 * A context for a mirrored pass (the glide's west beach, the eastbound train): everything goes to `x`
 * as it is, except that text is turned back about its anchor (its alignment swapped) while the canvas
 * is flipped, so signs and destination boards still read. No state of its own.
 */
import { READABLE_MIRROR } from '../../core/primitives';

export function readableMirror(x: CanvasRenderingContext2D): CanvasRenderingContext2D {
  const swap: Record<string, CanvasTextAlign> = { left: 'right', right: 'left', start: 'end', end: 'start' };
  const turned = (method: 'fillText' | 'strokeText') => (s: string, px: number, py: number, max?: number) => {
    if (x.getTransform().a >= 0) { if (max === undefined) x[method](s, px, py); else x[method](s, px, py, max); return; }
    const align = x.textAlign; x.save(); x.translate(px, py); x.scale(-1, 1); x.textAlign = swap[align] ?? align;
    if (max === undefined) x[method](s, 0, 0); else x[method](s, 0, 0, max);
    x.restore();
  };
  const fillText = turned('fillText'), strokeText = turned('strokeText');
  return new Proxy(x, {
    get(target, key) { if (key === READABLE_MIRROR) return true; if (key === 'fillText') return fillText; if (key === 'strokeText') return strokeText; const v = Reflect.get(target, key, target); return typeof v === 'function' ? v.bind(target) : v; },
    has(target, key) { return key === READABLE_MIRROR || Reflect.has(target, key); },
    set(target, key, value) { return Reflect.set(target, key, value, target); },
  });
}
