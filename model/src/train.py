"""Fit the baselines and both models on train, choose on validation, save model.joblib.

The test split is not touched here. evaluate.py uses it once, at the end.
"""

from __future__ import annotations

import itertools

import joblib
import numpy as np
import pandas as pd

from .common import ARTIFACTS, SEED, WORK, write_json
from .features import before_state, build_features
from .metrics import brier, per_match_sums
from .models import ConstantBaseline, RunRateBaseline, boosted_model, logistic_model
from .split import load_split

GRID = {
    "max_depth": [3, 5],
    "learning_rate": [0.05, 0.1],
    "max_iter": [100, 300],
    "monotone": [True, False],
}


def xy(balls: pd.DataFrame, ids: list[str]):
    part = balls[balls["match_id"].isin(set(ids))]
    return build_features(*before_state(part)), part["label"].to_numpy(), part["match_id"].to_numpy()


def paired_brier_interval(y, p_a, p_b, match_ids, n_boot=1000):
    """95% interval for Brier(a) - Brier(b), resampling matches, not balls."""
    se_a, n = per_match_sums((p_a - y) ** 2, match_ids)
    se_b, _ = per_match_sums((p_b - y) ** 2, match_ids)
    rng = np.random.default_rng(SEED)
    idx = rng.integers(0, len(n), size=(n_boot, len(n)))
    diff = se_a[idx].sum(1) / n[idx].sum(1) - se_b[idx].sum(1) / n[idx].sum(1)
    return [float(np.percentile(diff, 2.5)), float(np.percentile(diff, 97.5))]


def main() -> None:
    balls = pd.read_pickle(WORK / "balls.pkl")
    split = load_split()
    Xtr, ytr, _ = xy(balls, split["train"]["match_ids"])
    Xva, yva, mva = xy(balls, split["validation"]["match_ids"])

    models = {
        "baseline_constant": ConstantBaseline().fit(Xtr, ytr),
        "baseline_run_rate": RunRateBaseline().fit(Xtr, ytr),
        "logistic": logistic_model().fit(Xtr, ytr),
    }

    grid_log = []
    best, best_score = None, np.inf
    for depth, lr, iters, mono in itertools.product(*GRID.values()):
        m = boosted_model(depth, lr, iters, mono).fit(Xtr, ytr)
        score = brier(yva, m.predict(Xva))
        params = {"max_depth": depth, "learning_rate": lr, "max_iter": iters, "monotone": mono}
        grid_log.append({**params, "validation_brier": round(score, 5)})
        print(params, round(score, 5))
        if score < best_score:
            best, best_score, best_params = m, score, params
    models["boosted"] = best

    val = {name: round(brier(yva, m.predict(Xva)), 5) for name, m in models.items()}
    # Ship the boosted trees only if they beat the logistic regression beyond noise.
    interval = paired_brier_interval(yva, models["logistic"].predict(Xva), best.predict(Xva), mva)
    shipped = "boosted" if interval[0] > 0 else "logistic"

    joblib.dump({"shipped": shipped, "models": models}, ARTIFACTS / "model.joblib")
    write_json(
        ARTIFACTS / "training.json",
        {
            "seed": SEED,
            "train_balls": int(len(ytr)),
            "validation_balls": int(len(yva)),
            "validation_brier": val,
            "boosted_grid": grid_log,
            "boosted_params": best_params,
            "logistic_minus_boosted_validation_brier_95": [round(v, 5) for v in interval],
            "shipped": shipped,
            "ship_rule": "boosted if the 95% interval of (logistic - boosted) validation Brier, "
            "resampling matches, is above zero; otherwise logistic",
        },
    )
    print("validation Brier:", val, "shipped:", shipped)


if __name__ == "__main__":
    main()
