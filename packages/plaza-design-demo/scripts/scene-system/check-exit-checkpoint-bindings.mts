import assert from 'node:assert/strict';
import {content} from '../../src/ssg/game/scenes/metro/scene-document';
import {metroComposition} from '../../src/ssg/game/scenes/metro/composition';
import {metroScene} from '../../src/ssg/game/scenes/metro';
import {removeManifestContent} from '../../src/ssg/game/engine/gameplay/manifest-content';
import {validateManifest} from '../../src/ssg/game/engine/gameplay/manifest-contract';
const source=structuredClone(content.scene),composition=structuredClone(metroComposition);
source.manifest!.exitCheckpoints={downtown:{instance:'citymap',x:7,h:20}};
assert.deepEqual(metroScene(composition,{}, {},undefined,source).exits.find(e=>e.id==='downtown')!.checkpoint,{x:217,h:20});
for(const target of [{instance:'missing'},{instance:'citymap',promptH:30}]){const next=structuredClone(source);next.manifest!.exitCheckpoints!.downtown=target;assert.throws(()=>metroScene(composition,{}, {},undefined,next));}
const unknown=structuredClone(source);unknown.manifest!.exitCheckpoints!.missing='citymap';assert.throws(()=>metroScene(composition,{}, {},undefined,unknown));
const invalid=structuredClone(source.manifest!);(invalid.exitCheckpoints as any)={downtown:{instance:'citymap',responseH:20}};assert.throws(()=>validateManifest(invalid));
removeManifestContent(source,'exits','downtown');assert(!source.manifest!.exitCheckpoints);assert(!metroScene(composition,{}, {},undefined,source).exits.some(e=>e.id==='downtown'));
console.log('Exit checkpoint bindings PASS: shared authored point/offset projection, missing exit/artwork/text-height rejection and exit-removal cleanup.');
