import type {Condition,GameplayDefinition} from '../engine/gameplay/types';
/** Small shared typed controls. Edits always pass the caller's document validator. */
export class TypedForm {
 /** Shared start of field names inside one detail panel: hidden from the visible label, kept in the accessible name. */
 prefix?:string|RegExp;
 constructor(private report:(e:unknown)=>void){}
 visible(name:string){const p=this.prefix,short=p instanceof RegExp?name.replace(p,'')||name:p&&name.startsWith(p)&&name.length>p.length?name.slice(p.length):name;return short.charAt(0).toUpperCase()+short.slice(1);}
 run(fn:()=>void){try{fn();}catch(e){this.report(e);}}
 field(parent:HTMLElement,name:string,control:HTMLElement){const label=document.createElement('label');label.textContent=this.visible(name)+' ';control.setAttribute('aria-label',name);label.append(control);parent.append(label);return control;}
 text(parent:HTMLElement,name:string,value:string,edit:(v:string)=>void,multiline=false){const input=document.createElement(multiline?'textarea':'input');input.value=value;input.onchange=()=>this.run(()=>edit(input.value));this.field(parent,name,input);}
 number(parent:HTMLElement,name:string,value:number,edit:(v:number)=>void,min=0,max=1000000){const input=document.createElement('input');input.type='number';input.min=String(min);input.max=String(max);input.step='1';input.value=String(value);input.onchange=()=>this.run(()=>{const n=Number(input.value);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error('Whole number outside field range');edit(n);});this.field(parent,name,input);}
 select(parent:HTMLElement,name:string,values:readonly string[],value:string,edit:(v:string)=>void){const input=document.createElement('select');for(const v of values){const o=document.createElement('option');o.value=v;o.textContent=v||'(none)';input.append(o);}input.value=value;input.onchange=()=>this.run(()=>edit(input.value));this.field(parent,name,input);}
 check(parent:HTMLElement,name:string,value:boolean,edit:(v:boolean)=>void){const input=document.createElement('input');input.type='checkbox';input.checked=value;input.onchange=()=>this.run(()=>edit(input.checked));this.field(parent,name,input);}
 button(parent:HTMLElement,label:string,run:()=>void,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=()=>this.run(run);parent.append(b);}
 section(parent:HTMLElement,title:string){const d=document.createElement('details');d.open=true;const s=document.createElement('summary');s.textContent=title;d.append(s);const body=document.createElement('div');body.className='gameplay-fields';d.append(body);parent.append(d);return body;}
 condition(parent:HTMLElement,name:string,value:Condition|undefined,edit:(v:Condition|undefined)=>void,doc:GameplayDefinition,flagsOnly=false,depth=0){
  const group=document.createElement('fieldset'),legend=document.createElement('legend');group.className='gameplay-condition';group.setAttribute('aria-label',name);legend.textContent=this.visible(name);group.append(legend);parent.append(group);
  const stateIds=Object.keys(doc.state??{});
  const kind=!value?'always':'state'in value?'state':'flag'in value?'flag':'item'in value?'item':'tokensAtLeast'in value?'tokens':'all'in value?'all':'any'in value?'any':'not';
  const leaf:Condition=doc.flags.length?{flag:doc.flags[0]}:!flagsOnly?{tokensAtLeast:0}:{all:[]};
  const initial=(k:string):Condition|undefined=>k==='always'?undefined:k==='state'?{state:stateIds[0],is:doc.state![stateIds[0]].default}:k==='flag'?{flag:doc.flags[0]}:k==='item'?{item:doc.items[0],atLeast:1}:k==='tokens'?{tokensAtLeast:1}:k==='not'?{not:leaf}:k==='all'?{all:[leaf]}:{any:[leaf]};
  const kinds=[...(depth===0?['always']:[]),...(stateIds.length&&!flagsOnly?['state']:[]),...(doc.flags.length?['flag']:[]),...(!flagsOnly?[...(doc.items.length?['item']:[]),'tokens']:[]),...(depth<10&&(doc.flags.length||!flagsOnly)?['all','any','not']:[])];
  this.select(group,name+' type',kinds,kind,k=>edit(initial(k)));
  if(!value)return;
  if('state'in value){const d=doc.state![value.state];this.select(group,name+' state',stateIds,value.state,state=>edit({state,is:doc.state![state].default}));if(d.type==='boolean')this.check(group,name+' equals',Boolean(value.is),is=>edit({...value,is}));else if(d.type==='number')this.number(group,name+' equals',Number(value.is),is=>edit({...value,is}),d.min??-1000000,d.max??1000000);else this.select(group,name+' equals',d.options!,String(value.is),is=>edit({...value,is}));}
  else if('flag'in value){this.select(group,name+' flag',doc.flags,value.flag,flag=>edit({...value,flag}));this.check(group,name+' is true',value.is??true,is=>edit({...value,is}));}
  else if('item'in value){this.select(group,name+' item',doc.items,value.item,item=>edit({...value,item}));this.number(group,name+' quantity',value.atLeast,atLeast=>edit({...value,atLeast}));}
  else if('tokensAtLeast'in value)this.number(group,name+' tokens',value.tokensAtLeast,tokensAtLeast=>edit({tokensAtLeast}));
  else if('not'in value)this.condition(group,name+' not',value.not,not=>edit({not:not!}),doc,flagsOnly,depth+1);
  else {const key='all'in value?'all':'any',children='all'in value?value.all:value.any;children.forEach((child,i)=>{this.condition(group,name+' '+(i+1),child,c=>edit({[key]:children.map((v,j)=>i===j?c!:v)} as Condition),doc,flagsOnly,depth+1);if(children.length>1)this.button(group,'Remove '+name+' '+(i+1),()=>edit({[key]:children.filter((_,j)=>i!==j)} as Condition));});this.button(group,'Add '+name+' condition',()=>edit({[key]:[...children,leaf]} as Condition),children.length>=32);}
 }
}
