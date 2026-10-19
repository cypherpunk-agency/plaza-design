import {withBotConversations,botConversationId} from '../../src/ssg/game/engine/gameplay/bot-conversations';
import {botProfile} from '../../src/ssg/game/runtime/characters';
/** Coverage evidence, never a substitute for the full G0–G13 acceptance audit. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {SCENES} from '../../src/ssg/game/scenes';
import {gameplayScenes} from '../../src/ssg/game/authoring/gameplay-scenes';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import corpus from '../../src/ssg/game/docs/reference/CONVERSATION-MIGRATION.json';
const ids=Object.keys(SCENES),registered=gameplayScenes.filter(s=>ids.includes(s.id));
assert.equal(ids.length,19);assert.equal(new Set(sourceDocuments.map(d=>d.id)).size,sourceDocuments.length);
const pending=ids.filter(id=>!registered.some(s=>s.id===id));
let migrated=0;for(const row of corpus.rows){if(row.status!=='migrated'||row.kind!=='npc'||!ids.includes(row.scene))continue;
 const scene=SCENES[row.scene as keyof typeof SCENES],actor=scene.people?.find(p=>p.id===row.id);
 // Harbor's guided conversations and device conversations have separate source-backed paths.
 if(!actor)continue;
 assert.ok(actor.conversation,`${row.scene}/${row.id} claims migrated but has no shared binding`);
 assert.ok(scene.gameplay?.conversations[actor.conversation!],`${row.scene}/${row.id} shared graph missing`);
 migrated++;
}
for(const row of corpus.rows){if(row.kind!=='device'||row.status!=='migrated'||!ids.includes(row.scene))continue;const scene=SCENES[row.scene as keyof typeof SCENES];assert.ok(scene.gameplay?.conversations[row.id],`${row.scene}/${row.id} claims migrated but has no shared device graph`);}
let verifiedBotBindings=0;for(const[id,scene]of Object.entries(SCENES)){const compiled=withBotConversations(scene);for(const[index,p]of (scene.people??[]).entries()){if(p.id&&p.talk){assert(p.conversation,id+'/'+p.id+' has no shared binding');assert(scene.gameplay?.conversations[p.conversation!]);}if(!p.talk&&botProfile(p)){assert(compiled.gameplay?.conversations[botConversationId(id,p,index)]);verifiedBotBindings++;}}}
for(const descriptor of sourceDocuments)assert.ok(fs.existsSync('src/ssg/game/'+descriptor.file),descriptor.id);
console.log(JSON.stringify({sceneDocumentCoverage:registered.map(s=>s.id),remainingSceneDocumentCoverage:pending,registeredSceneCount:registered.length,totalScenes:ids.length,sourceDocuments:sourceDocuments.length,verifiedActorBindings:migrated,verifiedBotBindings,remainingLegacyConversationRows:corpus.rows.filter(r=>r.status==='legacy-adapter').length,fullGoalComplete:false}));
