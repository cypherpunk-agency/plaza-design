import {nativeDeviceDialogues} from '../../engine/gameplay/native-dialogue';
import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type { Composition, Environment } from '../../art/core/composition';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {LIBRARY_GAMEPLAY,LIBRARY_SCENE,validateLibraryGameplay,validateLibraryScene,librarySource,libraryBindingGroups} from './scene-document';
import { libraryComposition, validateLibraryComposition, libraryGeometry, type LibraryRenderOptions } from './composition';
/**
 * The public library (Act I, between Capsule 7B and Downtown's net puzzles; P16 Long overdue):
 * Downtown's branch, on the street west of the noodle stall. The books were digitized years ago;
 * the building is kept for the chairs. The public terminals give each verified identity thirty
 * minutes; you have none. The library's own LAN (net.json: reachable only from inside) is the way:
 * the card reader knows the catalog, the printer knows SOFTWARE LENDING, the printer's stuck job
 * names the borrower, and renewing an eleven-year-old loan gets you `scan.so`.
 *
 * Devices and nodes are devices.json; the LAN goal observations are authored there; puzzle policy stays in the authored graph. Ordinary interaction,
 * dialogue, readable and exit content are scene.json; scene.json also owns actor bodies; scene.ts retains
 * the visual adapter. The way out is the door, back onto the street.
 */

import { LIBRARY } from "../../data/index";
import type {SceneData} from '../../data/types';
import type { SceneDef } from "../kit";
import { libraryDeviceData } from './composition';
import { LIBRARY_RULES } from './rules';
import { drawLibrary,libraryFrameEnvironment, libraryActors } from './scene';

export { LIBRARY_RULES } from './rules';
export { drawLibrary, libraryFrameEnvironment } from './scene';
export { libraryComposition, libraryArt, validateLibraryComposition, libraryEnvironment } from './composition';

/** Canonical scene definition for shipping source and isolated composer documents. */
export function librarySceneDefinition(document: Composition = libraryComposition, state: Environment['state'] = {}, options: LibraryRenderOptions = {}, sceneDocument:SceneDocument=LIBRARY_SCENE, gameplay:GameplayDefinition=LIBRARY_GAMEPLAY,deviceSource:SceneData=LIBRARY): SceneDef {
  const doc=validateLibraryComposition(document),geometry=libraryGeometry(doc);
  const commands=validateGameplay(gameplay),content=validateSceneDocument(librarySource(sceneDocument),commands,{actors:true,manifest:true});
  const compiled=compileManifestDocument(content,geometry,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:libraryBindingGroups,groundExits:false});
  const actors=libraryActors(doc,content);
  return {id:'library',name:content.name,facing:Number(geometry.find(row=>row.instance.type==='library.window')!.props.facing),
    ...compiled.content,gameplay:withSceneConversations(commands,content),
    data:commands.native?libraryDeviceData({...deviceSource,dialogue:nativeDeviceDialogues(commands,deviceSource)},doc,content):undefined,rules:commands.native?LIBRARY_RULES:undefined,
    people:content.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),
    drawBackdrop:(ctx,view,engine)=>drawLibrary(ctx,view,engine,doc,state,options,actors),
    visualEnvironment:(view,engine)=>libraryFrameEnvironment(view,engine,doc,actors),
    intro:(touch:boolean)=>content.introTouch&&touch?[...content.introTouch]:content.intro.map(page=>touch?page.replace('H shows how the room is wired.','HACK shows how the room is wired.'):page),
  };
}
export function libraryScene(document:Composition=libraryComposition,state:Environment['state']={},options:LibraryRenderOptions={},sceneDocument:SceneDocument=LIBRARY_SCENE,gameplay:GameplayDefinition=LIBRARY_GAMEPLAY,deviceSource:SceneData=LIBRARY):SceneDef{return librarySceneDefinition(document,state,options,validateLibraryScene(sceneDocument,validateLibraryGameplay(gameplay)),gameplay,deviceSource);}
export const library=libraryScene();
