import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {Element} from './rules-harness.mts';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {art} from '../../src/ssg/game/art';import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {validatePendingCity,createPendingCity} from '../../src/ssg/game/authoring/pending-city';
import {mountCityAuthoring,type CityAuthoringSession} from '../../src/ssg/game/authoring/city-authoring';
import {mountDistrictAuthoring} from '../../src/ssg/game/authoring/district-authoring';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import type {CitySource} from '../../src/ssg/game/world/city';
const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))}));
const make=()=>{const m=new ComposerModel(art,createSequenceValidationContext(art,{}),(d,all)=>{if(d.id==='city-source')validatePendingCity(d.value,new Map(all.map(d=>[d.id,d.value])));});m.load(documents);return m;},model=make(),host=new Element(),all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
let documentReads=0;
const context:any={get documents(){documentReads++;return model.list();},openScene(){},authoring:{get:(id:string)=>model.get(id),edit:(id:string,label:string,value:unknown)=>model.edit(id,label,()=>value)}};
const field=(name:string)=>{const e=all(host).find(e=>e.attributes['aria-label']===name);assert(e,'Field '+name);return e;},set=(name:string,value:string)=>{const e=field(name);e.value=value;e.onchange!();},click=(label:string)=>{const e=all(host).find(e=>e.textContent===label&&e.onclick);assert(e,'Button '+label);e.onclick!();},city=()=>model.get('city-source').value as CitySource;
let handle=mountCityAuthoring(host as any,context,{section:'place',place:'shop'});
assert(!all(host).some(e=>e.attributes['aria-label']==='Place downtown name'||e.attributes['aria-label']==='Taxi fare'));
set('Place shop name','Review shop');const valid=structuredClone(city());set('Place shop name','');assert.deepEqual(city(),valid);assert(all(host).some(e=>e.attributes.role==='alert'&&e.textContent));set('Place shop name','Review shop');assert(!all(host).some(e=>e.attributes.role==='alert'&&e.textContent));handle();
model.undo();model.redo();assert.deepEqual(city(),valid);
const session:CityAuthoringSession={expanded:new Map()};handle=mountCityAuthoring(host as any,context,{section:'travel',session});assert(!all(host).some(e=>e.attributes['aria-label']==='Place shop name'));const beforeDraft=structuredClone(model.edits()),station=Object.keys(city().STATIONS)[0],original=Number(field('Station '+station+' map x').value);set('Station '+station+' map x',String(original+1));handle();
handle=mountCityAuthoring(host as any,context,{section:'travel',session});assert.equal(Number(field('Station '+station+' map x').value),original+1,'Staged route edits survive leaving/reopening the map inspector');assert.deepEqual(model.edits(),beforeDraft,'Draft controls do not mutate source');click('Discard station route changes');assert.equal(Number(field('Station '+station+' map x').value),original);
const fare=city().FARE;set('Taxi fare',String(fare+1));handle();
handle=mountDistrictAuthoring(host as any,context);const district=city().DISTRICTS[0];set('District '+district.id+' short name','TEST');handle();
const readsBeforeMap=documentReads;handle=mountCityAuthoring(host as any,context,{section:'map'});assert(documentReads-readsBeforeMap<=4,'Nested topology fields must not copy the full pending-document set for every field');assert(!all(host).some(e=>e.attributes['aria-label']==='Taxi fare'));assert(field('New place ID'));handle();
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));assert.deepEqual(receiver.get('city-source').value,city());
const output=path.resolve('../../.game-test-output'),root=fs.mkdtempSync(path.join(output,'map-authoring-save-'));try{
 for(const descriptor of sourceDocuments){const file=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',descriptor.file),file);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),before=fs.readFileSync(path.join(root,'world/city.json'),'utf8'),saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision}))),fresh=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),values=new Map(fresh.list().map(d=>[d.id,d.value])),native=createPendingCity(values.get('city-source'),values);
 assert.equal(native.FARE,fare+1);assert.equal(native.PLACES.find(p=>p.id==='shop')!.name,'Review shop');assert.equal(native.DISTRICTS.find(d=>d.id===district.id)!.short,'TEST');fresh.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(path.join(root,'world/city.json'),'utf8'),before);
}finally{assert(root.startsWith(output+path.sep));fs.rmSync(root,{recursive:true,force:true});}
console.log('Map authoring PASS: contextual scopes, place/district/travel edits, atomic rejection/correction, route draft retention/discard, history/bundle/protected Save/native reconstruction and exact source Undo.');process.exit(0);
