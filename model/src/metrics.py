"""Brier score, log loss and calibration error."""

from __future__ import annotations

import numpy as np

EPS = 1e-6


def brier(y, p) -> float:
    return float(np.mean((np.asarray(p) - np.asarray(y)) ** 2))


def log_loss(y, p) -> float:
    p = np.clip(np.asarray(p, dtype=float), EPS, 1 - EPS)
    y = np.asarray(y)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def calibration_bins(y, p, bins: int = 10) -> list[dict]:
    """Ten equal-width bins: mean prediction against the share that actually won."""
    y, p = np.asarray(y), np.asarray(p)
    which = np.minimum((p * bins).astype(int), bins - 1)
    out = []
    for b in range(bins):
        mask = which == b
        if mask.any():
            out.append(
                {
                    "bin": b,
                    "n": int(mask.sum()),
                    "mean_predicted": float(p[mask].mean()),
                    "share_won": float(y[mask].mean()),
                }
            )
    return out


def calibration_error(y, p, bins: int = 10) -> float:
    """Expected calibration error: the bin-size-weighted mean gap."""
    rows = calibration_bins(y, p, bins)
    total = sum(r["n"] for r in rows)
    return float(sum(r["n"] * abs(r["mean_predicted"] - r["share_won"]) for r in rows) / total)


def per_match_sums(values, match_ids):
    """Sum of values and count of balls for each match, for resampling by match."""
    _, inverse = np.unique(match_ids, return_inverse=True)
    sums = np.bincount(inverse, weights=values)
    counts = np.bincount(inverse).astype(float)
    return sums, counts
