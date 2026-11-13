"""The baselines and the two models (docs/MODEL.md section 5).

Every model has the same interface: fit(X, y) and predict(X) -> chance that the team
batting first wins. X has the columns in features.FEATURES order.
"""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .common import BALLS_PER_INNINGS, SEED
from .features import FEATURES, INNINGS1_FEATURES, INNINGS2_FEATURES

IDX = {name: i for i, name in enumerate(FEATURES)}
COLS1 = [IDX[f] for f in INNINGS1_FEATURES]
COLS2 = [IDX[f] for f in INNINGS2_FEATURES]

# Direction each feature must push the bat-first win chance, other features held fixed.
# Innings 1: more wickets in hand and more runs help the side batting.
# Innings 2: more balls or wickets in hand help the chasing side; more runs needed hurts it.
MONO1 = {"balls_left": 0, "wickets_left": 1, "score": 1}
MONO2 = {"balls_left": -1, "wickets_left": -1, "score": 0, "target": 0, "needed": 1, "rrr": 0}


class ConstantBaseline:
    """Baseline A: always the training share of matches won by the team batting first."""

    def fit(self, X, y):
        self.p = float(np.mean(y))
        return self

    def predict(self, X):
        return np.full(len(X), self.p)


class RunRateBaseline:
    """Baseline B: innings 1 -> the constant; innings 2 -> logistic regression on rrr - crr."""

    @staticmethod
    def _gap(X):
        """Required run rate minus the run rate so far (0 before the first ball)."""
        bowled = BALLS_PER_INNINGS - X[:, IDX["balls_left"]]
        crr = np.divide(X[:, IDX["score"]] * 6.0, bowled, out=np.zeros(len(X)), where=bowled > 0)
        return (X[:, IDX["rrr"]] - crr).reshape(-1, 1)

    def fit(self, X, y):
        self.p = float(np.mean(y))
        chase = X[:, IDX["innings"]] == 2
        self.lr = LogisticRegression(max_iter=1000).fit(self._gap(X[chase]), y[chase])
        return self

    def predict(self, X):
        out = np.full(len(X), self.p)
        chase = X[:, IDX["innings"]] == 2
        if chase.any():
            out[chase] = self.lr.predict_proba(self._gap(X[chase]))[:, 1]
        return out


class PerInnings:
    """Two estimators, one per innings, each on that innings' own features."""

    def __init__(self, make1, make2):
        self.m1, self.m2 = make1(), make2()

    def fit(self, X, y):
        first = X[:, IDX["innings"]] == 1
        self.m1.fit(X[first][:, COLS1], y[first])
        self.m2.fit(X[~first][:, COLS2], y[~first])
        return self

    def predict(self, X):
        out = np.empty(len(X))
        first = X[:, IDX["innings"]] == 1
        if first.any():
            out[first] = self.m1.predict_proba(X[first][:, COLS1])[:, 1]
        if (~first).any():
            out[~first] = self.m2.predict_proba(X[~first][:, COLS2])[:, 1]
        return out


def logistic_model() -> PerInnings:
    """Model 1: standardised logistic regression, separate for each innings."""
    make = lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))  # noqa: E731
    return PerInnings(make, make)


def boosted_model(max_depth: int, learning_rate: float, max_iter: int, monotone: bool) -> PerInnings:
    """Model 2: gradient-boosted trees, separate for each innings."""

    def make(features, mono):
        def build():
            return HistGradientBoostingClassifier(
                max_depth=max_depth,
                learning_rate=learning_rate,
                max_iter=max_iter,
                monotonic_cst=[mono[f] for f in features] if monotone else None,
                random_state=SEED,
            )

        return build

    return PerInnings(make(INNINGS1_FEATURES, MONO1), make(INNINGS2_FEATURES, MONO2))
