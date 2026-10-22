import type {Value} from '../../../art/core/composition';
import type {TerminalVisual} from '../../../art/assemblies/terminal-state';
import type {TerminalLayout} from '../../../art/assemblies/container-terminal';
import {prepareCharacter,type PreparedCharacter} from '../../../runtime/characters';
import {light} from '../../../world/light';
import {stacksController} from '../../controllers/motion';
import {manifestGeometry} from '../manifest-geometry';
import {presentationActor} from '../scene-presentation';
import {actorAppearanceSeed,bindActorAppearanceSeed} from '../actor-identity';
import {gantryGeometry,KIND,stacksState,trolley} from '../mechanisms/gantry-lift';
import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
/**
 * `terminal.*`: the container terminal's picture of the gantry-lift mechanism (scene-mechanics/gantry-lift.ts).
 * `terminal.snapshot` is the terminal artwork's whole frame (crane, ferry, gate, blocks); `terminal.actor.<id>`
 * and `terminal.clip.<id>` pose the terminal's character artwork, with the crane operator riding the trolley
 * and the rescued passenger standing on the deck only once the box is there. Everything is measured from
 * the scene's artwork roles: block0..block2, ladder, quay, kiosk, bridge, horizon and the gantry roles.
 */
const REQUIRED=['block0','block1','block2','ladder','quay','kiosk','bridge','rest','slot','chassis','gate','hatch','deck'];
function layoutOf(roles:BindingContext['roles']):TerminalLayout{
 for(const role of REQUIRED)if(!roles[role])throw Error('Terminal requires artwork role '+role);
 const p=(id:string)=>roles[id].placement;
 return{blocks:[0,1,2].map(i=>({x:p('block'+i).x})),ladder:p('ladder').x,quay:p('quay').x,kiosk:p('kiosk').x,bridge:{x0:p('bridge').x},boom:206};
}
const terminalValues=(ctx:BindingContext):Record<string,Value>=>{
 const{view,rows,roles,actors,source,engine,gameplay}=ctx;
 // the foreground pass paints without an engine: the artwork's own defaults
 if(!engine)return{};
 const layout=layoutOf(roles),geometry=gantryGeometry(roles),m=engine.m,tr=trolley(m),width=manifestGeometry(source,rows,[],{groundSpawn:false}).width,horizon=Number(roles.horizon?.props.horizon??0);
 const loadVisible=view.sx(tr.x)+90>-4&&view.sx(tr.x)-90<view.viewW+4,deckReefer=stacksState(m,'boxAt')==='ferry'&&!stacksState(m,'departed')&&tr.carry!==2;
 // what the picture reads of the crane: the trolley's mover (when its trip set off, which path), and the stamps of the scanner's flashes
 const scratch:TerminalVisual['scratch']={},mover=stacksController(m.data).mover,run=m.movers.lastRun(mover),trip=m.movers.trip(mover);
 if(trip&&m.movers.moving(mover)){if(run==='return')scratch.retT0=trip.t0;else scratch.liftT0=trip.t0;}
 if(run==='regular'||run==='reefer')scratch.liftKind=run==='reefer'?KIND.box:KIND.regular;
 const pulse=(event:string)=>{const target=gameplay?.native?.presentation?.[event]?.target;return target===undefined?undefined:m.scratch['pulse.'+target];},stamp=(key:'cold'|'warm'|'alarm',event:string)=>{const at=pulse(event);if(at!==undefined)scratch[key]=at;};
 stamp('cold','stacks.crane.cold');stamp('warm','stacks.crane.warm');stamp('alarm','stacks.alarm.pulse');
 const snapshot:TerminalVisual={width,horizon,layer:engine.layer,hover:engine.hover??'',now:m.now(),departed:!!stacksState(m,'departed'),boxAt:String(stacksState(m,'boxAt')),loaded:Number(stacksState(m,'loaded')??0),scratch,portFrozen:m.frozen(stacksController(m.data).scannerDevice),watchdogs:m.watchdogs().map(d=>({at:d.at??null,from:d.from,to:d.to,progress:d.progress})),trolley:tr,geometry,layout,light:structuredClone(light()),deckReefer,loadVisible,ferryVisible:view.sx(layout.quay)+(view.sx(width)-view.sx(layout.quay))>-4&&view.sx(layout.quay)<view.viewW+4};
 const out:Record<string,Value>={snapshot:snapshot as unknown as Value},operator=presentationActor(source.presentation,'craneOperator'),passenger=presentationActor(source.presentation,'rescuedPassenger');
 for(const r of rows.filter(r=>r.instance.type==='character.prepared')){
  const id=String(r.props.actor),actor=actors[id];if(!actor)throw new Error('Unknown terminal actor '+id);
  const dx=r.placement.x-actor.x,p={...actor,x:r.placement.x,h:r.placement.h,...(Array.isArray(actor.range)?{range:[actor.range[0]+dx,actor.range[1]+dx] as [number,number]}:{})};
  if(id===operator)p.x=tr.x-35+r.placement.x;
  const bakeSeed=actorAppearanceSeed(actor);if(bakeSeed!==undefined)bindActorAppearanceSeed(p,bakeSeed);
  let pose:PreparedCharacter=prepareCharacter(p,view.t);
  if(engine.layer==='devices'||id===passenger&&!deckReefer||id===operator&&!loadVisible)pose={visible:false,character:pose.character};
  out['actor.'+id]=pose as unknown as Value;
  out['clip.'+id]=id===operator?[view.sx(tr.x+r.placement.x)-45,view.y(r.placement.h+30)+4,20,22]:null;
 }
 return out;
};
export const terminal=provide(['snapshot','actor.<actor>','clip.<actor>'],terminalValues);
