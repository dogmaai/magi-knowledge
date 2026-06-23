---
type: Constitution Section
title: "TRADING UNIVERSE"
description: Dynamic symbol universe and L3 exclusion list -- generated at runtime.
lilith_safe: false
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
BLOCKED (L3): ${getExcludedSymbols().join(', ')} - do NOT trade these.
```

# Runtime components

| Component | Source | Role |
|---|---|---|
| `generateTradingUniverseText()` | `magi-core/lib/symbols.js` | Builds the symbol universe text (sector groups, tickers). |
| `getExcludedSymbols()` | `magi-core/lib/excluded_symbols.js` | Returns the L3-excluded symbols from [optuna-params](/system/echidna-tables/optuna-params.md). |

# Rules

- Scan 5-8 symbols per session.
- Prioritize symbols with strong ISABEL win rates.
- L3-blocked symbols must not be traded (enforced by the
  [L3 guard](/system/guards/l3.md)).

# Cross-references

* Guard layer: [L3 (Symbol Exclusion)](/system/guards/l3.md).
* Optuna params: [optuna-params](/system/echidna-tables/optuna-params.md)
  (`L3_EXCLUDED_SYMBOLS`).

# Citations

* `magi-core/lib/symbols.js` (`generateTradingUniverseText`).
* `magi-core/lib/excluded_symbols.js` (`getExcludedSymbols`).
