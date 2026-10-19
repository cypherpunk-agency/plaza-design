import type {ScalarRead} from '../engine/gameplay/queries';
import {concreteStateValue} from '../engine/gameplay/state';
import type {StateDeclaration,StateValue} from '../engine/gameplay/types';
import {WEATHER_KINDS} from '../world/weather';
import type {Condition,GameplayDefinition} from '../engine/gameplay/types';
/** Small shared typed controls. Edits always pass the caller's document validator. */
export class TypedForm {
 /** Shared start of field names inside one detail panel: hidden from the visible label, kept in the accessible name. */
 prefix?:string|RegExp;
 objectiveIds:readonly string[]=[];
 allowObjectiveContext=true;
 constructor(private report:(e:unknown)=>void){}
 visible(name:string){const p=this.prefix,short=p instanceof RegExp?name.replace(p,'')||name:p&&name.startsWith(p)&&name.length>p.length?name.slice(p.length):name;return short.charAt(0).toUpperCase()+short.slice(1);}
 run(fn:()=>void){try{fn();}catch(e){this.report(e);}}
 field(parent:HTMLElement,name:string,control:HTMLElement){const label=document.createElement('label');label.textContent=this.visible(name)+' ';control.setAttribute('aria-label',name);label.append(control);parent.append(label);return control;}
 text(parent:HTMLElement,name:string,value:string,edit:(v:string)=>void,multiline=false){const input=document.createElement(multiline?'textarea':'input');input.value=value;input.onchange=()=>this.run(()=>edit(input.value));this.field(parent,name,input);}
 number(parent:HTMLElement,name:string,value:number,edit:(v:number)=>void,min=0,max=1000000){const input=document.createElement('input');input.type='number';input.min=String(min);input.max=String(max);input.step='1';input.value=String(value);input.onchange=()=>this.run(()=>{const n=Number(input.value);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error('Whole number outside field range');edit(n);});this.field(parent,name,input);}
 decimal(parent:HTMLElement,name:string,value:number,edit:(v:number)=>void,min=0,max=1000000){const input=document.createElement('input');input.type='number';input.min=String(min);input.max=String(max);input.step='any';input.value=String(value);input.onchange=()=>this.run(()=>{if(!input.value.trim())throw new Error('A number is required');const n=Number(input.value);if(!Number.isFinite(n)||n<min||n>max)throw new Error('Number outside field range');edit(n);});this.field(parent,name,input);}
 select(parent:HTMLElement,name:string,values:readonly string[],value:string,edit:(v:string)=>void){const input=document.createElement('select');for(const v of values){const o=document.createElement('option');o.value=v;o.textContent=v||'(none)';input.append(o);}input.value=value;input.onchange=()=>this.run(()=>edit(input.value));this.field(parent,name,input);}
 check(parent:HTMLElement,name:string,value:boolean,edit:(v:boolean)=>void){const input=document.createElement('input');input.type='checkbox';input.checked=value;input.onchange=()=>this.run(()=>edit(input.checked));this.field(parent,name,input);}
 button(parent:HTMLElement,label:string,run:()=>void,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=()=>this.run(run);parent.append(b);}
 /** Sections start collapsed so long documents read as an index; the open ones survive re-renders. */
 private sectionOpen=new Map<string,boolean>();
 section(parent:HTMLElement,title:string){const d=document.createElement('details');d.open=this.sectionOpen.get(title)??false;d.ontoggle=()=>{this.sectionOpen.set(title,d.open);};const s=document.createElement('summary');s.textContent=title;d.append(s);const body=document.createElement('div');body.className='gameplay-fields';d.append(body);parent.append(d);return body;}
 stateValue(parent:HTMLElement,name:string,value:StateValue,d:StateDeclaration,edit:(value:StateValue)=>void){
  if(d.nullable)this.check(parent,name+' null',value===null,on=>edit(on?null:concreteStateValue(d)));
  if(value===null)return;
  if(d.type==='boolean')this.check(parent,name,Boolean(value),edit);
  else if(d.type==='number'){const field=d.integer===false?this.decimal.bind(this):this.number.bind(this);field(parent,name,Number(value),edit,d.min??-1000000,d.max??1000000);}
  else if(d.type==='string')this.text(parent,name,String(value),edit);
  else this.select(parent,name,d.options!,String(value),edit);
 }
 scalarRead(parent:HTMLElement,name:string,value:ScalarRead,edit:(v:ScalarRead)=>void,doc:GameplayDefinition){
  const kind='literal'in value?'literal':'state'in value?'state':'query',states=Object.keys(doc.state??{}),queries=Object.keys(doc.queries??{});
  this.select(parent,name+' source',['literal',...(states.length?['state']:[]),...(queries.length?['query']:[])],kind,kind=>edit(kind==='state'?{state:states[0]}:kind==='query'?{query:queries[0]}:{literal:0}));
  if('state'in value)this.select(parent,name+' state',states,value.state,state=>edit({state}));
  else if('query'in value)this.select(parent,name+' query',queries,value.query,query=>edit({query}));
  else {const type=value.literal===null?'null':typeof value.literal;this.select(parent,name+' literal type',['number','string','boolean','null'],type,type=>edit({literal:type==='number'?0:type==='string'?'':type==='boolean'?false:null}));if(typeof value.literal==='number')this.decimal(parent,name+' literal',value.literal,literal=>edit({literal}),-Number.MAX_VALUE,Number.MAX_VALUE);else if(typeof value.literal==='boolean')this.check(parent,name+' literal',value.literal,literal=>edit({literal}));else if(typeof value.literal==='string')this.text(parent,name+' literal',value.literal,literal=>edit({literal}));}
 }
 condition(parent:HTMLElement,name:string,value:Condition|undefined,edit:(v:Condition|undefined)=>void,doc:GameplayDefinition,flagsOnly=false,depth=0){
  const group=document.createElement('fieldset'),legend=document.createElement('legend');group.className='gameplay-condition';group.setAttribute('aria-label',name);legend.textContent=this.visible(name);group.append(legend);parent.append(group);
  const stateIds=Object.keys(doc.state??{});
  const kind=!value?'always':'compare'in value?'compare':'player'in value?'player':'objective'in value?'objective':'time'in value?'time':'weather'in value?'weather':'state'in value?'state':'flag'in value?'flag':'item'in value?'item':'tokensAtLeast'in value?'tokens':'all'in value?'all':'any'in value?'any':'not';
  const leaf:Condition=doc.flags.length?{flag:doc.flags[0]}:!flagsOnly?{tokensAtLeast:0}:{all:[]};
  const initial=(k:string):Condition|undefined=>k==='always'?undefined:k==='compare'?{compare:{left:{literal:0},op:'eq',right:{literal:0}}}:k==='player'?{player:{field:'handle',is:''}}:k==='objective'?{objective:this.objectiveIds[0]??'objective'}:k==='time'?{time:{from:'18:00',to:'06:00'}}:k==='weather'?{weather:['rain']}:k==='state'?{state:stateIds[0],is:doc.state![stateIds[0]].default}:k==='flag'?{flag:doc.flags[0]}:k==='item'?{item:doc.items[0],atLeast:1}:k==='tokens'?{tokensAtLeast:1}:k==='not'?{not:leaf}:k==='all'?{all:[leaf]}:{any:[leaf]};
  const kinds=[...(depth===0?['always']:[]),...(stateIds.length&&!flagsOnly?['state']:[]),...(doc.flags.length?['flag']:[]),...(!flagsOnly?['compare',...(doc.items.length?['item']:[]),'tokens','player',...(this.allowObjectiveContext&&this.objectiveIds.length?['objective']:[]),'time','weather']:[]),...(depth<10&&(doc.flags.length||!flagsOnly)?['all','any','not']:[])];
  this.select(group,name+' type',kinds,kind,k=>edit(initial(k)));
  if(!value)return;
  if('compare'in value){const c=value.compare;this.scalarRead(group,name+' left',c.left,left=>edit({compare:{...c,left}}),doc);this.select(group,name+' operator',['eq','ne','lt','lte','gt','gte'],c.op,op=>edit({compare:{...c,op:op as typeof c.op}}));this.scalarRead(group,name+' right',c.right,right=>edit({compare:{...c,right}}),doc);}
  else if('player'in value){const p=value.player,key='field'in p?p.field:p.collection;this.select(group,name+' player field',['handle','jump','controlled','keyring'],key,k=>edit({player:k==='handle'?{field:'handle',is:''}:k==='jump'?{field:'jump',is:false}:{collection:k as 'controlled'|'keyring'}}));if('field'in p){if(p.field==='handle')this.text(group,name+' equals',p.is,is=>edit({player:{field:'handle',is}}));else this.check(group,name+' equals',p.is,is=>edit({player:{field:'jump',is}}));}else{this.select(group,name+' membership',['any','contains'],p.contains===undefined?'any':'contains',kind=>edit({player:kind==='any'?{collection:p.collection}:{collection:p.collection,contains:'member'}}));if(p.contains!==undefined)this.text(group,name+' member ID',p.contains,contains=>edit({player:{...p,contains}}));}}
  else if('objective'in value)this.select(group,name+' objective',Array.from(new Set([...this.objectiveIds,value.objective])),value.objective,objective=>edit({objective}));
  else if('time'in value){this.text(group,name+' from',value.time.from,from=>edit({time:{...value.time,from}}));this.text(group,name+' to',value.time.to,to=>edit({time:{...value.time,to}}));this.text(group,name+' days',(value.time.days??[]).join(','),text=>{const time={...value.time};delete time.days;if(text.trim())time.days=text.split(',').map(d=>d.trim()).map(d=>d==='odd'||d==='even'?d:Number(d));edit({time});});}
  else if('weather'in value){for(const weather of WEATHER_KINDS)this.check(group,name+' '+weather,value.weather.includes(weather),on=>edit({weather:on?[...value.weather,weather]:value.weather.filter(w=>w!==weather)}));}
  else if('state'in value){const d=doc.state![value.state];this.select(group,name+' state',stateIds,value.state,state=>edit({state,is:doc.state![state].default}));this.stateValue(group,name+' equals',value.is,d,is=>edit({...value,is}));}
  else if('flag'in value){this.select(group,name+' flag',doc.flags,value.flag,flag=>edit({...value,flag}));this.check(group,name+' is true',value.is??true,is=>edit({...value,is}));}
  else if('item'in value){this.select(group,name+' item',doc.items,value.item,item=>edit({...value,item}));this.number(group,name+' quantity',value.atLeast,atLeast=>edit({...value,atLeast}));}
  else if('tokensAtLeast'in value)this.number(group,name+' tokens',value.tokensAtLeast,tokensAtLeast=>edit({tokensAtLeast}));
  else if('not'in value)this.condition(group,name+' not',value.not,not=>edit({not:not!}),doc,flagsOnly,depth+1);
  else {const key='all'in value?'all':'any',children='all'in value?value.all:value.any;children.forEach((child,i)=>{this.condition(group,name+' '+(i+1),child,c=>edit({[key]:children.map((v,j)=>i===j?c!:v)} as Condition),doc,flagsOnly,depth+1);if(children.length>1)this.button(group,'Remove '+name+' '+(i+1),()=>edit({[key]:children.filter((_,j)=>i!==j)} as Condition));});this.button(group,'Add '+name+' condition',()=>edit({[key]:[...children,leaf]} as Condition),children.length>=32);}
 }
}
