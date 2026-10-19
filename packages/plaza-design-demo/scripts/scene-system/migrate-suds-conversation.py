import json
from pathlib import Path
root=Path('packages/plaza-design-demo');r=root/'src/ssg/game';folder=r/'scenes/laundromat';fixture=root/'scripts/scene-system/fixtures/laundromat-conversation-baseline.json'
gp=json.loads((folder/'gameplay.json').read_text(encoding='utf-8'));original=json.loads(Path('.scene-system/all-game-baseline-2026-10-18/source/scenes/laundromat/devices.json').read_text(encoding='utf-8'));dialogue=original['dialogue']['suds']
if 'suds' in gp['conversations'] or fixture.exists():raise Exception('Refusing to overwrite extraction')
gp['flags']=['laundromat:jacket','laundromat:tripped'];gp['native']={'state':{},'reads':{'laundromat:jacket':'jacket','laundromat:tripped':'trips'},'verbs':[],'events':{},'goals':{}}
nodes={}
def convert(n):
 assert 'do' not in n
 return {'speaker':dialogue['speaker'],'pages':[n['text']],**({'choices':[{'id':'choice-'+str(i+1),'label':c[0],'next':c[1]} for i,c in enumerate(n['choices'])]} if 'choices'in n else {})}
for id,value in dialogue['nodes'].items():
 variants=value if isinstance(value,list) else [value];assert 'if' not in variants[-1];nodes[id]=convert(variants[-1]);routes=[]
 for i,n in enumerate(variants[:-1]):
  target=id+'-variant-'+str(i);nodes[target]=convert(n);routes.append({'when':{'flag':{'jacket':'laundromat:jacket','trips':'laundromat:tripped'}[n['if']]},'node':target})
 if routes:nodes[id]['redirect']=routes
free=dialogue['free'];gp['conversations']['suds']={'sayCommand':dialogue['sayCmd'],'entry':[{'node':dialogue['start']}],'nodes':nodes,'free':{'containsAny':free['match'].split('|'),'next':free['goto'],'miss':free['miss'],'retry':free['retry'],'retryNext':free['retryGoto']}}
devices=json.loads((folder/'devices.json').read_text(encoding='utf-8'));del devices['dialogue']['suds']
for path,value in [(fixture,{'version':1,'dialogue':dialogue,'cables':original['cables'],'initialState':original['state']}),(folder/'gameplay.json',gp),(folder/'devices.json',devices)]:path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=r/'scenes/library/gameplay.json';d=json.loads(p.read_text(encoding='utf-8'));d['native']={'state':{},'reads':{'library:renewed':'renewed'},'verbs':[],'events':{},'goals':{}};p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
