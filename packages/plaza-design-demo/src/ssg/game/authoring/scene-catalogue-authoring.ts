import type {NetData} from '../data';
import type {CitySource} from '../world/city';
import {defaultPlayFixture,type PlayFixtures,type PlayScene} from '../world/checkpoints';
import {NATIVE_SCENES} from '../scenes';
import {newAuthoredScene,validateSceneCatalogue} from '../engine/gameplay/scene-catalogue';
import type {WorkbenchContext} from './contracts';
import {newVehicleScene,type VehiclePreset} from './vehicle-service';
type Authoring=NonNullable<WorkbenchContext['authoring']>;
const readCatalogue=(api:Authoring)=>validateSceneCatalogue(api.get('authored-scenes').value,NATIVE_SCENES);
/** Places a new scene can belong to, and the default (the place that holds Downtown). */
export function scenePlaces(api:Authoring){const city=api.get('city-source').value as CitySource;return{places:city.PLACES.map(p=>p.id),initial:city.PLACES.find(p=>p.scenes.includes('downtown'))?.id??city.PLACES[0].id};}
/** Why no scene can be created now (the catalogue and the starting states hold 32 each), or ''. */
export function sceneCreationBlocked(api:Authoring){return readCatalogue(api).scenes.length>=32?'The scene catalogue is full (32 scenes)':(api.get('play-fixtures').value as PlayFixtures).fixtures.length>=32?'Starting states are full (32)':'';}
/**
 * Creates an ordinary scene in one undoable edit: its catalogue entry, a default starting state and its place in the city.
 * The world editor's New chunk inspector uses this.
 */
export function createAuthoredScene(api:Authoring,id:string,name:string,place:string,preset?:string){
 if(preset&&preset!=='shuttle'&&preset!=='cart')throw Error('Unknown scene preset');
 const source=readCatalogue(api);source.scenes.push(preset?newVehicleScene(id,name,preset as VehiclePreset):newAuthoredScene(id,name));validateSceneCatalogue(source,NATIVE_SCENES);
 const fixtures=api.get('play-fixtures').value as PlayFixtures,fixture=defaultPlayFixture(id as PlayScene,(api.get('network').value as NetData).scanProgram);if(fixtures.fixtures.some(f=>f.id===fixture.id))throw new Error('A starting-state ID already belongs to another scene');fixtures.fixtures.push(fixture);
 if(!api.editDocuments)throw new Error('Atomic scene creation is unavailable');const world=api.get('city-source').value as CitySource,home=world.PLACES.find(p=>p.id===place);if(!home)throw new Error('Unknown place '+place);home.scenes.push(id as PlayScene);
 api.editDocuments([{id:'authored-scenes',value:source},{id:'play-fixtures',value:fixtures},{id:'city-source',value:world}],'Create scene '+id);
}
/** Removing source is deliberately separate from unmounting a world member. */
export function removeAuthoredScene(api:Authoring,id:string){
 const source=readCatalogue(api);if(!source.scenes.some(s=>s.scene.id===id))throw Error('Only authored chunk sources can be removed here.');
 source.scenes=source.scenes.filter(s=>s.scene.id!==id);validateSceneCatalogue(source,NATIVE_SCENES);
 const fixtures=api.get('play-fixtures').value as PlayFixtures;fixtures.fixtures=fixtures.fixtures.filter(f=>f.scene!==id);
 if(!api.editDocuments)throw Error('Atomic chunk removal is unavailable');const world=api.get('city-source').value as CitySource;
 if(world.PLACES.some(p=>p.entrance===id))throw Error('Choose another place entrance before removing this chunk source.');
 for(const place of world.PLACES)place.scenes=place.scenes.filter(scene=>scene!==id);
 api.editDocuments([{id:'authored-scenes',value:source},{id:'play-fixtures',value:fixtures},{id:'city-source',value:world}],'Remove chunk source '+id);
}
export function authoredSceneIds(api:Authoring){return readCatalogue(api).scenes.map(s=>s.scene.id);}
