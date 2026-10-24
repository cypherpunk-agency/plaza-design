/** Pure HUD read models. The runtime owns state and decides when to display them. */
import {ownedModules,type Save} from './save';
import type {EngineNetworkContext} from '../engine/network-context';
export function controlGroups(options:{touch:boolean;jump:boolean;levels:boolean;network:boolean;hackable:boolean}):[string,[string,string][]][] {

    const t = options.touch, jump = options.jump;
    const walk: [string, string][] = t
      ? [['◀ ▶', 'walk'], ...(options.levels ? [['▲ ▼', 'what shows [↑] or [↓]; hold to climb'] as [string, string]] : []), ...(jump ? [['JMP', 'jump'] as [string, string]] : []), ['ACT', 'use what shows [E]; go on talking']]
      : [['← → · A D', 'walk'], ['SHIFT', 'run'], ...(jump ? [['SPACE', 'jump'] as [string, string]] : []), ['E', 'use what shows [E]'], ['ENTER · SPACE', 'go on talking']];
    const deck: [string, string][] = t
      ? [['DECK', 'this deck'], ['>_', 'terminal']]
      : [['ESC', 'this deck; first closes what is open'], ['ENTER', 'terminal'], ['TAB · M', 'city map'], ...(options.network ? [['N', 'net map'] as [string, string]] : [])];
    const hack: [string, string][] = t
      ? [['NOUN', 'tap for verbs; drag an orange dot onto a noun to wire'], ['HACK', 'hack vision'], ['BOARD', 'the board'], ['LOGIC', 'logic parts (in vision)'], ['UNFOLD', 'every circuit (in vision)'], ['DRAG · PINCH', 'pan · zoom (in vision)']]
      : [['NOUN', 'tap for verbs; drag an orange dot onto a noun to wire'], ['H', 'hack vision'], ['B', 'the board'], ['L', 'logic drawer (in vision)'], ['U', 'every circuit unfolded (in vision)'], ['DRAG · WHEEL · 0', 'pan · zoom · reset (in vision)']];
    return [['WALKING', walk], ['THE DECK', deck], ...(options.hackable ? [['HACKING', hack] as [string, [string, string][]]] : [])];
  }

export function ownedSummary(save:Save,keyring:EngineNetworkContext['keyring'],sudo:boolean):[string,string] {

    const s = save;
    const own = 'MODULES ' + (ownedModules(s).join(' ') || '-') + (s.programs.length ? ' · PROGRAMS ' + s.programs.join(' ') : '') + (sudo ? ' · SUDO' : '');
    const keys = s.keyring.map((id) => keyring.get(id)).filter((k) => k?.kind === 'key').map((k) => (/^\S+$/.test(k!.label) ? k!.label : k!.id));
    return [own, keys.length ? 'KEYS ' + keys.join(' ') : ''];
  }
