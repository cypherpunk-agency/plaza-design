/** Shared world artwork extracted without changing drawing bodies. */
import { rng, O, PAPER, text } from '../core/primitives';
import { drawCab } from '../vehicles/cab';



// ---------- the flight ----------

const LIGHTS = (() => { const r = rng(13); return Array.from({ length: 150 }, (_, i) => [r(), r(), i % 3]); })();

const SKYLINE = (() => { const r = rng(17); return Array.from({ length: 30 }, () => [r(), 0.12 + r() * 0.3, 0.02 + r() * 0.04]); })();


/** The flight between stands: city lights scrolling past under a hovering cab. `f` runs 0 → 1. */
export interface FlightOptions { cabX?: number; cabY?: number; fade?: number;sky?:{top:string;middle:string;bottom:string};lightSpeeds?:number[];towerFill?:string }
export function flightFrame(x: CanvasRenderingContext2D, vw: number, vh: number, f: number, t: number, dest: string, options: FlightOptions = {}) {
  const parts: { id: string; draw(): void }[] = []; const paint = (id: string, draw: () => void) => parts.push({ id, draw });
  paint('sky', () => {
  const g = x.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, options.sky?.top??'#02030a'); g.addColorStop(0.7, options.sky?.middle??'#0a0403'); g.addColorStop(1, options.sky?.bottom??'#170803');
  x.fillStyle = g; x.fillRect(0, 0, vw, vh);
  });
  paint('lights', () => {
  const speeds = options.lightSpeeds??[0.6, 1.8, 4.5], alphas = [0.25, 0.45, 0.8], sizes = [1, 1, 2];
  for (const [lx, ly, layer] of LIGHTS) {
    const span = vw + 20, px = (((lx * span * 3 - t * speeds[layer]) % span) + span) % span - 10;
    const py = vh * (0.35 + ly * 0.6);
    x.fillStyle = 'rgba(255,' + (layer === 2 ? 170 : 136) + ',' + (layer === 1 ? 60 : 0) + ',' + alphas[layer] + ')';
    x.fillRect(Math.round(px), Math.round(py), sizes[layer], sizes[layer]);
  }
  });
  paint('towers', () => {
  // towers racing past at the bottom
  for (const [tx, th, tw] of SKYLINE) {
    const span = vw * 1.6, px = (((tx * span - t * 3) % span) + span) % span - vw * 0.3, bw = tw * vw, bh = th * vh;
    x.fillStyle = options.towerFill??'#030100'; x.fillRect(Math.round(px), Math.round(vh - bh), Math.round(bw), Math.round(bh));
    x.strokeStyle = 'rgba(' + O + ',.25)'; x.strokeRect(Math.round(px) + 0.5, Math.round(vh - bh) + 0.5, Math.round(bw) - 1, Math.round(bh));
  }
  });
  paint('cab', () => {
  drawCab(x, options.cabX ?? vw / 2, options.cabY ?? vh * 0.45 + Math.sin(t * 0.08) * 3, 2, t);
  });
  paint('destination', () => {
  text(x, 'SKY TAXI  >>  ' + dest, vw / 2, vh * 0.45 + 30, 'rgba(' + PAPER + ',.9)', 9, '600');
  });
  const fade = options.fade ?? (f < 0.15 ? 1 - f / 0.15 : f > 0.85 ? (f - 0.85) / 0.15 : 0);
  paint('fade', () => { if (fade > 0) { x.fillStyle = 'rgba(0,0,0,' + Math.min(1, fade) + ')'; x.fillRect(0, 0, vw, vh); } });
  return parts;
}
export function drawFlight(x: CanvasRenderingContext2D, vw: number, vh: number, f: number, t: number, dest: string) { x.save(); for (const part of flightFrame(x, vw, vh, f, t, dest)) part.draw(); x.restore(); }
