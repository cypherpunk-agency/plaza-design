/** Review stations (demo/review-stations.json): the review navigator's bookmarks, buttons and remote example come from a document, not from the loop. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {mountRules} from './rules-harness.mts';
import {REVIEW_STATIONS,validateReviewStations,reviewStations,reviewActions,type ReviewStationsDocument} from '../../src/ssg/game/demo/review-stations';
import {mountReviewStationsAuthoring} from '../../src/ssg/game/authoring/review-stations-authoring';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {demoContent} from '../../src/ssg/game/demo';
import {SCENES} from '../../src/ssg/game/scenes';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {BOT_REACTIONS} from '../../src/ssg/game/engine/gameplay/bot-conversations';

const rows=(content:any)=>reviewStations(content).map(s=>[s.scene,s.id,s.label,s.x]);
// the game's own scenes: the stations the old hard-coded rules produced, in the same order
assert.deepEqual(rows(SCENES),[['shop','shop-counter','Shop counter',730],['library','catalog','Library catalog',74],['market','talk-cook','NOODLE COOK',150],['market','talk-fish','FISHMONGER',1062],['market','talk-repair','REPAIRS',1352],['market','talk-sleeper','FIRMWARE VENDOR',1806],['market','fortune','Market fortune',1208],['laundromat','laundry','Laundry counter',124],['beach','meter','Beach meter',236],['beach','mixer','Beach mixer',626],['vehicle-lab','vehicles','Vehicles',224],['vehicle-routes','vehicle-routes','Curves & drops',224]]);
// the Test District: purchases, conversations, devices, wiring first
const demo=demoContent() as any;
assert.deepEqual(rows(demo),[['shop','purchases','Purchases',730],['library','dialogue','Conversations',440],['sandbox','devices','Devices',540],['sandbox','wiring','Wiring & chains',550],['vehicle-lab','vehicles','Vehicles',224],['vehicle-routes','vehicle-routes','Curves & drops',224]]);
const stations=reviewStations(demo),actions=(id:string,list=stations,content=demo)=>reviewActions(content[id],id,list).map(a=>a.id);
assert.deepEqual(actions('shop'),['buy','pricing','guidance']);assert.deepEqual(actions('library'),['librarian','shelfe']);assert.deepEqual(actions('sandbox'),['permissions']);
assert.deepEqual(actions('library',reviewStations(SCENES),SCENES),['catalog'],'the catalog button follows the scene\'s own conversation');assert.deepEqual(actions('market',reviewStations(SCENES),SCENES),[]);
assert.deepEqual(actions('library',[]),[],'without the dialogue station the librarian buttons are gone');
assert.deepEqual(REVIEW_STATIONS.communication.remote,{station:'devices',device:'fan'});
assert.equal(REVIEW_STATIONS.hint,'Jump directly to an example. Your current experiment is preserved.');
// another document, other bookmarks: a person anchor with a fallback, a station that appears only where a conversation exists
const custom=validateReviewStations({...structuredClone(REVIEW_STATIONS),stations:[{id:'only-shop',label:'Only shop',scene:'shop',at:{use:'buy'},prompt:'Try it.'},{id:'anywhere',label:'Desk',at:{use:'buy'},when:{conversation:'demo.desk'},prompt:'Desk.'},...REVIEW_STATIONS.stations.filter(s=>s.id==='dialogue')],actions:[REVIEW_STATIONS.actions[0]],communication:{remote:{station:'only-shop',device:'x'}}});
assert.deepEqual(reviewStations(demo,custom).map(s=>s.id),['only-shop','anywhere','dialogue']);assert.deepEqual(reviewStations(SCENES,custom).map(s=>s.id),['only-shop']);

// validation
const shipped=()=>structuredClone(REVIEW_STATIONS) as any;
for(const [name,mutate] of Object.entries({
 'duplicate station':(d:any)=>{d.stations[1].id=d.stations[0].id;},'two anchors':(d:any)=>{d.stations[0].at.device='lamp';},'no anchor':(d:any)=>{d.stations[0].at={};},
 'label missing without person':(d:any)=>{delete d.stations[0].label;},'talking on a use':(d:any)=>{d.stations[0].at.talking=true;},'station condition on a station':(d:any)=>{d.stations[0].when={station:'devices'};},
 'action runs two':(d:any)=>{d.actions[0].run={use:'a',talk:'b'};},'unknown station in action':(d:any)=>{d.actions[3].when={station:'nowhere'};},'duplicate action':(d:any)=>{d.actions[1].id=d.actions[0].id;},
 'remote to unknown station':(d:any)=>{d.communication.remote.station='nowhere';},'extra field':(d:any)=>{d.code='x';},'blank hint':(d:any)=>{d.hint='';},'two conditions':(d:any)=>{d.stations[0].when={conversation:'a',withoutConversation:'b'};},
})){const bad=shipped();mutate(bad);assert.throws(()=>validateReviewStations(bad),undefined,name);}

// the loop reads the document it is given
const make=(sources:object,content:any,here:string)=>{const game:any=Object.create(Game.prototype);Object.assign(game,{save:newSave(),here,content,sources,botReactions:BOT_REACTIONS,compiledScenes:new Map(),hosts:new Map(),gameplaySessions:new Map(),t:0});return game;};
{const game=make({},demo,'shop'),calls:any[]=[];game.reviewNav={refresh:(...a:any[])=>calls.push(a)};game.refreshReview();assert.deepEqual(calls,[['shop',['buy','pricing','guidance']]]);
 assert.equal(make({reviewStations:custom},demo,'shop').reviewDoc,custom);assert.equal(make({},demo,'shop').reviewDoc,REVIEW_STATIONS);
 const ran:string[]=[];Object.assign(game,{reviewUse:(id:string)=>ran.push('use:'+id),reviewTalk:(id:string)=>ran.push('talk:'+id),reviewActor:(id:string)=>ran.push('actor:'+id)});
 for(const a of REVIEW_STATIONS.actions.filter(a=>['buy','pricing','guidance','librarian'].includes(a.id)))game.reviewRun(a);assert.deepEqual(ran,['use:buy','talk:demo.desk','talk:demo.mission','actor:librarian']);}

// editor controls
const docs=new Map<string,unknown>([['review-stations',shipped()]]),ui=mountRules(mountReviewStationsAuthoring,docs),doc=()=>docs.get('review-stations') as ReviewStationsDocument;
ui.change('Review hint','New hint.');ui.change('Review station','wiring');ui.change('Station label','Wires');ui.change('Station prompt','Try the wires.');ui.change('Station anchor id','button');
ui.click('Add review station');ui.change('Station label','Extra');ui.change('Station anchor kind','person');ui.change('Station anchor id','librarian');ui.change('Station person must have a conversation',true);ui.change('Station falls back to the spawn point',true);ui.change('Station condition','withoutConversation');ui.change('Station condition conversation','catalog');
const wiring=doc().stations.find(s=>s.id==='wiring')!,extra=doc().stations.at(-1)!;
assert.deepEqual([doc().hint,wiring.label,wiring.prompt,wiring.at],['New hint.','Wires','Try the wires.',{device:'button'}]);
assert.deepEqual([extra.label,extra.at,extra.when],['Extra',{person:'librarian',talking:true,fallback:'spawn'},{withoutConversation:'catalog'}]);
ui.change('Review button','guidance');ui.change('Button label','Mission');ui.change('Button runs','actor');ui.change('Button target id','librarian');ui.change('Button condition','conversation');ui.change('Button condition conversation','demo.mission');
const guidance=doc().actions.find(a=>a.id==='guidance')!;assert.deepEqual([guidance.label,guidance.run,guidance.when],['Mission',{actor:'librarian'},{conversation:'demo.mission'}]);
ui.click('Add review button');assert.equal(doc().actions.at(-1)!.id,'button-1');ui.click('Remove review button');assert.equal(doc().actions.length,7);
ui.change('Remote example station','wiring');ui.change('Remote example device','lamp');assert.deepEqual(doc().communication.remote,{station:'wiring',device:'lamp'});
ui.change('Review station','devices');ui.click('Remove review station');assert(!doc().stations.some(s=>s.id==='devices'),'an unreferenced station can be removed');
assert(ui.saved.every(s=>s.id==='review-stations'));
for(const referenced of ['wiring','dialogue']){const guard=structuredClone(doc());ui.change('Review station',referenced);ui.click('Remove review station');assert.deepEqual(doc(),guard,'the remote example (wiring) or a button (dialogue) still needs '+referenced);assert(ui.host.children[0].textContent);}

// registered source document, protected save
const entry=sourceDocuments.find(d=>d.id==='review-stations')!;assert(entry);assert.equal(entry.kind,'rules');assert.equal(entry.file,'demo/review-stations.json');
const evidence=path.resolve('../../.game-test-output/review-stations');fs.mkdirSync(evidence,{recursive:true});const root=fs.mkdtempSync(path.join(evidence,'run-'));
for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),original=fs.readFileSync(path.join(root,entry.file),'utf8');
const saved=store.save([{id:'review-stations',revision:store.read('review-stations').revision,value:doc()}]);
assert.equal((new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).read('review-stations').value as ReviewStationsDocument).hint,'New hint.');
const bad=doc();bad.communication.remote.station='nowhere';assert.throws(()=>store.save([{id:'review-stations',revision:store.read('review-stations').revision,value:bad}]));
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(path.join(root,entry.file),'utf8'),original);
// game.ts and the navigator hold no review ids
const gameSource=fs.readFileSync('src/ssg/game/runtime/game.ts','utf8')+fs.readFileSync('src/ssg/game/demo/review-navigator.ts','utf8');
assert(!/demo\.desk|workshop\.operator|'fan'|reviewJump\('devices'\)|Buy at counter|Hatch permissions/.test(gameSource),'no review ids or button labels in the loop or the navigator');
console.log('Review stations PASS: stations and buttons equal the old rules, the loop reads the given document, editor controls, protected save and undo.');
process.exit(0);
