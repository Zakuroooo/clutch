"""Turn data/matches/<id>/scoreboard_readings.json back into the readings format that
video_sync expects, so the sync can be rebuilt from the kept evidence alone.
Usage: python -m src._readings_to_jsonl <match_id> > readings.jsonl"""

import json
import sys

from .common import DATA

for r in json.loads((DATA / "matches" / sys.argv[1] / "scoreboard_readings.json").read_text()):
    parts = (r["scoreboard"] or "").split(" ", 2)
    print(json.dumps({"now": r["t"], "text": "\n".join("x\t" + p for p in parts if p)}))
