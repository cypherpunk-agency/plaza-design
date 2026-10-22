/** Finite technical workloads authorized by ENGINE-CONSOLIDATION-GOAL.md, Batch C. */
export const workloads=[
 {id:'downtown-quiet',scene:'downtown',lane:'live-game',weather:'clear',minute:720,warmupMs:5000,measureMs:30000,operations:0,description:'Fixed camera, full native Downtown population, clear noon.'},
 {id:'market-weather',scene:'market',lane:'live-game',weather:'rain',minute:1200,warmupMs:5000,measureMs:30000,operations:0,description:'Fixed camera, full native Market actors, rainy evening.'},
 {id:'demo-fanout',scene:'sandbox',lane:'native-model',weather:'clear',minute:720,warmupMs:5000,measureMs:30000,operations:30,description:'Actual demo SceneModel button fan-out: original fixed counter cable plus authored lamp.on and fan.spin; one action per second, real timers/ticks, no Canvas claim.'},
 {id:'board-cycles',scene:'library',lane:'live-game',weather:'clear',minute:720,warmupMs:5000,measureMs:12000,operations:12,description:'Twelve B-open/Esc-close pairs, three known library devices; 500ms between edges.'},
 {id:'scene-visits',scene:'library',lane:'live-game',weather:'clear',minute:720,warmupMs:5000,measureMs:12000,operations:12,description:'Twelve review jumps: catalog, shop counter, laundry, market cook; one second apart. Current inactive-host policy preserved.'},
 {id:'title-glide',scene:'downtown',lane:'live-game',weather:'clear',minute:720,warmupMs:2000,measureMs:68000,operations:1,description:'NEW GAME from the settled title: the whole glide, beach to Harbor Station, in real time; each game.render span is owned by its glide beat (glide:BEACH … glide:ARRIVED).'},
 {id:'private-play',scene:'library',lane:'private-frame-lifecycle',weather:'clear',minute:720,warmupMs:0,measureMs:0,operations:5,description:'Five fresh private Game realms: start/two RAF/checkpoint/stop/destroy; private saves cannot cross realms.'},
] as const;
export type Workload=typeof workloads[number];
export type WorkloadId=Workload['id'];
export const workload=(id:string)=>{const w=workloads.find(w=>w.id===id);if(!w)throw new Error('Unknown finite workload');return w;};
export const repetitions=3,capacity=131072,viewport=[960,540] as const;
