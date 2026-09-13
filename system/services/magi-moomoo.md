---
type: Service
title: magi-moomoo
description: MooMoo broker integration — account, positions, orders, market snapshots.
lilith_safe: false
status: stable
generated: { by: devin/cloud, at: 2026-06-19T01:02:48Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [service, moomoo, broker]
repo: dogmaai/magi-moomoo
---

# Overview

Wraps the MooMoo broker so magi-core can fetch account equity, positions, and
batch market snapshots, and execute/close orders. Consumed in magi-core via
`lib/moomoo.js` (`getMoomooPositions`, `executeMoomooOrder`, `getMoomooSnapshot`,
`getMoomooMarketData`).

# Order gate (`POST /trade/place_order`)

magi-moomoo is not a thin proxy: every order from every caller passes a
server-side gate (`lib/order-gate.mjs`) before being forwarded to the bridge.

1. **Parameter validation** — `side` ∈ {`buy`,`sell`}, `qty` positive integer ≤ 1000.
2. **L0 kill switch (3 states)** — confirmed `HALTED` rejects **all**
   orders, including reducing ones (the halt check runs before reduction
   detection); `RUNNING` is the normal path; a read failure degrades to
   `UNKNOWN` (reduce-only). A confirmed `HALTED` is latched across
   subsequent read failures so a halted state cannot silently clear.
3. **Reduction detection** — an order counts as risk-reducing only if it
   is counter-direction to the current position (selling a long or buying
   to cover a short) *and* moves it toward zero without crossing it
   (`qty ≤ |position|`). Reducing orders pass the gate in `RUNNING` and
   `UNKNOWN` states — but not in `HALTED`. A positions-lookup failure
   treats the order as non-reducing (fail-closed).
4. **Non-reducing orders require authorization** — either
   `source='magi-core'` (the trusted-caller label magi-core stamps on its own
   already-gated orders) or a single-use token from
   `magi_core.order_approvals` (60s TTL, bound to symbol/side/qty; `ISSUED` /
   `USED` rows are append-only). In `UNKNOWN` state even a valid token is
   rejected.
5. `approval_token` and `source` are consumed by the gate and never forwarded
   to the bridge.
6. `POST /trade/place_order` is never retried — a failed non-idempotent order
   must not be submitted twice.

Manual/Telegram orders (magi-moni, `source='magi-moni'`) obtain tokens by
writing an `ISSUED` row after a confirmed user approval; the model cannot
self-authorize.

**Trust model of `source`**: it is a request-body label, *not*
cryptographically verified. The gate trusts it because (a) only
authenticated callers can reach the service (Cloud Run OIDC) and
(b) only first-party application code sets it — LLM tool arguments cannot
influence it. Any caller able to reach the endpoint and craft the body
could spoof `magi-core` and bypass the token requirement; a stronger
boundary would verify caller identity in the OIDC token (requires
per-service service accounts — the services currently share the default
compute SA) or a shared secret.

# Used by

* [L1.5](/system/guards/l1-5.md) position-sizing (live equity/positions).
* [positionMgmt](/system/services/magi-core.md) order execution and exits.
* [Surge detector](/system/services/magi-core.md#surge-detector) batch snapshots of the cash-equity universe.
* HERMES `getMoomooMarketData` real-time block.

# Availability

magi-core tracks reachability via `isMoomooAvailable()` / `setMoomooAvailable()`;
[L-1](/system/guards/l-1.md) blocks trades when the broker is down.

# Discovery

* Callers resolve magi-moomoo's URL from
  [service_endpoints](/system/echidna-tables/service-endpoints.md) with
  `service='magi-moomoo'`.
* magi-moomoo resolves the OpenD bridge tunnel URL from the same table with
  `service='opend-proxy'` (cached; refreshed on stale-connection failures).
