/** Temporary pointer listeners belong to the layer/panel that started the gesture. */
export class PointerGesture {
  private current?:()=>void;
  cancel(){this.current?.();}
  start(start:PointerEvent,move:(e:PointerEvent)=>void,finish:(e:PointerEvent)=>void,canceled:()=>void=()=>{}){
    this.cancel();let active=true;
    const release=()=>{if(!active)return;active=false;window.removeEventListener('pointermove',moving);window.removeEventListener('pointerup',ending);window.removeEventListener('pointercancel',canceling);if(this.current===cancel)this.current=undefined;};
    const cancel=()=>{if(!active)return;release();canceled();};
    const owns=(e:PointerEvent)=>e.pointerId===start.pointerId;
    const moving=(e:PointerEvent)=>{if(active&&owns(e))move(e);};
    const ending=(e:PointerEvent)=>{if(!active||!owns(e))return;release();finish(e);};
    const canceling=(e:PointerEvent)=>{if(owns(e))cancel();};
    this.current=cancel;window.addEventListener('pointermove',moving);window.addEventListener('pointerup',ending);window.addEventListener('pointercancel',canceling);
  }
}
