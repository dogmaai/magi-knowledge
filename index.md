---
okf_version: "0.2"
---

# MAGI Knowledge Bundle

MAGI システム知識の single source of truth を、
[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
（OKF v0.2）で表現したバンドルです。人間と MAGI を運用する AI エージェント
（Devin, AKA-1）、および LILITH 学習パイプラインの双方を対象に作成されています。

以前の仕様は `dogmaai/magi-stg`（`specifications/` と `docs/`）にありましたが、
当該リポジトリは **archived** され、仕様ファイルには本バンドルへの誘導バナーが
付与されています。現在の権威ある唯一の情報源はこのバンドルです。
変更履歴は [log.md](log.md) を参照してください。

# Trees

* [_lilith_safe/](_lilith_safe/) - LILITH 学習パイプラインが消費してよい clean-source ground truth。汚染境界で保護。
* [system/](system/) - Full-system knowledge（ECHIDNA tables, PLM unit registry, services, guard layers）。LILITH へ流入させてはならない。

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

詳細は [_lilith_safe/index.md](_lilith_safe/) を参照してください。

# Knowledge authority: trust & lifecycle

このリポジトリが **authority** であり、OKF はその表現形式にすぎません
（GitHub は保管とバージョン管理、GPT・Devin・Gemini・Antigravity・人間は
consumers）。consumer が canonical knowledge と仮説を区別できるよう、
`system/` と `_lilith_safe/` 配下のすべての concept は OKF v0.2 の trust/lifecycle
ファミリー（SPEC §5, §7）を持ち、`scripts/okf_lint.py` がそれを強制します。

| Key | Meaning | Rule |
|---|---|---|
| `status` | OKF lifecycle: `draft` \| `stable` \| `deprecated` | required; a non-deprecated doc MUST NOT link to a `deprecated` one |
| `generated: { by, at }` | who wrote the current content, and when | required; `by` is a §7 actor (`human:jun`, `devin/cloud`, `process:<id>`) |
| `verified: { by, at }` (or a list) | who confirmed the content | `status: stable` REQUIRES a `human:` verifier — AI review alone earns only `draft` |
| `stale_after` | absolute instant after which the doc must be re-verified | stale = WARN in PR CI, ERROR in the scheduled freshness run |

Lifecycle は次の通りです。AI が仮説を書く（`draft`, `generated.by: devin/cloud`）→
人間がレビューしてマージする（`verified.by: human:jun`）→ `stable` →
その後は再検証（新しい `verified` エントリと `stale_after`）または後継リンク付きで
`deprecated` に移行します。consumer は `verified`（§5.3）から trust tier
（*unverified* / *machine-confirmed* / *human-reviewed*）を導出します。
R2 Data Catalog（`trust_tier`, `verified_at`）と AI Search（`status`）のミラーも
同じシグナルを公開するため、リポジトリではなくミラーを読むエージェントでも
同等にフィルタできます。

ドメイン固有のライフサイクル（例: PLM unit の `active` / `shadow` / `retired`）は
`status` ではなく `unit_status` に記述します。
