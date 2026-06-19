# Distribution priors

Real **aggregate** input distributions fitted from ECHIDNA, used to ground the
LILITH distill pipeline's synthetic prompt blocks (fixing train/serve skew in
VIX regime, VIX level, cash %, ATR %, and ISABEL data-sufficiency).

Aggregates only — no raw rows, no per-symbol picks, no other unit's data. The
ISABEL data-sufficiency prior is scoped to LILITH's own decided trades
(clean-source).

# Contents

* [echidna-priors](echidna-priors.md) - Fitted priors (empirical + applied, with
  documented coverage floors). Refresh with `scripts/fit_distributions.py`.

# Boundary

Consumed exclusively through `scripts/lilith_safe_loader.py`
(`distribution_priors()`), which enforces the `_lilith_safe/` path boundary and
the `lilith_safe: true` flag like every other read.
