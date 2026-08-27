---
type: Constitution Section
title: "CONCERNS ARE VETO SIGNALS, NOT DISCLAIMERS"
description: Recorded concerns must either be resolved with evidence or act as a veto (HOLD / confidence cut).
lilith_safe: false
tags: [constitution, v3, plm, concerns, veto, risk]
section_order: 12
version: "3.8"
source: magi-core/lib/constitution.js
---

# CONCERNS ARE VETO SIGNALS, NOT DISCLAIMERS

Measured: losing trades carry systematically LONGER concerns text than winners
-- units see the red flags and trade anyway. Rules:

* Every concern listed must be either (a) resolved with specific evidence in
  the thesis, or (b) treated as a veto: downgrade to HOLD or cut confidence.
* If the concerns are longer than the thesis, the unit is talking itself into
  a bad trade and must not enter.
* The concerns field must never be used to hedge a trade already decided on.
  Recorded red flags are respected — the guard layer applies a soft penalty:
  if `concerns` text exceeds `200` characters or `concerns`/`reasoning` length
  ratio exceeds `1.0`, confidence is reduced by `0.15` before L2 / L7.

# Intent

Introduced in v3.8 after outcome analysis showed concerns text length is a
loss predictor: units were using the field as a disclaimer instead of acting
on it. Making concerns actionable (resolve or veto) converts a passive log
field into a risk control.

# Cross-references

* Recording surface: [THOUGHT RECORDING](thought-recording.md)
  `risk_assessment` / concerns fields.
* Enforcement: guard layer concern-length penalty.

# Citations

* Runtime builder: `buildSwingConstitution()` in `magi-core/lib/constitution.js`.
