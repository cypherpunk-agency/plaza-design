/** Rendering consumes its prepared light snapshot, independent of global time. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {frameView} from '../../src/ssg/game/art/core/view';
import {drawTowers,towers} from '../../src/ssg/game/art/core/primitives';
import {lightAt,setLight} from '../../src/ssg/game/world/light';
function record(){const ops:unknown[]=[],target:Record<string,unknown>={};const ctx=new Proxy(target,{get(t,k:string){return k in t?t[k]:(...args:unknown[])=>ops.push([k,...args]);},set(t,k:string,value){t[k]=value;ops.push([k,value]);return true;}}) as CanvasRenderingContext2D;return{ctx,ops};}
const row=towers(17,1400,[14,30],[40,100],.7),L=lightAt(1,23*60,90,null),view={...frameView(137,L),sx:(x:number,p=1)=>Math.round(x-140*p),y:(h:number)=>300-h,gy:300,cam:140,viewW:640,viewH:360};
const a=record(),b=record();setLight(lightAt(1,12*60,90,null));drawTowers(a.ctx,view,row,.7,300,.3);setLight(lightAt(5,3*60,270,null));drawTowers(b.ctx,view,row,.7,300,.3);assert.deepEqual(a.ops,b.ops,'drawTowers queried global light instead of View snapshot');
console.log('Art Light input checks: tower rendering ignores changed global Light.');
