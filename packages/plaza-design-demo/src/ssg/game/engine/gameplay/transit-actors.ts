import {compileSceneActors} from './actors';
import {prepareActor} from './actor-frame';
import {actorPoseSource} from './native-actor-bindings';
import type {SceneDocument} from './scene-document';
import type {Resolved,Value} from '../../art/core/composition';
import type {View} from '../../art/core/view';
export const transitActors=(source:SceneDocument,rows:readonly Resolved[])=>compileSceneActors(source,rows as Resolved[]);
/**
 * The riders of a LINE 0 platform or car, prepared for one frame. A scene's actors are
 * `presentation.kind: "rider"` bodies; a bench owns only a paint slot, and the source actor's
 * attachment decides whether the bench's artwork draws it (`<pose>.embedded`).
 */
export function transitActorBindings(source:SceneDocument,rows:readonly Resolved[],view:View,actors=transitActors(source,rows)):Record<string,Value>{
 const bindings:Record<string,Value>={};
 for(const actor of source.actors??[]){const row=rows.find(r=>r.instance.id===actor.instance)!,body=actors[actor.id],key=actorPoseSource(source.id,actor.id),prepared=prepareActor(body,view),bench=row.instance.attach?rows.find(r=>r.instance.id===row.instance.attach!.instance):undefined,embedded=bench?.instance.type==='station.bench'&&bench.props.sourceRider===true&&bench.instance.bindings?.rider===key+'.embedded';
  const dx=row.placement.x-body.x,dh=row.placement.h-(body.h??0),pose=dx===0&&dh===0?prepared:{...prepared,character:{...prepared.character,x:row.placement.x,h:row.placement.h},...('frame'in prepared&&prepared.visible?{frame:{...prepared.frame,x:prepared.frame.x+dx},height:prepared.height+dh}:{})};
  bindings[key]=(embedded?{visible:false,character:{x:body.x}}:pose) as unknown as Value;bindings[key+'.embedded']=(embedded?pose:null) as unknown as Value;
 }
 return bindings;
}
