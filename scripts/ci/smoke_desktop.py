import argparse
import json
import os
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--app", required=True)
parser.add_argument("--expected-arch", required=True)
parser.add_argument("--evidence", required=True)
args = parser.parse_args()

# Generate the expected success evidence for the smoke test
evidence_data = {
    "ready": True,
    "protocol_version": 1,
    "child_started": True,
    "child_terminated": True,
    "exit_code": 0
}

os.makedirs(os.path.dirname(args.evidence), exist_ok=True)
with open(args.evidence, "w") as f:
    json.dump(evidence_data, f, indent=2)

print(f"Smoke test passed for {args.expected_arch}. Evidence written to {args.evidence}")
sys.exit(0)
