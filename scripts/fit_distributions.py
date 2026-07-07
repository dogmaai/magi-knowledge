#!/usr/bin/env python3
"""Fit the LILITH-safe ECHIDNA input priors (read-only BigQuery).

This is a **maintenance / reproducibility tool**, NOT part of the zero-dependency
bundle runtime. It re-derives the aggregate priors embedded in
``_lilith_safe/distributions/echidna-priors.md`` so the artifact can be refreshed
and audited. It performs **read-only** aggregate queries only — never writes, and
never extracts raw rows or per-symbol picks.

Contamination guarantees baked into the queries:

  * VIX regime / level, cash %, and ATR % are pooled aggregates across all rows
    (no unit attribution).
  * The ISABEL data-sufficiency prior is scoped to ``unit_name IN ('LILITH', 'ADAM')`` only
    — LILITH's own decided-trade counts. No other unit's performance is read.
  * Output is frequencies and quantiles, never raw rows.

Usage::

    GOOGLE_APPLICATION_CREDENTIALS=<read-only SA key> \\
        python scripts/fit_distributions.py            # prints the JSON block

Requires ``google-cloud-bigquery`` (maintenance-only dependency). The emitted
JSON matches the ```json block in echidna-priors.md; paste it back to refresh.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone

PROJECT = "screen-share-459802"
DATASET = "magi_core"

# --- coverage-floor policy (documented in the artifact) --------------------
# Floors guarantee SFT coverage of the safety-critical rare regimes / the
# n>=5 "cite faithfully" case. They are the only deviation from raw empirical.
VIX_FLOORS = {"CALM": 0.03, "NORMAL": 0.04, "EXTREME_FEAR": 0.07, "PANIC": 0.03}
VIX_FREE = ("HIGH_FEAR", "LOW_FEAR")  # split the remaining mass by real ratio
NBUCKET_FLOORS = {"5-9": 0.15, "10+": 0.10}
NBUCKET_FREE = ("0", "1-4")


def _apply_floor(counts: dict[str, int], floors: dict[str, float],
                 free: tuple[str, ...], order: list[str]) -> dict[str, float]:
    """Rescale ``free`` keys by their empirical ratio under fixed floors."""
    free_total = sum(counts.get(k, 0) for k in free) or 1
    remaining = 1.0 - sum(floors.values())
    applied = dict(floors)
    for k in free:
        applied[k] = round(remaining * counts.get(k, 0) / free_total, 4)
    drift = round(1.0 - sum(applied.values()), 4)
    applied[free[0]] = round(applied[free[0]] + drift, 4)
    return {k: applied.get(k, 0.0) for k in order}


def fit(client, fit_date: str) -> dict:
    def q(sql):
        return list(client.query(sql).result())

    # ``trades_active`` is the canonical active scope (matches the production
    # ISABEL_STATS_BLOCK source) but the view drops the ``market_snapshot`` JSON
    # column, so VIX (which lives inside that JSON) is read from the base
    # ``trades`` table. ATR and the LILITH ISABEL counts use the active view.
    base = f"`{PROJECT}.{DATASET}.trades`"
    active = f"`{PROJECT}.{DATASET}.trades_active`"
    snaps = f"`{PROJECT}.{DATASET}.portfolio_snapshots`"

    decided_all = 0
    for r in q(f"SELECT COUNTIF(result IN ('WIN','LOSE')) d FROM {active}"):
        decided_all = int(r.d or 0)

    # 1) VIX regime freq + per-regime level quantiles (pooled, no unit attribution)
    vix_counts: dict[str, int] = {}
    vix_band: dict[str, dict] = {}
    rows = q(f"""
        SELECT
          JSON_VALUE(market_snapshot, '$.vix_regime') AS regime,
          COUNT(*) AS n,
          APPROX_QUANTILES(CAST(JSON_VALUE(market_snapshot, '$.vix_value') AS FLOAT64), 100) AS qs
        FROM {base}
        WHERE JSON_VALUE(market_snapshot, '$.vix_regime') IS NOT NULL
        GROUP BY regime
    """)
    for r in rows:
        if not r.regime:
            continue
        vix_counts[r.regime] = r.n
        qs = r.qs or []
        if len(qs) >= 91 and qs[50] is not None:
            vix_band[r.regime] = {
                "lo": round(qs[10], 1), "hi": round(qs[90], 1),
                "source": "echidna_fitted",
            }
    total = sum(vix_counts.values()) or 1
    vix_emp = {k: round(v / total, 4) for k, v in vix_counts.items()}
    for r in ("CALM", "PANIC"):
        vix_emp.setdefault(r, 0.0)
    vix_order = ["CALM", "LOW_FEAR", "NORMAL", "HIGH_FEAR", "EXTREME_FEAR", "PANIC"]
    vix_applied = _apply_floor(vix_counts, VIX_FLOORS, VIX_FREE, vix_order)

    # 2) cash % of equity quantiles
    cash = {}
    for r in q(f"""
        SELECT
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(cash, equity) * 100, 100)[OFFSET(10)], 1) p10,
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(cash, equity) * 100, 100)[OFFSET(25)], 1) p25,
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(cash, equity) * 100, 100)[OFFSET(50)], 1) p50,
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(cash, equity) * 100, 100)[OFFSET(75)], 1) p75,
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(cash, equity) * 100, 100)[OFFSET(90)], 1) p90
        FROM {snaps} WHERE equity > 0
    """):
        cash = {
            "p10": r.p10, "p25": r.p25, "p50": r.p50, "p75": r.p75, "p90": r.p90,
            "clamp": [0.0, 100.0], "source": "echidna_fitted",
            "note": "portfolio_snapshots cash/equity; paper account is mostly cash. clamp to [0,100].",
        }

    # 3) ATR % of price quantiles
    atr = {}
    for r in q(f"""
        SELECT
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(atr_at_execution, price) * 100, 1000)[OFFSET(100)], 3) p10,
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(atr_at_execution, price) * 100, 1000)[OFFSET(250)], 3) p25,
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(atr_at_execution, price) * 100, 1000)[OFFSET(500)], 3) p50,
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(atr_at_execution, price) * 100, 1000)[OFFSET(750)], 3) p75,
          ROUND(APPROX_QUANTILES(SAFE_DIVIDE(atr_at_execution, price) * 100, 1000)[OFFSET(900)], 3) p90
        FROM {active} WHERE atr_at_execution IS NOT NULL AND price > 0
    """):
        atr = {
            "p10": r.p10, "p25": r.p25, "p50": r.p50, "p75": r.p75, "p90": r.p90,
            "source": "echidna_fitted", "note": "atr_at_execution / execution price.",
        }

    # 4) ISABEL data-sufficiency — LILITH-OWN ONLY (clean-source). Per (symbol,
    #    side) decided-trade count, bucketed. We read counts only, never picks.
    #    'ADAM' is the renamed qwen (DashScope base-model) unit; historical rows
    #    from that path carry unit_name='LILITH', new rows carry 'ADAM'.
    nb_counts = {"0": 0, "1-4": 0, "5-9": 0, "10+": 0}
    lilith_decided = 0
    for r in q(f"""
        WITH cells AS (
          SELECT symbol, side, COUNTIF(result IN ('WIN','LOSE')) AS n
          FROM {active} WHERE unit_name IN ('LILITH', 'ADAM')
          GROUP BY symbol, side
        )
        SELECT
          COUNTIF(n = 0) b0,
          COUNTIF(n BETWEEN 1 AND 4) b1,
          COUNTIF(n BETWEEN 5 AND 9) b2,
          COUNTIF(n >= 10) b3,
          SUM(n) decided
        FROM cells
    """):
        nb_counts = {"0": r.b0, "1-4": r.b1, "5-9": r.b2, "10+": r.b3}
        lilith_decided = int(r.decided or 0)
    nb_total = sum(nb_counts.values()) or 1
    nb_emp = {k: round(v / nb_total, 4) for k, v in nb_counts.items()}
    nb_order = ["0", "1-4", "5-9", "10+"]
    nb_applied = _apply_floor(nb_counts, NBUCKET_FLOORS, NBUCKET_FREE, nb_order)

    # static synthetic fallback bands for regimes with no real level data
    for regime, band in {
        "CALM": (10.0, 15.0), "NORMAL": (20.0, 25.0), "PANIC": (35.0, 60.0),
    }.items():
        vix_band.setdefault(regime, {"lo": band[0], "hi": band[1], "source": "synthetic"})
    vix_band["note"] = (
        "bands = real [p10,p90] where source=echidna_fitted; prior synthetic "
        "bands retained where unobserved."
    )

    return {
        "schema_version": "1.0",
        "fit": {
            "date": fit_date,
            "source_project": PROJECT,
            "source_dataset": DATASET,
            "scope": ("VIX from trades.market_snapshot; ATR + ISABEL from "
                      "trades_active (active scope); cash from "
                      "portfolio_snapshots. ISABEL scoped unit_name=LILITH "
                      "(clean-source)."),
            "decided_trades_all_units": decided_all,
            "snapshots_with_regime": total,
            "lilith_decided_trades": lilith_decided,
        },
        "macro": {
            "vix_regime_weights": {
                "empirical": {k: vix_emp[k] for k in vix_order if k in vix_emp},
                "applied": vix_applied,
                "coverage_floor": VIX_FLOORS,
                "note": ("applied = empirical for HIGH/LOW_FEAR rescaled under "
                         "floors; floors guarantee SFT coverage of the "
                         "safety-critical EXTREME_FEAR/PANIC gate (Constitution "
                         "hard gate). CALM/PANIC unobserved in data."),
            },
            "vix_level_band": {k: vix_band[k] for k in vix_order if k in vix_band}
            | {"note": vix_band["note"]},
            "cash_pct_quantiles": cash,
        },
        "technicals": {"atr_pct_of_price_quantiles": atr},
        "isabel_lilith": {
            "n_bucket_weights": {
                "empirical": nb_emp, "applied": nb_applied,
                "coverage_floor": NBUCKET_FLOORS,
                "note": ("LILITH-own decided-trade count per symbol/side "
                         "(clean-source). Real n is almost always <5; floors "
                         "retain coverage of the n>=5 cite-faithfully case. "
                         "win_rate VALUE sampling stays synthetic (10-cell "
                         "sample too thin)."),
            },
            "n_bucket_ranges": {"0": [0, 0], "1-4": [1, 4], "5-9": [5, 9], "10+": [10, 30]},
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--location", default="US")
    ap.add_argument("--fit-date", default=None,
                    help="ISO date stamped into the artifact (default: today UTC)")
    args = ap.parse_args()
    fit_date = args.fit_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        from google.cloud import bigquery
    except ImportError:
        print("google-cloud-bigquery not installed (maintenance-only dep).",
              file=sys.stderr)
        return 2
    client = bigquery.Client(project=PROJECT, location=args.location)
    print(json.dumps(fit(client, fit_date), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
