/**
 * Pixel sprites for ACCESS DENIED. Each sprite is a list of rows; every character
 * is one pixel, `.` is transparent and any other letter is a palette colour.
 * Drawn "hi-bit": small pixels with a soft glow in the scene's colours (cyan for
 * the player, orange for the city's people).
 */

export const PAL: Record<string, string> = {
  H: '#1d3b46', V: '#00ffff', C: '#174a55', O: '#ff8800', L: '#0f2a30', B: '#2b5560',
  K: '#ff8800', S: '#c98a5a', E: '#1a0d05', A: '#7a3a12', U: '#5a2a12', I: '#9a5a2a',
  G: '#8a6a50', T: '#3a2418', N: '#3a3346', Z: '#6a4a3a', F: '#2a2622', J: '#2c3a2c',
  Q: '#d8d0c0', M: '#6a2a5a', X: '#8a3a1a', W: '#00ffff', Y: '#ffd23a', D: '#4a4f5a',
  R: '#ff2a44', P: '#5a606a',
};

/** Ships and machines use a cold hull grey instead of skin tone for `S`. */
export const HULL: Record<string, string> = { S: '#30343e' };

export const SPR = {
  stand: ['...HHHH...', '..HHHHHH..', '..HVVVVH..', '..HHHHHH..', '...HHHH...', '.CCCCCCCC.', '.CCCCCCCC.', '.CCCOOCCC.', '.CCCCCCCC.', '..CCCCCC..', '..CC..CC..', '..LL..LL..', '..LL..LL..', '.BBB..BBB.'],
  walk: ['...HHHH...', '..HHHHHH..', '..HVVVVH..', '..HHHHHH..', '...HHHH...', '.CCCCCCCC.', '.CCCCCCCC.', '.CCCOOCCC.', '.CCCCCCCC.', '..CCCCCC..', '..CC.CC...', '..LL..LL..', '.LL....LL.', '.BB....BB.'],
  jump: ['...HHHH...', '..HHHHHH..', '..HVVVVH..', 'C.HHHHHH.C', 'CC.HHHH.CC', '.CCCCCCCC.', '.CCCCCCCC.', '.CCCOOCCC.', '.CCCCCCCC.', '..CCCCCC..', '.LLL..LLL.', '.LL....LL.', 'BB......BB', '..........'],
  jack: ['...HHHH....', '..HHHHHH...', '..HHVVVV...', '..HHHHHH...', '...HHHH....', '.CCCCCCCCCC', '.CCCCCCCCCC', '.CCCOOCC...', '.CCCCCCC...', '..CCCCCC...', '..CC..CC...', '..LL..LL...', '..LL..LL...', '.BBB..BBB..'],
  fixer: ['..KKKKKK..', '.KKKKKKKKK', '..SSSSSS..', '..SESSES..', '..SSSSSS..', '.AAAAAAAA.', 'AAAAAAAAAA', 'AASAAAASAA', 'AAAAAAAAAA'],
  umbrella: ['...UUUUUU...', '.UUUUUUUUUU.', 'UUUUUUUUUUUU', '.....I......', '....GGG.....', '....GGG.....', '...TTTTT....', '..TTTTTTT...', '..TTTTTTT...', '..TTTTTTT...', '..TTTTTTT...', '..TTTTTTT...', '...TT.TT....', '...LL.LL....', '..BBB.BBB...'],
  hood: ['...NNNN...', '..NNNNNN..', '..NZZZZN..', '..NNNNNN..', '.NNNNNNNN.', 'NNNNNNNNNN', 'NNNNNNNNNN', 'NNNNNNNNNN', '.NNNNNNNN.', '.NNNNNNNN.', '..NN..NN..', '..LL..LL..', '..LL..LL..', '.BBB..BBB.'],
  hat: ['..FFFFFF..', 'FFFFFFFFFF', '..SSSSSS..', '..SESSES..', '..SSSSSS..', '.JJJJJJJJ.', 'JJJJJJJJJJ', 'JJJJJJJJJJ', 'JJJJJJJJJJ', '.JJJJJJJJ.', '.JJJJJJJJ.', '..LL..LL..', '..LL..LL..', '.BBB..BBB.'],
  drone: ['...DDDD...', '.DDDDDDDD.', 'DDDRRRRDDD', '.DDDDDDDD.', 'D...DD...D'],
  spinner: ['......SSSS......', '...SSSWWWWSS....', '.SSSSSSSSSSSSSS.', 'SSSSSSSSSSSSSSSS', '.RR..........YY.'],
  freighter: ['....SSSSSSSSSSSSSSSSSSSS....', '..SSSWWSSSWWSSSWWSSSWWSSSS..', 'SSSSSSSSSSSSSSSSSSSSSSSSSSSS', 'SSOOSSOOSSOOSSOOSSOOSSOOSSSS', 'SSOOSSOOSSOOSSOOSSOOSSOOSSSS', '.SSSSSSSSSSSSSSSSSSSSSSSSSS.', '..RR..................YY....'],
};

export type Sprite = string[];

export interface DrawOpts {
  ps?: number;
  flip?: boolean;
  glow?: string;
  pal?: Record<string, string>;
}

/** Draw a sprite centred on `cx`, standing on `yb`. Returns its box in world units. */
export function drawSprite(x: CanvasRenderingContext2D, rows: Sprite, cx: number, yb: number, opts: DrawOpts = {}) {
  const ps = opts.ps ?? 3, w = rows[0].length, h = rows.length;
  const x0 = Math.round(cx - (w * ps) / 2), y0 = Math.round(yb - h * ps);
  if (opts.glow) { x.save(); x.shadowColor = opts.glow; x.shadowBlur = 6; }
  for (let j = 0; j < h; j++) {
    const row = rows[j];
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      const ii = opts.flip ? w - 1 - i : i;
      x.fillStyle = opts.pal?.[ch] ?? PAL[ch];
      x.fillRect(x0 + ii * ps, y0 + j * ps, ps, ps);
    }
  }
  if (opts.glow) x.restore();
  return { x0, y0, w: w * ps, h: h * ps };
}

export const GLOW_YOU = 'rgba(0,255,255,.8)';
export const GLOW_THEM = 'rgba(255,136,0,.55)';
