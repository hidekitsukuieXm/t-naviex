# テスト管理ツール（T-NaviEx）API仕様書

> 文書番号: API-TM-2026-001 / バージョン: 1.0 / 作成日: 2026年5月15日

---

## 1. 概要

### 1.1 APIの目的

本APIは、テスト管理ツール（T-NaviEx）の機能を外部システムから利用するためのREST APIを提供します。CI/CDパイプライン、自動テストツール、その他の外部システムとの連携を可能にします。

### 1.2 ベースURL

```
本番環境: https://api.t-naviex.example.com/api/v1
開発環境: http://localhost:3000/api/v1
```

### 1.3 APIバージョニング

- URLパスにバージョン番号を含める（例: `/api/v1/`）
- 破壊的変更がある場合はメジャーバージョンを上げる

---

## 2. 認証・認可

### 2.1 認証方式

#### 2.1.1 APIトークン認証

```http
Authorization: Bearer <api_token>
```

APIトークンは管理画面から発行し、リクエストヘッダーに含めます。

#### 2.1.2 セッション認証（Webアプリ用）

```http
Cookie: next-auth.session-token=<session_token>
```

### 2.2 レート制限

| プラン | リクエスト数/分 | リクエスト数/日 |
|--------|----------------|-----------------|
| 標準 | 60 | 10,000 |
| エンタープライズ | 300 | 100,000 |

レート制限超過時は `429 Too Many Requests` を返却。

### 2.3 レスポンスヘッダー

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1620000000
```

---

## 3. 共通仕様

### 3.1 リクエストヘッダー

| ヘッダー | 必須 | 説明 |
|----------|------|------|
| `Authorization` | Yes | Bearer トークン |
| `Content-Type` | Yes | `application/json` |
| `Accept` | No | `application/json` |
| `X-Request-ID` | No | リクエスト追跡用ID |

### 3.2 レスポンス形式

#### 成功レスポンス

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "title",
        "message": "タイトルは必須です"
      }
    ]
  }
}
```

### 3.3 HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 204 | 削除成功（No Content） |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソース未発見 |
| 409 | 競合エラー |
| 422 | バリデーションエラー |
| 429 | レート制限超過 |
| 500 | サーバーエラー |

### 3.4 ページネーション

```
GET /api/v1/test-cases?page=1&limit=20&sort=created_at&order=desc
```

| パラメータ | デフォルト | 説明 |
|------------|-----------|------|
| `page` | 1 | ページ番号 |
| `limit` | 20 | 取得件数（最大100） |
| `sort` | created_at | ソートフィールド |
| `order` | desc | ソート順（asc/desc） |

### 3.5 フィルタリング

```
GET /api/v1/test-cases?status=active&priority=1,2&tags=smoke,regression
```

### 3.6 日時形式

ISO 8601形式を使用:
```
2026-05-15T10:30:00.000Z
```

---

## 4. 認証API

### 4.1 ログイン

```http
POST /api/v1/auth/login
```

#### リクエスト

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "山田太郎"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

### 4.2 トークンリフレッシュ

```http
POST /api/v1/auth/refresh
```

#### リクエスト

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4.3 ログアウト

```http
POST /api/v1/auth/logout
```

### 4.4 現在のユーザー情報取得

```http
GET /api/v1/auth/me
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "山田太郎",
    "status": "active",
    "mfaEnabled": false,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## 5. ユーザー管理API

### 5.1 ユーザー一覧取得

```http
GET /api/v1/users
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `status` | string | active, inactive, suspended |
| `role` | string | admin, manager, member, guest |
| `search` | string | 名前・メールで検索 |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "山田太郎",
      "status": "active",
      "mfaEnabled": false,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

### 5.2 ユーザー作成

```http
POST /api/v1/users
```

#### リクエスト

```json
{
  "email": "newuser@example.com",
  "name": "新規ユーザー",
  "password": "SecurePass123!",
  "role": "member"
}
```

### 5.3 ユーザー取得

```http
GET /api/v1/users/{userId}
```

### 5.4 ユーザー更新

```http
PUT /api/v1/users/{userId}
```

### 5.5 ユーザー削除

```http
DELETE /api/v1/users/{userId}
```

### 5.6 ユーザー一括招待

```http
POST /api/v1/users/invite
```

#### リクエスト

```json
{
  "users": [
    {
      "email": "user1@example.com",
      "name": "ユーザー1",
      "role": "member"
    },
    {
      "email": "user2@example.com",
      "name": "ユーザー2",
      "role": "member"
    }
  ]
}
```

---

## 6. プロジェクト管理API

### 6.1 プロジェクト一覧取得

```http
GET /api/v1/projects
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `status` | string | active, archived, completed |
| `type` | string | waterfall, agile, hybrid |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "プロジェクトA",
      "description": "プロジェクトの説明",
      "status": "active",
      "projectType": "agile",
      "targetVersion": "1.0.0",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-05-01T00:00:00.000Z"
    }
  ]
}
```

### 6.2 プロジェクト作成

```http
POST /api/v1/projects
```

#### リクエスト

```json
{
  "name": "新規プロジェクト",
  "description": "プロジェクトの説明",
  "projectType": "agile",
  "targetVersion": "1.0.0"
}
```

### 6.3 プロジェクト取得

```http
GET /api/v1/projects/{projectId}
```

### 6.4 プロジェクト更新

```http
PUT /api/v1/projects/{projectId}
```

### 6.5 プロジェクト削除

```http
DELETE /api/v1/projects/{projectId}
```

### 6.6 プロジェクトコピー

```http
POST /api/v1/projects/{projectId}/copy
```

#### リクエスト

```json
{
  "name": "コピー後のプロジェクト名",
  "includeTestCases": true,
  "includeTestRuns": false
}
```

### 6.7 プロジェクトメンバー管理

```http
GET /api/v1/projects/{projectId}/members
POST /api/v1/projects/{projectId}/members
PUT /api/v1/projects/{projectId}/members/{userId}
DELETE /api/v1/projects/{projectId}/members/{userId}
```

---

## 7. マイルストーンAPI

### 7.1 マイルストーン一覧取得

```http
GET /api/v1/projects/{projectId}/milestones
```

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "リリース v1.0",
      "description": "初回リリース",
      "startDate": "2026-06-01",
      "endDate": "2026-06-30",
      "status": "in_progress",
      "progress": 45.5
    }
  ]
}
```

### 7.2 マイルストーン作成

```http
POST /api/v1/projects/{projectId}/milestones
```

#### リクエスト

```json
{
  "name": "リリース v1.0",
  "description": "初回リリース",
  "startDate": "2026-06-01",
  "endDate": "2026-06-30"
}
```

### 7.3 マイルストーン取得・更新・削除

```http
GET /api/v1/projects/{projectId}/milestones/{milestoneId}
PUT /api/v1/projects/{projectId}/milestones/{milestoneId}
DELETE /api/v1/projects/{projectId}/milestones/{milestoneId}
```

---

## 8. テスト仕様書API

### 8.1 テスト仕様書一覧取得

```http
GET /api/v1/projects/{projectId}/test-specs
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `status` | string | outline, detail, review, redesign, completed |
| `requirementId` | number | 紐付け要求仕様ID |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "ログイン機能テスト仕様書",
      "status": "detail",
      "version": "1.0.0",
      "isLocked": false,
      "requirement": {
        "id": 1,
        "title": "ログイン機能"
      },
      "testCaseCount": 25,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-05-01T00:00:00.000Z"
    }
  ]
}
```

### 8.2 テスト仕様書作成

```http
POST /api/v1/projects/{projectId}/test-specs
```

#### リクエスト

```json
{
  "name": "ログイン機能テスト仕様書",
  "requirementId": 1,
  "description": "ログイン機能に関するテスト仕様"
}
```

### 8.3 テスト仕様書取得

```http
GET /api/v1/projects/{projectId}/test-specs/{testSpecId}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ログイン機能テスト仕様書",
    "status": "detail",
    "version": "1.0.0",
    "isLocked": false,
    "sections": [
      {
        "id": 1,
        "name": "正常系テスト",
        "parentId": null,
        "sortOrder": 1,
        "children": [
          {
            "id": 2,
            "name": "メールログイン",
            "parentId": 1,
            "sortOrder": 1
          }
        ]
      }
    ],
    "testCases": [...],
    "versions": [...]
  }
}
```

### 8.4 テスト仕様書更新

```http
PUT /api/v1/projects/{projectId}/test-specs/{testSpecId}
```

### 8.5 テスト仕様書削除

```http
DELETE /api/v1/projects/{projectId}/test-specs/{testSpecId}
```

### 8.6 テスト仕様書コピー

```http
POST /api/v1/projects/{projectId}/test-specs/{testSpecId}/copy
```

### 8.7 テスト仕様書ロック/アンロック

```http
POST /api/v1/projects/{projectId}/test-specs/{testSpecId}/lock
POST /api/v1/projects/{projectId}/test-specs/{testSpecId}/unlock
```

### 8.8 バージョン管理

```http
GET /api/v1/projects/{projectId}/test-specs/{testSpecId}/versions
POST /api/v1/projects/{projectId}/test-specs/{testSpecId}/versions
```

---

## 9. テストセクションAPI

### 9.1 セクション一覧取得

```http
GET /api/v1/projects/{projectId}/test-specs/{testSpecId}/sections
```

### 9.2 セクション作成

```http
POST /api/v1/projects/{projectId}/test-specs/{testSpecId}/sections
```

#### リクエスト

```json
{
  "name": "新しいセクション",
  "parentId": null,
  "sortOrder": 1
}
```

### 9.3 セクション更新

```http
PUT /api/v1/projects/{projectId}/test-specs/{testSpecId}/sections/{sectionId}
```

### 9.4 セクション移動（ドラッグ&ドロップ）

```http
POST /api/v1/projects/{projectId}/test-specs/{testSpecId}/sections/{sectionId}/move
```

#### リクエスト

```json
{
  "parentId": 2,
  "sortOrder": 3
}
```

### 9.5 セクション削除

```http
DELETE /api/v1/projects/{projectId}/test-specs/{testSpecId}/sections/{sectionId}
```

---

## 10. テストケースAPI

### 10.1 テストケース一覧取得

```http
GET /api/v1/projects/{projectId}/test-cases
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `testSpecId` | number | テスト仕様書ID |
| `sectionId` | number | セクションID |
| `priority` | number | 優先度（1-5） |
| `status` | string | ステータス |
| `tags` | string | タグ（カンマ区切り） |
| `testType` | string | テストタイプ |
| `assigneeId` | number | 担当者ID |
| `search` | string | 全文検索 |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "正常なメールアドレスとパスワードでログインできる",
      "checkpoint": "ログイン成功後、ダッシュボードに遷移する",
      "priority": 1,
      "testType": "機能テスト",
      "testTechnique": "同値分割法",
      "status": "active",
      "estimatedTime": 10,
      "tags": ["smoke", "login"],
      "isMatrix": false,
      "sectionId": 1,
      "testSpecId": 1,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-05-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### 10.2 テストケース作成

```http
POST /api/v1/projects/{projectId}/test-cases
```

#### リクエスト

```json
{
  "testSpecId": 1,
  "sectionId": 1,
  "title": "正常なメールアドレスとパスワードでログインできる",
  "checkpoint": "ログイン成功後、ダッシュボードに遷移する",
  "scenario": {
    "method": "## テスト手順\n1. ログイン画面を開く\n2. メールアドレスを入力",
    "successCriteria": "## 成功条件\n- ダッシュボードが表示される",
    "verification": "## 検証項目\n- URLがダッシュボードになっている"
  },
  "environment": "Chrome 最新版, Windows 11",
  "notes": "特記事項なし",
  "priority": 1,
  "testType": "機能テスト",
  "testTechnique": "同値分割法",
  "tags": ["smoke", "login"],
  "referenceId": "REQ-001",
  "estimatedTime": 10,
  "precondition": "テストユーザーが作成済みであること",
  "expectedResult": "ダッシュボード画面が表示される",
  "customFields": {
    "customField1": "値1",
    "customField2": "値2"
  },
  "steps": [
    {
      "stepNo": 1,
      "action": "ログイン画面を開く",
      "expected": "ログイン画面が表示される"
    },
    {
      "stepNo": 2,
      "action": "メールアドレスとパスワードを入力",
      "expected": "入力値が表示される"
    },
    {
      "stepNo": 3,
      "action": "ログインボタンをクリック",
      "expected": "ダッシュボードに遷移する"
    }
  ]
}
```

### 10.3 テストケース取得

```http
GET /api/v1/projects/{projectId}/test-cases/{testCaseId}
```

### 10.4 テストケース更新

```http
PUT /api/v1/projects/{projectId}/test-cases/{testCaseId}
```

### 10.5 テストケース削除

```http
DELETE /api/v1/projects/{projectId}/test-cases/{testCaseId}
```

### 10.6 テストケース一括操作

```http
POST /api/v1/projects/{projectId}/test-cases/bulk
```

#### リクエスト

```json
{
  "action": "move",
  "testCaseIds": [1, 2, 3],
  "targetSectionId": 5
}
```

サポートされるアクション:
- `move`: セクション移動
- `copy`: コピー
- `delete`: 一括削除
- `updateTags`: タグ一括更新
- `updatePriority`: 優先度一括更新

### 10.7 テストケースコピー

```http
POST /api/v1/projects/{projectId}/test-cases/{testCaseId}/copy
```

### 10.8 テストケース履歴取得

```http
GET /api/v1/projects/{projectId}/test-cases/{testCaseId}/history
```

### 10.9 テストケース依存関係

```http
GET /api/v1/projects/{projectId}/test-cases/{testCaseId}/dependencies
POST /api/v1/projects/{projectId}/test-cases/{testCaseId}/dependencies
DELETE /api/v1/projects/{projectId}/test-cases/{testCaseId}/dependencies/{dependencyId}
```

---

## 11. テスト手順API

### 11.1 テスト手順一覧取得

```http
GET /api/v1/projects/{projectId}/test-cases/{testCaseId}/steps
```

### 11.2 テスト手順作成

```http
POST /api/v1/projects/{projectId}/test-cases/{testCaseId}/steps
```

### 11.3 テスト手順更新

```http
PUT /api/v1/projects/{projectId}/test-cases/{testCaseId}/steps/{stepId}
```

### 11.4 テスト手順並び替え

```http
POST /api/v1/projects/{projectId}/test-cases/{testCaseId}/steps/reorder
```

#### リクエスト

```json
{
  "stepIds": [3, 1, 2]
}
```

### 11.5 共有手順

```http
GET /api/v1/projects/{projectId}/shared-steps
POST /api/v1/projects/{projectId}/shared-steps
PUT /api/v1/projects/{projectId}/shared-steps/{sharedStepId}
DELETE /api/v1/projects/{projectId}/shared-steps/{sharedStepId}
```

---

## 12. タグAPI

### 12.1 タグ一覧取得

```http
GET /api/v1/projects/{projectId}/tags
```

### 12.2 タグ作成

```http
POST /api/v1/projects/{projectId}/tags
```

#### リクエスト

```json
{
  "name": "smoke",
  "color": "#FF5733"
}
```

### 12.3 タグ更新・削除

```http
PUT /api/v1/projects/{projectId}/tags/{tagId}
DELETE /api/v1/projects/{projectId}/tags/{tagId}
```

---

## 13. テストランAPI

### 13.1 テストラン一覧取得

```http
GET /api/v1/projects/{projectId}/test-runs
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `status` | string | pending, in_progress, completed, closed |
| `milestoneId` | number | マイルストーンID |
| `configurationId` | number | コンフィギュレーションID |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "リリースv1.0 テストラン",
      "status": "in_progress",
      "testSpecId": 1,
      "milestoneId": 1,
      "configurationId": 1,
      "plannedStart": "2026-06-01",
      "plannedEnd": "2026-06-15",
      "progress": {
        "total": 100,
        "passed": 45,
        "failed": 5,
        "blocked": 2,
        "pending": 48,
        "passRate": 45.0
      },
      "createdAt": "2026-05-01T00:00:00.000Z"
    }
  ]
}
```

### 13.2 テストラン作成

```http
POST /api/v1/projects/{projectId}/test-runs
```

#### リクエスト

```json
{
  "name": "リリースv1.0 テストラン",
  "testSpecId": 1,
  "milestoneId": 1,
  "configurationId": 1,
  "plannedStart": "2026-06-01",
  "plannedEnd": "2026-06-15",
  "testCaseIds": [1, 2, 3, 4, 5],
  "assignees": {
    "1": 10,
    "2": 10,
    "3": 11
  }
}
```

### 13.3 テストラン取得

```http
GET /api/v1/projects/{projectId}/test-runs/{testRunId}
```

### 13.4 テストラン更新

```http
PUT /api/v1/projects/{projectId}/test-runs/{testRunId}
```

### 13.5 テストランクローズ

```http
POST /api/v1/projects/{projectId}/test-runs/{testRunId}/close
```

### 13.6 Re-Run作成

```http
POST /api/v1/projects/{projectId}/test-runs/{testRunId}/rerun
```

#### リクエスト

```json
{
  "name": "Re-Run: リリースv1.0 テストラン",
  "includeStatuses": ["failed", "blocked", "pending"]
}
```

---

## 14. テスト結果API

### 14.1 テスト結果一覧取得

```http
GET /api/v1/projects/{projectId}/test-runs/{testRunId}/results
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `status` | string | passed, failed, blocked, pending, na |
| `assigneeId` | number | 担当者ID |
| `testCaseId` | number | テストケースID |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "testRunCaseId": 1,
      "testCase": {
        "id": 1,
        "title": "正常なメールアドレスとパスワードでログインできる"
      },
      "status": "passed",
      "isReproducible": null,
      "elapsedMinutes": 5,
      "comment": "問題なく動作確認",
      "executedBy": {
        "id": 10,
        "name": "山田太郎"
      },
      "executedAt": "2026-06-05T10:30:00.000Z",
      "attachments": []
    }
  ]
}
```

### 14.2 テスト結果登録

```http
POST /api/v1/projects/{projectId}/test-runs/{testRunId}/results
```

#### リクエスト

```json
{
  "testRunCaseId": 1,
  "status": "passed",
  "elapsedMinutes": 5,
  "comment": "問題なく動作確認",
  "stepResults": [
    {
      "stepId": 1,
      "status": "passed"
    },
    {
      "stepId": 2,
      "status": "passed"
    }
  ]
}
```

### 14.3 テスト結果更新

```http
PUT /api/v1/projects/{projectId}/test-runs/{testRunId}/results/{resultId}
```

### 14.4 テスト結果一括登録

```http
POST /api/v1/projects/{projectId}/test-runs/{testRunId}/results/bulk
```

#### リクエスト

```json
{
  "results": [
    {
      "testRunCaseId": 1,
      "status": "passed",
      "elapsedMinutes": 5
    },
    {
      "testRunCaseId": 2,
      "status": "passed",
      "elapsedMinutes": 3
    }
  ]
}
```

### 14.5 添付ファイルアップロード

```http
POST /api/v1/projects/{projectId}/test-runs/{testRunId}/results/{resultId}/attachments
Content-Type: multipart/form-data
```

#### リクエスト

```
file: (binary)
```

### 14.6 添付ファイル取得・削除

```http
GET /api/v1/projects/{projectId}/test-runs/{testRunId}/results/{resultId}/attachments/{attachmentId}
DELETE /api/v1/projects/{projectId}/test-runs/{testRunId}/results/{resultId}/attachments/{attachmentId}
```

---

## 15. バグ管理API

### 15.1 バグ一覧取得

```http
GET /api/v1/projects/{projectId}/bugs
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `status` | string | open, in_progress, resolved, closed |
| `priority` | string | critical, high, medium, low |
| `type` | string | bug, enhancement, question, task |
| `assigneeId` | number | 担当者ID |
| `testResultId` | number | テスト結果ID |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "ログイン時にエラーメッセージが表示されない",
      "description": "不正なパスワードを入力してもエラーメッセージが表示されない",
      "type": "bug",
      "status": "open",
      "priority": "high",
      "assignee": {
        "id": 10,
        "name": "山田太郎"
      },
      "testResult": {
        "id": 1,
        "testCaseTitle": "正常なメールアドレスとパスワードでログインできる"
      },
      "externalRef": "JIRA-123",
      "externalTool": "jira",
      "workMinutes": 60,
      "dueDate": "2026-06-10",
      "createdAt": "2026-06-05T10:30:00.000Z"
    }
  ]
}
```

### 15.2 バグ作成

```http
POST /api/v1/projects/{projectId}/bugs
```

#### リクエスト

```json
{
  "title": "ログイン時にエラーメッセージが表示されない",
  "description": "## 再現手順\n1. ログイン画面を開く\n2. 不正なパスワードを入力\n3. ログインボタンをクリック\n\n## 期待結果\nエラーメッセージが表示される\n\n## 実際の結果\n何も表示されない",
  "type": "bug",
  "priority": "high",
  "assigneeId": 10,
  "testResultId": 1,
  "dueDate": "2026-06-10"
}
```

### 15.3 バグ取得

```http
GET /api/v1/projects/{projectId}/bugs/{bugId}
```

### 15.4 バグ更新

```http
PUT /api/v1/projects/{projectId}/bugs/{bugId}
```

### 15.5 バグステータス更新（ワークフロー）

```http
POST /api/v1/projects/{projectId}/bugs/{bugId}/transition
```

#### リクエスト

```json
{
  "status": "in_progress",
  "comment": "対応開始します"
}
```

### 15.6 バグコメント

```http
GET /api/v1/projects/{projectId}/bugs/{bugId}/comments
POST /api/v1/projects/{projectId}/bugs/{bugId}/comments
PUT /api/v1/projects/{projectId}/bugs/{bugId}/comments/{commentId}
DELETE /api/v1/projects/{projectId}/bugs/{bugId}/comments/{commentId}
```

### 15.7 バグサブタスク

```http
GET /api/v1/projects/{projectId}/bugs/{bugId}/subtasks
POST /api/v1/projects/{projectId}/bugs/{bugId}/subtasks
```

### 15.8 バグ添付ファイル

```http
POST /api/v1/projects/{projectId}/bugs/{bugId}/attachments
GET /api/v1/projects/{projectId}/bugs/{bugId}/attachments/{attachmentId}
DELETE /api/v1/projects/{projectId}/bugs/{bugId}/attachments/{attachmentId}
```

### 15.9 バグ履歴

```http
GET /api/v1/projects/{projectId}/bugs/{bugId}/history
```

---

## 16. 外部ツール連携API

### 16.1 Redmine連携

#### 接続テスト

```http
POST /api/v1/integrations/redmine/test
```

#### リクエスト

```json
{
  "url": "https://redmine.example.com",
  "apiKey": "your-api-key"
}
```

#### バグ同期

```http
POST /api/v1/projects/{projectId}/bugs/{bugId}/sync/redmine
```

### 16.2 Backlog連携

#### 接続テスト

```http
POST /api/v1/integrations/backlog/test
```

#### リクエスト

```json
{
  "spaceKey": "your-space",
  "apiKey": "your-api-key"
}
```

#### バグ同期

```http
POST /api/v1/projects/{projectId}/bugs/{bugId}/sync/backlog
```

---

## 17. ダッシュボードAPI

### 17.1 ダッシュボード一覧取得

```http
GET /api/v1/projects/{projectId}/dashboards
```

### 17.2 ダッシュボード作成

```http
POST /api/v1/projects/{projectId}/dashboards
```

#### リクエスト

```json
{
  "name": "プロジェクトダッシュボード",
  "shareScope": "project",
  "widgets": [
    {
      "widgetType": "progress_summary",
      "positionX": 0,
      "positionY": 0,
      "width": 2,
      "height": 1,
      "config": {}
    }
  ]
}
```

### 17.3 ダッシュボード取得・更新・削除

```http
GET /api/v1/projects/{projectId}/dashboards/{dashboardId}
PUT /api/v1/projects/{projectId}/dashboards/{dashboardId}
DELETE /api/v1/projects/{projectId}/dashboards/{dashboardId}
```

### 17.4 外部参照URL発行

```http
POST /api/v1/projects/{projectId}/dashboards/{dashboardId}/external-url
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "url": "https://t-naviex.example.com/public/dashboard/abc123xyz",
    "token": "abc123xyz",
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
}
```

---

## 18. レポートAPI

### 18.1 進捗レポート

```http
GET /api/v1/projects/{projectId}/reports/progress
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `startDate` | date | 開始日 |
| `endDate` | date | 終了日 |
| `testSpecId` | number | テスト仕様書ID |
| `milestoneId` | number | マイルストーンID |

### 18.2 サマリーレポート

```http
GET /api/v1/projects/{projectId}/reports/summary
```

### 18.3 欠陥レポート

```http
GET /api/v1/projects/{projectId}/reports/defects
```

### 18.4 バーンダウンチャート

```http
GET /api/v1/projects/{projectId}/reports/burndown
```

### 18.5 信頼度成長曲線

```http
GET /api/v1/projects/{projectId}/reports/reliability-growth
```

### 18.6 レポートPDFエクスポート

```http
POST /api/v1/projects/{projectId}/reports/export
```

#### リクエスト

```json
{
  "reportType": "summary",
  "format": "pdf",
  "options": {
    "includeCharts": true,
    "includeDetails": true
  }
}
```

---

## 19. インポート・エクスポートAPI

### 19.1 テストケースエクスポート

```http
POST /api/v1/projects/{projectId}/export/test-cases
```

#### リクエスト

```json
{
  "format": "excel",
  "testSpecId": 1,
  "sectionIds": [1, 2, 3],
  "includeSteps": true
}
```

### 19.2 テストケースインポート

```http
POST /api/v1/projects/{projectId}/import/test-cases
Content-Type: multipart/form-data
```

#### リクエスト

```
file: (binary)
testSpecId: 1
sectionId: 1
mapping: {"A": "title", "B": "checkpoint", "C": "priority"}
```

### 19.3 テスト成績書エクスポート

```http
POST /api/v1/projects/{projectId}/export/test-results
```

#### リクエスト

```json
{
  "format": "pdf",
  "testRunId": 1,
  "includeEvidence": true
}
```

---

## 20. AI機能API

### 20.1 テストケース自動生成

```http
POST /api/v1/ai/generate-test-cases
```

#### リクエスト

```json
{
  "projectId": 1,
  "requirementText": "ユーザーはメールアドレスとパスワードでログインできる。パスワードは8文字以上で、英数字と記号を含む必要がある。",
  "testType": "機能テスト",
  "count": 10
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "testCases": [
      {
        "title": "正常なメールアドレスとパスワードでログインできる",
        "checkpoint": "ログイン成功後、ダッシュボードに遷移する",
        "priority": 1,
        "steps": [...]
      }
    ]
  }
}
```

### 20.2 テストケースレビュー

```http
POST /api/v1/ai/review-test-case
```

#### リクエスト

```json
{
  "testCaseId": 1
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "reviewComments": [
      {
        "type": "improvement",
        "field": "steps",
        "message": "手順2と3の間に、入力値の確認ステップを追加することを推奨します"
      }
    ],
    "score": 85,
    "summary": "テストケースは概ね良好ですが、境界値テストの追加を検討してください"
  }
}
```

### 20.3 テスト技法提案

```http
POST /api/v1/ai/suggest-technique
```

### 20.4 工数予測

```http
POST /api/v1/ai/estimate-effort
```

### 20.5 バグ分析

```http
POST /api/v1/ai/analyze-bugs
```

---

## 21. 監査ログAPI

### 21.1 監査ログ取得

```http
GET /api/v1/audit-logs
```

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| `userId` | number | ユーザーID |
| `action` | string | create, update, delete, login, logout |
| `targetType` | string | project, test_case, test_run, bug |
| `startDate` | date | 開始日 |
| `endDate` | date | 終了日 |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user": {
        "id": 10,
        "name": "山田太郎"
      },
      "action": "create",
      "targetType": "test_case",
      "targetId": 100,
      "details": {
        "title": "新しいテストケース"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-06-05T10:30:00.000Z"
    }
  ]
}
```

### 21.2 監査ログエクスポート

```http
POST /api/v1/audit-logs/export
```

---

## 22. システム設定API

### 22.1 システム設定取得

```http
GET /api/v1/settings
```

### 22.2 システム設定更新

```http
PUT /api/v1/settings
```

### 22.3 カスタムフィールド定義

```http
GET /api/v1/projects/{projectId}/custom-fields
POST /api/v1/projects/{projectId}/custom-fields
PUT /api/v1/projects/{projectId}/custom-fields/{fieldId}
DELETE /api/v1/projects/{projectId}/custom-fields/{fieldId}
```

### 22.4 ワークフロー定義

```http
GET /api/v1/projects/{projectId}/workflows
POST /api/v1/projects/{projectId}/workflows
PUT /api/v1/projects/{projectId}/workflows/{workflowId}
DELETE /api/v1/projects/{projectId}/workflows/{workflowId}
```

---

## 23. APIトークン管理

### 23.1 トークン一覧取得

```http
GET /api/v1/api-tokens
```

### 23.2 トークン発行

```http
POST /api/v1/api-tokens
```

#### リクエスト

```json
{
  "name": "CI/CD連携用トークン",
  "projectId": 1,
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "scopes": ["read:test-cases", "write:test-results"]
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "CI/CD連携用トークン",
    "token": "tnx_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "expiresAt": "2027-01-01T00:00:00.000Z"
  }
}
```

**注意**: トークンは一度だけ表示されます。

### 23.3 トークン無効化

```http
DELETE /api/v1/api-tokens/{tokenId}
```

---

## 24. Webhook

### 24.1 Webhook一覧取得

```http
GET /api/v1/projects/{projectId}/webhooks
```

### 24.2 Webhook作成

```http
POST /api/v1/projects/{projectId}/webhooks
```

#### リクエスト

```json
{
  "url": "https://example.com/webhook",
  "events": ["test_run.completed", "bug.created"],
  "secret": "your-webhook-secret"
}
```

### 24.3 Webhookペイロード例

```json
{
  "event": "test_run.completed",
  "timestamp": "2026-06-05T10:30:00.000Z",
  "data": {
    "testRunId": 1,
    "name": "リリースv1.0 テストラン",
    "status": "completed",
    "progress": {
      "total": 100,
      "passed": 95,
      "failed": 3,
      "blocked": 2
    }
  }
}
```

---

## 25. エラーコード一覧

| コード | 説明 |
|--------|------|
| `AUTHENTICATION_REQUIRED` | 認証が必要です |
| `INVALID_TOKEN` | トークンが無効です |
| `TOKEN_EXPIRED` | トークンの有効期限が切れています |
| `PERMISSION_DENIED` | 権限がありません |
| `RESOURCE_NOT_FOUND` | リソースが見つかりません |
| `VALIDATION_ERROR` | 入力値が不正です |
| `DUPLICATE_ENTRY` | 重複するエントリが存在します |
| `CONFLICT` | 競合が発生しました |
| `RATE_LIMIT_EXCEEDED` | レート制限を超過しました |
| `INTERNAL_ERROR` | サーバー内部エラー |

---

*本API仕様書はUSDM要求仕様書（SRS-TM-USDM-2026-001）に基づき設計しています。*
