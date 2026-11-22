/** World workspace City list and place summaries, projected from the real city source. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateCitySource } from '../../src/ssg/game/world/city-source';
import {
  cityList,
  climateSummary,
  placeClimate,
  placeSummaries,
} from '../../src/ssg/game/authoring/world-city-model';
import type { CitySource } from '../../src/ssg/game/world/city';

const d = validateCitySource(
  JSON.parse(fs.readFileSync('src/ssg/game/world/city.json', 'utf8')),
) as CitySource;
const list = cityList(d);
assert.equal(list.places.length, d.PLACES.length);
assert.equal(list.districts.length, d.DISTRICTS.length);
assert.equal(list.travel.length, d.LINE.length + d.STAND_IDS.length + 1);
const shop = list.places.find((p) => p.id === 'shop')!;
assert.equal(shop.colour, d.DISTRICT_MAP.downtown.col, 'places carry their district colour');
assert.equal(list.places.find((p) => p.district === null)!.districtName, 'Transit');
assert.ok(
  cityList(d, 'harbor').places.every((p) => /harbor/i.test(p.id + p.name + p.districtName)),
);
assert.equal(cityList(d, 'zzz-none').places.length, 0);

assert.equal(
  climateSummary({ name: 'x', seed: 1, weights: { rain: 4, cloudy: 3, clear: 2 } }),
  'mostly rain, cloudy',
);
assert.equal(climateSummary({ name: 'x', seed: 1, weights: {}, fixed: 'fog' }), 'always fog');
assert.equal(climateSummary(undefined), 'no climate');

const downtown = d.PLACES.find((p) => p.id === 'downtown')!;
const inherited = placeClimate(d, { ...downtown, climate: undefined });
assert.equal(inherited.inherited, true);
assert.equal(inherited.key, 'downtown');
const own = placeClimate(d, { ...downtown, climate: 'beach' });
assert.deepEqual([own.inherited, own.key], [false, 'beach']);
assert.equal(placeClimate(d, { ...downtown, district: null, climate: undefined }).key, undefined);

const s = placeSummaries(d, downtown);
assert.match(s.travel, /taxi/);
assert.equal(
  placeSummaries(d, { ...downtown, scenes: ['nowhere' as never] }).travel,
  'no stop here',
);
assert.equal(placeSummaries(d, { ...downtown, access: undefined }).access, 'open');
console.log(
  'world city model: ' + list.places.length + ' places, ' + list.districts.length + ' districts',
);
