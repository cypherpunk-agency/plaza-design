import assert from 'node:assert/strict';
import {Opening,GLIDE} from '../../src/ssg/game/story/title';
import {Game} from '../../src/ssg/game/runtime/game';

for (const reduced of [false,true]) {
  const opening=new Opening(reduced);
  opening.skip();assert.equal(opening.done,false,'skip cannot start a new game from the title');
  opening.go();opening.timeline.seek(GLIDE/3);
  let handed=0,prevented=0;
  const port={opening,term:{focused:false},transport:{key(){throw Error('Escape must work even with paused developer transport');}},
    openingDone(){assert(opening.done);assert.equal(opening.timeline.time(),GLIDE);assert.equal(opening.handoff?.scene,'harbor-station');handed++;}};
  const key=(value:string,repeat=false)=>({key:value,repeat,preventDefault(){prevented++;}} as KeyboardEvent);
  (Game.prototype as any).onKeyDown.call(port,key('Escape',true));
  assert.equal(handed,0,'key repeats do not commit a new handoff');
  (Game.prototype as any).onKeyDown.call(port,key('Escape'));
  assert.equal(handed,1);assert.equal(prevented,2);
  assert(opening.gliding);assert(opening.done);
}
console.log('Opening skip PASS: actual Escape handler completes the glide and uses its Harbor handoff, including reduced motion, paused transport and key repeat.');
