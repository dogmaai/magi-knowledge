---
type: Service
title: magi-moomoo
description: MooMoo broker integration — account, positions, orders, market snapshots.
lilith_safe: false
tags: [service, moomoo, broker]
repo: dogmaai/magi-moomoo
---

# Overview

Wraps the MooMoo broker so magi-core can fetch account equity, positions, and
batch market snapshots, and execute/close orders. Consumed in magi-core via
`lib/moomoo.js` (`getMoomooPositions`, `executeMoomooOrder`, `getMoomooSnapshot`,
`getMoomooMarketData`).

# Used by

* [L1.5](/system/guards/l1-5.md) position-sizing (live equity/positions).
* [positionMgmt](/system/services/magi-core.md) order execution and exits.
* [Surge detector](/system/services/magi-core.md#surge-detector) batch snapshots of the cash-equity universe.
* HERMES `getMoomooMarketData` real-time block.

# Availability

magi-core tracks reachability via `isMoomooAvailable()` / `setMoomooAvailable()`;
[L-1](/system/guards/l-1.md) blocks trades when the broker is down.

# Discovery

URL resolved from [service_endpoints](/system/echidna-tables/service-endpoints.md)
(`service='moomoo'`).
