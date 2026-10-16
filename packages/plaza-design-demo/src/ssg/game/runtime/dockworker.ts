/** Prototype player presentation controller. Keep appearance identity outside painting. */
import { prepareCharacter, type Character } from './characters';
const worker: Character = { seed: 7303, x: 0, look: { body: 'avg', garb: 'hivis', hair: 'short', top: '#b77a29', bottom: '#303746' }, act: 'stand' };
export function prepareDockworker(wx:number,face:number,moving:boolean,t:number) {
  worker.x=wx;worker.facing=face<0?-1:1;worker.act=moving?'walk':'stand';
  return prepareCharacter(worker,t);
}
