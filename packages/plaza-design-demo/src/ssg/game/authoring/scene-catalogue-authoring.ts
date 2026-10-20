import type {NetData} from '../data';
import type {CitySource} from '../world/city';
import {defaultPlayFixture,type PlayFixtures,type PlayScene} from './play-fixtures';
import {NATIVE_SCENES} from '../scenes';
import {newAuthoredScene,validateSceneCatalogue} from '../engine/gameplay/scene-catalogue';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
/** Creation owns no drawing or execution: it adds ordinary source consumed by the existing composer. */
export function mountSceneCatalogue(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!,error=document.createElement('p'),body=document.createElement('section');error.setAttribute('role','alert');host.replaceChildren(error,body);const form=new TypedForm(e=>{error.textContent=String(e);});
 const read=()=>validateSceneCatalogue(api.get('authored-scenes').value,NATIVE_SCENES);
 function refresh(){body.replaceChildren();const city=api.get('city-source').value as CitySource;let id='',name='New scene',place=city.PLACES.find(p=>p.scenes.includes('downtown'))?.id??city.PLACES[0].id;
  const note=document.createElement('p');note.textContent='Create an ordinary scene, then build it with Layout, Logic and Play. New scenes are saved with the authored scene catalogue.';body.append(note);
  form.text(body,'New scene ID',id,value=>{id=value;});form.text(body,'New scene name',name,value=>{name=value;});
  form.select(body,'New scene place',city.PLACES.map(p=>p.id),place,value=>{place=value;});
  form.button(body,'Create scene',()=>{const source=read();source.scenes.push(newAuthoredScene(id,name));validateSceneCatalogue(source,NATIVE_SCENES);const fixtures=api.get('play-fixtures').value as PlayFixtures,fixture=defaultPlayFixture(id as PlayScene,(api.get('network').value as NetData).scanProgram);if(fixtures.fixtures.some(f=>f.id===fixture.id))throw new Error('A starting-state ID already belongs to another scene');fixtures.fixtures.push(fixture);if(!api.editDocuments)throw new Error('Atomic scene creation is unavailable');const world=api.get('city-source').value as CitySource;world.PLACES.find(p=>p.id===place)!.scenes.push(id as PlayScene);api.editDocuments([{id:'authored-scenes',value:source},{id:'play-fixtures',value:fixtures},{id:'city-source',value:world}],'Create scene '+id);context.openScene(id);},read().scenes.length>=32||(api.get('play-fixtures').value as PlayFixtures).fixtures.length>=32);
  for(const entry of read().scenes){const row=form.section(body,entry.scene.name);form.button(row,'Open '+entry.scene.name,()=>context.openScene(entry.scene.id));form.button(row,'Remove '+entry.scene.name,()=>{const source=read();source.scenes=source.scenes.filter(s=>s.scene.id!==entry.scene.id);validateSceneCatalogue(source,NATIVE_SCENES);const fixtures=api.get('play-fixtures').value as PlayFixtures;fixtures.fixtures=fixtures.fixtures.filter(f=>f.scene!==entry.scene.id);if(!api.editDocuments)throw new Error('Atomic scene removal is unavailable');const world=api.get('city-source').value as CitySource;if(world.START_SCENE===entry.scene.id||world.PLACES.some(p=>p.entrance===entry.scene.id))throw new Error('Choose another city starting scene or place entrance before removing this scene');for(const place of world.PLACES)place.scenes=place.scenes.filter(id=>id!==entry.scene.id);api.editDocuments([{id:'authored-scenes',value:source},{id:'play-fixtures',value:fixtures},{id:'city-source',value:world}],'Remove scene '+entry.scene.id);refresh();});}
 }
 refresh();const dispose=(()=>host.replaceChildren()) as WorkbenchHandle;dispose.refresh=refresh;return dispose;
}
