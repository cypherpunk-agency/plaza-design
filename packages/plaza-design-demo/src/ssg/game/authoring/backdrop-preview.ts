/** Backdrop documents use the same composer, placements, bounds and world frame as scene artwork. */
import {BACKDROP_SOURCES,backdropDocumentId,validateBackdrop} from '../world/backdrops';
import type {NativeSceneAdapter} from './native-preview';
import type {InspectorSection} from './contracts';
import {TypedForm} from './typed-form';
import type {BackdropDocument} from '../world/backdrops';
export function backdropInspector(id:string):InspectorSection{return{id:'sky',label:'Sky',mount(host,context){const form=new TypedForm(error=>{throw error;});
  const render=()=>{host.replaceChildren();const doc=context.authoring?.get(id).value as BackdropDocument;if(!doc)return;
    const edit=(change:(value:BackdropDocument)=>void)=>{const next=structuredClone(context.authoring!.get(id).value) as BackdropDocument;change(next);context.authoring!.edit(id,'Edit world backdrop sky',next);render();};
    form.decimal(host,'Backdrop world width',doc.width??4800,width=>edit(d=>{d.width=width;}),1,1e7);
    const note=document.createElement('p');note.textContent='Select Sky in the outline or preview to edit its appearance and animation.';host.append(note);
  };render();return Object.assign(()=>{}, {refresh:render});}};}
export const backdropAdapters:Record<string,NativeSceneAdapter>=Object.fromEntries(Object.keys(BACKDROP_SOURCES).map(id=>[backdropDocumentId(id),{
  validate:(value:unknown)=>validateBackdrop(value,id),
  environment:(_document,view)=>({view,state:{},reduced:view.reduced??false}),
  definition:composition=>({id:composition.scene,name:'World backdrop · '+id,width:(composition as BackdropDocument).width??4800,spawn:0,exits:[],intro:[],ambient:{sky:true},backdrop:{id,x:0,h:0},
    drawBackdrop(){},
  }),
} satisfies NativeSceneAdapter]));
