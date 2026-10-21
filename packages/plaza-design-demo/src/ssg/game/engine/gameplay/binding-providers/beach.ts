import type {Value} from '../../../art/core/composition';
import {onScreen} from '../../../art/core/primitives';
import {prepareCharacter,type PreparedCharacter} from '../../../runtime/characters';
import {light} from '../../../world/light';
import {beachVisualSnapshot} from '../../controllers/visual';
import {presentationActor,presentationActors} from '../scene-presentation';
import type {BindingContext} from '../binding-sources';
import {provide,keysOf} from '../binding-keys';
/**
 * The beach: what its model decides (the sunbed rented and billed, the free drink, the danger flag,
 * the pier's lamps: the visual controller of its devices document), where its artwork stands on screen
 * (which parts are in view, the bar's width, the drink, the shore, the pier lamps), the palette from the
 * city's light, and its people (`beach.actor.<id>`): the bartender's body is hidden while the bar draws
 * its own LIME, and the guests who come ashore appear only when the beach is dangerous. The gull
 * arrives as the `gullShooed` signal.
 */
export const beachSignals={gullShooed:-1e9} as const;
const provider=(ctx:BindingContext):Record<string,Value>=>{
 const {rows,roles,source,actors,engine}=ctx,cam=-ctx.view.sx(0),view={...ctx.view,sx:(wx:number,par=1)=>Math.round(wx-cam*par),cam,gy:ctx.view.y(0),flags:{}};
 const x=(role:string)=>roles[role]?.placement.x??0,bar=roles.bar,pier=roles.pier,walk=roles.boardwalk;
 const visual=engine?.m?beachVisualSnapshot(engine.m):undefined,danger=!!visual?.danger;
 const bartender=presentationActor(source.presentation,'bartender'),ashore=new Set(presentationActors(source.presentation,'ashore')),lime=bartender?actors[bartender]:undefined;
 const out:Record<string,Value>={limeVisible:!!lime&&lime.look===undefined,limeX:lime?.x??0,limeH:(lime?.h??4)-4,palette:Math.min(1,light().night*.9+(1-light().daylight)*.1),horizon:roles.horizon?.placement.h??0,waterline:roles.waterline?.placement.h??0,...(visual??{}),
  gullShooed:ctx.signals?ctx.signals.read('gullShooed'):beachSignals.gullShooed,hover:engine?.hover??'',
  barVisible:!!bar&&!(view.sx(bar.placement.x+Number(bar.props.width)*bar.placement.scale)<-60||view.sx(bar.placement.x)>view.viewW+60),barWidth:bar?Number(bar.props.width)*bar.placement.scale:0,
  towerVisible:!!roles.tower&&onScreen(view,view.sx(x('tower'))-70,140),
  pierVisible:!!pier&&!(view.sx(pier.placement.x+Number(pier.props.width)*pier.placement.scale)<0||view.sx(pier.placement.x)>view.viewW),
  boardwalkVisible:!!walk&&!(view.sx(walk.placement.x+Number(walk.props.width)*walk.placement.scale)<-4||view.sx(walk.placement.x)>view.viewW+4),
  drinkX:x('drink'),drinkH:roles.drink?.placement.h??0,shore:x('shore'),lampPositions:rows.filter(r=>r.instance.type==='beach.pier-lamp').map(r=>r.placement.x)};
 for(const row of rows.filter(r=>r.instance.type==='character.prepared')){
  const id=String(row.props.actor),actor=actors[id];if(!actor)throw new Error('Missing Beach actor '+id);
  let pose:PreparedCharacter=(id===bartender&&actor.look===undefined||ashore.has(id)&&!danger)?{visible:false,character:{x:actor.x}} as PreparedCharacter:prepareCharacter(actor,view.t);
  if(pose.visible){const dx=row.placement.x-actor.x,dh=row.placement.h-(actor.h??0);pose={...pose,character:{...pose.character,x:row.placement.x,h:row.placement.h},frame:{...pose.frame,x:pose.frame.x+dx},height:pose.height+dh};}
  out['actor.'+id]=pose as unknown as Value;
 }
 return out;
};

export const beachProvider=provide(['limeVisible','limeX','limeH','palette','horizon','waterline',...keysOf<ReturnType<typeof beachVisualSnapshot>>()(['rented','billingPaused','billed','freeDrink','danger','lamps']),'gullShooed','hover','barVisible','barWidth','towerVisible','pierVisible','boardwalkVisible','drinkX','drinkH','shore','lampPositions','actor.<actor>'],provider,beachSignals);
