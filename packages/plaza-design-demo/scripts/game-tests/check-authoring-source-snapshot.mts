import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {liveSources,perSources} from '../../src/ssg/game/authoring/validation-snapshot';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {pendingNetworkContext} from '../../src/ssg/game/authoring/pending-network';
import {createPendingCity} from '../../src/ssg/game/authoring/pending-city';
// Work budget for editor reads, on the real source documents: within one source version every panel shares one
// map and the expensive pending results (scene registry, network, city) are built once; a new version rebuilds once.
const read=()=>Object.freeze(sourceDocuments.map(d=>Object.freeze({id:d.id,value:JSON.parse(fs.readFileSync(path.resolve('src/ssg/game',d.file),'utf8'))})));
let view=read();const context={documents:[] as {id:string;value:unknown}[],authoring:{snapshot:()=>view}};
const first=liveSources(context);
assert.equal(liveSources(context),first,'panels in one source version share one map');
const registry=pendingRegistry(first),network=pendingNetworkContext(first),city=createPendingCity(first.get('city-source'),first);
for(let i=0;i<3;i++){
 const again=liveSources(context);
 assert.equal(pendingRegistry(again),registry,'the scene registry is reused within a version');
 assert.equal(pendingNetworkContext(again),network,'the network context is reused within a version');
 assert.equal(createPendingCity(again.get('city-source'),again),city,'the city model is reused within a version');
}
let computed=0;const derived=perSources(()=>++computed);derived(first);derived(liveSources(context));
assert.equal(computed,1,'perSources computes once per version');
view=read();const next=liveSources(context);
assert.notEqual(next,first,'a new source version gives a new map');derived(next);assert.equal(computed,2,'and recomputes once');
assert.notEqual(createPendingCity(next.get('city-source'),next),city,'derived results follow the new version');
console.log(`Authoring source snapshot PASS: ${view.length} documents, one shared map and one registry/network/city build per source version.`);
