/**
 * A context for a mirrored pass (the glide's west beach, the eastbound train): everything goes to `x`
 * as it is, except that text is turned back about its anchor (its alignment swapped) while the canvas
 * is flipped, so signs and destination boards still read. Its only state is the bound methods.
 */
import { READABLE_MIRROR } from './primitives';

const mirrors = new WeakMap<CanvasRenderingContext2D, CanvasRenderingContext2D>();
/** One mirror per context (it holds nothing that a frame changes), so every frame reuses it. */
export function readableMirror(x: CanvasRenderingContext2D): CanvasRenderingContext2D {
  let m = mirrors.get(x); if (!m) { m = mirrorOf(x); mirrors.set(x, m); } return m;
}
function mirrorOf(x: CanvasRenderingContext2D): CanvasRenderingContext2D {
  const swap: Record<string, CanvasTextAlign> = { left: 'right', right: 'left', start: 'end', end: 'start' };
  const turned = (method: 'fillText' | 'strokeText') => (s: string, px: number, py: number, max?: number) => {
    if (x.getTransform().a >= 0) { if (max === undefined) x[method](s, px, py); else x[method](s, px, py, max); return; }
    const align = x.textAlign; x.save(); x.translate(px, py); x.scale(-1, 1); x.textAlign = swap[align] ?? align;
    if (max === undefined) x[method](s, 0, 0); else x[method](s, 0, 0, max);
    x.restore();
  };
  const fillText = turned('fillText'), strokeText = turned('strokeText');
  // methods bound once per context, not once per call (the beach's pieces make thousands of calls a frame)
  const bound = new Map<PropertyKey, { of: Function; fn: Function }>();
  return new Proxy(x, {
    get(target, key) {
      if (key === READABLE_MIRROR) return true; if (key === 'fillText') return fillText; if (key === 'strokeText') return strokeText;
      const v = Reflect.get(target, key, target); if (typeof v !== 'function') return v;
      let b = bound.get(key); if (!b || b.of !== v) { b = { of: v, fn: v.bind(target) }; bound.set(key, b); } return b.fn;
    },
    has(target, key) { return key === READABLE_MIRROR || Reflect.has(target, key); },
    set(target, key, value) { return Reflect.set(target, key, value, target); },
  });
}
