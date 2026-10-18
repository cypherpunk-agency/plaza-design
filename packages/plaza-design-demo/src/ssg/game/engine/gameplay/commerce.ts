import type {GameplayDefinition,GameplayState} from './types';
import {matches} from './validation';
/** Quote and charge share one base; intentional divergence is explicit and diagnosable. */
export function purchaseQuote(def:GameplayDefinition,id:string,state:GameplayState){
 const p=def.purchases?.[id];if(!p)throw new Error('Unknown purchase '+id);
 let quote=p.basePrice,charge=p.basePrice;const modifiers:string[]=[];
 for(const m of p.modifiers??[])if(matches(m.when,state)){modifiers.push(m.id);if(m.scope!=='charge')quote+=m.amount;if(m.scope!=='quote')charge+=m.amount;}
 const valid=[quote,charge].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000);
 const stock=p.stock?Number(state.values?.[p.stock]??def.state?.[p.stock]?.default):Infinity;
 return {quote,charge,modifiers,available:valid&&matches(p.when,state)&&stock>0};
}
/** Mutates a transaction draft only. The session discards the whole draft on any failure. */
export function applyPurchase(def:GameplayDefinition,id:string,state:GameplayState):boolean{
 const p=def.purchases![id],q=purchaseQuote(def,id,state);if(!q.available||state.tokens<q.charge)return false;
 const goods=[...(p.goods??[])];if(p.rotation){const n=Number(state.values![p.rotation.state]);goods.push({item:p.rotation.items[n%p.rotation.items.length],quantity:1});state.values![p.rotation.state]=(n+1)%p.rotation.items.length;}
 state.tokens-=q.charge;
 for(const g of goods){const n=(state.items[g.item]??0)+g.quantity;if(!Number.isSafeInteger(n)||n>1000000)return false;state.items[g.item]=n;}
 if(p.stock)state.values![p.stock]=Number(state.values![p.stock])-1;
 return true;
}
