import json
from pathlib import Path
root=Path('packages/plaza-design-demo');r=root/'src/ssg/game';folder=r/'scenes/stacks';fixture=root/'scripts/scene-system/fixtures/stacks-conversation-baseline.json';gp=json.loads((folder/'gameplay.json').read_text(encoding='utf-8'));original=json.loads(Path('.scene-system/all-game-baseline-2026-10-18/source/scenes/stacks/devices.json').read_text(encoding='utf-8'));dialogue=original['dialogue']['moth']
if 'moth'in gp['conversations'] or fixture.exists():raise Exception('Refusing to overwrite extraction')
gp['flags']=['act1:done','heard:spire','contact:moth','stacks:alarms','stacks:spratFed'];event='stacks.moth.recruited';gp['events']=[event];gp.setdefault('state',{}).update({'stacks.talked':{'owner':'stacks','lifetime':'save','type':'boolean','default':False},'stacks.departed':{'owner':'stacks','lifetime':'save','type':'boolean','default':False},'stacks.boxAt':{'owner':'stacks','lifetime':'save','type':'enum','options':['stack','air','ferry'],'default':'stack'}})
gp['native']={'state':{'stacks.talked':'talked','stacks.departed':'departed','stacks.boxAt':'boxAt'},'reads':{'stacks:alarms':'alarms','stacks:spratFed':'spratFed'},'verbs':[],'events':{},'goals':{event:'moth'}}
gp['commands']['stacks.moth.finish']={'sources':['conversation'],'when':{'state':'stacks.talked','is':False},'actions':[{'state':'stacks.talked','set':True},*({'flag':flag,'value':True} for flag in ['act1:done','heard:spire','contact:moth']),{'emit':event}]};gp['commands']['stacks.ferry.depart']={'sources':['system'],'when':{'state':'stacks.talked','is':True},'actions':[{'state':'stacks.departed','set':True}]};gp['handoffs']=[{'event':event,'cutscene':'act2','after':[{'ms':1500,'command':'stacks.ferry.depart'}]}]
nodes={}
def condition(c):
 if c=='talked':return {'state':'stacks.talked','is':True}
 if c.startswith('boxAt='):return {'state':'stacks.boxAt','is':c.split('=',1)[1]}
 if c in ['alarms','spratFed']:return {'flag':'stacks:'+c}
 raise Exception('Unexpected predicate '+c)
def convert(n):
 result={'speaker':dialogue['speaker'],'pages':[n['text']]}
 if 'choices'in n:result['choices']=[{'id':'choice-'+str(i+1),'label':c[0],'next':c[1]} for i,c in enumerate(n['choices'])]
 if 'do'in n:
  assert n['do']==[{'effect':'moth.end'}];result['onEnter']='stacks.moth.finish'
 return result
for id,value in dialogue['nodes'].items():
 variants=value if isinstance(value,list) else [value];assert 'if'not in variants[-1];nodes[id]=convert(variants[-1]);routes=[]
 for i,n in enumerate(variants[:-1]):
  target=id+'-variant-'+str(i);nodes[target]=convert(n);routes.append({'when':condition(n['if']),'node':target})
 if routes:nodes[id]['redirect']=routes
# Original moth.end is idempotent on repeated entry: preserve the line without re-running its command.
end=next(id for id,n in nodes.items() if n.get('onEnter')=='stacks.moth.finish');nodes[end+'-completed']={'speaker':nodes[end]['speaker'],'pages':nodes[end]['pages']};nodes[end]['redirect']=[{'when':{'state':'stacks.talked','is':True},'node':end+'-completed'}]
gp['conversations']['moth']={'sayCommand':dialogue['sayCmd'],'entry':[{'node':dialogue['start']}],'nodes':nodes}
devices=json.loads((folder/'devices.json').read_text(encoding='utf-8'));del devices['dialogue']['moth']
for path,value in [(fixture,{'version':1,'dialogue':dialogue,'cables':original['cables'],'initialState':original['state']}),(folder/'gameplay.json',gp),(folder/'devices.json',devices)]:path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
