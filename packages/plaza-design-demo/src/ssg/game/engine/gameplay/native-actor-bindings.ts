import type {Instance,Resolved} from '../../art/core/composition';
import type {ActorDefinition} from './actors';
export interface ActorBindingController {element:string;prefix:string;suffix:string;mutable:boolean;clipPrefix?:string}
/** Registered renderer bindings; source records own actor identity, placement references and dialogue. */
const controllers:Record<string,ActorBindingController>={
 downtown:{element:'actor.prepared',prefix:'actor.',suffix:'.pose',mutable:true},
 // the LINE 0 scenes are folder scenes: riders come from the `station` and `train` binding providers
 metro:{element:'actor.prepared',prefix:'station.pose.',suffix:'',mutable:true},
 // the stations are folder scenes: their riders come from the `station` binding provider (binding-providers/station.ts)
 galleriaStation:{element:'actor.prepared',prefix:'station.pose.',suffix:'',mutable:true},
 harborStation:{element:'actor.prepared',prefix:'station.pose.',suffix:'',mutable:true},
 train:{element:'actor.prepared',prefix:'train.pose.',suffix:'',mutable:true},
 capsule:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true},
 yard:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true},
 moth:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true},
 market:{element:'character.prepared',prefix:'market.actor.',suffix:'',mutable:true},
 harborShift:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true},
 beach:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true},
 mall:{element:'character.prepared',prefix:'mall.actor.',suffix:'',mutable:true},
 harbor:{element:'character.prepared',prefix:'harbor.actor.',suffix:'',clipPrefix:'harbor.clip.',mutable:true},
 stacks:{element:'character.prepared',prefix:'terminal.actor.',suffix:'',clipPrefix:'terminal.clip.',mutable:true},
 library:{element:'library.person',prefix:'actor.',suffix:'.pose',mutable:true},
 laundromat:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true},
 sandbox:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true},
};
/** Folder scenes (and any scene not listed) use the plain naming: `actor.<id>.pose` on `character.prepared`. */
const DEFAULT_ACTORS:ActorBindingController={element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true};
export const actorBindingController=(scene:string)=>controllers[scene]??DEFAULT_ACTORS;
export function actorPoseSource(scene:string,id:string){const c=actorBindingController(scene);return c.prefix+id+c.suffix;}
export function mutableActorArtwork(scene:string,node:Instance):boolean{const c=actorBindingController(scene);return !!c?.mutable&&node.type===c.element&&typeof node.props.actor==='string'&&node.bindings?.pose===actorPoseSource(scene,node.props.actor);}
const riderSource=(c:ActorBindingController,name:string)=>{const tail=c.suffix+'.embedded';return name.startsWith(c.prefix)&&name.endsWith(tail)&&/^[-a-zA-Z0-9_.]+$/.test(name.slice(c.prefix.length,name.length-tail.length));};
/** A bench consumes a source actor pose; it owns no actor/controller state itself. */
export function mutableActorConsumer(scene:string,node:Instance):boolean{const c=controllers[scene];return c?.element==='actor.prepared'&&node.type==='station.bench'&&Object.keys(node.bindings??{}).every(k=>k==='rider')&&(!node.bindings?.rider||riderSource(c,node.bindings.rider));}
export function validateActorArtwork(scene:string,actors:readonly ActorDefinition[],rows:readonly Resolved[]):void{
 const c=actorBindingController(scene);
 if(c.element!=='actor.prepared'&&actors.some(a=>a.presentation))throw new Error('Scene actor presenter does not support rider recipes');
 const art=rows.filter(r=>r.instance.type===c.element);if(art.length!==actors.length)throw new Error('Actor source/artwork count mismatch');
 for(const a of actors){const row=art.find(r=>r.instance.id===a.instance);if(!row||row.props.actor!==a.id||row.instance.bindings?.pose!==actorPoseSource(scene,a.id)||row.instance.layer==='logic')throw new Error('Actor artwork binding mismatch: '+a.id);}
}
