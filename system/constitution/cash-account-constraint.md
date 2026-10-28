---
type: Constitution Section
title: "CASH ACCOUNT CONSTRAINT"
description: Conditional prompt block forbidding short selling on a cash account (現物口座); rendered first, before IDENTITY.
lilith_safe: false
status: draft
generated: { by: codex/cloud, at: 2026-10-28T13:40:20Z }
verified: [{ by: claude/cloud, at: 2026-10-27T03:30:00Z }, { by: human:jun, at: 2026-10-27T05:15:00Z }]
stale_after: 2027-04-27T05:15:00Z
tags: [constitution, v3, plm, cash-account, short-selling, conditional]
section_order: 0
version: "3.9"
source: magi-core/lib/constitution.js
---

# CASH ACCOUNT CONSTRAINT

Rendered immediately after the `== MAGI CONSTITUTION ==` header, before
[IDENTITY](identity.md), **only when the account is a cash account**:

- The account is a CASH account (現物口座). Short selling is prohibited.
- Open new positions only with BUY.
- SELL only to close or reduce long positions already held.
- Do not SELL a symbol that is not held — the system will block it.
- Focus on BUY opportunities and HOLD decisions.

# Condition

`isCashAccount()` (`magi-core/lib/account-type.js`). Following Jun's
2026-10-28 clarification, the cash block is omitted only for the explicit
pair `TRD_ENV=SIMULATE` and `ACCOUNT_TYPE=margin` (case/whitespace normalised).
REAL, unknown or missing routing resolves to cash even if
`ACCOUNT_TYPE=margin`; missing or invalid account type also resolves to cash.
The prompt and L0.5 use this same resolver. SIMULATE retains margin buying
and short selling; REAL remains cash-only.

`TRD_ENV` declares caller configuration, not broker identity. The REAL
bridge independently enforces its cash-account checks on the final order
path even if caller configuration disagrees with the bridge environment.

## Historical deployment

The 2026-10-27 policy used cash as the default and allowed an explicit
`ACCOUNT_TYPE=margin` opt-in without an environment check. Every unit
session had carried `ACCOUNT_TYPE=cash` since magi-core#631 (2026-10-19).
The new unit deploy configuration declares the simulator pair; this draft
does not claim that it has been deployed.

# Intent

Prompt-level statement of the rule the
[L0.5 Cash Account Guard](/system/guards/l0-5.md) enforces
programmatically. The prompt prevents wasted turns; the guard is the
enforcement.

# Citations

* `magi-core/lib/constitution.js` (`buildSwingConstitution`,
  `cashAccountBlock`).
* `magi-core/lib/account-type.js` (`isCashAccount`).

