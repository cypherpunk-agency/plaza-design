import assert from 'node:assert/strict';
import {libraryScene} from '../../src/ssg/game/scenes/library';
import {libraryComposition} from '../../src/ssg/game/scenes/library/composition';
import {LIBRARY_SCENE} from '../../src/ssg/game/scenes/library/scene-document';
const scene=libraryScene();

assert.equal(typeof scene.intro,'function');
const arrival=scene.intro as (touch:boolean)=>string[];
assert.deepEqual(arrival(false),LIBRARY_SCENE.intro);
assert.deepEqual(arrival(true),LIBRARY_SCENE.intro.map(page=>page.replace('H shows how the room is wired.','HACK shows how the room is wired.')));
const pendingIntro=structuredClone(LIBRARY_SCENE);pendingIntro.intro=['H shows how the room is wired.'];pendingIntro.introTouch=['Authored touch arrival'];
const pendingArrival=libraryScene(libraryComposition,{}, {},pendingIntro).intro as (touch:boolean)=>string[];
assert.deepEqual(pendingArrival(false),pendingIntro.intro);assert.deepEqual(pendingArrival(true),pendingIntro.introTouch);
delete pendingIntro.introTouch;assert.deepEqual((libraryScene(libraryComposition,{}, {},pendingIntro).intro as (touch:boolean)=>string[])(true),pendingIntro.intro,'no hidden touch wording substitution');

console.log('Library arrival source PASS: unchanged desktop/touch wording, edited variants reach native scene, removing touch override uses authored desktop text without hidden replacement.');
