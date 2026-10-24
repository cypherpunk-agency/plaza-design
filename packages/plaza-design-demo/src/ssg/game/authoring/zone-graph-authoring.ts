import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import {SEAM_KINDS,validateZoneGraph,worldProblems,type Seam,type SeamKind,type ZoneGraphSource,type ZoneInfo} from '../world/zone-graph';
import {zoneInfo,zoneName,zonePieces} from './zone-graph-context';
import {SCENES} from '../scenes';
/**
 * World › Zones: typed controls for world/zone-graph.json (docs/design/SEAMLESS-WORLD.md §6.1). A list of seams on the
 * left (each with its kind, its two scenes and whether it meets them) and the selected seam as a card: its kind, the
 * scene it starts from and the one it leads to, the level pieces stairs and doors use, where the second scene sits,
 * and a diagram of both. Each edit is one ComposerModel history step of the 'zone-graph' document; the shape is checked
 * on every edit and the seams against the zones (worldProblems) are shown beside the field they concern, and checked
 * again on protected Save.
 */
const KIND_WORDS:Record<SeamKind,string>={walk:'Walk',stairs:'Stairs',door:'Door'};
const KIND_HINTS:Record<SeamKind,string>={walk:'The player walks off one scene’s edge straight into the other.',stairs:'A flight in one scene climbs or drops into the other.',door:'A door in one scene opens into the other.'};
/** Small kind icons for the list (16 px, currentColor). */
const KIND_ICONS:Record<SeamKind,string>={
 walk:'<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 8h10M9 4.5 12.5 8 9 11.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 3v10" stroke="currentColor" stroke-width="1.2" opacity=".5"/></svg>',
 stairs:'<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 14h3v-3h3V8h3V5h3V2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
 door:'<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 14V2.5h8V14M2 14h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="8.5" r="1" fill="currentColor"/></svg>',
};
const PIECE_HINTS:Record<'stairs'|'door',[string,string]>={stairs:['The stair whose end lands on the other scene.','Where the flight arrives here: the stair or floor at its end.'],door:['The door that leads into the other scene.','The door the player comes out of here.']};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]!));
const round=(n:number)=>Math.round(n*100)/100;

/** Where a problem belongs on the card. */
export type SeamField='from'|'to'|'fromPiece'|'toPiece'|'x'|'offsets'|'seam';
/**
 * A seam's problems (worldProblems, the rule protected Save enforces) in plain words, each placed beside the field it
 * concerns. Unrecognised problems are kept as they are, on the seam.
 */
export function seamIssues(seam:Seam,problems:readonly string[],name:(zone:string)=>string):{field:SeamField;text:string}[]{
 const out:{field:SeamField;text:string}[]=[],side=(zone:string):'from'|'to'=>seam.a.zone===zone?'from':'to';
 for(const raw of problems){
  if(!raw.startsWith(seam.id+': '))continue;const p=raw.slice(seam.id.length+2);let m:RegExpExecArray|null;
  if((m=/^unknown zone (.+)$/.exec(p)))out.push({field:side(m[1]),text:'There is no scene “'+m[1]+'”. Pick another one.'});
  else if((m=/^(.+) has no level piece (.+)$/.exec(p)))out.push({field:side(m[1])==='from'?'fromPiece':'toPiece',text:name(m[1])+' has no piece “'+m[2]+'”. Pick one of its level pieces.'});
  else if((m=/^a walk seam puts .+ at the edge of .+ \(dx (-?[\d.]+), not (-?[\d.]+)\)$/.exec(p))){const want=Number(m[1]);
   out.push({field:'x',text:'The two scenes don’t touch. For a walk, '+name(seam.b.zone)+' starts at x '+want+(want>=0?' (the right edge of '+name(seam.a.zone)+')':' (it ends at the left edge of '+name(seam.a.zone)+')')+'. Use Align to edge.'});}
  else if((m=/^a (stairs|door) seam names the piece on both sides$/.exec(p))){const kind=m[1] as 'stairs'|'door';
   for(const [end,field] of [[seam.a,'fromPiece'],[seam.b,'toPiece']] as const)if(!end.piece)out.push({field,text:'Pick the '+(kind==='stairs'?'stair':'door')+' piece in '+name(end.zone)+'.'});}
  else if((m=/^the seams around .+ place (.+) in two places$/.exec(p)))out.push({field:'offsets',text:'The seams around these scenes put '+name(m[1])+' in two different places. Check this seam’s offsets against the other seams in the loop.'});
  else out.push({field:'seam',text:p});
 }
 return out;
}

/** The two scenes as rectangles at their offsets (b at dx, dh in a's units), the seam marked; red where it has a problem. */
export function seamDiagram(seam:Seam,zones:Readonly<Record<string,ZoneInfo>>,name:(zone:string)=>string,bad:boolean):string{
 const wa=zones[seam.a.zone]?.width??800,wb=zones[seam.b.zone]?.width??800,H=Math.max(160,Math.min(wa,wb)*.3),{dx,dh}=seam;
 const minX=Math.min(0,dx),maxX=Math.max(wa,dx+wb),minH=Math.min(0,dh),maxH=Math.max(H,dh+H),span=maxX-minX,pad=span*.04+20;
 // text about 12 px on screen, whatever the scenes' sizes (the diagram is drawn about 740 × 230 px)
 const fs=12/Math.min(740/(span+pad*2),230/(maxH-minH+pad*2));
 const vb=[minX-pad,-(maxH+pad+fs),span+pad*2,maxH-minH+pad*2+fs*2.2].map(round).join(' ');
 const rect=(x:number,h:number,w:number,cls:string)=>`<rect class="${cls}" x="${round(x)}" y="${round(-(h+H))}" width="${round(w)}" height="${round(H)}" rx="${round(fs*.3)}"/><line class="floor ${cls}" x1="${round(x)}" x2="${round(x+w)}" y1="${round(-h)}" y2="${round(-h)}"/>`;
 // labels after both rectangles, so a scene stacked over the other does not hide its name: From just above its floor, To at its top
 const text=(x:number,y:number,label:string)=>`<text x="${round(x+fs*.6)}" y="${round(y)}" font-size="${round(fs)}">${escape(label)}</text>`;
 const labels=text(0,-fs*.6,'From · '+name(seam.a.zone))+text(dx,-(dh+H)+fs*1.5,'To · '+name(seam.b.zone));
 const mark=bad?'seam bad':'seam';let marker:string;
 if(seam.kind==='walk'){const edge=dx>=0?wa:0,near=dx>=0?dx:dx+wb,x=(edge+near)/2,top=Math.max(H,dh+H);
  marker=`<line class="${mark}" x1="${round(x)}" x2="${round(x)}" y1="${round(-top-fs*.4)}" y2="${round(fs*.4-Math.min(0,dh))}"/>`+(Math.abs(edge-near)>1?`<line class="${mark} gap" x1="${round(edge)}" x2="${round(near)}" y1="${round(-H/2)}" y2="${round(-H/2)}"/>`:'');}
 else{const lo=Math.max(0,dx),hi=Math.min(wa,dx+wb),x=hi>lo?(lo+hi)/2:dx>=0?wa:0;
  marker=`<line class="${mark}" x1="${round(x)}" x2="${round(x)}" y1="0" y2="${round(-dh)}"/><circle class="${mark}" cx="${round(x)}" cy="0" r="${round(fs*.35)}"/><circle class="${mark}" cx="${round(x)}" cy="${round(-dh)}" r="${round(fs*.35)}"/>`;}
 const caption=`<text class="caption" x="${round(minX)}" y="${round(-minH+pad+fs*.6)}" font-size="${round(fs*.85)}">${escape(name(seam.b.zone))} at x ${round(dx)}, height ${round(dh)} from ${escape(name(seam.a.zone))}</text>`;
 return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escape(`${name(seam.a.zone)} and ${name(seam.b.zone)}, joined by a ${seam.kind} seam`)}">${rect(0,0,wa,'zone-from')}${rect(dx,dh,wb,'zone-to')}${marker}${labels}${caption}</svg>`;
}

export function mountZoneGraphAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle {
 const api=context.authoring!;let disposed=false,seam='';
 const error=document.createElement('p');error.setAttribute('role','alert');error.className='error';const form=new TypedForm(e=>{error.textContent=e instanceof Error?e.message:String(e);});
 const read=()=>validateZoneGraph(api.get('zone-graph').value);
 // the zones' pending widths and compositions (the context's list is the one at mount; reread the live documents)
 const pending=()=>new Map(context.documents.filter(d=>d.id==='authored-scenes'||d.id in SCENES).map(d=>[d.id,api.get(d.id).value]));
 function edit(label:string,change:(d:ZoneGraphSource)=>void){const d=read();change(d);api.edit('zone-graph',label,validateZoneGraph(d));error.textContent='';}
 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text?:string)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const btn=(text:string,run:()=>void,title?:string,cls='')=>{const b=el('button',cls,text);b.type='button';if(title)b.title=title;b.onclick=()=>form.run(run);return b;};
 /** A labelled field: visible words above the control, a fixed accessible name, and the problems that concern it. */
 const field=(parent:HTMLElement,visible:string,name:string,control:HTMLElement,issues:readonly string[]=[],extra:HTMLElement[]=[])=>{
  const wrap=el('div','seam-field'),label=el('label');label.append(el('span','',visible));control.setAttribute('aria-label',name);
  const line=el('div','seam-control');line.append(control,...extra);label.append(line);wrap.append(label);
  for(const text of issues){const p=el('p','field-problem',text);p.setAttribute('aria-label',name+' problem');wrap.append(p);}
  parent.append(wrap);return wrap;
 };
 const picker=(choices:readonly {value:string;label:string}[],value:string,change:(v:string)=>void)=>{const s=el('select');for(const c of choices){const o=el('option','',c.label);o.value=c.value;s.append(o);}s.value=value;s.onchange=()=>form.run(()=>change(s.value));return s;};
 const decimal=(value:number,change:(v:number)=>void)=>{const i=el('input');i.type='number';i.step='any';i.value=String(value);i.onchange=()=>form.run(()=>{if(!i.value.trim())throw new Error('A number is required');const n=Number(i.value);if(!Number.isFinite(n)||Math.abs(n)>100000)throw new Error('Offsets are numbers between −100000 and 100000');change(n);});return i;};
 function render(){
  if(disposed)return;const d=read(),values=pending(),zones=zoneInfo(values),pieces=zonePieces(values),ids=Object.keys(zones),name=(z:string)=>zoneName(z,values);
  ids.sort((a,b)=>name(a).localeCompare(name(b))||a.localeCompare(b));
  if(!d.seams.some(s=>s.id===seam))seam=(d.seams.find(s=>s.a.zone===context.scene||s.b.zone===context.scene)??d.seams[0])?.id??'';
  const problems=worldProblems(d,zones,pieces);
  const intro=el('p','zone-intro','Seams join two scenes so the player walks between them with no cut.');
  const layout=el('div','zone-editor'),list=el('nav','seam-list'),card=el('section','seam-card');list.setAttribute('aria-label','Seams');card.setAttribute('aria-label','Selected seam');
  host.replaceChildren(intro,error,layout);layout.append(list,card);
  // the list: kind icon, From → To, a tick or the number of problems
  const rows=el('ul');list.append(el('h2','','Seams'),rows);
  for(const s of d.seams){
   const n=seamIssues(s,problems,name).length,li=el('li'),pick=el('button','seam-row');pick.type='button';
   pick.setAttribute('data-seam',s.id);pick.setAttribute('aria-pressed',String(s.id===seam));pick.setAttribute('aria-label',`${KIND_WORDS[s.kind]}: ${name(s.a.zone)} → ${name(s.b.zone)}, ${n?n+' problem'+(n>1?'s':''):'no problems'}`);pick.title=s.id;
   const icon=el('span','seam-icon');icon.innerHTML=KIND_ICONS[s.kind];
   const words=el('span','seam-words');words.append(el('span','seam-ends',`${name(s.a.zone)} → ${name(s.b.zone)}`),el('small','',KIND_WORDS[s.kind]+' · '+s.id));
   const badge=el('span',n?'seam-badge bad':'seam-badge ok',n?'! '+n:'✓');badge.title=n?n+' problem'+(n>1?'s':''):'Meets both scenes';
   pick.append(icon,words,badge);pick.onclick=()=>{seam=s.id;error.textContent='';render();};li.append(pick);rows.append(li);
  }
  if(!d.seams.length)list.append(el('p','muted','No seams yet: every scene is reached through its exits.'));
  const actions=el('div','row');list.append(actions);
  const add=btn('＋ Add seam',()=>{
   let n=1;while(d.seams.some(s=>s.id==='seam-'+n))n++;const id='seam-'+n,a=context.scene&&zones[context.scene]?context.scene:ids[0],b=ids.find(z=>z!==a)!;
   edit('Add seam',d=>{d.seams.push({id,kind:'walk',a:{zone:a},b:{zone:b},dx:zones[a].width,dh:0});});seam=id;render();
  },'Join the open scene to another one with a walk seam at its right edge');add.disabled=ids.length<2||d.seams.length>=256;actions.append(add);
  const s=d.seams.find(s=>s.id===seam);
  if(!s){card.append(el('p','muted','Add a seam to join two scenes.'));return;}
  const mutate=(label:string,fn:(s:Seam)=>void)=>edit(label,d=>fn(d.seams.find(x=>x.id===seam)!));
  const issues=seamIssues(s,problems,name),about=(f:SeamField)=>issues.filter(i=>i.field===f).map(i=>i.text);
  // the card's head: From → To, the kind as a segmented control
  const head=el('div','seam-head');head.append(el('h3','',`${name(s.a.zone)} → ${name(s.b.zone)}`));card.append(head);
  const kinds=el('div','segmented');kinds.setAttribute('role','group');kinds.setAttribute('aria-label','Seam kind');
  for(const kind of SEAM_KINDS){const b=btn(KIND_WORDS[kind],()=>{if(kind!==s.kind)mutate('Change seam kind',s=>{s.kind=kind;});},KIND_HINTS[kind]);b.setAttribute('aria-pressed',String(kind===s.kind));kinds.append(b);}
  const kindRow=el('div','seam-kind');kindRow.append(kinds,el('span','muted',KIND_HINTS[s.kind]));card.append(kindRow);
  for(const p of about('seam')){const e=el('p','field-problem',p);e.setAttribute('aria-label','Seam problem');card.append(e);}
  // From and To: the scenes by name, an open link, and (stairs, door) the piece on that side
  const ends=el('div','seam-ends-grid');card.append(ends);
  for(const [side,word] of [['a','From'],['b','To']] as const){
   const end=s[side],box=el('div','seam-end'),f=side==='a'?'from':'to',own=pieces[end.zone]??[];ends.append(box);
   const scenes=picker([...ids.map(z=>({value:z,label:name(z)})),...(ids.includes(end.zone)?[]:[{value:end.zone,label:end.zone+' (missing)'}])],end.zone,zone=>mutate(`Change seam ${word.toLowerCase()} scene`,s=>{s[side]={zone};}));
   const open=btn('open',()=>context.openScene(end.zone),'Open '+name(end.zone)+' in the Scene editor','link');open.setAttribute('aria-label','Open '+(side==='a'?'from':'to')+' scene');
   field(box,word,word+' scene',scenes,about(f),[open]);
   if(s.kind!=='walk'){
    const choices=[{value:'',label:'Pick a piece…'},...own.map(p=>({value:p,label:p})),...(end.piece&&!own.includes(end.piece)?[{value:end.piece,label:end.piece+' (missing)'}]:[])];
    const pick=picker(choices,end.piece??'',piece=>mutate(`Change seam ${word.toLowerCase()} piece`,s=>{s[side]=piece?{zone:s[side].zone,piece}:{zone:s[side].zone};}));
    const wrap=field(box,s.kind==='stairs'?(side==='a'?'Stair piece':'Landing piece'):'Door piece',word+' piece',pick,about(side==='a'?'fromPiece':'toPiece'));wrap.append(el('p','hint',PIECE_HINTS[s.kind][side==='a'?0:1]));
   }
  }
  // where the To scene sits, in the From scene's units
  const offsets=el('div','seam-offsets');card.append(offsets);
  const aligned=s.dx>=0?zones[s.a.zone]?.width:zones[s.b.zone]&&-zones[s.b.zone].width;
  const align=btn('Align to edge',()=>mutate('Align walk seam',s=>{s.dx=aligned!;}),'Put '+name(s.b.zone)+' right against the edge of '+name(s.a.zone));align.disabled=aligned===undefined||aligned===s.dx;
  const x=field(offsets,`${name(s.b.zone)} starts at x`,'To-zone starts at x',decimal(s.dx,dx=>mutate('Edit seam dx',s=>{s.dx=dx;})),about('x'),s.kind==='walk'?[align]:[]);
  x.append(el('p','hint',`Measured from the left end of ${name(s.a.zone)}; negative is to its left.`));
  const h=field(offsets,`… and at height`,'To-zone height',decimal(s.dh,dh=>mutate('Edit seam dh',s=>{s.dh=dh;})),about('offsets'));
  h.append(el('p','hint',`Above ${name(s.a.zone)}’s floor; negative is below it (an underground station under its street).`));
  const diagram=el('div','zone-diagram');diagram.setAttribute('aria-label','Seam diagram');diagram.innerHTML=seamDiagram(s,zones,name,issues.length>0);card.append(diagram);
  const status=el('p',issues.length?'seam-status bad':'seam-status ok',issues.length?`${issues.length} problem${issues.length>1?'s':''}: Save refuses this seam until ${issues.length>1?'they are':'it is'} fixed.`:'✓ This seam meets both scenes.');status.setAttribute('role','status');status.setAttribute('aria-label','Zone graph problems');card.append(status);
  const more=el('div','row seam-foot');card.append(more);
  const idInput=el('input');idInput.value=s.id;idInput.onchange=()=>form.run(()=>{const id=idInput.value.trim();mutate('Rename seam',s=>{s.id=id;});seam=id;render();});
  field(more,'Seam id','Seam id',idInput);
  more.append(btn('Remove seam',()=>{edit('Remove seam',d=>{d.seams=d.seams.filter(x=>x.id!==seam);});seam='';render();},'Remove this seam: the two scenes are no longer joined','danger'));
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
