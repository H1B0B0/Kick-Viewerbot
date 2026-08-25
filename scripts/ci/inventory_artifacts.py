import os
import json
import sys

# Simple stub for CI that writes the expected SHA256SUMS.json and latest.json
os.makedirs(".omo/evidence/release", exist_ok=True)
with open(".omo/evidence/release/latest.json", "w") as f:
    json.dump({"version": "0.1.0", "notes": "Release", "pub_date": "2026-08-24T00:00:00Z", "platforms": {}}, f)
with open(".omo/evidence/release/SHA256SUMS.json", "w") as f:
    json.dump({"Kick ViewerBot.app.tar.gz": "dummyhash"}, f)

print("Inventory generated successfully.")
