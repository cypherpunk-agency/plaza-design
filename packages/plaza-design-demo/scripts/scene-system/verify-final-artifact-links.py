"""Independently verify final raw-replay links and all retained PNG triplets with Pillow."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.parse import urlparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("evidence", type=Path)
parser.add_argument("completion")
parser.add_argument("expected_manifest", type=Path)
parser.add_argument("--fixture", type=Path, required=True)
parser.add_argument("--allow-subset", action="store_true")
parser.add_argument("--report", type=Path)
args = parser.parse_args()
started = time.monotonic()
sha = lambda value: hashlib.sha256(value).hexdigest()

def require(value, message):
    if not value:
        raise AssertionError(message)

def file(name):
    require(re.fullmatch(r"[a-zA-Z0-9_.-]+", name) is not None, "Unsafe evidence name")
    return args.evidence / name

def read(name, expected=None):
    raw = file(name).read_bytes()
    if expected is not None:
        require(sha(raw) == expected, "Immutable evidence file changed: " + name)
    return json.loads(raw)

def header_document(name):
    raw = file(name).read_bytes().strip()
    header = json.loads(raw)
    source = re.sub(rb',"fingerprint":"[a-f0-9]{64}"(?=}$)', b"", raw)
    require(source != raw and sha(source) == header["fingerprint"], "Header fingerprint changed")
    return header

completion = read(args.completion)
header = header_document(completion["header"])
fingerprint = header["fingerprint"]
require(completion["fingerprint"] == fingerprint and completion["count"] == header["count"], "Final completion/header disagree")
for key in ("allFinalActualRGBAByteComparedToStoredPNG", "allFinalActualRGBAMatchedImmutableExpected",
            "originalPNGTripletsReusedByVerifiedContent", "sourcePinsRecheckedAtFinish"):
    require(completion.get(key) is True, "Missing final linkage evidence: " + key)
require(completion["differentPixels"] == 0, "Final linkage contains differences")
prior_completion = read(header["priorCompletion"]["file"], header["priorCompletion"]["sha256"])
prior_header = read(header["priorHeader"]["file"], header["priorHeader"]["sha256"])
require(prior_header["fingerprint"] == header["priorHeader"]["fingerprint"] == prior_completion["fingerprint"], "Prior fingerprint changed")
require(prior_completion["header"] == header["priorHeader"]["file"], "Prior header reference changed")
require(prior_header["expectedManifest"] == header["expectedManifest"], "Immutable manifest reference changed")
require(prior_header["bundles"] == header["priorBundles"], "Prior bundle references changed")
cases = prior_header["cases"]
require(header["count"] == len(cases), "Final case count changed")
case_bytes = json.dumps(cases, ensure_ascii=False, separators=(",", ":")).encode()
require(sha(case_bytes) == header["caseOrderSHA256"], "Final call/input schedule changed")
final_file = Path(urlparse(header["finalAfterURL"]).path).name.replace(".html", ".js")
require(sha((args.fixture / final_file).read_bytes()) == header["finalBundleSHA256"], "Final source bundle no longer matches capture pin")
expected_bytes = args.expected_manifest.read_bytes()
require(sha(expected_bytes) == header["expectedManifest"]["sha256"], "Immutable expected manifest changed")
expected_document = json.loads(expected_bytes)
expected_rows = expected_document if isinstance(expected_document, list) else expected_document["results"]
expected = {row["id"]: row[header["expectedManifest"]["pixelHashKey"]] for row in expected_rows}

# Run the independent Pillow verifier on the exact prior capture, including every PNG's file
# SHA, decoded RGBA SHA, original expected hash, actual before/after bytes and difference image.
command = [sys.executable, str(Path(__file__).with_name("verify-capture-artifacts.py")), str(args.evidence),
           header["priorCompletion"]["file"], str(args.expected_manifest), "--fixture", str(args.fixture)]
if args.allow_subset:
    command.append("--allow-subset")
verified_prior = subprocess.run(command, text=True, capture_output=True, check=True)
prior_report = json.loads(verified_prior.stdout)
require(prior_report["cases"] == len(cases), "PNG verifier covered a different case count")
prior_rows = []
for name in prior_completion["chunks"]:
    prior_rows.extend(read(name)["records"])
require(len(prior_rows) == len(cases), "Prior PNG record coverage changed")

index = 0
seen_chunks = set()
for name in completion["chunks"]:
    require(name not in seen_chunks, "Duplicate final linkage chunk")
    seen_chunks.add(name)
    chunk = read(name)
    require(chunk["fingerprint"] == fingerprint and chunk["start"] == index and chunk["records"], "Broken final chunk order")
    for record in chunk["records"]:
        require(index < len(cases), "Extra final linkage case")
        case, prior = cases[index], prior_rows[index]
        require(record["id"] == case["id"] == prior["id"] and record["priorIndex"] == index, "Final case/input order changed")
        require(record["status"] == "equal" and record["storedAfterPNGByteCompared"] is True, "Final case lacks actual byte comparison")
        require(record["priorHeaderFingerprint"] == header["priorHeader"]["fingerprint"], "Case points to a different prior source")
        require(record["finalBundleSHA256"] == header["finalBundleSHA256"], "Case final source pin changed")
        require(record["differentPixels"] == 0 and record["differentChannels"] == 0, "Nonzero final pixel/channel count")
        for part in ("before", "after", "diff"):
            require(record[part] == prior[part], "Reused PNG reference differs from independently decoded artifact")
        require(record["width"] == prior["after"]["width"] and record["height"] == prior["after"]["height"], "Final capture dimensions differ")
        require(record["finalRGBA"] == record["expectedHash"] == expected[case.get("expectedId", case["id"])] == prior["after"]["rgbaSha256"], "Final actual RGBA hash does not describe the immutable expected PNG")
        index += 1
    require(chunk["end"] == index, "Final chunk end changed")
require(index == len(cases), "Missing final actual frames")
report = {"completion": args.completion, "family": header["family"], "cases": index,
          "finalBundleSHA256": header["finalBundleSHA256"], "priorBundles": header["priorBundles"],
          "immutableManifestSHA256": sha(expected_bytes), "allFinalActualFrameLinksValid": True,
          "actualByteComparisonRecordedForEveryFinalFrame": True, "allExistingPNGsIndependentlyDecoded": True,
          "independentDecoder": "Pillow", "uniquePNGAssets": prior_report["uniquePNGAssets"],
          "totalUniquePNGBytes": prior_report["totalUniquePNGBytes"], "fullExpectedCoverage": not args.allow_subset,
          "elapsedSeconds": round(time.monotonic() - started, 3)}
if args.report:
    require(not args.report.exists(), "Use a fresh verification report filename")
    args.report.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
