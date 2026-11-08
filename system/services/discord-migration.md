---
type: Workflow
title: Telegram to Discord staged migration
description: Cutover, acceptance, rollback and retirement gates for OpenClaw and MAGI communications.
lilith_safe: false
status: draft
generated: { by: devin/web, at: 2026-11-08T00:00:00Z }
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

Implementation references: magi-core base
`84ab0a0f4c3111d04d234a0da490541f8e9675db` (OKF pin
`437d1d68a7f0f157ff88180ba9be721025760f37`); magi-moni base
`2ec39dcda90641bc250e51b0108a96b4d36a5f31` (no pin, task reference
`4035ac393d30a1135e48f64a7f2636ee1d6ba105`). This documentation change starts
from OKF `b118744`; no consumer pin is silently advanced.

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
natural-language assent are not authorization, including on the rollback
Telegram model path. Mutations are proposed with an immutable parameter snapshot
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
callback. Duplicate delivery/uncertain ACK acceptance does no work. Concurrent
button presses consume the local pending entry once. Restart, deployment, expiry
or routing the click to another instance fails closed. A replacement operation
must be requested explicitly after checking actual state; never auto-retry a
mutation after an uncertain result. This is not broker exactly-once execution.
Jun must review this safety/availability trade-off before enabling operations.

# Notification contract

- `NOTIFICATION_TRANSPORT=telegram|discord`; unset preserves Telegram during
  migration. Invalid/missing Discord configuration must not fall back to Telegram.
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
- Core deployment selects only the chosen transport's secret bindings through
  the GitHub `NOTIFICATION_TRANSPORT` repository variable. Jun provisions the
  selected secret before deploying. MAGI moni uses `--update-env-vars` so future
  deployments retain Jun's Discord configuration instead of erasing it.

# Cutover gates (Jun-operated)

1. Review linked implementation PRs and independent review of approval issuance,
   L0 command authorization, and notification failure handling. Run unit tests,
   static checks and OKF gates. Keep Telegram rollback code/credentials for now.
2. Create the separate MAGI application. Configure its public key, application ID,
   owner user ID, guild and private channel IDs. Store its Bot token securely only
   for command registration; do not reuse the OpenClaw token. Run registration
   dry-run first; the explicit `--apply` replaces only the MAGI guild commands.
3. Jun deploys the service, sets Interactions Endpoint URL to `/webhook/discord`,
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
6. Create a private notification webhook and securely bind it to each producer.
   Enable Discord transport in stages, preserving category mutes. Verify a critical
   alert, down/recovery path, scheduler report failure, cooldown and long report.
   Avoid duplicate production alerts during acceptance.
7. Approve the OpenClaw operator device in Settings → Devices, inspect configuration,
   channel/plugin support, current agent/workspace and models. Resolve the observed
   unresolved model identifiers with Jun before changing models. Configure Jun-only
   Discord access through the approved device. Verify a conversation, agent identity,
   memory recall and a scheduled announcement against the preserved workspace.
8. Enumerate **live** OpenClaw cron destinations and TIALA LaunchAgents. The existing
   `aka-memory` and `tiala-host` draft descriptions are hypotheses, not proof of live
   Telegram producers. Export a redacted rollback configuration; never commit keys.
9. Only after every producer passes acceptance, disable Telegram channel/webhook
   ingestion and registration (`TELEGRAM_ENABLED=false` for moni), change remaining
   cron destinations, then remove old runtime bindings. Keep retirement tracking
   open until Jun confirms the physical deletions and observation window is complete.

# Retirement inventory and rollback

| Surface | Before acceptance | After Jun confirms acceptance |
|---|---|---|
| OpenClaw Telegram channel | Keep until Discord conversation/cron verified | Disable, remove token binding/config and all Telegram announce targets |
| TIALA cron/LaunchAgents | Inspect live inventory; keep unrelated memory jobs | Retire only verified Telegram-specific producers; retain memory/runtime |
| moni webhook/setup | Keep rollback route; model mutations fail closed | Set disabled flag, delete external webhook, then remove routes/Telegram send code |
| moni reports | Select one transport; retain rollback secret | Remove Telegram environment bindings after Discord report checks |
| core JavaScript/Python | Transport selector; preserve mutes/failure semantics | Remove Telegram sender branch and compatibility names in a follow-up |
| bridge/host monitor jobs | Jun enables Discord binding one job at a time | Remove old Bot/chat secret bindings and verify recovery alerts |
| Secret Manager | Keep old versions for agreed rollback interval | Jun retires/revokes Telegram secrets only after last consumer is gone |
| AKA-1 order gate / L0 / tables | Keep fail-closed semantics and schemas | Keep; these are not retirement targets |
| OKF / consumer pins | Link the staged plan; do not assert live cutover | Record live evidence, update service/guard/table channel wording, then advance pins explicitly |

Before retirement, rollback selects Telegram explicitly and restores the previous
bindings/configuration through Jun, not silent fallback. The deleted Telegram
account may make rollback delivery unavailable: do not claim an old transport
is usable without a live check. Keep the authenticated OpenClaw browser interface
as a recovery path. A failed Discord rollout pauses retirement; it never triggers
automatic trading actions, new Bot creation, or secret deletion.

# Sources

- [Discord interaction responses](https://docs.discord.com/developers/interactions/receiving-and-responding)
- [OpenClaw Discord setup](https://docs.openclaw.ai/channels/discord/setup)
- [magi-moni](magi-moni.md), [magi-core](magi-core.md)
- [L0 kill switch](../guards/l0-kill-switch.md), [system control](../echidna-tables/system-control.md)
- [order approvals](../echidna-tables/order-approvals.md)
