# T-NaviEx - テスト管理ツール

> Test Navigation Expert - ソフトウェアテストのプロセスを管理し、品質向上と生産性向上を実現するテスト管理ツール

---

## 概要

T-NaviExは、製品開発のライフサイクル全般でシステム・ソフトウェアのテストプロセスを管理するためのWebアプリケーションです。テスト計画の立案から、テストケースの設計・実施、バグ管理、品質分析まで、テスト活動全体を一元管理します。

### 主な機能

- **テスト計画管理**: マイルストーン、ガントチャート、コンフィギュレーション管理
- **テストケース管理**: 階層構造、リッチテキスト、タグ、カスタムフィールド対応
- **テスト実施管理**: テストラン、結果登録、添付ファイル、ストップウォッチ
- **バグ・課題管理**: ワークフロー、サブタスク、外部ツール連携
- **ダッシュボード・レポート**: 各種グラフ、品質分析、PDF出力
- **AI機能**: テストケース自動生成、AIレビュー、工数予測（Claude API）
- **外部連携**: Redmine、Backlog、REST API

---

## 技術スタック

| カテゴリ         | 技術                         |
| ---------------- | ---------------------------- |
| フロントエンド   | Next.js 14+ (App Router)     |
| UIコンポーネント | shadcn/ui + Tailwind CSS     |
| バックエンド     | Node.js                      |
| ORM              | Prisma                       |
| データベース     | PostgreSQL 16                |
| 認証             | NextAuth.js (Auth.js)        |
| リッチテキスト   | MDXEditor                    |
| グラフ           | Recharts / Chart.js          |
| AI               | Claude API (Anthropic)       |
| RAG              | Graph RAG (Neo4j / ArangoDB) |
| コンテナ         | Docker / Docker Compose      |
| CI/CD            | GitHub Actions               |
| テスト           | Vitest + Playwright          |

---

## ドキュメント構成

プロジェクトの設計ドキュメントは `docs/` フォルダに格納されています。

```
docs/
├── テスト管理ツール_USDM_要求仕様書.xlsx  # 要求仕様書（USDM形式）
├── テスト管理ツール_ER図.md               # データモデル（ER図）
├── テスト管理ツール_GUI仕様書.md          # 画面設計・遷移図
├── テスト管理ツール_API仕様書.md          # REST API仕様書
├── テスト管理ツール_テスト仕様書.md       # テスト仕様書
└── TODO_実装計画.md                       # 実装タスク一覧
```

### 各ドキュメントの概要

| ドキュメント       | 内容                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **USDM要求仕様書** | 30の要求（R-XXXX）と約180の仕様（S-XXXX）を定義。機能要件と非機能要件を網羅。                                              |
| **ER図**           | 約40テーブルのデータモデル。ユーザー・権限系、プロジェクト系、テスト設計系、テスト実施系、バグ系、ダッシュボード系に分類。 |
| **GUI仕様書**      | 画面遷移図、レイアウト構成、各画面の詳細仕様をMermaid図形式で定義。                                                        |
| **API仕様書**      | REST API全エンドポイントの仕様。認証、リクエスト/レスポンス形式、エラーコードを定義。                                      |
| **テスト仕様書**   | 単体テスト、結合テスト、E2Eテスト、性能テスト、セキュリティテストの仕様。約300件以上のテストケース。                       |
| **実装計画**       | 7フェーズに分けた実装タスク一覧。約200タスクを定義。                                                                       |

---

## 実装フェーズ

段階的にリリースする計画です。

| Phase       | 内容                                                            | 状態           |
| ----------- | --------------------------------------------------------------- | -------------- |
| **Phase 1** | 基盤・コア機能（MVP）: プロジェクト基盤、認証、テストケースCRUD | 進行中 (21/50) |
| **Phase 2** | テスト実施・結果管理: テストラン、結果登録、ガントチャート      | 未着手         |
| **Phase 3** | バグ・課題管理・外部連携: バグ管理、Redmine/Backlog連携         | 未着手         |
| **Phase 4** | ダッシュボード・レポート: 各種グラフ、PDF出力、品質分析         | 未着手         |
| **Phase 5** | AI機能統合: Claude API、テストケース自動生成、AIレビュー        | 未着手         |
| **Phase 6** | テスト資産管理・高度な機能: Graph RAG、ナレッジ管理             | 未着手         |
| **Phase 7** | エンタープライズ機能: SSO、MFA、API管理                         | 未着手         |

---

## プロジェクト構成（想定）

```
t-naviex/
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── Dockerfile
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 認証関連ページ
│   │   ├── (dashboard)/        # ダッシュボード
│   │   ├── projects/           # プロジェクト管理
│   │   ├── test-specs/         # テスト仕様書
│   │   ├── test-runs/          # テストラン
│   │   ├── bugs/               # バグ管理
│   │   ├── reports/            # レポート
│   │   ├── settings/           # 設定
│   │   └── api/                # API Routes
│   ├── components/             # 共通コンポーネント
│   │   ├── ui/                 # shadcn/ui
│   │   ├── layout/             # レイアウト
│   │   ├── forms/              # フォーム
│   │   └── charts/             # グラフ
│   ├── lib/                    # ユーティリティ
│   │   ├── db.ts               # Prisma クライアント
│   │   ├── auth.ts             # 認証設定
│   │   ├── claude.ts           # Claude API
│   │   └── utils.ts
│   ├── hooks/                  # カスタムフック
│   ├── types/                  # 型定義
│   └── styles/                 # スタイル
├── tests/
│   ├── unit/                   # 単体テスト
│   ├── integration/            # 結合テスト
│   └── e2e/                    # E2Eテスト
├── docs/                       # 設計ドキュメント
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 開発コマンド（予定）

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番起動
npm start

# テスト実行
npm test                    # 単体テスト（watch mode）
npm run test:run            # 単体テスト（1回実行）
npm run test:integration    # 結合テスト
npm run test:e2e            # E2Eテスト

# Lint・型チェック・フォーマット
npm run lint                # ESLint実行
npm run lint:fix            # ESLint自動修正
npm run typecheck           # TypeScript型チェック
npm run format              # Prettierフォーマット
npm run format:check        # Prettierフォーマットチェック

# Prisma
npx prisma migrate dev      # マイグレーション作成・適用
npx prisma generate         # クライアント生成
npx prisma studio           # DB GUI

# Docker
docker-compose up -d        # 起動
docker-compose down         # 停止
```

---

## 環境変数（予定）

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/t_naviex"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Claude API
CLAUDE_API_KEY="your-claude-api-key"

# External Integrations (optional)
REDMINE_URL=""
REDMINE_API_KEY=""
BACKLOG_SPACE=""
BACKLOG_API_KEY=""

# SMTP (optional)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

---

## 設計方針

### アーキテクチャ

- **フロントエンド**: Next.js App Routerを使用したSSR/CSRハイブリッド
- **バックエンド**: Next.js API RoutesまたはtRPCによるAPI実装
- **認証**: NextAuth.jsによるセッションベース認証、将来的にSSO対応
- **データベース**: PostgreSQLによるリレーショナルデータ管理
- **AI**: Claude APIによるテストケース生成・レビュー支援

### セキュリティ

- RBAC（ロールベースアクセス制御）
- HTTPS通信必須
- SQLインジェクション、XSS、CSRF対策
- 監査ログ記録

### スケーラビリティ

- 10万件以上のテストケースに対応
- 同時接続10ユーザー以上
- API応答時間3秒以内

---

## 参考資料

- [USDM（Universal Specification Describing Manner）](https://www.usdm.jp/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Anthropic Claude API](https://docs.anthropic.com/)

---

## ライセンス

（未定）

---

## GitHub Issues

プロジェクトの実装タスクはGitHub Issuesで管理されています。

**リポジトリ**: https://github.com/hidekitsukuieXm/t-naviex

### ラベル体系

| カテゴリ | ラベル                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| フェーズ | `phase:1` ~ `phase:7`                                                                                                                   |
| 領域     | `area:frontend`, `area:backend`, `area:database`, `area:ai`, `area:integration`, `area:infrastructure`, `area:security`, `area:testing` |
| 優先度   | `priority:high`, `priority:medium`, `priority:low`                                                                                      |

### マイルストーン

| マイルストーン                          | Issue数          |
| --------------------------------------- | ---------------- |
| Phase 1: 基盤・コア機能（MVP）          | 50件 (#1-#50)    |
| Phase 2: テスト実施・結果管理           | 23件 (#51-#73)   |
| Phase 3: バグ・課題管理・外部連携       | 15件 (#74-#88)   |
| Phase 4: ダッシュボード・レポート・分析 | 19件 (#89-#107)  |
| Phase 5: AI機能統合                     | 14件 (#108-#121) |
| Phase 6: テスト資産管理・高度な機能     | 26件 (#122-#147) |
| Phase 7: エンタープライズ機能           | 32件 (#148-#179) |
| **合計**                                | **179件**        |

### Issue一覧の確認

```bash
# 全Issue一覧
gh issue list --repo hidekitsukuieXm/t-naviex --limit 200

# Phase別一覧
gh issue list --repo hidekitsukuieXm/t-naviex --label "phase:1"

# 優先度別一覧
gh issue list --repo hidekitsukuieXm/t-naviex --label "priority:high"
```

---

## 作成履歴

| 日付       | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-15 | プロジェクト初期設計完了。USDM要求仕様書を基に、ER図、GUI仕様書、API仕様書、テスト仕様書、実装計画を作成。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-15 | GitHubリポジトリ作成、ラベル・マイルストーン設定、GitHub Issues 179件作成完了。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-15 | **Issue #1 完了**: Next.js 16 プロジェクト初期化（App Router）。TypeScript、ESLint、Tailwind CSS、Vitest設定。PR #180 マージ完了。                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-22 | **Issue #2 完了**: TypeScript・ESLint・Prettier設定。strict mode強化、Prettier統合、VS Code設定、Husky + lint-staged設定。PR #181 マージ完了。                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-22 | **Issue #3 完了**: Tailwind CSS + shadcn/ui セットアップ。基本UIコンポーネント導入、カラーテーマ設定、ダークモード対応準備。PR #182 マージ完了。                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-22 | **Issue #4 完了**: Docker / Docker Compose 環境構築。マルチステージビルドDockerfile、本番用/開発用docker-compose.yml、PostgreSQLコンテナ設定、ボリューム永続化、環境変数管理。                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-22 | **PR #183 レビュー完了**: Docker環境構築PRのコードレビュー実施。マルチステージビルド、ヘルスチェック、セキュリティ設定を確認しLGTM。                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-22 | **PR #183 マージ完了**: Docker / Docker Compose環境構築PRをmasterにマージ。Issue #4自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-23 | **Issue #5 完了**: Prisma ORM セットアップ・初期スキーマ作成。Prisma 7.x + PostgreSQLアダプター設定、初期スキーマ（Users, Groups, UserGroups, Roles, Projects, ProjectMembers, AuditLogs）、マイグレーション作成、シードデータ作成。                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-23 | **PR #184 レビュー完了**: Prisma ORMセットアップPRのコードレビュー実施。スキーマ設計、リレーション設定、インデックス設計、シングルトンパターン、シードスクリプトの冪等性を確認しLGTM。                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-23 | **PR #184 マージ完了**: Prisma ORMセットアップPRをmasterにマージ。Issue #5自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-23 | **Issue #6 完了**: GitHub Actions CI/CDパイプライン構築。Lint、TypeCheck、単体テスト、Buildチェック、Dockerイメージビルドジョブを設定。PR作成時に自動チェック実行。                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-05-23 | **PR #185 レビュー完了**: GitHub Actions CI/CDパイプラインPRのコードレビュー実施。ジョブ構成、並列/順次実行、キャッシュ設定、セキュリティ考慮を確認しLGTM。                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-23 | **PR #185 マージ完了**: GitHub Actions CI/CDパイプラインPRをmasterにマージ。Issue #6自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-23 | **Issue #7 完了**: 共通レイアウト実装（ヘッダー・サイドナビ・フッター）。Sheet UIコンポーネント、SidebarProviderコンテキスト、ヘッダー（ロゴ・検索・通知・ユーザーメニュー）、サイドバー（プロジェクト切替・ナビ・折りたたみ）、フッター、レスポンシブ対応。PR #186 作成。                                                                                                                                                                                                                                                                                                                              |
| 2026-05-23 | **PR #186 レビュー完了**: 共通レイアウト実装PRのコードレビュー実施。コンポーネント設計、状態管理（Cookie永続化）、レスポンシブ対応、アクセシビリティ、TypeScript型安全性を確認しLGTM。                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-23 | **PR #186 マージ完了**: 共通レイアウト実装PRをmasterにマージ。Issue #7自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-23 | **Issue #8 完了**: NextAuth.js認証機能実装。NextAuth.js v5 (beta) + Credentials Provider、JWTセッション戦略、Prismaスキーマ拡張（Account, Session, VerificationToken）、ログインページ、認証ミドルウェア、セッション対応ヘッダー。PR #187 作成。                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-23 | **PR #187 レビュー完了**: NextAuth.js認証PRのコードレビュー実施。Prismaスキーマ設計、認証設定、Credentialsプロバイダー、JWTセッション、ルート保護、型拡張、セキュリティ考慮を確認しLGTM。                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-23 | **PR #187 マージ完了**: NextAuth.js認証PRをmasterにマージ。Issue #8自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-23 | **Issue #9 完了**: パスワードリセット機能実装。forgot-passwordページ、reset-passwordページ、リセットトークンAPI、PasswordResetTokenモデル追加。トークン有効期限1時間、セキュリティ対策実装。PR #188 作成。                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-23 | **PR #188 レビュー完了**: パスワードリセット機能PRのコードレビュー実施。セキュリティ対策（トークン生成、有効期限、列挙攻撃対策）、Prismaスキーマ、フロントエンドUX、認証ミドルウェア更新を確認しLGTM。                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-23 | **PR #188 マージ完了**: パスワードリセット機能PRをmasterにマージ。Issue #9自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-23 | **Issue #10 実装完了**: プロジェクト作成・編集画面実装。プロジェクトCRUD API、プロジェクト一覧ページ、プロジェクト作成ダイアログ、プロジェクト編集ページ、プロジェクトステータス管理（進行中、休止中、アーカイブ、計画中）、型定義、Textarea UIコンポーネント。PR #189 作成。                                                                                                                                                                                                                                                                                                                           |
| 2026-05-23 | **PR #189 レビュー完了**: プロジェクトCRUD機能PRのコードレビュー実施。API設計（RESTful、認証、BigIntシリアライズ）、型定義、フロントエンドコンポーネント（再利用可能なフォーム、キャッシュ機構、状態管理）、UI/UX（ステータスバッジ、ダークモード対応）、セキュリティを確認しLGTM。                                                                                                                                                                                                                                                                                                                     |
| 2026-05-23 | **PR #189 マージ完了**: プロジェクトCRUD機能PRをmasterにマージ。Issue #10自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-23 | **Issue #11 実装完了**: プロジェクトメンバー管理機能実装。メンバー一覧表示API（GET /api/projects/[id]/members）、メンバー追加API（POST）、ロール変更API（PUT /api/projects/[id]/members/[userId]）、メンバー削除API（DELETE）、ユーザー検索API（GET /api/users/search）、ロール一覧API（GET /api/roles）、型定義追加、単体テスト作成。                                                                                                                                                                                                                                                                  |
| 2026-05-23 | **PR #190 レビュー完了**: プロジェクトメンバー管理機能PRのコードレビュー実施。API設計（RESTful、認証、BigIntシリアライズ）、セキュリティ（認証チェック、入力検証、重複防止）、データ整合性、コード品質、テストカバレッジ（24件）、ユーザー検索API、ロールAPIを確認しLGTM。                                                                                                                                                                                                                                                                                                                              |
| 2026-05-23 | **PR #190 マージ完了**: プロジェクトメンバー管理機能PRをmasterにマージ。Issue #11自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-23 | **Issue #12 実装完了**: プロジェクトコピー機能実装。プロジェクトコピーAPI（POST /api/projects/[id]/copy）、コピーオプション（メンバーコピー、説明コピー、新ステータス指定）、トランザクション処理、型定義追加（ProjectCopyOptions, ProjectCopyResult）、単体テスト作成（10件）。PR #191 作成。                                                                                                                                                                                                                                                                                                          |
| 2026-05-23 | **PR #191 レビュー完了**: プロジェクトコピー機能PRのコードレビュー実施。API設計（RESTful、認証、BigIntシリアライズ）、セキュリティ（認証チェック、入力検証）、データ整合性（トランザクション処理）、コード品質、テストカバレッジ（10件）を確認しLGTM。                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-23 | **PR #191 マージ完了**: プロジェクトコピー機能PRをmasterにマージ。Issue #12自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-23 | **Issue #13 実装完了**: プロジェクト選択・切り替え機能実装。ProjectContextによるグローバル状態管理、ProjectSelectorコンポーネント、最近アクセスしたプロジェクト表示（localStorage永続化）、URLパラメータ連動（?projectId=...）、サイドバー・モバイルサイドバー更新、Command/Popover UIコンポーネント追加、単体テスト作成（12件）。PR #192 作成。                                                                                                                                                                                                                                                        |
| 2026-05-23 | **PR #192 レビュー完了**: プロジェクト選択・切り替え機能PRのコードレビュー実施。アーキテクチャ設計（Context/useMemo/useCallback）、データ永続化（localStorage/URL同期）、UIコンポーネント（Command/Popover）、コード品質、テストカバレッジ（12件）を確認しLGTM。                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-23 | **PR #192 マージ完了**: プロジェクト選択・切り替え機能PRをmasterにマージ。Issue #13自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-23 | **Issue #14 実装完了**: ユーザー管理CRUD機能実装。ユーザー型定義（UserStatus, User, UserDetail）、パスワードバリデーション（8文字以上、大文字・小文字・数字必須）、bcryptパスワードハッシュ化（12ラウンド）、ユーザーリポジトリ、ユーザーCRUD API（GET/POST /api/users、GET/PUT/DELETE /api/users/[id]、PUT /api/users/[id]/password）、単体テスト（61件新規追加、合計107件）。PR #193 作成。                                                                                                                                                                                                           |
| 2026-05-23 | **PR #193 レビュー完了**: ユーザー管理CRUD機能PRのコードレビュー実施。セキュリティ設計（bcrypt 12ラウンド、パスワード複雑性要件、自己削除防止）、API設計（RESTful、認証必須、BigIntシリアライズ）、リポジトリパターン（関心の分離、型安全性）、バリデーション（メール形式、重複チェック）、テストカバレッジ（61件）を確認しLGTM。                                                                                                                                                                                                                                                                       |
| 2026-05-23 | **PR #193 マージ完了**: ユーザー管理CRUD機能PRをmasterにマージ。Issue #14自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-23 | **Issue #15 実装完了**: ロール・権限テーブル実装。Prismaスキーマ拡張（displayName, description, isSystemRole）、包括的ロールタイプ定義（src/types/role.ts）、ロールリポジトリ（CRUD操作、権限チェック）、ロールAPI（GET/POST /api/roles、GET/PUT/DELETE /api/roles/[id]）、4つのデフォルトシステムロール（システム管理者、プロジェクト管理者、メンバー、ゲスト）、システムロール保護機能（削除・名前変更不可）、単体テスト67件追加（合計171件）。PR #194 作成。                                                                                                                                         |
| 2026-05-23 | **PR #194 レビュー完了**: ロール・権限テーブル実装PRのコードレビュー実施。Prismaスキーマ設計（displayName/isSystemRole/JsonB）、型定義設計（PermissionAction/ResourceType/ヘルパー関数）、リポジトリパターン（BigIntシリアライズ/システムロール保護）、API設計（RESTful/認証/バリデーション）、権限マトリックス（4段階階層）、テストカバレッジ（67件）を確認しLGTM。                                                                                                                                                                                                                                    |
| 2026-05-23 | **PR #194 マージ完了**: ロール・権限テーブル実装PRをmasterにマージ。Issue #15自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-23 | **Issue #16 実装完了**: RBACミドルウェア実装。エラークラス（UnauthorizedError/ForbiddenError/PermissionDeniedError）、権限チェックミドルウェア（withPermission/requirePermission/checkPermission）、ReactのPermissionGateコンポーネント、ヘルパー関数（canPerform/canPerformAll/canPerformAny）、プロジェクト・システムレベル両対応、単体テスト50件追加（合計221件）。PR #195 作成。                                                                                                                                                                                                                    |
| 2026-05-23 | **PR #195 レビュー完了**: RBACミドルウェア実装PRのコードレビュー実施。エラークラス設計（3種類/日本語メッセージ）、ミドルウェア設計（HOF/例外/結果ベース3種API）、Reactコンポーネント（PermissionGate/ヘルパー関数）、HTTPステータスコード（400/401/403/500）、テストカバレッジ（50件）を確認しLGTM。                                                                                                                                                                                                                                                                                                    |
| 2026-05-23 | **PR #195 マージ完了**: RBACミドルウェア実装PRをmasterにマージ。Issue #16自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-23 | **Issue #17 実装完了**: ユーザー管理画面実装。ユーザー一覧ページ（/settings/users）、ユーザー追加ダイアログ、ユーザー編集ダイアログ、ユーザー削除確認ダイアログ、ステータス変更セレクト、ステータスバッジ、検索・フィルタリング機能、ページネーション、パスワードバリデーション（8文字以上、大文字・小文字・数字必須）、単体テスト38件追加（合計259件）。PR #196 作成。                                                                                                                                                                                                                                 |
| 2026-05-23 | **PR #196 レビュー完了**: ユーザー管理画面実装PRのコードレビュー実施。コンポーネント設計（再利用可能なフォーム、ダイアログ）、状態管理（useState/useCallback/useTransition）、UX設計（デバウンス検索、ステータスバッジ配色、エラーハンドリング）、テストカバレッジ（38件）を確認しLGTM。                                                                                                                                                                                                                                                                                                                |
| 2026-05-23 | **PR #196 マージ完了**: ユーザー管理画面実装PRをmasterにマージ。Issue #17自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-23 | **Issue #18 実装完了**: ロール・権限管理画面実装。ロール一覧ページ（/settings/roles）、ロール作成・編集・削除ダイアログ、権限マトリクスコンポーネント（リソース×アクション視覚的編集/行・列全選択）、ロールバッジ（システム/カスタム区別）、ユーザーロール割り当てダイアログ、Checkbox UIコンポーネント、ロールメンバーAPI（GET /api/roles/[id]/members）、単体テスト43件追加（合計302件）。PR #197 作成。                                                                                                                                                                                              |
| 2026-05-23 | **PR #197 レビュー完了**: ロール・権限管理画面実装PRのコードレビュー実施。コンポーネント設計（再利用可能なPermissionMatrix/RoleForm/RoleBadge）、権限マトリクス（行/列全選択機能）、展開可能なロール詳細、キャッシュ機構、API設計（RESTful/認証/BigIntシリアライズ）、セキュリティ（システムロール保護）、テストカバレッジ（43件）を確認しLGTM。                                                                                                                                                                                                                                                        |
| 2026-05-23 | **PR #197 マージ完了**: ロール・権限管理画面実装PRをmasterにマージ。Issue #18自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-23 | **Issue #19 実装完了**: パスワードポリシー設定機能実装。パスワードポリシー設定画面（/settings/password-policy）、最小・最大文字数設定、文字種要件設定（大文字・小文字・数字・特殊文字）、パスワード有効期間設定、過去パスワード再利用禁止設定、アカウントロック設定（最大試行回数・ロック期間）、PasswordPolicy/AccountLockout/PasswordHistoryモデル追加、パスワードポリシーリポジトリ、パスワードポリシーAPI（GET/PUT /api/password-policy）、アカウントロックAPI（GET/DELETE /api/account-lockout/[userId]）、バリデーション関数、単体テスト37件追加（合計339件）。PR #198 作成。                     |
| 2026-05-23 | **PR #198 レビュー完了**: パスワードポリシー設定機能PRのコードレビュー実施。Prismaスキーマ設計（3モデル追加）、型定義とバリデーション（validatePasswordWithPolicy/validatePasswordPolicySettings）、リポジトリパターン（シングルトンポリシー/ロック管理/履歴管理）、API設計（RESTful/認証/バリデーション）、フォームコンポーネント（カード分類/Switch/Input）、テストカバレッジ（37件）を確認しLGTM。                                                                                                                                                                                                   |
| 2026-05-23 | **PR #198 マージ完了**: パスワードポリシー設定機能PRをmasterにマージ。Issue #19自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-05-23 | **Issue #20 実装完了**: セッション管理設定機能実装。セッション設定画面（/settings/session）、セッションタイムアウト設定（1〜480分）、タイムアウト警告表示設定（1〜30分前）、アクティビティによる自動延長機能、同時セッション数上限設定（0〜10）、自動ログアウト機能、SessionSettingsモデル追加、SessionTimeoutProviderコンテキスト、SessionTimeoutWarningDialogコンポーネント、セッション設定API（GET/PUT /api/session-settings）、バリデーション関数、単体テスト25件追加（合計364件）。PR #199 作成。                                                                                                  |
| 2026-05-23 | **PR #199 レビュー完了**: セッション管理設定機能PRのコードレビュー実施。シングルトンパターン、React Contextによるセッション状態管理、アクティビティ検出（mousedown/keydown/touchstart/scroll）、AlertDialogによるタイムアウト警告、バリデーション（範囲チェック/相関チェック）、テストカバレッジ（25件）を確認しLGTM。                                                                                                                                                                                                                                                                                  |
| 2026-05-23 | **PR #199 マージ完了**: セッション管理設定機能PRをmasterにマージ。Issue #20自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-24 | **Issue #21 実装完了**: 監査ログテーブル・基本ログ記録機能実装。監査ログ型定義（AuditAction/AuditTargetType/AuditLog）、監査ログリポジトリ（CRUD操作、フィルタリング、エクスポート）、監査ログサービス（ヘルパー関数群）、監査ログAPI（GET /api/audit-logs、CSVエクスポート）、監査ログ一覧画面（/settings/audit-logs）、既存APIへの監査ログ統合（ユーザー/ロール/パスワードポリシー/セッション設定）、システム管理者のみアクセス可能、単体テスト22件追加（合計386件）。PR #200 作成。                                                                                                                  |
| 2026-05-24 | **PR #200 レビュー完了**: 監査ログテーブル・基本ログ記録機能PRのコードレビュー実施。リポジトリパターン、サービス層分離、型安全性、セキュリティ（requireSystemAdmin）、エラーハンドリング（メイン処理への影響防止）、IPアドレス記録（X-Forwarded-For対応）、フィルタリング機能、CSVエクスポート（BOM付きUTF-8）、ページネーション、テストカバレッジ（22件）を確認しLGTM。                                                                                                                                                                                                                                |
| 2026-05-24 | **PR #200 マージ完了**: 監査ログテーブル・基本ログ記録機能PRをmasterにマージ。Issue #21自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-05-24 | **Issue #22 実装完了**: プロジェクトテーブル（PROJECTS）実装。プロジェクトリポジトリパターン（project-repository.ts）、プロジェクトCRUD APIリファクタリング（リポジトリ経由に変更）、プロジェクト監査ログ追加（作成/更新/削除）、プロジェクトメンバー監査ログ追加（追加/更新/削除）、プロジェクト型定義拡張（CreateProjectInput/UpdateProjectInput/ProjectSearchParams/ProjectListResponse）、バリデーション関数追加（validateProjectName/validateProject）、プロジェクト名重複チェック、ページネーション対応、単体テスト21件追加（合計407件）。PR #201 作成。                                          |
| 2026-05-24 | **PR #201 レビュー完了**: プロジェクトテーブル実装PRのコードレビュー実施。リポジトリパターン適用、型安全性、監査ログ統合、後方互換性（ページネーションオプション）、テストカバレッジ（21件）を確認しLGTM。                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-24 | **PR #201 マージ完了**: プロジェクトテーブル実装PRをmasterにマージ。Issue #22自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | **Issue #23 実装完了**: プロジェクト一覧画面実装。ProjectCardコンポーネント（カード形式表示、ステータスバッジ、メンバー数、アクションボタン）、表示モード切替機能（カード/テーブル）、ステータスフィルタリング（ACTIVE/INACTIVE/ARCHIVED/PLANNING）、デバウンス検索（300ms）、ソート機能（名前/作成日/更新日/ステータス）、ページネーション、クライアントサイドキャッシュ（60秒TTL）、単体テスト22件追加（合計450件）。PR #202 作成。                                                                                                                                                                   |
| 2026-05-24 | **PR #202 レビュー完了**: プロジェクト一覧画面実装PRのコードレビュー実施。コンポーネント設計（ProjectCard再利用性）、状態管理（useCallback/useTransition）、UX設計（カード/テーブル切替、デバウンス検索、ステータスバッジ配色）、パフォーマンス最適化（クライアントサイドキャッシュ）、テストカバレッジ（22件）を確認しLGTM。                                                                                                                                                                                                                                                                           |
| 2026-05-24 | **PR #202 マージ完了**: プロジェクト一覧画面実装PRをmasterにマージ。Issue #23自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | **Issue #24 実装完了**: テスト仕様書テーブル（TEST_SPECS）実装。TestSpec/TestSpecVersionモデル追加（Prismaスキーマ）、テスト仕様書型定義（TestSpecStatus/バリデーション関数/バージョン比較・インクリメント関数）、テスト仕様書リポジトリ（CRUD操作、バージョン管理）、テスト仕様書API（GET/POST /api/test-specs、GET/PUT/DELETE /api/test-specs/[id]、GET/POST /api/test-specs/[id]/versions）、監査ログ追加（TEST_SPEC_CREATE/UPDATE/DELETE/VERSION_CREATE/LOCK/UNLOCK）、単体テスト82件追加（合計532件）。PR #203 作成。                                                                              |
| 2026-05-24 | **PR #203 レビュー完了**: テスト仕様書テーブル実装PRのコードレビュー実施。Prismaスキーマ設計（リレーション、カスケード削除、インデックス）、バージョン管理ロジック（セマンティックバージョニング）、バリデーション（名前長、バージョン形式）、セキュリティ（認証、ロック機能）、監査ログ統合、テストカバレッジ（82件）を確認しLGTM。                                                                                                                                                                                                                                                                    |
| 2026-05-24 | **PR #203 マージ完了**: テスト仕様書テーブル実装PRをmasterにマージ。Issue #24自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | **Issue #25 実装完了**: テストセクションテーブル（TEST_SECTIONS）実装。TestSectionモデル追加（Prismaスキーマ、自己参照リレーション）、テストセクション型定義（バリデーション関数/ツリーヘルパー関数/循環参照検出）、テストセクションリポジトリ（CRUD操作、移動、並び替え）、テストセクションAPI（GET/POST /api/test-specs/[id]/sections、GET/PUT/DELETE /api/test-specs/[id]/sections/[sectionId]、PUT /move、PUT /reorder）、監査ログ追加（TEST_SECTION_CREATE/UPDATE/DELETE/MOVE/REORDER）、単体テスト108件追加（合計640件）。PR #204 作成。                                                          |
| 2026-05-24 | **PR #204 レビュー完了**: テストセクションテーブル実装PRのコードレビュー実施。階層構造設計（自己参照リレーション）、ツリー操作ロジック（build/flatten/descendants/ancestors）、循環参照防止、並び順管理、同一階層内名前重複チェック、監査ログ統合、テストカバレッジ（108件）を確認しLGTM。                                                                                                                                                                                                                                                                                                              |
| 2026-05-24 | **PR #204 マージ完了**: テストセクションテーブル実装PRをmasterにマージ。Issue #25自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-24 | **Issue #26 実装完了**: テストケーステーブル（TEST_CASES）実装。TestCaseモデル追加（Prismaスキーマ、優先度・テストタイプ・テスト技法Enum）、テストケース型定義（TestCasePriority/TestType/TestTechnique/バリデーション関数）、テストケースリポジトリ（CRUD操作、ページネーション、フィルタリング、検索）、テストケースAPI（GET/POST /api/test-specs/[id]/cases、GET/PATCH/DELETE /api/test-specs/[id]/cases/[caseId]）、監査ログ追加（TEST_CASE_CREATE/UPDATE/DELETE）、単体テスト85件追加（合計725件）。PR #205 作成。                                                                                 |
| 2026-05-24 | **PR #205 レビュー完了**: テストケーステーブル実装PRのコードレビュー実施。データモデル設計（Enum型による型安全性、インデックス設定）、API設計（RESTful、ページネーション、フィルタリング）、バリデーション（タイトル、説明、事前条件、優先度、テストタイプ、テスト技法）、監査ログ統合、テストカバレッジ（85件）を確認しLGTM。                                                                                                                                                                                                                                                                          |
| 2026-05-24 | **PR #205 マージ完了**: テストケーステーブル実装PRをmasterにマージ。Issue #26自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | **Issue #27 実装完了**: テスト手順テーブル（TEST_STEPS）実装。TestStepモデル追加（Prismaスキーマ、ユニーク制約(testCaseId, stepNo)）、テスト手順型定義（バリデーション関数/ヘルパー関数）、テスト手順リポジトリ（CRUD操作、一括作成、並び替え、自動番号調整）、テスト手順API（GET/POST /api/test-specs/[id]/cases/[caseId]/steps、GET/PATCH/DELETE /api/test-specs/[id]/cases/[caseId]/steps/[stepId]、PUT /reorder）、監査ログ追加（TEST_STEP_CREATE/UPDATE/DELETE/REORDER）、Markdown対応、手順数上限100件、単体テスト99件追加（合計824件）。PR #206 作成。                                           |
| 2026-05-24 | **PR #206 レビュー完了**: テスト手順テーブル実装PRのコードレビュー実施。データモデル設計（ユニーク制約、インデックス設定）、API設計（RESTful、一括作成、並び替え）、バリデーション（操作手順、期待結果、手順番号）、トランザクション処理（並び替え、削除後の自動番号調整）、監査ログ統合、テストカバレッジ（99件）を確認しLGTM。                                                                                                                                                                                                                                                                        |
| 2026-05-24 | **PR #206 マージ完了**: テスト手順テーブル実装PRをmasterにマージ。Issue #27自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-24 | **Issue #28 実装完了**: テスト仕様書一覧画面実装。テスト仕様書一覧ページ（/projects/:id/test-specs）、TestSpecStatusBadgeコンポーネント（DRAFT/REVIEW/APPROVED/ARCHIVED）、TestSpecCardコンポーネント（カード形式表示、ステータス、バージョン、ロックインジケーター）、TestSpecFormコンポーネント（作成・編集フォーム）、TestSpecCreateDialogコンポーネント（新規作成ダイアログ）、表示モード切替（カード/テーブル）、ステータスフィルタリング、検索機能、ソート機能（名前/日付/ステータス/バージョン）、ページネーション、単体テスト46件追加（合計893件）。PR #207 作成。                              |
| 2026-05-24 | **PR #207 レビュー完了**: テスト仕様書一覧画面実装PRのコードレビュー実施。コンポーネント設計（TestSpecStatusBadge/TestSpecCard/TestSpecForm/TestSpecCreateDialog）、パターン一貫性（ProjectsPage準拠）、UX設計（カード/テーブル切替、ステータスバッジ配色、ロック表示）、パフォーマンス最適化（クライアントサイドキャッシュ）、テストカバレッジ（46件）を確認しLGTM。                                                                                                                                                                                                                                   |
| 2026-05-24 | **PR #207 マージ完了**: テスト仕様書一覧画面実装PRをmasterにマージ。Issue #28自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | **Issue #29 実装完了**: テスト仕様書詳細画面（ツリー+一覧構成）実装。テスト仕様書詳細ページ（/projects/:id/test-specs/:specId）、TestSpecHeaderコンポーネント（仕様書情報表示、バージョン、ステータス、日付）、SectionTreeコンポーネント（階層構造表示、展開/折りたたみ、全選択オプション）、TestCaseListコンポーネント（テストケース一覧、フィルタリング、ソート、ページネーション）、TestCasePriorityBadgeコンポーネント（CRITICAL/HIGH/MEDIUM/LOW）、2ペイン構成（左: セクションツリー、右: テストケース一覧）、単体テスト67件追加（合計960件）。PR #208 作成。                                      |
| 2026-05-24 | **PR #208 レビュー完了**: テスト仕様書詳細画面実装PRのコードレビュー実施。コンポーネント設計（TestSpecHeader/SectionTree/TestCaseList）、2ペインレイアウト、アクセシビリティ（tree role、aria-expanded、キーボードナビゲーション）、UX設計（展開/折りたたみ、全選択、セクション連動フィルタ）、テストカバレッジ（67件）を確認しLGTM。                                                                                                                                                                                                                                                                   |
| 2026-05-24 | **PR #208 マージ完了**: テスト仕様書詳細画面実装PRをmasterにマージ。Issue #29自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | **Issue #30 実装完了**: セクションツリー表示（階層化）実装。汎用TreeView UIコンポーネント（shadcn/uiパターン準拠）、TreeView/TreeItem/TreeViewToolbar/TreeViewLabel/TreeViewActions/TreeViewAction、制御/非制御モード対応（selectedIds/expandedIds）、キーボードナビゲーション（Enter/Space/ArrowRight/ArrowLeft）、ARIAアクセシビリティ（tree/treeitem/aria-selected/aria-expanded/aria-disabled/aria-multiselectable）、ユーティリティ関数（collectAllIds/findNodeById/getAncestorIds）、SectionTreeコンポーネントをTreeViewベースにリファクタリング、単体テスト33件追加（合計966件）。PR #209 作成。 |
| 2026-05-24 | **PR #209 レビュー完了**: セクションツリー表示（階層化）PRのコードレビュー実施。コンポーネント設計（汎用UIとドメインコンポーネントの分離）、TypeScript（ジェネリックTreeNode型）、Context API状態管理、制御/非制御パターン、アクセシビリティ、テストカバレッジ（33件）を確認しLGTM。                                                                                                                                                                                                                                                                                                                    |
| 2026-05-24 | **PR #209 マージ完了**: セクションツリー表示（階層化）PRをmasterにマージ。Issue #30自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-24 | **Issue #31 実装完了**: セクションドラッグ＆ドロップ移動実装。dnd-kit-sortable-tree/\@dnd-kit/core/\@dnd-kit/sortable/\@dnd-kit/utilitiesパッケージ導入、SortableSectionTreeコンポーネント（D&D対応セクションツリー）、convertToTreeItems/convertToSections変換関数、findChanges変更検出関数、楽観的UIアップデート+API同期、disabledプロパティでロック時D&D無効化、アクセシビリティ対応（tree role/treeitem/aria-selected/キーボード操作）、単体テスト17件追加（合計983件）。PR #210 作成。                                                                                                             |
| 2026-05-24 | **PR #210 レビュー完了**: セクションドラッグ＆ドロップ移動PRのコードレビュー実施。dnd-kit-sortable-treeライブラリ選択、楽観的UIアップデート、型安全性（TreeItems型）、変更検出ロジック、テストカバレッジ（17件）、アクセシビリティを確認しLGTM。                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-24 | **PR #210 マージ完了**: セクションドラッグ＆ドロップ移動PRをmasterにマージ。Issue #31自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-05-24 | **Issue #32 実装完了**: コンテキストメニュー実装。Base UI ContextMenuベースの汎用コンテキストメニューUIコンポーネント（context-menu.tsx）、SectionContextMenuコンポーネント（コピー/ペースト/削除/移動/リネーム/新規作成）、キーボードショートカットフック（useSectionKeyboardShortcuts：Ctrl+C/X/V、Delete、F2、Ctrl+N、Insert対応）、RenameDialog/DeleteDialogコンポーネント、SortableSectionTreeへの統合、toast通知、単体テスト58件追加（合計1041件）。PR #211 作成。                                                                                                                                |
| 2026-05-24 | **PR #211 レビュー完了**: コンテキストメニュー実装PRのコードレビュー実施。コンポーネント設計（Base UIプリミティブ活用、dropdown-menuとの一貫性）、キーボードショートカット（入力フィールドでの無効化、Mac対応）、UX設計（削除確認ダイアログ、toast通知）、テストカバレッジ（58件）を確認しLGTM。                                                                                                                                                                                                                                                                                                        |
| 2026-05-24 | **PR #211 マージ完了**: コンテキストメニュー実装PRをmasterにマージ。Issue #32自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | **Issue #33 実装完了**: テストケース作成フォーム実装。TestCaseFormコンポーネント（タイトル/説明/事前条件/優先度/テストタイプ/テスト技法/セクション/マトリクスチェックボックス）、TestCaseCreateDialogコンポーネント（ダイアログ+API統合）、TestCaseListへの作成ボタン統合（ロック時は非表示）、フォームバリデーション（既存バリデーション関数活用）、階層セクションセレクト、単体テスト30件追加（合計1070件）。PR #212 作成。                                                                                                                                                                           |
| 2026-05-24 | **PR #212 レビュー完了**: テストケース作成フォーム実装PRのコードレビュー実施。コンポーネント設計（TestCaseForm/TestCaseCreateDialog分離）、既存パターン準拠（TestSpecForm/TestSpecCreateDialog）、フォームバリデーション、階層セクションセレクト（flattenSections）、テストカバレッジ（30件）を確認しLGTM。                                                                                                                                                                                                                                                                                             |
| 2026-05-24 | **PR #212 マージ完了**: テストケース作成フォーム実装PRをmasterにマージ。Issue #33自動クローズ。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

_本プロジェクトはUSDM要求仕様書（SRS-TM-USDM-2026-001）に基づき設計・開発されています。_
