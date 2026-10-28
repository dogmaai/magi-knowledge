---
type: Guard Layer
title: Fixed Universe and Cash-First Trading Policy
description: Fixed monitoring candidates and cash-first order permission, independent of ledger reconciliation.
lilith_safe: false
status: draft
generated: { by: codex/cloud, at: 2026-10-28T11:22:26Z }
stale_after: 2027-04-28T00:00:00Z
tags: [guard, universe, cash-account, monitoring, risk-control]
layer: UNIVERSE / L0.5
on_fail: block unverified entries or exposure increases
---

# Policy

Jun's instruction on 2026-10-28 fixes monitoring candidates to symbols usable
for both cash and margin trading, with cash trading as the default. Implement
this separately from [RECON](l1-6-recon.md).

The initial fixed list is the existing 60-symbol `TRADING_UNIVERSE` in
`magi-core/lib/symbols.js`; SES and GRRR remain excluded. Adding a symbol
requires review of cash and margin eligibility. List membership is an approved
candidate selection, not a fresh broker eligibility certification. This change
does not independently recheck the broker eligibility of all 60 symbols.

This concept remains **draft** pending implementation review; the chat
instruction authorizes the policy change, not a human verification entry for
the code or this document.

# Monitoring

* VIX watchlist rows, HERMES manual/daily focus and environment overrides
  are intersected with the fixed list. Research can change priority, never
  expand the candidate set. HERMES retains its existing cost-safe default
  subset and index context; it need not collect all 60 names every run.
* PLM symbol-stat prompts use fixed-list candidates. Bearish watchlist
  research does not instruct cash-account units to open shorts.
* Existing holdings are never filtered from broker position responses,
  position management or RECON. A removed symbol can still be researched
  to manage and close an existing holding; macro proxies remain context.

# Order gate

`checkTradingPolicy()` in `magi-core/lib/trading-policy.js` runs in
`src/llm.js` after the emergency kill switch, before RECON, JEV and the
SHADOW recording branch. It applies to every PLM unit in live and shadow
modes. It does not read or change the RECON verdict or ledger epoch.

* Outside the fixed universe: reject with `blocked_by: trading_universe`
  and a `thoughts` guard row carrying `concerns: UNIVERSE`, unless broker
  evidence proves the order only reduces an existing position.
* Cash mode: SELL must verifiably reduce a held long. Reject otherwise
  with `blocked_by: cash_account_guard`, `concerns: L0.5`. The proof uses
  fresh broker positions and order history rather than requiring the LLM
  to have called `get_positions` first.
* Working same-side exits reserve quantity (the full original quantity if
  filled quantity is unavailable). Working opposite-side entries
  do not create available holdings. Oversells, overcovers and flips are
  not reductions. Unknown or malformed evidence cannot earn an exemption.
* `ACCOUNT_TYPE` unset, empty or unrecognized remains cash. Only the
  existing explicit `ACCOUNT_TYPE=margin` opt-in selects margin behavior;
  it does not expand the universe. No deployment mode is changed here.
* Symbols are normalized before validation. After all sizing guards, the
  final order is checked again against the broker evidence; sizing cannot
  enlarge a reduction into a new position. An invalid final quantity is
  rejected before dispatch.
* L3 exclusion rules and RECON still run independently. Their warn-only
  flags cannot disable this policy, and passing this policy is not an
  exemption from any other guard.

# Reference revisions and validation

Implementation base: magi-core `953637db7d60b5f965f48d2891d48f3aee798ac4`.
Reference OKF pin: `08edf13be5923807e8a1dae37e91ed9128ba8c70`.
The pinned [trading-universe](/system/constitution/trading-universe.md)
concept is stable (human:jun); its dynamic section describes runtime prompt
rendering. The new fixed candidate boundary and hard order gate are specified
here. The pin's [L0.5](l0-5.md) is draft and describes the earlier session
cache check; this draft replaces that behavior when the implementation lands.
The pinned RECON concept is draft and is not modified by this policy.

Regression coverage: outside-list BUY/SELL blocked, removed holdings can exit,
flips blocked, pending exits reserve quantity, failed broker reads fail closed,
cash default, SHADOW parity, research-list filtering, and unchanged RECON checks.
No tables, schemas, LILITH boundaries or production infrastructure are changed.
Independent review is required before merge; production deployment remains Jun's.
