"""Independently verify G5 capture indexes and actual PNG RGBA using Pillow, without a browser."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.parse import urlparse
from functools import lru_cache
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("evidence", type=Path)
parser.add_argument("completion")
parser.add_argument("expected_manifest", type=Path)
parser.add_argument("--fixture", type=Path)
parser.add_argument("--allow-subset", action="store_true")
parser.add_argument("--report", type=Path)
args = parser.parse_args()
started = time.monotonic()
sha = lambda data: hashlib.sha256(data).hexdigest()

def require(condition, message):
    if not condition:
        raise AssertionError(message)

def file(name):
    require(re.fullmatch(r"[a-zA-Z0-9_.-]+", name) is not None, "Unsafe artifact name")
    return args.evidence / name

def read(name):
    return json.loads(file(name).read_bytes())

completion = read(args.completion)
header_bytes = file(completion["header"]).read_bytes().strip()
header = json.loads(header_bytes)
fingerprint = header["fingerprint"]
description = re.sub(rb',"fingerprint":"[a-f0-9]{64}"(?=}$)', b"", header_bytes)
require(description != header_bytes and sha(description) == fingerprint, "Header fingerprint mismatch")
require(completion["fingerprint"] == fingerprint, "Completion fingerprint mismatch")
require(completion["differentPixels"] == 0, "Completion contains pixel differences")
require(completion.get("allBeforeHashesMatchedImmutableManifest") is True, "Missing original reproduction claim")
require(completion.get("actualIndependentAfterCaptures") is True, "Missing independent capture claim")
require(completion.get("sourcePinsRecheckedAtFinish") is True, "Source pins were not rechecked")
expected_bytes = args.expected_manifest.read_bytes()
require(sha(expected_bytes) == header["expectedManifest"]["sha256"], "Immutable expected manifest file changed")
expected_doc = json.loads(expected_bytes)
expected_rows = expected_doc if isinstance(expected_doc, list) else expected_doc["results"]
expected = {row["id"]: row[header["expectedManifest"]["pixelHashKey"]] for row in expected_rows}
require(len(expected) == len(expected_rows), "Duplicate immutable expected ids")
cases = header["cases"]
require(len({case["id"] for case in cases}) == len(cases), "Duplicate capture ids")
require(completion["count"] == len(cases), "Completion count differs from configured cases")
if not args.allow_subset:
    require({case.get("expectedId", case["id"]) for case in cases} == set(expected), "Incomplete expected case coverage")
if args.fixture:
    for role in ("before", "after"):
        name = Path(urlparse(header[role + "URL"]).path).name.replace(".html", ".js")
        require(sha((args.fixture / name).read_bytes()) == header["bundles"][role], role + " fixture bundle changed")

verified_assets = {}

@lru_cache(maxsize=4)
def decode(name):
    raw = file(name).read_bytes()
    require(name == "png-" + sha(raw) + ".png", "Encoded PNG content-address mismatch: " + name)
    with Image.open(file(name)) as image:
        require(image.format == "PNG", "Artifact is not PNG")
        rgba = image.convert("RGBA").tobytes()
        size = image.size
    return raw, rgba, size

def image(reference):
    name = reference["file"]
    raw, rgba, size = decode(name)
    actual = {"pngSha256": sha(raw), "rgbaSha256": sha(rgba), "width": size[0], "height": size[1], "bytes": len(raw)}
    for key, value in actual.items():
        require(reference[key] == value, f"{name}: {key} does not describe the actual image")
    if name in verified_assets:
        require(verified_assets[name] == actual, "Conflicting references for one PNG")
    verified_assets[name] = actual
    return rgba, size

index = 0
seen_chunks = set()
for name in completion["chunks"]:
    require(name not in seen_chunks, "Duplicate chunk index")
    seen_chunks.add(name)
    chunk = read(name)
    require(chunk["fingerprint"] == fingerprint and chunk["start"] == index, "Noncontiguous or mismatched chunk")
    require(chunk["records"], "Empty durable chunk")
    for record in chunk["records"]:
        require(index < len(cases), "Extra captured case")
        case = cases[index]
        require(record["id"] == case["id"] and record["status"] == "equal", "Wrong/missing/failed captured case")
        immutable_hash = expected[case.get("expectedId", case["id"])]
        before, before_size = image(record["before"])
        after, after_size = image(record["after"])
        difference, diff_size = image(record["diff"])
        require(record["expectedHash"] == immutable_hash == sha(before), case["id"] + ": original RGBA does not reproduce the immutable baseline")
        require(before_size == after_size == diff_size, case["id"] + ": dimensions changed")
        # This checks actual decoded bytes, not hash equality or the recorder's zero-difference claim.
        require(before == after, case["id"] + ": actual before/after pixels differ")
        require(difference == bytes(len(difference)), case["id"] + ": zero-difference PNG is not transparent black")
        require(record["differentPixels"] == 0 and record["differentChannels"] == 0, case["id"] + ": numeric result disagrees")
        require(record["actualCaptures"] == {"before": sha(before), "after": sha(after)}, "Actual-capture hashes disagree with image bytes")
        index += 1
    require(chunk["end"] == index, "Chunk end index mismatch")
require(index == len(cases), "Missing captured cases")
report = {"completion": args.completion, "family": header["family"], "comparison": header["comparison"],
          "cases": index, "uniquePNGAssets": len(verified_assets), "totalUniquePNGBytes": sum(a["bytes"] for a in verified_assets.values()),
          "immutableManifestSHA256": sha(expected_bytes), "bundles": header["bundles"],
          "independentDecoder": "Pillow", "allPNGByteHashesAndDecodedRGBAHashesMatch": True,
          "allBeforeRGBAReproduceImmutableManifest": True, "allActualPairsByteIdentical": True,
          "allDifferenceImagesZero": True, "fullExpectedCoverage": not args.allow_subset,
          "elapsedSeconds": round(time.monotonic() - started, 3)}
if args.report:
    encoded = json.dumps(report, indent=2) + "\n"
    require(not args.report.exists() or args.report.read_text() == encoded, "Refusing to overwrite a different verification report")
    args.report.write_text(encoded)
print(json.dumps(report, indent=2))
