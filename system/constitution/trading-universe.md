---
type: Constitution Section
title: "TRADING UNIVERSE"
description: Dynamic symbol universe and L3 exclusion list -- generated at runtime.
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-06-23T01:27:14Z }
verified: { by: human:jun, at: 2026-06-23T01:27:14Z }
stale_after: 2026-12-20T01:27:14Z
tags: [constitution, v3, plm, symbols, universe, dynamic]
section_order: 7
version: "3.0"
source: magi-core/lib/constitution.js
dynamic: true
---

# TRADING UNIVERSE

**This section is dynamic** -- generated at runtime by `generateTradingUniverseText()`
(`magi-core/lib/symbols.js`) and `getExcludedSymbols()` (`magi-core/lib/excluded_symbols.js`).

The prompt template is:

```text
${generateTradingUniverseText()}
Scan 5-8 symbols per session using get_price. Prioritize symbols with strong ISABEL win rates.
ADVISORY (L3): ${getExcludedSymbols().join(', ')} - these symbols are under exclusion review. Prefer other names for new BUY/SHORT; if you trade one anyway, justify it explicitly in your reasoning. Closing an existing position is always allowed.
```

# Runtime components

| Component | Source | Role |
|---|---|---|
| `generateTradingUniverseText()` | `magi-core/lib/symbols.js` | Builds the symbol universe text (sector groups, tickers). |
| `getExcludedSymbols()` | `magi-core/lib/excluded_symbols.js` | Returns the L3-excluded symbols from [optuna-params](/system/echidna-tables/optuna-params.md). |

# Rules

- Scan 5-8 symbols per session.
- Prioritize symbols with strong ISABEL win rates.
- L3-listed symbols are advisory under the warn-only demotion (magi-core#548):
  new BUY/SHORT on them is discouraged rather than blocked; warned trades are
  journaled (`WARN_ONLY` thoughts) for measurement. `L3_WARN_ONLY=false`
  restores the hard block.

# Cross-references

* Guard layer: [L3 (Symbol Exclusion)](/system/guards/l3.md).
* Optuna params: [optuna-params](/system/echidna-tables/optuna-params.md)
  (`L3_EXCLUDED_SYMBOLS`).

# Citations

* `magi-core/lib/symbols.js` (`generateTradingUniverseText`).
* `magi-core/lib/excluded_symbols.js` (`getExcludedSymbols`).
