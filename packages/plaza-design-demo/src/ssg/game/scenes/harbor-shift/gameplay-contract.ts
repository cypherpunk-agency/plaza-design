import type { Source } from '../../engine/gameplay/types';
import { validateGameplay } from '../../engine/gameplay/validation';

/** Runtime/editor compatibility boundary. These identifiers are used by existing saves and interactions. */
const flags = ['assigned','parcel','delivered','case','returned','trolley','inspected','released','parked','checked','done'].map(id=>'shift:'+id);
const items = ['shift.tag','shift.parcel','shift.case'];
const events = ['assignment.accepted','work-tag.issued','parcel.collected','parcel.transferred','delivery.completed','case.collected','case.returned','trolley.assigned','clamp.discovered','clamp.released','trolley.parked','shift.checked-out','wages.paid','statement.read'];
const sources:Record<string,Source[]> = {
  'shift.accept':['conversation'], 'shift.issue-tag':['system'], 'shift.replace-tag':['interaction'],
  'shift.collect':['interaction'], 'shift.deliver':['interaction','signal'], 'shift.record-delivery':['system'],
  'shift.collect-case':['interaction'], 'shift.return-case':['interaction'], 'shift.assign-trolley':['conversation'],
  'shift.inspect':['interaction'], 'shift.release':['interaction'], 'shift.park':['interaction'],
  'shift.checkout':['interaction'], 'shift.credit-wages':['system'], 'shift.statement':['interaction'],
};
function same(actual:readonly string[],expected:readonly string[],name:string){
  if(JSON.stringify([...actual].sort())!==JSON.stringify([...expected].sort()))throw new Error('Harbor gameplay: '+name+' IDs/permissions are protected');
}
export function validateShiftGameplay(value:unknown){
  const doc=validateGameplay(value);if(doc.native)throw new Error('Native bindings are not registered for this gameplay document');
  same(doc.flags,flags,'flag');same(doc.items,items,'item');same(doc.events,events,'event');
  same(Object.keys(doc.commands),Object.keys(sources),'command');
  for(const[id,allowed]of Object.entries(sources))same(doc.commands[id].sources,allowed,id);
  same(Object.keys(doc.conversations),['supervisor','mara'],'conversation');
  for(const node of ['offer','trolley-offer']){
    if(!doc.conversations.supervisor.nodes[node]?.choices?.some(c=>c.id==='accept'))throw new Error('Harbor gameplay: retain the '+node+' accept choice used by the ordinary interaction');
  }
  const seen=new Set<string>();
  for(const reaction of doc.reactions){const key=reaction.event+'>'+reaction.command;if(seen.has(key))throw new Error('Duplicate gameplay reaction');seen.add(key);}
  return doc;
}
