import json
from pathlib import Path
root=Path('packages/plaza-design-demo');base=Path('.scene-system/all-game-baseline-2026-10-18/source/scenes')
for scene,id,key in [('yard','hinge','gateAllowed'),('sandbox','unit7','lampOn')]:
 folder=root/'src/ssg/game/scenes'/scene;fixture=root/'scripts/scene-system/fixtures'/f'{scene}-conversation-baseline.json'
 gp=json.loads((folder/'gameplay.json').read_text(encoding='utf-8'));original=json.loads((base/scene/'devices.json').read_text(encoding='utf-8'));dialogue=original['dialogue'][id]
 if id in gp['conversations'] or fixture.exists():raise Exception('Refusing to overwrite extraction')
 state=scene+'.'+key;gp.setdefault('state',{})[state]={'owner':scene,'lifetime':'save','type':'boolean','default':original['state'][key]};gp['native']={'state':{state:key},'verbs':[],'events':{},'goals':{},'wires':original['cables'] if scene=='yard' else []}
 if scene=='sandbox':del gp['native']['wires']
 nodes={}
 def convert(node,node_id):
  result={'speaker':dialogue['speaker'],'pages':[node['text']]}
  if 'do' in node:
   command=scene+'.'+id+'.'+node_id;actions=[]
   for action in node['do']:
    if action.get('set')==key:actions.append({'state':state,'set':action['to']})
    elif 'goal' in action:
     event=scene+'.'+action['goal'];gp['events'].append(event);gp['native']['goals'][event]=action['goal'];actions.append({'emit':event})
    else:raise Exception('Unsupported action')
   gp['commands'][command]={'sources':['conversation'],'actions':actions};result['onEnter']=command
  if 'choices' in node:result['choices']=[{'id':'choice-'+str(i+1),'label':c[0],'next':c[1]} for i,c in enumerate(node['choices'])]
  return result
 for node_id,value in dialogue['nodes'].items():
  variants=value if isinstance(value,list) else [value]
  assert 'if' not in variants[-1]
  nodes[node_id]=convert(variants[-1],node_id);routes=[]
  for i,node in enumerate(variants[:-1]):
   assert node['if']==key
   target=node_id+'-variant-'+str(i);nodes[target]=convert(node,target);routes.append({'when':{'state':state,'is':True},'node':target})
  if routes:nodes[node_id]['redirect']=routes
 free=dialogue['free'];gp['conversations'][id]={'sayCommand':dialogue['sayCmd'],'entry':[{'node':dialogue['start']}],'nodes':nodes,'free':{'containsAny':free['match'].split('|'),'next':free['goto'],'miss':free['miss'],'retry':free['retry'],'retryNext':free['retryGoto']}}
 devices=json.loads((folder/'devices.json').read_text(encoding='utf-8'));del devices['dialogue'][id];devices['cables']=[] if scene=='yard' else original['cables']
 for path,value in [(fixture,{'version':1,'dialogue':dialogue,'cables':original['cables'],'initialState':original['state']}),(folder/'gameplay.json',gp),(folder/'devices.json',devices)]:path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Extracted shared native commands:',scene,id)
