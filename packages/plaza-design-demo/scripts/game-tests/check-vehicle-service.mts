import assert from 'node:assert/strict';
import {newVehicleScene} from '../../src/ssg/game/authoring/vehicle-service';
import {createSceneRegistry} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {levelArrive,levelStep,levelHints,type Level} from '../../src/ssg/game/engine/level';
import {levelVehicleFrames} from '../../src/ssg/game/engine/level-vehicles';
for(const preset of ['shuttle','cart'] as const){
 const source=newVehicleScene('new-'+preset,'New '+preset,preset);
 const scene=createSceneRegistry({},{version:1,scenes:[source]})[source.scene.id];
 const model=new SceneModel({say(){},open(){},changed(){}},scene.data!,undefined,undefined,undefined,undefined,undefined,scene.gameplay);
 const p={x:224,y:0,vy:0,face:1,onGround:true,moving:false},lv:Level={source:scene.level!,state:levelArrive(scene.level!,p,0)};
 levelStep(lv,p,0,1,model);
 if(preset==='shuttle')assert(levelHints(lv,p,model).some(h=>h.id==='vehicle:service'),'new service is immediately boardable');
 else{
  assert(!levelHints(lv,p,model).some(h=>h.id.startsWith('vehicle:')),'a shell-only cart cannot be boarded');
  let high=0,end=false;for(let i=0;i<1500;i++){model.tick(1000/60,true);const f=levelVehicleFrames(scene.level!,model)[0];high=Math.max(high,f.pose.h);if(f.pose.s===1000){end=true;assert.equal(f.pose.h,0);break;}}
  assert(high>140&&end,'the real mover follows the curve and drop to its endpoint');
 }

}
console.log('Vehicle services PASS: new shuttle has complete native boarding; shell-only cart follows its curved/drop route on actual Circuit time.');

// The real harbor service remains horizontal until its full consist clears the station.
import {SCENES} from '../../src/ssg/game/scenes';
import graph from '../../src/ssg/game/world/zone-graph.json';
import {placeFrom} from '../../src/ssg/game/world/zone-graph';
import {routeAt,routeLength,consistLength} from '../../src/ssg/game/world/vehicles';
const service=SCENES['harbor-station'].level!.vehicles!.find(v=>v.source.id==='service')!.source;
const routePlaces=placeFrom(graph,'harbor-station',Infinity);
for(const distance of [0,20,400,800,1120]){
 const pose=routeAt(service.route,distance),at=routePlaces.get(pose.zone)!;
 assert.equal(pose.h+at.dh,0,'train stays level while its carriages are visible beside the platform');
 if(distance===1120)assert(pose.x+at.dx+consistLength(service)<0,'whole train clears the platform before descending');
}
assert.equal(routeLength(service.route),7880,'concealed descent preserves service timing and destinations');
console.log('Harbor departure PASS: level platform clearance and unchanged route timing.');
