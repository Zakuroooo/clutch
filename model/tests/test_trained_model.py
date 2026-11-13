"""Sanity checks on the real trained model (TESTING.md F2 rows 6 and 7).

The model file is not committed, so these skip on a fresh clone and in CI. Run `make model`
first to exercise them locally.
"""

import numpy as np
import pytest

from src.common import ARTIFACTS
from src.features import win_prob
from src.stakes import stakes_raw

pytestmark = pytest.mark.skipif(
    not (ARTIFACTS / "model.joblib").exists(), reason="model not trained here; run `make model`"
)


@pytest.fixture(scope="module")
def model():
    from src.stakes import load_model

    return load_model()


def chasing(model, balls_left, wickets_left, score, target):
    return 1 - win_prob(model, [2], [balls_left], [wickets_left], [score], [target])[0]


def test_probabilities_are_in_range(model):
    rng = np.random.default_rng(0)
    n = 2000
    innings = rng.integers(1, 3, n)
    p = win_prob(model, innings, rng.integers(1, 121, n), rng.integers(1, 11, n), rng.integers(0, 250, n), rng.integers(50, 260, n))
    assert ((p >= 0) & (p <= 1)).all()


def test_an_easy_chase_is_nearly_won(model):
    assert chasing(model, 60, 10, 159, 160) > 0.95  # 1 needed from 60 balls, 10 wickets


def test_an_impossible_chase_is_nearly_lost(model):
    assert chasing(model, 6, 5, 100, 160) < 0.05  # 60 needed from 6 balls


def test_stakes_are_higher_in_a_tight_finish(model):
    tight = stakes_raw(model, [2], [6], [5], [148], [160])[0]  # 12 from 6
    early = stakes_raw(model, [2], [60], [5], [80], [160])[0]  # 80 from 60
    assert tight > early
