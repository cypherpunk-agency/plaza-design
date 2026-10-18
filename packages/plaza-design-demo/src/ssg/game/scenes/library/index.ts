import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type { Composition, Environment } from '../../art/core/composition';
import {applyScenePresentation,compileSceneDocument,type SceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {LIBRARY_GAMEPLAY,LIBRARY_SCENE,validateLibraryGameplay,validateLibraryScene} from './scene-document';
import { libraryComposition, validateLibraryComposition, libraryLayout, libraryGeometry, bindLibraryActors, type LibraryRenderOptions } from './composition';
/**
 * The public library (Act I, between Capsule 7B and Downtown's net puzzles; P16 Long overdue):
 * Downtown's branch, on the street west of the noodle stall. The books were digitized years ago;
 * the building is kept for the chairs. The public terminals give each verified identity thirty
 * minutes; you have none. The library's own LAN (net.json: reachable only from inside) is the way:
 * the card reader knows the catalog, the printer knows SOFTWARE LENDING, the printer's stuck job
 * names the borrower, and renewing an eleven-year-old loan gets you `scan.so`.
 *
 * Devices and nodes are devices.json; the LAN goal remains in rules.ts. Ordinary interaction,
 * dialogue, readable and exit content are scene.json; scene.ts retains actor appearance and
 * the visual adapter. The way out is the door, back onto the street.
 */

import { LIBRARY } from "../../data/index";
import type { SceneDef } from "../kit";
import { libraryDeviceData } from './composition';
import { LIBRARY_RULES } from './rules';
import { drawLibrary,libraryFrameEnvironment, L, LIBRARY_W, PEOPLE } from './scene';

export { LIBRARY_RULES } from './rules';
export { drawLibrary, libraryFrameEnvironment } from './scene';
export { libraryComposition, libraryArt, validateLibraryComposition, libraryEnvironment } from './composition';

/** The library, complete: data, rules, drawing, its life, the door. */
const baseLibrary: SceneDef = {
  id: 'library',
  name: 'the public library',
  // facing (light.ts): the reading room's tall windows look west over Downtown's towers
  facing: 270,
  width: LIBRARY_W,
  spawn: L.spawn,
  exits: [{ id: 'downtown', x: L.door, to: 'downtown', at: 'library', label: '[E] DOWNTOWN', promptH: 82 }],
  pixel: 'along',
  data: libraryDeviceData(LIBRARY),
  rules: LIBRARY_RULES,
  drawBackdrop: drawLibrary,
  people: PEOPLE,
  // Geometry stays in the composition adapter; player-facing content comes from scene.json.
  readables: [
    {id:'notice',x:L.notice,name:'',pages:[],promptH:110},
    {id:'terminal3',x:L.seats[2]+6,name:'',pages:[],promptH:62},
    {id:'book',x:L.book,name:'',pages:[],promptH:64},
  ],
};

/** Canonical scene definition for shipping source and isolated composer documents. */
export function librarySceneDefinition(document: Composition = libraryComposition, state: Environment['state'] = {}, options: LibraryRenderOptions = {}, sceneDocument:SceneDocument=LIBRARY_SCENE, gameplay:GameplayDefinition=LIBRARY_GAMEPLAY): SceneDef {
  const doc=validateLibraryComposition(document),layout=libraryLayout(doc),geometry=libraryGeometry(doc),byId=(id:string)=>geometry.find(row=>row.instance.id===id)!;
  const commands=validateGameplay(gameplay),content=validateSceneDocument(sceneDocument,commands);
  const compiled=compileSceneDocument(content,{chair:layout.chairs[3]},()=>{throw new Error('Library has no conversation command route');});
  const people=PEOPLE.map(person=>structuredClone(person));
  const ids=['shelfe','librarian','student','kid','sleeper','knitter','paper','cat'];
  bindLibraryActors(Object.fromEntries(ids.map((id,index)=>[id,people[index]])),doc);
  const scene=applyScenePresentation({...baseLibrary,gameplay:commands,gameplayReads:{'library:renewed':'renewed'},width:Number(byId('room').props.width),spawn:layout.spawn,facing:Number(geometry.find(row=>row.instance.type==='library.window')!.props.facing),data:libraryDeviceData(LIBRARY,doc),people,
    exits:baseLibrary.exits.map(exit=>({...exit,x:layout.door})),
    readables:baseLibrary.readables!.map(readable=>({...readable,x:readable.id==='notice'?layout.notice:readable.id==='book'?layout.book:layout.seats[2]+6,promptH:(readable.promptH??0)+(readable.id==='notice'?byId('notice').placement.h-98:readable.id==='book'?byId('reference-book').placement.h:byId('terminal-3').placement.h)})),
    uses:compiled.uses.map(use=>({...use,x:layout.chairs[3],h:20+byId('armchair-4').placement.h,promptH:40+byId('armchair-4').placement.h})),
    drawBackdrop:(ctx,view,engine)=>drawLibrary(ctx,view,engine,doc,state,options),
  },content);
  const renderActors=Object.fromEntries(ids.map((id,index)=>[id,scene.people![index]]));
  // Preserve the existing platform-specific control hint while authoring the common arrival text.
  return {...scene,drawBackdrop:(ctx,view,engine)=>drawLibrary(ctx,view,engine,doc,state,options,renderActors),visualEnvironment:(view,engine)=>libraryFrameEnvironment(view,engine,doc,renderActors),intro:(touch:boolean)=>content.intro.map(page=>touch?page.replace('H shows how the room is wired.','HACK shows how the room is wired.'):page)};
}
export function libraryScene(document:Composition=libraryComposition,state:Environment['state']={},options:LibraryRenderOptions={},sceneDocument:SceneDocument=LIBRARY_SCENE,gameplay:GameplayDefinition=LIBRARY_GAMEPLAY):SceneDef{return librarySceneDefinition(document,state,options,validateLibraryScene(sceneDocument,validateLibraryGameplay(gameplay)),gameplay);}
export const library=libraryScene();
