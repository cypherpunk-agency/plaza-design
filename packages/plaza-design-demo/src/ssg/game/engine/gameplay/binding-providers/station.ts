import type {Value} from '../../../art/core/composition';
import * as defaultMetro from '../../../world/transport/line';
import {platformFrame} from '../../../world/transport/platform-frame';
import {transitActorBindings} from '../transit-actors';

import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
/**
 * `station.*`: departure information and platform artwork inputs for LINE 0 stations.
 * The platform frame contains the departure board and whether the platform is closed; the roof is the canopy underside; `pose.<actor>` is each source actor's
 * prepared rider (`pose.<actor>.embedded` for a rider seated in a bench's artwork). The platform
 * canopy uses the `roof` role; the world is the one the game bound
 * (ctx.world), the line and city modules until then.
 *
 * - `station.departure`, `station.closed`: the platform frame (world/transport/platform-frame.ts).
 * - `station.roof`: the canopy's underside height; `station.roofLocal` the same above the canopy's own base, `station.truss` the height of its truss (when the roof has one).
 * - `station.daylight`: how much daylight there is.
 * - `station.pose.<actor>` and `station.pose.<actor>.embedded`: prepared riders (engine/gameplay/transit-actors.ts).
 */
const stationValues=(ctx:BindingContext):Record<string,Value>=>{
 const out:Record<string,Value>={},{roof}=ctx.roles,metro=ctx.world?.metro??defaultMetro,city=ctx.world?.city;
 if(roof){out.roof=roof.placement.h+Number(roof.props.under);out.roofLocal=Number(roof.props.under);if(roof.props.truss!==undefined)out.truss=roof.placement.h+Number(roof.props.truss);}
 out.daylight=ctx.view.lighting.daylight;

 for(const[key,value]of Object.entries(platformFrame(ctx.source.id,ctx.view,metro,city)))out[key.replace(/^transit\./,'')]=value;
 for(const[key,value]of Object.entries(transitActorBindings(ctx.source,ctx.rows,ctx.view,ctx.actors)))out[key.replace(/^station\./,'')]=value;
 return out;
};
export const station=Object.assign(provide(['roof','roofLocal','truss','daylight','departure','closed','pose.<actor>','pose.<actor>.embedded'],stationValues),{world:true});
