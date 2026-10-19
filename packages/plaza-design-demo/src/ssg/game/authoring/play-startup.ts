/** Parent-side observations only: a loaded iframe does not prove its game script ran. */
export type PlayStartupPhase='preparing-fonts'|'navigating'|'loading-runtime'|'runtime-ready'|'starting-game'|'running'|'failed'|'stopped';
export type PlayStartupWait='fonts'|'document-load'|'runtime-script'|'runtime-ready'|'start-delivery'|'running'|null;
export interface PlayStartupSnapshot {attempt:number;scene:string;entry:string;phase:PlayStartupPhase;waiting:boolean;waitingFor:PlayStartupWait;events:{event:string;elapsedMs:number;detail?:string}[]}
export class PlayStartup {
 private phase:PlayStartupPhase='preparing-fonts';private waiting=false;private fonts=false;private documentLoaded=false;private parser=false;private evaluating=false;private ready=false;private sent=false;private began:number;private events:PlayStartupSnapshot['events']=[];
 constructor(private identity:Pick<PlayStartupSnapshot,'attempt'|'scene'|'entry'>,private now:()=>number=()=>performance.now()){this.began=now();this.record('preparing-fonts');}
 private get closed(){return this.phase==='failed'||this.phase==='stopped';}
 private record(event:string,detail?:string){this.events.push({event,elapsedMs:Math.max(0,Math.round(this.now()-this.began)),...(detail?{detail:detail.slice(0,2000)}:{})});if(this.events.length>24)this.events.shift();}
 fontsReady(){if(this.closed||this.fonts)return;this.fonts=true;this.record('fonts-ready');}
 navigate(){if(this.closed)return;this.phase='navigating';this.record('navigation-requested');}
 loaded(){if(this.closed||this.documentLoaded)return;this.documentLoaded=true;if(this.phase==='navigating')this.phase='loading-runtime';this.record('document-load-observed');}
 probe(value:unknown){if(this.closed||!value||typeof value!=='object'||Array.isArray(value))return false;const row=value as Record<string,unknown>;if(Object.keys(row).some(k=>!['stage','detail'].includes(k))||typeof row.stage!=='string'||!['parser-started','document-parsed','runtime-evaluating','runtime-script-loaded','runtime-script-error','csp-violation','runtime-error','runtime-rejection'].includes(row.stage)||row.detail!==undefined&&typeof row.detail!=='string')return false;
 if(row.stage==='parser-started'||row.stage==='document-parsed')this.parser=true;if(row.stage==='runtime-evaluating'||row.stage==='runtime-script-loaded')this.evaluating=true;if(this.phase==='navigating')this.phase='loading-runtime';this.record(row.stage,row.detail as string|undefined);return true;}
 runtimeReady(){if(this.closed||this.ready)return false;this.ready=true;this.phase='runtime-ready';this.record('runtime-ready');return true;}
 startSent(){if(this.closed||!this.ready||this.sent)return;this.sent=true;this.phase='starting-game';this.record('start-delivered');}
 running(){if(this.closed||!this.sent)return false;if(this.phase!=='running'){this.phase='running';this.waiting=false;this.record('running');}return true;}
 wait(){if(this.closed||this.phase==='running'||this.waiting)return;this.waiting=true;this.record('wait-threshold',this.waitingFor()??undefined);}
 fail(error:unknown){if(this.closed)return;this.phase='failed';this.waiting=false;this.record('error',error instanceof Error?error.message:String(error));}
 stop(){if(this.closed)return;this.phase='stopped';this.waiting=false;this.record('stopped');}
 private waitingFor():PlayStartupWait {if(this.closed||this.phase==='running')return null;if(!this.fonts)return 'fonts';if(!this.documentLoaded&&!this.parser&&!this.evaluating&&!this.ready)return 'document-load';if(this.parser&&!this.evaluating&&!this.ready)return 'runtime-script';if(!this.ready)return 'runtime-ready';return this.sent?'running':'start-delivery';}
 snapshot():PlayStartupSnapshot{return{...this.identity,phase:this.phase,waiting:this.waiting,waitingFor:this.waitingFor(),events:this.events.map(e=>({...e}))};}
}
export function playStartupWaitingMessage(snapshot:PlayStartupSnapshot){const what:Record<Exclude<PlayStartupWait,null>,string>={fonts:'game fonts', 'document-load':'the isolated frame document to load','runtime-script':'the game runtime script to execute','runtime-ready':'the game runtime ready message','start-delivery':'the starting snapshot to be delivered',running:'the game to report running'};return 'Still waiting for '+(snapshot.waitingFor?what[snapshot.waitingFor]:'the game')+'. You can keep waiting or Stop to return to editing. See Debug for startup observations.';}
