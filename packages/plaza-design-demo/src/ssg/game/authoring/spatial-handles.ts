/** Accessible editor handles positioned from the captured frame, sharing canvas input/history. */
import type {PreviewResult} from './contracts';
export function mountSpatialHandles(parent:HTMLElement,canvas:HTMLCanvasElement){
 // Selected edit handles take precedence over camera/chunk border hit areas (z-index 3).
 // The host remains pointer-transparent everywhere except its visible handles.
 const host=document.createElement('div');host.className='spatial-handles';Object.assign(host.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden',zIndex:'4'});parent.append(host);
 const buttons=new Map<string,HTMLButtonElement>();
 return{update(handles:PreviewResult['handles'],visible:boolean){
  host.hidden=!visible;const keep=new Set<string>(),frame=parent.getBoundingClientRect(),rect=canvas.getBoundingClientRect();
  for(const handle of visible?handles??[]:[]){
   const key=JSON.stringify([handle.instance,handle.id]);keep.add(key);let button=buttons.get(key);
   if(!button){button=document.createElement('button');button.type='button';button.className='spatial-handle';Object.assign(button.style,{position:'absolute',width:'10px',height:'10px',minWidth:'0',minHeight:'0',boxSizing:'border-box',margin:'0',padding:'0',border:'1px solid #5aa2ff',borderRadius:'1px',background:'#161616',pointerEvents:'auto',transform:'translate(-50%,-50%)'});
    button.onpointerdown=event=>canvas.onpointerdown?.call(canvas,event);
    button.onkeydown=event=>{if(event.key==='Escape')canvas.onkeydown?.call(canvas,event);};
    host.append(button);buttons.set(key,button);
   }
   button.setAttribute('aria-label','Resize · '+handle.label);button.title=handle.label+' · drag to edit '+handle.fields.join(', ');button.style.cursor=handle.cursor;
   button.style.left=rect.left-frame.left+handle.x*rect.width/canvas.width+'px';button.style.top=rect.top-frame.top+handle.y*rect.height/canvas.height+'px';
  }
  for(const[key,button]of buttons)if(!keep.has(key)){button.remove();buttons.delete(key);}
 },dispose(){host.remove();buttons.clear();}};
}
