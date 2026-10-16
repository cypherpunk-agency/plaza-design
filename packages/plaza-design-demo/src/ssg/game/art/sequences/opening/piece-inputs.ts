import type { Properties } from '../../core/composition';
import type { PreparedCharacter } from '../../../runtime/characters';
/** Native pixels before the opening's snapped overall scale and camera zoom. */
export interface PieceCull { x: number; scale: number; facing: 1 | -1; width: number; unculled?:boolean }
export interface PieceInput { props: Properties; cull?: PieceCull; pose?:PreparedCharacter }
export type PieceInputs = Readonly<Record<string, PieceInput>>;
export const pieceNumber = (props: Properties | undefined, key: string, fallback: number) => typeof props?.[key] === 'number' ? props[key] as number : fallback;
export const pieceString = (props: Properties | undefined, key: string, fallback: string) => typeof props?.[key] === 'string' ? props[key] as string : fallback;
export function visiblePoint(c: { W: number; cull?: PieceCull; pose?:PreparedCharacter }, point: number, before: number, after = before) {
  if (!c.cull) return point >= -before && point <= c.W + after;
  if(c.cull.unculled)return true;
  const p = c.cull, a = p.x + (point - before) * p.scale * p.facing, b = p.x + (point + after) * p.scale * p.facing;
  return Math.max(a, b) >= 0 && Math.min(a, b) <= p.width;
}
export function viewportSpan(c:{W:number;cull?:PieceCull}):[number,number]{if(!c.cull)return[0,c.W];if(c.cull.unculled)return[-1e6,1e6];const p=c.cull,a=-p.x/(p.scale*p.facing),b=(p.width-p.x)/(p.scale*p.facing);return[Math.min(a,b),Math.max(a,b)];}
export function strictlyVisiblePoint(c:{W:number;cull?:PieceCull},point:number,pad:number){return c.cull?visiblePoint(c,point,pad):point> -pad&&point<c.W+pad;}
