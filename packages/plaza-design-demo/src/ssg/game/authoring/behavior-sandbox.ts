/** Deterministic isolated harness around the production SceneModel evaluator. */
import { SceneModel, type SceneTrace, type Line } from '../engine/model';
import type { SceneData, SceneSave } from '../data';
import { SANDBOX_RULES } from '../scenes/sandbox/rules';
import { assertBehaviorSignalGraph, behaviorHandlers, cloneBehavior, validateSandboxBehavior } from './behavior-validation';
export function createBehaviorSandbox(source:SceneData, observe?:(event:Readonly<SceneTrace>)=>void){
 const data=validateSandboxBehavior(source);let time=0,serial=0,disposed=false;let queue:{at:number;serial:number;fn:()=>void}[]=[];
 const trace:SceneTrace[]=[],lines:Line[]=[];
 const model=new SceneModel({say:line=>lines.push(cloneBehavior(line)),open:()=>{},changed:()=>{},observe:event=>{trace.push(cloneBehavior(event));observe?.(event);}},data,SANDBOX_RULES);
 model.now=()=>time;model.wall=()=>time;
 model.later=(ms,fn)=>{if(disposed)return;if(queue.length>=256)throw new Error('Sandbox callback limit');queue.push({at:time+ms,serial:serial++,fn});};
 // Reinitialize native clocks/watchdog deadlines after installing the isolated time source.
 model.reset();
 const live=()=>{if(disposed)throw new Error('Sandbox session disposed');};
 const clear=()=>{queue=[];trace.length=0;lines.length=0;time=0;serial=0;};
 return {model,trace,lines,get time(){return time;},get pending(){return queue.length;},
 trigger(key:string,verb:string){live();if(!behaviorHandlers[key]?.includes(verb))throw new Error('Unsupported Sandbox trigger');const i=key.indexOf('.');model.act(key.slice(0,i),key.slice(i+1),verb);},
 advance(ms:number){live();if(!Number.isFinite(ms)||ms<0||ms>10000)throw new Error('Advance must be 0..10000ms');const end=time+ms;let count=0;for(;;){queue.sort((a,b)=>a.at-b.at||a.serial-b.serial);const next=queue[0];if(!next||next.at>end)break;if(++count>256)throw new Error('Sandbox callback budget');queue.shift();time=next.at;next.fn();}time=end;},
 snapshot(){live();return cloneBehavior(model.snapshot());},
 restore(save:SceneSave){live();clear();try{model.restore(cloneBehavior(save));assertBehaviorSignalGraph(data,model.links);}catch(error){clear();model.reset();throw new Error('Unsafe or invalid restored Sandbox preview; laboratory reset to source defaults. '+(error instanceof Error?error.message:String(error)));}},
 reset(){live();clear();model.reset();},
 dispose(){if(disposed)return;clear();model.reset();disposed=true;},
 };
}
export type BehaviorSandbox=ReturnType<typeof createBehaviorSandbox>;
