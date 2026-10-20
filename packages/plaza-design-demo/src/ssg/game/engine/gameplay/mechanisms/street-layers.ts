/**
 * Mechanism `streetLayers` (scene.json `stage.mechanisms`): Downtown's street, painted in the
 * engine's own moments rather than in one pass. The city (the distance and backdrop layers, without
 * the street) and the street (its surface, the noodle stall's puddle and the neons' reflections) are
 * the engine's sky-and-ground moments (SceneDef.artworkFrame, so rain and puddles lie between them
 * and the machines); the machines (layer `set`) are the scene's backdrop; the people (the playfield
 * up to the player row) are its actors. Every moment paints from the one composition and the
 * `downtown` binding provider (binding-providers/downtown.ts); nothing here advances the simulation.
 *
 * It also gives the scene what hangs off the street's roles: the two climbable platforms (the
 * dumpster and the annex roof) and the neon buzz. Needs the artwork roles `stall`, `alley`,
 * `vehicleHome`, `dumpsterPlatform`, `annexPlatform`, `dumpsterWidth`, `annexWidth`, `caster` and
 * `reflection0`..`reflection9`.
 *
 * `renderDowntownStreet` paints the same street from Downtown's own documents for other scenes that
 * borrow it (the back yard's walled-in sky is the street's, seen over the fence).
 */
import {art,drawCompositionSlot,queueLayeredSlots,type Composition,type Environment,type Resolved,resolveComposition} from '../../../art';
import {frameView,type View} from '../../../art/core/view';
import downtownComposition from '../../../scenes/downtown/composition.json';
import downtownScene from '../../../scenes/downtown/scene.json';
import {compileSceneActors} from '../actors';
import {bindingDefaults,bindingValues} from '../binding-sources';
import {manifestGeometry} from '../manifest-geometry';
import type {SceneDocument} from '../scene-document';
import type {SceneMechanism} from '../scene-mechanisms';
import {DOWNTOWN_REFLECTION_ROLES,smearList} from '../binding-providers/downtown';

/** The street surface and its reflections: drawn in the engine's street moment. */
const STREET_TYPES=new Set(['downtown.street','downtown.stall-pool','downtown.smear']);
const street=(r:Resolved)=>STREET_TYPES.has(r.instance.type);
type Moment='city'|'street'|'devices'|'people';
/** Layered Downtown keeps its engine moments: city (distance and backdrop, without the street), street, devices (set), people (playfield). */
function paint(ctx:CanvasRenderingContext2D,doc:Composition,env:Environment,moment:Moment){
 if(moment==='city')drawCompositionSlot(ctx,art,doc,env,'behind-player',r=>(r.instance.layer==='distance'||r.instance.layer==='backdrop')&&!street(r));
 else if(moment==='street')drawCompositionSlot(ctx,art,doc,env,'behind-player',street);
 else if(moment==='devices')drawCompositionSlot(ctx,art,doc,env,'behind-player',['set']);
 else{drawCompositionSlot(ctx,art,doc,env,'behind-player',['playfield']);queueLayeredSlots(ctx,art,doc,env);}
}
/** The street moment dries and lights only what it is told: rain and whether the city is lit. */
const streetEnv=(env:Environment,rain:number,lit:boolean):Environment=>({...env,bindings:{...env.bindings,'downtown.rain':rain,'downtown.city':lit}});

let own:{doc:Composition;env:(view:View)=>Environment}|undefined;
/** Downtown's own street, from its shipped documents: what other scenes paint when they borrow it. */
export function renderDowntownStreet(ctx:CanvasRenderingContext2D,view:View,rain:number,lit:boolean){
 if(!own){
  const doc=art.validate(downtownComposition),source=downtownScene as unknown as SceneDocument,rows=resolveComposition(art,doc,{view:frameView(0),state:{},bindings:bindingDefaults(doc),reduced:false}),compile=source.manifest!.compile;
  const roles=(compile?manifestGeometry(source,rows,compile.groups,compile):manifestGeometry(source,rows)).artwork,actors=compileSceneActors(source,rows);
  own={doc,env:v=>({view:v,state:{},bindings:bindingValues(doc,{view:v,rows,roles,actors,source},source.stage?.actors),reduced:false})};
 }
 paint(ctx,own.doc,streetEnv(own.env(view),rain,lit),'street');
}

export const streetLayers:SceneMechanism={
 label:'Downtown street (engine moments, platforms, reflections)',
 requires:['stall','alley','vehicleHome','dumpsterPlatform','annexPlatform','dumpsterWidth','annexWidth','caster',...DOWNTOWN_REFLECTION_ROLES],world:false,
 apply:({roles,composition:doc,environment})=>({
  buzz:true,
  platforms:[['dumpsterPlatform','dumpsterWidth'],['annexPlatform','annexWidth']].map(([point,extent])=>{const at=roles[point].placement,width=Number(roles[extent].props.width)*at.scale;return{x:at.facing===-1?at.x-width:at.x,w:width,h:at.h};}),
  artworkFrame:{
   reflections:smearList(roles),
   city:(x,v)=>paint(x,doc,environment(v),'city'),
   street:(x,v,rain,lit)=>paint(x,doc,streetEnv(environment(v),rain,lit),'street'),
  },
  drawBackdrop:(x,v,engine)=>paint(x,doc,environment(v,engine),'devices'),
  drawActors:(x,v)=>paint(x,doc,environment(v),'people'),
 }),
};
