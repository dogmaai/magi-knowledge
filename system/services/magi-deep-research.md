---
type: Service
title: magi-deep-research
description: Devin Automation that produces and uploads the weekday daily Deep Research market brief.
lilith_safe: false
tags: [service, deep-research, devin-automation, market-research, magi-core]
repo: dogmaai/magi-deep-research
automation: https://app.devin.ai/automations/36ae4174a1f84057a113bcd53fc1d570
---

# Overview

The weekday daily Deep Research brief is produced by the Devin Automation
`MAGI 日次市場ブリーフ投入` and inserted into `magi_core.market_research`
via `magi-core/scripts/upload-deep-research.mjs`.

The historical Cloud Run Job implementation remains in the
[dogmaai/magi-deep-research](https://github.com/dogmaai/magi-deep-research)
repo, but the production flow is now the Devin Automation.

# Automation schedule

| Property | Value |
|---|---|
| Automation ID | `auto-36ae4174a1f84057a113bcd53fc1d570` |
| URL | <https://app.devin.ai/automations/36ae4174a1f84057a113bcd53fc1d570> |
| Schedule | `0 7 * * 1-5` UTC (weekdays 16:00 JST) |

# Input / brief format

The automation prompt asks the Devin session to:

1. Research global markets and produce a Japanese daily brief with sections
   §1–§7.
2. Write the brief as a markdown file with YAML frontmatter containing at
   least:
   * `title` — brief headline, normally includes the date.
   * `sentiment` — `BULLISH`, `BEARISH`, or `NEUTRAL`.
   * `risk_level` — `LOW`, `MEDIUM`, `HIGH`, or other agreed label.
   * `key_events` — inline YAML list of the most important market events.
3. Strip the `## Section 5 (Jun Review Only)` block from the markdown body
   before upload.
4. Run `magi-core/scripts/upload-deep-research.mjs --file /home/ubuntu/brief-upload.md`.

# Output / BigQuery row

`magi-core/scripts/upload-deep-research.mjs` parses the frontmatter, strips
Section 5, and writes one row to `magi_core.market_research` with:

| Field | Value |
|---|---|
| `date` | Inferred from `YYYY-MM-DD` in `title`/body, otherwise ET today. |
| `research_type` | `DAILY_DEEP_RESEARCH` |
| `symbol` | `null` |
| `summary` | Full brief body (Section 5 removed). |
| `sentiment` | From frontmatter. |
| `risk_level` | From frontmatter. |
| `key_events` | JSON array serialized from the `key_events` list. |
| `source_agent` | `devin_automation` (overridable via `DEEP_RESEARCH_SOURCE_AGENT`). |
| `prompt_version` | `devin-automation-v1` (overridable via `MAGI_PROMPT_VERSION`). |
| `session_id` | `DEVIN_SESSION_ID` environment variable. |
| `status` | `success` |

# Hard boundaries

* The `## Section 5 (Jun Review Only)` block must never be inserted into
  BigQuery.
* The input file path is restricted to `BRIEF_UPLOAD_BASE` (default
  `/home/ubuntu`).
* `--dry-run` prints a preview without writing BigQuery.

# Related concepts

* [magi-core](magi-core.md)
* [market_research table](/system/echidna-tables/market-research.md)
* `magi-core/scripts/upload-deep-research.mjs`
