/** Browser proof: isolated workbench versus direct native SceneModel with observer absent. */
import {SANDBOX,type SceneData} from '../../src/ssg/game/data';
import {SceneModel,type Line} from '../../src/ssg/game/engine/model';
import {SANDBOX_RULES} from '../../src/ssg/game/scenes/sandbox/rules';
import {createBehaviorSandbox} from '../../src/ssg/game/authoring/behavior-sandbox';
import {behaviorNoun,cloneBehavior,validateSandboxBehavior} from '../../src/ssg/game/authoring/behavior-validation';
export {mountBehaviorWorkbench} from '../../src/ssg/game/authoring/behavior-authoring';
type Op={key:string;verb:string}|{advance:number}|{reset:true}|{save:true}|{restore:true};
export const behaviorCases:{id:string;ops:Op[];edited?:boolean}[]=[
 {id:'sensor-before-delivery',ops:[{key:'sensor.eye',verb:'wave'},{advance:149}]},
 {id:'sensor-at-delivery',ops:[{key:'sensor.eye',verb:'wave'},{advance:150}]},
 {id:'sensor-glow-expiry',ops:[{key:'sensor.eye',verb:'wave'},{advance:500}]},
 {id:'hatch-open-delivery',ops:[{key:'hatch.hatch',verb:'open'},{advance:150}]},
 {id:'hatch-repeat-suppression',ops:[{key:'hatch.hatch',verb:'open'},{key:'hatch.hatch',verb:'open'},{advance:150}]},
 {id:'memo-three-writes',ops:[{key:'memo.memo',verb:'write'},{key:'memo.memo',verb:'write'},{key:'memo.memo',verb:'write'}]},
 {id:'state-save-restore',ops:[{key:'memo.memo',verb:'write'},{save:true},{key:'memo.memo',verb:'write'},{restore:true}]},
 {id:'cancel-signal-reset',ops:[{key:'sensor.eye',verb:'wave'},{reset:true},{advance:500}]},
 {id:'cancel-signal-reentry',ops:[{key:'sensor.eye',verb:'wave'},{save:true},{restore:true},{advance:500}]},
 {id:'edited-first-match-fallback',edited:true,ops:[{key:'lamp.lamp',verb:'on'}]},
 {id:'edited-first-match-next',edited:true,ops:[{key:'lamp.lamp',verb:'on'},{key:'lamp.lamp',verb:'on'}]},
 ...Object.entries({'sensor.eye':['read'],'lamp.lamp':['off'],'memo.memo':['read'],'hatch.hatch':['shut'],'fan.fan':['spin','stop']}).flatMap(([key,verbs])=>verbs.map(verb=>({id:key+'-'+verb,ops:[{key,verb}]}))),
];
export function behaviorFixtureDocument(edited=false):SceneData{const data=cloneBehavior(SANDBOX);if(edited)behaviorNoun(data,'lamp.lamp').on!.on=[{if:'lampOn',do:[{set:'memo',to:2}],say:['ON','Already on','dim']},{do:[{set:'lampOn',to:true},{if:'lampOn',set:'memo',to:1}],say:['ON','Sequential action reads preceding write','ok']}];return validateSandboxBehavior(data);}
export function compareBehaviorCase(index:number){const test=behaviorCases[index];if(!test)throw new Error('Unknown behavior case');const data=behaviorFixtureDocument(test.edited),session=createBehaviorSandbox(data),lines:Line[]=[];let time=0,queue:{at:number;fn:()=>void}[]=[],save:ReturnType<SceneModel['snapshot']>|undefined;const model=new SceneModel({say:l=>lines.push(cloneBehavior(l)),open:()=>{},changed:()=>{}},cloneBehavior(data),SANDBOX_RULES);model.now=()=>time;model.wall=()=>time;model.later=(ms,fn)=>queue.push({at:time+ms,fn});model.reset();
 const frames:unknown[]=[];try{for(const op of test.ops){if('key'in op){session.trigger(op.key,op.verb);const i=op.key.indexOf('.');model.act(op.key.slice(0,i),op.key.slice(i+1),op.verb);}else if('advance'in op){session.advance(op.advance);const end=time+op.advance;for(;;){queue.sort((a,b)=>a.at-b.at);const next=queue[0];if(!next||next.at>end)break;queue.shift();time=next.at;next.fn();}time=end;}else if('save'in op){save=cloneBehavior(model.snapshot());session.snapshot();}else if('reset'in op){session.reset();queue=[];time=0;lines.length=0;model.reset();}else{if(!save)throw new Error('No captured save');session.restore(save);queue=[];time=0;lines.length=0;model.restore(cloneBehavior(save));}const actual={save:session.snapshot(),scratch:session.model.scratch,live:[...session.model.live].map(l=>({from:l.from,to:l.to,verb:l.verb})),lines:session.lines,time:session.time,pending:session.pending},expected={save:model.snapshot(),scratch:model.scratch,live:[...model.live].map(l=>({from:l.from,to:l.to,verb:l.verb})),lines,time,pending:queue.length};frames.push(cloneBehavior({op,equal:JSON.stringify(actual)===JSON.stringify(expected),actual,expected}));}return{id:test.id,equal:frames.every(f=>(f as{equal:boolean}).equal),frames,trace:cloneBehavior(session.trace)};}finally{session.dispose();model.reset();queue=[];}}
export function runBehaviorParity(){const results=behaviorCases.map((_c,i)=>compareBehaviorCase(i));return{count:results.length,failed:results.filter(r=>!r.equal),results};}

/** Native restore is intentionally unchanged; only the isolated laboratory refuses this merged loop. */
export function runBehaviorRestoreSafety(){
 const old=behaviorFixtureDocument();old.cables!.find(c=>c.id==='sbx.motion')!.to='hatch.hatch';old.cables!.find(c=>c.id==='sbx.motion')!.verb='open';behaviorNoun(old,'hatch.hatch').on!.open={do:[{set:'hatchOpen',to:true},{emit:'opened'}]};validateSandboxBehavior(old);
 const oldSession=createBehaviorSandbox(old),save=oldSession.snapshot(),current=cloneBehavior(old);current.cables!.find(c=>c.id==='sbx.motion')!.to='lamp.lamp';current.cables!.find(c=>c.id==='sbx.motion')!.verb='on';current.cables!.find(c=>c.id==='sbx.hatch.fan')!.to='sensor.eye';current.cables!.find(c=>c.id==='sbx.hatch.fan')!.verb='wave';validateSandboxBehavior(current);
 const session=createBehaviorSandbox(current),native=new SceneModel({say:()=>{},open:()=>{},changed:()=>{}},cloneBehavior(current),SANDBOX_RULES);let error='';try{native.restore(cloneBehavior(save));const nativeMergedLinks=cloneBehavior(native.links);session.trigger('sensor.eye','wave');try{session.restore(save);}catch(e){error=String(e);}const canceled=session.pending===0&&session.time===0&&session.model.state.hatchOpen===false;session.advance(1000);session.trigger('sensor.eye','wave');session.advance(150);const recovered=session.model.state.lampOn===true&&session.model.state.hatchOpen===false;return{id:'unsafe-restored-topology-recovery',equal:/Unsafe.*restored Sandbox preview.*cycle/.test(error)&&canceled&&recovered,error,canceled,recovered,nativeMergedLinks,safePreviewLinks:cloneBehavior(session.model.links)};}finally{oldSession.dispose();session.dispose();native.reset();}
}
