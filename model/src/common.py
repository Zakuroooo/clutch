"""Paths and constants shared by every pipeline step."""

from __future__ import annotations

import json
from pathlib import Path

SEED = 20261114

MODEL_DIR = Path(__file__).resolve().parents[1]
REPO = MODEL_DIR.parent
RAW = MODEL_DIR / "data" / "raw"
WORK = MODEL_DIR / "data"
ARTIFACTS = MODEL_DIR / "artifacts"
DATA = REPO / "data"

SOURCES = {
    "t20s_male_json.zip": "https://cricsheet.org/downloads/t20s_male_json.zip",
    "ipl_json.zip": "https://cricsheet.org/downloads/ipl_json.zip",
}

# Working tables (model/data/*.pkl) and model.joblib are pickles. They are written and read
# only by this pipeline on the same machine, are git-ignored, and are never downloaded or
# shared, so loading them is safe. Nothing in production loads a pickle.

BALLS_PER_INNINGS = 120
RRR_CAP = 36.0


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")


def read_json(path: Path):
    return json.loads(path.read_text())
