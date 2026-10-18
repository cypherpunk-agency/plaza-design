/**
 * Editor-only grouping for the layer list. Roles are inferred from an artwork's type, label and
 * catalog category; nothing is written to compositions, and draw order stays the source of truth.
 * The keyword lists are a first pass: a `role` field on registered artwork can replace them later.
 */
export const LAYER_ROLES = ['People', 'Vehicles', 'Lights', 'Signs', 'Props', 'Architecture', 'Markers', 'Groups'] as const;
export type LayerRole = typeof LAYER_ROLES[number];

// Checked in order: a "reading-room resident" is a person before it is a room.
const RULES: [LayerRole, RegExp][] = [
  ['Groups', /^assembly\./],
  ['Markers', /marker|spawn|trigger|\bzone\b|\bguide\b/],
  ['People', /person|people|character|crowd|actor|animal|robot|\bcat\b|\bdog\b|\bbird|\bkid\b|vendor|worker|guard|clerk|resident|passenger|pedestrian/],
  ['Vehicles', /vehicle|\bcars?\b|taxi|\bbus\b|\bvan\b|truck|train|tram|\bboat|\bship|ferry|drone|bike|scooter|forklift/],
  ['Lights', /light|lamp|pendant|neon|glow|lantern|bulb|spot|beam|flare|candle/],
  ['Signs', /sign|notice|\bnote\b|ticker|poster|\blabel\b|banner|placard|\bmenu\b|billboard|graffiti|timetable/],
  // Furniture and equipment often mention the wall or room they sit in; claim them before architecture.
  ['Props', /clock|radiator|camera|terminal|chair|table|bench|desk|counter|printer|\bbook|plant|\bbin\b|crate|\bbox\b|machine|stool|sofa|\bbed\b|cabinet|locker|kiosk|reader|vending|washer|dryer/],
  ['Architecture', /\broom\b|wall|floor|ceiling|door|window|gallery|stair|roof|building|facade|façade|\barch|pillar|column|street|\bsky|skyline|city|ground|platform|track|\brail|pier|dock|interior|exterior|ramp|bridge|fence|gate|backdrop|shell|tunnel|corridor/],
];

export function layerRole(type: string, label: string, category: string): LayerRole {
  const text = `${type} ${label} ${category}`.toLowerCase();
  return RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? 'Props';
}
