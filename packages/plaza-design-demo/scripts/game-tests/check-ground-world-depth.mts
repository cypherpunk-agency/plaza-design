import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {measureArtwork} from '../../src/ssg/game/art/core/measure';
import type {Properties} from '../../src/ssg/game/art/core/composition';
import {openingDocuments} from '../../src/ssg/game/story/title/documents';
import {sequenceWorldLayout} from '../../src/ssg/game/runtime/prepare-frame';
import {lightAt} from '../../src/ssg/game/world/light';

// A larger editor canvas must reveal empty space below finite terrain, not grow its geometry.
const cases:[string,Properties][]=[
 ...['sand','inlet','rocks','gravel','quay','bridge','plaza','street','road'].map(kind=>['coast.ground',{segments:[{kind,from:0,to:600}]}] as [string,Properties]),
 ['coast.wall',{kind:'sea-wall'}],['coast.wall',{kind:'abutment'}],
 ['street.surface',{water:30}],['shift.floor',{}],['shift.quay',{}],
];
for(const [type,raw] of cases){
 const depthField='depthBelowGround',element=art.get(type),props=art.properties(type,raw),at={x:30,h:37,scale:1,parallax:1,facing:1 as const};
 const measure=(height:number,depth?:number)=>{
  const view={...frameView(600),viewW:960,viewH:height,gy:500,y:(h:number)=>500-h};
  return measureArtwork(ctx=>element.draw(ctx,view,depth===undefined?props:{...props,[depthField]:depth},{},'backdrop',at));
 };
 const small=measure(540),large=measure(1600);
 assert.deepEqual(large,small,type+' geometry depends on canvas height');
 const bottom=small.y+small.height;
 assert.ok(bottom<=500-at.h+Number(props[depthField])+1,type+' paints below its world depth');
 const deeper=measure(1600,Number(props[depthField])+120);
 if(type!=='coast.ground'||!['road'].includes(String((raw.segments as any)?.[0]?.kind)))assert.ok(deeper.y+deeper.height>bottom,type+' depth is not editable');
}
// Finite geometry must still cover the actual directed picture: 96 units cut off terrain
// in the opening, whose wider camera exposes more foreground than ordinary gameplay.
let coverage=0;
for(const [width,height]of [[960,540],[1440,810],[690,302]])for(let time=0;time<=68;time+=.5){
 const q=sequenceWorldLayout(openingDocuments,'glide',time,{width,height,reduced:false,ambientTime:time,lighting:lightAt(1,1140,90,null)},1);
 const cameraBottom=q.gy+q.frame.camera.h-(q.height+q.height/q.frame.camera.zoom)/2;
 for(const id of q.zones){const scene=q.scenes[id],at=q.placed.get(id)!;
  if(at.dx+scene.width<=q.authoredCam||at.dx>=q.authoredCam+q.width)continue;
  for(const node of scene.artwork?.instances??[])if(['coast.ground','shift.floor','street.surface'].includes(node.type)){
   const p=art.properties(node.type,node.props),needed=(node.placement.h??0)+at.dh-cameraBottom;
   assert.ok(Number(p.depthBelowGround)>=needed,`${id}/${node.id} missing foreground at ${time}s (${width}x${height}): needs ${needed}, has ${p.depthBelowGround}`);coverage++;
  }
 }
}
assert.ok(coverage>0);
const block=art.get('architecture.through-block');
for(const height of [900,1400,2600]){
 const p=art.properties(block.type,{height:height+1500,bottomY:-1500}),placement={x:30,h:37,scale:1,parallax:1,facing:1 as const};
 const measure=(viewH:number,gy=500)=>measureArtwork(ctx=>block.draw(ctx,{...frameView(600),viewW:960,viewH,gy,y:h=>gy-h},p,{},'backdrop',placement));
 const a=measure(540);assert.deepEqual(a,measure(1600),'Through-block roof and facade do not depend on canvas height');
 assert.equal(a.y,500-placement.h-height,'Building has an authored, finite roof');
 assert.equal(measure(1600,800).y-a.y,300,'Roof moves with the world, not the top screen edge');
}
console.log(`PASS: ${cases.length} finite terrain cases and ${coverage} opening camera coverage samples.`);
