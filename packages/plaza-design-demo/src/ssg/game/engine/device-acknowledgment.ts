/** Explicit device response acknowledgment. No timer, state/save ownership or automatic continuation. */
export type AcknowledgmentCancel='dismissed'|'replaced'|'scene-hidden'|'reset'|'disposed';
export interface DeviceAcknowledgmentRequest {id:string;from:string;speaker:string;pages:readonly string[];height?:number;tone?:'ok'|'err'|'dim'}
export class DeviceAcknowledgment {
 readonly request:Readonly<DeviceAcknowledgmentRequest>;
 private index=0;private active=true;private rendered=false;
 constructor(request:DeviceAcknowledgmentRequest,private complete:()=>void,private canceled:(reason:AcknowledgmentCancel)=>void=()=>{},private changed:()=>void=()=>{},private enabled:()=>boolean=()=>true){
  if(!request.id.trim()||!request.from.trim()||!request.speaker.trim()||!request.pages.length||request.pages.length>32||request.pages.some(p=>typeof p!=='string'||!p.trim()||p.length>2000)||request.height!==undefined&&(!Number.isFinite(request.height)||request.height<0||request.height>10000))throw Error('Invalid device acknowledgment');
  this.request=Object.freeze({...request,pages:Object.freeze([...request.pages])});
 }
 get pending(){return this.active;}get page(){return this.index;}get text(){return this.request.pages[this.index];}get finalPage(){return this.index===this.request.pages.length-1;}get ready(){return this.active&&this.rendered&&this.enabled();}
 presented(visible:boolean){this.rendered=visible&&this.active;}
 advance(){if(!this.ready)return false;this.rendered=false;if(this.finalPage){this.active=false;this.changed();this.complete();}else{this.index++;this.changed();}return true;}
 cancel(reason:AcknowledgmentCancel='dismissed'){if(!this.active)return false;this.active=false;this.rendered=false;this.changed();try{this.canceled(reason);}catch{/* cancellation must not break scene teardown */}return true;}
}
