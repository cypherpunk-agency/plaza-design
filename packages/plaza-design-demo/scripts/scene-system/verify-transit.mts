/** Focused migration evidence: deterministic transport behavior against the immutable original. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const root = path.resolve('../..');
const oldFile = path.join(root, '.scene-system/baseline/source/ssg/game/scenes/line.ts');
const newFile = path.join(root, 'packages/plaza-design-demo/src/ssg/game/world/transport/line.ts');
const original = await import(pathToFileURL(oldFile).href);
const current = await import(pathToFileURL(newFile).href);
const copy = <T>(v: T): T => structuredClone(v);
const same = (a: unknown, b: unknown, label: string) => assert.equal(JSON.stringify(a), JSON.stringify(b), label);
const names = ['platformTrain','platformOpen','platformLeft','platformDue','platformSync','platformDoors','nextStation','platformQueue','rideStop','rideNext','between','rideAtSiding','rideOpen','rideLeft','rideDue','rideRun','sidingAlong','boardRide','rideSpeed','rideStopsAt','brakeRide','rideDoors','place','arrive','stepRide','phaseOf','trainNo','clock'];
function declarations(file: string) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const result = new Map<string, string>();
  for (const n of source.statements) {
    if (ts.isFunctionDeclaration(n)) result.set(n.name!.text, n.getText(source).replaceAll('\r', ''));
    if (ts.isVariableStatement(n)) for (const d of n.declarationList.declarations) result.set(d.name.getText(source), d.getText(source).replaceAll('\r', ''));
  }
  return result;
}
const oldDecl = declarations(oldFile), newDecl = declarations(newFile);
for (const name of names) assert.equal(newDecl.get(name), oldDecl.get(name), `${name}: simulation declaration changed`);
const initial = { original: copy(original.ride), current: copy(current.ride) };
same(initial.original, initial.current, 'initial ride');
const stations = ['downtown', 'galleria', 'harbor'];
let platformCases = 0, rideFrames = 0;
const scenarios: unknown[] = [];
for (const harbor of [true, false]) {
  original.lineOpen.harbor = current.lineOpen.harbor = harbor;
  for (const st of stations) for (const t of [-20,0,1,279,280,281,337,510,680,739,740,1019,1020,1499,1500,3000]) {
    for (const fn of ['platformTrain','platformOpen','platformLeft','platformDue','platformDoors','platformQueue','nextStation']) {
      const args = fn === 'platformDoors' ? [st,t,345,150] : fn === 'platformTrain' ? [st,t,150] : fn === 'nextStation' ? [st] : [st,t];
      same(original[fn](...args), current[fn](...args), `${fn} ${st} ${t}`);
    }
    const before = copy(current.ride);
    current.platformTrainVisual(st,t,150); current.departureVisual(st,t); current.trainVisualState();
    same(before,current.ride,'visual snapshot mutated simulation');
    platformCases++;
  }
  for (const st of stations) {
    original.platformSync(st,250,190); current.platformSync(st,250,190);
    same(original.platformTrain(st,250,150),current.platformTrain(st,250,150),'platformSync');
  }
  for (const brakeAt of [-1, 200, 400, 510, 600]) {
    Object.assign(original.ride,initial.original); Object.assign(current.ride,initial.current);
    original.boardRide('galleria',150); current.boardRide('galleria',150);
    const start = copy(current.ride), events: unknown[] = [];
    let braked = false;
    for (let frame=0;frame<2600;frame++) {
      if (!braked && brakeAt >= 0 && current.ride.phase === 'running' && current.ride.timer >= brakeAt) {
        same(original.brakeRide(),current.brakeRide(),'brake result'); braked=true;
      }
      if (current.rideAtSiding()) { original.rideDoors(true); current.rideDoors(true); }
      const oldEvent=original.stepRide(1),newEvent=current.stepRide(1);
      same(oldEvent,newEvent,'ride event'); same(original.ride,current.ride,`ride state frame ${frame}`);
      for(const fn of ['rideSpeed','rideStopsAt','rideStop','rideNext','between','rideAtSiding','rideOpen','rideLeft','rideDue','rideRun','sidingAlong']) same(original[fn](),current[fn](),fn);
      if(newEvent) events.push({frame,event:newEvent,phase:current.ride.phase,halt:current.ride.halt});
      rideFrames++;
    }
    scenarios.push({harbor,brakeAt,initial:start,final:copy(current.ride),events});
  }
}
const final = { original: copy(original.ride), current: copy(current.ride) };
same(final.original,final.current,'final ride');
/** Record exact canvas commands without pretending to be a pixel renderer. */
function recording() {
  const operations: unknown[] = [], values: Record<string, unknown> = {globalAlpha:1};
  let gradient = 0;
  const ctx = new Proxy(values, {
    get(target,key: string) {
      if (key in target) return target[key];
      if (key==='measureText') return (text: string) => { operations.push([key,text]);return {width:text.length*4.25}; };
      if (key==='createLinearGradient'||key==='createRadialGradient') return (...args: unknown[]) => {
        const id=++gradient;operations.push([key,...args]);
        return {id,addColorStop:(...args: unknown[])=>operations.push(['addColorStop',id,...args])};
      };
      return (...args: unknown[])=>operations.push([key,...args]);
    },
    set(target,key: string,value) { operations.push(['set',key,value]);target[key]=value;return true; },
  }) as unknown as CanvasRenderingContext2D;
  return {ctx,operations};
}
const platformArtwork = await import(pathToFileURL(path.join(root,'packages/plaza-design-demo/src/ssg/game/art/vehicles/platform-train.ts')).href);
const signArtwork = await import(pathToFileURL(path.join(root,'packages/plaza-design-demo/src/ssg/game/art/signage/line-departures.ts')).href);
let commandCases=0;
for (const harbor of [true,false]) {
  original.lineOpen.harbor=current.lineOpen.harbor=harbor;
  for(const st of stations) for(const t of [0,280,400,700,900,1300]) {
    const v={sx:(wx: number,p=1)=>Math.round(wx-120*p),y:(h: number)=>280-h,t,viewW:640,viewH:360,cam:120,gy:280,flags:{}};
    const before=recording(),after=recording();
    original.drawPlatformTrain(before.ctx,v,st,150);
    platformArtwork.drawPlatformTrain(after.ctx,v,current.platformTrainVisual(st,t,150));
    original.drawDepartures(before.ctx,v,st,420,112,150);
    signArtwork.drawDepartures(after.ctx,v,current.departureVisual(st,t),420,112,150);
    same(before.operations,after.operations,`platform/sign canvas commands ${st} ${t} ${harbor}`);commandCases++;
  }
}
const oldTrain = (await import(pathToFileURL(path.join(root,'.scene-system/baseline/source/ssg/game/scenes/train.ts')).href)).train;
const newTrain = (await import(pathToFileURL(path.join(root,'packages/plaza-design-demo/src/ssg/game/scenes/train/index.ts')).href)).train;
for(const phase of ['dwell','running','halted']) for(const pos of [0,2500,4400,5800,8300]) {
  Object.assign(original.ride,initial.original,{phase,pos});Object.assign(current.ride,initial.current,{phase,pos});
  for(const home of [false,true]) {
    const flags=home?{'opening:home':true}:{};
    const v={sx:(wx: number,p=1)=>Math.round(wx-300*p),y:(h: number)=>280-h,t:137,viewW:640,viewH:360,cam:300,gy:280,flags};
    const before=recording(),after=recording(),e={hover:'train',layer:'backdrop'};
    oldTrain.drawBackdrop(before.ctx,v,e);newTrain.drawBackdrop(after.ctx,v,e);
    oldTrain.drawFront(before.ctx,v);newTrain.drawFront(after.ctx,v);
    same(before.operations,after.operations,`interior canvas commands ${phase} ${pos} ${home}`);commandCases++;
  }
}
const evidence = { unchangedDeclarations:names,platformCases,rideFrames,commandCases,initial,final,scenarios,scope:'Focused transport simulation equivalence, snapshot purity and exact canvas command sequence comparison; pixel parity is checked separately by the renderer fixture.' };
fs.writeFileSync(path.join(root,'.scene-system/evidence/S4-transit-behavior.json'),JSON.stringify(evidence,null,2));
console.log(`Transit: ${names.length} unchanged declarations, ${platformCases} platform cases, ${rideFrames} ride frames, ${commandCases} exact canvas command cases match original; visual snapshots do not mutate ride state.`);
