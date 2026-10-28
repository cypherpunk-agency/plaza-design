/**
 * Seeded sky traffic drawn from explicit actor positions and a view: the city's classic far sky ships
 * (spinner cars, freighters, red-eyed drones), drawn through the vehicle kit's air class and looping
 * their sky lanes with its lane helper (vehicles/kit.ts `laneAt`).
 */
import type { View } from '../core/view';
import { drawAircraft, spriteShipRows } from '../vehicles/air-traffic';
import { laneAt } from '../vehicles/kit';

export type SkyShipKind = 'spinner' | 'freighter' | 'skydrone';
/** `ps` is the sprite pixel size on screen (1 or 2). */
export interface Ship { kind: SkyShipKind; ps: number; y: number; speed: number; offset: number; flip: boolean; depth: number }
/** Units per sprite pixel inside the air class (air-traffic.ts SPRITE_PX). */
const SPRITE_PX = 9;

/** Deterministic particle configuration; these are parts of one background generator. */
export function createSkyShips(seed=3):Ship[]{
  let state=seed;
  const random=()=>(state=(state*9301+49297)%233280)/233280;
  const kinds:SkyShipKind[]=['spinner','spinner','freighter','skydrone'];
  return Array.from({length:9},(_,i)=>{const depth=.15+i/9*.5;return{kind:kinds[i%kinds.length],ps:depth>.45?2:1,y:18+random()*120,speed:.04+depth*.12,offset:random()*3000,flip:random()<.5,depth};});
}

/** One generator paint: preserve native particle order and the shared Canvas context. */
export function drawSkyShips(x:CanvasRenderingContext2D,v:View,ships:readonly Ship[],route={from:-130,length:3000}){
  for(const ship of ships)drawSkyCraft(x,v,ship,route);
}

export function drawSkyCraft(x: CanvasRenderingContext2D, v: View, s: Ship,route={from:-130,length:3000}) {
    const sc = s.ps / SPRITE_PX, dir = s.flip ? -1 : 1, bottom = s.y + 10;
    const px = route.from+laneAt({ mode: 'loop', dir, speed: s.speed, length: route.length, start: s.offset }, v.reduced?0:v.t).offset-(v.skyCam??v.cam)*s.depth;
    // the sprite's frame is centred, so its underside lands where the old sprite stood
    x.save(); x.translate(Math.round(px), bottom - spriteShipRows(s.kind) * s.ps / 2); x.scale(sc, sc);
    drawAircraft(x, s.kind, { t: v.t, face: dir as 1 | -1, scale: sc });
    x.restore();
    if (s.kind === 'skydrone' && s.ps > 1) {
      // a drone near enough to see its light on the street under it
      const beam = x.createLinearGradient(0, bottom, 0, bottom + 80);
      beam.addColorStop(0, 'rgba(255,230,140,.16)'); beam.addColorStop(1, 'rgba(255,230,140,0)');
      x.fillStyle = beam;
      x.beginPath(); x.moveTo(px - 2, bottom); x.lineTo(px - 26, bottom + 80); x.lineTo(px + 26, bottom + 80); x.lineTo(px + 2, bottom); x.closePath(); x.fill();
    }
}
