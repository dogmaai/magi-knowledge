---
type: Service
title: magi-isabel
description: ISABEL pattern framework — win/lose centroids and embedding analysis.
lilith_safe: false
tags: [service, isabel, embeddings, patterns]
repo: dogmaai/magi-isabel
---

# Overview

ISABEL is MAGI's learning/feedback framework. It builds win vs lose reasoning
centroids and embedding-based pattern stats per symbol/direction/unit, which the
guard layers consume.

# Produces

* [isabel-patterns](/system/echidna-tables/isabel-patterns.md) — centroids + win-rates.
* ISABEL stats blocks (the cross-unit aggregate; LILITH uses only its **own** slice).

# Consumed by

* [L5](/system/guards/l5.md) thought-similarity (lose centroids).
* [L7](/system/guards/l7.md) composite scoring.
* ISABEL L4 Cohere embedding analysis (`magi-core/src/isabel_l4.js`, `lib/embeddings.js`).

# Contamination note

ISABEL's aggregate stats are cross-unit and `lilith_safe: false`. LILITH may use
only its own `unit_name` slice (the
[ISABEL_STATS_BLOCK](/_lilith_safe/schemas/isabel-stats-block.md) schema), never
the cross-unit centroids.
