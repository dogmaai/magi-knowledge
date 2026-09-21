---
type: Service
title: magi-moomoo
description: MooMoo broker integration — account, positions, orders, market snapshots.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-09-17T04:43:35Z }
verified: [{ by: human:jun, at: 2026-06-19T01:02:48Z }, { by: devin/cli, at: 2026-09-16T07:25:00Z }]
stale_after: 2027-03-17T04:43:35Z
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
   confer trust once the allowlist is set. The legacy
   `source='magi-core'` label is disabled by default: it is honoured only
   when `GATE_TRUSTED_CALLER_EMAILS` is unset AND the explicit opt-in
   `GATE_ALLOW_LEGACY_SOURCE=true` is set — **spoofable: any caller with
   invoke access can bypass the approval requirement**, so this is a
   transition mode only, not a safe steady state. The deploy workflow
   refuses to deploy when the allowlist is unset and legacy mode is not
   explicitly enabled, so a REAL-capable deployment cannot silently fall
   back to body-label trust. A warning is logged on startup and once per
   process on first legacy use.

   Token consumption is atomic: inside one BigQuery multi-statement
   transaction the gate runs a conditional `UPDATE` that stamps a unique
   per-request `claim:<uuid>` onto the token's `ISSUED` row (`order_id`
   column, only while `NULL` and no `USED` row exists), then appends the
   `USED` audit event. BigQuery serializes concurrent transactions that
   modify the same row, so only one claimant commits; the loser aborts,
   retries, sees the row already claimed, and its claim read-back fails —
   a token cannot be spent twice. Note: pure append-only consumption is
   NOT safe under BigQuery snapshot isolation (concurrent appends do not
   conflict), which is why the claim rides on an `UPDATE` — the `ISSUED`
   row is mutated exactly once at consumption; `USED` rows remain
   append-only.
5. `approval_token` and `source` are consumed by the gate and never forwarded
   to the bridge.
6. `POST /trade/place_order` is never retried — a failed non-idempotent order
   must not be submitted twice.

Manual/Telegram orders (magi-moni, `source='magi-moni'`) obtain tokens by
writing an `ISSUED` row after a confirmed user approval; the model cannot
self-authorize.

**Trust model of `source`**: it is a request-body label, *not*
cryptographically verified. It confers authorization only under the
explicit `GATE_ALLOW_LEGACY_SOURCE=true` opt-in described above; with the
allowlist configured it is observational metadata. Any caller able to
reach the endpoint and craft the body could otherwise spoof `magi-core`
and bypass the token requirement — the stronger boundary is the OIDC
trusted-caller check in step 4.

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

**Bridge authentication** — the on-prem bridge (`bridge/moomoo_bridge.py`)
is itself authenticated, so a caller that reaches the bridge directly cannot
skip the Cloud Run gate. With `BRIDGE_AUTH_TOKEN` set, every endpoint except
`GET /health` requires `Authorization: Bearer <token>` (the proxy sends the
secret `MOOMOO_BRIDGE_AUTH_TOKEN`). When the token is unset, read-only and
SIMULATE endpoints keep legacy behaviour during rollout, but a REAL
`/place_order` fails closed with HTTP 403 — an unauthenticated bridge can
never place a real-money order. `/health` reports `auth_required` so
monitors can detect an unprotected deployment.

# Discovery

* Callers resolve magi-moomoo's URL from
  [service_endpoints](/system/echidna-tables/service-endpoints.md) with
  `service='magi-moomoo'`.
* magi-moomoo resolves the Cloudflare tunnel URL for the bridge from the
  same table with `service='opend-proxy'` — the `legacy` route and the
  `auto` fallback leg (see Bridge routing). The private route needs no
  lookup: it is the static `BRIDGE_PRIVATE_URL` env var.
