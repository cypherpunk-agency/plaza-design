"""Independent full S10 v5 retained PNG verification: real decoded RGBA, hashes and gates."""
import hashlib,json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[4]
evidence=root/'.scene-system'/'evidence'
report=json.loads((evidence/'S10-final-v5-rendered-evidence.json').read_text())
assert report['status']=='PASS'
assert report['total']==229 and report['controls']==102 and report['defaults']==report['families']==35
assert all(report[k] for k in ['defaultsNonempty','allSupportedControlsVisibleAndEffective','allSeekRepeatsExact','allStateIsolation'])
assert hashlib.sha256((evidence/report['bundle']).read_bytes()).hexdigest()==report['bundleSha256']
results=[]
for row in report['rows']:
 images=[]
 for key in ['originalImage','candidateImage','diffImage']:
  with Image.open(evidence/row[key]) as image:
   assert image.size==(800,420)
   images.append(image.convert('RGBA').tobytes())
 a,b,d=images
 assert hashlib.sha256(a).hexdigest()==row['originalHash'],row['index']
 assert hashlib.sha256(b).hexdigest()==row['candidateHash'],row['index']
 differences=sum(a[i:i+4]!=b[i:i+4] for i in range(0,len(a),4))
 assert differences==row['differentPixels']==0,row['index']
 assert not any(d),'decoded difference PNG must contain zero raw channel deltas'
 nonbackground=sum(b[i:i+4]!=bytes([12,10,18,255]) for i in range(0,len(b),4))
 assert nonbackground==row['nonBackgroundPixels']
 if row['case']=='default':assert nonbackground>0
 if row['supportedControl']:assert nonbackground>0 and row['controlBaseNonBackgroundPixels']>0 and row['controlEffectPixels']>0 and row['visibleSupportedControl']
 assert row['repeatDifferentPixels']==0 and row['isolation'] and row['visibleDefault']
 results.append({'index':row['index'],'id':row['id'],'case':row['case'],'differentPixels':differences,'nonBackgroundPixels':nonbackground,'sourcePngSha256':hashlib.sha256((evidence/row['originalImage']).read_bytes()).hexdigest(),'candidatePngSha256':hashlib.sha256((evidence/row['candidateImage']).read_bytes()).hexdigest(),'diffPngSha256':hashlib.sha256((evidence/row['diffImage']).read_bytes()).hexdigest()})
assert len(results)==len(set(r['index'] for r in results))==229
result={'status':'PASS','milestone':'S10','scope':'Full v5 rendered matrix; actual UI gate separately required','decoder':'Pillow raw RGBA','bundleSha256':report['bundleSha256'],'pairs':229,'pngs':687,'controls':102,'nonemptyDefaults':35,'pixelDifferences':0,'rows':results}
(evidence/'S10-final-v5-independent-png-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='rows'}))
