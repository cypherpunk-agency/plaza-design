import assert from 'node:assert/strict';
import {createThumbnails} from '../../src/ssg/game/authoring/asset-thumbnails';
import type {AssetEntry} from '../../src/ssg/game/authoring/asset-browser';
const context = {clearRect(){},fillText(){},drawImage(){},getImageData(){return {data:new Uint8ClampedArray([0,0,0,255]),width:1,height:1};}};
class Canvas {isConnected=true;dataset:Record<string,string>={};width=0;height=0;title='';getContext(){return context;}setAttribute(){}}
let intersect:(rows:any[])=>void=()=>{};
const observed=new Set<Canvas>();
class Observer {constructor(callback:any){intersect=callback;}observe(c:Canvas){observed.add(c);}unobserve(c:Canvas){observed.delete(c);}disconnect(){observed.clear();}}
const oldDocument=globalThis.document, oldObserver=globalThis.IntersectionObserver;
Object.assign(globalThis,{document:{createElement:()=>new Canvas()},IntersectionObserver:Observer});
const entry=(id:string)=>({id,label:id,preview:'standalone',usages:[]} as unknown as AssetEntry);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
let release:(value:string)=>void=()=>{};const calls:string[]=[];
const thumbnails=createThumbnails((_canvas,e)=>{calls.push(e.id);return new Promise<string>(resolve=>{release=resolve;});});
try {
 const a=thumbnails.thumbnail(entry('a')) as unknown as Canvas,b=thumbnails.thumbnail(entry('b')) as unknown as Canvas;
 intersect([{isIntersecting:true,target:a},{isIntersecting:true,target:b}]);assert.deepEqual(calls,['a']);
 b.isConnected=false;thumbnails.prune();release('first');await tick();await tick();assert.deepEqual(calls,['a'],'detached queued tile must not render');
 thumbnails.invalidate();const fresh=thumbnails.thumbnail(entry('a')) as unknown as Canvas;
 intersect([{isIntersecting:true,target:fresh}]);assert.deepEqual(calls,['a','a'],'source invalidation must rerender cached artwork');
 thumbnails.invalidate();release('stale');await tick();assert.equal(fresh.title,'','in-flight stale result must not paint');
 const newest=thumbnails.thumbnail(entry('a')) as unknown as Canvas;intersect([{isIntersecting:true,target:newest}]);release('current');await tick();await tick();assert.equal(newest.title,'current');
 const cached=thumbnails.thumbnail(entry('a')) as unknown as Canvas;assert.equal(cached.title,'current');assert.equal(calls.length,3,'current generation should reuse cache');
 const detached=thumbnails.thumbnail(entry('offscreen')) as unknown as Canvas;detached.isConnected=false;thumbnails.prune();assert(!observed.has(detached),'detached offscreen tile must be unobserved');
 const pending=thumbnails.thumbnail(entry('pending')) as unknown as Canvas;intersect([{isIntersecting:true,target:pending}]);thumbnails.dispose();release('disposed');await tick();assert.equal(pending.title,'');assert.equal(observed.size,0);
} finally {thumbnails.dispose();Object.assign(globalThis,{document:oldDocument,IntersectionObserver:oldObserver});}
console.log('Thumbnail cancellation, invalidation and cache lifecycle PASS');
