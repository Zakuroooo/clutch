"""Make `src` importable whether pytest is started from the repo root or from model/."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
