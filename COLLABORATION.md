---
type: Workflow
title: MAGI development collaboration
description: Shared task ownership, handoff and review rules for GPT/Codex, Devin and Antigravity.
lilith_safe: false
tags: [workflow, collaboration, development, github]
---

# MAGI development collaboration

This document adds GPT/Codex to the existing
[Antigravity–Devin workflow](.agents/skills/collaborating-with-antigravity/SKILL.md).
It governs development work, not the PLM trading units. Repository-specific
instructions and Jun's explicit task instructions still apply. Access to an
API or a permissive app setting does not itself authorize a deployment.

## Shared reference

- `dogmaai/magi-knowledge` is already the authoritative shared specification.
  Start at [index.md](index.md); do not create another copy of the legacy
  `magi-stg` specification.
- Read the relevant concept documents and the target repository's `AGENTS.md`.
  Record the specification revision and implementation revision used in a PR.
- The specification describes intended behavior; source code and deployed
  configuration establish actual behavior. A mismatch is evidence to resolve,
  not permission to change either side silently.
- Keep approved implementation and corresponding reference docs aligned in
  linked PRs. Generated exports and Cloudflare mirrors remain derived copies.

## Ownership

| Actor | Default contribution |
|---|---|
| GPT / Codex | Scope tasks, inspect specs and code, implement bounded changes with tests, review Devin PRs. |
| Devin | Implement tasks needing its established environment or integrations, run cross-service verification, review GPT PRs. |
| Antigravity | Architecture, local debugging and review, as in the existing workflow. |
| Jun | Priorities, unresolved policy decisions, final approval and deployments under repository rules. |

Assignments can change with access and task needs. Use one implementation
owner per task; do not ask multiple agents to implement the same change.
Another agent reviews when the change affects the sensitive areas below.
Small documentation or cosmetic changes can use the normal repository checks
without an extra agent session.

### Devin operating boundaries

Devin (cloud, autonomous) executes implementation end to end — environment
setup, tests, PR creation, review-feedback fixes pushed to the same branch —
and may run cross-service verification and scheduled observation jobs. Within
that ownership:

- Devin gathers evidence and proposes; it does not decide trading policy,
  risk configuration, or mode activation (e.g. flipping `JEV_MODE` to
  `enforce`). Those are Jun's decisions, requested with concrete options.
- When specification and implementation disagree, Devin reports both
  revisions and the exact decision needed instead of silently resolving
  the conflict on either side.
- `verified: { by: human:jun, ... }` records Jun's actual review act. Devin
  may do the verification legwork and present the diff, but must not write
  a human verification entry that did not happen.
- Automated review findings (auto-review, Mistral, Gemini, Codex connector)
  are leads, not instructions — Devin verifies each against the code before
  acting and reports rejected false positives rather than applying them
  blindly.
- Production deploys, IAM, Cloud Scheduler and other GCP operations remain
  Jun's to approve and execute. Devin prepares; it never runs them.
- Scheduled observation jobs (shadow checks, report collectors) are in
  scope, but must not write to production trading paths or trading control
  tables.

## Task and handoff record

Use GitHub Issues and PRs as the shared record. Check open work before starting.
Each task should identify:

- goal and acceptance criteria;
- implementation owner and, when required, independent reviewer;
- affected repositories and paths;
- reference documents and commit revisions;
- commands needed for verification and any access blockers;
- the existing branch / PR when work is being handed off.

Do not invent access, a reviewer assignment or an agreement from another
agent. Update the same PR branch for review fixes. PR descriptions use
**Summary**, **Key Changes** and **Verification**, including checks not run
and their reason. Escalate unresolved architectural or trading-policy choices
to Jun with the conflicting sources and a specific decision to make.

Once agreement is reached, execute. Do not send acknowledgement-only replies
or restart an agreed discussion. Report again for a concrete result or a new
blocker.

## Resource lifecycle and OKF synchronization

Infrastructure and schema changes must keep the OKF bundle and the live
environment in step with the code. A code-only retirement is not done until
the physical teardown is recorded.

### Retired-resource teardown

A PR that retires a Cloud Run job, Cloud Scheduler entry, BigQuery table,
secret or other GCP resource must:

- include a teardown checklist in the PR description — target job,
  scheduler, dataset/table, secret, IAM binding and env entries, each marked
  "to delete", "keep" or "already absent";
- name the pending physical deletions explicitly, because production GCP
  changes remain Jun's operation;
- open or link a tracking Issue that stays open until Jun confirms the
  deletions; a "cleanup pending" state must not live only in a code comment.

One-shot teardown helper scripts are removed in a follow-up PR once the run
is confirmed, or their execution is recorded in the tracking Issue — they
must not persist as dead scripts.

### OKF synchronization

- Adding or dropping a BigQuery table, Cloud Run job or scheduler requires a
  corresponding OKF update in the same task — a `magi-knowledge` PR or a
  linked tracking Issue opened alongside the implementation PR.
- Every BigQuery table referenced by MAGI must have a concept document under
  `system/echidna-tables/` (or an explicit entry there naming it
  legacy/external); undocumented ledgers are drift.
- When a `magi-knowledge` change affecting another repository merges, that
  repository's `vendor/magi-knowledge` pin follows in its next change;
  report the pin used.

## Consultation protocol

A development agent that is blocked, uncertain, or choosing between materially
different designs may open a **consultation** instead of guessing. Consultation
is for decision-making; it does not create a second implementation owner.

### Shared meeting room

Until a repo-independent responder exists, use `dogmaai/magi-core` Issues as
the operational consultation hub because that repository contains the verified
Antigravity responder and its GitHub Actions workflow. A consultation about
another repository must link the target Issue/PR and name the affected
repository and paths. The authoritative collaboration policy remains this file
in `magi-knowledge`.

Use the `Agent consultation` Issue template in `magi-core`. The minimum record
is:

- `To:` routing line;
- the concrete question that needs a decision;
- relevant specification and implementation revisions;
- constraints / boundaries that must not change;
- options already considered;
- requested reviewers;
- exactly one implementation owner (or `TBD` while the consultation is open);
- decision status.

### Routing

Use explicit routing lines rather than relying on GitHub account names:

```text
To: Antigravity
To: GPT, Devin, Antigravity
```

`To: Antigravity` is machine-routed by the `magi-core` Antigravity responder.
The responder also retains legacy Antigravity mention support for existing
agent threads. Explicit routing is required for a consultation opened by Jun;
ordinary comments from `dogmaai` must not wake the responder accidentally.

`To: GPT` and `To: Devin` are protocol-level destinations. They mean the active
GPT/Codex or Devin session should read and answer the same GitHub thread when
that agent has GitHub access. This document does **not** claim that GitHub can
asynchronously start ChatGPT/Codex or Devin by itself. Do not report those
routes as automated unless a separately verified webhook/runner is installed.

### Conversation and decision states

The consultation continues while there is a substantive unresolved question or
new evidence. It ends by **agreement**, not by an arbitrary turn limit.

Use one of these searchable terminal states in the thread:

- `Status: AGREED` — the agents have a concrete decision and conditions;
- `Status: NEEDS_JUN_DECISION` — a remaining policy, architecture, trading, or
  risk choice requires Jun's explicit decision.

When agreement is reached, state the decision and conditions once. After that,
acknowledgement-only replies are prohibited. Antigravity's responder implements
this existing rule with `[NO_REPLY_NEEDED]`; Devin follows the same stop-on-
agreement rule in `collaborating-with-antigravity/SKILL.md`. GPT/Codex should
apply the same behavior when participating through GitHub.

Silence alone is not agreement. Do not mark `AGREED` unless the substantive
positions have converged or Jun has made the required decision. If sources
conflict, cite both and use `NEEDS_JUN_DECISION` rather than guessing.

### Sensitive changes

A consultation does not waive independent review. Trade guards, order
execution, trading mode, risk configuration, and the LILITH data boundary still
require a reviewer other than the implementer (or Jun). The consultation can
record the architecture decision, but the implementation PR remains subject to
the review rules below.

## GitHub access for GPT / Codex

ChatGPT and Codex reach GitHub through the **ChatGPT Codex Connector**
GitHub App (`https://github.com/apps/chatgpt-codex-connector`, owner
`openai`). The App itself requests `issues: write`, `pull_requests: write`,
`contents: write` and `metadata: read`; those permissions cannot be edited
from this side. What Jun controls is the **installation** on the `dogmaai`
account (a User account, not an Organization):

- Reads of a public repository succeed even when that repository is not in the
  installation, because the connector falls back to public access. Writes
  (`POST /repos/{owner}/{repo}/issues`, comments, updates) use the
  installation token and fail with
  `403 Resource not accessible by integration` when the repository is missing
  from the installation or a permission update is still pending approval.
- Before treating such a 403 as a repository or PAT problem, open
  `https://github.com/settings/installations` → **ChatGPT Codex Connector** →
  **Configure** and confirm the repository is listed under *Repository access*
  and that no "requesting an update to its permissions" banner is pending.
  Adding the repository (or accepting the update) is the fix; no repository
  setting, PAT or GitHub Actions `GITHUB_TOKEN` change is involved.
- Verify with a minimal issue (`title: integration write test`) from ChatGPT
  and close it afterwards. Verified 2026-09-07 with
  `dogmaai/magi-knowledge#50` after adding the repository to the installation.

## Writing rules for the public repository

> **Draft — pending Jun verification.** `dogmaai/magi-knowledge` is a
> **public** repository (confirmed 2026-10-23 via
> `gh api repos/dogmaai/magi-knowledge` → `visibility: public`; Jun
> confirmed public is intended). Everything committed here — and everything
> posted on it — is world-readable. The rules below are a draft policy
> recorded 2026-10-23; treat them as binding until Jun confirms or amends
> them.

- **Never record attacker-useful details in this repository.** Do not write
  down: unremediated vulnerability locations or reproduction steps;
  credential locations (local file paths, or which store holds a named
  secret); internal or listening port numbers; or host identifiers
  (tailnet hostnames, IP addresses, LAN details). Those belong in private
  `magi-core` issues or docs — reference them from here by issue/PR
  number only.
- **Exception — the secrets ledger.** [secrets-inventory.md](system/services/secrets-inventory.md)
  exists precisely to inventory which store holds each named secret. Its
  secret-name column and store column (`SM` / `Devin org` / `GH:<repo>`)
  are permitted despite the "Never record attacker-useful details" rule
  above; Jun accepted the residual risk that the name↔store mapping itself
  informs an attacker's targeting (approved 2026-11-01 — see the
  [log.md](log.md) entry "Secrets ledger carved out of the public-repo
  writing rules" and magi-knowledge#201). The ledger must still never
  record secret *values* (or enough characters to reconstruct one), local
  file paths to credentials, or host identifiers.
- **Record vulnerabilities only after remediation.** A security fix may be
  documented once it is deployed; describe what changed, not how to
  exploit the pre-fix state.
- **Reviewers must check PRs for these leaks.** A PR that adds any of the
  categories above must not merge until the detail is moved to a private
  location.
- **The rule applies to every writable surface**, not just committed
  files: PR titles and bodies, issue titles and bodies, comments, commit
  messages, and code-review replies.

## Changes requiring independent review

Changes to trade guards, order execution, trading mode, risk configuration or
the LILITH data boundary require review by an agent other than the implementer
(or Jun). This includes behavior changes made through configuration, scripts
or specifications rather than only source code.

The following paths are an initial review inventory. Paths in other
repositories are references from this bundle, not a claim that their current
checkout has been verified. Verify and extend the inventory in each target
repository before translating it into CI path filters or CODEOWNERS.

| Repository | Paths / areas |
|---|---|
| magi-knowledge | `system/guards/**`, `system/constitution/**`, `system/plm-units/**` |
| magi-knowledge | `_lilith_safe/**`, `scripts/lilith_safe_loader.py`, `scripts/okf_common.py`, `scripts/okf_lint.py`, `scripts/test_lilith_safe_loader.py` |
| magi-knowledge | `scripts/okf_export.py`, `scripts/fit_distributions.py`, `scripts/ai_search_r2_sync.py`, `scripts/r2_catalog_sync.py`, `.github/workflows/**` |
| magi-core | `src/llm.js`, `src/paperGuards.js`, `src/session.js`, `src/positionMgmt.js`, `src/sellGuard.js` |
| magi-core | `lib/config.js`, `lib/constitution.js`, `lib/moomoo.js`, `lib/bigquery.js`, `lib/kill-switch.js`, `lib/daily-loss.js`, `lib/sellable_qty.js`, `lib/vix.js` |
| magi-core | `lib/confidence-band-guard.js`, `lib/short-entry-guard.js`, `lib/concerns-guard.js`, `lib/symbols.js`, `lib/excluded_symbols.js`, `.github/workflows/deploy.yml` |
| magi-moomoo | Order and broker-bridge handlers; resolve exact paths from that repository before setting up automated review routing. |
| magi-moni | `server.js` command handlers affecting trading or kill switches; verify current routing. |

This is a review policy, not installed branch protection. CODEOWNERS requires
actual eligible GitHub users/teams; model names are not GitHub reviewers.
Do not claim merge enforcement until the repository checks and rules are
configured and verified.

## Automated PR review bots

`.github/workflows/auto-review.yml` posts a template checklist review and a
Mistral (`mistral-large-4`, pinned explicitly since 2026-10-30 — Mistral
Large 4 is a Public Preview model on the Mistral API, so an ID change or
withdrawal makes the Mistral step error out rather than silently switch
models) review on `pull_request` events. Both are
`github-actions[bot]` `COMMENT` reviews; the Mistral review carries a
`<!-- mistral-review sha=<head SHA> -->` marker and is skipped when the marker
already exists for that head.

The Mistral step runs with `continue-on-error`, so a failure leaves the job
green. A following `Report Mistral review failure` step (runs only when the
Mistral step's outcome is `failure`) posts a PR comment with a
`<!-- mistral-review-failed sha=<head SHA> -->` marker — at most once per
head — linking the run log, and emits a workflow warning annotation (the
annotation is emitted first; the notice step itself also runs with
`continue-on-error`, so a GitHub API error while posting cannot turn the
job red). A
missing Mistral review therefore shows up on the PR instead of passing
unnoticed. Skips that are not failures (no `MISTRAL_API_KEY`, review already
posted for the head) do not trigger the notice.

- Enabled with the Mistral step: `magi-knowledge`, `magi-moni`, `magi-moomoo`,
  `magi-price-tracker`, `magi-core`.
- `magi-ui` and `magi-deep-research` were deleted on 2026-10-07 (Jun's
  decision); their workflow entries are gone with the repositories.
- `lilith-training`, `magi-shared`, `magi-core-public` and `magi-stg` were
  deleted on 2026-10-07 (Jun's decision); `lilith-training` never had an
  auto-review workflow and the other three carried none either.

These comments — like `gemini-code-assist` and `chatgpt-codex-connector`
reviews — are reference information only. They never approve, never satisfy
the independent-review requirement above, and never count as `verified` on
any document. Sensitive-path changes still need a reviewer other than the
implementer (or Jun).

Jun approved on 2026-09-17 sending PR diffs — including private repositories
such as `magi-core` — to the external Mistral API for this review workflow.
That approval covers this workflow only; new external data egress still needs
Jun's explicit decision.

Jun extended that approval on 2026-10-11 (PR #153 review): the magi-knowledge
auto-review may additionally send the post-change content of `.md` files
changed in the PR (capped at 24,000 characters total, 8,000 per file) as
review context, to reduce "not documented" hallucinations. The magi-core
workflow may likewise send excerpts of the pinned `vendor/magi-knowledge`
spec documents selected by diff keywords (capped at 30,000 characters total,
6,000 per doc) — implemented in magi-core#612 and follow-up magi-core#614.
Any further egress expansion still needs Jun's explicit decision.

### Claude PR review (magi-core)

`magi-core/.github/workflows/claude-review.yml` runs
`anthropics/claude-code-action` (pinned by commit SHA in that workflow file —
the file, not this document, is the source for the pinned version) **only on
request**: an `issue_comment` on a PR whose body contains `@claude review`,
written by a non-bot user with `OWNER`, `MEMBER` or `COLLABORATOR`
association. Opening or pushing to a PR no longer triggers a review (Jun's
decision 2026-10-30: the per-push review produced cost spikes; reviews are
now requested when needed). Fork PRs and closed PRs are skipped; drafts may
be reviewed on request. The requesting comment gets an 👀 reaction.

What the job does:

* A workflow step **outside Claude** fetches the PR's reviews, inline review
  comments and issue comments with `gh api` (read-only GETs with the job
  token) into files in the workspace. Claude itself is not allowed `gh api`;
  it reads those files.
* Claude follows the OKF start procedure in [AGENTS.md](AGENTS.md) against
  the pinned `vendor/magi-knowledge`. magi-core's `scripts/init_knowledge.sh`
  checks out only `system/` + `scripts/` + root documents; `_lilith_safe/` is
  never checked out in magi-core (LILITH contamination boundary).
* It runs `npm test` / `eslint` and ad-hoc probe tests in the runner, verifies
  the other bots' findings, and posts inline comments plus one top-level
  comment carrying a `<!-- claude-review sha=<head SHA> -->` marker. Each
  request runs a fresh review, even for a head that was reviewed before.
* If the Claude step fails (for example the subscription usage limit), the
  job stays green and posts a PR comment asking to re-request later.

How the restrictions are enforced:

* **By the job token** (`contents: read`, `pull-requests: write`): no push and
  no merge.
* **By the allowed-tools list**: no `gh api`, no `gh pr review`, no
  `gh pr merge`, no shell beyond the listed git / test / `gh pr view|diff|comment`
  commands.
* **By the prompt only**: no approve / request-changes, no production
  operation. With `pull-requests: write` the token could technically submit
  a review, so this part relies on the prompt plus the tool list.

Like the Mistral review, this is reference information: it never approves,
never satisfies the independent-review requirement above on its own, and
never counts as `verified` on any document.

Egress. Jun approved on 2026-10-21 (Claude session, magi-core PR #645
follow-up) sending data to the Anthropic API for this workflow. Because
Claude runs as an agent, the scope is **broader than the Mistral workflow**:
any file in the `magi-core` checkout at the PR head (and `origin/main` for
comparison), the pinned `vendor/magi-knowledge` `system/` + `scripts/` +
root documents, PR metadata, and the pre-fetched PR reviews/comments. The PAT
used for the submodule clone is removed from git config before Claude starts.
Extending this workflow to other repositories is a new egress decision.

Probe-test execution. Jun decided on 2026-10-21 to keep allowing the reviewer
to write and run probe tests (`Write`/`Edit` + `npm test` / `node --test`) so
it can compare behavior on `main` and the PR head. Code run this way can read
the job's `CLAUDE_CODE_OAUTH_TOKEN` and its `pull-requests: write` token.
This was accepted because only trusted actors can push branches to the
private `magi-core` repository and fork PRs are skipped. (Since 2026-10-30
the workflow runs on `issue_comment`, so the workflow file itself comes from
the default branch, but the PR's code is still checked out and executed.) The residual risk is
prompt injection from PR text and comments. Revisit this if outside
contributors or fork PRs are ever allowed.

Authentication. Jun decided on 2026-10-30 to run this workflow on his Claude
subscription instead of API billing: GitHub Actions secret
`CLAUDE_CODE_OAUTH_TOKEN` in `magi-core` (a `claude setup-token` OAuth token
tied to Jun's subscription), injected from Secret Manager
`CLAUDE_CODE_OAUTH_TOKEN_PR_REVIEW` (see
[secrets-inventory](system/services/secrets-inventory.md)). Consequences:
reviews draw from the same usage limits as Jun's own Claude use; data
handling follows Jun's subscription plan terms rather than the API terms
covered by the 2026-10-21 approval (the data scope above is unchanged); and
probe-test code in the runner can read a token for Jun's personal
subscription rather than a dedicated API key. The previous key
(`ANTHROPIC_API_KEY` secret / `SM` `ANTHROPIC_API_KEY_PR_REVIEW`) is
scheduled for retirement once the new path is confirmed.

## Drift checks: extend before adding

Devin reports an existing `okf-drift` check in magi-core. Inspect its workflow,
implementation, coverage and tests before introducing `spec:check`.
A check/job name need not match a workflow filename.

If a machine-readable specification is needed, define it from verified
runtime sources and approved intended values. Record source revisions and
distinguish defaults, environment overrides and observed deployment settings.
Cron expressions must include time zones; model mappings must include
provider/unit identity and shadow/canary mode. Do not turn conflicting or
unverified documentation values into authoritative configuration.

Prefer extending the existing check. Report expected and actual values and
their sources; never auto-repair a discrepancy. Test a deliberate mismatch
as well as a matching fixture. No new `spec.yaml` or `spec:check` is implied
by this documentation change.

## Cost and operating boundaries

- Use an agent for investigation or judgment; use existing deterministic
  scripts for repeatable validation, formatting and transfer.
- Bound each task with acceptance criteria. Avoid duplicate implementation,
  repeated full-repository reads and agent-to-agent acknowledgement loops.
- Track development sessions separately from scheduled Devin research and
  MAGI's runtime LLM costs; subscription budgets are not evidence of actual
  spend or included capacity.
- Keep credentials out of chat, issues and committed files.
- Preserve the existing magi-core rule: code changes and GitHub push only;
  Jun runs deployments. Do not trigger production operations to test a
  documentation or drift-check change.
- `system/` must never flow into LILITH training. Training consumes only
  `_lilith_safe/` via the approved loader. Keep operator/development
  instructions outside the training tree.
