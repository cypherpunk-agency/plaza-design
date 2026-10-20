import type {Instance,Resolved} from '../../art/core/composition';
import type {ActorDefinition} from './actors';
export interface ActorBindingController {element:string;prefix:string;suffix:string;mutable:boolean;clipPrefix?:string;pass?:'backdrop'|'people'}
/** Registered renderer bindings; source records own actor identity, placement references and dialogue. */
const controllers:Record<string,ActorBindingController>={
 downtown:{element:'actor.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'people'},
 metro:{element:'actor.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 galleriaStation:{element:'actor.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 harborStation:{element:'actor.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 train:{element:'actor.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 capsule:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 yard:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 moth:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 market:{element:'character.prepared',prefix:'market.actor.',suffix:'',mutable:true},
 harborShift:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 beach:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 mall:{element:'character.prepared',prefix:'mall.actor.',suffix:'',mutable:true,pass:'backdrop'},
 harbor:{element:'character.prepared',prefix:'actor.',suffix:'.pose',clipPrefix:'clip.actor.',mutable:true,pass:'backdrop'},
 stacks:{element:'character.prepared',prefix:'terminal.actor.',suffix:'',clipPrefix:'terminal.clip.',mutable:true,pass:'backdrop'},
 shop:{element:'character.prepared',prefix:'shop.actor.',suffix:'',clipPrefix:'shop.clip.',mutable:true,pass:'backdrop'},
 library:{element:'library.person',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 laundromat:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 warehouse:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
 sandbox:{element:'character.prepared',prefix:'actor.',suffix:'.pose',mutable:true,pass:'backdrop'},
};
export const actorBindingController=(scene:string)=>controllers[scene];
export function actorPoseSource(scene:string,id:string){const c=controllers[scene];if(!c)throw new Error('Missing actor controller '+scene);return c.prefix+id+c.suffix;}
export function mutableActorArtwork(scene:string,node:Instance):boolean{const c=controllers[scene];return !!c?.mutable&&node.type===c.element&&typeof node.props.actor==='string'&&node.bindings?.pose===actorPoseSource(scene,node.props.actor);}
/** A bench consumes a source actor pose; it owns no actor/controller state itself. */
export function mutableActorConsumer(scene:string,node:Instance):boolean{const c=controllers[scene];return c?.element==='actor.prepared'&&node.type==='station.bench'&&Object.keys(node.bindings??{}).every(k=>k==='rider')&&(!node.bindings?.rider||/^actor\.[-a-zA-Z0-9_.]+\.pose\.embedded$/.test(node.bindings.rider));}
export function validateActorArtwork(scene:string,actors:readonly ActorDefinition[],rows:readonly Resolved[]):void{
 const c=controllers[scene];if(!c)return;
 if(c.element!=='actor.prepared'&&actors.some(a=>a.presentation))throw new Error('Scene actor presenter does not support rider recipes');
 const art=rows.filter(r=>r.instance.type===c.element);if(art.length!==actors.length)throw new Error('Actor source/artwork count mismatch');
 for(const a of actors){const row=art.find(r=>r.instance.id===a.instance);if(!row||row.props.actor!==a.id||row.instance.bindings?.pose!==actorPoseSource(scene,a.id)||c.pass&&row.instance.pass!==c.pass)throw new Error('Actor artwork binding mismatch: '+a.id);}
}
