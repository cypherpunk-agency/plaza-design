import type {Value} from '../../../art/core/composition';
import * as defaultMetro from '../../../world/transport/line';
import {platformFrame} from '../../../world/transport/platform-frame';
import {transitActorBindings} from '../transit-actors';
import {skylineValue} from '../mechanisms/city-skyline';
import {light} from '../../../world/light';
import type {BindingProvider} from './index';
/**
 * `station.*`: what a LINE 0 platform paints from the world, for the two station scenes (and later
 * Downtown's). The platform frame is the train at the stop, the departure board and whether the
 * platform is closed; the roof is the canopy underside; `pose.<actor>` is each source actor's
 * prepared rider (`pose.<actor>.embedded` for a rider seated in a bench's artwork). The platform
 * stop is the `stop` artwork role, the canopy the `roof` role; the world is the one the game bound
 * (ctx.world), the line and city modules until then.
 *
 * - `station.train`, `station.departure`, `station.closed`: the platform frame (world/transport/platform-frame.ts).
 * - `station.roof`: the canopy's underside height; `station.roofLocal` the same above the canopy's own base, `station.truss` the height of its truss (when the roof has one).
 * - `station.daylight`: how much daylight there is. `station.city`: the animated skyline of a scene with the `citySkyline` mechanism.
 * - `station.pose.<actor>` and `station.pose.<actor>.embedded`: prepared riders (engine/gameplay/transit-actors.ts).
 */
export const station:BindingProvider=ctx=>{
 const out:Record<string,Value>={},{roof,stop}=ctx.roles,metro=ctx.world?.metro??defaultMetro,city=ctx.world?.city;
 if(roof){out.roof=roof.placement.h+Number(roof.props.under);out.roofLocal=Number(roof.props.under);if(roof.props.truss!==undefined)out.truss=roof.placement.h+Number(roof.props.truss);}
 out.daylight=light().daylight;
 const sky=skylineValue(ctx.shared,ctx.view);if(sky!==undefined)out.city=sky;
 if(stop)for(const[key,value]of Object.entries(platformFrame(ctx.source.id,stop.placement.x,ctx.view,metro,city)))out[key.replace(/^transit\./,'')]=value;
 for(const[key,value]of Object.entries(transitActorBindings(ctx.source,ctx.rows,ctx.view,{metro,city},ctx.actors)))out[key.replace(/^station\./,'')]=value;
 return out;
};
