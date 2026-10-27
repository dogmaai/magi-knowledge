---
type: Guard Layer
title: L1.6.RECON Ledger↔Broker Reconciliation
description: Fail-closed reconciliation of the trades ledger's net quantity per symbol against the broker position list; blocks risk-increasing orders while divergent or unverified.
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-10-27T03:30:00Z }
verified: [{ by: claude/cloud, at: 2026-10-27T03:30:00Z }]
stale_after: 2027-04-27T03:30:00Z
tags: [guard, l1.6, reconciliation, ledger, broker, fail-closed]
layer: L1.6.RECON
on_fail: block risk-increasing orders (RECON_FAIL_CLOSED)
---

# Purpose

Stops new exposure whenever the `trades` ledger and the broker disagree on
what the account holds. A divergent book cannot be protected by the
quantity-based guards downstream (L1.5, L1.6, L1.7), so risk-increasing
orders are blocked until a human reconciles it; exits and other
position-reducing orders always pass.

# Behaviour

* `checkAndClosePositions()` (`magi-core/src/positionMgmt.js`) runs at the
  top of every session turn. It first marks the verdict `unknown`, fetches
  broker positions, then calls `reconcileLedgerVsBroker()`.
* **Ledger side** (`magi-core/lib/recon-ledger.js`, magi-core PR pending):
  the signed sum (`buy` +qty, `sell` −qty) of **every** non-quarantined
  `trades` row (`result` not `CANCELLED`/`CONTAMINATED`) with `timestamp >=
  RECON_LEDGER_EPOCH`, terminal rows included — the same netting the broker
  applies. Unconfirmed rows still carrying `qty=0` contribute nothing until
  the evaluator reconciles the fill, so a real fill shows as a transient
  divergence (fail-closed), never as a false "consistent".
* **Broker side**: MooMoo positions (signed qty).
* Malformed input — a broker position or ledger row without a symbol, or
  an unparseable quantity — throws, so the verdict becomes `unknown`
  (fail-closed); it is never skipped or coerced to 0, which could report a
  divergent book as consistent. Duplicate broker rows for one symbol are
  netted.
* Per symbol, `|ledger − broker| >= 0.5` is divergent: `MISMATCH` (both
  sides hold), `PHANTOM_LEDGER` (ledger only), `UNTRACKED` (broker only).
  Each divergent symbol is journaled as a `thoughts` row
  (`action='WARN_ONLY'`, `concerns='L1.6.RECON'`, reasoning `Ledger/broker
  divergence: SYM ledger net=… vs broker=… [KIND]`), with an aggregated
  Telegram ALERT after 4 consecutive ~15-min runs and every 24 thereafter.
* **Gate** (`magi-core/src/llm.js`, after the L0 kill switch, before JEV and
  the shadow short circuit): while the verdict is not `consistent`, an order
  that does not verifiably reduce exposure is rejected (`blocked_by:
  'recon_divergence'`, `thoughts` row `action='BLOCKED'`). This applies to
  every unit, including `TRADE_MODE=SHADOW`. `RECON_FAIL_CLOSED=false`
  reverts to warn-only — a Jun decision, never an incident workaround.

# Ledger epoch and reset procedure

`RECON_LEDGER_EPOCH` (env; default `2026-10-27T03:00:00Z`) is an instant at
which ledger and broker were both verified flat. Rows before it are
excluded because pre-cleanup bookkeeping drift makes an all-time cumulative
sum meaningless (all-time net was non-zero on ~35 symbols on 2026-10-27).
An unparseable value fails the reconciler to `unknown` (fail-closed).

To reset after a divergence that is fixed at the broker or proven to be
ledger drift: pick an instant at which the broker position list is known,
journal one baseline row per broker-held symbol at/after that instant (or
none if flat), set `RECON_LEDGER_EPOCH` to it, and deploy. Moving the epoch
is a Jun decision and deploy. Do not mark ledger rows `CANCELLED` or fill
`exit_timestamp` merely to clear the gate.

# History

* magi-core#527 (2026-10-02): reconciler added, warn-only.
* magi-core#547 / #557 (2026-10-03): promoted to fail-closed.
* 2026-10-03/05: `scripts/quarantine-ghost-ledger.mjs` quarantined ~40
  phantom symbols and seeded `RECON_BASELINE` rows.
* **Incident 2026-10-21..26**: the ledger side then summed only
  `exit_timestamp IS NULL` rows. Since magi-core#625/#630 (2026-10-19) close
  legs are stamped terminal per row, so the sell leg dropped out while the
  entry it settled stayed `HOLD`; `RECON_BASELINE` rows could never be
  settled at all. WMT (66), NKE (840) and AMAT (35) read as
  `PHANTOM_LEDGER` against broker 0 and the gate blocked every
  risk-increasing order: zero `trades` rows on 2026-10-21, 22, 23 and 26.
  Fixed by the 2026-10-27 ledger fix (see
  [trades](/system/echidna-tables/trades.md) `BASELINE_SETTLED`) and the
  epoch-based ledger query; the quarantine script was removed because its
  reset (quarantine open rows + insert baseline) double-counts under
  cumulative semantics.

# Constitution basis

[POSITION MANAGEMENT](/system/constitution/position-management.md): sizing
and exit guards assume the system knows what it holds.

# Citations

* `magi-core/src/positionMgmt.js` (`reconcileLedgerVsBroker`,
  `getReconDivergence`).
* `magi-core/lib/recon-ledger.js` (`RECON_LEDGER_QUERY`,
  `resolveReconLedgerEpoch`, `diffLedgerVsBroker`).
* `magi-core/src/llm.js` (L1.6.RECON gate).
