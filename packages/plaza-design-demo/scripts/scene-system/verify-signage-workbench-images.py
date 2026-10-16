"""Independently decode all retained F4 before/after/diff PNGs and source bundle bytes."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('manifest',nargs='?',default='S11-final-rendered-evidence.json')
parser.add_argument('--report',default='S11-final-independent-png-verification.json')
args=parser.parse_args()
root=Path(__file__).resolve().parents[4]
evidence=root/'.scene-system'/'evidence'
report=json.loads((evidence/args.manifest).read_text())
assert report['status']=='PASS'
assert report['total']==776 and len(report['rows'])==776
assert hashlib.sha256((evidence/report['bundle']).read_bytes()).hexdigest()==report['bundleSha256']
results=[]
for index,row in enumerate(report['rows']):
 assert row['index']==index
 images=[]
 for key in ['originalImage','candidateImage','diffImage']:
  assert Path(row[key]).name==row[key]
  with Image.open(evidence/row[key]) as image:
   assert image.size==(800,420)
   images.append(image.convert('RGBA').tobytes())
 original,candidate,diff=images
 assert hashlib.sha256(original).hexdigest()==row['originalHash']
 assert hashlib.sha256(candidate).hexdigest()==row['candidateHash']
 changed=sum(original[i:i+4]!=candidate[i:i+4] for i in range(0,len(original),4))
 assert changed==row['differentPixels']==row['repeatDifferentPixels']==0
 assert row['isolation'] and not any(diff)
 if row['kind']=='kernel':
  visible=sum(candidate[i:i+4]!=bytes([12,10,18,255]) for i in range(0,len(candidate),4))
  assert visible==row['nonBackgroundPixels'] and visible>0
 results.append({'index':index,'id':row['id'],'kind':row['kind'],'mode':row['mode'],'differentPixels':changed,'originalHash':row['originalHash'],'candidateHash':row['candidateHash'],**{key+'Sha256':hashlib.sha256((evidence/row[key]).read_bytes()).hexdigest() for key in ['originalImage','candidateImage','diffImage']}})
result={'status':'PASS','milestone':'S11','decoder':'Pillow raw RGBA','manifest':args.manifest,'bundleSha256':report['bundleSha256'],'pairs':776,'pngs':2328,'pixelDifferences':0,'rows':results}
(evidence/args.report).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({key:value for key,value in result.items() if key!='rows'}))
