/** Focus the actual renderer through measured camera response, including kernel-owned parallax. */
import type {PreviewRequest,PreviewResult} from './contracts';
export interface PreviewRectangle { x: number; y: number; width: number; height: number }
/** Local authoring camera guardrails, not a change to world geography or runtime cameras. */
export const NATIVE_FOCUS_LIMITS = Object.freeze({ camera: 100_000, step: 50_000, probe: 100, iterations: 2 });
export function centerNativePreview(
  render: (canvas: HTMLCanvasElement, request: PreviewRequest) => PreviewResult,
  canvas: HTMLCanvasElement, request: PreviewRequest,
  measure: (result: PreviewResult) => PreviewRectangle | undefined,
  offset = { x: 0, h: 0 },
) {
  const diagnostics: string[] = [];
  const initialX = Number(request.environment.cameraX ?? 0), initialH = Number(request.environment.cameraH ?? 0);
  if (![initialX, initialH, offset.x, offset.h, canvas.width, canvas.height].every(Number.isFinite) || canvas.width <= 0 || canvas.height <= 0 ||
      [initialX, initialH, offset.x, offset.h].some(value => Math.abs(value) > NATIVE_FOCUS_LIMITS.camera)) throw new Error('Native preview camera and offsets must be finite and within the local focus range.');
  const bounded = (value: number, limit: number, reason: string) => {
    const next = Math.max(-limit, Math.min(limit, value));
    if (next !== value) diagnostics.push(reason);
    return next;
  };
  const rectangle = (value: PreviewRectangle | undefined) => {
    if (!value || value.width <= 0 || value.height <= 0) return undefined;
    if (![value.x, value.y, value.width, value.height, value.x + value.width / 2, value.y + value.height / 2].every(Number.isFinite)) {
      diagnostics.push('Non-finite native bounds cannot be focused.'); return undefined;
    }
    return value;
  };
  let focused: PreviewRequest = { ...request, environment: { ...request.environment } };
  let result = render(canvas, focused);
  const center = (box: PreviewRectangle) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  // A registered kernel can own its depth, or a group can contain several depths. Measuring the
  // same native bounds avoids copying those camera formulas or inventing a second transform.
  for (let iteration = 0; iteration < NATIVE_FOCUS_LIMITS.iterations; iteration++) {
    const box = rectangle(measure(result)); if (!box) break;
    const current = center(box), dx = canvas.width / 2 - current.x, dy = canvas.height / 2 - current.y;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) break;
    const cameraX = Number(focused.environment.cameraX ?? 0), cameraH = Number(focused.environment.cameraH ?? 0);
    const probeDX = cameraX + NATIVE_FOCUS_LIMITS.probe <= NATIVE_FOCUS_LIMITS.camera ? NATIVE_FOCUS_LIMITS.probe : -NATIVE_FOCUS_LIMITS.probe;
    const probeDH = cameraH + NATIVE_FOCUS_LIMITS.probe <= NATIVE_FOCUS_LIMITS.camera ? NATIVE_FOCUS_LIMITS.probe : -NATIVE_FOCUS_LIMITS.probe;
    const probeX = rectangle(measure(render(canvas, { ...focused, environment: { ...focused.environment, cameraX: cameraX + probeDX } })));
    const probeH = rectangle(measure(render(canvas, { ...focused, environment: { ...focused.environment, cameraH: cameraH + probeDH } })));
    const slopeX = probeX ? (center(probeX).x - current.x) / probeDX : 0;
    const slopeH = probeH ? (center(probeH).y - current.y) / probeDH : 0;
    const next = (camera: number, delta: number, slope: number, axis: string) => {
      if (!Number.isFinite(slope) || Math.abs(slope) <= .0001) { diagnostics.push(`Native ${axis} camera response is unavailable or insensitive.`); return camera; }
      const step = delta / slope;
      if (!Number.isFinite(step)) { diagnostics.push(`Native ${axis} focus correction is non-finite.`); return camera; }
      return bounded(camera + bounded(step, NATIVE_FOCUS_LIMITS.step, `Native ${axis} focus step was bounded.`), NATIVE_FOCUS_LIMITS.camera, `Native ${axis} focus camera was bounded.`);
    };
    focused = { ...focused, environment: { ...focused.environment,
      cameraX: next(cameraX, dx, slopeX, 'horizontal'),
      cameraH: next(cameraH, dy, slopeH, 'vertical'),
    } };
    result = render(canvas, focused);
  }
  if (offset.x || offset.h) { focused = { ...focused, environment: { ...focused.environment,
    cameraX: bounded(Number(focused.environment.cameraX ?? 0) + offset.x, NATIVE_FOCUS_LIMITS.camera, 'Native horizontal pan was bounded.'), cameraH: bounded(Number(focused.environment.cameraH ?? 0) + offset.h, NATIVE_FOCUS_LIMITS.camera, 'Native vertical pan was bounded.'),
  } }; result = render(canvas, focused); }
  return { result, request: focused, diagnostics: [...new Set(diagnostics)] };
}
