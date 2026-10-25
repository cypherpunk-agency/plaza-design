import {prepareArtwork,intersectRects} from '../../art/core/presentation';
import {compositionAppearance} from '../../art/core/composition';
import {mobileInstances} from '../../art/core/mobility';
import {compilePeople} from '../people';
import {movingManifestGeometry} from './moving-manifest-geometry';
import {projectSceneState,type SceneDeviceSource} from './scene-state';
import {emptyData} from '../empty-data';
import {nativeDeviceData} from './native-bindings';
import {projectDeviceBindings} from './device-bindings';
import {compileManifestDocument} from './manifest-content-compiler';
import {art,resolveComposition,drawComposition,drawCompositionSlot,type Environment} from '../../art';
import {frameView} from '../../art/core/view';
import {drawReviewRoom} from '../../art/assemblies/review-room';
import {residentCharacter} from '../../art/characters/resident';
import {manifestGeometry} from './manifest-geometry';
import {withSceneConversations,actorConversationId} from './scene-conversations';
import type {SceneDef} from '../../scenes/kit';
import {validateSceneDocument,type SceneDocument} from './scene-document';
import {compileLevel,compileOccluders,levelNear,levelOpacity,levelVisualState,restingLevelView} from '../level';
import {levelVehicleVisuals,levelVehicleVisibility} from '../level-vehicles';
import {routeProblems} from '../../world/vehicles';
import {EMPTY_ZONE_GRAPH} from '../../world/zone-graph';
import type {GameplayDefinition} from './types';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../host';
import {compileSceneActors} from './actors';
import {bindingDefaults,bindingValues,providerSignals,unknownBindingSources,unofferedBindings,worldBindings} from './binding-sources';
import {PresentationSignals} from './presentation-signals';
import {stageContent} from './scene-stage';
import {SCENE_MECHANISMS,mergeRules,mechanismsRulesShape,withMechanismDevices,composePresentations,type MechanismPresentation} from './scene-mechanisms';
import type {CityModel} from '../../world/city';
import type {LineSystem} from '../../world/transport/line';
import {nativeTargetValidator,compileNativeTargets,type NativeTargetValidationContext} from './native-targets';
import type {SceneData} from '../../data/types';
import {DEFAULT_COMPANION_FLAG} from './scene-companion';
import {evaluateValue,valueReferences} from './scene-values';
import {allPictureFields,pictureFields} from './controller-pictures';
/** What scene.json `stage.values` and `stage.atrium` name must exist in the scene: interactions, the atrium's artwork roles and picture fields. An artwork role, actor role or flag role the scene lacks reads as nothing (0, false), so an optional role may be left out. */
function valueProblems(d:SceneDocument,gameplay?:GameplayDefinition,rows?:readonly import('../../art/core/composition').Resolved[]){
 const ref=valueReferences(d.stage?.values),roles=d.manifest?.artwork??{};
 const bad=(what:string,names:string[],ok:(n:string)=>boolean)=>{const n=names.find(x=>!ok(x));if(n!==undefined)throw new Error('Scene value names '+what+' "'+n+'", which the scene does not have');};
 bad('an interaction',ref.uses,n=>d.uses.some(u=>u.id===n));
 bad('an artwork role',d.stage?.atrium?[d.stage.atrium.room,d.stage.atrium.escalator]:[],n=>Object.prototype.hasOwnProperty.call(roles,n));
 bad('a picture field',ref.pictures,n=>allPictureFields.includes(n));
 if(gameplay)bad('a saved state',ref.states,n=>Object.prototype.hasOwnProperty.call(gameplay.state??{},n));
 if(rows)bad('an artwork instance',ref.instances,n=>rows.some(r=>r.instance.id===n));
}

/** A named mechanism lets the scene's engine targets use the `reset` step (scene-mechanisms.ts `targetReset`). */
const resetPermitted=(doc:SceneDocument)=>(doc.stage?.mechanisms??[]).some(name=>SCENE_MECHANISMS[name]?.targetReset===true);
/** validateSceneDocument options of a declared scene: its engine targets anchor to the artwork roles its stage lists. Without a context the check is structural; the editor's assembled context checks them against the scene's devices and network. */
/** Scene document options of declared scenes; `composition` lets its providers' signals be cue targets. */
export const declaredSceneOptions=(value:unknown,context:NativeTargetValidationContext={phase:'structural'},composition?:unknown)=>({manifest:true,actors:Array.isArray((value as {actors?:unknown})?.actors),
 ...(()=>{const targets=composition?Object.keys(providerSignals(art.validate(composition),(value as SceneDocument).stage?.values)):[];return targets.length?{presentationTargets:targets}:{};})(),
 nativeTargets:(doc:SceneDocument,gameplay:GameplayDefinition)=>nativeTargetValidator(context.phase==='assembled'?context.data:{id:doc.id} as SceneData,{effects:{}},doc.stage?.targetAnchors??[],{reset:resetPermitted(doc)})(doc,gameplay,context)});
export function validateDeclaredScene(scene:SceneDocument,composition:unknown,gameplay:GameplayDefinition,sharedState?:unknown){
 const withActors=Array.isArray((scene as {actors?:unknown}).actors);
 const doc=art.validate(composition),signals=providerSignals(doc,scene.stage?.values),d=validateSceneDocument(scene,gameplay,{...declaredSceneOptions(scene,undefined,doc),sharedState});
 if(!d.manifest)throw new Error('Declared scene requires manifest bindings');
 // transport exits (`action`) are the runtime's; engine exits are opened by engine targets (stage.targetAnchors)
 if(d.exits?.some(e=>e.sets&&!gameplay.flags.includes(e.sets)&&e.sets!==DEFAULT_COMPANION_FLAG&&e.sets!==d.companion?.unlockFlag))throw new Error('Exit sets an undeclared gameplay flag');
 // artwork binds only to sources the engine works out (binding-sources.ts)
 if(!withActors&&JSON.stringify(doc.instances).match(/"actor\.[^"]+\.pose"/))throw new Error('Actor artwork requires scene.actors source definitions');
 const unknown=unknownBindingSources(doc);if(unknown.length)throw new Error('Unknown binding sources: '+unknown.join(', '));
 const unoffered=unofferedBindings(doc,d);if(unoffered.length)throw new Error('Binding not offered by its provider: '+unoffered.join('; '));
 const rows=resolveComposition(art,doc,{view:frameView(0),state:{},bindings:bindingDefaults(doc),reduced:false});
 valueProblems(d,gameplay,rows);
 const compile=d.manifest.compile,geometry=compile?manifestGeometry(d,rows,compile.groups,compile):manifestGeometry(d,rows),bindings=geometry.bindings;
 // a scene's people are either its actors (scene.actors, with their artwork) or residents placed by the manifest
 const actors=withActors?compileSceneActors(d,rows):{};
 const people=withActors?d.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]):(d.people??[]).filter(p=>bindings.people?.[p.id]).map(p=>{const point=bindings.people[p.id],r=point.row;if(r.element.type!=='character.resident'||r.instance.layer!=='playfield')throw new Error('Person requires visible character.resident artwork in the playfield layer: '+p.id);return {...residentCharacter(r.props,point),...p,...(p.conversation!==undefined?{talk:[]}:{}),conversation:p.conversation??actorConversationId(d.id,p.id)};});
 for(const name of d.stage?.mechanisms??[]){for(const role of SCENE_MECHANISMS[name].requires)if(!geometry.artwork[role])throw new Error('Scene mechanism '+name+' requires artwork role '+role);SCENE_MECHANISMS[name].check?.({scene:d,gameplay,roles:geometry.artwork});}
 const positions=Object.fromEntries(Object.entries(bindings.uses).map(([id,r])=>[id,r.x]));
 return {scene:d,composition:doc,signals,positions,people,actors,rows,...geometry};
}
/** Validate against the prospective registry; the same rule supports existing and newly authored scenes. */
export function validateDeclaredDestinations(scene:SceneDocument,destinations:Readonly<Record<string,readonly string[]>>){
 for(const exit of scene.exits??[]){const arrivals=exit.to===scene.id?(scene.exits??[]).map(e=>e.id):destinations[exit.to];
  if(!arrivals||exit.at&&!arrivals.includes(exit.at))throw new Error('Unknown declared exit destination/arrival: '+exit.to+(exit.at?'/'+exit.at:''));
 }
}
/** The same factory handles every instance; source contains no executable scripts or renderer selection. */
type RulesOf=NonNullable<SceneDef['rules']>;
const combine=(a:RulesOf,b:RulesOf):RulesOf=>player=>mergeRules([typeof a==='function'?a(player):a,typeof b==='function'?b(player):b]);
export function declaredScene(scene:SceneDocument,composition:unknown,gameplay:GameplayDefinition,options:Partial<Environment>&{sharedState?:unknown}={},devices?:SceneDeviceSource,world?:{city:CityModel;metro:LineSystem}):SceneDef{
 const validated=validateDeclaredScene(scene,composition,gameplay,options.sharedState),d=validated.scene,rows=validated.rows,shared=new Map<string,unknown>();
 const compiled=compileManifestDocument(d,rows,(_c,id)=>({name:d.name,pages:[],conversation:id}),d.manifest!.compile??{elevatedResponses:true}),roles=compiled.geometry.artwork;
 // a mechanism's rules widen what the device document may read and emit (derived values, physical milestones)
 const mechanisms=(d.stage?.mechanisms??[]).map(name=>SCENE_MECHANISMS[name]),contract=mechanismsRulesShape(d.stage?.mechanisms);
 const data=nativeDeviceData(projectDeviceBindings(d,rows,projectSceneState(devices??emptyData(d.id,d.name),gameplay),validated.width),gameplay,Object.keys(contract?.derived??{}),contract?.inputs,contract?.derivedTypes,contract?.mechanisms);
 // the picture fields the scene's values ask for are ones its controller prepares
 for(const f of valueReferences(d.stage?.values).pictures)if(data.controller&&!pictureFields(data.controller.kind).includes(f))throw new Error('Scene value asks for picture field "'+f+'", which the scene\'s controller does not prepare');
 // a controller's geometry names artwork by id: it must exist, and a window must be a rectangle
 for(const[role,ref]of Object.entries((data.controller as {geometry?:Record<string,unknown>}|undefined)?.geometry??{})){const row=typeof ref==='string'?rows.find(r=>r.instance.id===ref):undefined;if(!row)throw new Error('Controller geometry '+role+' names missing artwork '+String(ref));if(role==='window'&&!(Number(row.props.width)>0&&Number(row.props.height)>0))throw new Error('Controller window requires rectangle dimensions');}
 // engine targets (scene.nativeTargets) anchor to the stage's artwork roles and open the scene's engine exits
 const anchorRows:Record<string,import('../../art/core/composition').Resolved>={...roles,...Object.assign({},...mechanisms.map(m=>m.anchors?.({data,rows})??{}))};
 const anchors=(d.stage?.targetAnchors??[]).filter(a=>anchorRows[a]);
 const targets=d.stage?.targetAnchors||d.nativeTargets?compileNativeTargets(d,Object.fromEntries(anchors.map(a=>[a,anchorRows[a].placement])),{reset:resetPermitted(d),anchors}):{};
 // a level (floors, stairs, lifts, buildings): its lifts and building reveal come from the frame's View.level
 const level=compileLevel(rows),manifest=d.manifest!;
 const attachmentOffsets=movingManifestGeometry(d,validated.composition,rows,level);
 for(const v of level?.vehicles??[]){
  if(v.source.boardQuery&&!gameplay.queries?.[v.source.boardQuery])throw Error('Vehicle references a missing boarding query: '+v.source.boardQuery);
  if(v.source.presenceQuery&&!gameplay.queries?.[v.source.presenceQuery])throw Error('Vehicle references a missing presence query: '+v.source.presenceQuery);
  const local=v.source.route.legs.every(l=>l.zone===d.id||l.zone==='here');
  if(local){const problems=routeProblems(v.source,EMPTY_ZONE_GRAPH,{[d.id]:{},here:{}});if(problems.length)throw Error(problems.join('; '));}
  for(const berth of v.source.berths)if((berth.zone===d.id||berth.zone==='here')&&berth.floor&&!level!.floors.some(f=>f.id===berth.floor))throw Error('Vehicle berth names a missing floor: '+berth.floor);
  for(const key of [v.source.mover,...('mover'in v.source.doors?[v.source.doors.mover]:[])]){const[device,noun]=key.split('.');if(!data.devices.find(d=>d.id===device)?.nouns.find(n=>n.id===noun)?.mover)throw Error('Vehicle references a missing Circuit mover: '+key);}
  for(const id of v.source.shell??[])if(!rows.some(r=>r.instance.id===id))throw Error('Vehicle shell names missing artwork: '+id);
 }
 // what the player passes behind (a walk-in building's wall edges, a stair's near rail): drawn over them while they do
 const occluders=level?compileOccluders(rows):[];
 // the grey review room stands in for a room until the composition paints its own backdrop
 const ownRoom=rows.some(r=>r.instance.layer==='backdrop'||r.instance.layer==='distance')||mechanisms.some(m=>m.ownsRoom),front=rows.some(r=>r.instance.layer==='foreground');
 const instanceOf=(t:unknown)=>typeof t==='string'?t:(t as {instance:string}).instance,heightOf=(t:unknown)=>rows.find(r=>r.instance.id===instanceOf(t))?.placement.h??0;
 // presentation signals: cosmetic event stamps a provider's artwork reads (a crane call), set by the scene's cues
 const signals=Object.keys(validated.signals).length?new PresentationSignals(d.cues??[],validated.signals):undefined;
 const movingActors=new Set((d.actors??[]).filter(a=>{const body=validated.actors[a.id];return !!body&&(!!body.follow||(Array.isArray(body.range)?body.range[0]!==body.range[1]:!!body.range));}).map(a=>a.instance));
 const mobiles=mobileInstances(validated.composition,art,movingActors);
 const environment=(view:View,engine?:EngineDraw):Environment=>{const live=level?view.level??restingLevelView(level,false):undefined;
  const pieces=live?levelVisualState(live):{},near=level&&live?levelNear(level,live,occluders):{},vehicles=level?.vehicles?.length&&engine?levelVehicleVisuals(engine.m.peopleLevel??level,engine.m):{},state:Record<string,import('../../art').Properties>={...(options.state??{}),...vehicles,...pieces};
  for(const[id,v]of Object.entries(near))state[id]={...(state[id]??{}),...v};
  for(const source of engine?.m.peopleSources??[]){const people=engine!.m.people.pictures[source.id];if(people)state[source.id]={...(state[source.id]??{}),people:people as unknown as import('../../art').Value};}
  const {sharedState:_declarations,...appearance}=options;
  return {...appearance,view,mobileArtwork:mobiles,state:{...state,...view.sequence?.state},visibility:{...options.visibility,...(level&&engine?levelVehicleVisibility(level,engine.m):{})},sequenceTime:view.sequence?.time??options.sequenceTime,...(level&&live?{opacity:{...(options.opacity??{}),...levelOpacity(level,live)}}:{}),
   bindings:bindingValues(validated.composition,{view,rows:(()=>{if(!level?.vehicles?.length||!d.actors?.length)return rows;const moved=new Map(resolveComposition(art,validated.composition,{view,state,bindings:bindingDefaults(validated.composition),reduced:false},d.actors.map(a=>a.instance)).map(r=>[r.instance.id,r]));return rows.map(r=>moved.get(r.instance.id)??r);})(),roles,actors:validated.actors,source:d,gameplay,uses:compiled.content.uses,engine,world,signals,shared},d.stage?.actors),reduced:view.reduced??options.reduced??false};};
 const draw=(ctx:CanvasRenderingContext2D,view:View,engine?:EngineDraw,inFront=false)=>{const env=environment(view,engine);if(!inFront){if(!level&&!ownRoom)drawReviewRoom(ctx,view);drawComposition(ctx,art,validated.composition,env,'backdrop');}else drawComposition(ctx,art,validated.composition,env,'foreground');};
 const artworkVisible:NonNullable<SceneDef['artworkVisible']>=(view,model)=>{
  const queryView={...view,zoneWindow:{left:view.sx(0),right:view.sx(validated.width)}};
  const env=environment(queryView,model?{m:model,hover:null,layer:'all'}:undefined),appearance=compositionAppearance(validated.composition,env);
  return resolveComposition(art,validated.composition,env).some(r=>{
   if(!r.element.parts.length||r.instance.layer==='logic'||view.artworkScope==='static'&&mobiles.has(r.instance.id)||!mobiles.has(r.instance.id)&&['distance','backdrop'].includes(r.instance.layer)&&r.instance.clip!=='none'&&typeof r.instance.clip!=='object')return false;
   const a=prepareArtwork(r,validated.composition,env,appearance.get(r.instance.id)!,mobiles.has(r.instance.id));
   const box=a.clip?intersectRects(a.bounds,a.clip):a.bounds;
   return a.visible&&box.x<view.viewW&&box.x+box.width>0&&box.y<view.viewH&&box.y+box.height>0;
  });
 };
 const exits=level?compiled.content.exits.map(e=>({...e,arriveH:heightOf(manifest.exits?.[e.id])})):compiled.content.exits;
 const travelling=rows.filter(r=>mobiles.has(r.instance.id));
 const extent=travelling.flatMap(r=>{const x=r.placement.x,range=Number(r.props.range??r.props.lane??0)*r.placement.scale,b=(r.element.travelBounds??r.element.bounds)(r.props,r.state,{view:frameView(0),placement:r.placement}),left=b.x*r.placement.scale*r.placement.facing,right=(b.x+b.w)*r.placement.scale*r.placement.facing;const positions=[left,right];if(typeof r.props.range==='number'||typeof r.props.lane==='number')positions.push(0,range);return[x+Math.min(...positions)-40,x+Math.max(...positions)+40];});
 for(const a of d.actors??[]){if(!movingActors.has(a.instance))continue;let body=validated.actors[a.id],gap=0;while(body.follow){gap+=body.gap??18;body=body.follow;}const range=body.range,ends=Array.isArray(range)?range:[body.x,body.x+Number(range??0)],depth=validated.actors[a.id].parallax??1;extent.push((Math.min(...ends)-gap-64)/Math.max(.05,depth),(Math.max(...ends)+gap+64)/Math.max(.05,depth));}
 const base:SceneDef={...(extent.length?{mobileExtent:{from:Math.min(...extent),to:Math.max(...extent)}}:{}),artwork:validated.composition,peopleFlows:compilePeople(rows,level,d.id),artworkVisible,id:d.id,name:d.name,data,introOnFoot:d.introOnFoot,intro:d.introTouch?(touch:boolean)=>[...(touch?d.introTouch!:d.intro)]:d.intro.length?[...d.intro]:undefined,...(d.environment?{}:{outdoor:false,ambient:{}}),...compiled.content,exits,...(d.phases?{phases:d.phases}:{}),...(d.wash?{wash:d.wash}:{}),people:validated.people,gameplay:withSceneConversations(gameplay,d,options.sharedState),...stageContent(d.stage,rows,roles),...(d.stage?.values?.carry!==undefined?{dockworkerCarry:(flags:Readonly<Record<string,boolean>>,values:import('./types').StateValues|undefined=undefined)=>evaluateValue(d.stage!.values!.carry,{presentation:d.presentation,flags,values,gameplay}) as 'parcel'|'case'|null}:{}),...targets,...(signals?{presentationTargets:Object.freeze(Object.keys(validated.signals)),gameplayEvent:signals.event,presentationState:signals}:{}),...(level?{level,spawnH:heightOf(manifest.spawn)}:{}),
  visualEnvironment:(view,engine)=>environment(view,engine),drawBackdrop:(ctx,v,engine)=>draw(ctx,v,engine),...(front||!ownRoom?{drawFront:(ctx:CanvasRenderingContext2D,v:View,engine?:EngineDraw)=>draw(ctx,v,engine,true)}:{})};
 // registered mechanisms (scene-mechanisms.ts) add what they own; a world-bound scene is rebuilt with the city and line system
 // each mechanism may return picture-side state (`presentation`); the scene prepares, saves and restores them together, beside its presentation signals
 if(attachmentOffsets)base.rules=base.rules?combine(base.rules,{effects:{},attachmentOffsets}):{effects:{},attachmentOffsets};
 const presentations:(readonly[string,MechanismPresentation])[]=[];
 const built=mechanisms.reduce<SceneDef>((acc,m,i)=>{const {presentation,...part}=m.apply({composition:validated.composition,environment,scene:d,gameplay,rows,roles,width:validated.width,content:acc,actors:validated.actors,world,shared});
  if(presentation)presentations.push([d.stage!.mechanisms![i],presentation]);
  // mechanisms that run code each supply rules; they combine
  return{...acc,...part,...(acc.rules&&part.rules?{rules:combine(acc.rules,part.rules)}:{})};},base);
 Object.assign(built,composePresentations(presentations,signals));
 if(rows.some(r=>r.element.framePhase==='sky'))built.drawSkyArtwork=(ctx,v)=>drawCompositionSlot(ctx,art,validated.composition,environment(v),'behind-player',undefined,'sky');
 // the rules carry the mechanisms' Circuit devices, so the model, the contracts and the editor see the same cable endpoints
 if(built.rules&&contract?.mechanisms?.length)built.rules=withMechanismDevices(built.rules,contract.mechanisms);
 return mechanisms.some(m=>m.world)||worldBindings(validated.composition)?{...built,bindWorld:services=>declaredScene(scene,composition,gameplay,options,devices,services)}:built;
}
