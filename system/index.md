# System knowledge

Full-system MAGI knowledge. **None of this tree may flow into LILITH training**
— every doc here is `lilith_safe: false`, and `scripts/lilith_safe_loader.py`
refuses to read it.

# Contents

* [echidna-tables/](echidna-tables/) - ECHIDNA = the `magi_core` BigQuery warehouse. Per-table schema, joins, query patterns.
* [plm-units/](plm-units/) - The MAGI PLM units (the LLM roster): provider, model, Cloud Run job, status.
* [services/](services/) - Cross-repo service dependency map.
* [guards/](guards/) - The L1–L7 guard layer safety pipeline.

# Conventions

* **GCP project**: `screen-share-459802`
* **BigQuery dataset**: `magi_core`
* **BigQuery location**: `US` (always specify it in queries)
* Resource URLs point at the BigQuery console for the given table.
