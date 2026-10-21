import type {Value} from '../../art/core/composition';
import {mothVisualSnapshot,beachVisualSnapshot} from '../controllers/visual';
import {laundryController,laundryVisualSnapshot,washerRoles} from '../controllers/laundromat';
import {sandboxPicture} from '../controllers/sandbox-picture';
import {capsuleState,routerUp} from './mechanisms/thermal';
import type {SceneModel} from '../model';
import type {ValueEnv} from './scene-values';
/**
 * The pictures a scene's controller prepares (devices.json `controller.kind`): the registered, pure
 * calculations that read the running model and say what the artwork shows (a record playing, a washer's
 * progress, the router's heat). A scene picks the fields it wants with `{picture: <field>}` in
 * scene.json `stage.values`; this table is the one place that knows which controller offers which field.
 * Nothing here advances the model; there is no picture without an engine frame.
 */
const capsulePicture=(m:SceneModel):Record<string,Value>=>({plugOn:!!capsuleState(m,'plugOn'),up:routerUp(m),sun:!!capsuleState(m,'sun'),open:!!capsuleState(m,'doorOpen'),hot:!!m.value('hot'),temp:Number(m.value('temp')??22),steam:m.now()<(m.scratch.steamUntil??0),pixelAt:String(capsuleState(m,'pixelAt')??'')});
function laundryPicture(m:SceneModel,env:ValueEnv):Record<string,Value>{
 if(!env.gameplay)return{};
 const rows=env.rows??[],view=env.view!,c=laundryController(m.data),get=(id:string)=>{const row=rows.find(r=>r.instance.id===id);if(!row)throw new Error('Laundromat artwork reference '+id);return row;};
 const win=c?get(c.geometry.window):undefined;
 return {...laundryVisualSnapshot(m,env.gameplay!),
  breakerX:c?get(c.geometry.breaker).placement.x:0,
  clip:win?[view.sx(win.placement.x),view.y(win.placement.h+Number(win.props.height)),Number(win.props.width),Number(win.props.height)]:null,
  washerXs:[1,2,3,4].map(i=>c?get(c.geometry[('w'+i) as 'w1']).placement.x:0)} as Record<string,Value>;
}
const PICTURES:Readonly<Record<string,{fields:readonly string[];make:(m:SceneModel,env:ValueEnv)=>Record<string,Value>}>>={
 moth:{fields:['playing','nextMs','fed','wet','fresh'],make:m=>mothVisualSnapshot(m)},
 beach:{fields:['rented','billingPaused','billed','freeDrink','danger','lamps'],make:m=>beachVisualSnapshot(m)},
 capsule:{fields:['plugOn','up','sun','open','hot','temp','steam','pixelAt'],make:capsulePicture},
 laundromat:{fields:['tripped','clear','nextRunning','nextMs','door3',...washerRoles,...washerRoles.map(r=>'p'+r.slice(1)),'breakerX','clip','washerXs'],make:laundryPicture},
 sandbox:{fields:['visual','windowClip'],make:(m,env)=>sandboxPicture(m,env.engine!.hover,env.view!,env.rows??[],env.source!.id)},
};
/** The fields a controller kind prepares (none for a kind without a picture). */
export const pictureFields=(kind:string|undefined):readonly string[]=>kind&&Object.prototype.hasOwnProperty.call(PICTURES,kind)?PICTURES[kind].fields:[];
/** Every field any controller prepares, for a check before the scene's controller is known. */
export const allPictureFields=[...new Set(Object.values(PICTURES).flatMap(p=>p.fields))];
/** This frame's picture of the scene's controller, prepared once per frame; undefined without an engine frame or a controller that has one. */
export function controllerPicture(env:ValueEnv):Record<string,Value>|undefined{
 const engine=env.engine;if(!engine)return undefined;
 const memo=env.memo??(env.memo=new Map<string,unknown>());
 if(!memo.has('picture')){const kind=engine.m.data.controller?.kind;memo.set('picture',kind&&Object.prototype.hasOwnProperty.call(PICTURES,kind)?PICTURES[kind].make(engine.m,env):undefined);}
 return memo.get('picture') as Record<string,Value>|undefined;
}
