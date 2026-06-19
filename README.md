# magi-knowledge

OKF v0.1 knowledge bundle for the MAGI trading system. A directory of markdown
files with YAML frontmatter — readable by humans, parseable by agents, diffable
in git, with **no required tooling** to consume.

```
magi-knowledge/
├── index.md                 # bundle root (declares okf_version)
├── log.md                   # change history
├── _lilith_safe/            # LILITH-training-consumable ground truth (guarded)
│   ├── schemas/             #   prompt-block schemas (structure, not values)
│   ├── hallucination-patterns/
│   └── constitution/        #   clean-source rule, output envelope, risk rules
├── system/                  # full-system knowledge — NEVER fed to LILITH
│   ├── echidna-tables/      #   BigQuery (magi_core dataset) data catalog
│   ├── plm-units/           #   the MAGI LLM units / PLM roster (cross-unit registry)
│   ├── services/            #   cross-repo service dependency map
│   └── guards/              #   L1–L7 guard layer reference
└── scripts/
    ├── okf_common.py        # zero-dep frontmatter parser
    ├── okf_lint.py          # OKF conformance + LILITH contamination linter
    ├── lilith_safe_loader.py# the ONLY sanctioned reader for LILITH training
    └── test_lilith_safe_loader.py
```

## Why this exists

MAGI knowledge was scattered across code comments, `magi-stg/specifications`,
Devin knowledge notes, and per-repo READMEs. This bundle consolidates the parts
that multiple agents need to agree on — BigQuery schemas, the PLM unit roster,
and the ground-truth definitions the LILITH training pipeline depends on — into
one diffable, agent-readable corpus.

## The LILITH contamination boundary (read this first)

LILITH is an **independent reasoner**: per the MAGI Constitution it must decide
only from its own verifiable data, never from another unit's processed
intelligence, and never from Section 5 ("Jun Review Only") ticker picks.

To make that boundary impossible to cross by accident:

| Mechanism | Guarantee |
|---|---|
| `_lilith_safe/` subtree | The only knowledge the training pipeline may read. |
| `lilith_safe: true\|false` frontmatter | Must match the doc's location; CI fails otherwise. |
| `scripts/lilith_safe_loader.py` | Reads only `_lilith_safe/`; refuses traversal & unflagged docs (fail-loud). |
| `scripts/okf_lint.py` | Fails CI on cross-unit names, unit win-rates, or Section 5 / ticker picks inside `_lilith_safe/`. |

## Consuming the bundle

No SDK required — `cat` any file. Agents parse the frontmatter directly.

The LILITH training pipeline (`dogmaai/lilith-training`) vendors this bundle
(git submodule at `vendor/magi-knowledge`, or a build-time fetch) and reads it
**only** through `LilithSafeKnowledge`:

```python
from lilith_safe_loader import LilithSafeKnowledge
kb = LilithSafeKnowledge("vendor/magi-knowledge")
schema   = kb.get("schemas/isabel-stats-block")
patterns = kb.hallucination_patterns()
forbidden_names = kb.cross_unit_names()   # detector list, never prompt text
```

## CI

`.github/workflows/okf-conformance.yml` runs the linter and the loader smoke
test on every PR. Both are pure-stdlib Python 3.11 (no pip install).

Run locally:

```bash
python scripts/okf_lint.py
python scripts/test_lilith_safe_loader.py
```
