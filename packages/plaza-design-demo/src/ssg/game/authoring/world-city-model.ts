/**
 * Pure projections of the pending city source for the World workspace: the left City list
 * (places, districts, travel) and the short summaries the place inspector shows on its collapsed
 * sections. Nothing here edits; the panels pass changes through the city source editor.
 */
import type { CitySource, Place } from '../world/city';
import type { ClimateDef } from '../world/weather-kinds';

export interface CityPlaceRow {
  id: string;
  name: string;
  district: string | null;
  districtName: string;
  /** `r,g,b` from the district's map colour; transit places have none. */
  colour?: string;
  scenes: number;
}
export interface CityDistrictRow {
  id: string;
  name: string;
  colour?: string;
  climate: string;
  places: number;
}
export interface CityTravelRow {
  kind: 'metro' | 'taxi' | 'fare';
  id: string;
  label: string;
  detail: string;
}
export interface CityList {
  places: CityPlaceRow[];
  districts: CityDistrictRow[];
  travel: CityTravelRow[];
}

/** "always fog", or the two most likely weathers: "mostly rain, cloudy". */
export function climateSummary(def: ClimateDef | undefined) {
  if (!def) return 'no climate';
  if (def.fixed) return 'always ' + def.fixed;
  const kinds = Object.entries(def.weights)
    .filter(([, n]) => Number(n) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]))
    .map(([k]) => k);
  return kinds.length ? 'mostly ' + kinds.slice(0, 2).join(', ') : 'no weather';
}

export function cityList(d: CitySource, filter = ''): CityList {
  const q = filter.trim().toLowerCase(),
    hit = (...text: (string | null | undefined)[]) =>
      !q || text.some((t) => t && t.toLowerCase().includes(q));
  const districtName = (id: string | null) =>
    id ? (d.DISTRICTS.find((x) => x.id === id)?.name ?? id) : 'Transit';
  const places = d.PLACES.filter((p) => hit(p.id, p.name, districtName(p.district))).map(
    (p): CityPlaceRow => ({
      id: p.id,
      name: p.name,
      district: p.district,
      districtName: districtName(p.district),
      ...(p.district && d.DISTRICT_MAP[p.district]
        ? { colour: d.DISTRICT_MAP[p.district].col }
        : {}),
      scenes: p.scenes.length,
    }),
  );
  const districts = d.DISTRICTS.filter((x) => hit(x.id, x.name)).map((x): CityDistrictRow => ({
    id: x.id,
    name: x.name,
    ...(d.DISTRICT_MAP[x.id] ? { colour: d.DISTRICT_MAP[x.id].col } : {}),
    climate: climateSummary(d.CLIMATES[x.id]),
    places: d.PLACES.filter((p) => p.district === x.id).length,
  }));
  const travel: CityTravelRow[] = [
    ...d.LINE.map((id) => ({
      kind: 'metro' as const,
      id,
      label: d.STATIONS[id].name,
      detail: 'metro · ' + d.STATIONS[id].scene,
    })),
    ...d.STAND_IDS.map((id) => ({
      kind: 'taxi' as const,
      id,
      label: d.STANDS[id].name,
      detail: 'taxi · ' + d.STANDS[id].scene,
    })),
    { kind: 'fare' as const, id: 'fare', label: 'Taxi fare', detail: d.FARE + ' tokens' },
  ].filter((r) => hit(r.label, r.id, r.detail));
  return { places, districts, travel };
}

/** Which climate a place uses and where it comes from. */
export function placeClimate(d: CitySource, place: Place) {
  if (place.climate)
    return {
      inherited: false,
      key: place.climate,
      from: 'this place',
      summary: climateSummary(d.CLIMATES[place.climate]),
    };
  const key = place.district && d.CLIMATES[place.district] ? place.district : undefined;
  return {
    inherited: true,
    key,
    from: place.district
      ? (d.DISTRICTS.find((x) => x.id === place.district)?.name ?? place.district)
      : 'no district',
    summary: climateSummary(key ? d.CLIMATES[key] : undefined),
  };
}

/** One-line summaries for the place inspector's collapsed sections. */
export function placeSummaries(d: CitySource, place: Place) {
  const stations = d.LINE.filter((id) => place.scenes.includes(d.STATIONS[id].scene)),
    stands = d.STAND_IDS.filter((id) => place.scenes.includes(d.STANDS[id].scene));
  const travel = [
    ...stations.map((id) => 'metro ' + d.STATIONS[id].name),
    ...stands.map((id) => 'taxi ' + d.STANDS[id].name),
  ];
  const discovery = [
    d.PLACE_MAP[place.id] ? 'on the map' : 'no map point',
    d.PLACE_IN_VIEW[place.id]
      ? 'seen from ' +
        d.PLACE_IN_VIEW[place.id]!.length +
        (d.PLACE_IN_VIEW[place.id]!.length === 1 ? ' scene' : ' scenes')
      : '',
  ].filter(Boolean);
  const policy = place.access ? d.ACCESS[place.access] : undefined;
  return {
    travel: travel.length ? travel.join(', ') : 'no stop here',
    discovery: discovery.join(' · '),
    access: policy ? place.access + ' · ' + policy.exit.scene + ' / ' + policy.exit.id : 'open',
    scenes: place.scenes.length === 1 ? '1 scene' : place.scenes.length + ' scenes',
  };
}
