import {provide} from '../binding-keys';
import {validateVehicle,vehicleDoors} from '../../../world/vehicles';
/** Door artwork reads the same Circuit mover as physical boarding. No simulation in painting. */
export const vehicleProvider=provide(['<instance:vehicle.frame>.open','<instance:vehicle.frame>.gangway'],ctx=>Object.fromEntries(ctx.rows.filter(r=>r.element.type==='vehicle.frame').flatMap(r=>{
 const source=validateVehicle(r.props.vehicle);
 return[[r.instance.id+'.open',ctx.view.sequence?.state?.[r.instance.id]?.open??(ctx.engine?vehicleDoors(source,ctx.engine.m):0)],[r.instance.id+'.gangway',source.gangways===false?0:1]];
})));
