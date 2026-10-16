"""Independently decode retained F1 source/isolated PNGs and verify raw pixel identity."""
import json
import sys
import hashlib
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
evidence = root / '.scene-system' / 'evidence'
report = json.loads((evidence / (sys.argv[1] if len(sys.argv) > 1 else 'S8-browser-preview-images.json')).read_text())
rows = []
for pair in report['pairs']:
    source, isolated = (evidence / pair[key] for key in ('sourceImage', 'isolatedImage'))
    with Image.open(source) as a, Image.open(isolated) as b:
        a, b = a.convert('RGBA'), b.convert('RGBA')
        assert a.size == b.size == (960, 540)
        left, right = a.tobytes(), b.tobytes()
        differences = sum(x != y for x, y in zip(left, right))
        assert differences == pair['differences'] == 0, pair
        rows.append({'scene': pair['scene'], 'instance': pair['instance'], 'reduced': pair['reduced'],
                     'source': source.name, 'isolated': isolated.name, 'channelDifferences': differences,
                     'sourcePngSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                     'isolatedPngSha256': hashlib.sha256(isolated.read_bytes()).hexdigest()})
assert len(rows) == 40
result = {'status': 'PASS', 'pairs': len(rows), 'decoder': 'Pillow RGBA', 'rows': rows}
(evidence / (sys.argv[2] if len(sys.argv) > 2 else 'S8-independent-png-verification.json')).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'status': 'PASS', 'pairs': len(rows), 'channelDifferences': 0}))
