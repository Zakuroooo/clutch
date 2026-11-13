"""Test metrics for both baselines and both models -> metrics.json and calibration.png.

The test split is used here and only here. Intervals resample matches (1,000 bootstrap
samples), because balls from one match are not independent.
"""

from __future__ import annotations

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from .common import ARTIFACTS, SEED, WORK, read_json, write_json  # noqa: E402
from .features import FEATURES  # noqa: E402
from .metrics import (  # noqa: E402
    EPS,
    brier,
    calibration_bins,
    calibration_error,
    log_loss,
    per_match_sums,
)
from .split import load_split  # noqa: E402
from .train import xy  # noqa: E402

NAMES = {
    "baseline_constant": "Baseline A: constant",
    "baseline_run_rate": "Baseline B: run-rate rule",
    "logistic": "Model 1: logistic regression",
    "boosted": "Model 2: gradient-boosted trees",
}
N_BOOT = 1000


def interval(values, match_ids) -> list[float]:
    sums, counts = per_match_sums(values, match_ids)
    rng = np.random.default_rng(SEED)
    idx = rng.integers(0, len(counts), size=(N_BOOT, len(counts)))
    stat = sums[idx].sum(1) / counts[idx].sum(1)
    return [round(float(np.percentile(stat, 2.5)), 4), round(float(np.percentile(stat, 97.5)), 4)]


def row(y, p, match_ids) -> dict:
    pc = np.clip(p, EPS, 1 - EPS)
    ll = -(y * np.log(pc) + (1 - y) * np.log(1 - pc))
    return {
        "brier": round(brier(y, p), 4),
        "brier_95": interval((p - y) ** 2, match_ids),
        "log_loss": round(log_loss(y, p), 4),
        "log_loss_95": interval(ll, match_ids),
        "calibration_error": round(calibration_error(y, p), 4),
    }


def main() -> None:
    balls = pd.read_pickle(WORK / "balls.pkl")
    split = load_split()
    bundle = joblib.load(ARTIFACTS / "model.joblib")
    shipped = bundle["shipped"]
    X, y, mids = xy(balls, split["test"]["match_ids"])
    preds = {name: m.predict(X) for name, m in bundle["models"].items()}

    innings = X[:, FEATURES.index("innings")]
    balls_left = X[:, FEATURES.index("balls_left")]
    phases = {
        "Innings 1": innings == 1,
        "Innings 2, overs 1 to 10": (innings == 2) & (balls_left > 60),
        "Innings 2, overs 11 to 20": (innings == 2) & (balls_left <= 60),
    }
    p = preds[shipped]
    metrics = {
        "split": "test",
        "test_matches": split["test"]["matches"],
        "test_balls": int(len(y)),
        "bootstrap": {"samples": N_BOOT, "unit": "match", "seed": SEED},
        "shipped": shipped,
        "shipped_name": NAMES[shipped],
        "validation": read_json(ARTIFACTS / "training.json"),
        "models": {name: {"name": NAMES[name], **row(y, preds[name], mids)} for name in NAMES},
        "shipped_by_phase": {
            label: {
                "balls": int(mask.sum()),
                "brier": round(brier(y[mask], p[mask]), 4),
                "calibration_error": round(calibration_error(y[mask], p[mask]), 4),
            }
            for label, mask in phases.items()
        },
        "calibration_bins_shipped": calibration_bins(y, p),
    }
    write_json(ARTIFACTS / "metrics.json", metrics)

    fig, ax = plt.subplots(figsize=(5, 5), dpi=160)
    ax.plot([0, 1], [0, 1], color="#999", linewidth=1, linestyle="--", label="Perfect")
    for name, colour in (("logistic", "#38bdf8"), ("boosted", "#ff2e63")):
        bins = calibration_bins(y, preds[name])
        label = NAMES[name].split(": ")[1] + (" (shipped)" if name == shipped else "")
        ax.plot(
            [b["mean_predicted"] for b in bins],
            [b["share_won"] for b in bins],
            marker="o",
            color=colour,
            label=label,
        )
    ax.set_xlabel("Predicted chance that the team batting first wins")
    ax.set_ylabel("Share that actually won")
    ax.set_title(f"Calibration on {split['test']['matches']} test matches")
    ax.legend()
    ax.grid(alpha=0.2)
    fig.tight_layout()
    fig.savefig(ARTIFACTS / "calibration.png")

    for name in NAMES:
        m = metrics["models"][name]
        print(f"{NAMES[name]:34s} brier {m['brier']} logloss {m['log_loss']} ece {m['calibration_error']}")
    print("shipped:", shipped, metrics["shipped_by_phase"])


if __name__ == "__main__":
    main()
