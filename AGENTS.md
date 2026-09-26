---
type: Workflow
title: Agent instructions for magi-knowledge
description: Entry point and validation rules for development agents working on the MAGI knowledge bundle.
lilith_safe: false
tags: [workflow, agents, development]
---

# Agent instructions

[index.md](index.md)、[README.md](README.md)、[COLLABORATION.md](COLLABORATION.md) を
このバンドルに変更を加える前に必ず読んでください。
そのうえで、作業対象に応じて `system/` または `_lilith_safe/` 配下の関連文書を確認してください。

- このリポジトリは共有仕様の正本です。旧 `magi-stg` 仕様はアーカイブ済みで、
  export と Cloudflare ミラーは派生物です。
- 着手前に未解決の Issue / PR を確認してください。実装担当は 1 名に統一し、
  ハンドオフやレビュー修正時も既存ブランチを維持してください。
- LILITH 汚染境界を厳守してください。`system/` 側の知識や開発手順を
  `_lilith_safe/` にコピーしてはいけません。
- Concept Markdown には空でない `type` frontmatter が必須です。
  `system/` の concept は `lilith_safe: false`、学習向け concept は
  `lilith_safe: true` を使用します。`okf_common.py` の予約ファイル規則に従ってください。
- 値に不一致がある場合は実装と照合し、参照したリビジョンを記録してください。
  アクセスできない場合はその事実を報告し、現行デフォルト・デプロイ設定・
  ポリシー衝突の解決を推測しないでください。
- 役割・所有権・ライフサイクル・ポリシー意図については、人手検証済み
  `stable` の OKF concept が権威です。過去のコードパス、コメント、名称、
  無効化済みジョブはこれを上書きしません。不一致は実装ドリフトとして扱い、
  両方のリビジョンを報告してください。退役／停止中ユニットが live trading に
  参加していると推定してはいけません。
- 機微な変更には [COLLABORATION.md](COLLABORATION.md) に定義された
  独立レビューが必要です。リポジトリ固有のデプロイルールは引き続き有効であり、
  本文書は本番運用の権限を付与しません。
- 承認済み変更では、関連 concept 文書と `log.md` を更新してください。
  生成物は直接編集せず、再生成してください。

Run the existing gates from the repository root:

```bash
python scripts/okf_lint.py
python scripts/test_lilith_safe_loader.py
```

PR には実際の実行結果を Summary / Key Changes / Verification の形式で記載してください。
合意に達したら、確認だけの往復（acknowledgement loop）は止めてください。
