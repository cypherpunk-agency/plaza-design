import {throughBlockLayout} from '../../src/ssg/game/art/architecture/city-kit';
import {sourceProjection,projectedBounds} from '../../src/ssg/game/art/core/geometry';
import {bindingPropertySources} from '../../src/ssg/game/engine/gameplay/binding-sources';
import {validateSequence} from '../../src/ssg/game/art/core/sequence';
import {compileLevel} from '../../src/ssg/game/engine/level';
import {residentCharacter} from '../../src/ssg/game/art/characters/resident';
import {flockOptions} from '../../src/ssg/game/art/characters/flock';
import assert from 'node:assert/strict';
import {art,ArtRegistry,beginLayeredFrame,endLayeredFrame,drawComposition,drawCompositionSlot,resolveComposition,propertyIsLinked,type AssetDefinition,type ChunkDocument} from '../../src/ssg/game/art';
import {distance,validateFieldSemantics,fieldValueValid,fieldIsContinuous} from '../../src/ssg/game/art/core/fields';
import {rectangleControls,repeatedWidthControls,applySpatialEdit,combineControls,conditionalControls} from '../../src/ssg/game/art/core/spatial';
import {floorLayout} from '../../src/ssg/game/art/buildings/layout';
import {frameView} from '../../src/ssg/game/art/core/view';
import {frameSelection} from '../../src/ssg/game/authoring/native-preview';
import type {CapturedArtwork} from '../../src/ssg/game/art/core/presentation';
import {measureArtwork} from '../../src/ssg/game/art/core/measure';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {validatePresets,validatePresetChildren} from '../../src/ssg/game/authoring/kit-presets';
import {workspaceZoom,zoomWorkspace} from '../../src/ssg/game/authoring/viewport-navigation';
import presetsSource from '../../src/ssg/game/art/presets/kit-presets.json';

let fields=0;
for(const[type,key]of [['downtown.light','color'],['downtown.neon-sign','color'],['downtown.billboard','smearColor'],['downtown.entrance','smearColor'],['beach.light','color'],['warehouse.light','color'],['harbor.marker','color'],['mall.shop-interior','tint'],['mall.shop-front','tint'],['mall.shop-reflection','tint'],['sign.plate','color'],['sign.blade','color'],['sign.screen','color'],['sign.ticker','color'],['sign.paper','ink'],['sign.hanging','color'],['sign.icon','color'],['shift.mast','color'],['shift.shed','stripColor']]){
 const f=art.get(type).fields[key];assert.equal(f.semantics?.quantity,'color');assert.equal(f.semantics?.unit,'RGB');
}
for(const[type,key]of [['warehouse.label','color'],['sign.hanging','board'],['coast.pier','lamp'],['coast.pier','lantern']])assert.equal(art.get(type).fields[key].semantics?.unit,'CSS color');
let integerFields=0;
for(const e of art.catalog())for(const[key,f]of Object.entries(e.fields))if(f.kind==='number'&&f.semantics?.unit==='integer'){
 integerFields++;assert(fieldValueValid(f,f.default),e.type+'.'+key+' integer default');
 assert.equal(fieldValueValid(f,Number(f.default)+.5),false,e.type+'.'+key+' fractional input');
 assert.equal(fieldIsContinuous(f),false,e.type+'.'+key+' uses discrete animation');
}
assert(integerFields>390,'Cover the full integer-valued library, not only the fixture');
assert.equal(fieldIsContinuous(art.get('downtown.window').fields.light),true,'Fractional room-light variation is not an integer seed');
assert.equal(art.properties('downtown.window',{light:.5587577160493827}).light,.5587577160493827);
for(const [type,key]of [['harbor.container','paletteIndex'],['harbor.craneLoad','paletteIndex'],['dockwork.distant-container','paletteIndex'],['terminal.container','paletteIndex'],['shift.crane','loadPaletteIndex']]as const)assert.throws(()=>art.properties(type,{[key]:2.5}),/invalid select/,'Palette selectors must not permit fractional native palette lookups');
// Framing a default 30,000-unit route must leave both endpoint handles inside a narrow editor.
const routeFit=workspaceZoom(556/30000*.8);assert(30000*routeFit<556);
assert.equal(zoomWorkspace({x:100,y:50,zoom:1},routeFit,{x:0,y:0},1).zoom,routeFit);
for(const e of art.catalog())for(const[key,field]of Object.entries(e.fields)){validateFieldSemantics(field,e.type+'.'+key,true);fields++;}
assert.throws(()=>validateFieldSemantics({...distance('Width',20),unit:'pixels'},'duplicated-unit',true),/semantics.unit/);
assert.throws(()=>validateFieldSemantics({...distance('Width',20),semantics:{group:'Shape / Area',quantity:'length',unit:'seconds',space:'local'}},'bad',true),/incompatible/);
const fixture:AssetDefinition={type:'contract.fixture',version:1,label:'Fixture',category:'test',fields:{width:distance('Width',20)},parts:[],bounds:()=>({x:0,h:0,w:0,tall:0}),anchors:()=>({}),draw(){}};
assert.throws(()=>new ArtRegistry({requireSemantics:true}).register({...fixture,fields:{width:{kind:'number',label:'Width',default:20}}}),/missing semantic/);
assert.throws(()=>new ArtRegistry({requireSemantics:true}).register({...fixture,fields:{width:distance('Width',-1,{min:0})}}),/invalid number/);
assert.throws(()=>new ArtRegistry().register({...fixture,spatial:rectangleControls({width:'missing'})}),/declared numeric/);
assert.throws(()=>new ArtRegistry({requireSemantics:true}).register({...fixture,fields:{}}),/declare supported spatial controls/,'Even a fieldless new asset needs an explicit geometry disposition');
assert.throws(()=>new ArtRegistry({requireSemantics:true}).register(fixture),/declare supported spatial controls/);

const box=rectangleControls({width:'width',height:'height',originX:.5});
const props={width:100,height:80,seed:17},node={id:'box',type:'contract.fixture',props:{...props},placement:{x:200,h:0,scale:2,facing:-1 as const},layer:'set' as const,order:0};
const left=box.handles(props).find(h=>h.id==='left')!;
const edit=left.edit({x:20,h:0});assert.deepEqual(edit.props,{width:80},'A handle emits only its changed source fields, never all sampled animation/default values');
applySpatialEdit(node,edit);assert.equal(node.props.width,80);assert.equal(node.props.seed,17);assert.equal(node.placement.x,180);
assert.equal(node.placement.x+(node.props.width/2)*2*-1,100,'Opposite world edge is fixed under mirroring and scale');
const corners=box.handles(props).filter(h=>h.fields.length===2);assert.equal(corners.length,4);
const roof=art.get('building.front').spatial!.handles(art.properties('building.front',{})).find(h=>h.id==='top')!;
const taller={...art.properties('building.front',{}),...roof.edit({x:0,h:33}).props};
assert.equal(taller.height,373);assert.equal(taller.floorHeight,66);assert.equal(floorLayout(taller).floorCount,4);assert.equal(floorLayout(taller).remainder,33);
assert.equal(floorLayout({...taller,height:406}).floorCount,5);assert.equal(floorLayout({...taller,height:406}).remainder,0);
assert.throws(()=>art.properties('building.front',{height:10}),/must fit/);
assert.throws(()=>art.properties('building.front',{floors:3}),/unknown property/);

const registry=new ArtRegistry({requireSemantics:true}).register(art.get('assembly.group')).register({...fixture,type:'contract.box',fields:{width:distance('Width',150),height:distance('Height',340)},spatial:rectangleControls({width:'width',height:'height'}),parts:['backdrop'],bounds:p=>({x:0,h:Number(p.height),w:Number(p.width),tall:Number(p.height)}),draw(ctx,_v,p){ctx.fillRect(0,-Number(p.height),Number(p.width),Number(p.height));}});
const document:ChunkDocument=registry.validate({version:1,scene:'spatial-fixture',instances:[{id:'group',type:'assembly.group',props:{},placement:{x:1200,h:0,scale:2,facing:-1},layer:'set',order:0,children:[{id:'item',type:'contract.box',props:{},placement:{x:0,h:0,scale:1.5,facing:-1},layer:'set',order:0}]}]});
const records:CapturedArtwork[]=[],helpers:CapturedArtwork[]=[];
const view={...frameView(600),viewW:2400,viewH:1600,gy:1500,cam:400,sx:(x:number,q=1)=>x-400*q,y:(h:number)=>1500-h};
measureArtwork(ctx=>{beginLayeredFrame(r=>records.push(r),r=>helpers.push(r));try{drawComposition(ctx,registry,document,{view,state:{},reduced:false},'backdrop');}finally{endLayeredFrame();}});
const selected=frameSelection({artwork:records,helpers,sceneId:document.scene}as any,{composition:document,time:10,reduced:false,overlays:true,selectedId:'item',environment:{}},false);
const right=selected.handles!.find(h=>h.id==='right')!;assert.equal(right.x,1250);assert.equal(right.edit(45,0).props.width,165,'Handle deltas use captured parent scale, own scale and both facing transforms');
const model=new ComposerModel(registry);model.load([{id:'fixture',kind:'composition',revision:'0',value:document}]);
model.updateInstance('fixture','item','Resize building',item=>applySpatialEdit(item,right.edit(45,0)));
assert.equal((model.get('fixture').value as ChunkDocument).instances[0].children![0].props.width,165);model.undo();assert.deepEqual(model.get('fixture').value,document);model.redo();
assert.equal((model.get('fixture').value as ChunkDocument).instances[0].children![0].props.width,165);
const laneSource:ChunkDocument=art.validate({version:1,scene:'lane-fixture',instances:[{id:'lane',type:'vehicle.traffic-lane',props:{minX:0,maxX:1000},placement:{x:500,h:0,parallax:.5},layer:'set',order:0}]});
const laneRecords:CapturedArtwork[]=[];measureArtwork(ctx=>{beginLayeredFrame(r=>laneRecords.push(r));try{drawComposition(ctx,art,laneSource,{view,state:{},reduced:false},'backdrop');}finally{endLayeredFrame();}});
const laneFrame=frameSelection({artwork:laneRecords,helpers:[],sceneId:laneSource.scene}as any,{composition:laneSource,time:10,reduced:false,overlays:true,selectedId:'lane',environment:{}},false);
const end=laneFrame.handles!.find(h=>h.id==='end')!;assert.equal(end.x,1300);assert.equal(end.edit(50,0).props.maxX,1050,'Lane endpoints use ordinary world distances and placement parallax, with no second coordinate system');
const cloud=art.get('environment.cloud-layer'),cloudProps=art.properties(cloud.type,{}),cloudTop=cloud.spatial!.handles(cloudProps).find(h=>h.id==='top')!;
const changedCloud={...cloudProps,...cloudTop.edit({x:0,h:40}).props};
assert.equal(Number(changedCloud.altitude)-Number(changedCloud.altitudeVariation),Number(cloudProps.altitude)-Number(cloudProps.altitudeVariation),'Cloud band bottom remains fixed while its top is resized');
assert.equal(changedCloud.seed,cloudProps.seed);assert.equal(changedCloud.cloudWidth,cloudProps.cloudWidth,'Cloud size is independent of the distribution region');
const presets=validatePresets(presetsSource,art),arrangement=presets.presets.find(p=>p.id==='city-air-traffic')!;
assert.equal(arrangement.children!.length,7);
const arrangements=new ComposerModel(art);arrangements.load([{id:'arrangements',kind:'composition',revision:'0',value:{version:1,scene:'arrangements',instances:[]}}]);
const first=arrangements.add('arrangements',arrangement.kit,{x:100,h:20},arrangement.props,arrangement.children);
const second=arrangements.add('arrangements',arrangement.kit,{x:300,h:20},arrangement.props,arrangement.children);
const placed=(arrangements.get('arrangements').value as ChunkDocument).instances;
assert.notEqual(first,second);assert.equal(placed[0].children!.length,7);
assert.equal(new Set(placed.flatMap(n=>[n.id,...n.children!.map(c=>c.id)])).size,16,'Repeated arrangement insertion allocates disjoint ordinary IDs');
assert.deepEqual(placed[0].children![1].props,arrangement.children![1].props,'Route settings and seeds survive insertion');
arrangements.undo();assert.equal((arrangements.get('arrangements').value as ChunkDocument).instances.length,1,'One Undo removes the complete inserted group');arrangements.redo();assert.equal((arrangements.get('arrangements').value as ChunkDocument).instances.length,2);
assert.throws(()=>validatePresetChildren([{...arrangement.children![0],bindings:{unregistered:'live'}}],art),/binding/);
const autoPlate=art.properties('sign.plate',{});assert.equal(art.get('sign.plate').spatial!.handles(autoPlate).length,0,'Auto-sized text plates do not show fictitious dimension handles');
assert.equal(art.get('sign.plate').spatial!.handles({...autoPlate,width:100,height:40}).length,8);
const stair=art.get('level.stairs'),stairProps=art.properties(stair.type,{}),landing=stair.spatial!.handles(stairProps)[0];
assert.deepEqual(landing.edit({x:-20,h:12}).props,{run:100,rise:88},'Signed stair endpoints edit physical run/rise without scaling the picture');
const shoreSource=art.validate({version:1,scene:'shore-controls',instances:[{id:'shore',type:'coast.far-shore',props:{drawingMinX:0,drawingMaxX:1000},placement:{x:500,h:20,parallax:.12,scale:1.5,facing:-1},layer:'distance',order:0}]});
const shoreRecords:CapturedArtwork[]=[];measureArtwork(ctx=>{beginLayeredFrame(r=>shoreRecords.push(r));try{drawComposition(ctx,art,shoreSource,{view,state:{},reduced:false},'backdrop');}finally{endLayeredFrame();}});
const shoreFrame=frameSelection({artwork:shoreRecords,helpers:[],sceneId:shoreSource.scene}as any,{composition:shoreSource,time:10,reduced:false,overlays:true,selectedId:'shore',environment:{}},false);
const windowHandles=shoreFrame.handles!.filter(h=>h.id.includes('window-')),windowBounds=shoreFrame.resolved!.shore.drawingWindow!.bounds;
assert.equal(windowHandles.length,2);assert(Math.abs(Math.min(...windowHandles.map(h=>h.x))-windowBounds.x)<1e-7,'Drawing-window handles use the very same transformed boundaries as native inspection');
assert(Math.abs(Math.max(...windowHandles.map(h=>h.x))-(windowBounds.x+windowBounds.width))<1e-7);
assert.equal(windowHandles.find(h=>h.id.endsWith('window-left'))!.edit(-30,0).props.drawingMinX,20,'Mirrored/scaled window boundary delta is inverted through the captured projection');

const lockers=repeatedWidthControls('width','count','height'),lockerProps={width:30,count:4,height:80,seed:9};
const lockerLeft=lockers.handles(lockerProps).find(h=>h.id==='left')!;
assert.equal(lockerLeft.point.x,0);assert.equal(lockers.handles(lockerProps).find(h=>h.id==='right')!.point.x,120);
const lockerEdit=lockerLeft.edit({x:20,h:0});assert.deepEqual(lockerEdit.props,{width:25});
assert.equal(lockerEdit.offset!.x+Number(lockerEdit.props.width)*lockerProps.count,120,'Repeated cells keep the far edge fixed');
assert.equal(lockerProps.seed,9);assert.equal(lockerProps.count,4);
const rack=art.get('shift.rack'),rackProps=art.properties(rack.type,{});
assert.equal(rack.spatial!.handles(rackProps).find(h=>h.id==='left')!.point.x,-Number(rackProps.width)/2,'Rack handles follow its centered source geometry');
const board=art.get('shift.board'),boardProps=art.properties(board.type,{});
assert(board.spatial!.handles(boardProps).every(h=>h.fields.length===1&&h.fields[0]==='width'),'Board elevation is not mistaken for a size');
assert.equal(board.spatial!.handles(boardProps)[0].point.h,boardProps.height);

// Camera-space primitives declare that space; their controls use the captured native canvas,
// not an independently reconstructed camera or the workspace's world-unit delta.
const skyDocument=art.validate({version:1,scene:'sky-handles',instances:[{id:'craft',type:'environment.sky-traffic',props:{minX:10,maxX:110,ships:[{kind:'spinner',pixelSize:1,screenY:60,velocityX:6,startOffset:0,direction:1,parallax:.4}]},placement:{x:200,h:20,scale:2,facing:-1},layer:'distance',order:0}]});
const skyRecords:CapturedArtwork[]=[];
const skyView={...frameView(0),viewW:960,viewH:540,gy:486,cam:100,sx:(x:number,q=1)=>x-100*q,y:(h:number)=>486-h};
measureArtwork(ctx=>{beginLayeredFrame(r=>skyRecords.push(r));try{drawCompositionSlot(ctx,art,skyDocument,{view:skyView,state:{},reduced:false},'behind-player',undefined,'sky');}finally{endLayeredFrame();}});
const skySelection=frameSelection({artwork:skyRecords,helpers:[],sceneId:skyDocument.scene}as any,{composition:skyDocument,time:0,reduced:false,overlays:true,selectedId:'craft',environment:{}},false);
const skyStart=skySelection.handles!.find(h=>h.id==='start')!;
assert.equal(skyStart.x,-40);assert.equal(skyStart.y,-386);
assert.equal(skyStart.edit(30,0).props.minX,-5,'Screen-space endpoint deltas respect the actual painter scale and mirror');
assert.throws(()=>art.properties('environment.sky-traffic',{minX:200,maxX:100}),/after route start/);
assert.throws(()=>art.get('environment.sky-craft'),/Unknown artwork type/);
assert.throws(()=>art.properties('street.traffic',{lanes:[]}),/unknown property/,'No compound traffic list remains as an alternate authoring path');

// Wrappers must preserve native projection context for context-dependent controls.
const contextual={fields:['width'],handles:(_p:any,c:any)=>c?[{id:'native',label:'Native',fields:['width'],point:{x:c.view.sx(c.placement.x,.5),h:0},cursor:'ew-resize',edit:()=>({props:{}})}]:[]};
const captureContext={view,placement:{x:500,h:0,scale:1,facing:1 as const,parallax:1}};
for(const wrapped of [combineControls(contextual),conditionalControls(contextual,()=>true)])assert.equal(wrapped.handles({width:20},captureContext)[0].point.x,300,'Spatial combinators forward captured projection instead of dropping it');
for(const type of ['market.laundry','market.end-wall','market.stall','market.booth','market.odds','market.score']){
 const definition=art.get(type),p=art.properties(type,{}),handles=definition.spatial!.handles(p),left=handles.find(h=>h.id==='left')!,right=handles.find(h=>h.id==='right')!;
 assert.equal(right.point.x-left.point.x,Number(p.width),type+': width follows the native physical span');
 const edited=left.edit({x:10,h:0}),instance={id:'m',type,props:{...p},placement:{x:400,h:0},layer:'set' as const,order:0};
 applySpatialEdit(instance,edited);
 const updated=definition.spatial!.handles(art.properties(type,instance.props));
 assert.equal(instance.placement.x+updated.find(h=>h.id==='right')!.point.x,400+right.point.x,type+': dragging west edge preserves east edge');
 if('seed'in p)assert.equal(instance.props.seed,p.seed);
 assert.throws(()=>art.properties(type,{width:-1}),/negative/);
}
assert.equal(art.get('market.marker').spatial!.handles(art.properties('market.marker',{})).length,0,'Invisible chunk marker does not receive artwork resize handles');

const cloudVelocity=art.get('environment.cloud-layer').fields.velocityX;
assert.equal(cloudVelocity.kind,'number');
if(cloudVelocity.kind==='number'){const steps=(Number(cloudVelocity.default)-(cloudVelocity.min??0))/cloudVelocity.step!;assert.ok(Math.abs(steps-Math.round(steps))<1e-8,'Cloud drift default must be accepted by its actual numeric input step');}

const flockDefinition=art.get('character.flock'),flockProps=art.properties('character.flock',{}),flockHandles=flockDefinition.spatial!.handles(flockProps),flockTop=flockHandles.find(h=>h.id==='top')!;
const flockEdited=art.properties('character.flock',{...flockProps,...flockTop.edit({x:0,h:40}).props});
assert.equal(flockEdited.maxAltitude,160);assert.equal(flockEdited.minAltitude,0);assert.equal(flockEdited.seed,1);
assert.deepEqual(flockOptions(flockProps).drift,[.25,.6],'Canonical per-second drift converts once at the native boundary');
assert.equal(flockOptions(flockProps).span,2400);assert.equal(flockOptions(flockProps).margin,200);
assert.throws(()=>art.properties('character.flock',{span:2400}),/unknown property/);
assert.throws(()=>art.properties('character.flock',{minX:2200,maxX:2200}),/100 and 20000/);
assert.throws(()=>art.properties('character.flock',{minAltitude:121}),/Maximum altitude/);
assert.throws(()=>art.properties('character.flock',{minParallax:1.1}),/Maximum parallax/);
assert.throws(()=>art.properties('character.flock',{minVelocityX:40}),/Maximum drift/);
const regionContext={view,placement:{x:500,h:0,scale:1,facing:1 as const,parallax:1}};
assert.deepEqual(flockDefinition.bounds(flockProps,{},regionContext),flockDefinition.bounds({...flockProps,seed:987,count:1},{},regionContext),'Configured flock area does not change with emitted sample/count/seed');
const flockSource:ChunkDocument=art.validate({version:1,scene:'flock-spatial-fixture',instances:[{id:'flock',type:'character.flock',props:{appearance:'white silhouette'},placement:{x:500,h:0},layer:'set',order:0}]});
const flockRecords:CapturedArtwork[]=[];
measureArtwork(ctx=>{beginLayeredFrame(r=>flockRecords.push(r));try{drawComposition(ctx,art,flockSource,{view,state:{},reduced:false},'backdrop');}finally{endLayeredFrame();}});
const flockSelection=frameSelection({artwork:flockRecords,helpers:[],sceneId:flockSource.scene}as any,{composition:flockSource,time:10,reduced:false,overlays:true,selectedId:'flock',environment:{}},false);
assert.equal(flockSelection.handles!.find(h=>h.id==='start')!.x,-100,'Wrap start follows the actual furthest projected source edge');
assert.equal(flockSelection.handles!.find(h=>h.id==='end')!.edit(50,0).props.maxX,2250,'Projected endpoint edits retain source units');

const authoredWalker=residentCharacter(art.properties('character.resident',{speed:15,depthBand:'back'}),{x:50,h:0});
assert.equal(authoredWalker.speed,.25);assert.equal(art.get('character.resident').fields.speed.semantics!.unit,'world units / second');
assert.throws(()=>art.properties('character.resident',{depth:'back'}),/unknown property/);
assert.equal(residentCharacter(art.properties('character.resident',{speed:0}),{x:50,h:0}).speed,undefined,'Zero remains the native body’s automatic pace');
for(const type of ['character.resident','vehicle.road','vehicle.air','vehicle.boat','vehicle.rail','sequence.world-control','scene.base']){
 const e=art.get(type);assert.equal(e.spatial!.fields.length,0);assert.ok(e.spatial!.reason,'Non-resizable proportions/configuration must explain the actual authoring model');
}
for(const prefix of ['capsule','downtown','station','beach','sandbox','dockwork','warehouse','harbor','terminal','metro','mall','train']){
 const e=art.get(prefix+'.marker');assert.equal(e.spatial!.fields.length,0);assert.match(e.spatial!.reason!,/non-drawing/);
}

const rateDoc=art.validate({version:1,scene:'rate-fixture',instances:[
 {id:'floor',type:'level.floor',props:{width:1000},placement:{x:0,h:0},layer:'logic',order:0},
 {id:'stairs',type:'level.stairs',props:{speed:90},placement:{x:0,h:0},layer:'set',order:1},
 {id:'escalator',type:'level.escalator',props:{speed:45},placement:{x:300,h:0},layer:'set',order:2},
 {id:'lift',type:'level.elevator',props:{doorDuration:.6},placement:{x:600,h:0},layer:'set',order:3},
 {id:'shell',type:'level.shell',props:{building:'home',revealRate:6},placement:{x:0,h:0},layer:'logic',order:3},
]});
const rates=compileLevel(resolveComposition(art,rateDoc,{view,state:{},reduced:false}))!;
assert.equal(rates.links.find(l=>l.id==='stairs')!.speed,1.5);
assert.equal(rates.links.find(l=>l.id==='escalator')!.speed,.75);
assert.equal(rates.revealSpeed!.home,.1,'Authored response rate converts at compilation; native level state remains per-frame');
assert.throws(()=>art.properties('level.shell',{revealSpeed:.1}),/unknown property/);

assert.throws(()=>validateFieldSemantics({...art.get('character.resident').fields.speed,semantics:{group:'Motion',quantity:'speed',unit:'native units/frame',space:'local'}},'old.speed',true),/canonical/);
assert.throws(()=>validateFieldSemantics({...art.get('level.elevator').fields.doorDuration,semantics:{group:'Motion',quantity:'duration',unit:'ms'}},'old.duration',true),/canonical/);
assert.throws(()=>validateFieldSemantics({...art.get('shift.crane').fields.phaseAngle,semantics:{group:'Motion',quantity:'angle',unit:'radians'}},'old.angle',true),/canonical/);
assert.equal(art.get('station.screen').fields.displayTimeOffset.semantics!.unit,'seconds');
assert.equal(art.get('station.screen').fields.indicatorPhaseAngle.semantics!.unit,'degrees');
assert.equal(art.get('beach.salt').fields.lightPhaseAngle.semantics!.unit,'degrees');
assert.equal(art.get('beach.salt').fields.paletteOffset.semantics!.quantity,'index');
assert.equal(art.get('beach.swimmer').fields.variation.semantics!.quantity,'index','A swimmer variation also selects appearance; it was never just an angular phase');
assert.throws(()=>art.properties('beach.swimmer',{variation:.5}),/whole number/);
{
 const swimmer=art.get('beach.swimmer');
 for(const variation of [0,3,6])for(const t of [0,137,600]){
  const p=art.properties(swimmer.type,{waterDepthFraction:.7,variation}),state=art.visualProperties(swimmer.type,{}),v={...view,t,cam:140,sx:(x:number,d=1)=>Math.round(x-140*d)},at={x:500,h:20,scale:1,facing:1 as const,parallax:1};
  const drawn=measureArtwork(ctx=>swimmer.draw(ctx,v,p,state,'backdrop',at)),bounds=projectedBounds(v,at,swimmer.bounds(p,state,{view:v,placement:at}));
  assert(drawn.width>0);assert(bounds.x<=drawn.x&&bounds.y<=drawn.y&&bounds.x+bounds.width>=drawn.x+drawn.width&&bounds.y+bounds.height>=drawn.y+drawn.height,'Swimmer bounds follow the same depth fraction and variation as drawing');
 }
}

assert.equal(rates.lifts.find(l=>l.id==='lift')!.doorMs,600,'Door duration converts seconds to the native lift’s milliseconds once');
assert.equal(art.get('sequence.world-control').fields.width.semantics!.space,'camera');

for(const type of ['harbor.container','harbor.hutBack','harbor.fishStall','harbor.teaStall','terminal.bridge','terminal.ferry-hatch','terminal.booth','terminal.container','dockwork.distant-container','beach.boardwalk','beach.bar-under']){
 const e=art.get(type),p=art.properties(type,{width:160,...(type==='terminal.container'?{dx:17}:{})}),handles=e.spatial!.handles(p),left=handles.find(h=>h.id==='left')!,right=handles.find(h=>h.id==='right')!;
 assert.equal(right.point.x-left.point.x,Number(p.width),type+': handles follow the actual construction width');
 const source={id:'physical',type,props:{...p},placement:{x:400,h:20},layer:'set' as const,order:0};
 applySpatialEdit(source,left.edit({x:5,h:0}));const fresh=e.spatial!.handles(art.properties(type,source.props));
 assert.equal(source.placement.x+fresh.find(h=>h.id==='right')!.point.x,400+right.point.x,type+': opposite native edge remains fixed');
 if('seed'in p)assert.equal(source.props.seed,p.seed);
}
const line=art.get('harbor.rod'),lineProps=art.properties(line.type,{}),lineEnd=line.spatial!.handles(lineProps)[0];
assert.deepEqual(lineEnd.point,{x:70,h:34});assert.deepEqual(lineEnd.edit({x:15,h:99}),{props:{reach:85}},'Fishing-line endpoint changes only the real reach; source origin stays fixed');
for(const type of ['dockwork.distant-container','terminal.container']){
 assert.equal(art.get(type).fields.paletteIndex.kind,'select');assert.equal(art.get(type).fields.paletteIndex.semantics!.quantity,'choice');
 assert.throws(()=>art.properties(type,{paletteIndex:1.5}),/option|select/);
}
assert.equal(art.get('beach.sunbed').fields.index.semantics!.quantity,'index');

const sharedShape={...fixture,type:'contract.linked-box',parts:['backdrop' as const],libraryUse:'reusable' as const,
 fields:{width:{...distance('Width',100),animatable:true,stateOverride:{state:'sharedWidth',space:'world' as const}}},
 visualFields:{sharedWidth:{kind:'number' as const,label:'Shared world width',default:0,min:0}},spatial:rectangleControls({width:'width'}),
 bounds:(p:any)=>({x:0,h:40,w:Number(p.width),tall:40}),draw(ctx:any,v:any,p:any,_s:any,_pass:any,at:any){ctx.fillRect(v.sx(at.x),v.y(at.h+40),Number(p.width),40);}};
const sharedRegistry=new ArtRegistry({requireSemantics:true}).register(art.get('assembly.group')).register(sharedShape);
assert.throws(()=>new ArtRegistry({requireSemantics:true}).register({...sharedShape,type:'contract.bad-override',visualFields:{}}),/declared numeric visual/);
const linkedDoc=sharedRegistry.validate({version:1,scene:'linked-shape',instances:[{id:'base',type:'assembly.group',props:{},placement:{x:200,h:0,scale:2,facing:-1},layer:'set',order:0,children:[{id:'child',type:'contract.linked-box',props:{width:75},placement:{x:0,h:0},layer:'set',order:0,bindings:{sharedWidth:'scene.width'}}]}]});
const linkedEnv={view,state:{},reduced:false,bindings:{'scene.width':220},bindingSources:{'scene.width':{scene:'linked-shape',instance:'source-width',property:'width'}}};
const linkedRow=resolveComposition(sharedRegistry,linkedDoc,linkedEnv).find(r=>r.instance.id==='child')!;
assert.equal(linkedRow.props.width,110,'Shared world dimensions normalize once through the actual resolved scale');
assert.equal(linkedRow.instance.props.width,75,'Prepared input resolution does not write a saved alias');
assert.ok(propertyIsLinked(linkedRow,'width'));
const linkedRecords:CapturedArtwork[]=[];measureArtwork(ctx=>{beginLayeredFrame(r=>linkedRecords.push(r));try{drawComposition(ctx,sharedRegistry,linkedDoc,linkedEnv,'backdrop');}finally{endLayeredFrame();}});
const linkedFrame=frameSelection({artwork:linkedRecords,helpers:[],sceneId:linkedDoc.scene}as any,{composition:linkedDoc,time:0,reduced:false,overlays:true,selectedId:'child',environment:{}},false);
assert.equal(linkedFrame.handles!.length,0,'Externally linked dimensions never offer ignored source edits');
assert.equal(linkedFrame.resolved!.child.properties.width.value,110);assert.equal(linkedFrame.resolved!.child.properties.width.readOnly,true);
assert.deepEqual(linkedFrame.resolved!.child.properties.width.source,{scene:'linked-shape',instance:'source-width',property:'width'});
const linkedTrack={...linkedDoc,sequence:{id:'linked',duration:1,shots:[],tracks:[{id:'bad-width',target:{kind:'property',instance:'child',property:'width'},keys:[{time:0,value:100,ease:'linear'},{time:1,value:150}]}],text:[],fades:[],beats:[]}};
assert.throws(()=>validateSequence(linkedTrack as any,{registry:sharedRegistry,compositions:{'linked-shape':linkedDoc}}),/linked to a shared source/);
const unbound=structuredClone(linkedTrack)as any;delete unbound.instances[0].children[0].bindings;
validateSequence(unbound,{registry:sharedRegistry,compositions:{'linked-shape':unbound}});
const standalone=resolveComposition(sharedRegistry,unbound,{view,state:{},reduced:false}).find(r=>r.instance.id==='child')!;
assert.equal(standalone.props.width,75);assert.equal(propertyIsLinked(standalone,'width'),false);

// Viewport-wide station surfaces use captured native elevations, not a guessed local box.
for(const [type,field]of [['station.galleria-wall','height'],['station.galleria-ceiling','under'],['station.harbor-water','horizon'],['metro.far-rail','deck'],['metro.track-base','deck']]as const){
 const source=art.validate({version:1,scene:'station-controls',instances:[{id:'surface',type,props:{},placement:{x:400,h:30,parallax:.4},layer:'set',order:0}]});
 const records:CapturedArtwork[]=[];measureArtwork(ctx=>{beginLayeredFrame(r=>records.push(r));try{drawComposition(ctx,art,source,{view,state:{},reduced:false},'backdrop');}finally{endLayeredFrame();}});
 const captured=records.find(r=>r.row.instance.id==='surface')!;assert(captured);
 const result=frameSelection({artwork:records,helpers:[],sceneId:source.scene}as any,{composition:source,time:10,reduced:false,overlays:true,selectedId:'surface',environment:{}},false);
 const handle=result.handles!.find(h=>h.id===field)!;assert(handle,type+' has a visible elevation control');
 const t=captured.canvasTransform,screen={x:captured.view.viewW/2,y:captured.view.y(captured.row.placement.h+Number(captured.row.props[field]))};
 assert(Math.abs(handle.x-(t.a*screen.x+t.c*screen.y+t.e))<1e-7,type+' control stays in the actual viewport, independent of asset X/parallax');
 assert(Math.abs(handle.y-(t.b*screen.x+t.d*screen.y+t.f))<1e-7,type+' control agrees with native elevation');
 assert.equal(handle.edit(0,-20).props[field],Number(captured.row.props[field])+20);
}
assert.throws(()=>art.properties('station.galleria-ceiling',{under:200,top:190}),/top must not/);
assert.throws(()=>art.properties('station.harbor-water',{wall:80,horizon:50}),/Horizon must not/);
assert.throws(()=>art.properties('metro.canopy',{under:100,fascia:90,truss:120}),/elevations must be ordered/);
for(const [type,baseline,extension]of [['station.slab',-8,0],['metro.slab',-7,0],['metro.girder',-20,300]]as const){
 const e=art.get(type),props=art.properties(type,{width:900}),handle=e.spatial!.handles(props,{view,placement:{x:400,h:30,parallax:.4,scale:1,facing:1}})[0];
 assert.equal(handle.space,'chunk');assert.equal(handle.point.x,900+extension);assert.equal(handle.point.h,30+baseline);
 assert.deepEqual(handle.edit({x:50,h:90}).props,{width:950},'Repeat endpoint edits only the real chunk repetition extent');
 assert.equal(e.fields.width.semantics!.group,'Generation');
}

// Yard roof props use a screen inset as their vertical anchor. A resize must edit that
// anchor instead of moving an unrelated ground placement which native drawing ignores.
for(const type of ['yard.roof-vent','yard.water-tank','yard.chimney']){
 const e=art.get(type),p=art.properties(type,{}),handles=e.spatial!.handles(p);
 const bottom=handles.find(h=>h.id==='0:bottom')!,change=bottom.edit({x:0,h:-5});
 assert.equal(change.props.height,Number(p.height)+5);assert.equal(change.props.roof,Number(p.roof)+5);
 assert.equal(Number(change.props.roof)-Number(change.props.height),Number(p.roof)-Number(p.height),'Opposite roof edge stays at the same native screen Y');
 assert.equal(change.offset?.h??0,0,'No ineffective placement Y edit');
 const top=handles.find(h=>h.id==='0:top')!.edit({x:0,h:5});assert.equal(top.props.height,Number(p.height)+5);assert(!('roof'in top.props),'Top edge keeps its source baseline fixed');
 const body={id:'roof',type,props:{...p},placement:{x:100,h:0,scale:2,facing:-1 as const},layer:'set' as const,order:0};
 const left=handles.find(h=>h.id==='0:left')!.edit({x:1,h:0});applySpatialEdit(body,left);
 assert.equal(body.placement.x+Number(body.props.width)*2*-1,100-Number(p.width)*2,'Opposite horizontal edge stays fixed under mirrored parent scale');
}
const roofInset=art.get('yard.aerial').spatial!.handles(art.properties('yard.aerial',{}))[0];
assert.equal(roofInset.edit({x:0,h:-8}).props.roof,14,'Downward drag increases a native screen-top inset');
const chute=art.get('yard.chute'),chuteProps=art.properties(chute.type,{}),chuteEnd=chute.spatial!.handles(chuteProps).find(h=>h.fields.includes('endHeight'))!;
assert.equal(chuteEnd.point.h,Number(chuteProps.endHeight)-4);assert.deepEqual(chuteEnd.edit({x:20,h:5}).props,{width:172,endHeight:19});
assert.throws(()=>art.properties('yard.chute',{height:2}),/invalid number/);

// Font measures, light strength and layout offsets must not masquerade as physical sizes.
for(const type of ['warehouse.label','warehouse.neon']){
 assert.equal(art.get(type).fields.fontSize.semantics!.unit,'artwork pixels');assert(!art.get(type).fields.size);
 assert.throws(()=>art.properties(type,{size:8}),/unknown/i);
 assert.equal(art.get(type).spatial!.handles(art.properties(type,{})).length,0);
}
assert.throws(()=>art.properties('moth.webcams',{width:76}),/unknown/i);
assert.throws(()=>art.properties('moth.rig-glow',{width:76}),/unknown/i);
assert.equal(art.properties('moth.rig-glow',{}).deskWidth,76);
for(const type of ['warehouse.light','downtown.light']){
 const e=art.get(type),p=art.properties(type,{});assert.equal(e.fields.lightOpacity.semantics!.quantity,'ratio');
 const radius=e.spatial!.handles(p).find(h=>h.id.endsWith('radius'))!;
 assert.equal(radius.edit({x:12,h:0}).props.radius,Number(p.radius)+12);
}
const light=art.get('warehouse.light'),windowProps=art.properties(light.type,{kind:'window',width:30,height:20,radius:40});
assert.equal(light.spatial!.handles(windowProps).length,9,'Window light has a radius control and real source-window edges');
assert.equal(light.bounds(windowProps,{}).w,110);assert.equal(light.bounds(windowProps,{}).tall,100,'Bounds include both the window and its surrounding glow');
assert.equal(light.spatial!.handles(art.properties(light.type,{kind:'lamp',width:30,height:20})).length,1,'Lamp mode has no ignored window-size handles');
for(const e of art.catalog().filter(e=>e.type.startsWith('downtown.device-')&&e.fields.spotWidth)){
 assert.equal(e.spatial!.handles(art.properties(e.type,{})).length,0,'Fixed device artwork does not advertise fake body resizing');
 assert.match(e.spatial!.reason!,/interaction region/);
}

for(const type of ['downtown.light','warehouse.light']){
 const doc=art.validate({version:1,scene:'light-region',instances:[{id:'light',type,props:{radius:50},placement:{x:100,h:60},layer:'set',order:0}]});
 const records:CapturedArtwork[]=[];measureArtwork(ctx=>{beginLayeredFrame(r=>records.push(r));try{drawComposition(ctx,art,doc,{view,state:{},reduced:false},'backdrop');}finally{endLayeredFrame();}});
 const lightFrame=frameSelection({artwork:records,helpers:[],sceneId:doc.scene}as any,{composition:doc,time:0,reduced:false,overlays:true,selectedId:'light',environment:{}},false);
 assert.equal(lightFrame.handles!.length,1,'Light-region source remains editable although shared illumination paints the glow later');
 assert.equal(lightFrame.handles![0].edit(10,0).props.radius,60);
}

// Mall native scalar links use local authored heights: scaling the object must not divide them.
for(const [type,props,bindings]of [
 ['mall.shop-interior',{ceiling:112},{linkedCeiling:'fixture.ceiling'}],
 ['mall.shop-front',{ceiling:112,fascia:130},{linkedCeiling:'fixture.ceiling',linkedFascia:'fixture.fascia'}],
 ['mall.metro-door',{fascia:130},{linkedFascia:'fixture.fascia'}],
 ['mall.pillar',{rise:144},{linkedRise:'fixture.rise'}],
 ['mall.food-sign',{rise:144},{linkedRise:'fixture.rise'}],
 ['mall.escalator-back',{rise:144},{linkedRise:'fixture.rise'}],
 ['mall.escalator-front',{rise:144},{linkedRise:'fixture.rise'}],
]as const){
 const doc=art.validate({version:1,scene:'mall-scalar-controls',instances:[{id:'piece',type,props,bindings,placement:{x:1000,h:30,scale:2,facing:-1},layer:'set',order:0}]});
 const env={view,state:{},reduced:false,bindings:{'fixture.ceiling':240,'fixture.fascia':260,'fixture.rise':300}};
 const row=resolveComposition(art,doc,env)[0];
 for(const [key,expected]of [['ceiling',240],['fascia',260],['rise',300]]as const)if(key in props){assert.equal(row.props[key],expected);assert(propertyIsLinked(row,key));assert.equal(doc.instances[0].props[key],props[key as keyof typeof props],'No copied source alias');}
 const records:CapturedArtwork[]=[];measureArtwork(ctx=>{beginLayeredFrame(r=>records.push(r));try{drawComposition(ctx,art,doc,env,'backdrop');}finally{endLayeredFrame();}});
 const frame=frameSelection({artwork:records,helpers:[],sceneId:doc.scene}as any,{composition:doc,time:0,reduced:false,overlays:true,selectedId:'piece',environment:{}},false);
 assert(frame.handles!.every(h=>h.fields.every(key=>!propertyIsLinked(row,key))),'No handle promises an overridden scalar edit');
 if(type==='mall.shop-interior'||type==='mall.shop-front'||type.startsWith('mall.escalator-'))assert.equal(frame.handles!.length,2,type+' unlinked width remains editable alongside externally linked height');
 const independent=structuredClone(doc);delete independent.instances[0].bindings;assert(!resolveComposition(art,independent,{view,state:{},reduced:false})[0].propertyOverrides,'Independent copies retain their local dimensions');
}
assert.throws(()=>art.properties('mall.shop-stock',{width:180}),/unknown/i);
assert.equal(art.properties('mall.shop-stock',{}).drawingWidth,180);
assert.equal(art.get('mall.shop-stock').fields.drawingWidth.semantics!.group,'Visibility & Drawing');
assert.throws(()=>art.properties('mall.shop-reflection',{width:180}),/unknown/i);
assert.equal(art.properties('mall.shop-reflection',{}).shopWidth,180);

// Circular artwork changes its native radius; it never stretches a captured bitmap.
const rose=art.get('interior.rose-window'),roseProps=art.properties(rose.type,{}),roseD=2*(Number(roseProps.radius)+4);
for(const [id,delta]of [['left',{x:12,h:0}],['right',{x:12,h:0}],['bottom',{x:0,h:12}],['top',{x:0,h:12}]]as const){
 const handle=rose.spatial!.handles(roseProps).find(h=>h.id===id)!,edit=handle.edit(delta),r=Number(edit.props.radius),d=2*(r+4),off=edit.offset!;
 if(id==='left')assert.equal(off.x+d,roseD);if(id==='right')assert.equal(off.x,0);
 if(id==='bottom')assert.equal(off.h+d,roseD);if(id==='top')assert.equal(off.h,0);
 assert.equal(id==='left'||id==='right'?off.h+d/2:off.x+d/2,roseD/2,'Perpendicular centre remains fixed');
 assert(!('seed'in edit.props));
}
for(const type of ['interior.pews','environment.graves']){
 const e=art.get(type),p=art.properties(type,{}),handle=e.spatial!.handles(p).find(h=>h.id==='left')!,extent=Number(p.spacing)*Number(p.count),edit=handle.edit({x:12,h:0});
 assert.equal(edit.offset!.x+Number(edit.props.spacing)*Number(p.count),extent,'Repeat-region opposite edge stays fixed');assert(!('count'in edit.props));assert(!('seed'in edit.props));
}
assert.throws(()=>art.properties('interior.window-light',{bottomY:150,topY:151}),/at least 2/);
const glassFields=art.properties('interior.window-light',{}),glassHandles=art.get('interior.window-light').spatial!.handles(glassFields);
assert(glassHandles.some(h=>h.fields.includes('drawingMinX'))&&glassHandles.some(h=>h.fields.includes('spacing'))&&glassHandles.some(h=>h.fields.includes('width')),'Clip limits, generation spacing and aperture width have distinct source controls');
const pendantProps=art.properties('library.pendant',{}),pendantAt={x:1000,h:80,scale:1,facing:1 as const,parallax:.4};
const pendantHandle=art.get('library.pendant').spatial!.handles(pendantProps,{view,placement:pendantAt})[0];
assert.equal(-pendantAt.h-pendantHandle.point.h,view.y(Number(pendantProps.ceilingHeight)),'Absolute ceiling elevation does not accidentally add the lamp height');
assert.equal(pendantHandle.edit({x:0,h:20}).props.ceilingHeight,196);
assert.equal(art.get('library.terminal').fields.seatOffset.semantics!.quantity,'position');

const terminal=art.get('library.terminal'),terminalView={...frameView(0),cam:300,viewW:200,viewH:360,gy:300,sx:(x:number)=>x-300,y:(h:number)=>300-h};
const chair=measureArtwork(ctx=>terminal.draw(ctx,terminalView,art.properties(terminal.type,{seatOffset:350}),art.visualProperties(terminal.type,{}),'backdrop',{x:0,h:0,scale:1,facing:1,parallax:1}));
assert(chair.width>0&&chair.x+chair.width>=56,'A moved chair remains drawn when its desk is outside the viewport');
// Beach light dimensions feed the existing illumination compiler; pier rail and deck are distinct.
const beachLight=art.get('beach.light'),beachWindow=art.properties('beach.light',{kind:'window',radius:40,width:90,height:24});
assert.throws(()=>art.properties('beach.light',{lightHeight:24}),/unknown/i);
assert.equal(beachLight.spatial!.handles(beachWindow).length,9);
assert.throws(()=>art.properties('beach.light',{radius:-1}),/radius must not be negative/);
assert.throws(()=>art.properties('beach.light',{kind:'window',width:-1}),/dimension must not be negative/);
const beachLightBounds=beachLight.bounds(beachWindow,{});
assert.equal(beachLightBounds.w,170);assert.equal(beachLightBounds.tall,104);
assert.equal(beachLight.spatial!.handles(art.properties('beach.light',{kind:'neon',width:90,height:24})).length,1,'Non-window modes do not advertise ignored aperture handles');
const pier=art.get('beach.pier-deck'),pierProps=art.properties(pier.type,{width:300,railingLength:220}),pierHandles=pier.spatial!.handles(pierProps);
assert.equal(pierHandles.length,3);
const pierLeft=pierHandles.find(h=>h.id.endsWith(':left'))!.edit({x:20,h:0});
assert.equal(Number(pierLeft.props.width)+pierLeft.offset!.x,300,'Pier opposite deck edge remains fixed');
const railEdit=pierHandles.find(h=>h.fields.includes('railingLength'))!.edit({x:15,h:0});
assert.deepEqual(railEdit.props,{railingLength:235});assert(!railEdit.offset,'Railing endpoint does not move the deck');
// Coast depth, viewport horizons and reflection world elevations use their actual native spaces.
for(const type of ['coast.ground','coast.wall']){
 const e=art.get(type),p=art.properties(type,{}),h=e.spatial!.handles(p)[0],edit=h.edit({x:0,h:-30});
 assert.equal(h.point.h,-Number(p.depthBelowGround));assert.equal(edit.props.depthBelowGround,Number(p.depthBelowGround)+30);assert(!edit.offset,'Depth editing leaves the top and material spans fixed');
 assert.throws(()=>art.properties(type,{depthBelowGround:-1}),/min|depth/i);
}
const sea=art.get('environment.sea'),seaProps=art.properties(sea.type,{}),seaAt={x:100,h:45,scale:1,facing:1 as const,parallax:.4};
const seaHorizon=sea.spatial!.handles(seaProps,{view,placement:seaAt})[0];
assert.equal(-seaAt.h-seaHorizon.point.h,view.y(seaAt.h+Number(seaProps.horizon)));
assert.throws(()=>art.properties(sea.type,{horizon:10,bottom:11}),/above its horizon/);
assert.throws(()=>art.properties('environment.reflection',{horizon:10,depth:11}),/above its horizon/);
const reflection=art.get('environment.reflection'),reflectionProps=art.properties(reflection.type,{}),reflectionHorizon=reflection.spatial!.handles(reflectionProps,{view,placement:seaAt})[0];
assert.equal(-seaAt.h-reflectionHorizon.point.h,view.y(Number(reflectionProps.horizon)),'Reflection kernel takes world elevations without adding placement Y');
assert.equal(reflection.fields.horizon.semantics!.space,'world');
assert.equal(art.get('environment.sky').fields.horizon.semantics!.quantity,'position');
assert.equal(art.get('coast.ground').fields.origin.semantics!.quantity,'position');
assert.throws(()=>art.properties('dockwork.ground',{width:1180}),/unknown/i);
const dock=art.get('dockwork.ground'),dockProps=art.properties(dock.type,{}),dash=dock.spatial!.handles(dockProps)[0];
assert.equal(dash.space,'chunk');assert.deepEqual(dash.point,{x:1180,h:-12});assert.deepEqual(dash.edit({x:20,h:50}).props,{drawingWidth:1200});
const salt=art.get('beach.salt'),saltProps=art.properties(salt.type,{}),saltLeft=salt.spatial!.handles(saltProps)[0].edit({x:20,h:0});
assert.equal(Number(saltLeft.props.width)+saltLeft.offset!.x,Number(saltProps.width));assert(!('stools'in saltLeft.props));assert(!('sag'in saltLeft.props));
const hanging=art.get('sign.hanging'),chain=hanging.spatial!.handles(art.properties(hanging.type,{drop:30}))[0];
assert.equal(chain.point.h,42);assert.deepEqual(chain.edit({x:10,h:8}).props,{drop:38});
const nameplate=art.get('sign.nameplate'),nameProps=art.properties(nameplate.type,{rods:80}),rod=nameplate.spatial!.handles(nameProps)[0];
assert.equal(rod.point.h,80);assert.deepEqual(rod.edit({x:0,h:10}).props,{rods:90});
assert.equal(nameplate.bounds(nameProps,{}).h,80);assert.equal(nameplate.bounds(nameProps,{}).tall,100,'Declared geometry includes the native roof rods');
assert.match(art.get('sign.blade').spatial!.reason!,/typography/);
// Interior fittings expose actual source endpoints and fixed-count cell dimensions.
for(const[type,old,newKey]of [ ['interior.dt-concierge','conduit','conduitLength'],['interior.dt-mailboxes','from','bottomY'],['interior.dt-doc-chair','ceiling','ceilingHeight'],['interior.dt-transfer-cradle','loom','loomLength'],['civic.counters','bay','windowWidth'],['civic.terminal-bank','desk','deskWidth'],['civic.alarm','reach','reachScale'],['civic.checkpoint','barrier','barrierWidth'],['civic.police-lamp','drop','poleHeight']]){
 assert.throws(()=>art.properties(type,{[old]:1}),/unknown/i);assert(newKey in art.get(type).fields);
}
for(const[type,width,count]of [['civic.counters','windowWidth','windows'],['civic.terminal-bank','deskWidth','desks']]){
 const e=art.get(type),p=art.properties(type,{}),h=e.spatial!.handles(p).find(h=>h.id.endsWith('left'))!,edit=h.edit({x:12,h:0});
 assert.equal(Number(edit.props[width])*Number(p[count])+edit.offset!.x,Number(p[width])*Number(p[count]));assert(!(count in edit.props));assert(!('seed'in edit.props));
}
const concierge=art.get('interior.dt-concierge');
assert.equal(concierge.spatial!.handles(art.properties(concierge.type,{mount:'desk'})).length,0);
assert.equal(concierge.spatial!.handles(art.properties(concierge.type,{conduitLength:30}))[0].point.h,96);
assert.equal(art.get('interior.dt-mailboxes').fields.bottomY.semantics!.quantity,'position');
assert.equal(art.get('civic.counters').fields.windowWidth.semantics!.quantity,'length');
assert.equal(art.get('civic.counters').fields.counterHeight.semantics!.quantity,'position');
assert.equal(art.get('civic.alarm').fields.reachScale.semantics!.quantity,'factor');
const chairElement=art.get('interior.dt-doc-chair');assert.equal(chairElement.spatial!.handles(art.properties(chairElement.type,{sheeting:false,lamp:'floor stand'})).length,0);
const transfer=art.get('interior.dt-transfer-cradle'),transferProps=art.properties(transfer.type,{}),loom=transfer.spatial!.handles(transferProps).find(h=>h.fields.includes('loomLength'))!;
assert.equal(loom.point.x,-40);assert.deepEqual(loom.edit({x:-15,h:20}).props,{loomLength:55});
const checkpoint=art.get('civic.checkpoint');
for(const table of [true,false]){const p=art.properties(checkpoint.type,{table,barrierWidth:64}),h=checkpoint.spatial!.handles(p)[0];assert.equal(h.point.x,(table?50:0)+64);assert.deepEqual(h.edit({x:12,h:0}).props,{barrierWidth:76});}
const police=art.get('civic.police-lamp');assert.equal(police.spatial!.handles(art.properties(police.type,{mount:'wall'})).length,0);assert.equal(police.spatial!.handles(art.properties(police.type,{mount:'pole',poleHeight:150}))[0].point.h,150);
const bank=art.get('civic.terminal-bank'),bankProps=art.properties(bank.type,{});
assert.equal(bank.bounds(bankProps,{}).w,208);assert.equal(Object.keys(bank.anchors(bankProps,{})).length,5);
const bankDrawing=measureArtwork(ctx=>bank.draw(ctx,{...view,cam:0,sx:(x:number)=>x},bankProps,art.visualProperties(bank.type,{}),'backdrop',{x:0,h:0,scale:1,facing:1,parallax:1}));
assert(bankDrawing.width>100&&bankDrawing.height>30,'Terminal bank must still paint its declared number of desks after cell-width migration');
// Configured generator/subpart extents use source geometry, not current particle silhouettes.
const hose=art.get('market.hose'),hoseProps=art.properties(hose.type,{sprayReach:50,puddleWidth:140,flow:.8}),hoseHandles=hose.spatial!.handles(hoseProps);
const spray=hoseHandles.find(h=>h.fields.includes('sprayReach'))!;assert.equal(spray.point.x,-56);assert.deepEqual(spray.edit({x:-20,h:0}).props,{sprayReach:70});
const puddleLeft=hoseHandles.find(h=>h.id.endsWith(':left'))!,puddleEdit=puddleLeft.edit({x:20,h:0});
assert.equal(puddleLeft.point.x,-98);assert.equal(-28+Number(puddleEdit.props.puddleWidth)/2+puddleEdit.offset!.x,42,'Puddle opposite edge stays fixed at its source-derived centre');
const bridge=art.get('market.footbridge'),bridgeProps=art.properties(bridge.type,{}),bridgeRoof=bridge.spatial!.handles(bridgeProps).find(h=>h.fields.includes('height'))!;
assert.equal(bridgeRoof.point.h,Number(bridgeProps.deckY)+Number(bridgeProps.height));assert.equal(bridgeRoof.edit({x:0,h:10}).props.height,50);
assert('deck'in bridge.anchors(bridgeProps,{}),'Existing attachment identity survives the deck-property rename');
assert(!bridge.spatial!.handles(art.properties(bridge.type,{roof:false})).some(h=>h.fields.includes('height')));
const pad=art.get('deck.landing-pad');
assert.equal(pad.spatial!.handles(art.properties(pad.type,{mode:'none'})).length,2);
assert(pad.spatial!.handles(art.properties(pad.type,{mode:'parked'})).some(h=>h.fields.includes('powerPostX')));
assert(!pad.spatial!.handles(art.properties(pad.type,{mode:'parked'})).some(h=>h.fields.includes('hoverHeight')));
const palm=art.get('environment.palm'),palmProps=art.properties(palm.type,{});assert.equal(palmProps.trunkHeight,300);assert.equal(palmProps.leanX,30);
const palmTop=palm.spatial!.handles(palmProps).find(h=>h.fields.includes('trunkHeight'))!;assert.deepEqual(palmTop.point,{x:30,h:300});assert.equal(palm.spatial!.handles(palmProps).length,1,'One real trunk-tip control, not overlapping height/lean buttons');assert.deepEqual(palmTop.edit({x:0,h:30}).props,{leanX:30,trunkHeight:330});
assert.equal(art.get('coast.boats').fields.waterLevel.semantics!.space,'world');
assert.equal(art.get('interior.self-checkouts').fields.gantryY.semantics!.quantity,'position');
assert.equal(art.get('everyday.roof-sign').fields.fontSize.semantics!.group,'Appearance');
assert.match(art.get('character.flow').spatial!.reason!,/typed route/);
const lifeguard=art.get('coast.lifeguard'),guardProps=art.properties(lifeguard.type,{signOffset:300});assert(lifeguard.bounds(guardProps,{}).x<=-336,'Configured sign belongs in the framing area');
const boats=art.get('coast.boats'),boatProps=art.properties(boats.type,{waterLevel:180,boats:[{x:0,len:50,mast:1,flip:true}]}),boatBounds=boats.bounds(boatProps,{}, {view,placement:{x:0,h:80,scale:1,facing:1,parallax:1}});
assert.equal(boatBounds.h+80,220,'Absolute water-level geometry does not inherit placement Y');assert(boatBounds.x<=-150,'Stable fleet area includes a flipped long hull');
// Train fittings link only the scalar they use, with optional zero-valued elevation support.
for(const type of ['train.ceilingLight','train.drawCam','train.drawPole']){
 const node={id:'fitting',type,props:{ceilingHeight:140},placement:{x:70,h:20,scale:2,facing:-1 as const},layer:'set' as const,order:0,bindings:{ceiling:'scene.trainCeiling'}};
 const doc=art.validate({version:1,scene:'train-fixture',instances:[node]});
 for(const height of [0,180]){
  const row=resolveComposition(art,doc,{view,state:{},reduced:false,bindings:{'scene.trainCeiling':height}})[0];
  assert.equal(row.props.ceilingHeight,height,'Native ceiling is local geometry, not divided by placement scale');assert(propertyIsLinked(row,'ceilingHeight'));assert.equal(node.props.ceilingHeight,140);
  const captured:CapturedArtwork[]=[];measureArtwork(ctx=>{beginLayeredFrame(r=>captured.push(r));try{drawComposition(ctx,art,doc,{view,state:{},reduced:false,bindings:{'scene.trainCeiling':height}},'backdrop');}finally{endLayeredFrame();}});
  const f=frameSelection({artwork:captured,helpers:[],sceneId:doc.scene}as any,{composition:doc,time:0,reduced:false,overlays:true,selectedId:'fitting',environment:{}},false);
  assert(f.handles!.every(h=>!h.fields.includes('ceilingHeight')),'No ignored height handle on a bound fitting');
 }
 const copy=structuredClone(doc);delete copy.instances[0].bindings;
 const independent=resolveComposition(art,copy,{view,state:{},reduced:false})[0];assert.equal(independent.props.ceilingHeight,140);assert(!propertyIsLinked(independent,'ceilingHeight'));
 assert(art.get(type).spatial!.handles(independent.props).some(h=>h.fields.includes('ceilingHeight')));
 assert(!art.get(type).visualFields?.frame);
}
for(const type of ['train.windowFrame','train.staffDoor','train.seatBack','train.seatFront'])assert(!art.get(type).visualFields?.frame,'Unused frame input is removed');
const sourceDoc=art.validate({version:1,scene:'elevation-source',instances:[{id:'ceiling',type:'train.marker',props:{},placement:{x:0,h:166},layer:'set',order:0}]});
const provenance=bindingPropertySources(sourceDoc,{stage:{values:{height:{instance:'ceiling',get:'h'}}}}as any,{});
assert.deepEqual(provenance['scene.height'],{scene:'elevation-source',instance:'ceiling',property:'placement.h'});
// Internal artwork depth follows the authoritative projection, even with a separate editor camera.
{
const depthView={...view,...sourceProjection({cam:400,gy:300},{dx:0,dh:0},1,1000),viewW:2000,viewH:540};
const depthAt={x:300,h:20,scale:2,facing:-1 as const,parallax:.2};
for(const type of ['market.ticker','market.wanted','market.ad','market.registry','mall.ad']){
 const e=art.get(type),p=art.properties(type,{width:100,height:40,parallax:.7}),right=e.spatial!.handles(p,{view:depthView,placement:depthAt}).find(h=>h.id==='right')!;
 assert.equal(right.space,'screen');
 const nativeAnchor=depthView.sx(depthAt.x,.7),hostAnchor=depthView.sx(depthAt.x,.2);
 const drawnRight=hostAnchor+(nativeAnchor+50-hostAnchor)*depthAt.scale*depthAt.facing;
 const selectedRight=hostAnchor+(depthAt.x+right.point.x-hostAnchor)*depthAt.scale*depthAt.facing;
 assert.equal(selectedRight,drawnRight,type+' handle must use internal depth and the shared mirror/scale pivot');
 assert.equal(right.edit({x:10,h:0}).props.width,110);
 assert.throws(()=>art.properties(type,{width:0}),/min|number/);
}
for(const type of ['building.row','deck.cloud-sea']){
 const e=art.get(type),p=art.properties(type,{parallax:.7,width:500}),bounds=e.bounds(p,{}, {view:depthView,placement:depthAt}),projected=projectedBounds(depthView,depthAt,bounds);
 const origin=depthView.sx(depthAt.x,.2),native=depthView.sx(depthAt.x,.7),a=origin+(native-origin)*-2,z=origin+(native+500-origin)*-2;
 assert.equal(projected.x,Math.min(a,z));assert.equal(projected.width,1000,type+' bounds do not reconstruct editor-camera correction');
}
assert.throws(()=>art.properties('building.row',{minHeight:400,maxHeight:100}),/Minimum building height/);
assert.throws(()=>art.properties('building.row',{minWidth:100,maxWidth:80}),/Minimum building width/);
const cloudSea=art.get('deck.cloud-sea'),cloudProps=art.properties(cloudSea.type,{});assert.equal(cloudSea.selection,'region');assert.equal(cloudSea.fields.horizonY.semantics!.quantity,'position');assert.equal(cloudSea.fields.maxTowerHeight.semantics!.quantity,'length');
const maxTower=cloudSea.spatial!.handles(cloudProps).find(h=>h.fields.includes('maxTowerHeight'))!;assert.equal(maxTower.point.h,Number(cloudProps.horizonY)+Number(cloudProps.maxTowerHeight));
}
// Transit geometry follows full assembly extents and prepared movement, preserving source identity.
{
 const e=art.get('metro.cutaway-train'),p=art.properties(e.type,{cars:3,length:1000,gangwayLength:30}),handles=e.spatial!.handles(p),right=handles.find(h=>h.id.endsWith(':right'))!;
 assert.equal(right.point.x,3060,'Train extent includes both gangway gaps');
 assert.equal(right.edit({x:30,h:0}).props.length,1010);assert(!('cars'in right.edit({x:30,h:0}).props));
 const shifted=e.spatial!.handles(p,{view,placement:{x:0,h:0,scale:1,facing:1,parallax:1},state:{offset:80}}).find(h=>h.id===right.id)!;assert.equal(shifted.point.x,3140);
 const doc=art.validate({version:1,scene:'moving-train-controls',instances:[{id:'train',type:e.type,props:{cars:2,length:300,gangwayLength:20},placement:{x:10,h:0},layer:'set',order:0}]});
 const captured:CapturedArtwork[]=[];measureArtwork(ctx=>{beginLayeredFrame(r=>captured.push(r));try{drawComposition(ctx,art,doc,{view,state:{train:{offset:80}},reduced:false},'backdrop');}finally{endLayeredFrame();}});
 const frame=frameSelection({artwork:captured,helpers:[],sceneId:doc.scene}as any,{composition:doc,time:0,reduced:false,overlays:true,selectedId:'train',environment:{}},false);
 assert.equal(frame.handles!.find(h=>h.id.endsWith(':right'))!.x,view.sx(10+620+80),'Native selection passes the same prepared travel offset to handles');
 const repeats=repeatedWidthControls('width','count',undefined,0,'gap'),fractional={width:107.3,count:3,gap:20.4},zero=repeats.handles(fractional)[0].edit({x:0,h:0});assert.equal(zero.props.width,107.3,'Zero edit preserves fractional source values exactly');
 const car=art.get('vehicle.car'),carProps=art.properties(car.type,{ceilingHeight:50,maxDoorHeight:100});assert.equal(car.derived!(carProps).doorHeight.value,46);
 for(const type of ['metro.cutaway-car','metro.gangway','metro.cutaway-train','vehicle.car','vehicle.car-shell','vehicle.gangway'])assert.throws(()=>art.properties(type,{ceiling:62}),/unknown/i);
 const stairs=art.get('metro.stairs-up');for(const rises of ['left','right']){const p=art.properties(stairs.type,{rises}),h=stairs.spatial!.handles(p).find(h=>h.id==='landing')!,d=rises==='right'?1:-1;assert.equal(h.point.x,d*190);assert.deepEqual(h.edit({x:10,h:8}).props,{run:190+d*10,rise:158});}
 const seat=art.get('vehicle.seat'),seatProps=art.properties(seat.type,{style:'priority',seatHeight:24});assert.equal(seat.bounds(seatProps,{}).h,52,'Seat bounds include the priority plate at the actual height');assert('seat0'in seat.anchors(seatProps,{}));
 const ruler=art.get('metro.scale-ruler');assert.equal(ruler.spatial!.handles(art.properties(ruler.type,{})).length,2,'No reference-unit handle overlapping the default length edge');assert.equal(ruler.spatial!.handles(art.properties(ruler.type,{bar:false})).length,0);
}
// Source dimensions below the origin retain signed elevation and opposite-edge semantics.
{
 const light=art.get('furniture.strip-light'),p=art.properties(light.type,{}),handles=light.spatial!.handles(p);
 const tube=handles.find(h=>h.fields.includes('length')&&h.id.endsWith(':right'))!;
 const edit=tube.edit({x:20,h:0});assert.equal(edit.props.length,80);assert.equal(edit.offset!.x,10);
 assert.equal((edit.offset!.x)-Number(edit.props.length)/2,-Number(p.length)/2);
 const bottom=handles.find(h=>h.fields.includes('coneDepth'))!;assert.equal(bottom.point.h,-158);assert.equal(bottom.edit({x:0,h:-12}).props.coneDepth,170);
 const cone=handles.find(h=>h.fields.includes('coneWidth'))!;assert.equal(cone.point.h,-158);
 assert.throws(()=>art.properties(light.type,{spread:220}),/unknown/i);
 const entrance=art.get('undercity.metro-entrance'),q=art.properties(entrance.type,{}),feet=entrance.spatial!.handles(q).find(h=>h.id.endsWith('stair-foot'))!;
 assert.deepEqual(feet.point,{x:120,h:-96});assert.deepEqual(feet.edit({x:16,h:-20}).props,{run:136,depthBelowStreet:116});
 const end=entrance.spatial!.handles(q).find(h=>h.fields.includes('hallWidth'))!;assert.deepEqual(end.point,{x:340,h:-96});assert.deepEqual(end.edit({x:20,h:0}).props,{hallWidth:240});
 assert.equal(entrance.anchors(q,{}).foot.h,-96);assert.throws(()=>art.properties(entrance.type,{landing:220}),/unknown/i);
}
// Contextual cargo and routes read captured simulation without baking it into source.
{
 const cargo=art.get('harbor.craneLoad'),p=art.properties(cargo.type,{}),state:any={layout:{cranes:[{x:300}]},visual:{cranes:[{twx:350,hang:100,carry:true}]}};
 const c={view,placement:{x:236,h:-58,scale:1,facing:1 as const,parallax:1},state};
 const right=cargo.spatial!.handles(p,c).find(h=>h.id==='right')!;assert.deepEqual(right.point,{x:178,h:129});assert.deepEqual(right.edit({x:20,h:0}).props,{width:148});
 state.visual.cranes[0].carry=false;assert.equal(cargo.spatial!.handles(p,c).length,0,'No resize handle while the crane carries no load');
 const fork=art.get('harbor.forkliftBody'),q=art.properties(fork.type,{travel:180}),end=fork.spatial!.handles(q)[0];assert.deepEqual(end.point,{x:180,h:0});assert.deepEqual(end.edit({x:20,h:0}).props,{travel:200});
 const alley=art.get('downtown.alley');assert.equal(alley.visualFields?.doorOffset,undefined,'No self-bound copy of authored passage geometry');assert.deepEqual(alley.spatial!.handles(art.properties(alley.type,{doorOffset:-10}))[0].point,{x:-10,h:12});
}
// Flights expose source launch points, not resize handles on generated moving particles.
{
 for(const type of ['vehicle.ad-blimp','vehicle.scheduled-craft']){const e=art.get(type),p=art.properties(type,{}),h=e.spatial!.handles(p)[0];assert.deepEqual(h.point,{x:p.startX,h:p.altitude});assert.deepEqual(h.edit({x:20,h:-10}).props,{startX:Number(p.startX)+20,altitude:Number(p.altitude)-10});assert(!('velocityX'in h.edit({x:20,h:-10}).props));}
 const portal=art.get('transit.wall-portal'),p=art.properties(portal.type,{}),right=portal.spatial!.handles(p).find(h=>h.id==='right')!;assert.equal(right.edit({x:20,h:0}).props.width,380);
 const platform=art.get('transit.platform'),q=art.properties(platform.type,{}),edge=platform.spatial!.handles(q).find(h=>h.id==='right')!;assert.equal(edge.edit({x:30,h:0}).props.length,252);
}
// Shift generators expose configured limits and actual signed/mirrored source endpoints.
{
 const shore=art.get('shift.far-shore'),p=art.properties(shore.type,{});assert.throws(()=>shore.spatial!.validate!({...p,minTowerHeight:200,maxTowerHeight:150}),/Minimum tower height/);
 const low=shore.spatial!.handles(p).find(h=>h.fields.includes('minTowerHeight'))!;assert.equal(low.edit({x:0,h:4}).props.minTowerHeight,36);
 const quay=art.get('shift.quay'),q=art.properties(quay.type,{}),bottom=quay.spatial!.handles(q).find(h=>h.fields.includes('depthBelowGround'))!;assert.equal(quay.bounds(q,{}).tall,424);assert.equal(bottom.point.h,-384);assert.equal(bottom.edit({x:0,h:-20}).props.depthBelowGround,404);
 const fog=art.get('shift.fog');assert.equal(fog.spatial!.handles(art.properties(fog.type,{}))[0].edit({x:0,h:10}).props.height,80);
 const crane=art.get('shift.crane'),c=art.properties(crane.type,{}),spreader=crane.spatial!.handles(c).find(h=>h.fields.includes('dropLength'))!;assert.equal(spreader.edit({x:0,h:-10}).props.dropLength,130);assert.equal(crane.spatial!.handles({...c,boomUp:.5}).length,0);
 const stack=art.get('shift.stack'),r=art.properties(stack.type,{}),gap=stack.spatial!.handles(r)[0];assert.equal(gap.point.x,131);assert.equal(gap.edit({x:5,h:0}).props.columnGap,8);assert.equal(stack.spatial!.handles({...r,columns:1}).length,0);
 const clamp=art.get('shift.clamp'),s=art.properties(clamp.type,{}),context={view,placement:{x:100,h:0,scale:2,facing:-1 as const,parallax:1},state:{trolleyX:140,restX:100}};assert.equal(clamp.spatial!.handles(s,context)[0].point.x,-3);assert.equal(clamp.spatial!.handles(s,{...context,state:{...context.state,released:true}}).length,0);
 const reader=art.get('shift.reader');for(const side of ['left','right']){const r=art.properties(reader.type,{side}),reach=reader.spatial!.handles(r).find(h=>h.fields.includes('roofReach'))!,m=side==='right'?-1:1;assert.equal(reach.point.x,m*74);assert.equal(reach.edit({x:10,h:0}).props.roofReach,70+m*10);}assert.equal(reader.spatial!.handles(art.properties(reader.type,{shelter:false})).length,0);
}
// Canonical geography fields preserve source limits and complete through-block floors.
{
 const viaduct=art.get('transit.viaduct'),p=art.properties(viaduct.type,{});assert.throws(()=>art.properties(viaduct.type,{from:0}),/unknown/i);assert.throws(()=>viaduct.spatial!.validate!({...p,startX:4000,endX:3000}),/end/);
 const right=viaduct.spatial!.handles(p).find(h=>h.fields.includes('endX'))!;assert.deepEqual(right.edit({x:30,h:0}).props,{endX:3030});assert.equal(viaduct.spatial!.handles(p).filter(h=>h.fields.includes('rampTopX')).length,0,'Unset ramp does not show a misleading handle');
 const train=art.get('vehicle.line0-run'),q=art.properties(train.type,{});assert(train.spatial!.handles(q).some(h=>h.fields.includes('drawingMinX')));
 const block=art.get('architecture.through-block'),b=art.properties(block.type,{}),l=throughBlockLayout(b);assert.equal(l.roofY,1400);assert.equal(l.floorCount,11);assert.equal(l.remainder,2.5);assert.equal(block.bounds(b,{}).tall,2900);assert.equal(block.anchors(b,{}).roof.h,1400);
 const roof=block.spatial!.handles(b).find(h=>h.id==='top')!,edit=roof.edit({x:0,h:85});assert.equal(edit.props.height,2985);assert.equal(edit.offset!.h,0);assert.equal(throughBlockLayout({...b,...edit.props}).floorCount,12);assert.equal(b.floorHeight,85);assert.equal(b.bottomY,-1500);
 for(const floorHeight of [40,85,120]){for(const roofY of [900,1400,2600,6000]){const p={...b,floorHeight,height:roofY-Number(b.bottomY)},l=throughBlockLayout(p);let old=0;for(let fy=482;fy+.7*floorHeight<=roofY-6+1e-9;fy+=floorHeight)old++;assert.equal(l.floorCount,old);assert(l.remainder>=0&&l.remainder<floorHeight);}}
 assert.throws(()=>art.properties(block.type,{foot:-1500}),/unknown/i);assert.throws(()=>throughBlockLayout({...b,height:100}),/roof Y/);
 const skyline=art.get('architecture.skyline-rows');assert.throws(()=>art.properties(skyline.type,{drawingMinX:10,drawingMaxX:0}),/./);
 const street=art.get('downtown.skyline'),r=art.properties(street.type,{}),minimum=street.spatial!.handles(r).find(h=>h.fields.includes('minHeight'))!;assert.equal(minimum.point.h,74);assert.equal(minimum.edit({x:0,h:10}).props.minHeight,80);
}
// Native pixel kernels snap their origin before adding their pixel dimensions. Source edges
// remain exact; at fractional workspace scale the displayed edge can move within one snap step.
{
 for(const type of ['coast.ground','coast.wall','street.surface','shift.floor'])assert.throws(()=>art.properties(type,{depth:384}),/unknown/i);
 const rock=art.get('undercity.rock'),p=art.properties(rock.type,{}),top=rock.spatial!.handles(p).find(h=>h.id==='top')!;
 const edit=top.edit({x:0,h:30});assert.equal(edit.props.height,330);assert.equal(edit.offset?.h,0);assert.equal(rock.bounds({...p,...edit.props},{}).tall,330);assert.throws(()=>art.properties(rock.type,{tall:300}),/unknown/i);
 assert.throws(()=>art.properties('shift.floor',{joint:96}),/unknown/i);
}
{
 const asset=art.get('market.ad');
 for(const zoom of [.37,.8,1,1.25,2.417391304347826,4])for(const delta of [-20,-3,0,7,16,30]){
  const props=art.properties(asset.type,{width:92,height:40,parallax:.7}),before={x:1010,h:172,scale:1,facing:1 as const,parallax:1};
  const projection=sourceProjection({cam:800,gy:300},{dx:0,dh:0},zoom,400),v={...view,...projection};
  const edge=asset.spatial!.handles(props,{view:v,placement:before}).find(h=>h.id==='right')!;
  const node:any={props:{...props},placement:{...before}};applySpatialEdit(node,edge.edit({x:delta,h:0}));
  assert.equal(node.placement.x-Number(node.props.width)/2,before.x-Number(props.width)/2);
  const screenLeft=(x:number,w:number)=>v.sx(x,.7)-w/2;
  const drift=Math.abs(screenLeft(node.placement.x,Number(node.props.width))-screenLeft(before.x,Number(props.width)))*zoom;
  assert(drift<=1+1e-9,'Origin-snapped control drift is bounded by one projection snap step');
 }
}
console.log(`PASS: ${art.catalog().length} registered asset contracts / ${fields} top-level fields; unit/default/handle admission, sparse edits, fixed edges, mirrored/scaled native projection, floor thresholds and source history.`);
