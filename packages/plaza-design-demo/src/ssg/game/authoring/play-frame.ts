import {nativeGameplayScene} from './native-gameplay-scenes';
import {demoContent} from '../demo';
import { touchControls } from '../ui/touch-controls';
/** Trusted entry, executed only in a disposable opaque-origin sandbox. */
import { Game } from '../runtime/game';
import { EDITOR_PLAY, SAVE_KEY } from '../runtime/mode';
import { gameStorage, capturePrivateStorage, restorePrivateStorage } from '../runtime/storage';
import { takeResume } from '../runtime/slots';
import {fixtureSave,validatePlayFixtures} from './play-fixtures';
import {sandboxScene} from '../scenes/sandbox';
import {validateSandboxBehavior} from './behavior-validation';
import {validateSandboxComposition} from '../scenes/sandbox/composition';
import {setOverride} from '../world/weather';
import {gameplayScene} from './gameplay-scenes';

if (!EDITOR_PLAY) throw new Error('Editor play requires its dedicated frame');
let game: Game | undefined, started = false;
const send = (type: string, value?: unknown) => parent.postMessage({channel:'editor-play',type,value}, '*');
window.addEventListener('editor-runtime-reload', () => {
  const resumed=takeResume();
  if(!resumed&&gameStorage.getItem(SAVE_KEY))game?.checkpoint();
  send('restart',capturePrivateStorage());
});
window.addEventListener('message', async event => {
  if (event.source !== parent || event.data?.channel !== 'editor-play' || event.data.type !== 'start' || started) return;
  started = true;
  try {
    const {fixture,composition,gameplay,sceneDocument,behavior,memory,fonts,district} = event.data.value;
    const f=validatePlayFixtures({version:1,fixtures:[fixture]},true).fixtures[0];
    const authored=f.scene==='sandbox'?undefined:nativeGameplayScene(f.scene)??gameplayScene(f.scene);
    if(district&&!['shop','library','sandbox'].includes(f.scene))throw new Error('Demo entry outside district');
    const districtContent=district?demoContent(district):undefined;
    const scene=districtContent?.[f.scene as 'shop'|'library'|'sandbox']??(authored&& !('validateScene'in authored)?authored.definition(composition,authored.validateGameplay(gameplay)):authored?authored.definition(composition,{},{},authored.validateScene(sceneDocument,authored.validateGameplay(gameplay)),authored.validateGameplay(gameplay)):sandboxScene(validateSandboxComposition(composition),{},{},validateSandboxBehavior(behavior)));
    if(f.spawn!==null){if(f.spawn>scene.width-12)throw new Error('Starting X is outside the scene');scene.spawn=f.spawn;}
    if(f.weather!=='forecast')setOverride('city',f.weather);
    for(const font of fonts ?? []) { const face=new FontFace('IBM Plex Mono',font.bytes,{weight:String(font.weight)});await face.load();document.fonts.add(face); }
    await Promise.all([400,500,600,700].map(weight=>document.fonts.load(`${weight} 16px "IBM Plex Mono"`)));
    await document.fonts.ready;
    if(memory)restorePrivateStorage(memory);
    if(!gameStorage.getItem(SAVE_KEY)){const fresh=fixtureSave(f);if(scene.data&&Object.keys(f.state).length)fresh.scenes[f.scene]={state:{...scene.data.state,...f.state},goals:[],links:scene.data.cables.map(c=>({from:c.from,to:c.to,verb:c.verb})),logic:[]};gameStorage.setItem(SAVE_KEY,JSON.stringify(fresh));}
    document.documentElement.classList.add('game-mode');if(f.scene==='harborShift')document.documentElement.classList.add('shift-prototype');
    document.body.innerHTML='<section class="demo-window"><header hidden></header><footer hidden></footer><div id="input-host"></div></section>';
    const windowEl=document.querySelector<HTMLElement>('.demo-window')!;
    game=new Game({windowEl,header:windowEl.querySelector('header')!,footer:windowEl.querySelector('footer')!,inputHost:document.getElementById('input-host')!,onExit:()=>send('quit'),setNodes:()=>{},setScene:()=>{}},districtContent??{[f.scene]:scene},f.clock,!!district);
    if(matchMedia('(pointer: coarse)').matches){document.documentElement.classList.add('touch');touchControls(windowEl);}
    game.start(f.scene);
    send('running',game.inspect());
    setInterval(()=>send('state',game!.inspect()),250);
  } catch(error) { send('error',error instanceof Error?error.message:String(error)); }
});
send('ready');
