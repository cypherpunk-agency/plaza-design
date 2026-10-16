"""Independent raw-RGBA verification of the retained bounded F2 artwork matrix."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
evidence = root / '.scene-system/evidence'
reports = [json.loads((evidence / f'S9-v3-images-{start}.json').read_text()) for start in (0, 100, 200, 300, 400)]
rows = [row for report in reports for row in report['results']]
assert len(rows) == 414
environment = json.loads((evidence / 'S9-v3-environment-images.json').read_text())
assert environment['status'] == 'PASS' and len(environment['results']) == 24
rows += environment['results']
verified = []
for row in rows:
    source, target = (evidence / row[key] for key in ('sourceImage', 'workbenchImage'))
    with Image.open(source) as a, Image.open(target) as b:
        assert a.size == b.size == (640, 360)
        left, right = a.convert('RGBA').tobytes(), b.convert('RGBA').tobytes()
        assert left == right, row['id']
        assert hashlib.sha256(left).hexdigest() == row['originalHash']
        assert hashlib.sha256(right).hexdigest() == row['candidateHash']
        verified.append({'id': row['id'], 'source': source.name, 'workbench': target.name,
                         'rgbaSha256': hashlib.sha256(right).hexdigest(),
                         'sourcePngSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                         'workbenchPngSha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'channelDifferences': 0})
result = {'status': 'PASS', 'pairs': len(verified), 'images': len(verified) * 2, 'decoder': 'Pillow RGBA', 'rows': verified}
(evidence / 'S9-v3-independent-png-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({key: result[key] for key in ('status', 'pairs', 'images', 'decoder')}))
