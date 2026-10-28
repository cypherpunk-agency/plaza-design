import {RENDER_PASSES,renderSourceLabel,type RenderSource,type RenderSettings,type ResolvedRenderSettings} from '../world/render-settings';
import type {TypedForm} from './typed-form';
const labels={sky:'Sky',weather:'Weather',casters:'Cast shadows',actors:'Actor overlay',shade:'Street shade',grade:'Color grading',lights:'Light effects',prompts:'Interaction prompts',bubbles:'Speech bubbles',vision:'Hack vision'};
/** One tri-state control per switch. There is no second property model behind this form. */
export function renderSettingsAuthoring(form:TypedForm,host:HTMLElement,local:RenderSettings|undefined,edit:(settings:RenderSettings|undefined)=>void,effective?:ResolvedRenderSettings,prefix='Rendering',openSource?:(source:RenderSource)=>void,sectionKey=prefix){
 const box=form.section(host,prefix,sectionKey);
 const note=document.createElement('p');note.className='muted';note.textContent='Inherit uses the source shown below. On/Off changes presentation only; it does not create missing entities or bypass gameplay rules.';box.append(note);
 for(const key of RENDER_PASSES){
  if(effective?.limits[key]){const limit=document.createElement('p');limit.className='muted';limit.textContent=labels[key]+': unavailable. '+effective.limits[key];box.append(limit);continue;}
  const set=(value:string)=>{const next={...local};if(value==='inherit')delete next[key];else next[key]=value==='on';edit(Object.keys(next).length?next:undefined);};
  form.select(box,prefix+' · '+labels[key],['inherit','on','off'],local?.[key]===undefined?'inherit':local[key]?'on':'off',set);
  // Inherited values name their source; an override marks its row and offers a reset back to Inherit.
  const overridden=local?.[key]!==undefined,row=box.lastElementChild;
  if(overridden&&row){row.classList.add('changed');const reset=document.createElement('button');reset.type='button';reset.className='reset-field';reset.textContent='↺';reset.title='Inherit again';reset.setAttribute('aria-label','Inherit '+labels[key]+' again');reset.onclick=()=>form.run(()=>set('inherit'));row.append(reset);}
  const source=document.createElement('p');source.className='provenance '+(overridden?'override':'inherited');source.dataset.renderSource=key;source.textContent=effective?(effective.values[key]?'On':'Off')+(overridden?' · override here':' · from '+renderSourceLabel(effective.sources[key])):(overridden?(local![key]?'On':'Off')+' · override; a more specific member or sequence can supersede it':'Inherits separately in each member');box.append(source);
 }
 if(openSource&&effective)for(const source of new Map(RENDER_PASSES.filter(key=>local?.[key]===undefined&&!effective.limits[key]).map(key=>{const source=effective.sources[key];return[JSON.stringify(source),source];})).values())if(source.kind!=='default')form.button(box,'Edit source · '+renderSourceLabel(source),()=>openSource(source));
}
