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
