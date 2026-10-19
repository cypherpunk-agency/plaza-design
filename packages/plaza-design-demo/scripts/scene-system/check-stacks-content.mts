import assert from 'node:assert/strict';import fs from 'node:fs';
import {stacksScene,stacksComposition} from '../../src/ssg/game/scenes/stacks';
import {content} from '../../src/ssg/game/scenes/stacks/scene-document';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const old=JSON.parse(fs.readFileSync('../../.scene-system/all-game-baseline-2026-10-18/manifest.json','utf8')).rows.find((r:any)=>r.id==='stacks').baseline,scene=stacksScene();
assert.equal(scene.width,old.width);assert.equal(scene.spawn,old.spawn);assert.deepEqual(scene.readables,old.readables);assert.deepEqual(scene.exits,old.exits);
let saved:GameplayState={flags:{},items:{},tokens:0};const gp=new GameplaySession(scene.gameplay!,{read:()=>saved,write:s=>{saved=s;}});
const urn=scene.uses![0];assert.equal(urn.x,old.uses[0].x);assert.equal(urn.promptH,old.uses[0].promptH);
assert.deepEqual(urn.use({gameplay:gp} as any),["(You pour a paper cup of black tea from the night shift's urn. Nobody stops you. Nobody sees you. Those are the same thing now.)"]);assert.equal(saved.items.tea,1);
assert.deepEqual(urn.use({gameplay:gp} as any),['(A note on the urn: ONE CUP EACH. YOU KNOW WHO YOU ARE.)','You do know who you are. You already have a cup.']);assert.equal(saved.items.tea,1);
assert.equal(gp.dispatch('stacks.pour','interaction').ok,false,'cannot duplicate tea via direct command');
let talks=0;for(const actor of scene.people!.filter(p=>p.conversation)){const before=old.people.find((p:any)=>p.id===actor.id);for(let i=0;i<before.talk.length+1;i++){const run=new ConversationSession(gp,actor.conversation!);assert.deepEqual(run.frame().pages,before.talk[Math.min(i,before.talk.length-1)]);run.close();talks++;}}
const pending=structuredClone(content.scene);pending.uses[0].routes[1].pages=['Pending tea'];pending.people![0].talk[0]=['Pending gatekeeper'];
const edited=stacksScene(stacksComposition,{},{},pending,content.gameplay);const fresh=new GameplaySession(edited.gameplay!,{read:()=>({flags:{},items:{},tokens:0}),write:()=>{}});assert.deepEqual(edited.uses![0].use({gameplay:fresh} as any),['Pending tea']);assert.deepEqual(new ConversationSession(fresh,'talk.stacks.gatekeeper').frame().pages,['Pending gatekeeper']);
console.log(`Stacks content PASS: original geometry, tea granting/refusal atomicity, ${talks} immutable NPC page cases, pending native content. Crane/security controller migration remains separate.`);
