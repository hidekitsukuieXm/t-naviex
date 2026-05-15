# テスト管理ツール ER図（データモデル）

> 文書番号: ER-TM-2026-001 ／ バージョン: 1.0 ／ 作成日: 2026年5月11日

---

## 1. 全体 ER 図

> テーブル数が多いため、エリア別に4分割して表示しています。

### 1-A1. ユーザー・権限系

```mermaid
erDiagram
    USERS {
        bigint id PK
        varchar email UK
        varchar name
        varchar status
        boolean mfa_enabled
        varchar mfa_type
    }
    GROUPS {
        bigint id PK
        varchar name
    }
    USER_GROUPS {
        bigint user_id FK
        bigint group_id FK
    }
    ROLES {
        bigint id PK
        varchar name
        jsonb permissions
    }
    PROJECT_MEMBERS {
        bigint project_id FK
        bigint user_id FK
        bigint role_id FK
    }
    SSO_CONFIGS {
        bigint id PK
        varchar provider
        varchar protocol
        boolean is_active
    }
    AUDIT_LOGS {
        bigint id PK
        bigint user_id FK
        varchar action
        varchar target_type
        timestamp created_at
    }

    USERS ||--o{ USER_GROUPS : "所属"
    GROUPS ||--o{ USER_GROUPS : "メンバー"
    USERS ||--o{ PROJECT_MEMBERS : "参加"
    ROLES ||--o{ PROJECT_MEMBERS : "役割"
    USERS ||--o{ AUDIT_LOGS : "操作"
```

---

### 1-A2. プロジェクト・システム系

```mermaid
erDiagram
    PROJECTS {
        bigint id PK
        varchar name
        varchar status
        varchar project_type
        varchar target_version
    }
    PROJECT_MEMBERS {
        bigint project_id FK
        bigint user_id FK
        bigint role_id FK
    }
    MILESTONES {
        bigint id PK
        bigint project_id FK
        varchar name
        date start_date
        date end_date
    }
    CONFIGURATIONS {
        bigint id PK
        bigint project_id FK
        varchar name
        jsonb config_params
    }
    TASKS {
        bigint id PK
        bigint project_id FK
        varchar title
        date start_date
        date end_date
        bigint parent_task_id FK
    }
    API_TOKENS {
        bigint id PK
        bigint project_id FK
        varchar token_hash
        boolean is_active
    }

    PROJECTS ||--o{ PROJECT_MEMBERS : "メンバー"
    PROJECTS ||--o{ MILESTONES : "持つ"
    PROJECTS ||--o{ CONFIGURATIONS : "持つ"
    PROJECTS ||--o{ TASKS : "持つ"
    TASKS ||--o{ TASKS : "親子"
    PROJECTS ||--o{ API_TOKENS : "発行"
```

---

### 1-B. テスト設計系

```mermaid
erDiagram
    PROJECTS {
        bigint id PK
        varchar name
    }
    REQUIREMENTS {
        bigint id PK
        bigint project_id FK
        varchar title
        bigint parent_id FK
    }
    TEST_SPECS {
        bigint id PK
        bigint project_id FK
        bigint requirement_id FK
        varchar name
        varchar status
        varchar version
        boolean is_locked
    }
    TEST_SPEC_VERSIONS {
        bigint id PK
        bigint test_spec_id FK
        varchar version
        text change_note
    }
    TEST_SECTIONS {
        bigint id PK
        bigint test_spec_id FK
        bigint parent_id FK
        varchar name
        int sort_order
    }
    TEST_CASES {
        bigint id PK
        bigint test_spec_id FK
        bigint section_id FK
        varchar title
        int priority
        varchar test_type
        varchar test_technique
        boolean is_matrix
    }
    TEST_STEPS {
        bigint id PK
        bigint test_case_id FK
        int step_no
        text action_md
        text expected_md
    }
    SHARED_STEPS {
        bigint id PK
        bigint project_id FK
        varchar name
        text content_md
    }
    TAGS {
        bigint id PK
        bigint project_id FK
        varchar name
        varchar color
    }
    TEST_CASE_TAGS {
        bigint test_case_id FK
        bigint tag_id FK
    }
    REVIEWS {
        bigint id PK
        bigint test_spec_id FK
        bigint test_case_id FK
        varchar status
    }
    BASELINES {
        bigint id PK
        bigint project_id FK
        varchar name
        varchar type
    }

    PROJECTS ||--o{ REQUIREMENTS : "持つ"
    REQUIREMENTS ||--o{ REQUIREMENTS : "階層"
    PROJECTS ||--o{ TEST_SPECS : "持つ"
    REQUIREMENTS ||--o{ TEST_SPECS : "紐付け"
    TEST_SPECS ||--o{ TEST_SPEC_VERSIONS : "バージョン"
    TEST_SPECS ||--o{ TEST_SECTIONS : "セクション"
    TEST_SECTIONS ||--o{ TEST_SECTIONS : "階層"
    TEST_SECTIONS ||--o{ TEST_CASES : "含む"
    TEST_CASES ||--o{ TEST_STEPS : "手順"
    TEST_CASES ||--o{ TEST_CASE_TAGS : "タグ"
    TAGS ||--o{ TEST_CASE_TAGS : "付与"
    SHARED_STEPS ||--o{ TEST_STEPS : "共有参照"
    TEST_SPECS ||--o{ REVIEWS : "レビュー"
    TEST_CASES ||--o{ REVIEWS : "レビュー"
    PROJECTS ||--o{ BASELINES : "保存"
```

---

### 1-C. テスト実施・バグ系

```mermaid
erDiagram
    TEST_SPECS {
        bigint id PK
        varchar name
    }
    TEST_CASES {
        bigint id PK
        varchar title
    }
    TEST_RUNS {
        bigint id PK
        bigint test_spec_id FK
        bigint configuration_id FK
        bigint milestone_id FK
        varchar name
        varchar status
        date planned_start
        date planned_end
    }
    TEST_RUN_CASES {
        bigint id PK
        bigint test_run_id FK
        bigint test_case_id FK
        bigint assignee_id FK
    }
    TEST_RESULTS {
        bigint id PK
        bigint test_run_case_id FK
        varchar status
        boolean is_reproducible
        int elapsed_minutes
        bigint executed_by FK
    }
    TEST_RESULT_ATTACHMENTS {
        bigint id PK
        bigint test_result_id FK
        varchar file_name
        bigint file_size
    }
    TEST_RESULT_HISTORY {
        bigint id PK
        bigint test_result_id FK
        text diff_json
    }
    BUGS {
        bigint id PK
        bigint test_result_id FK
        varchar title
        varchar type
        varchar status
        varchar priority
        bigint assignee_id FK
        varchar external_tool
    }
    BUG_COMMENTS {
        bigint id PK
        bigint bug_id FK
        text content_md
    }
    BUG_ATTACHMENTS {
        bigint id PK
        bigint bug_id FK
        varchar file_name
    }
    BUG_HISTORY {
        bigint id PK
        bigint bug_id FK
        text diff_json
    }
    WORKFLOWS {
        bigint id PK
        varchar target_type
        varchar name
        jsonb states
    }
    CASE_DEPENDENCIES {
        bigint test_case_id FK
        bigint depends_on_id FK
    }

    TEST_SPECS ||--o{ TEST_RUNS : "対象"
    TEST_RUNS ||--o{ TEST_RUN_CASES : "含む"
    TEST_CASES ||--o{ TEST_RUN_CASES : "実施対象"
    TEST_RUN_CASES ||--o{ TEST_RESULTS : "結果"
    TEST_RESULTS ||--o{ TEST_RESULT_ATTACHMENTS : "添付"
    TEST_RESULTS ||--o{ TEST_RESULT_HISTORY : "履歴"
    TEST_RESULTS ||--o{ BUGS : "不具合"
    BUGS ||--o{ BUGS : "サブタスク"
    BUGS ||--o{ BUG_COMMENTS : "コメント"
    BUGS ||--o{ BUG_ATTACHMENTS : "添付"
    BUGS ||--o{ BUG_HISTORY : "履歴"
    TEST_CASES ||--o{ CASE_DEPENDENCIES : "依存関係"
```

---

### 1-D. 資産・ダッシュボード系

```mermaid
erDiagram
    PROJECTS {
        bigint id PK
        varchar name
    }
    CUSTOM_FIELDS_DEF {
        bigint id PK
        bigint project_id FK
        varchar target_type
        varchar name
        varchar field_type
        boolean required
    }
    CUSTOM_FIELD_VALUES {
        bigint id PK
        bigint field_def_id FK
        bigint target_id
        text value
    }
    CATALOG_ITEMS {
        bigint id PK
        bigint project_id FK
        varchar type
        varchar name
        bigint parent_id FK
    }
    TEST_SETS {
        bigint id PK
        bigint project_id FK
        varchar name
    }
    TEST_SET_CASES {
        bigint test_set_id FK
        bigint test_case_id FK
    }
    DASHBOARDS {
        bigint id PK
        bigint project_id FK
        varchar name
        varchar share_scope
        varchar external_url_token
    }
    DASHBOARD_WIDGETS {
        bigint id PK
        bigint dashboard_id FK
        varchar widget_type
        int position_x
        int position_y
    }

    PROJECTS ||--o{ CUSTOM_FIELDS_DEF : "定義"
    CUSTOM_FIELDS_DEF ||--o{ CUSTOM_FIELD_VALUES : "値"
    PROJECTS ||--o{ CATALOG_ITEMS : "カタログ"
    CATALOG_ITEMS ||--o{ CATALOG_ITEMS : "階層"
    PROJECTS ||--o{ TEST_SETS : "テストセット"
    TEST_SETS ||--o{ TEST_SET_CASES : "含む"
    PROJECTS ||--o{ DASHBOARDS : "ダッシュボード"
    DASHBOARDS ||--o{ DASHBOARD_WIDGETS : "ウィジェット"
```

---

## 2. コアエンティティ関係（簡略版）

```mermaid
erDiagram
    PROJECTS ||--o{ TEST_SPECS : "1プロジェクト = 複数仕様書"
    TEST_SPECS ||--o{ TEST_CASES : "1仕様書 = 複数テストケース"
    TEST_CASES ||--o{ TEST_RUN_CASES : "テストケースをランに割当"
    TEST_RUNS ||--o{ TEST_RUN_CASES : "1ラン = 複数ケース"
    TEST_RUN_CASES ||--o{ TEST_RESULTS : "1ランケース = 複数結果 Re-Run"
    TEST_RESULTS ||--o{ BUGS : "Fail時にバグ登録"
    PROJECTS ||--o{ MILESTONES : "マイルストーン管理"
    TEST_RUNS }o--|| MILESTONES : "ランをマイルストーンに紐付け"
    USERS ||--o{ PROJECT_MEMBERS : "プロジェクト参加"
    ROLES ||--o{ PROJECT_MEMBERS : "権限付与"

    PROJECTS {
        bigint id PK
        varchar name
        varchar status
    }
    TEST_SPECS {
        bigint id PK
        bigint project_id FK
        varchar name
        varchar status
        varchar version
    }
    TEST_CASES {
        bigint id PK
        bigint test_spec_id FK
        varchar title
        int priority
    }
    TEST_RUNS {
        bigint id PK
        bigint project_id FK
        bigint milestone_id FK
        varchar name
        varchar status
    }
    TEST_RUN_CASES {
        bigint id PK
        bigint test_run_id FK
        bigint test_case_id FK
        bigint assignee_id FK
    }
    TEST_RESULTS {
        bigint id PK
        bigint test_run_case_id FK
        varchar status
        timestamp executed_at
    }
    BUGS {
        bigint id PK
        bigint test_result_id FK
        varchar title
        varchar status
    }
    MILESTONES {
        bigint id PK
        bigint project_id FK
        varchar name
        date end_date
    }
    USERS {
        bigint id PK
        varchar email
        varchar name
    }
    ROLES {
        bigint id PK
        varchar name
    }
    PROJECT_MEMBERS {
        bigint project_id FK
        bigint user_id FK
        bigint role_id FK
    }
```

---

## 3. テストケース関連エンティティ詳細

### 3-A. テストケース・手順・タグ

```mermaid
erDiagram
    TEST_SECTIONS {
        bigint id PK
        bigint test_spec_id FK
        bigint parent_id FK
        varchar name
        int sort_order
    }
    TEST_CASES {
        bigint id PK
        bigint test_spec_id FK
        bigint section_id FK
        varchar title
        int priority
        varchar test_type
        varchar test_technique
        boolean is_matrix
    }
    TEST_STEPS {
        bigint id PK
        bigint test_case_id FK
        int step_no
        text action_md
        text expected_md
        boolean is_shared
    }
    SHARED_STEPS {
        bigint id PK
        bigint project_id FK
        varchar name
        text content_md
    }
    TAGS {
        bigint id PK
        bigint project_id FK
        varchar name
        varchar color
    }
    TEST_CASE_TAGS {
        bigint test_case_id FK
        bigint tag_id FK
    }
    CASE_DEPENDENCIES {
        bigint test_case_id FK
        bigint depends_on_id FK
    }

    TEST_SECTIONS ||--o{ TEST_SECTIONS : "親子階層"
    TEST_SECTIONS ||--o{ TEST_CASES : "グループ化"
    TEST_CASES ||--o{ TEST_STEPS : "手順"
    SHARED_STEPS ||--o{ TEST_STEPS : "共有参照"
    TEST_CASES ||--o{ TEST_CASE_TAGS : "タグ付け"
    TAGS ||--o{ TEST_CASE_TAGS : "付与"
    TEST_CASES ||--o{ CASE_DEPENDENCIES : "依存関係"
```

---

### 3-B. カスタムフィールド・履歴・資産

```mermaid
erDiagram
    TEST_CASES {
        bigint id PK
        varchar title
    }
    CUSTOM_FIELDS_DEF {
        bigint id PK
        bigint project_id FK
        varchar target_type
        varchar name
        varchar field_type
        boolean required
    }
    CUSTOM_FIELD_VALUES {
        bigint id PK
        bigint field_def_id FK
        bigint target_id
        text value
    }
    TEST_CASE_HISTORY {
        bigint id PK
        bigint test_case_id FK
        text diff_json
        timestamp changed_at
    }
    BASELINES {
        bigint id PK
        bigint project_id FK
        varchar name
        varchar type
        jsonb snapshot_data
    }
    TEST_SETS {
        bigint id PK
        bigint project_id FK
        varchar name
    }
    TEST_SET_CASES {
        bigint test_set_id FK
        bigint test_case_id FK
    }

    CUSTOM_FIELDS_DEF ||--o{ CUSTOM_FIELD_VALUES : "定義"
    TEST_CASES ||--o{ CUSTOM_FIELD_VALUES : "カスタム値"
    TEST_CASES ||--o{ TEST_CASE_HISTORY : "変更履歴"
    TEST_SETS ||--o{ TEST_SET_CASES : "含む"
    TEST_CASES ||--o{ TEST_SET_CASES : "含まれる"
```

---

## 4. バグ・課題管理エンティティ詳細

```mermaid
erDiagram
    BUGS {
        bigint id PK
        bigint project_id FK
        bigint test_result_id FK
        bigint parent_bug_id FK
        varchar title
        text description_md
        varchar type
        varchar status
        varchar priority
        bigint assignee_id FK
        varchar external_ref
        varchar external_tool
        int work_minutes
        timestamp due_date
    }
    BUG_COMMENTS {
        bigint id PK
        bigint bug_id FK
        text content_md
        bigint author_id FK
        timestamp created_at
    }
    BUG_ATTACHMENTS {
        bigint id PK
        bigint bug_id FK
        varchar file_name
        bigint file_size
    }
    BUG_HISTORY {
        bigint id PK
        bigint bug_id FK
        text diff_json
        timestamp changed_at
    }
    WORKFLOWS {
        bigint id PK
        bigint project_id FK
        varchar target_type
        varchar name
        jsonb states
        jsonb transitions
    }

    BUGS ||--o{ BUGS : "サブタスク"
    BUGS ||--o{ BUG_COMMENTS : "コメント"
    BUGS ||--o{ BUG_ATTACHMENTS : "添付ファイル"
    BUGS ||--o{ BUG_HISTORY : "変更履歴"
    WORKFLOWS ||--o{ BUGS : "ワークフロー適用"
```

---

## 5. セキュリティ・認証エンティティ

```mermaid
erDiagram
    USERS {
        bigint id PK
        varchar email UK
        varchar name
        varchar password_hash
        varchar status
        boolean mfa_enabled
        varchar mfa_type
    }
    ROLES {
        bigint id PK
        varchar name
        jsonb permissions
    }
    PROJECT_MEMBERS {
        bigint project_id FK
        bigint user_id FK
        bigint role_id FK
    }
    SSO_CONFIGS {
        bigint id PK
        varchar provider
        varchar protocol
        jsonb config
        boolean is_active
    }
    API_TOKENS {
        bigint id PK
        bigint project_id FK
        varchar name
        varchar token_hash
        boolean is_active
        timestamp last_used_at
    }
    AUDIT_LOGS {
        bigint id PK
        bigint user_id FK
        varchar action
        varchar target_type
        bigint target_id
        varchar ip_address
        timestamp created_at
    }

    USERS ||--o{ PROJECT_MEMBERS : "参加"
    ROLES ||--o{ PROJECT_MEMBERS : "ロール定義"
    USERS ||--o{ AUDIT_LOGS : "操作記録"
    SSO_CONFIGS ||--o{ USERS : "SSO認証"
```

---

## 6. テーブル一覧サマリー

```mermaid
mindmap
  root((データベース))
    ユーザー・権限
      USERS ユーザー
      GROUPS グループ
      USER_GROUPS ユーザーグループ中間
      ROLES ロール権限定義
      PROJECT_MEMBERS プロジェクトメンバー
      SSO_CONFIGS SSO設定
    プロジェクト
      PROJECTS プロジェクト
      MILESTONES マイルストーン
      CONFIGURATIONS 環境設定
      TASKS タスク
    要求仕様
      REQUIREMENTS 要求仕様
    テスト設計
      TEST_SPECS テスト仕様書
      TEST_SPEC_VERSIONS 仕様書バージョン
      TEST_SECTIONS テストセクション
      TEST_CASES テストケース
      TEST_STEPS テスト手順
      SHARED_STEPS 共有手順
      TAGS タグ
      TEST_CASE_TAGS タグ中間
      CUSTOM_FIELDS_DEF カスタムフィールド定義
      CUSTOM_FIELD_VALUES カスタムフィールド値
      TEST_CASE_HISTORY テストケース履歴
      BASELINES ベースライン
      CASE_DEPENDENCIES ケース依存関係
      REVIEWS レビュー
    テスト実施
      TEST_RUNS テストラン
      TEST_RUN_CASES テストランケース
      TEST_RESULTS テスト結果
      TEST_RESULT_ATTACHMENTS 結果添付ファイル
      TEST_RESULT_HISTORY 結果履歴
    バグ・課題
      BUGS バグ・課題
      BUG_COMMENTS コメント
      BUG_ATTACHMENTS 添付ファイル
      BUG_HISTORY 変更履歴
      WORKFLOWS ワークフロー
    テスト資産
      CATALOG_ITEMS カタログ
      TEST_SETS テストセット
      TEST_SET_CASES テストセット中間
    ダッシュボード
      DASHBOARDS ダッシュボード
      DASHBOARD_WIDGETS ウィジェット
    システム管理
      AUDIT_LOGS 監査ログ
      API_TOKENS APIトークン
```

---

*本ER図はUSDM要求仕様書（SRS-TM-USDM-2026-001）に基づき設計しています。*
*実装時はRDBMS（PostgreSQL推奨）の制約・インデックス設計を別途定義してください。*
