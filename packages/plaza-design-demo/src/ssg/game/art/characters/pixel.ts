/** Pixel's procedural sprite poses, palette, shadow, LED and purr/sleep particles. */
export type PixelPose = 'sit' | 'walk' | 'sleep' | 'sun' | 'stretch' | 'hop';


/**
 * Sprites face right; each character is a pixel ('.' is clear). Drawn at
 * 2 world units a pixel, so a sitting Pixel is about a third of the player.
 * b body, d shade, l light rim (ears, back), e eyes, n nose, y the tail LED.
 */
const PAL: Record<string, string> = {
  b: '#5d6472', d: '#2b2f38', l: '#a8b2c2', e: '#ffd23a', n: '#ff8a7a', y: '#ffd23a', k: '#1a1d23',
};

const SPR: Record<string, string[]> = {
  sit: [
    '......l...l',
    '......lb.bl',
    '......bbbbb',
    '......bebeb',
    '.......bnb.',
    'y...bbbbbb.',
    'd..bbbbbbb.',
    '.d.bbbbbbb.',
    '.ddbbbbbbb.',
    '...bb.b.bb.',
  ],
  blink: [
    '......l...l',
    '......lb.bl',
    '......bbbbb',
    '......bkbkb',
    '.......bnb.',
    'y...bbbbbb.',
    'd..bbbbbbb.',
    '.d.bbbbbbb.',
    '.ddbbbbbbb.',
    '...bb.b.bb.',
  ],
  sit2: [
    '......l...l',
    '......lb.bl',
    '......bbbbb',
    '......bebeb',
    '.......bnb.',
    '....bbbbbb.',
    'y..bbbbbbb.',
    'dd.bbbbbbb.',
    '.ddbbbbbbb.',
    '...bb.b.bb.',
  ],
  walk1: [
    'y.........l.l',
    'd.........lbl',
    '.d........bbbb',
    '.dlllllllbbebe',
    '..bbbbbbbbbbn.',
    '..bbbbbbbbbb..',
    '..b.b....b.b..',
    '.b...b..b...b.',
  ],
  walk2: [
    '..........l.l',
    'y.........lbl',
    '.d........bbbb',
    '.dlllllllbbebe',
    '..bbbbbbbbbbn.',
    '..bbbbbbbbbb..',
    '...bb....bb...',
    '...b.b...b.b..',
  ],
  sleep: [
    '.......l..l.',
    '..llllllbbbb',
    '.bbbbbbbbkbk',
    'bbbbbbbbbbbb',
    'ddddddybbbb.',
  ],
  sleep2: [
    '............',
    '..lllllll.l.',
    '.bbbbbbbbbbl',
    'bbbbbbbbbkbk',
    'ddddddybbbb.',
  ],
  sun: [
    '...........l.l',
    '.llllllllllbbbb',
    'ybbbbbbbbbbbkbk',
    '.dbbbbbbbbbbbb.',
    '..b.b....b.b...',
  ],
  stretch: [
    '...........l.l',
    'y..........lbl',
    '.d.........bbbb',
    '.dll......bbebe',
    '..bbbbbb..bbn..',
    '..bbbbbbbbbbb..',
    '..b.b..bbbbbb..',
    '..b.b...b..b...',
  ],
};


const PS = 2;

const GLOW = 'rgba(255,210,58,.28)';
export interface PixelAppearance { x:number;h:number;face:number;pose:PixelPose;zs:readonly {x:number;h:number;age:number;ch?:string}[] }
export function pixelFrame(pose: PixelPose, t:number): string[] {
    switch (pose) {
      case 'walk': return Math.floor(t / 7) % 2 ? SPR.walk1 : SPR.walk2;
      case 'hop': return SPR.walk1;
      case 'stretch': return SPR.stretch;
      case 'sleep': return Math.floor(t / 70) % 2 ? SPR.sleep : SPR.sleep2;
      case 'sun': return SPR.sun;
      default: {
        if (Math.floor(t) % 200 < 7) return SPR.blink;
        return Math.floor(t / 90) % 3 === 0 ? SPR.sit2 : SPR.sit;
      }
    }
  }
export function drawPixel(x: CanvasRenderingContext2D, sx:(wx:number)=>number, y:(h:number)=>number, t:number, state:PixelAppearance) {
    const rows = pixelFrame(state.pose, t);
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0), hh = rows.length;
    const x0 = Math.round(sx(state.x) - (w * PS) / 2), y0 = Math.round(y(state.h) - hh * PS);
    // a soft shadow where Pixel stands
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(x0 + 2, Math.round(y(state.h)) - 1, w * PS - 4, 2);
    x.save(); x.shadowColor = GLOW; x.shadowBlur = 4;
    for (let j = 0; j < hh; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '.') continue;
        let col = PAL[ch];
        // the tail LED pulses while Pixel rests (charging on warmth)
        if (ch === 'y') col = 'rgba(255,210,58,' + (state.pose === 'sleep' || state.pose === 'sun' ? 0.45 + 0.45 * Math.sin(t * 0.05) : 0.85) + ')';
        const ii = state.face < 0 ? w - 1 - i : i;
        x.fillStyle = col; x.fillRect(x0 + ii * PS, y0 + j * PS, PS, PS);
      }
    }
    x.restore();
    for (const z of state.zs) {
      const a = Math.max(0, 0.7 - z.age / 110);
      x.save(); x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center';
      if (z.age < 0) { x.restore(); continue; }
      x.fillStyle = z.ch ? 'rgba(255,210,58,' + a + ')' : 'rgba(255,217,165,' + a + ')';
      x.fillText(z.ch ?? 'z', Math.round(sx(z.x + Math.sin(z.age * 0.08) * 3)), Math.round(y(z.h + z.age * 0.18)));
      x.restore();
    }
  }
