# Clutch: the offline model pipeline. See docs/RUNBOOK.md section 4.
PY ?= python3.11
VENV := model/.venv
BIN := $(VENV)/bin
RUN := cd model && ../$(BIN)/python -m

.PHONY: model-setup model model-test export pick

model-setup:
	$(PY) -m venv $(VENV)
	$(BIN)/pip install -q --upgrade pip
	$(BIN)/pip install -q -r model/requirements.txt

# Download, parse, split, train, evaluate, stakes, thresholds, Pulse evaluation.
model:
	$(RUN) src.download
	$(RUN) src.parse
	$(RUN) src.split
	$(RUN) src.train
	$(RUN) src.evaluate
	$(RUN) src.stakes
	$(RUN) src.thresholds
	$(RUN) src.pulse_eval

model-test:
	$(BIN)/python -m pytest model/tests -q

pick:
	$(RUN) src.pick_replay

# Writes data/matches/<id>/ for the match named in data/replay.json.
export:
	$(RUN) src.export
