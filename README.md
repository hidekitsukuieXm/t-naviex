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
| **Phase 1** | 基盤・コア機能（MVP）: プロジェクト基盤、認証、テストケースCRUD | 進行中 (10/50) |
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

| 日付       | 内容                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-15 | プロジェクト初期設計完了。USDM要求仕様書を基に、ER図、GUI仕様書、API仕様書、テスト仕様書、実装計画を作成。                                                                                                                                                                                                                                                                                    |
| 2026-05-15 | GitHubリポジトリ作成、ラベル・マイルストーン設定、GitHub Issues 179件作成完了。                                                                                                                                                                                                                                                                                                               |
| 2026-05-15 | **Issue #1 完了**: Next.js 16 プロジェクト初期化（App Router）。TypeScript、ESLint、Tailwind CSS、Vitest設定。PR #180 マージ完了。                                                                                                                                                                                                                                                            |
| 2026-05-22 | **Issue #2 完了**: TypeScript・ESLint・Prettier設定。strict mode強化、Prettier統合、VS Code設定、Husky + lint-staged設定。PR #181 マージ完了。                                                                                                                                                                                                                                                |
| 2026-05-22 | **Issue #3 完了**: Tailwind CSS + shadcn/ui セットアップ。基本UIコンポーネント導入、カラーテーマ設定、ダークモード対応準備。PR #182 マージ完了。                                                                                                                                                                                                                                              |
| 2026-05-22 | **Issue #4 完了**: Docker / Docker Compose 環境構築。マルチステージビルドDockerfile、本番用/開発用docker-compose.yml、PostgreSQLコンテナ設定、ボリューム永続化、環境変数管理。                                                                                                                                                                                                                |
| 2026-05-22 | **PR #183 レビュー完了**: Docker環境構築PRのコードレビュー実施。マルチステージビルド、ヘルスチェック、セキュリティ設定を確認しLGTM。                                                                                                                                                                                                                                                          |
| 2026-05-22 | **PR #183 マージ完了**: Docker / Docker Compose環境構築PRをmasterにマージ。Issue #4自動クローズ。                                                                                                                                                                                                                                                                                             |
| 2026-05-23 | **Issue #5 完了**: Prisma ORM セットアップ・初期スキーマ作成。Prisma 7.x + PostgreSQLアダプター設定、初期スキーマ（Users, Groups, UserGroups, Roles, Projects, ProjectMembers, AuditLogs）、マイグレーション作成、シードデータ作成。                                                                                                                                                          |
| 2026-05-23 | **PR #184 レビュー完了**: Prisma ORMセットアップPRのコードレビュー実施。スキーマ設計、リレーション設定、インデックス設計、シングルトンパターン、シードスクリプトの冪等性を確認しLGTM。                                                                                                                                                                                                        |
| 2026-05-23 | **PR #184 マージ完了**: Prisma ORMセットアップPRをmasterにマージ。Issue #5自動クローズ。                                                                                                                                                                                                                                                                                                      |
| 2026-05-23 | **Issue #6 完了**: GitHub Actions CI/CDパイプライン構築。Lint、TypeCheck、単体テスト、Buildチェック、Dockerイメージビルドジョブを設定。PR作成時に自動チェック実行。                                                                                                                                                                                                                           |
| 2026-05-23 | **PR #185 レビュー完了**: GitHub Actions CI/CDパイプラインPRのコードレビュー実施。ジョブ構成、並列/順次実行、キャッシュ設定、セキュリティ考慮を確認しLGTM。                                                                                                                                                                                                                                   |
| 2026-05-23 | **PR #185 マージ完了**: GitHub Actions CI/CDパイプラインPRをmasterにマージ。Issue #6自動クローズ。                                                                                                                                                                                                                                                                                            |
| 2026-05-23 | **Issue #7 完了**: 共通レイアウト実装（ヘッダー・サイドナビ・フッター）。Sheet UIコンポーネント、SidebarProviderコンテキスト、ヘッダー（ロゴ・検索・通知・ユーザーメニュー）、サイドバー（プロジェクト切替・ナビ・折りたたみ）、フッター、レスポンシブ対応。PR #186 作成。                                                                                                                    |
| 2026-05-23 | **PR #186 レビュー完了**: 共通レイアウト実装PRのコードレビュー実施。コンポーネント設計、状態管理（Cookie永続化）、レスポンシブ対応、アクセシビリティ、TypeScript型安全性を確認しLGTM。                                                                                                                                                                                                        |
| 2026-05-23 | **PR #186 マージ完了**: 共通レイアウト実装PRをmasterにマージ。Issue #7自動クローズ。                                                                                                                                                                                                                                                                                                          |
| 2026-05-23 | **Issue #8 完了**: NextAuth.js認証機能実装。NextAuth.js v5 (beta) + Credentials Provider、JWTセッション戦略、Prismaスキーマ拡張（Account, Session, VerificationToken）、ログインページ、認証ミドルウェア、セッション対応ヘッダー。PR #187 作成。                                                                                                                                              |
| 2026-05-23 | **PR #187 レビュー完了**: NextAuth.js認証PRのコードレビュー実施。Prismaスキーマ設計、認証設定、Credentialsプロバイダー、JWTセッション、ルート保護、型拡張、セキュリティ考慮を確認しLGTM。                                                                                                                                                                                                     |
| 2026-05-23 | **PR #187 マージ完了**: NextAuth.js認証PRをmasterにマージ。Issue #8自動クローズ。                                                                                                                                                                                                                                                                                                             |
| 2026-05-23 | **Issue #9 完了**: パスワードリセット機能実装。forgot-passwordページ、reset-passwordページ、リセットトークンAPI、PasswordResetTokenモデル追加。トークン有効期限1時間、セキュリティ対策実装。PR #188 作成。                                                                                                                                                                                    |
| 2026-05-23 | **PR #188 レビュー完了**: パスワードリセット機能PRのコードレビュー実施。セキュリティ対策（トークン生成、有効期限、列挙攻撃対策）、Prismaスキーマ、フロントエンドUX、認証ミドルウェア更新を確認しLGTM。                                                                                                                                                                                        |
| 2026-05-23 | **PR #188 マージ完了**: パスワードリセット機能PRをmasterにマージ。Issue #9自動クローズ。                                                                                                                                                                                                                                                                                                      |
| 2026-05-23 | **Issue #10 実装完了**: プロジェクト作成・編集画面実装。プロジェクトCRUD API、プロジェクト一覧ページ、プロジェクト作成ダイアログ、プロジェクト編集ページ、プロジェクトステータス管理（進行中、休止中、アーカイブ、計画中）、型定義、Textarea UIコンポーネント。PR #189 作成。                                                                                                                 |
| 2026-05-23 | **PR #189 レビュー完了**: プロジェクトCRUD機能PRのコードレビュー実施。API設計（RESTful、認証、BigIntシリアライズ）、型定義、フロントエンドコンポーネント（再利用可能なフォーム、キャッシュ機構、状態管理）、UI/UX（ステータスバッジ、ダークモード対応）、セキュリティを確認しLGTM。                                                                                                           |
| 2026-05-23 | **PR #189 マージ完了**: プロジェクトCRUD機能PRをmasterにマージ。Issue #10自動クローズ。                                                                                                                                                                                                                                                                                                       |
| 2026-05-23 | **Issue #11 実装完了**: プロジェクトメンバー管理機能実装。メンバー一覧表示API（GET /api/projects/[id]/members）、メンバー追加API（POST）、ロール変更API（PUT /api/projects/[id]/members/[userId]）、メンバー削除API（DELETE）、ユーザー検索API（GET /api/users/search）、ロール一覧API（GET /api/roles）、型定義追加、単体テスト作成。                                                        |
| 2026-05-23 | **PR #190 レビュー完了**: プロジェクトメンバー管理機能PRのコードレビュー実施。API設計（RESTful、認証、BigIntシリアライズ）、セキュリティ（認証チェック、入力検証、重複防止）、データ整合性、コード品質、テストカバレッジ（24件）、ユーザー検索API、ロールAPIを確認しLGTM。                                                                                                                    |
| 2026-05-23 | **PR #190 マージ完了**: プロジェクトメンバー管理機能PRをmasterにマージ。Issue #11自動クローズ。                                                                                                                                                                                                                                                                                               |
| 2026-05-23 | **Issue #12 実装完了**: プロジェクトコピー機能実装。プロジェクトコピーAPI（POST /api/projects/[id]/copy）、コピーオプション（メンバーコピー、説明コピー、新ステータス指定）、トランザクション処理、型定義追加（ProjectCopyOptions, ProjectCopyResult）、単体テスト作成（10件）。PR #191 作成。                                                                                                |
| 2026-05-23 | **PR #191 レビュー完了**: プロジェクトコピー機能PRのコードレビュー実施。API設計（RESTful、認証、BigIntシリアライズ）、セキュリティ（認証チェック、入力検証）、データ整合性（トランザクション処理）、コード品質、テストカバレッジ（10件）を確認しLGTM。                                                                                                                                        |
| 2026-05-23 | **PR #191 マージ完了**: プロジェクトコピー機能PRをmasterにマージ。Issue #12自動クローズ。                                                                                                                                                                                                                                                                                                     |
| 2026-05-23 | **Issue #13 実装完了**: プロジェクト選択・切り替え機能実装。ProjectContextによるグローバル状態管理、ProjectSelectorコンポーネント、最近アクセスしたプロジェクト表示（localStorage永続化）、URLパラメータ連動（?projectId=...）、サイドバー・モバイルサイドバー更新、Command/Popover UIコンポーネント追加、単体テスト作成（12件）。PR #192 作成。                                              |
| 2026-05-23 | **PR #192 レビュー完了**: プロジェクト選択・切り替え機能PRのコードレビュー実施。アーキテクチャ設計（Context/useMemo/useCallback）、データ永続化（localStorage/URL同期）、UIコンポーネント（Command/Popover）、コード品質、テストカバレッジ（12件）を確認しLGTM。                                                                                                                              |
| 2026-05-23 | **PR #192 マージ完了**: プロジェクト選択・切り替え機能PRをmasterにマージ。Issue #13自動クローズ。                                                                                                                                                                                                                                                                                             |
| 2026-05-23 | **Issue #14 実装完了**: ユーザー管理CRUD機能実装。ユーザー型定義（UserStatus, User, UserDetail）、パスワードバリデーション（8文字以上、大文字・小文字・数字必須）、bcryptパスワードハッシュ化（12ラウンド）、ユーザーリポジトリ、ユーザーCRUD API（GET/POST /api/users、GET/PUT/DELETE /api/users/[id]、PUT /api/users/[id]/password）、単体テスト（61件新規追加、合計107件）。PR #193 作成。 |
| 2026-05-23 | **PR #193 レビュー完了**: ユーザー管理CRUD機能PRのコードレビュー実施。セキュリティ設計（bcrypt 12ラウンド、パスワード複雑性要件、自己削除防止）、API設計（RESTful、認証必須、BigIntシリアライズ）、リポジトリパターン（関心の分離、型安全性）、バリデーション（メール形式、重複チェック）、テストカバレッジ（61件）を確認しLGTM。                                                             |

---

_本プロジェクトはUSDM要求仕様書（SRS-TM-USDM-2026-001）に基づき設計・開発されています。_
