# Service map

Cross-repo dependency map for the MAGI microservices. Runtime URLs are resolved
dynamically via the
[service_endpoints](/system/echidna-tables/service-endpoints.md) table, so
callers don't hard-code endpoints.

# Services

| Service | Repo | Role |
|---|---|---|
| [magi-core](magi-core.md) | dogmaai/magi-core | Trading engine: trade loop, LLM orchestration, guard layers. |
| [magi-moomoo](magi-moomoo.md) | dogmaai/magi-moomoo | MooMoo broker integration (account, positions, orders, snapshots). |
| [magi-price-tracker](magi-price-tracker.md) | dogmaai/magi-price-tracker | Realtime price/market-data tracking. |
| [magi-deep-research](magi-deep-research.md) | dogmaai/magi-deep-research | Deep Research agent → `market_research`. **Section 5 stripped.** |
| [magi-isabel](magi-isabel.md) | dogmaai/magi-isabel | ISABEL pattern framework (centroids, embeddings). |
| [magi-moni](magi-moni.md) | dogmaai/magi-moni | Monitoring / reporting / alerting. |
| [aka-memory](aka-memory.md) | dogmaai/magi-moni | AKA long-term memory on TIALA + daily GCS backup. |
| [magi-model-health-check](magi-model-health-check.md) | dogmaai/magi-model-health-check | Periodic provider/model health checks. |
| [lilith-training](lilith-training.md) | dogmaai/lilith-training | LILITH fine-tuning + anti-hallucination DPO pipeline. |
| [central-dogma](central-dogma.md) | dogmaai/central-dogma | Central governance / shared source of truth (role to confirm). |

# Data backbone

All services read/write ECHIDNA (`magi_core` BigQuery). See
[echidna-tables](/system/echidna-tables/).

# Contamination note

The arrows into LILITH are deliberately narrow: `lilith-training` reads **only**
the [_lilith_safe/](/_lilith_safe/) tree of this bundle (enforced by
`lilith_safe_loader.py`), never the services or tables in this `system/` tree.
