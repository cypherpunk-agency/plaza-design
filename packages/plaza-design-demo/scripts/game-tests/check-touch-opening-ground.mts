import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game} from '../../src/ssg/game/runtime/game';
import {runtimeFixture} from './runtime-fixture.mts';

// Exercise the actual resize calculation used before New Game's live direction.
// A display:none pad has an all-zero rectangle; it cannot reserve a full screen.
const rect={width:1280,height:600,top:0,bottom:600};
const hidden={getClientRects:()=>[],getBoundingClientRect:()=>({top:0,bottom:0})};
const reserved={getClientRects:()=>[{}],getBoundingClientRect:()=>({top:552,bottom:596})};
const chrome={getClientRects:()=>[],getBoundingClientRect:()=>({top:0,bottom:0})};
const originals={window:globalThis.window,document:globalThis.document};
let pad:typeof hidden|typeof reserved=hidden;
Object.assign(globalThis,{window:{devicePixelRatio:2},document:{getElementById:()=>pad}});
try{
 const game=runtimeFixture(Game,{touch:true,spanW:1440,
  canvas:{width:0,height:0,getBoundingClientRect:()=>rect},
  host:{windowEl:{getBoundingClientRect:()=>rect,style:{setProperty(){}}},header:chrome,footer:chrome},
 });
 game.onResize();
 assert.equal(game.camera.gyBase,246,'hidden controls cannot move the player above the viewport');
 pad=reserved;game.onResize();
 assert.equal(game.camera.gyBase,246,'menu/direction reserve the same normal-play ground');
 assert(game.camera.gyBase*game.camera.k/2<reserved.getBoundingClientRect().top,'player ground stays above touch controls');
}finally{Object.assign(globalThis,originals);}
const css=fs.readFileSync('src/ssg/render.tsx','utf8');
assert.match(css,/html\.game-mode\.cutscene #touch,\s*html\.game-menu #touch \{ visibility: hidden; \}/,'hidden direction/menu controls retain their measurable layout');
console.log('Touch opening ground: real resize with absent/reserved controls, stable handoff inset and visible player ground PASS');
