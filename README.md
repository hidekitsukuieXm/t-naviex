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

| Phase       | 内容                                                            | 状態          |
| ----------- | --------------------------------------------------------------- | ------------- |
| **Phase 1** | 基盤・コア機能（MVP）: プロジェクト基盤、認証、テストケースCRUD | 進行中 (5/50) |
| **Phase 2** | テスト実施・結果管理: テストラン、結果登録、ガントチャート      | 未着手        |
| **Phase 3** | バグ・課題管理・外部連携: バグ管理、Redmine/Backlog連携         | 未着手        |
| **Phase 4** | ダッシュボード・レポート: 各種グラフ、PDF出力、品質分析         | 未着手        |
| **Phase 5** | AI機能統合: Claude API、テストケース自動生成、AIレビュー        | 未着手        |
| **Phase 6** | テスト資産管理・高度な機能: Graph RAG、ナレッジ管理             | 未着手        |
| **Phase 7** | エンタープライズ機能: SSO、MFA、API管理                         | 未着手        |

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

| 日付       | 内容                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-05-15 | プロジェクト初期設計完了。USDM要求仕様書を基に、ER図、GUI仕様書、API仕様書、テスト仕様書、実装計画を作成。                                                                                                                           |
| 2026-05-15 | GitHubリポジトリ作成、ラベル・マイルストーン設定、GitHub Issues 179件作成完了。                                                                                                                                                      |
| 2026-05-15 | **Issue #1 完了**: Next.js 16 プロジェクト初期化（App Router）。TypeScript、ESLint、Tailwind CSS、Vitest設定。PR #180 マージ完了。                                                                                                   |
| 2026-05-22 | **Issue #2 完了**: TypeScript・ESLint・Prettier設定。strict mode強化、Prettier統合、VS Code設定、Husky + lint-staged設定。PR #181 マージ完了。                                                                                       |
| 2026-05-22 | **Issue #3 完了**: Tailwind CSS + shadcn/ui セットアップ。基本UIコンポーネント導入、カラーテーマ設定、ダークモード対応準備。PR #182 マージ完了。                                                                                     |
| 2026-05-22 | **Issue #4 完了**: Docker / Docker Compose 環境構築。マルチステージビルドDockerfile、本番用/開発用docker-compose.yml、PostgreSQLコンテナ設定、ボリューム永続化、環境変数管理。                                                       |
| 2026-05-22 | **PR #183 レビュー完了**: Docker環境構築PRのコードレビュー実施。マルチステージビルド、ヘルスチェック、セキュリティ設定を確認しLGTM。                                                                                                 |
| 2026-05-22 | **PR #183 マージ完了**: Docker / Docker Compose環境構築PRをmasterにマージ。Issue #4自動クローズ。                                                                                                                                    |
| 2026-05-23 | **Issue #5 完了**: Prisma ORM セットアップ・初期スキーマ作成。Prisma 7.x + PostgreSQLアダプター設定、初期スキーマ（Users, Groups, UserGroups, Roles, Projects, ProjectMembers, AuditLogs）、マイグレーション作成、シードデータ作成。 |
| 2026-05-23 | **PR #184 レビュー完了**: Prisma ORMセットアップPRのコードレビュー実施。スキーマ設計、リレーション設定、インデックス設計、シングルトンパターン、シードスクリプトの冪等性を確認しLGTM。                                               |
| 2026-05-23 | **PR #184 マージ完了**: Prisma ORMセットアップPRをmasterにマージ。Issue #5自動クローズ。                                                                                                                                             |

---

_本プロジェクトはUSDM要求仕様書（SRS-TM-USDM-2026-001）に基づき設計・開発されています。_
