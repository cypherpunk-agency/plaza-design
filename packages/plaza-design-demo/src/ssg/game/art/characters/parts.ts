/**
 * The people kit's parts, as one list each. runtime/characters.ts derives its Body/Hair/Garb/Extra
 * unions from these, and the actor validator, the editor selects and the S9 inventory use the same
 * values, so a new part is added here once (and drawn in appearance.ts).
 */

/** Builds. kid and teen are ages; old and frail are elders (stooped); heavy has a belly. */
export const BODY_KINDS = ['avg', 'tall', 'short', 'wide', 'slim', 'kid', 'old', 'teen', 'heavy', 'broad', 'frail'] as const;

/** Hair and headwear (one per head). */
export const HAIR_KINDS = ['bald', 'short', 'long', 'bun', 'mohawk', 'cap', 'beanie', 'hood', 'brim', 'helmet', 'scarf',
  'afro', 'ponytail', 'buzz', 'beret', 'hardhat', 'headwrap', 'peaked'] as const;

/** What they wear on the body. */
export const GARB_KINDS = ['tee', 'jacket', 'coat', 'dress', 'apron', 'hivis', 'suit', 'robe',
  'hoodie', 'shell', 'oilskin', 'uniform', 'patched'] as const;

/** Things they carry or wear on top. The TECH_EXTRAS among them make a person "kitted". */
export const EXTRA_KINDS = ['umbrella', 'bag', 'backpack', 'cyberarm', 'visor', 'mask', 'phone', 'headphones', 'glasses', 'cane', 'briefcase', 'parcel', 'armband',
  'arglasses', 'respirator', 'wristscreen', 'ledtrim', 'earpiece', 'exobrace', 'patches', 'muffler'] as const;

/** Visible tech (art direction 2026-10-20: ordinary clothes plus one or two pieces of tech). Never cyan. */
export const TECH_EXTRAS = ['cyberarm', 'visor', 'phone', 'headphones', 'arglasses', 'respirator', 'wristscreen', 'ledtrim', 'earpiece', 'exobrace'] as const;

/** Facial hair. */
export const FACIAL_KINDS = ['none', 'stubble', 'moustache', 'beard'] as const;
