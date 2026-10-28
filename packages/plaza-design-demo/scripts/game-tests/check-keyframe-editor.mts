import {WorkbenchPlayback} from '../../src/ssg/game/authoring/workbench-playback';
import assert from 'node:assert/strict';
import {ArtRegistry,type ChunkDocument} from '../../src/ssg/game/art/core/composition';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {sequenceProgram} from '../../src/ssg/game/art/core/sequence';
import {evaluateTimeline} from '../../src/ssg/game/art/core/timeline';
import {validateSequence} from '../../src/ssg/game/art/core/sequence';
import {generationCount,fieldIsContinuous} from '../../src/ssg/game/art/core/fields';
import {setKeyAtPlayhead} from '../../src/ssg/game/authoring/keyframe-control';
import {moveKey,frameTime} from '../../src/ssg/game/authoring/timeline-view';
import {animationShortcut} from '../../src/ssg/game/authoring/animation-shortcuts';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';

const art=new ArtRegistry(),composition:ChunkDocument={version:1,scene:'keyframe-test',instances:[],sequence:{id:'arrival',duration:4,shots:[],text:[],fades:[],beats:[],tracks:[{id:'camera',target:{kind:'camera',property:'x'},keys:[{time:0,value:0},{time:1,value:10},{time:3,value:30}]}]}};
const model=new ComposerModel(art);model.load([{id:composition.scene,kind:'composition',revision:'source',value:composition}]);
const countField=generationCount({kind:'number',label:'Count',default:2,min:0,max:10,animatable:true});
art.register({type:'count-fixture',version:1,label:'Count',category:'test',fields:{count:countField},parts:[],bounds:()=>({x:0,h:0,w:0,tall:0}),anchors:()=>({}),draw(){}});
assert.throws(()=>art.properties('count-fixture',{count:2.5}),/invalid number/);
const integerDoc:ChunkDocument={version:1,scene:'integer-keys',instances:[{id:'generator',type:'count-fixture',props:{count:2},placement:{x:0,h:0},layer:'logic',order:0}],sequence:{id:'counts',duration:1,shots:[],text:[],fades:[],beats:[],tracks:[]}};
const integerTarget={kind:'property' as const,instance:'generator',property:'count'};
setKeyAtPlayhead(integerDoc.sequence!,integerTarget,0,2,!fieldIsContinuous(countField));
setKeyAtPlayhead(integerDoc.sequence!,integerTarget,1,4,!fieldIsContinuous(countField));
const integerContext={registry:art,compositions:{'integer-keys':integerDoc}};
validateSequence(integerDoc,integerContext);
assert.equal(evaluateTimeline(sequenceProgram(integerContext.compositions),'counts',.5,integerContext).composition.instances[0].props.count,2,'Counts hold their integer value between keys');
integerDoc.sequence!.tracks[0].keys[0].ease='linear';
assert.throws(()=>validateSequence(integerDoc,integerContext),/discrete tracks require hold/);
integerDoc.sequence!.tracks[0].keys[0].ease='hold';integerDoc.sequence!.tracks[0].keys[1].value=4.5;
assert.throws(()=>validateSequence(integerDoc,integerContext),/invalid keyframe/);
const move=(index:number,time:number)=>model.edit(composition.scene,'Move keyframe',value=>{const c=value as ChunkDocument,program=sequenceProgram({[c.scene]:c});moveKey(program.sequences[0],'camera',index,time);c.sequence!.tracks=program.sequences[0].tracks;return c;});
move(1,3.51);const moved=model.get(composition.scene).value as ChunkDocument;
assert.deepEqual(moved.sequence!.tracks[0].keys.map(k=>k.time),[0,3,3.5166666666666666]);
assert.equal(evaluateTimeline(sequenceProgram({[moved.scene]:moved}),'arrival',3.5166666666666666,{registry:art,compositions:{[moved.scene]:moved}}).camera.x,10,'retiming affects native temporal evaluation');
const snapshot=model.list();assert.throws(()=>move(2,3),'same-time collision rejects');assert.deepEqual(model.list(),snapshot,'rejected move retains source');
model.undo();assert.deepEqual(model.get(composition.scene).value,composition);model.redo();assert.deepEqual(model.get(composition.scene).value,moved);
const fresh=new ComposerModel(art);fresh.load([{id:composition.scene,kind:'composition',revision:'source',value:composition}]);fresh.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),fresh.list()));assert.deepEqual(fresh.get(composition.scene).value,moved);
assert.equal(frameTime(-5,4),0);assert.equal(frameTime(7,4),4);assert.equal(frameTime(1.019,4),61/60);

Object.assign(globalThis,{document:{querySelector:()=>null}});
const key=(key:string,extra:Partial<KeyboardEvent>={})=>animationShortcut({key,target:{closest:()=>null},...extra} as unknown as KeyboardEvent);
assert.deepEqual(key('Home'),{boundary:'start'});assert.deepEqual(key('End'),{boundary:'end'});
assert.equal(key('Home',{ctrlKey:true}),undefined);assert.equal(key('End',{target:{closest:()=>({})} as unknown as EventTarget}),undefined);
assert.equal(key(' '),'toggle');assert.equal(key(' ',{repeat:true}),undefined);assert.deepEqual(key(','),{frames:-1});assert.deepEqual(key('.'),{frames:1});assert.deepEqual(key('ArrowLeft'),{seconds:-1});assert.deepEqual(key('ArrowRight',{shiftKey:true}),{seconds:5});assert.equal(key('ArrowRight',{altKey:true}),undefined);assert.equal(key(' ',{defaultPrevented:true}),undefined);assert.equal(key('.', {target:{closest:()=>({})} as unknown as EventTarget}),undefined);
console.log('Keyframe editing: frame snapping/reordering, collision rejection, native evaluation, atomic history/bundle, shared transport mapping and text-input/modifier guards PASS');

const dirty=fresh.list();fresh.discard();assert.equal(fresh.dirty(),false);assert.deepEqual(fresh.get(composition.scene).value,composition);fresh.undo();assert.deepEqual(fresh.list(),dirty,'discard is one undoable transaction');fresh.redo();assert.equal(fresh.dirty(),false);

const clock=new WorkbenchPlayback(4);clock.speed=2;clock.play();clock.tick(1000);clock.tick(1250);assert.equal(clock.time,.5,'2x affects playback elapsed time');clock.step();assert.equal(clock.time,.5+1/60,'single frame step is independent of playback speed');clock.dispose();
