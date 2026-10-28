/**
 * The sky kit's sunset style (`drawSky` with `style: 'sunset'`): the coast's sky, the title glide's look as Tommi
 * reviewed it, now a style of the one sky pass. A sunset gradient mixed from the frame's light (night, the golden
 * hour, the late afternoon) and toward the city's redder haze (`town`), a big slatted sun sinking into the sea with
 * its glow and twinkling stars at night. Thin clouds use the separate cloud-layer asset. Drawn in the coast kit's pixels (three world units each).
 */
import { FOV, type Light } from '../../world/light';
import type { View } from '../core/view';
import { ART, lerp, mixHex, R, smooth } from '../core/pixels';
import {skyPos,type SkyOpts} from './sky-layout';

const rngOf = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const STARS = (() => { const r = rngOf(11); return Array.from({ length: 60 }, () => [r(), r() * 0.45, 0.25 + r() * 0.5, r() * 6]); })();

/** Where the sun's middle sits below the horizon, in sun radii (negative: above it), from its height. */
const sunDepth = (el: number) => el >= 0 ? 0.1 - el * 5.2 : 0.1 - el * 12;
/** The city sky drifts a touch with the camera (sky.ts PAR); the sunset sun does not: joined zones share one sky. */
const PAR = 0.02;

/**
 * The sunset sun on screen (screen units of the view): x from its bearing to the view, as the city sky's; y from its
 * height in radii over the horizon (screen y); its radius from the view's height. The water reads it for the sun's path.
 */
export function sunsetSun(v: View, l: Light, horizon: number):{x:number;y:number;r:number} {
  if(v.cameraFrame){const f=v.cameraFrame,p=sunsetSun(f.view,l,horizon-f.y);return{...p,x:p.x+f.x,y:p.y+f.y};}
  const r = R(v.viewH / ART * 0.15) * ART, p = skyPos(v, l.sun, l.sunRel, horizon);
  return { x: p.x + v.cam * PAR, y: horizon + r * sunDepth(l.sun.el), r };
}

export function drawSunsetSky(x: CanvasRenderingContext2D, v: View, l: Light, o: SkyOpts) {
  const W = v.viewW / ART, hz = R(o.horizon / ART), city = Math.max(0, Math.min(1, o.town ?? 0));
  const t = v.t / 60, low = l.sun.el > 0 ? l.low : 1, lit = smooth(-0.18, -0.01, l.sun.el), el = l.sun.el;
  const up = smooth(-0.12, 0.02, el), sun = sunsetSun(v, l, o.horizon);
  const sunX = sun.x / ART, sunY = sun.y / ART, Rs = sun.r / ART;
  const mix = (night: string, gold: string, town: string, day: string) => mixHex(mixHex(night, mixHex(day, gold, low), lit), town, city);
  x.save(); x.scale(ART, ART);
  try {
    const sk = x.createLinearGradient(0, 0, 0, Math.max(1, hz));
    sk.addColorStop(0, mix('#05040e', '#140a2a', '#120a20', '#161a40'));
    sk.addColorStop(0.38, mix('#0b0820', '#3a1250', '#2c1240', '#2c2c66'));
    sk.addColorStop(0.68, mix('#1a0f34', '#a3266a', '#7a2a50', '#5c4a88'));
    sk.addColorStop(0.9, mix('#3a1846', '#ff7a3c', '#c8583c', '#b87a98'));
    sk.addColorStop(1, mix('#5a2240', '#ffb04a', '#e08a48', '#e8aa88'));
    x.fillStyle = sk; x.fillRect(0, 0, W, hz + 1);
    // under the horizon the horizon's own colour, behind the sea and the land that cover it
    x.fillStyle = mix('#5a2240', '#ffb04a', '#e08a48', '#e8aa88'); x.fillRect(0, hz + 1, W, Math.max(0, (o.fillTo ?? v.viewH) / ART - hz - 1));
    const starK = 1.9 * l.night * (1 - city * 0.7) * (1 - l.cover);
    if (starK > 0) for (const [sxr, syr, a, ph] of STARS) {
      const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + ph);
      x.fillStyle = 'rgba(255,217,165,' + Math.min(1, a * tw * starK * (1 - syr * 1.6)).toFixed(2) + ')'; x.fillRect(R(sxr * W), R(syr * hz), 1, 1);
    }
    // the sun, low and slatted, and its glow; behind the view it is not drawn, cloud swallows it
    const vis = 1 - smooth(0.3, 0.92, l.cover);
    if (vis > 0.03 && Math.abs(l.sunRel) < FOV + 12) {
      const glow = x.createRadialGradient(sunX, sunY, Rs * 0.5, sunX, sunY, Rs * 3.3);
      glow.addColorStop(0, 'rgba(255,170,90,' + (0.4 * (1 - city * 0.5) * lerp(0.15, 1, up) * vis).toFixed(3) + ')'); glow.addColorStop(1, 'rgba(255,120,80,0)');
      x.fillStyle = glow; x.fillRect(0, 0, W, Math.max(0, hz));
      x.save(); x.globalAlpha *= vis;
      x.beginPath(); x.rect(0, 0, W, Math.max(0, hz)); x.clip();
      x.beginPath();
      x.rect(sunX - Rs, sunY - Rs, Rs * 2, Rs * 0.55);
      for (let i = 0, yy = sunY - Rs * 0.45; yy < sunY + Rs; i++) { const bar = Math.max(1.5, Rs * (0.14 - i * 0.016)); x.rect(sunX - Rs, yy, Rs * 2, bar); yy += bar + Math.max(1, Rs * 0.035 + i * Rs * 0.014); }
      x.clip();
      const sg = x.createLinearGradient(0, sunY - Rs, 0, sunY + Rs * 0.2);
      sg.addColorStop(0, '#ffe36a'); sg.addColorStop(0.55, '#ffa23a'); sg.addColorStop(1, '#ff5a7a');
      x.fillStyle = sg; x.beginPath(); x.arc(sunX, sunY, Rs, 0, Math.PI * 2); x.fill();
      x.restore();
    }
  } finally { x.restore(); }
}
