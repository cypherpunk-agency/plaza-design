/** Stall-specific back displays. Runtime scene composition is data-owned. */
import type {StallSpec} from './construction';
import { brokenScreen,menuBoard } from '../signage/screens';
export const drawNoodleMenu: NonNullable<StallSpec['back']> = (x, v, p) => menuBoard(x, v, { x: p.x + p.w * 0.7, h: p.h0 + 8, w: 54, tall: 40, title: 'MENU', items: [['NOODLES', '2T'], ['OTHER', '1T'], ['BROTH', '1T'], ['TEA', '1T']], phase: 30 });
export const drawSaleScreen: NonNullable<StallSpec['back']> = (x, v, p) => brokenScreen(x, v, { x: p.x + p.w / 2, h: p.h0 + 18, w: 46, tall: 28, ghost: 'SALE', seed: 9 });
