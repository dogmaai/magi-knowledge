---
type: Guard Layer
title: L0 Emergency Kill Switch
description: Blocks every order while the global emergency trading halt is engaged.
lilith_safe: false
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
