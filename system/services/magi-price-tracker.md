---
type: Service
title: magi-price-tracker
description: Back-fills historical prices into BigQuery and grades LLM trade-rec accuracy.
lilith_safe: false
tags: [service, price-tracker, market-data, evaluation]
repo: dogmaai/magi-price-tracker
---

# Overview

A data-ingestion service that **back-fills historical price data into BigQuery**
to evaluate how accurate LLM-generated trade recommendations were after the fact.
Runs as a Cloud Run service on a Cloud Scheduler trigger.

# What it does

* Updates NULL price fields on historical records over rolling **1h** (60m–48h)
  and **1d** (24h–7d) windows.
* Computes an **outcome** for each LLM prediction: `Correct` / `Partial` /
  `Incorrect`.
* Writes to the `llm_analysis` BigQuery table (LLM trade predictions + grades).

# Relationships

* Pulls market data via [magi-moomoo](magi-moomoo.md).
* Service discovery via [service_endpoints](/system/echidna-tables/service-endpoints.md).
* Auth: GitHub→GCP Workload Identity Federation (keyless), OIDC service-to-service.

# Contamination note

`llm_analysis` grades are cross-unit prediction outcomes and `lilith_safe: false`.
LILITH uses only its own trade results via the
[ISABEL_STATS_BLOCK](/_lilith_safe/schemas/isabel-stats-block.md) schema.
