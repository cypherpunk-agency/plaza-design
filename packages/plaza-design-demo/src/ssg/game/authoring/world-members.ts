/** Editing addresses refer to authored membership, never runtime residency or asset identity. */
import {validateWorldCompositions,worldEndpointPosition,type WorldCompositions,type WorldComposition,type WorldMember,type WorldPosition,type WorldConnection,type WorldCompositionContext} from '../world/compositions';

export interface WorldMemberAddress {composition:string;member:string;child?:string}
export interface WorldMemberRow {address:WorldMemberAddress;member:WorldMember;group?:string;children:WorldMemberRow[]}
export function worldMemberRows(source:WorldCompositions,composition:string):WorldMemberRow[]{
 const definition=source.compositions[composition];if(!definition)throw Error('Unknown composition '+composition);
 return definition.members.map(member=>({address:{composition,member:member.id},member,children:member.group?source.groups[member.group].members.map(child=>({address:{composition,member:member.id,child:child.id},member:child,group:member.group,children:[]})):[]}));
}
export function worldMemberAt(source:WorldCompositions,address:WorldMemberAddress){
 const composition=source.compositions[address.composition];if(!composition)throw Error('Composition is no longer available.');
 const parent=composition.members.find(m=>m.id===address.member);if(!parent)throw Error('Member is no longer mounted.');
 const definition:WorldComposition=address.child&&parent.group?source.groups[parent.group]:composition;
 const member=address.child?definition.members.find(m=>m.id===address.child):parent;if(!member)throw Error('Chunk is no longer in this group.');
 return{definition,member,parent,group:address.child?parent.group:undefined};
}
export function addressForChunk(source:WorldCompositions,composition:string,chunk:string):WorldMemberAddress|undefined{
 for(const row of worldMemberRows(source,composition)){if(row.member.chunk===chunk)return row.address;const child=row.children.find(c=>c.member.chunk===chunk);if(child)return child.address;}
}
/** Explicitly moving linked members keeps authored endpoints together. Full graph validation
 * still owns constraints to other compositions, external seams and sequence/checkpoint references. */
export function linkedWorldMembers(definition:WorldComposition,id:string):string[]{
 const ids=new Set([id]);let size=0;while(size!==ids.size){size=ids.size;for(const c of definition.connections)if(ids.has(c.a.member)||ids.has(c.b.member)){ids.add(c.a.member);ids.add(c.b.member);}}return [...ids];
}
export function moveWorldMember(source:WorldCompositions,address:WorldMemberAddress,at:WorldPosition,linked=false):WorldCompositions{
 if(!Number.isFinite(at.x)||!Number.isFinite(at.h))throw Error('X and Y must be finite numbers.');
 const next=structuredClone(source),{definition,member}=worldMemberAt(next,address),dx=at.x-member.placement.x,dh=at.h-member.placement.h;
 const ids=new Set(linked?linkedWorldMembers(definition,member.id):[member.id]);
 for(const m of definition.members)if(ids.has(m.id)){m.placement.x+=dx;m.placement.h+=dh;}
 return validateWorldCompositions(next);
}
export function unmountWorldMember(source:WorldCompositions,address:WorldMemberAddress,disconnect=false):WorldCompositions{
 const next=structuredClone(source),{definition,member}=worldMemberAt(next,address);
 const connections=definition.connections.filter(c=>c.a.member===member.id||c.b.member===member.id);
 const exports='exports'in definition?definition.exports as Record<string,{member:string}>:undefined;
 const exported=Object.entries(exports??{}).filter(([,e])=>e.member===member.id);
 if(exported.length)throw Error('This chunk supplies group endpoints: '+exported.map(([name])=>name).join(', ')+'. Reassign these endpoints before unmounting it.');
 if(connections.length&&!disconnect)throw Error('Unmounting also removes connections: '+connections.map(c=>c.id).join(', ')+'. Confirm disconnecting them.');
 definition.members=definition.members.filter(m=>m.id!==member.id);definition.connections=definition.connections.filter(c=>c.a.member!==member.id&&c.b.member!==member.id);
 return validateWorldCompositions(next);
}
export function mountWorldMember(source:WorldCompositions,composition:string,selection:{chunk:string}|{group:string},at:WorldPosition):{source:WorldCompositions;address:WorldMemberAddress}{
 const next=structuredClone(source),definition=next.compositions[composition];if(!definition)throw Error('Choose a composition first.');
 const base=('chunk'in selection?selection.chunk:selection.group).toLowerCase().replace(/[^a-z0-9-]+/g,'-');let id=base,n=2;while(definition.members.some(m=>m.id===id))id=base+'-'+n++;
 definition.members.push({id,...selection,placement:{...at}});
 return{source:validateWorldCompositions(next),address:{composition,member:id}};
}
/** Align before storing a new connection; existing connected members move as a unit. */
export function alignWorldConnection(source:WorldCompositions,definition:WorldComposition,connection:WorldConnection,context:WorldCompositionContext){
 const a=worldEndpointPosition(source,definition,connection.a,context),b=worldEndpointPosition(source,definition,connection.b,context),dx=a.anchor.x-b.anchor.x,dh=a.anchor.h-b.anchor.h;
 if(Math.abs(dx)<.001&&Math.abs(dh)<.001)return;
 const linked=linkedWorldMembers(definition,connection.b.member);if(linked.includes(connection.a.member))throw Error('These members are already linked. Reassign the endpoints or disconnect the old route before aligning.');
 for(const m of definition.members)if(linked.includes(m.id)){m.placement.x+=dx;m.placement.h+=dh;}
}
