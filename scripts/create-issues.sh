#!/bin/bash
# GitHub Issues 一括作成スクリプト

cd /c/claudeprojects/t-naviex

# Phase 1: 認証・ユーザー管理（続き）
echo "Creating Phase 1 issues (Auth & User Management)..."

gh issue create --title "[Phase1-1.2.3] ユーザーテーブル（USERS）実装" \
  --body "## 概要
ユーザー情報を管理するテーブルとAPIを実装する。

## タスク
- [ ] Prisma スキーマに USERS テーブル追加
- [ ] マイグレーション実行
- [ ] ユーザー型定義 (types/user.ts)
- [ ] ユーザーリポジトリ実装
- [ ] パスワードハッシュ化 (bcrypt)

## 関連仕様
- ER図: USERS テーブル
- 要求仕様: S-2001" \
  --label "phase:1,area:database,area:backend,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.2.4] ロール・権限テーブル実装" \
  --body "## 概要
ロールと権限を管理するテーブルを実装する。

## タスク
- [ ] ROLES テーブル実装
- [ ] PROJECT_MEMBERS テーブル実装
- [ ] デフォルトロールのシードデータ作成
  - システム管理者
  - プロジェクト管理者
  - メンバー
  - ゲスト
- [ ] 権限定義（JSON形式）

## 関連仕様
- ER図: ROLES, PROJECT_MEMBERS テーブル
- 要求仕様: R-2100" \
  --label "phase:1,area:database,area:backend,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.2.5] ロールベースアクセス制御（RBAC）ミドルウェア" \
  --body "## 概要
ロールに基づいたアクセス制御ミドルウェアを実装する。

## タスク
- [ ] 権限チェックミドルウェア作成
- [ ] APIルートへの権限適用
- [ ] ページコンポーネントへの権限適用
- [ ] 権限不足時のエラーハンドリング
- [ ] 権限チェック用カスタムフック

## 受け入れ条件
- 権限のないユーザーがアクセスすると403エラー
- 権限に応じてUIが制御される

## 関連仕様
- 要求仕様: S-2801 RBAC実装" \
  --label "phase:1,area:backend,area:security,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.2.6] ユーザー管理画面（一覧・追加・編集・削除）" \
  --body "## 概要
管理者向けユーザー管理画面を実装する。

## タスク
- [ ] ユーザー一覧画面 (/settings/users)
- [ ] ユーザー追加ダイアログ
- [ ] ユーザー編集画面
- [ ] ユーザー削除確認ダイアログ
- [ ] ステータス変更（有効/無効/停止）
- [ ] 検索・フィルタリング機能

## 関連仕様
- GUI仕様書: セクション10 ユーザー管理
- 要求仕様: S-2001" \
  --label "phase:1,area:frontend,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.2.7] ロール・権限管理画面" \
  --body "## 概要
ロールと権限を設定する管理画面を実装する。

## タスク
- [ ] ロール一覧画面
- [ ] ロール詳細・権限編集画面
- [ ] 権限マトリクス表示
- [ ] ユーザーへのロール割り当て

## 関連仕様
- GUI仕様書: セクション11 権限マトリクス
- 要求仕様: S-2002" \
  --label "phase:1,area:frontend,priority:medium" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.2.8] パスワードポリシー設定" \
  --body "## 概要
パスワードの強度ポリシーを設定・適用する。

## タスク
- [ ] パスワードポリシー設定画面
- [ ] 最小文字数設定
- [ ] 文字種要件（大文字、小文字、数字、記号）
- [ ] パスワード有効期間
- [ ] ログイン失敗時のアカウントロック
- [ ] バリデーション実装

## 関連仕様
- 要求仕様: S-2003" \
  --label "phase:1,area:backend,area:security,priority:medium" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.2.9] セッション管理設定" \
  --body "## 概要
セッションタイムアウト等のセキュリティ設定を実装する。

## タスク
- [ ] セッションタイムアウト設定
- [ ] タイムアウト警告表示
- [ ] 自動ログアウト機能
- [ ] セッション管理画面

## 関連仕様
- 要求仕様: S-2005, S-2806" \
  --label "phase:1,area:backend,area:security,priority:medium" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.2.10] 監査ログテーブル・基本ログ記録" \
  --body "## 概要
ユーザー操作の監査ログを記録する機能を実装する。

## タスク
- [ ] AUDIT_LOGS テーブル実装
- [ ] ログ記録ミドルウェア
- [ ] 記録対象イベント定義
  - ログイン/ログアウト
  - データ作成/更新/削除
  - 設定変更
- [ ] IPアドレス・ユーザーエージェント記録
- [ ] 監査ログ一覧画面（管理者向け）

## 関連仕様
- ER図: AUDIT_LOGS テーブル
- 要求仕様: S-2007, S-2805" \
  --label "phase:1,area:database,area:backend,area:security,priority:medium" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

echo "Phase 1 Auth issues created."

# Phase 1: プロジェクト管理
echo "Creating Phase 1 issues (Project Management)..."

gh issue create --title "[Phase1-1.3.1] プロジェクトテーブル（PROJECTS）実装" \
  --body "## 概要
プロジェクト情報を管理するテーブルとAPIを実装する。

## タスク
- [ ] PROJECTS テーブル追加
- [ ] プロジェクト型定義
- [ ] プロジェクトCRUD API
  - GET /api/v1/projects
  - POST /api/v1/projects
  - GET /api/v1/projects/:id
  - PUT /api/v1/projects/:id
  - DELETE /api/v1/projects/:id
- [ ] プロジェクトステータス管理

## 関連仕様
- ER図: PROJECTS テーブル
- API仕様書: セクション6" \
  --label "phase:1,area:database,area:backend,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.3.2] プロジェクト一覧画面" \
  --body "## 概要
プロジェクト一覧を表示する画面を実装する。

## タスク
- [ ] プロジェクト一覧ページ (/projects)
- [ ] カード形式での表示
- [ ] ステータス別フィルタリング
- [ ] 検索機能
- [ ] ソート機能
- [ ] ページネーション

## 関連仕様
- GUI仕様書: プロジェクト一覧" \
  --label "phase:1,area:frontend,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.3.3] プロジェクト作成・編集画面" \
  --body "## 概要
プロジェクトの作成・編集画面を実装する。

## タスク
- [ ] プロジェクト作成ダイアログ/ページ
- [ ] プロジェクト編集画面
- [ ] フォームバリデーション
- [ ] プロジェクトタイプ選択
- [ ] 対象バージョン設定

## 関連仕様
- 要求仕様: S-1901" \
  --label "phase:1,area:frontend,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.3.4] プロジェクトメンバー管理" \
  --body "## 概要
プロジェクトへのメンバー追加・削除機能を実装する。

## タスク
- [ ] メンバー一覧表示
- [ ] メンバー追加機能（ユーザー検索・選択）
- [ ] ロール割り当て
- [ ] メンバー削除機能
- [ ] メンバー管理API

## 関連仕様
- ER図: PROJECT_MEMBERS テーブル
- API仕様書: セクション6.7" \
  --label "phase:1,area:frontend,area:backend,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.3.5] プロジェクトコピー機能" \
  --body "## 概要
既存プロジェクトをコピーして新しいプロジェクトを作成する機能。

## タスク
- [ ] プロジェクトコピーAPI
- [ ] コピー対象選択（テストケース、設定等）
- [ ] コピー確認ダイアログ
- [ ] 進捗表示

## 関連仕様
- 要求仕様: S-1902
- API仕様書: セクション6.6" \
  --label "phase:1,area:frontend,area:backend,priority:medium" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

gh issue create --title "[Phase1-1.3.6] プロジェクト選択・切り替え機能" \
  --body "## 概要
サイドナビでのプロジェクト切り替え機能を実装する。

## タスク
- [ ] プロジェクトセレクターコンポーネント
- [ ] 最近アクセスしたプロジェクト表示
- [ ] プロジェクト切り替え時のコンテキスト更新
- [ ] URLパラメータとの連動

## 関連仕様
- GUI仕様書: サイドナビ" \
  --label "phase:1,area:frontend,priority:high" \
  --milestone "Phase 1: 基盤・コア機能（MVP）"

echo "Phase 1 Project Management issues created."
