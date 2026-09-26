# magi-knowledge

MAGI 取引システム向けの OKF v0.2 ナレッジバンドルです。YAML frontmatter 付き
Markdown を集約したディレクトリで、人間が読めてエージェントが解析でき、
Git で差分確認でき、利用に **専用ツールを必須としない** 形をとっています。

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
    ├── okf_common.py        # zero-dep frontmatter parser + trust-tier helpers
    ├── okf_lint.py          # OKF conformance, trust/lifecycle + LILITH contamination linter
    ├── okf_export.py        # flatten one tree into a single Markdown digest
    ├── lilith_safe_loader.py# the ONLY sanctioned reader for LILITH training
    └── test_lilith_safe_loader.py
```

## Development agents

[AGENTS.md](AGENTS.md) と、GPT/Codex・Devin・Antigravity 共通の
[collaboration workflow](COLLABORATION.md) から読み始めてください。
このワークフローは、タスク所有者、ハンドオフ、独立レビュー、
既存ドリフトチェックの拡張方針を定義しています。

## Why this exists

MAGI の知識は、コードコメント、`magi-stg/specifications`、Devin の
ナレッジノート、各リポジトリ README に分散していました。このバンドルは、
複数エージェントが共通認識として持つべき内容（BigQuery スキーマ、
PLM ユニット一覧、LILITH 学習パイプラインが依存する正本定義）を、
差分可能かつエージェント可読な 1 つのコーパスに統合します。

## The LILITH contamination boundary (read this first)

LILITH は **独立した推論器** です。MAGI Constitution に従い、判断は
LILITH 自身の検証可能データのみに基づかなければならず、他ユニットの加工済み
インテリジェンスや Section 5（"Jun Review Only"）の ticker picks は参照しません。

この境界を誤って越えられないよう、次の仕組みで強制しています。

| Mechanism | Guarantee |
|---|---|
| `_lilith_safe/` subtree | The only knowledge the training pipeline may read. |
| `lilith_safe: true\|false` frontmatter | Must match the doc's location; CI fails otherwise. |
| `scripts/lilith_safe_loader.py` | Reads only `_lilith_safe/`; refuses traversal & unflagged docs (fail-loud). |
| `scripts/okf_lint.py` | Fails CI on cross-unit names, unit win-rates, or Section 5 / ticker picks inside `_lilith_safe/`. |

## Trust & lifecycle (what is canonical?)

すべての concept は OKF v0.2 の trust frontmatter を持ち、
`okf_lint.py` で強制されます。

```yaml
status: stable                                          # draft | stable | deprecated
generated: { by: devin/cloud, at: 2026-08-27T07:28:31Z } # who wrote it (§7 actor)
verified: { by: human:jun, at: 2026-08-27T07:28:31Z }    # who confirmed it
stale_after: 2027-02-23T07:28:31Z                        # re-verify by this instant
```

`stable` には `human:` verifier が必須です。AI 作成・AI レビューのみの内容は
`draft` のままです。現役文書から `deprecated` 文書へリンクすると CI は失敗します。
期限切れ（stale）文書は各 PR で警告され、週次 freshness run
（`okf_lint.py --fail-on-stale`）では失敗します。
背景は [index.md](index.md#knowledge-authority-trust--lifecycle) を参照してください。

## Consuming the bundle

SDK は不要です。任意のファイルを `cat` して読めます。エージェントは
frontmatter を直接解析します。

### Syncing the spec to an LLM that cannot read the repo

[PROMPT.md](PROMPT.md) 冒頭の 6 行 **Consumer Preamble** を、対象 LLM の
system prompt に貼り付けてください。ここには仕様値は含まれず、
権威の所在と `status` / `trust_tier` の読み方だけを定義しているため、
仕様更新時にも通常は修正不要です。下段の完全版は、手順を段階的に必要とする
エージェント向けです。

リポジトリアクセスがあるエージェント（Antigravity / Devin / Devin CLI）は、
このバンドルを直接読むべきです（`main` を clone/pull するか submodule として vendor）。
チャット UI や one-shot prompt では、1 つの tree を貼り付け可能な単一ファイルへ
flatten してください。

```bash
python scripts/okf_export.py                      # system/ tree (~90 KB)
python scripts/okf_export.py --tree _lilith_safe  # LILITH-safe tree only
python scripts/okf_export.py -o /tmp/magi-spec.md
```

1 回の実行で export される tree は必ず 1 つだけです。`lilith_safe` フラグが
tree と不一致の文書がある場合は export を中断するため、digest が境界の両側を
混在させることはできません。既定出力は stdout なので生成物をコミットせずに済みます。
digest を直接編集せず、再生成してください。

LILITH 学習パイプライン（`dogmaai/lilith-training`）は、このバンドルを
vendor（`vendor/magi-knowledge` の git submodule、または build-time fetch）し、
**必ず** `LilithSafeKnowledge` 経由でのみ読み込みます。

```python
from lilith_safe_loader import LilithSafeKnowledge
kb = LilithSafeKnowledge("vendor/magi-knowledge")
schema   = kb.get("schemas/isabel-stats-block")
patterns = kb.hallucination_patterns()
forbidden_names = kb.cross_unit_names()   # detector list, never prompt text
```

## CI

`.github/workflows/okf-conformance.yml` は、各 PR で linter と loader smoke test
を実行します。どちらも pure-stdlib Python 3.11 で動作し、`pip install` は不要です。

Run locally:

```bash
python scripts/okf_lint.py
python scripts/test_lilith_safe_loader.py
```
