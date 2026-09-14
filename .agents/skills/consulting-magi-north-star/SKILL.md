---
name: consulting-magi-north-star
description: Establish the authoritative magi-knowledge revision and safety boundaries before investigating, designing, implementing, reviewing, or documenting work in any dogmaai MAGI repository. Use for every MAGI task; do not use it as authority to deploy or change production systems.
type: Workflow
lilith_safe: false
tags: [workflow, agents, okf, north-star, magi]
---

# MAGI North Star

Determine the authoritative OKF revision before making a plan or changing a
file. This skill controls how to find and cite the specification; it does not
contain or replace specification values.

## Resolve the revision

1. Read the target repository's `AGENTS.md` and follow its repository-specific
   instructions.
2. Resolve its `dogmaai/magi-knowledge` pin. Prefer the committed gitlink at
   `vendor/magi-knowledge`; use the repository's documented pin mechanism when
   it uses another path.
3. Use that exact commit for the entire task. Do not substitute
   `magi-knowledge/main`, a local checkout, an export, a mirror, memory, or a
   prior conversation because it is newer or easier to access.
4. If the target repository has no documented pin, use the current
   `dogmaai/magi-knowledge/main` commit and state that no target-repository pin
   was found.
5. Stop and report to Jun if the pin is missing where `AGENTS.md` requires one,
   cannot be resolved, is unreachable, or conflicts with the repository's
   instructions. Do not guess a revision.

Record both revisions: the target implementation commit and the selected
`magi-knowledge` commit.

## Read before deciding

At the selected revision, read:

- `index.md`, `AGENTS.md`, `README.md`, and `COLLABORATION.md`;
- `log.md` for changes relevant to the task;
- every relevant document under `system/`;
- the relevant `_lilith_safe/` boundary documents when the task may affect
  training inputs, prompts, exports, or cross-unit information.

Follow links from the indexes instead of assuming paths remain unchanged.
For concept documents, inspect `status`, `verified.by`, and `stale_after`:

- human-verified `stable` content is authoritative;
- `draft` content is a hypothesis and must be labelled as such;
- `deprecated` content must not be used; follow its successor;
- stale content must be reported as awaiting re-verification.

If authoritative documents conflict, or the specification conflicts with
implementation or observed configuration, report both revisions and the exact
paths. Do not silently choose one or repair either side. Ask Jun for the
specific decision when policy, architecture, trading behavior, or risk is
unresolved.

## Preserve boundaries

- Never copy `system/` knowledge or development instructions into
  `_lilith_safe/`. LILITH training reads only `_lilith_safe/` through
  `scripts/lilith_safe_loader.py`.
- Changes involving trade guards, order execution, trading mode, risk
  configuration, the Constitution, or the LILITH data boundary require the
  independent review defined by `COLLABORATION.md`.
- Repository access does not authorize production deployment, IAM changes,
  scheduler changes, secrets handling, or other production operations.
- Keep credentials out of prompts, issues, commits, and reports.
- Use one implementation owner. Check existing Issues and PRs before starting,
  and continue the existing branch when work is already in progress.

## Re-check and report

Re-check the selected OKF revision before finalizing the design, after changes
and tests, before opening a PR, after review fixes, and before reporting
completion.

Start the work report with:

```text
magi-knowledge <full commit SHA> の <paths> を確認しました。
```

In every design, PR, review, and completion report, include:

- selected knowledge commit SHA and referenced paths;
- target repository and implementation commit or branch;
- relevant documents' lifecycle and verifier state;
- whether specification and implementation agree;
- affected units, guards, tables, and data boundaries;
- verification commands and actual results, including checks not run;
- whether independent review is required;
- blockers, hypotheses, and the exact decision requested from Jun.

For changes to `magi-knowledge`, run its existing gates from the repository
root and report their actual results:

```bash
python scripts/okf_lint.py
python scripts/test_lilith_safe_loader.py
```

Use `COLLABORATION.md` for GitHub consultation and handoff. End consultation
once `Status: AGREED` is reached; do not create acknowledgement-only loops.

## Creation provenance

This workflow was introduced against target pin
`8533a4b379fdabb27a704ab8982406d6db2e6428` and `magi-knowledge` implementation
revision `df6de9b57c0ff1cfb84d77c4df9e7c2d7a96e297`. These values document the
initial review baseline only; consumers must resolve the current task's pin by
the procedure above.
