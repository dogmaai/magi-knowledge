---
type: Service
title: magi-moni
description: Monitoring, reporting, and alerting for the MAGI system.
lilith_safe: false
tags: [service, monitoring, reporting, alerts]
repo: dogmaai/magi-moni
---

# Overview

Monitoring and reporting layer: aggregates session/trade outcomes, surfaces
periodic analysis (e.g.
[gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md)),
and dispatches alerts (e.g. Telegram).

# Reads

[trades](/system/echidna-tables/trades.md),
[sessions](/system/echidna-tables/sessions.md),
[llm-metrics](/system/echidna-tables/llm-metrics.md).

# Note

Role summarized from repo name and known reporting outputs; expand with concrete
job/endpoint detail in a follow-up pass.
