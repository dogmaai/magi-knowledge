---
type: Distribution Priors
title: ECHIDNA Fitted Input Priors (LILITH-safe)
description: Real aggregate input distributions fitted from ECHIDNA for LILITH distill grounding.
lilith_safe: true
distribution_priors: true
tags: [lilith, training, distill, distributions, clean-source]
source_tables: [trades, trades_active, portfolio_snapshots]
fit_date: 2026-06-19
---

# Purpose

The LILITH distill pipeline (`dogmaai/lilith-training`
`scripts/distill_analysis_methods.py`) historically sampled its synthetic input
blocks (VIX regime, VIX level, cash %, ATR %, ISABEL data-sufficiency) from
hard-coded uniform ranges. That produced a **train/serve skew**: e.g. the VIX
regime was drawn uniformly (~20% each) while the live environment is dominated
by `HIGH_FEAR`/`LOW_FEAR`.

This doc is the **single source of truth** for the *real* aggregate priors used
to ground those blocks. It carries only **aggregates** — no raw rows, no
per-symbol picks, no other unit's data.

# Clean-source attestation

* All figures are **aggregates** (frequencies / quantiles), never raw rows.
* ISABEL data-sufficiency is scoped to **`unit_name IN ('LILITH', 'ADAM')` only**
  (`ADAM` is the renamed qwen base-model unit; historical rows carry `LILITH`) —
  LILITH's own decided-trade counts. No other MAGI unit's performance is present
  or derivable.
* No ticker-level picks, no Section markers, no cross-unit names.
* `empirical` = observed; `applied` = what distill samples from, after a
  documented **coverage floor** that guarantees the safety-critical rare regimes
  (`EXTREME_FEAR`/`PANIC`) and the `n >= 5` "cite faithfully" case still appear
  in SFT. Floors are the only deviation from raw empirical and are recorded
  inline so the transform is auditable.
* `source` is carried per-field so the consumer can tag each generated value
  `echidna_fitted` vs `synthetic`. Fundamentals, RSI/SMA, and multi-period
  returns are **absent from ECHIDNA** and remain synthetic (not in this doc).

# Provenance

Fitted by `scripts/fit_distributions.py` (read-only BigQuery, project
`screen-share-459802`, dataset `magi_core`) against the active views. Re-run that
script to refresh the block below; values are rounded and deterministic.

# Priors

```json
{
  "schema_version": "1.0",
  "fit": {
    "date": "2026-06-19",
    "source_project": "screen-share-459802",
    "source_dataset": "magi_core",
    "scope": "VIX from trades.market_snapshot; ATR + ISABEL from trades_active (active scope); cash from portfolio_snapshots. ISABEL scoped unit_name=LILITH (clean-source).",
    "decided_trades_all_units": 284,
    "snapshots_with_regime": 507,
    "lilith_decided_trades": 29
  },
  "macro": {
    "vix_regime_weights": {
      "empirical": {
        "CALM": 0.0,
        "LOW_FEAR": 0.3649,
        "NORMAL": 0.0217,
        "HIGH_FEAR": 0.5858,
        "EXTREME_FEAR": 0.0276,
        "PANIC": 0.0
      },
      "applied": {
        "CALM": 0.03,
        "LOW_FEAR": 0.3186,
        "NORMAL": 0.04,
        "HIGH_FEAR": 0.5114,
        "EXTREME_FEAR": 0.07,
        "PANIC": 0.03
      },
      "coverage_floor": {
        "CALM": 0.03,
        "NORMAL": 0.04,
        "EXTREME_FEAR": 0.07,
        "PANIC": 0.03
      },
      "note": "applied = empirical for HIGH/LOW_FEAR rescaled under floors; floors guarantee SFT coverage of the safety-critical EXTREME_FEAR/PANIC gate (Constitution hard gate). CALM/PANIC unobserved in data."
    },
    "vix_level_band": {
      "CALM": {
        "lo": 10.0,
        "hi": 15.0,
        "source": "synthetic"
      },
      "LOW_FEAR": {
        "lo": 16.0,
        "hi": 19.0,
        "source": "echidna_fitted"
      },
      "NORMAL": {
        "lo": 20.0,
        "hi": 25.0,
        "source": "synthetic"
      },
      "HIGH_FEAR": {
        "lo": 22.0,
        "hi": 33.0,
        "source": "echidna_fitted"
      },
      "EXTREME_FEAR": {
        "lo": 25.0,
        "hi": 35.0,
        "source": "echidna_fitted"
      },
      "PANIC": {
        "lo": 35.0,
        "hi": 60.0,
        "source": "synthetic"
      },
      "note": "bands = real [p10,p90] where source=echidna_fitted; prior synthetic bands retained where unobserved."
    },
    "cash_pct_quantiles": {
      "p10": 31.5,
      "p25": 79.7,
      "p50": 98.0,
      "p75": 100.0,
      "p90": 122.0,
      "clamp": [
        0.0,
        100.0
      ],
      "source": "echidna_fitted",
      "note": "portfolio_snapshots cash/equity; paper account is mostly cash. clamp to [0,100]."
    }
  },
  "technicals": {
    "atr_pct_of_price_quantiles": {
      "p10": 2.051,
      "p25": 2.409,
      "p50": 3.174,
      "p75": 4.005,
      "p90": 6.086,
      "source": "echidna_fitted",
      "note": "atr_at_execution / execution price."
    }
  },
  "isabel_lilith": {
    "n_bucket_weights": {
      "empirical": {
        "0": 0.4444,
        "1-4": 0.3889,
        "5-9": 0.1667,
        "10+": 0.0
      },
      "applied": {
        "0": 0.4,
        "1-4": 0.35,
        "5-9": 0.15,
        "10+": 0.1
      },
      "coverage_floor": {
        "5-9": 0.15,
        "10+": 0.1
      },
      "note": "LILITH-own decided-trade count per symbol/side (clean-source). Real n is almost always <5; floors retain coverage of the n>=5 cite-faithfully case. win_rate VALUE sampling stays synthetic (10-cell sample too thin)."
    },
    "n_bucket_ranges": {
      "0": [
        0,
        0
      ],
      "1-4": [
        1,
        4
      ],
      "5-9": [
        5,
        9
      ],
      "10+": [
        10,
        30
      ]
    }
  }
}
```

# Consumption

`scripts/lilith_safe_loader.py` exposes these via
`LilithSafeKnowledge.distribution_priors()` (parses the JSON block above after
the same path + `lilith_safe` validation as every other read). The LILITH-side
accessor `lilith_knowledge.distribution_priors()` wraps it. The distill block
builders sample from `applied` weights and quantile bands using the existing
deterministic `random.Random` so a given `(symbol, scenario, seed)` reproduces
identical output.
