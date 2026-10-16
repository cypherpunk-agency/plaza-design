import type { ShelfSpec } from "./construction";
export const shopDefaultLayout = {
  width: 900,
  spawn: 84,
  ceil: 160,
  window: { x: 70, w: 80, h0: 34, h1: 116 },
  mirror: { x: 166, h: 140 },
  shelves: [
    { x: 182, w: 92, h: 112, rows: 4, seed: 71, stock: 'snacks' },
    { x: 284, w: 92, h: 112, rows: 4, seed: 72, stock: 'noodles' },
    { x: 386, w: 92, h: 112, rows: 4, seed: 73, stock: 'mixed' },
  ] as ShelfSpec[],
  vend: { x: 500, w: 38, h: 78 },
  fridge: { x: 556, w: 108, h: 98, seed: 5, doors: 2 },
  counter: { x: 700, w: 170, h: 26 },
  till: 730,
  keeper: 800,
  tubes: [140, 400, 660],
  /** The building above the shop: a slab, then storeys (the first is the stockroom). */
  slab: 10,
  storey: 76,
  /** Pipes rising through every floor. */
  risers: [44, 856],
};
