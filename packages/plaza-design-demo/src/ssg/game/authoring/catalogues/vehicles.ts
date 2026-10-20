/**
 * Current typed asset families and supported viewer controls. The vehicle-kit extension (2026-10-20:
 * ground trailer, fleet liveries, the water class, the stand-scale taxi through the air class) added rows explicitly.
 */
export type VehicleControl='facing'|'speed'|'route'|'cargo'|'passengers'|'doors'|'lights'|'paint'|'pose'|'seed'|'livery';
export interface VehicleFamily{id:string;label:string;group:string;source:string;renderer:string;controls:VehicleControl[];route:'placement'|'native';width:number;height:number;camera:number;note?:string}
const row=(id:string,label:string,group:string,source:string,renderer:string,controls:VehicleControl[],width=500,camera=0,note?:string):VehicleFamily=>({id,label,group,source,renderer,controls,route:controls.includes('route')?'placement':'native',width,height:id==='ground.straddle'?440:id==='ground.stacker'?380:260,camera,note});
const ground=['facing','speed','route','lights','paint','livery'] as VehicleControl[];
const air=['facing','speed','route'] as VehicleControl[];
export const VEHICLE_FAMILIES:readonly VehicleFamily[]=[
 ...['sedan','hatch','van','cab','bus'].map(id=>row('ground.'+id,id==='cab'?'Road cab':id,'Ground','art/vehicles/vehicles.ts','drawCar',ground,id==='bus'?400:230)),
 ...['truck','yard'].map(id=>row('ground.'+id,id==='yard'?'Yard tractor':'Road truck','Ground','art/vehicles/vehicles.ts','drawTruck',[...ground,'cargo'],600)),
 row('ground.trailer','Trailer chassis (no tractor)','Ground','art/vehicles/vehicles.ts','drawTruck',['facing','cargo','lights'],450,0,'tractor: false; the harbor and terminal customs chassis at port scale. No paint: only the tractor cab is painted.'),
 row('ground.straddle','Straddle carrier','Ground','art/vehicles/vehicles.ts','drawStraddle',['facing','speed','route','cargo','pose','livery'],500),
 row('ground.stacker','Reach stacker','Ground','art/vehicles/vehicles.ts','drawReachStacker',['facing','speed','route','cargo','pose'],800),
 row('ground.forklift','Forklift','Ground','art/vehicles/vehicles.ts','drawForklift',['facing','speed','route','cargo','pose'],230),
 ...['pod','taxi','patrol','shuttle','hauler','medevac','dropship','escort'].map(id=>row('air.'+id,id,'Flying','art/vehicles/air-traffic.ts','drawCraft',[...air,'livery',...(id==='hauler'?['cargo' as const]:[]),...(id==='patrol'?['lights' as const]:[]),...(id==='pod'||id==='taxi'||id==='shuttle'?['paint' as const]:[])],id==='dropship'?850:650)),
 row('air.drone','Delivery drone','Flying','art/vehicles/air-traffic.ts','drawDrone',['speed','route','cargo'],100,0,'Native body is symmetric and has no facing input; directional hull variant unavailable.'),
 row('air.blimp','Advertising blimp','Flying','art/vehicles/air-traffic.ts','drawBlimp',['speed','route'],100),
 row('train.platform','Platform train (three small cars)','Rail','art/vehicles/rail.ts','drawPlatformTrain',['doors','passengers','seed'],1000,0,'Explicit stationary/moving snapshot; passenger toggle selects a second seed, not an empty train. Timetable and boarding are not advanced.'),
 row('train.metro','Full-scale cinematic car','Rail','art/vehicles/train-car.ts','drawMetroCar',['speed','route','passengers','seed'],650,0,'Passengers are seeded by the existing renderer; no empty override exists.'),
 row('train.interior','Car 3 interior','Rail','scenes/train/composition.ts','drawTrainComposition',['passengers','doors'],1400,0,'Uses explicit ride and rider snapshot; native transport is untouched.'),
 row('cab.legacy','Sky taxi at stand scale','Flying','art/vehicles/air-traffic.ts','drawCab',['speed','route'],100,0,'The air class taxi (drawCraft taxi, hovering) at the pads\' and taxi flight\'s small scale.'),
 ...['lamp','cabin','patrol','ferry'].map(id=>row('water.'+id,{lamp:'Lamp boat',cabin:'Cabin boat',patrol:'Registry marine patrol',ferry:'Night ferry'}[id]!,'Water','art/vehicles/boats.ts','drawBoat',['facing','speed','route','lights','paint'],id==='lamp'?160:id==='ferry'?420:320,0,'Placeable as vehicle.boat. Lights: lamp on, patrol searchlight; driving adds the wake.')),
 ...['spinner','freighter','drone'].map(id=>row('fleet.'+id,'Sky sprite '+id,'Sprite fleet','art/environment/sky-ships.ts','drawSkyShips',['facing','speed'],400,0,'Far atmosphere layer drawn through the air class (spinner: pod, freighter: hauler); the kit\'s looping lane.')),
 row('harbor.lamp','Harbor lamp boat','Water / embedded','art/assemblies/harbor-pier.ts','drawLampBoat',[],280,(1650-140)/.3,'Native bob and lamp cycle; camera only.'),
 row('harbor.patrol','Registry marine patrol','Water / embedded','art/assemblies/harbor-pier.ts','drawPatrol',[],650,(-500-325)/.5,'Native one-way route, wake and searchlight; absent between patrols.'),
 row('harbor.ferry','Night ferry 7','Water / embedded','art/assemblies/harbor-pier.ts','drawFerry',[],650,(-400-325)/.45,'Native route and reflections; no passenger/cargo variants.'),
 row('harbor.forklift','Harbor forklift assembly','Ground / embedded','art/assemblies/harbor-pier.ts','forkliftBody + forkliftRoof',[],350,0,'Ordered body/roof artwork receives an explicit frozen pose; native shuttle controller is not advanced.'),
 row('harbor.chassis','Customs container chassis','Ground / embedded','art/assemblies/harbor-pier.ts','archChassis',[],350,0,'Fixed inspection chassis; no independent driving state.'),
 row('opening.ship','Opening feeder ship','Water / embedded','art/sequences/opening/coast.ts','openingFrame coast.ship-*',[],1000,1780,'Exact ordered ship children, including container stacks.'),
 row('opening.boats','Distant bay boats','Water / embedded','art/sequences/opening/glide.ts','openingFrame boats',[],1000,0,'Seven fixed mast/stack silhouettes; native visibility exclusions preserved.'),
 row('canal.boat','Canal boat and occupant','Water / embedded','art/architecture/cutaway.ts','drawCanalGlimpse',['passengers'],900,0,'Full boat/occupant/lantern shown in deliberately cropped vault/water context. Occupant is an explicit prepared pose.')
];
export const VEHICLE_OPERATIONS=['select','play','pause','step-forward','step-back','seek','loop','reduced-motion','zoom','pan','reset-camera'] as const;
export const VEHICLE_EXCLUSIONS=['No save/source editing or transport topology changes.','No live transport, quests, physics or schedules are advanced.','Linear preview placement is an inspection route, not a new game route.','Native embedded routes cannot reverse or change speed unless the actual renderer exposes it.','No invented passengers, doors, cargo, power or paint controls for unsupported families.','No arbitrary route editing, collisions, vehicle boarding or driving gameplay.','No automatic claim that every Cartesian combination is covered.'] as const;
/** Bounded rows used by focused command/pixel acceptance, independently of UI selection. */
export const VEHICLE_MATRIX=VEHICLE_FAMILIES.flatMap(f=>[
 {id:f.id,case:'default',time:0}, {id:f.id,case:'animated',time:2.283333333333333},
 {id:f.id,case:'reduced',time:2.283333333333333},
 ...f.controls.map(control=>({id:f.id,case:control,time:control==='speed'||control==='route'?1:8.5})),
 ...(f.controls.includes('route')?[{id:f.id,case:'route-culling',time:8.5}]:[])
]);
