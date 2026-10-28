---
type: Constitution Section
title: "CASH ACCOUNT CONSTRAINT"
description: Conditional prompt block forbidding short selling on a cash account (現物口座); rendered first, before IDENTITY.
lilith_safe: false
status: draft
generated: { by: codex/cloud, at: 2026-10-28T14:00:34Z }
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
`TRD_ENV=REAL`, or an unset, empty or unrecognised `TRD_ENV`, resolves to
cash even with `ACCOUNT_TYPE=margin`. Missing or invalid `ACCOUNT_TYPE`
also resolves to cash.
The prompt and L0.5 use this same resolver. SIMULATE retains margin buying
and short selling; REAL remains cash-only.

`TRD_ENV` declares caller configuration, not broker identity. The REAL
bridge independently enforces its cash-account checks on the final order
path even if caller configuration disagrees with the bridge environment.

## Configuration and verification

| Caller configuration | Resolved type | Cash prompt / L0.5 |
|---|---|---|
| `TRD_ENV=SIMULATE`, `ACCOUNT_TYPE=margin` | margin | Cash-only constraint omitted; other guards still apply |
| `TRD_ENV=SIMULATE`, account type unset/invalid/cash | cash | Enforced |
| `TRD_ENV=REAL`, including `ACCOUNT_TYPE=margin` | cash | Enforced |
| `TRD_ENV` unset/empty/unrecognised, including margin | cash | Enforced |

magi-core#679 changes seven unit environment declarations in
`.github/workflows/deploy.yml` from `ACCOUNT_TYPE=cash` to
`TRD_ENV=SIMULATE` plus `ACCOUNT_TYPE=margin`. The order-chain test fixture
uses the same explicit pair; dedicated cases unset the account type or
set REAL/invalid routing to verify fail-safe cash enforcement.

Verification at magi-core `d9f39d7ebb091f2e7baddb475b92e747fd34cfad`:

```sh
node --test lib/__tests__/account-type.test.js lib/__tests__/trading-policy.test.js
node --experimental-test-module-mocks --test lib/__tests__/llm-place-order.test.js
```

The first command passed 14 tests locally; the second is included in the
[full CI run](https://github.com/dogmaai/magi-core/actions/runs/40699750425)
(1167 pass, 0 fail, 7 skipped). These are configuration/code checks, not
proof of deployed configuration. Deployment and live verification remain
separate Jun operations: confirm the unit's effective environment and the
bridge's `/health.trd_env`, `acc_id`, `cash_only` before testing. A REAL
bridge must retain its cash guard and independent order-enable gate.

## Historical deployment

The 2026-10-27 policy allowed `ACCOUNT_TYPE=margin` without an environment
check. Unit sessions had declared `ACCOUNT_TYPE=cash` since #631
(2026-10-19). The 2026-10-28 change adds the explicit simulator condition;
its live deployment has not been verified by this document. Concept
`status: draft` records pending content verification, not deployment status.

# Intent

Prompt-level statement of the rule the
[L0.5 Cash Account Guard](/system/guards/l0-5.md) enforces
programmatically. The prompt prevents wasted turns; the guard is the
enforcement.

# Citations

* `magi-core/lib/constitution.js` (`buildSwingConstitution`,
  `cashAccountBlock`).
* `magi-core/lib/account-type.js` (`isCashAccount`).


