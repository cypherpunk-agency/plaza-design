export const shopDefaultLayout = {
  width: 900,
  spawn: 84,
  ceil: 160,
  window: { x: 70, w: 80, h0: 34, h1: 116 },
  mirror: { x: 166, h: 140 },
  vend: { x: 500, w: 38, h: 78 },
  fridge: { x: 556, w: 108, h: 98, seed: 5, doors: 2 },
  counter: { x: 700, w: 170, h: 26 },
  till: 730,
  keeper: 800,
  /** The building above the shop: a slab, then storeys (the first is the stockroom). */
  slab: 10,
  storey: 76,
  /** Pipes rising through every floor. */
  risers: [44, 856],
};
