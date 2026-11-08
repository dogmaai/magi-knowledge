---
type: Workflow
title: Telegram to Discord staged migration
description: Cutover, acceptance, rollback and retirement gates for OpenClaw and MAGI communications.
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-08T12:45:00Z }
tags: [discord, telegram, migration, operations, aka-1]
---

# Scope and authority

Jun selected Discord and separate applications for OpenClaw and MAGI operations
in Devin session `9b1f896e65e140a99f39aad19b30587a`. The direction is approved;
deployment, live acceptance, operational channel identifiers and final teardown
are **not yet verified**. This draft does not claim a production cutover.
The existing stable service/guard/table concepts remain the baseline until the
replacement is accepted. Production deployment, IAM, Scheduler and secret changes
are Jun's operation, not authorized by this document.

## Jun's decisions (2026-11-08, Claude session)

Jun decided the following in a Claude session on 2026-11-08 (JST), after the
Devin session above chose Discord; these are separate, later decisions. The
rest of this draft has been updated to match them.

1. **Retire every Telegram route.** OpenClaw conversations and cron
   announcements, AKA-1 (magi-moni) and all MAGI notifications move to
   Discord. Telegram is removed, not kept as a fallback.
2. **No parallel operation.** No producer or command path ever delivers to
   or accepts from both Telegram and Discord, including during acceptance:
   each producer switches to Discord in the same deployment that removes its
   Telegram path (the cleanup PRs), so "staged" in gate 6 means producer by
   producer, never duplicated. State C (Telegram rollback) is **retired**.
3. **Mitigation for the lost rollback: option A.** Before the cutover is
   considered complete, Jun runs a live delivery test of **every** producer
   to its Discord destination and confirms the watchdog's Discord path. These
   checks are mandatory acceptance criteria, not optional smoke tests. No
   secondary out-of-band alert channel is added (option B was not chosen).
   Jun accepts the consequence: if Discord delivery later fails (for example a
   revoked webhook), the failure is visible only in Cloud Logging until
   someone looks.
4. **Clean up the Telegram code and configuration.** Removal changes are
   prepared as PRs stacked on the companion implementation PRs
   ([magi-core#710](https://github.com/dogmaai/magi-core/pull/710),
   [magi-moni#59](https://github.com/dogmaai/magi-moni/pull/59)) and are merged
   into the companion branches first, so each repository reaches `main` (and
   deploys) once, already Telegram-free. Because
   they leave no Telegram path, they deploy only after Jun has provisioned
   the Discord secrets (gate 2 below), and the option-A tests run
   immediately after that deployment.

Further decisions (Jun, 2026-11-09, Claude session):

5. **magi-moni runs as a single Cloud Run instance** (`--max-instances 1`) so
   pending approvals stay process-local without a shared store. A deployment
   or restart still drops pending approvals (fail closed); request again.
6. **`scripts/operate-tiala.js` becomes read-only** (status and screenshot).
   Its restart, command and GUI operations are removed; TIALA mutations go
   only through Discord with Jun's confirmation button.
7. **OpenClaw's Telegram channel is retired too** (decision 1 covers it): it
   switches to Discord in one step, with no parallel period.

## Revisions referenced

| Revision | Role |
|---|---|
| `b118744a0765a0b03c63ecb7adf56791e0960715` | `magi-knowledge` main when this documentation branch was created and re-checked; base of this change. |
| `437d1d68a7f0f157ff88180ba9be721025760f37` | magi-core's existing `vendor/magi-knowledge` pin. It is older than `b118744` and is **not** advanced by this change. |
| `4035ac393d30a1135e48f64a7f2636ee1d6ba105` | magi-knowledge main at task start; task-fixed reference for magi-moni, which has no pin. |
| magi-core `84ab0a0f4c3111d04d234a0da490541f8e9675db` | Inspected pre-change implementation (Telegram-only notifications). |
| magi-moni `2ec39dcda90641bc250e51b0108a96b4d36a5f31` | Inspected pre-change implementation (Telegram AKA-1, `confirmed=true` drift). |

Between these three OKF revisions, the relevant stable service/guard/table
concepts are identical except `system/services/magi-core.md`, which gained
unrelated content in `b118744`.

## Implementation states

Statements in this document belong to one of three states. Only state A was
inspected; nothing in states B or C is deployed or live-verified.

| State | Revisions | Behavior |
|---|---|---|
| **A. Inspected pre-change code** | core `84ab0a0`, moni `2ec39dc` | Telegram for all channels. Contrary to the stable [order approvals](../echidna-tables/order-approvals.md) Notes, moni `lib/tools.js` issues an approval token on model `confirmed=true` (drift). Which revision production runs was not verified. |
| **B. Proposed** | [magi-core#708](https://github.com/dogmaai/magi-core/pull/708), [magi-moni#58](https://github.com/dogmaai/magi-moni/pull/58) (draft, unmerged) | The Discord behavior below. Unit-tested and independently reviewed only. |
| **C. Rollback (retired 2026-11-08)** | Same revisions as B | Formerly `NOTIFICATION_TRANSPORT=telegram` and the retained Telegram webhook. Retired by Jun's decision above: no Telegram rollback and no parallel operation. This code exists only on the companion branches and never reaches `main`: the cleanup PRs are folded in before merge. |

Reverting moni to state A is **not** a sanctioned rollback because it
reinstates the `confirmed=true` drift; it requires Jun's explicit decision.
State C is retired by Jun's decision, so there is no Telegram rollback path.
(The Devin session reported the Telegram account as deleted; that is not
verified here, and the external webhook, Bot configuration and secrets remain
Jun's pending physical deletions.)

Everything in the following sections up to the cutover gates describes
**state B**, unless marked otherwise.

# Channel separation

- **OpenClaw**: existing `aka` application for Jun-only conversations and cron
  announcements. Preserve the existing agent, workspace and memory. Do not create
  a second agent or assume a new Discord session inherits Telegram's recent chat.
- **MAGI operations**: a distinct Discord application for AKA-1 slash commands,
  read-only tools and explicit operator approvals. Do not overwrite `aka`'s
  application commands. No Administrator permission or message-content intent is
  required for the interaction endpoint.
- **MAGI notifications**: a webhook to a private Jun-only channel for reports and
  monitoring alerts. Treat the webhook URL as a secret. Separate webhooks/channels
  can be chosen by Jun per producer; this plan does not grant channel permissions.

# MAGI operations boundary

The HTTP interaction endpoint validates Ed25519 over the exact raw body and
timestamp, rejects timestamps outside five minutes, then checks application ID,
Jun's Discord user ID, guild ID and private operations channel ID. Missing
configuration rejects access. Discord PING receives a signed-request-validated
PONG. No Discord application token or interaction token is exposed to the LLM.

`/ask` preserves AKA-1 read-only tools. Model-generated `confirmed=true` and
natural-language assent are not authorization, including on the companion
PRs' Telegram model path (unlike state A); that path is removed by the cleanup PRs. Mutations are proposed with an immutable parameter snapshot
and an ephemeral confirm/cancel button. Confirmation is bound to the authenticated
actor, guild, channel, exact operation/parameters, random nonce and 60-second TTL;
it is removed before execution. The backend passes a single-use, parameter-bound
capability to the tool, not an LLM-controlled boolean. New tools default to
requiring confirmation unless explicitly classified read-only.

`/kill` is an authenticated immediate stop. `/resume` always requires the button.
Natural-language mutations, including a proposed emergency stop, use the button;
AKA-1 must direct urgent users to `/kill`. Audit identities are `discord:<user>`.
Order tokens remain bound to symbol/side/quantity and retain the existing
60-second broker-gate TTL. The existing L0 and order-gate failure/unknown-state
behavior is not weakened. BigQuery schemas, trading modes, policy thresholds,
guard logic and LILITH boundaries are unchanged.

Pending confirmations are intentionally **process-local**, not durable storage.
Work and proposals start only after Discord accepts the one-shot interaction
callback. Duplicate delivery/uncertain ACK acceptance does no work.
The HTTP request remains open until command execution and followup delivery
finish, including after headers are flushed; work must not depend on Cloud Run
CPU after the response ends. `/report` calls the existing daily report generator.
Concurrent
button presses consume the local pending entry once. Restart, deployment, expiry
or routing the click to another instance fails closed; decision 5 pins
magi-moni to one instance so routing elsewhere does not occur in normal
operation. A replacement operation
must be requested explicitly after checking actual state; never auto-retry a
mutation after an uncertain result. This is not broker exactly-once execution.
Jun must review this safety/availability trade-off before enabling operations.

# Notification contract

- Companion PRs: `NOTIFICATION_TRANSPORT=telegram|discord`; unset preserves
  Telegram. Cleanup PRs remove the selector and the Telegram branch, leaving
  Discord as the only transport. Invalid/missing Discord configuration never
  falls back to another channel; it fails and is logged.
- `DISCORD_WEBHOOK_URL` is a Secret Manager binding. Restrict destinations to
  HTTPS `discord.com/api/webhooks/<id>/<token>`; never log the URL or API token.
- Use `allowed_mentions: {parse: []}` and split messages within 2,000 UTF-16 units
  without splitting surrogate pairs. Preserve escaped data when removing the
  Telegram formatting subset. Treat any rejected/timed-out chunk as failure.
- Core categories and default suppression remain unchanged.
  `NOTIFICATION_MUTED_CATEGORIES` overrides `TELEGRAM_MUTED_CATEGORIES`.
  Monitoring cooldown/deduplication behavior must remain unchanged.
- Migrate shared JavaScript callers, watchdog, direct Python Optuna senders,
  daily/weekly reports, bridge down/recovery alerts and host alerts.
- In the companion PR, core deployment selects the transport's secret bindings
  through the GitHub `NOTIFICATION_TRANSPORT` variable. The cleanup PR removes
  that variable and binds only `DISCORD_WEBHOOK_URL`; the single `main` deployment
  of the companion PR with the cleanup folded in is the switch.
  Jun provisions the secret before deploying. MAGI moni uses `--update-env-vars` so future
  deployments retain Jun's Discord configuration instead of erasing it.

# Cutover gates (Jun-operated)

1. Review linked implementation PRs and independent review of approval issuance,
   L0 command authorization, and notification failure handling. Run unit tests,
   static checks and OKF gates. Telegram rollback is retired (Jun 2026-11-08);
   the Telegram removal PRs deploy only after the step 2 secrets exist.
2. Create the separate MAGI application. Configure its public key, application ID,
   owner user ID, guild and private channel IDs. Store `MAGI_DISCORD_BOT_TOKEN`
   securely only for command registration; never overwrite or reuse OpenClaw's
   `DISCORD_BOT_TOKEN`. Run registration
   dry-run first; the explicit `--apply` replaces only the MAGI guild commands.
   Also create the private notification webhook secret `DISCORD_WEBHOOK_URL` now:
   no repository may deploy Telegram-free code before it exists.
3. Jun deploys magi-moni with the cleanup PR already folded into the companion
   PR (magi-moni#59 merged into #58's branch, then #58 to `main`), so the Discord
   endpoint goes live in the same deployment that removes the Telegram webhook.
   Then Jun sets Interactions Endpoint URL to `/webhook/discord`
   and verifies Discord's signed PING challenge. Ensure commands are visible only
   as intended. Verify the channel is actually private in Discord permissions;
   an endpoint allowlist alone does not make a public channel private.
4. Verify `/ask`, read-only commands, text chunking and a screenshot; other users,
   applications, guilds and channels must be rejected. Verify confirmed buttons
   cannot be replayed, altered, used after expiry or used by another user.
5. Jun validates `/kill`, status read-back and `/resume` in an explicitly agreed
   maintenance window; do not toggle trading controls merely to test deployment.
   Validate a simulated order/approval only with explicit approval and a mocked
   or safely isolated broker. Verify failure of approvals storage blocks orders.
6. Using the `DISCORD_WEBHOOK_URL` secret from step 2, the
   switch itself is the cleanup PRs' deployment, one repository at a time
   (magi-moni at step 3; magi-core here, magi-core#708 with #710 folded in); each deployment moves its producers to
   Discord and removes their Telegram path together. Preserve category mutes. Verify a critical
   alert, down/recovery path, scheduler report failure, cooldown and long report.
   Avoid duplicate production alerts during acceptance.
   **Mandatory (option A, Jun 2026-11-08):** a live delivery test of every
   producer to its Discord destination, plus the watchdog's Discord path, passes
   before the cutover is declared complete. Record the date and producer list in
   `log.md`. There is no Telegram fallback, so a failed producer is fixed on
   Discord before proceeding.
7. Approve the OpenClaw operator device in Settings → Devices, inspect configuration,
   channel/plugin support, current agent/workspace and models. Resolve the observed
   unresolved model identifiers with Jun before changing models. Configure Jun-only
   Discord access through the approved device. Verify a conversation, agent identity,
   memory recall and a scheduled announcement against the preserved workspace.
8. Enumerate **live** OpenClaw cron destinations and TIALA LaunchAgents. The existing
   `aka-memory` and `tiala-host` draft descriptions are hypotheses, not proof of live
   Telegram producers. Never commit keys.
9. After every producer passes the option-A tests, Jun removes what the
   repositories cannot: the external Telegram webhook and Bot configuration,
   remaining OpenClaw/TIALA Telegram destinations, Cloud Run Telegram env and
   secret bindings, and finally the Secret Manager entries. The cleanup PRs
   have already removed the Telegram routes and send code. Keep retirement
   tracking open until Jun confirms these physical deletions.

# Retirement inventory and rollback

| Surface | Before acceptance | After Jun confirms acceptance |
|---|---|---|
| OpenClaw Telegram channel | Switch to Discord in one step once the Discord channel is configured (no parallel) | Remove token binding/config and all Telegram announce targets |
| TIALA cron/LaunchAgents | Inspect live inventory; keep unrelated memory jobs | Retire only verified Telegram-specific producers; retain memory/runtime |
| moni webhook/setup | No rollback route (state C retired). The inspected state A code has the `confirmed=true` drift (fail-open); which revision production runs is not verified. With #58 deployed, model mutations fail closed | Cleanup PR removes routes and Telegram send code; Jun deletes the external webhook |
| moni reports | Discord only once the cleanup PR deploys | Remove Telegram environment bindings after Discord report checks |
| core JavaScript/Python | Cleanup PR makes Discord the only transport; preserve mutes/failure semantics | Rename remaining Telegram-named modules/identifiers in a later follow-up |
| bridge/host monitor jobs | Jun enables Discord binding one job at a time | Remove old Bot/chat secret bindings and verify recovery alerts |
| Secret Manager | No rollback interval (no Telegram rollback) | Jun retires/revokes Telegram secrets once no deployed revision binds them |
| AKA-1 order gate / L0 / tables | Keep fail-closed semantics and schemas | Keep; these are not retirement targets |
| OKF / consumer pins | Link the staged plan; do not assert live cutover | Record live evidence, update service/guard/table channel wording, then advance pins explicitly |

There is no Telegram rollback (state C retired, Jun 2026-11-08). A failed
Discord rollout is fixed forward on Discord, never by restoring Telegram and
never by reverting moni to state A without Jun's decision. The option-A live
delivery tests are the safeguard. Keep the authenticated OpenClaw browser
interface as a recovery path. A failed Discord rollout pauses retirement; it never triggers
automatic trading actions, new Bot creation, or secret deletion.

# Sources

- [Discord interaction responses](https://docs.discord.com/developers/interactions/receiving-and-responding)
- [OpenClaw Discord setup](https://docs.openclaw.ai/channels/discord/setup)
- [magi-moni](magi-moni.md), [magi-core](magi-core.md)
- [L0 kill switch](../guards/l0-kill-switch.md), [system control](../echidna-tables/system-control.md)
- [order approvals](../echidna-tables/order-approvals.md)
