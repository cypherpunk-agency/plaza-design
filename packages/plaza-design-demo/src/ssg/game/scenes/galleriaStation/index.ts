import { galleriaStationAdapter, galleriaStationComposition } from './composition';
import type { Composition, Environment } from '../../art/core/composition';
import type { StationRenderOptions } from '../station-composition';
/** galleriaStation: location data and interactions. Artwork lives in the shared library. */
import type { SceneDef } from '../kit';


// ---------- Galleria: underground, under the mall ----------

const G = galleriaStationAdapter.layout();


const base: SceneDef = {
  id: 'galleriaStation',
  name: 'Galleria metro',
  // facing (light.ts): under the Galleria
  facing: 180,
  width: G.width,
  spawn: G.spawn,
  rests: G.benches.map((b, i) => ({ id: 'bench' + i, x: b.x - (b.who ? 12 : 0), kind: 'bench' as const })),
  intro: ['The Galleria metro, under the mall. The ads followed me down.'],
  exits: [
    { id: 'mall', x: G.exit, to: 'mall', at: 'metro', label: '[E] UP · GALLERIA MALL', promptH: 92 },
    { id: 'train', x: G.boardAt, to: '', action: 'board', label: '[E] BOARD', promptH: 84 },
  ],
  readables: [
    { id: 'board', x: G.board, name: 'DEPARTURES', promptH: 120, pages: ['LINE 0 > HARBOR > DOWNTOWN > GALLERIA.', 'LOOP SERVICE. DELAYS POSSIBLE. NO REASON WILL BE GIVEN.'] },
    { id: 'snacks', x: G.snacks, name: 'SNACK MACHINE', promptH: 80, pages: ['CHIPS: SOLD OUT.', 'NO REFUNDS AT THIS LOCATION.'] },
    { id: 'screen', x: G.screen, name: 'REGISTRY SCREEN', promptH: 160, pages: ['THE REGISTRY THANKS YOU FOR YOUR PATIENCE.', 'WAITING TIMES ARE RECORDED.'] },
    { id: 'linemap', x: G.lineMap, name: 'LINE MAP', promptH: 86, pages: ['LINE 0: DOWNTOWN · GALLERIA · HARBOR.', 'YOU ARE HERE: GALLERIA. THE LINE IS A LOOP.'] },
    { id: 'regular', x: galleriaStationAdapter.geometry().find(r=>r.instance.id==='regular')!.placement.x, name: 'OLD WOMAN', label: '[E] TALK', promptH: 54, pages: ['I come down here for the air conditioning.', 'And the trains. I like to watch them leave without me. It feels like winning.'] },
  ],

  drawBackdrop: (x,v) => galleriaStationAdapter.draw(x,v),
};

export function galleriaStationScene(document:Composition=galleriaStationComposition,state:Environment['state']={},options:StationRenderOptions={}):SceneDef{return galleriaStationAdapter.adapt(base,document,state,options);}

export const galleriaStation=galleriaStationScene();
