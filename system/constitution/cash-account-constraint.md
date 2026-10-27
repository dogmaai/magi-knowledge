---
type: Constitution Section
title: "CASH ACCOUNT CONSTRAINT"
description: Conditional prompt block forbidding short selling on a cash account (現物口座); rendered first, before IDENTITY.
lilith_safe: false
status: stable
generated: { by: claude/cloud, at: 2026-10-27T03:30:00Z }
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

`isCashAccount()` (`magi-core/lib/account-type.js`). Account policy (Jun,
2026-10-27): the cash account is the only live target; anything other than
an explicit `ACCOUNT_TYPE=margin` resolves to cash, so this block renders by
default. Every unit session has carried `ACCOUNT_TYPE=cash` since
magi-core#631 (2026-10-19), so the block has been part of the live prompt
since then — this doc closes that documentation gap (the
`okf-constitution-drift` test requires a stable doc for every rendered
`[SECTION]`).

# Intent

Prompt-level statement of the rule the
[L0.5 Cash Account Guard](/system/guards/l0-5.md) enforces
programmatically. The prompt prevents wasted turns; the guard is the
enforcement.

# Citations

* `magi-core/lib/constitution.js` (`buildSwingConstitution`,
  `cashAccountBlock`).
* `magi-core/lib/account-type.js` (`isCashAccount`).
