import { harborStationAdapter, harborStationComposition } from './composition';
import type { Composition, Environment } from '../../art/core/composition';
import type { StationRenderOptions } from '../station-composition';
/** harborStation: location data and interactions. Artwork lives in the shared library. */
import type { SceneDef } from '../kit';


// ---------- Harbor: open air, on the waterfront ----------

const H = harborStationAdapter.layout();


const base: SceneDef = {
  id: 'harborStation',
  name: 'Harbor metro',
  // facing (light.ts): open air on the waterfront, looking east over the water
  facing: 90,
  width: H.width,
  spawn: H.spawn,
  rests: H.benches.map((b, i) => ({ id: 'bench' + i, x: b.x - (b.who ? 12 : 0), kind: 'bench' as const })),
  ambient: { sky: true, weather: true, covers: [{ from: -60, to: H.width + 60, under: H.canopy.under }] },
  horizon: H.horizon,
  intro: ['The Harbor metro. Salt, diesel, and a timetable nobody believes.'],
  exits: [
    { id: 'harbor', x: H.exit, to: 'harbor', at: 'metro', label: '[E] GATE · HARBOR PIER', promptH: 92 },
    { id: 'train', x: H.boardAt, to: '', action: 'board', label: '[E] BOARD', promptH: 84 },
  ],
  readables: [
    { id: 'board', x: H.board, name: 'DEPARTURES', promptH: 120, pages: ['LINE 0 > DOWNTOWN > GALLERIA > HARBOR.', 'IDENTITY CHECK AT ALL EXITS. HAVE YOUR ID READY.'] },
    { id: 'screen', x: H.screen, name: 'REGISTRY SCREEN', promptH: 160, pages: ['STAND BEHIND THE YELLOW LINE.', 'PERSONS CROSSING THE LINE WILL BE RECORDED.'] },
    { id: 'checkpoint', x: H.checkpoint, name: 'REGISTRY CHECKPOINT', promptH: 92, pages: ['REGISTRY CHECKPOINT.', 'RANDOM IDENTITY CHECKS IN PROGRESS. COMPLY WITH ALL REQUESTS.'] },
    { id: 'tide', x: H.tide, name: 'TIDE TABLE', promptH: 84, pages: ['HIGH TIDE 03:12 · LOW TIDE 09:40.', 'PLATFORM MAY FLOOD AT HIGH TIDE. SERVICE CONTINUES.'] },
    { id: 'regular', x: harborStationAdapter.geometry().find(r=>r.instance.id==='regular')!.placement.x, name: 'DOCKWORKER', label: '[E] TALK', promptH: 54, pages: ['Mm. Is this Harbor?', 'Then wake me at the next one. The cranes do my shift. I just have to be here when they break.'] },
  ],

  drawBackdrop: (x,v) => harborStationAdapter.draw(x,v),
};

export function harborStationScene(document:Composition=harborStationComposition,state:Environment['state']={},options:StationRenderOptions={}):SceneDef{return harborStationAdapter.adapt(base,document,state,options);}

export const harborStation=harborStationScene();
