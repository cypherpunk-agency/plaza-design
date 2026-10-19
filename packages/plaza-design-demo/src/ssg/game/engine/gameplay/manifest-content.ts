import type {SceneDocument} from './scene-document';
import type {ManifestGroup} from './manifest-contract';
/** Scene edits are one transaction: content and its composition binding cannot drift apart. */
export function addManifestContent(doc:SceneDocument,group:ManifestGroup,id:string,instance:string){
 if(!doc.manifest)throw new Error('Scene requires a manifest');
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(id)||['constructor','prototype','__proto__'].includes(id))throw new Error('Choose a valid content ID');
 if(doc[group]?.some(r=>r.id===id))throw new Error('Content ID already exists: '+id);
 if(!instance.trim())throw new Error('Choose an artwork instance');
 if((doc[group]?.length??0)>=32)throw new Error('At most 32 entries per content group');
 switch(group){
 case 'uses':doc.uses.push({id,name:'OBJECT',label:'[E] USE',routes:[{pages:['Nothing happens.']}]});break;
 case 'people':(doc.people??=[]).push({id,name:'RESIDENT',talk:[['Hello.']]});break;
 case 'readables':(doc.readables??=[]).push({id,name:'NOTICE',pages:['New notice.']});break;
 case 'rests':(doc.rests??=[]).push({id,kind:'stool'});break;
 case 'exits':(doc.exits??=[]).push({id,to:doc.id,label:'[E] ENTER'});break;
 }
 (doc.manifest[group]??={})[id]=instance;
}
export function removeManifestContent(doc:SceneDocument,group:ManifestGroup,id:string){
 if(!doc.manifest)throw new Error('Scene requires a manifest');
 const rows=doc[group];if(!rows?.some(r=>r.id===id))throw new Error('Unknown content ID: '+id);
 rows.splice(rows.findIndex(r=>r.id===id),1);delete doc.manifest[group]?.[id];
 if(group!=='uses'&&!rows.length)delete doc[group];
 if(group==='uses')for(const objective of doc.objectives??[])if(objective.target===id)delete objective.target;
}

/** Backward-compatible source migration, shared by native scenes; never invent bindings for new IDs. */
export function inheritSceneDefaults(value:SceneDocument,baseline:Pick<SceneDocument,'manifest'|'actors'|'environment'|'companion'>,groups:readonly ManifestGroup[]):SceneDocument{
 const doc=structuredClone(value);
 if(doc.companion===undefined&&baseline.companion!==undefined)doc.companion=structuredClone(baseline.companion);
 if(doc.environment===undefined&&baseline.environment!==undefined)doc.environment=structuredClone(baseline.environment);
 if(doc.actors===undefined&&baseline.actors!==undefined)doc.actors=structuredClone(baseline.actors);
 if(Array.isArray(doc.actors)&&baseline.actors)for(const actor of doc.actors){if(actor){const original=baseline.actors.find(a=>a.id===actor.id);if(actor.reaction===undefined&&original?.reaction!==undefined)actor.reaction=original.reaction;if(actor.bakeSeed===undefined&&original?.bakeSeed!==undefined)actor.bakeSeed=original.bakeSeed;}}
 if(doc.manifest===undefined){if(!baseline.manifest)throw new Error('Scene requires canonical manifest defaults');const manifest=structuredClone(baseline.manifest);
  for(const group of groups){const previous=manifest[group]??{};manifest[group]=Object.fromEntries((doc[group]??[]).map(row=>{const target=previous[row.id];if(!target)throw new Error('New content requires an artwork binding: '+row.id);return[row.id,target];}));}
  doc.manifest=manifest;
 }
 return doc;
}
