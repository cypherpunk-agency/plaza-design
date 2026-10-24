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
    form.check(host,'Draw world sky',!!doc.sky,on=>edit(d=>{if(on)d.sky={horizon:189,style:'city'};else delete d.sky;}));
    if(doc.sky){form.decimal(host,'World sky horizon',doc.sky.horizon,horizon=>edit(d=>{d.sky!.horizon=horizon;}),-10000,10000);form.select(host,'World sky style',['city','sunset'],doc.sky.style,style=>edit(d=>{d.sky!.style=style as 'city'|'sunset';}));
      doc.sky.regions?.forEach((r,i)=>{const box=form.section(host,'Atmosphere region '+(i+1));for(const key of ['from','to','enter','leave','town'] as const)form.decimal(box,'Region '+(i+1)+' '+key,r[key],value=>edit(d=>{d.sky!.regions![i][key]=value;}),key==='enter'||key==='leave'||key==='town'?0:-1e6,key==='town'?1:1e6);form.button(box,'Remove region '+(i+1),()=>edit(d=>{d.sky!.regions!.splice(i,1);}));});
      form.button(host,'Add atmosphere region',()=>edit(d=>{(d.sky!.regions??=[]).push({from:0,to:1000,enter:100,leave:100,town:1});}),(doc.sky.regions?.length??0)>=16);
    }
  };render();return Object.assign(()=>{}, {refresh:render});}};}
export const backdropAdapters:Record<string,NativeSceneAdapter>=Object.fromEntries(Object.keys(BACKDROP_SOURCES).map(id=>[backdropDocumentId(id),{
  validate:(value:unknown)=>validateBackdrop(value,id),
  environment:(_document,view)=>({view,state:{},reduced:view.reduced??false}),
  definition:composition=>({id:composition.scene,name:'World backdrop · '+id,width:(composition as BackdropDocument).width??4800,spawn:0,exits:[],intro:[],ambient:{sky:true},backdrop:{id,x:0,h:0},
    drawBackdrop(){},
  }),
} satisfies NativeSceneAdapter]));
