---
type: Guard Layer
title: L0 Emergency Kill Switch
description: Blocks every order while the global emergency trading halt is engaged.
lilith_safe: false
status: stable
generated: { by: devin/cloud, at: 2026-08-27T23:14:38Z }
verified: { by: human:jun, at: 2026-08-27T23:14:38Z }
stale_after: 2027-02-23T23:14:38Z
tags: [guard, l0, kill-switch, emergency]
layer: L0
on_fail: block
---

# Purpose

Reads the latest `trading_halted` state from `magi_core.system_control` through
`getKillSwitchState()` in `magi-core/lib/kill-switch.js`. AKA-1 engages the
switch from Telegram with `/kill` and clears it with `/resume`.

# Behaviour

When engaged, this guard blocks **all** orders, including exits, before the
shadow-mode branch and before L-1. It returns
`blocked_by: 'emergency_kill_switch'`. Notifications are suppressed according
to `shouldNotifyKillBlock()`.

The code labels both this guard and the PositionManager guard as L0; the
emergency kill switch runs first.

# Constitution basis

[POSITION MANAGEMENT](/system/constitution/position-management.md): the
emergency halt prevents all new and closing orders while the system is stopped.

# Citations

* `magi-core/src/llm.js` (first order-path guard).
* `magi-core/lib/kill-switch.js` (`getKillSwitchState`,
  `shouldNotifyKillBlock`); `magi_core.system_control`.

## Discord migration pointer (unverified)

Navigation pointer added 2026-11-08 by devin/web. This section is **outside this concept's existing `verified` records and
has not been verified by human:jun**. It does not modify the verified content
above, which remains the baseline until Jun verifies a replacement.
**Status 2026-11-13 (recorded by claude/cloud, not human-verified):** the
Discord implementation is deployed (magi-core `208e3c5`, magi-moni `4fc17bb`,
2026-11-12) and MAGI's Telegram routes, bindings and secrets are retired; see
the [migration plan's live status](../services/discord-migration.md#live-status-2026-11-13) and
[log.md](../../log.md). `/kill` and `/resume` are MAGI Ops Discord slash commands (`/resume` requires the confirmation button); they have not yet been exercised live (gate 5). Until Jun re-verifies this concept, its Telegram
wording describes the pre-cutover baseline, not current behavior. This pointer
authorizes no schema, guard, trading-mode or LILITH boundary change.
