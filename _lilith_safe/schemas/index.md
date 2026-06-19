# Prompt-block schemas

The LILITH training prompts are assembled from four synthetic data blocks. These
documents pin down the *shape* of each block — field names, types, and enum
values — so that `distill_analysis_methods.py` (prompt builder),
`generate_chosen_examples.py` / `evaluate_anti_hallucination.py` (parser +
grader) all agree on one schema and cannot drift apart.

All values in these schemas are illustrative placeholders. They are never real
trade outcomes, and never a single unit's performance.

# Contents

* [isabel-stats-block](isabel-stats-block.md) - `<ISABEL_STATS_BLOCK>`: LILITH's own historical win/loss stats.
* [fundamentals-block](fundamentals-block.md) - `<FUNDAMENTALS_BLOCK>`: valuation / quality / growth / moat (L1 lane).
* [technicals-block](technicals-block.md) - `<TECHNICALS_BLOCK>`: returns, RSI, SMA cross, ATR (L3 lane).
* [macro-block](macro-block.md) - `<MACRO_BLOCK>`: VIX regime + cash context.
