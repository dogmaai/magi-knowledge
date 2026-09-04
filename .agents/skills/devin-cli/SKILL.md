---
name: devin-cli
description: Devin CLI（ローカルコーディングエージェント）のインストール、主要コマンド、モード、ハンドオフ、MCP、設定ファイルのリファレンス。Devin CLI の使い方を調べたり、.devin/config.json を書くときに参照する。
type: Reference
lilith_safe: false
tags: [reference, devin, cli, tooling]
---

# Devin CLI リファレンス

公式ドキュメント: https://docs.devin.ai/cli  
簡易ガイド: https://docs.devin.ai/cli/essential-commands  
コマンドリファレンス: https://docs.devin.ai/cli/reference/commands  
設定ファイルリファレンス: https://docs.devin.ai/cli/reference/configuration/config-file

## 概要

- Devin CLI はターミナル上で直接動作するローカルコーディングエージェント。
- ファイル編集、シェルコマンド実行、コードレビュー、タスク自動化などが対話的にできる。
- クラウド上の Devin セッションに `/handoff` で作業を引き継げる。
- Devin Cloud と比較して、Playbooks / Secrets / Knowledge 等の一部機能は現時点では未対応（今後対応予定）。

## インストール

```bash
# macOS / Linux / WSL
curl -fsSL https://cli.devin.ai/install.sh | bash

# macOS Homebrew
brew install --cask devin-cli
brew upgrade --cask devin-cli
```

Windows の場合はインストーラ、または PowerShell で:

```powershell
irm https://static.devin.ai/cli/setup.ps1 | iex
```

Devin Desktop を利用している Enterprise プランでは、Command Palette から `Install Devin CLI` を実行して PATH に追加できる。

## クイックスタート

```bash
devin                              # 対話的 REPL を起動
devin -- <prompt>                  # プロンプト付きで REPL 起動
devin -p "<prompt>"                # 単一ターンで結果を stdout に出力して終了
devin -p -- <prompt words>         # 同上（-- 区切り）
```

プロンプトをコマンドと区別するために `--` を使う。`@` でファイル・ディレクトリの自動補完が開く。

## グローバルフラグ

| フラグ | ショート | 説明 |
| --- | --- | --- |
| `--model <name>` | | 使用する AI モデルを指定 |
| `--permission-mode <mode>` | | 権限モード (`normal`, `dangerous`, `bypass`) |
| `--continue` | `-c` | 現在のディレクトリで直近のセッションを再開 |
| `--resume <id>` | `-r` | 指定したセッションを再開 |
| `--print [PROMPT]` | `-p` | 単一ターン出力モード |
| `--prompt-file <path>` | | ファイルから初期プロンプトを読み込み |
| `--config <path>` | | 設定ファイルのパス |
| `--export [PATH]` | | ターンごとに会話をファイルにエクスポート（ATIF 形式） |
| `--respect-workspace-trust` | | ワークスペースの trust 設定を尊重 |

例:

```bash
devin -- add a login page
devin --model opus -- refactor the auth module
devin -c                              # 直近のセッションを再開
devin -r abc12345                     # 指定セッションを再開
devin -p "list all TODO comments"    # 単一ターン出力
devin --export out.json -- fix tests  # 出力をエクスポート
```

## 権限モード

| モード | 説明 | 起動方法 |
| --- | --- | --- |
| `normal` | 読み取りは自動承認、書き込み・実行は確認（デフォルト） | `/normal` または `/mode normal` |
| `accept-edits` | ファイル編集を自動承認、シェル等は確認 | `/accept-edits` |
| `plan` | 読み取り専用の計画モード | `/plan` |
| `bypass` | すべて自動承認。エイリアス `/yolo`, `/dangerous` | `/bypass` または `--permission-mode bypass` |
| `autonomous` | OS レベルサンドボックス内で実行 | `--sandbox --permission-mode autonomous` |

注意:
- `bypass` でも組織の Team Settings で deny / ask ルールが設定されている場合はそれが優先される。
- `autonomous` は `--sandbox` 指定時のみ利用可能。サンドボックス外では `bypass` を使う。

## ハンドオフ（クラウド Devin へ引き継ぎ）

ローカルで扱いきれない作業や、PC を離れた間も続けさせたい場合:

```bash
/handoff fix the flaky integration tests in CI
```

- 現在の会話コンテキスト、git ブランチ、コミット前の変更（untracked も含む）をまとめてクラウドの Devin セッションへ送信する。
- 引き継ぎ後は端末や Web アプリで進捗を確認できる。
- タスク説明を省略すると、中断した箇所から自動的に再開する。
- `&` を空のプロンプトで入力してもハンドオフモードに入る。
- 既存のクラウドセッションにアタッチしたい場合は `/cloud-attach <session-id>`。

ハンドオフに適したケース:
- VM / サーバー作業（dev server、Docker build など）
- ブラウザ操作（スクリーンショット、OAuth、E2E テスト、スクレイピング）
- CI / CD パイプラインのデバッグやデプロイ
- 長時間実行タスク（マイグレーション、バッチ、大規模リファクタリング）
- 並列実行（クラウドに任せつつローカルでも別作業）

## セッション管理

```bash
devin -c              # 直近のセッションを再開
devin --continue
devin -r              # セッション選択
devin --resume
devin -r <session-id> # 指定セッションを再開
```

セッション内スラッシュコマンド:

| コマンド | 説明 |
| --- | --- |
| `/continue [session-id]` | セッションを再開 |
| `/resume [session-id]` | セッション選択または指定再開 |
| `/ls` | 現在のディレクトリの最近のセッションを一覧 |
| `/ls --all` | すべてのディレクトリのセッションを一覧 |
| `/rm-session <id>` | セッションを削除 |
| `/clear` / `/new` | 会話履歴をクリア |
| `/fork [step]` | 現在のセッションを分岐 |
| `/steps` | 会話のステップ一覧 |
| `/revert <step>` | 指定ステップ以降のファイル変更を取り消し |

## モデル切り替え

```bash
# 起動時
devin --model opus -- refactor this module

# セッション内
/model opus
/model sonnet
/model codex
/model adaptive
/fast
```

- `/model` だけでモデル選択 UI が開く。
- 省略名 (`opus`, `sonnet`, `swe`, `codex`, `gemini` など) は常に最新版を指す。
- デフォルトは `~/.config/devin/config.json` の `agent.model` で設定（デフォルト値 `swe-1-6-fast`）。

用途別の推奨:

- 複雑なリファクタリング / アーキテクチャ設計: `opus` または `gpt`
- 軽微な編集・質問・コスト重視: `swe`
- 検討: `swe`, `gpt`, `opus` をまず試すのが推奨

## 主なサブコマンド

| サブコマンド | 説明 |
| --- | --- |
| `devin auth login/logout/status` | 認証管理。`--force-manual-token-flow` でブラウザなし |
| `devin mcp add/list/get/remove/...` | MCP サーバーの管理 |
| `devin rules list/show/paths` | エージェントルールの管理 |
| `devin skills list/show/paths` | エージェントスキルの管理 |
| `devin list` (`ls`) | セッション一覧（対話 / JSON / CSV） |
| `devin version` | バージョン表示 |
| `devin acp` | ACP サーバーとして起動（IDE 連携） |
| `devin update` | 更新確認・適用。`--force` で強制再インストール |
| `devin shell setup [bash\|zsh\|fish]` | シェル統合のセットアップ |
| `devin sandbox setup` | OS サンドボックス前提条件の確認 |
| `devin setup` | 認証・MCP 設定の対話ウィザード |
| `devin uninstall [--clean] [--force]` | アンインストール |

## MCP サーバー設定

```bash
devin mcp add my-server -- npx @company/mcp-server --port 3000
devin mcp add notion https://mcp.notion.com/mcp
devin mcp add -e GITHUB_TOKEN=ghp_xxx github -- npx -y @modelcontextprotocol/server-github
devin mcp add -s project sentry https://mcp.sentry.dev/mcp
```

- `-t, --transport <stdio|http>`: トランスポート
- `-s, --scope <local|project|user>`: 設定のスコープ（デフォルト `local`）
- `-e KEY=VALUE`: 環境変数（繰り返し可）
- `-H HEADER`: HTTP ヘッダー（繰り返し可）
- `--scopes <SCOPE,SCOPE>`: OAuth スコープ

HTTP は Streamable HTTP を試し、4xx の場合は従来の SSE にフォールバックする。

## 設定ファイル

設定ファイルの場所:

| ファイル | 用途 |
| --- | --- |
| `~/.config/devin/config.json` | ユーザー全体の設定 |
| `.devin/config.json` | プロジェクト設定（コミット可） |
| `.devin/config.local.json` | プロジェクトのローカル上書き（gitignored） |

Windows では `%APPDATA%\devin\config.json`。

プロジェクト設定で設定できるのは `permissions`, `mcpServers`, `read_config_from`, `hooks` のみ。それ以外はユーザーコンフィグに設定する。

主要なオプション例:

```json
{
  "agent": {
    "model": "swe-1-6-fast",
    "show_history_on_continue": true
  },
  "permissions": {
    "allow": ["Read(**)", "Exec(git)"],
    "deny": ["Exec(sudo)"],
    "ask": ["Write(**/.env*)"]
  },
  "mcpServers": {},
  "read_config_from": {
    "cursor": true,
    "windsurf": true,
    "claude": true
  },
  "auto_update": true,
  "attribution": true,
  "notify": "smart"
}
```

## その他のスラッシュコマンド

### ナビゲーション・制御

| コマンド | 説明 |
| --- | --- |
| `/help` | コマンド一覧 |
| `/exit` / `/quit` | 終了 |
| `/theme <name>` | テーマ切り替え |

### ワークスペース

| コマンド | 説明 |
| --- | --- |
| `/workspace` | ワークスペースディレクトリ一覧 |
| `/add-dir <path>` | 追加 |
| `/undo-add-dir <path>` | 削除 |

### 自動化・拡張

| コマンド | 説明 |
| --- | --- |
| `/loop <prompt>` | プロンプト実行 → diff 確認をループ（開始時にクリーンな git 状態が必要） |
| `/hooks` | 読み込まれている hook を一覧 |
| `/login` / `/logout` / `/update` | 認証・更新 |

## Devin CLI vs クラウド Devin

| | Devin CLI | クラウド Devin |
| --- | --- | --- |
| 実行場所 | ローカルターミナル | VM（クラウド） |
| 主な用途 | 高速な対話型コーディング | ブラウザ、長時間・並列タスク、インフラ |
| Playbooks / Secrets / Knowledge | 現在未対応 | 対応 |
| ハンドオフ | `/handoff` でクラウドに引き継ぎ可能 | - |

## 参考リンク

- https://docs.devin.ai/cli
- https://docs.devin.ai/cli/essential-commands
- https://docs.devin.ai/cli/reference/commands
- https://docs.devin.ai/cli/reference/configuration/config-file
- https://docs.devin.ai/cli/handoff
- https://docs.devin.ai/cli/models
