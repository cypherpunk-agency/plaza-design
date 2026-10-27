import type {EditorSelection} from './selection';
export interface EditorViewSnapshot {
 checkpoint?:string;sequence:string;time:number;compare:string;
 workspace:{x:number;y:number;zoom:number;anchor?:{x:number;h:number}};cameraPreview:boolean;
 environment:Record<string,string|number|boolean>;
 timeline:{zoom:number;collapsed:string[];scrollX:number;scrollY:number;height:number;folded:boolean};
 speed:number;snap:number;loop:{enabled:boolean;from:number;to:number};
 outlines:boolean;borders:boolean;chunkStatus:boolean;reduced:boolean;overlays:boolean;
 scroll:{x:number;y:number};selection:EditorSelection;
 outline:{sort:'kind'|'order';query:string};
}
const prefix='access-denied.editor.view.';
const finite=(v:unknown,min=-1e8,max=1e8)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
/** Optional workspace preference, never source content or a game save. Invalid storage is ignored. */
export function parseEditorView(value:unknown):EditorViewSnapshot|undefined {
 const v=value as EditorViewSnapshot;if(!v||typeof v!=='object')return;
 if(v.checkpoint!==undefined&&typeof v.checkpoint!=='string')return;
 if(typeof v.sequence!=='string'||typeof v.compare!=='string'||!finite(v.time,0)||!finite(v.speed,.01,100)||!finite(v.snap,0,10000))return;
 if(!v.workspace||!finite(v.workspace.x)||!finite(v.workspace.y)||!finite(v.workspace.zoom,.01,100))return;
 if(v.workspace.anchor&&(!finite(v.workspace.anchor.x)||!finite(v.workspace.anchor.h)))return;
 if(!v.outline||!['kind','order'].includes(v.outline.sort)||typeof v.outline.query!=='string')return;
 if(!v.scroll||!finite(v.scroll.x,0)||!finite(v.scroll.y,0)||!v.timeline||!finite(v.timeline.zoom,.01,1000)||!finite(v.timeline.scrollX,0)||!finite(v.timeline.scrollY,0)||!finite(v.timeline.height,100,2000)||!Array.isArray(v.timeline.collapsed)||v.timeline.collapsed.length>2000||v.timeline.collapsed.some(id=>typeof id!=='string'))return;
 if(!v.loop||!finite(v.loop.from,0)||!finite(v.loop.to,0)||[v.cameraPreview,v.timeline.folded,v.loop.enabled,v.outlines,v.borders,v.chunkStatus,v.reduced,v.overlays].some(x=>typeof x!=='boolean'))return;
 if(!v.environment||typeof v.environment!=='object'||Array.isArray(v.environment)||Object.entries(v.environment).some(([key,x])=>['__proto__','constructor','prototype'].includes(key)||!(['string','boolean'].includes(typeof x)||finite(x))))return;
 if(!v.selection||typeof v.selection.document!=='string'||typeof v.selection.instance!=='string'||v.selection.chunk!==undefined&&typeof v.selection.chunk!=='string')return;
 const w=v.selection.world;if(w&&(typeof w!=='object'||typeof w.composition!=='string'||typeof w.member!=='string'||w.child!==undefined&&typeof w.child!=='string'))return;
 const t=v.selection.timeline;
 if(t){if(t.kind==='key'||t.kind==='track'){if(typeof t.track!=='string'||t.kind==='key'&&(!finite(t.index,0)||!Number.isInteger(t.index)))return;}
 else if(t.kind!=='camera'&&(!['shot','text','fade','beat','command'].includes(t.kind)||typeof t.id!=='string'))return;}
 return v;
}
export function createViewMemory(storage:Pick<Storage,'getItem'|'setItem'>){
 let lastWrite='',lastKey='';
 return{
  lastScene(){try{return storage.getItem(prefix+'scene')??'';}catch{return'';}},
  read(scene:string){try{return parseEditorView(JSON.parse(storage.getItem(prefix+encodeURIComponent(scene))??'null'));}catch{return undefined;}},
  write(scene:string,view:EditorViewSnapshot){
   try{const key=prefix+encodeURIComponent(scene),text=JSON.stringify(view);if(lastKey!==key||lastWrite!==text){storage.setItem(key,text);lastKey=key;lastWrite=text;}if(storage.getItem(prefix+'scene')!==scene)storage.setItem(prefix+'scene',scene);}catch{/* Browser storage is optional. */}
  },
 };
}
