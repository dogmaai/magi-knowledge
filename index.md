---
okf_version: "0.2"
---

# MAGI Knowledge Bundle

Single source of truth for MAGI system knowledge, expressed in the
[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF v0.2). Authored for both humans and the AI agents that operate MAGI
(Devin, AKA-1, ARIEL) and for the LILITH training pipeline.

The previous specification lived in `dogmaai/magi-stg` (`specifications/` and
`docs/`); that repository is **archived** and its spec files carry a banner
pointing here. This bundle is now the only authoritative source. See
[log.md](log.md) for the change history.

# Trees

* [_lilith_safe/](_lilith_safe/) - Clean-source ground truth the LILITH training pipeline MAY consume. Contamination-guarded.
* [system/](system/) - Full-system knowledge (ECHIDNA tables, PLM unit registry, services, guard layers). MUST NOT flow into LILITH.

# The LILITH contamination boundary

LILITH (the fine-tuned Qwen2.5-3B reasoner) must reason **only** from its own
verifiable data and never from other MAGI units' processed intelligence or from
Section 5 ("Jun Review Only") ticker picks. This bundle enforces that boundary
structurally:

* Everything LILITH training may read lives under `_lilith_safe/` and is the
  only thing `scripts/lilith_safe_loader.py` will load.
* `scripts/okf_lint.py` fails CI if a `_lilith_safe/` doc leaks a cross-unit
  name, a unit win-rate, or a Section 5 / ticker pick — and if any doc's
  `lilith_safe` flag disagrees with its location.

See [_lilith_safe/index.md](_lilith_safe/) for details.

# Knowledge authority: trust & lifecycle

This repository is the **authority**; OKF is only the format it is expressed in
(GitHub is storage/versioning; GPT, Devin, Gemini, Antigravity and humans are
consumers). So that a consumer can tell canonical knowledge from a hypothesis,
every concept under `system/` and `_lilith_safe/` carries the OKF v0.2 trust and
lifecycle family (SPEC §5, §7) and `scripts/okf_lint.py` enforces it:

| Key | Meaning | Rule |
|---|---|---|
| `status` | OKF lifecycle: `draft` \| `stable` \| `deprecated` | required; a non-deprecated doc MUST NOT link to a `deprecated` one |
| `generated: { by, at }` | who wrote the current content, and when | required; `by` is a §7 actor (`human:jun`, `devin/cloud`, `process:<id>`) |
| `verified: { by, at }` (or a list) | who confirmed the content | `status: stable` REQUIRES a `human:` verifier — AI review alone earns only `draft` |
| `stale_after` | absolute instant after which the doc must be re-verified | stale = WARN in PR CI, ERROR in the scheduled freshness run |

Lifecycle: AI writes a hypothesis (`draft`, `generated.by: devin/cloud`) → a
human reviews and merges (`verified.by: human:jun`) → `stable` → later either
re-verified (new `verified` entry, new `stale_after`) or `deprecated` with a
link to its successor. Consumers derive a trust tier from `verified` (§5.3):
*unverified* / *machine-confirmed* / *human-reviewed*; the R2 Data Catalog
(`trust_tier`, `verified_at`) and AI Search (`status`) mirrors expose the same
signals so agents that read the mirrors instead of the repo can filter on them.

Domain lifecycles (e.g. a PLM unit being `active` / `shadow` / `retired`) live
in `unit_status`, never in `status`.
