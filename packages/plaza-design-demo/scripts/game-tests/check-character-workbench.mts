import assert from 'node:assert/strict';
import {BOT} from '../../src/ssg/game/art/characters/appearance';
import {city} from '../../src/ssg/game/world/clock';
import {light} from '../../src/ssg/game/world/light';
import {WorkbenchPlayback} from '../../src/ssg/game/authoring/workbench-playback';
import {characterWorkbenchCases,characterWorkbenchInventory,createCharacterWorkbenchSession,defaultCharacterConfig,validateCharacterWorkbenchConfig,type CharacterWorkbenchConfig} from '../../src/ssg/game/authoring/character-workbench';
const session=createCharacterWorkbenchSession(),cases=characterWorkbenchCases(),before={day:city.day,min:city.min,seed:city.seed,light:light()};
const normalized=(v:unknown)=>JSON.stringify(v,(key,value)=>key==='key'?undefined:value);
for(const test of cases){const copy=structuredClone(test.config),a=session.prepare(test.config,test.time),b=session.prepare(test.config,test.time),again=createCharacterWorkbenchSession().prepare(test.config,test.time);assert.equal(normalized(a),normalized(b),test.id+' repeat seek');assert.equal(normalized(a),normalized(again),test.id+' fresh session');assert.deepEqual(test.config,copy,'input unchanged');}
assert.deepEqual({day:city.day,min:city.min,seed:city.seed,light:light()},before,'global clock and lighting unchanged');
const config=(family:string,action:string,variant?:string):CharacterWorkbenchConfig=>{const f=characterWorkbenchInventory.families.find(f=>f.id===family)!;return{...defaultCharacterConfig(),family,action,variant:variant??f.variants[0]};};
const frames=(family:string,action:string)=>{const p=config(family,action),rows=[];for(let frame=0;frame<6000;frame+=5){const s=session.prepare(p,frame/60);if(s.pose?.visible)rows.push(s.pose.frame);}return rows;};
const walk=frames('human','walk');assert.ok(walk.some(f=>f.moving&&f.face===1)&&walk.some(f=>f.moving&&f.face===-1)&&walk.some(f=>!f.moving),'walk endpoint/turn/return');
const steal=frames('human','steal');assert.ok(steal.some(f=>!f.moving&&f.arms==='reach')&&steal.some(f=>f.moving&&f.face===-1),'steal grab/return');
const carry=frames('loader','carry');assert.ok(carry.some(f=>f.arms==='load')&&carry.some(f=>f.arms==='empty'),'native loaded outbound/empty return');
const serve=frames('waiter','serve');assert.ok(serve.some(f=>f.arms.startsWith('tray'))&&serve.some(f=>f.arms.startsWith('offer')),'native tray/offer');
const marshal=frames('marshal','direct');assert.ok(marshal.some(f=>f.arms==='stop')&&marshal.some(f=>f.arms==='go'));
const follow=session.prepare(config('porter','follow'),5);assert.ok(follow.pose?.visible&&!('follow' in follow.pose.character),'following resolved without object links');
for(const [family,act]of [['crawler','weld'],['crawler','scrub'],['servbot','charge'],['servbot','blink'],['servbot','glitch']])assert.notEqual(normalized(session.prepare(config(family,act),0)),normalized(session.prepare(config(family,act),1.25)));
assert.equal(Object.keys(BOT).length,20);assert.equal(characterWorkbenchInventory.families.filter(f=>f.group==='Robots').length,20);assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
for(const [key,color]of Object.entries(characterWorkbenchInventory.humanColorCases)){// A colour someone sets always wins, even one close to the top's.
const p=session.prepare({...defaultCharacterConfig(),look:{[key]:color,...(key==='bottom'?{top:color}:{})}},0).pose;assert.ok(p?.visible);assert.equal((p.ready.full as unknown as Record<string,unknown>)[key],color,key+' human control reaches native appearance');}
for(const [key,color]of Object.entries(characterWorkbenchInventory.robotColorCases)){const p=session.prepare({...config('servbot','stand'),robot:{[key]:color}},0).pose;assert.ok(p?.visible);assert.equal((p.ready.bot as unknown as Record<string,unknown>)[key],color,'robot control reaches native appearance');}
assert.throws(()=>validateCharacterWorkbenchConfig({...defaultCharacterConfig(),family:'cat',action:'weld'}),/Unsupported/);assert.throws(()=>validateCharacterWorkbenchConfig({...defaultCharacterConfig(),seed:NaN}),/seed/);
const clock=new WorkbenchPlayback(2);clock.play();clock.tick(1000);clock.tick(1500);assert.equal(clock.time,.5);clock.pause();clock.tick(3000);assert.equal(clock.time,.5);clock.step();assert.equal(clock.time,.5+1/60);clock.seek(1.9);clock.play();clock.tick(4000);clock.tick(4300);assert.ok(Math.abs(clock.time-.2)<1e-9);clock.setReduced(true);assert.equal(clock.effectiveTime(),0);clock.seek(1);assert.equal(clock.time,1);assert.equal(clock.effectiveTime(),0);clock.setReduced(false);assert.equal(clock.effectiveTime(),1);clock.loop=false;clock.play();clock.tick(5000);clock.tick(8000);assert.equal(clock.time,2);assert.equal(clock.playing,false);clock.dispose();session.dispose();
console.log('Character workbench checks passed: '+cases.length+' frozen family/action/variant/appearance/facing/time cases replay deterministically; real transition/load/follow states; no clock/light/input mutation; invalid combinations rejected; playback pause/step/seek/loop/reduced/end. Browser RGBA parity remains separate.');
