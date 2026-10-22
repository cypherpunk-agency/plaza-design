import type {TypedForm} from './typed-form';
import type {SceneDef} from '../scenes/kit';
import type {Cue} from '../story/story-rules';

/**
 * Typed controls for the story's shapes (story/story-rules.ts): one walker used for opening.json (the phases, cards, triggers, hints),
 * scene.json (a scene's `phases` and `wash`), contacts.json and end-card.json. Every control edits the document through `doc.edit`,
 * which validates the whole pending source set before it takes effect; nothing here executes anything.
 */
type Path=(string|number)[];
export interface StoryDoc {value():any;edit(label:string,change:(d:any)=>void):void}
export interface StoryVocab {scenes:string[];phases:string[];flags:string[];cards:string[];milestones:string[];registry:Record<string,SceneDef>}
export interface StoryFieldOptions {
  /** The scene a scene document is about (its devices, exits and states fill the selects). */
  scene?:string;
  /** A control only the caller can build (it needs more than the document); true: handled. */
  special?:(parent:HTMLElement,value:any,path:Path)=>boolean;
  /** Re-render after structural edits that do not go through \`doc.edit\`. */
  refresh?:()=>void;
}
const CUE_LISTS=['mid','end','then','begin','do','cues'];
const CUE_KINDS=['milestone','say','print','sound','stage','counter','advance'];
const SOUNDS=['granted','blip','denied','close','open'];
const isObject=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const defaultCue=(kind:string,vocab:StoryVocab):Cue=>kind==='milestone'?{milestone:vocab.milestones[0]}:kind==='say'?{say:{speaker:'YOU',pages:['New line.'],height:46}}:kind==='print'?{print:{lines:['New line.']}}:kind==='sound'?{sound:'blip'}:kind==='stage'?{stage:{scene:vocab.scenes[0]}}:kind==='counter'?{counter:{id:'counter.name'}}:{advance:60};
const cueKind=(cue:object)=>Object.keys(cue)[0];
const defaultRule=(kind:string,device:string):any=>kind==='say'?{say:{name:'YOU',pages:['Not yet.']}}:kind==='react'?{react:device,line:['','New response.']}:kind==='gate'?{gate:{verifying:'CHECKPOINT: verifying',ok:'CHECKPOINT: ok.',verifyFrames:150,okFrames:50,dotEvery:20,then:[]}}:{acknowledge:{speaker:'DEVICE',pages:['Welcome.'],height:60,then:[]}};

export class StoryFields {
  constructor(private form:TypedForm,private doc:StoryDoc,private vocab:()=>StoryVocab,private options:StoryFieldOptions={}){}
  private at(d:any,path:Path){return path.reduce((r,k)=>r[k],d);}
  set(path:Path,value:unknown){this.doc.edit('Edit '+path.join('/'),d=>{this.at(d,path.slice(0,-1))[path.at(-1)!]=value;});}
  remove(path:Path){this.doc.edit('Remove '+path.join('/'),d=>{const owner=this.at(d,path.slice(0,-1));if(Array.isArray(owner))owner.splice(Number(path.at(-1)),1);else delete owner[path.at(-1)!];});}
  private change(label:string,change:(d:any)=>void){this.doc.edit(label,change);}
  private def(scene:string|undefined){return scene?this.vocab().registry[scene]:undefined;}
  private devices(scene:string|undefined){const def=this.def(scene);return[...(def?.data?.devices??[]),...(def?.data?.nodes??[])];}
  private deviceIds(scene:string|undefined){return this.devices(scene).map(d=>d.id);}
  private states(scene:string|undefined,booleanOnly=false){const state=this.def(scene)?.data?.state??{};return Object.keys(state).filter(k=>!booleanOnly||typeof (state as Record<string,unknown>)[k]==='boolean');}

  /** Render any value of the document at \`path\`. \`scene\`: the scene its names refer to, when the value carries one. */
  walk(parent:HTMLElement,value:any,path:Path,scene:string|undefined=this.options.scene){
    const form=this.form,name=path.join(' '),key=path.at(-1),parentKey=path.at(-2);
    if(this.options.special?.(parent,value,path))return;
    if(Array.isArray(value)){
      if(typeof key==='string'&&CUE_LISTS.includes(key)&&value.every(isObject)){this.cues(parent,value as Cue[],path);return;}
      if(parentKey==='everyday'){this.chips(parent,value,path,scene);return;}
      if(key==='arrival'){this.arrival(parent,value,path);return;}
      if(key==='say'||key==='line'){this.line(parent,value,path);return;}
      if(key==='act'||key==='set'&&value.length===2&&typeof value[1]==='boolean'){this.pair(parent,value,path,scene);return;}
      if(key==='reset'&&parentKey!=='counter'){value.forEach((s:string,i:number)=>{form.select(parent,name+' '+(i+1),this.vocab().scenes,s,v=>this.set([...path,i],v));form.button(parent,'Remove '+name+' '+(i+1),()=>this.remove([...path,i]));});form.button(parent,'Add '+name+' scene',()=>this.change('Add reset scene',d=>{this.at(d,path).push(this.vocab().scenes[0]);}),value.length>=8);return;}
      if(!value.length&&['messages','CONTACTS','TRIGGERS','GOAL_HINTS','resume','OPENING_LEVELS'].includes(String(key))){this.addButtons(parent,value,path);return;}
      if(value.every(v=>typeof v==='string')&&key!=='flags'){form.text(parent,name,value.join('\n\n'),v=>this.set(path,v.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean)),true);return;}
      if(key==='flags'){value.forEach((f:string,i:number)=>form.select(parent,name+' '+(i+1),this.vocab().flags,f,v=>this.set([...path,i],v)));return;}
      value.forEach((v,i)=>{const box=form.section(parent,name+' '+(i+1));this.walk(box,v,[...path,i],scene);form.button(box,'Remove '+name+' '+(i+1),()=>this.remove([...path,i]));});
      this.addButtons(parent,value,path);
      return;
    }
    if(isObject(value)){this.object(parent,value,path,scene);return;}
    if(typeof value==='boolean'){form.check(parent,name,value,v=>this.set(path,v));return;}
    if(typeof value==='number'){form.decimal(parent,name,value,v=>this.set(path,v),key==='x'||key==='offsetX'?-1000000:key==='add'?-1000:0,key==='rainThreshold'?1:key==='advance'?1440:1000000);return;}
    if(typeof value==='string')this.string(parent,value,path,scene);
  }

  private string(parent:HTMLElement,value:string,path:Path,scene:string|undefined){
    const form=this.form,name=path.join(' '),key=String(path.at(-1)),v=this.vocab();
    const pick=(options:readonly string[])=>form.select(parent,name,options.includes(value)?options:[...options,value],value,x=>this.set(path,x));
    if(key==='scene')form.select(parent,name,v.scenes,value,x=>this.change('Edit story scene',d=>{const r=this.at(d,path.slice(0,-1));r.scene=x;if('entrance'in r)delete r.entrance;}));
    else if(key==='entrance'){const owner=this.at(this.doc.value(),path.slice(0,-1));form.select(parent,name,['',...(v.registry[owner.scene]?.exits??[]).map(e=>e.id)],value,x=>{if(x)this.set(path,x);else this.remove(path);});}
    else if(key==='phase'||key==='exceptPhase')pick(v.phases);
    else if(key==='whenFlag')pick(v.flags);
    else if(key==='milestone')pick(v.milestones);
    else if(key==='card')pick(v.cards);
    else if(key==='react'||key==='device'||key==='viewing')pick(['',...this.deviceIds(scene)].filter((x,i,a)=>a.indexOf(x)===i));
    else if(key==='exit'&&path.at(-2)==='ping')pick((this.def(scene)?.exits??[]).map(e=>e.id));
    else if(key==='target'&&path.at(-2)==='ping'){pick(Object.keys(this.at(this.doc.value(),path.slice(0,path.indexOf('ping'))).targets??{}));}
    else if(key==='unlessState')pick(this.states(scene));
    else if(key==='tone'&&path.includes('wash'))pick(['warm','cold']);
    else if(key==='tone')pick(['','ok','out','err','dim']);
    else if(key==='sound')pick(SOUNDS);
    else if(['exceptScene','afterScene'].includes(key))pick(v.scenes);
    else if(key==='kind'&&path.at(-2)==='bind')pick(['rest','use','exit']);
    else form.text(parent,name,value,x=>this.set(path,x),['received','whoami'].includes(key)||path.includes('files'));
  }

  private object(parent:HTMLElement,value:any,path:Path,scene:string|undefined){
    const form=this.form,name=path.join(' '),keys=Object.keys(value),key=path.at(-1),parentKey=path.at(-2),v=this.vocab();
    // a trigger/level/card keeps its own scene for the names inside it
    const here=typeof value.scene==='string'&&v.scenes.includes(value.scene)?value.scene:scene;
    if((parentKey==='exits'||parentKey==='barriers')&&['say','react','gate','acknowledge'].some(k=>k in value)){
      const kind=['say','react','gate','acknowledge'].find(k=>k in value)!;
      form.select(parent,name+' handler',['say','react','gate','acknowledge'],kind,k=>this.set(path,defaultRule(k,this.deviceIds(scene)[0]??'')));
    }
    if(key==='ping'){
      const targets=Object.keys(this.at(this.doc.value(),path.slice(0,-1)).targets??{}),exits=this.def(scene)?.exits??[],devices=this.deviceIds(scene),kinds=[...(exits.some(e=>e.action==='out')?['door']:[]),...(exits.length?['exit']:[]),...(devices.length?['device']:[]),...(targets.length?['target']:[])],kind=keys[0];
      form.select(parent,name+' target kind',kinds.includes(kind)?kinds:[...kinds,kind],kind,k=>this.set(path,k==='door'?{door:true}:k==='exit'?{exit:exits[0].id}:k==='device'?{device:devices[0]}:{target:targets[0]}));
      if(kind==='door'){const p=document.createElement('p');p.textContent='The nearest train door';parent.append(p);return;}
    }
    if(parentKey==='targets'){this.target(parent,value,path,scene);return;}
    if(key==='intro'){
      if(!value.touchPages)form.button(parent,'Add '+name+' touch pages',()=>this.set([...path,'touchPages'],[...value.pages]));
      form.check(parent,name+' consume scene intro',!!value.consume,x=>this.set([...path,'consume'],x));
    }
    if(parentKey==='lines'&&!value.name)form.button(parent,'Add '+name+' speaker',()=>this.set([...path,'name'],'YOU'));
    if(key==='quiet'){const p=document.createElement('p');p.textContent='Waits for any speech bubble and popup to close';parent.append(p);}
    if(path.includes('resume')&&typeof key==='number'){
      form.select(parent,name+' condition flag',['',...v.flags],value.whenFlag??'',flag=>this.change('Edit opening resume condition',d=>{const r=this.at(d,path);if(flag)r.whenFlag=flag;else delete r.whenFlag;}));
    }
    if('scene'in value&&keys.every(k=>['scene','entrance'].includes(k)))form.select(parent,name+' arrival',['',...(v.registry[value.scene]?.exits??[]).map(e=>e.id)],value.entrance??'',x=>{if(x)this.set([...path,'entrance'],x);else if(value.entrance!==undefined)this.remove([...path,'entrance']);});
    this.optional(parent,value,path,here);
    for(const k of keys){
      if(k==='entrance'&&'scene'in value&&keys.every(q=>['scene','entrance'].includes(q)))continue;
      if(k==='whenFlag'||k==='consume'&&key==='intro'||k==='bubble'&&key==='quiet'||k==='popup'&&key==='quiet')continue;
      if(['door'].includes(k)&&key==='ping')continue;
      const child=value[k],box=child&&typeof child==='object'?form.section(parent,name+' '+k):parent;
      this.walk(box,child,[...path,k],here);
    }
    if(key==='intro'&&value.touchPages)form.button(parent,'Use desktop pages for '+name+' touch',()=>this.remove([...path,'touchPages']));
  }

  /** Fields a shape may omit: a button adds each, a remove button takes it away again. */
  private optional(parent:HTMLElement,value:any,path:Path,scene:string|undefined){
    const form=this.form,name=path.join(' '),key=path.at(-1),parentKey=path.at(-2),v=this.vocab();
    const add=(field:string,initial:unknown,label=field)=>{if(!(field in value))form.button(parent,'Add '+name+' '+label,()=>this.set([...path,field],initial));};
    const drop=(field:string)=>{if(field in value)form.button(parent,'Remove '+name+' '+field,()=>this.remove([...path,field]));};
    const first=(rows:readonly string[])=>rows[0]??'';
    if(parentKey==='TRIGGERS'||typeof key==='number'&&path[0]==='TRIGGERS'){
      add('start','counter.start');add('once','counter.once');add('viewing',first(this.deviceIds(scene)));
      add('quiet',{bubble:true,popup:true,since:'counter.last',frames:100});add('when',[{counter:'counter.name',atLeast:1}]);
      drop('start');drop('once');drop('viewing');drop('quiet');drop('when');
    }
    if(path[0]==='TRIGGERS'&&path.at(-2)==='when'){/* a test is a counter or an elapsed time */
      const kind='counter'in value?'counter':'elapsed';
      form.select(parent,name+' test',['counter','elapsed'],kind,k=>this.set(path,k==='counter'?{counter:'counter.name',atLeast:1}:{elapsed:'counter.start',frames:60}));
    }
    if(path[0]==='PHASES'&&path.length===2){if(!value.persona)form.button(parent,'Add '+name+' persona',()=>this.set([...path,'persona'],{name:'courier',calmWeather:true,deck:{files:{},whoami:'whoami'}}));else drop('persona');}
    if(path[0]==='CARDS'&&path.length===2){add('mid',[]);add('end',[]);}
    if(key==='gate'||key==='acknowledge'){add('begin',[]);}
    if((parentKey==='exits'||parentKey==='barriers')&&'react'in value)add('cues',[]);
    if(typeof key==='number'&&parentKey&&path.includes('everyday')){
      for(const f of['cues'])add(f,[]);
      const dev=String(path[path.indexOf('everyday')+1]),device=this.devices(scene).find(d=>d.id===dev),noun=device?.nouns.find(n=>n.verbs?.length),state=this.states(scene,true)[0];
      if(!value.say)form.button(parent,'Add '+name+' response',()=>this.set([...path,'say'],['','New response.']));
      if(!value.act)form.button(parent,'Add '+name+' device verb',()=>this.set([...path,'act'],[noun!.id,noun!.verbs![0]]),!noun);
      if(!value.set)form.button(parent,'Add '+name+' state change',()=>this.set([...path,'set'],[state,true]),!state);
      for(const k of['say','act','set'])if(value[k])form.button(parent,'Remove '+name+' '+k,()=>this.remove([...path,k]));
      drop('cues');
    }
    if(path[0]==='OPENING_LEVELS'&&typeof key==='number'){add('reset',[]);add('end',first(v.cards));drop('reset');drop('end');}
    if(path[0]==='wash'&&typeof key==='number'){add('phase',first(v.phases));add('flag',first(v.flags));add('unlessState',first(this.states(scene)));drop('phase');drop('flag');drop('unlessState');}
    if(key==='print'&&path.at(-2)!==undefined){add('prefix','prefix> ');add('tone','ok');drop('prefix');drop('tone');}
    if(key==='say'&&path.at(-2)!==undefined&&Array.isArray(value.pages)&&!value.touchPages)form.button(parent,'Add '+name+' touch pages',()=>this.set([...path,'touchPages'],[...value.pages]));
    if(key==='say'&&value.touchPages)drop('touchPages');
    if(key==='counter'&&typeof value.id==='string'){const kind=value.stamp?'stamp':'add';form.select(parent,name+' op',['add','stamp'],kind,k=>this.set(path,k==='stamp'?{id:value.id,stamp:true}:{id:value.id}));}
    if(key==='stage'){add('reset',true);add('face',-1);drop('reset');drop('face');}
  }

  private cues(parent:HTMLElement,cues:Cue[],path:Path){
    const form=this.form,name=path.join(' ');
    cues.forEach((cue,i)=>{
      const box=form.section(parent,name+' '+(i+1)),at=[...path,i],kind=cueKind(cue);
      form.select(box,at.join(' ')+' kind',CUE_KINDS,kind,k=>this.set(at,defaultCue(k,this.vocab())));
      this.walkCue(box,cue,at);
      form.button(box,'Remove '+name+' '+(i+1),()=>this.remove(at));
      if(i>0)form.button(box,'Move '+name+' '+(i+1)+' up',()=>this.change('Move cue',d=>{const l=this.at(d,path);[l[i-1],l[i]]=[l[i],l[i-1]];}));
    });
    let kind='milestone';
    form.select(parent,'New '+name+' cue kind',CUE_KINDS,kind,k=>{kind=k;});
    form.button(parent,'Add '+name+' cue',()=>this.change('Add cue',d=>{this.at(d,path).push(defaultCue(kind,this.vocab()));}),cues.length>=24);
  }
  private walkCue(box:HTMLElement,cue:any,at:Path){const kind=cueKind(cue),inner=cue[kind];
    if(typeof inner==='object'&&inner!==null&&!Array.isArray(inner)){this.walk(box,inner,[...at,kind]);return;}
    this.walk(box,inner,[...at,kind]);
  }

  private chips(parent:HTMLElement,chips:any[],path:Path,scene:string|undefined){
    const form=this.form,name=path.join(' ');
    chips.forEach((chip,i)=>{const box=form.section(parent,name+' '+(i+1));this.walk(box,chip,[...path,i],scene);form.button(box,'Remove '+name+' '+(i+1),()=>this.remove([...path,i]));});
    form.button(parent,'Add '+name+' interaction',()=>this.change('Add story interaction',d=>{this.at(d,path).push({label:'look',say:['','New response.']});}),chips.length>=16);
  }
  private line(parent:HTMLElement,value:any[],path:Path){
    const form=this.form,name=path.join(' ');
    form.text(parent,name+' input',value[0],v=>this.set([...path,0],v));
    form.text(parent,name+' response',value[1],v=>this.set([...path,1],v),true);
    form.select(parent,name+' tone',['','ok','err','dim'],value[2]??'',v=>this.change('Edit story line tone',d=>{const l=this.at(d,path);if(v)l[2]=v;else l.length=2;}));
  }
  private pair(parent:HTMLElement,value:any[],path:Path,scene:string|undefined){
    const form=this.form,name=path.join(' ');
    if(path.at(-1)==='act'){const device=this.devices(scene).find(d=>d.id===String(path[path.indexOf('everyday')+1])),nouns=(device?.nouns??[]).filter(n=>n.verbs?.length);
      form.select(parent,name+' noun',nouns.map(n=>n.id),value[0],v=>this.set(path,[v,nouns.find(n=>n.id===v)!.verbs![0]]));
      const verbs=nouns.find(n=>n.id===value[0])?.verbs??[value[1]];form.select(parent,name+' verb',verbs,value[1],v=>this.set(path,[value[0],v]));return;}
    form.select(parent,name+' state',this.states(scene,true),value[0],v=>this.set(path,[v,value[1]]));
    form.check(parent,name+' value',value[1],v=>this.set(path,[value[0],v]));
  }
  private target(parent:HTMLElement,value:any,path:Path,scene:string|undefined){
    const form=this.form,name=path.join(' '),def=this.def(scene),bind=value.bind??{kind:'rest',id:'',offsetX:0},anchors=(bind.kind==='rest'?def?.rests:bind.kind==='use'?def?.uses:def?.exits)??[];
    form.select(parent,name+' anchor kind',['rest','use','exit'],bind.kind,k=>this.change('Bind story target',d=>{const row=this.at(d,path);delete row.x;row.bind={kind:k,id:((k==='rest'?def?.rests:k==='use'?def?.uses:def?.exits)??[])[0]?.id??'',offsetX:0};}));
    if(value.bind){
      form.select(parent,name+' anchor',[...anchors.map(a=>a.id)],bind.id,id=>this.set([...path,'bind','id'],id));
      form.decimal(parent,name+' offsetX',bind.offsetX??0,x=>this.set([...path,'bind','offsetX'],x),-1000000);
      form.button(parent,'Place '+name+' at a point',()=>this.change('Place story target',d=>{const row=this.at(d,path);const found=anchors.find(a=>a.id===bind.id);row.x=Math.round((found?.x??0)+(bind.offsetX??0));delete row.bind;}));
    }else{
      form.decimal(parent,name+' x',value.x,x=>this.set([...path,'x'],x),-1000000);
      form.button(parent,'Apply '+name+' binding',()=>this.change('Bind story target',d=>{const row=this.at(d,path);delete row.x;row.bind={kind:bind.kind,id:anchors[0]?.id??'',offsetX:0};}),!anchors.length);
    }
    form.text(parent,name+' label',value.label,x=>this.set([...path,'label'],x));
    form.decimal(parent,name+' promptH',value.promptH,x=>this.set([...path,'promptH'],x),0,10000);
    form.select(parent,name+' card',['',...this.vocab().cards],value.card??'',c=>{if(c)this.set([...path,'card'],c);else if(value.card!==undefined)this.remove([...path,'card']);});
  }
  private arrival(parent:HTMLElement,rows:any[],path:Path){
    const form=this.form,name=path.join(' ');
    rows.forEach((row,i)=>{
      const box=form.section(parent,name+' '+(i+1)),at=[...path,i],n=at.join(' ');
      form.text(box,n+' unless flag',row.unless??'',v=>{if(v)this.set([...at,'unless'],v);else if(row.unless!==undefined)this.remove([...at,'unless']);});
      form.text(box,n+' sets flags',(row.set??[]).join(', '),v=>{const flags=v.split(',').map(f=>f.trim()).filter(Boolean);if(flags.length)this.set([...at,'set'],flags);else if(row.set!==undefined)this.remove([...at,'set']);});
      form.text(box,n+' speaker',row.speaker,v=>this.set([...at,'speaker'],v));
      form.decimal(box,n+' height',row.height,v=>this.set([...at,'height'],v),0,10000);
      form.decimal(box,n+' rain threshold',row.rainThreshold??0,v=>this.set([...at,'rainThreshold'],v),0,1);
      for(const field of['pages','touchPages']){
        if(row[field]===undefined){form.button(box,'Add '+n+' '+field,()=>this.set([...at,field],[...row.pages]));continue;}
        row[field].forEach((page:any,j:number)=>{
          const p=[...at,field,j],pn=n+' '+field+' '+(j+1);
          if(typeof page==='string')form.text(box,pn,page,v=>this.set(p,v),true);
          else if('companion'in page){const note=document.createElement('p');note.textContent=pn+': the companion greeting, when it has joined';box.append(note);}
          else{form.text(box,pn+' text',page.text,v=>this.set([...p,'text'],v),true);form.check(box,pn+' wet weather',page.rain,v=>this.set([...p,'rain'],v));}
          form.button(box,'Remove '+pn,()=>this.remove(p));
        });
        form.button(box,'Add '+n+' '+field+' page',()=>this.change('Add arrival page',d=>{this.at(d,[...at,field]).push('New line.');}));
        form.button(box,'Add '+n+' '+field+' weather page',()=>this.change('Add arrival page',d=>{this.at(d,[...at,field]).push({text:'New line.',rain:true});}));
        form.button(box,'Add '+n+' '+field+' companion page',()=>this.change('Add arrival page',d=>{this.at(d,[...at,field]).push({companion:true});}));
        if(field==='touchPages')form.button(box,'Use desktop pages for '+n+' touch',()=>this.remove([...at,field]));
      }
      form.button(box,'Remove '+n,()=>this.remove(at));
    });
    form.button(parent,'Add '+name+' row',()=>this.change('Add arrival row',d=>{const list=this.at(d,path);list.splice(Math.max(0,list.length-(list.at(-1)?.unless===undefined?1:0)),0,{unless:'flag.name',speaker:'YOU',height:46,pages:['New line.']});}),rows.length>=8);
  }
  /** Add buttons for arrays of objects that are not cues (hints, triggers, rules, levels, contacts). */
  private addButtons(parent:HTMLElement,list:any[],path:Path){
    const form=this.form,name=path.join(' '),v=this.vocab(),top=path[0],key=path.at(-1);
    const add=(label:string,row:unknown,max=16)=>form.button(parent,'Add '+name+' '+label,()=>this.change('Add '+label,d=>{this.at(d,path).push(structuredClone(row));}),list.length>=max);
    if(key==='resume')form.button(parent,'Add '+name+' conditional rule',()=>this.change('Add opening resume rule',d=>{this.at(d,path).unshift({whenFlag:v.flags[1]??v.flags[0],destination:{scene:v.scenes[0]}});}));
    else if(top==='OPENING_LEVELS')add('level',{id:'opening-level-'+(list.length+1),name:'New opening level',flags:[v.flags[0]]});
    else if(top==='TRIGGERS')add('trigger',{id:'trigger-'+(list.length+1),phase:v.phases[0],scene:v.scenes[0],do:[]});
    else if(top==='GOAL_HINTS')add('hint',{program:'scan.so',exceptScene:v.scenes[0],afterScene:v.scenes[0],afterGoal:'goal',line:'New hint.'},8);
    else if(top==='CONTACTS'&&path.length===1)add('contact',{id:'contact-'+(list.length+1),name:'NEW',when:'contact:new',status:'status',messages:[]});
    else if(key==='messages')add('message',{id:'message.'+(list.length+1),when:'flag.name',text:['New message.']},64);
    else if(key==='wash')add('rule',{tone:'warm'},8);
  }
}
