---
type: BigQuery Table
title: constitution
description: Versioned store of the MAGI Unified System Constitution, by section.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=constitution&page=table
lilith_safe: false
tags: [echidna, bigquery, constitution, governance]
dataset: magi_core
table_type: BASE TABLE
---

Versioned governance store. The current version is **v3.0** (effective
2026-06-18); v2.2 is deprecated. Each row is a section of a constitution
version. The LILITH-safe *subset* of these rules is mirrored under
[_lilith_safe/constitution](/_lilith_safe/constitution/) — do not feed the full
table to LILITH.

# Schema

| Column | Type | Description |
|---|---|---|
| version | STRING | Constitution version (e.g. `3.0`). |
| title | STRING | Document title. |
| section_index | STRING | JSON array of section names. |
| content | STRING | Section content. |
| effective_date | DATE | When the version took effect. |
| deprecated_at | TIMESTAMP | When superseded (null if current). |
| author | STRING | Author. |
| sha256 | STRING | Content hash. |
| created_at | TIMESTAMP | Insert time. |

# v3.0 sections (effective 2026-06-18)

NORTH STAR, CORE PRINCIPLES, ALPHA DOCTRINE, EXPECTANCY & POSITION MANAGEMENT,
SYSTEM DOMAINS, AUTONOMOUS TRADING UNITS, ISABEL FRAMEWORK, MARKET REGIME (VIX),
VIX-CORRELATED WATCHLIST FRAMEWORK, AUTONOMY DOCTRINE, TRADING FREEDOM,
DEVELOPMENT ROLES, FORBIDDEN ACTIONS, DATA PIPELINE, SUCCESS CRITERIA,
VERSION HISTORY.

# Citations

* Builder: `magi-core/lib/constitution.js` (Constitution prompt builder).
* LILITH-safe subset: [_lilith_safe/constitution](/_lilith_safe/constitution/).
