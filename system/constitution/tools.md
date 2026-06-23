---
type: Constitution Section
title: "Available Tools"
description: The tool-call interface exposed to PLM units during a session.
lilith_safe: false
tags: [constitution, v3, plm, tools, session]
section_order: 14
version: "3.0"
source: magi-core/lib/constitution.js
---

# Available Tools

The following tools are declared in the constitution prompt tail and implemented
as tool-call handlers in `magi-core/src/session.js`:

| Tool | Purpose |
|---|---|
| `get_account` | Retrieve account balance and buying power. |
| `get_price` | Get current price (also used for VIX proxy via UVXY). |
| `get_price_history` | Historical OHLCV data for technical analysis. |
| `get_positions` | List current open positions (session workflow step 1). |
| `log_analysis` | Record the mandatory thought (see [thought-recording](thought-recording.md)). |
| `place_order` | Execute a trade order (after all guards pass). |
| `ask_isabel` | Query ISABEL for historical stats or market context (see [isabel-gateway](isabel-gateway.md)). |

# Citations

* Tool implementations: `magi-core/src/session.js`.
* Guard pipeline (applied to `place_order`): [guards index](/system/guards/).
