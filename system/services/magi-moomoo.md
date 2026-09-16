---
type: Service
title: magi-moomoo
description: MooMoo broker integration — account, positions, orders, market snapshots.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-09-16T07:25:00Z }
verified: [{ by: human:jun, at: 2026-06-19T01:02:48Z }, { by: devin/cli, at: 2026-09-16T07:25:00Z }]
stale_after: 2027-03-16T07:25:00Z
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
4. **Non-reducing orders require authorization** — either a verified
   trusted-caller identity or a single-use token from
   `magi_core.order_approvals` (60s TTL, bound to symbol/side/qty; `ISSUED` /
   `USED` rows are append-only). In `UNKNOWN` state even a valid token is
   rejected.

   Trusted-caller verification is OIDC subject verification, not a body
   label. The caller's Google-signed ID token arrives via
   `Authorization` (direct calls) or `X-Serverless-Authorization`
   (forwarded by Cloud Run's IAM proxy). **Cloud Run strips the token
   signature before forwarding**, so a platform-forwarded token cannot be
   re-verified in-app; for that path the gate validates the claims —
   `iss` is `accounts.google.com`, `aud` equals this service's URL (from
   `service_endpoints` or `GATE_OIDC_AUDIENCE`), `exp` is unexpired, and
   `email_verified` is true — relying on Cloud Run IAM having already
   authenticated the signature (clients cannot inject this header).
   `Authorization`-header tokens still carry a signature and are fully
   re-verified in-app (`OAuth2Client.verifyIdToken`) plus the same claim
   checks. In both paths the `email` claim must match
   `GATE_TRUSTED_CALLER_EMAILS` — the dedicated service account the
   order-placing magi-core jobs run as.

   The request-body `source` field is observational only and cannot
   confer trust once the allowlist is set. While
   `GATE_TRUSTED_CALLER_EMAILS` is unset, the legacy
   `source='magi-core'` label is still accepted — **spoofable: any
   caller with invoke access can bypass the approval requirement**, so
   this is a transition mode only, not a safe steady state; the allowlist
   MUST be configured for the gate to provide real authentication. A
   warning is logged on startup and once per process on first use.
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

# Bridge routing (dual-route)

Since 2026-09 (magi-moomoo#66, PRs #76–#78) the path to the on-prem bridge is
dual-route, selected per request by `BRIDGE_ROUTE_MODE`:

| Mode | Behaviour |
|---|---|
| `auto` (current) | Prefer the private route; fall back to the Cloudflare tunnel when the private route is down (network errors, failed `/health` probes, or gateway-class 502/503/504 responses count as route failures; other HTTP responses count as reachable). |
| `private` | Private route only — no fallback. Planned steady state once the private path is proven stable. |
| `legacy` | Cloudflare tunnel only; `BRIDGE_PRIVATE_URL` ignored. Clean rollback path. |

**Private route** (`BRIDGE_PRIVATE_URL=http://10.42.0.10:11436`):

```
Cloud Run (Direct VPC Egress, --vpc-egress=private-ranges-only)
  → magi-vpc / magi-subnet-tokyo (10.42.0.0/24, asia-northeast1)
  → bridge-gw VM (e2-micro, 10.42.0.10, asia-northeast1-a, can-ip-forward)
  → nftables DNAT tcp:11436 → WireGuard peer 10.99.0.2
  → TIALA → moomoo-bridge (localhost:11436) → OpenD (localhost:11111)
```

WireGuard: `bridge-gw` is `10.99.0.1` (public endpoint `35.189.148.92:51820`,
static IP `bridge-gw-ip`); TIALA is `10.99.0.2`. VPC firewall:
`magi-allow-bridge` (tcp:11436 from 10.42.0.0/24) and `magi-allow-wg`
(udp:51820 ingress, target tag `bridge-gw`). Setup scripts live in
`scripts/setup-wireguard-*.sh`. Because egress is `private-ranges-only`,
BigQuery (order gate, `opend-proxy` lookup) and the Cloudflare fallback keep
using the default egress — no Cloud NAT is required.

**Cloudflare route** — resolved from `service_endpoints` with
`service='opend-proxy'` (cached; refreshed on stale-connection failures),
then through the `moomoo-bridge` Named Tunnel to the same on-prem bridge.
Required by `legacy` and by `auto` as the fallback leg; unused in `private`.

`/route_status` reports `active_route`, per-route request/error counters with
p50/p95 latency, `private_up`, and `fallback_events`. `POST
/trade/place_order` is never retried on either route — the no-retry rule in
the order gate section applies to routing too.

# Discovery

* Callers resolve magi-moomoo's URL from
  [service_endpoints](/system/echidna-tables/service-endpoints.md) with
  `service='magi-moomoo'`.
* magi-moomoo resolves the Cloudflare tunnel URL for the bridge from the
  same table with `service='opend-proxy'` — the `legacy` route and the
  `auto` fallback leg (see Bridge routing). The private route needs no
  lookup: it is the static `BRIDGE_PRIVATE_URL` env var.
