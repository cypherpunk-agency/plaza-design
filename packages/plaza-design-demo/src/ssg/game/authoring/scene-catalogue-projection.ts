import {emptyDeviceSource} from '../engine/empty-data';
import type {EditorDocument} from './app';
import type {DocumentProjection} from './document-projection';
import {authoredDocumentId,type SceneCatalogue} from '../engine/gameplay/scene-catalogue';
export const SCENE_CATALOGUE_ID='authored-scenes';
const parts=['composition','scene','gameplay','devices'] as const;
export const sceneCatalogueProjection:DocumentProjection={
 sourceId:SCENE_CATALOGUE_ID,
 children(source){
  const catalogue=source.value as SceneCatalogue;if(!catalogue||catalogue.version!==1||!Array.isArray(catalogue.scenes)||catalogue.scenes.length>32)throw new Error('Malformed authored scene catalogue');
  return catalogue.scenes.flatMap(entry=>{if(!entry?.scene||typeof entry.scene.id!=='string')throw new Error('Missing authored scene identity');return parts.map(part=>({id:authoredDocumentId(entry.scene.id,part),kind:part,revision:source.revision,value:part==='devices'?(entry.devices??emptyDeviceSource(entry.scene.id,entry.scene.name)):entry[part]}));});
 },
 replace(source,id,value){const catalogue=structuredClone(source) as SceneCatalogue;
  for(const entry of catalogue.scenes)for(const part of parts)if(authoredDocumentId(entry.scene.id,part)===id){entry[part]=structuredClone(value) as never;return catalogue;}
  throw new Error('Unknown projected authored document: '+id);
 },
};
export function authoredDocuments(source:EditorDocument):EditorDocument[]{return sceneCatalogueProjection.children(source);}
