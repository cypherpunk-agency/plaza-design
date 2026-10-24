import type {NetData} from '../data';
import type {CitySource} from '../world/city';
import {defaultPlayFixture,type PlayFixtures,type PlayScene} from './play-fixtures';
import {NATIVE_SCENES} from '../scenes';
import {newAuthoredScene,validateSceneCatalogue} from '../engine/gameplay/scene-catalogue';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import {newVehicleScene,type VehiclePreset} from './vehicle-service';
type Authoring=NonNullable<WorkbenchContext['authoring']>;
const readCatalogue=(api:Authoring)=>validateSceneCatalogue(api.get('authored-scenes').value,NATIVE_SCENES);
/** Places a new scene can belong to, and the default (the place that holds Downtown). */
export function scenePlaces(api:Authoring){const city=api.get('city-source').value as CitySource;return{places:city.PLACES.map(p=>p.id),initial:city.PLACES.find(p=>p.scenes.includes('downtown'))?.id??city.PLACES[0].id};}
/** Why no scene can be created now (the catalogue and the starting states hold 32 each), or ''. */
export function sceneCreationBlocked(api:Authoring){return readCatalogue(api).scenes.length>=32?'The scene catalogue is full (32 scenes)':(api.get('play-fixtures').value as PlayFixtures).fixtures.length>=32?'Starting states are full (32)':'';}
/**
 * Creates an ordinary scene in one undoable edit: its catalogue entry, a default starting state and its place in the city.
 * World › Scenes and the Scene view's New scene dialog both use this.
 */
export function createAuthoredScene(api:Authoring,id:string,name:string,place:string,preset?:string){
 if(preset&&preset!=='shuttle'&&preset!=='cart')throw Error('Unknown scene preset');
 const source=readCatalogue(api);source.scenes.push(preset?newVehicleScene(id,name,preset as VehiclePreset):newAuthoredScene(id,name));validateSceneCatalogue(source,NATIVE_SCENES);
 const fixtures=api.get('play-fixtures').value as PlayFixtures,fixture=defaultPlayFixture(id as PlayScene,(api.get('network').value as NetData).scanProgram);if(fixtures.fixtures.some(f=>f.id===fixture.id))throw new Error('A starting-state ID already belongs to another scene');fixtures.fixtures.push(fixture);
 if(!api.editDocuments)throw new Error('Atomic scene creation is unavailable');const world=api.get('city-source').value as CitySource,home=world.PLACES.find(p=>p.id===place);if(!home)throw new Error('Unknown place '+place);home.scenes.push(id as PlayScene);
 api.editDocuments([{id:'authored-scenes',value:source},{id:'play-fixtures',value:fixtures},{id:'city-source',value:world}],'Create scene '+id);
}
/** Creation owns no drawing or execution: it adds ordinary source consumed by the existing composer. */
export function mountSceneCatalogue(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!,error=document.createElement('p'),body=document.createElement('section');error.setAttribute('role','alert');host.replaceChildren(error,body);const form=new TypedForm(e=>{error.textContent=String(e);});
 const read=()=>readCatalogue(api);
 function refresh(){body.replaceChildren();const where=scenePlaces(api);let id='',name='New scene',place=where.initial,preset='Empty scene';
  const note=document.createElement('p');note.textContent='Create an ordinary scene, then build it with Layout, Logic and Play. New scenes are saved with the authored scene catalogue.';body.append(note);
  form.text(body,'New scene ID',id,value=>{id=value;});form.text(body,'New scene name',name,value=>{name=value;});
  form.select(body,'New scene place',where.places,place,value=>{place=value;});
  form.select(body,'New scene preset',['Empty scene','Working shuttle','Curve and drop cart'],preset,value=>{preset=value;});
  form.button(body,'Create scene',()=>{createAuthoredScene(api,id,name,place,preset==='Empty scene'?undefined:preset==='Working shuttle'?'shuttle':'cart');context.openScene(id);},!!sceneCreationBlocked(api));
  for(const entry of read().scenes){const row=form.section(body,entry.scene.name);form.button(row,'Open '+entry.scene.name,()=>context.openScene(entry.scene.id));form.button(row,'Remove '+entry.scene.name,()=>{const source=read();source.scenes=source.scenes.filter(s=>s.scene.id!==entry.scene.id);validateSceneCatalogue(source,NATIVE_SCENES);const fixtures=api.get('play-fixtures').value as PlayFixtures;fixtures.fixtures=fixtures.fixtures.filter(f=>f.scene!==entry.scene.id);if(!api.editDocuments)throw new Error('Atomic scene removal is unavailable');const world=api.get('city-source').value as CitySource;if(world.START_SCENE===entry.scene.id||world.PLACES.some(p=>p.entrance===entry.scene.id))throw new Error('Choose another city starting scene or place entrance before removing this scene');for(const place of world.PLACES)place.scenes=place.scenes.filter(id=>id!==entry.scene.id);api.editDocuments([{id:'authored-scenes',value:source},{id:'play-fixtures',value:fixtures},{id:'city-source',value:world}],'Remove scene '+entry.scene.id);refresh();});}
 }
 refresh();const dispose=(()=>host.replaceChildren()) as WorkbenchHandle;dispose.refresh=refresh;return dispose;
}
