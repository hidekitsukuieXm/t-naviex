# テスト管理ツール GUI仕様書

> 文書番号: GUI-TM-2026-001 ／ バージョン: 1.0 ／ 作成日: 2026年5月11日

---

## 1. 画面遷移図（全体）

```mermaid
flowchart TD
    Login([ログイン]) --> MFA{MFA認証}
    MFA -->|TOTP/SSO| Dashboard[ダッシュボード]
    Dashboard --> ProjList[プロジェクト一覧]
    ProjList --> ProjDetail[プロジェクト詳細]

    subgraph TOP["上位機能グループ"]
        direction LR
        subgraph Plan["テスト計画"]
            P1[マイルストーン]
            P2[ガントチャート]
            P3[コンフィギュレーション]
        end
        subgraph TestSpec["仕様書管理"]
            T1[仕様書一覧]-->T2[仕様書詳細]
            T2-->T3[TCケース一覧]
            T3-->T4[TC詳細/編集]
        end
        subgraph TestRun["テストラン"]
            R1[ラン一覧]-->R2[ラン実施]
            R2-->R3[結果入力]
        end
    end

    subgraph BOT["管理機能グループ"]
        direction LR
        subgraph BugMgmt["バグ・課題"]
            B1[バグ一覧]-->B2[バグ詳細]
            B2-->B3[サブタスク]
        end
        subgraph Analytics["分析・レポート"]
            A1[進捗グラフ]
            A2[品質分析]
            A3[レポート出力]
        end
        subgraph Settings["プロジェクト設定"]
            S1[ユーザー管理]
            S2[権限管理]
            S3[カスタマイズ]
            S4[API管理]
        end
    end

    ProjDetail --> TOP
    ProjDetail --> BOT

    style Login fill:#4A90D9,color:#fff
    style Dashboard fill:#7ED321,color:#fff
```

---

## 2. 画面レイアウト構成

```mermaid
flowchart TD
    subgraph LAYOUT["全体レイアウト"]
        Header["ヘッダー: ロゴ・グローバル検索・通知・ユーザーメニュー"]
        SideNav["サイドナビ: プロジェクト切替・メインメニュー"]
        Content["コンテンツエリア: メイン画面"]
        Footer["フッター: バージョン・著作権"]
    end
    Header --> SideNav
    SideNav --> Content
    Content --> Footer
```

---

## 3. ダッシュボード画面（S-1301, S-1302）

```mermaid
flowchart TD
    subgraph DASH["ダッシュボード画面"]
        subgraph ROW1["ウィジェット 上段"]
            direction LR
            W1["📊 進捗サマリー<br/>合格率・実施率・残件数"]
            W2["📈 進捗グラフ<br/>日別テスト消化数"]
            W3["🐛 不具合集計<br/>Open/Close件数"]
            W4["👥 チーム情報<br/>担当者別実施状況"]
        end
        subgraph ROW2["ウィジェット 下段"]
            direction LR
            W5["🎯 現在の工程<br/>フェーズ進捗"]
            W6["📋 課題状況<br/>未対応課題一覧"]
            W7["⏰ マイルストーン<br/>残日数・達成率"]
            W8["📝 最新更新仕様書<br/>直近10件"]
        end
        subgraph CTRL["操作"]
            direction LR
            DashCtrl["＋ ウィジェット追加<br/>レイアウト編集"]
            ExternalURL["🔗 外部参照URL発行"]
        end
    end
    ROW1 --> ROW2 --> CTRL
```

---

## 4. テストケース一覧・編集画面（S-0201〜S-0209, S-0301〜S-0309）

```mermaid
flowchart TD
    subgraph TCSCREEN["テストケース管理画面"]
        subgraph LEFTTREE["左ペイン：ツリー"]
            Tree["📁 セクションツリー<br/>ドラッグ＆ドロップ対応"]
            ContextMenu["右クリック コンテキストメニュー<br/>追加/コピー/移動/削除/リネーム"]
        end

        subgraph RIGHTPANE["右ペイン：一覧/詳細"]
            subgraph TOOLBAR["ツールバー"]
                direction LR
                TB1["+ 新規追加"]
                TB2["⬆ インポート"]
                TB3["⬇ エクスポート"]
                TB4["🔍 フィルター/検索"]
                TB5["⚙ 表示列設定"]
                TB6["🤖 AI自動生成"]
            end

            subgraph GRID["テストケース一覧グリッド"]
                Grid["ID / タイトル / 優先度 / ステータス<br/>/ タグ / 担当者 / 推定時間 / 最終更新"]
                GridNote["✅実施済み  🟢Pass  🔴Fail"]
            end

            subgraph DETAIL["テストケース詳細/編集"]
                TCFields["タイトル / チェックポイント<br/>シナリオ WYSIWYG / テスト環境<br/>特記事項 / 優先度 1〜5 / タグ<br/>前提条件 / 期待結果 / カスタムフィールド"]
                StepList["手順ステップ一覧<br/>手順番号 / 操作内容 / 期待結果"]
            end
        end
    end
```

---

## 5. テストケース詳細フィールド仕様（S-0202, S-0208）

```mermaid
classDiagram
    class TestCase_Form {
        +title: string 必須
        +checkpoint: string
        +scenario_method: richtext WYSIWYG
        +scenario_success: richtext WYSIWYG
        +scenario_verify: richtext WYSIWYG
        +environment: richtext
        +notes: richtext
        +priority: int 1〜5
        +tags: list~string~
        +attachments: list~File~
        +classification: enum テストタイプ/技法/観点
        +reference_id: string
        +estimated_time: int 分
        +precondition: richtext
        +expected_result: richtext
        +custom_fields: list~CustomField~ 最大10項目
    }

    class Step {
        +step_no: int
        +action: richtext
        +expected: richtext
        +result: enum Pass/Fail/NA
    }

    class CustomField {
        +name: string
        +type: enum テキスト/プルダウン/チェックボックス/日付/数値
        +required: bool
        +options: list~string~
    }

    TestCase_Form "1" --> "0..*" Step
    TestCase_Form "1" --> "0..10" CustomField
```

---

## 6. テストラン実施画面（S-0701〜S-0709）

```mermaid
flowchart TD
    subgraph SCREEN["テストラン実施画面"]
        subgraph HDR["ヘッダー情報"]
            RunHeader["テストラン名 / 環境 / 担当者 / 進捗バー<br/>Pass:🟢 Fail:🔴 N/A:⬜ Block:🟡 残り:⬛"]
        end

        subgraph LEFT["左ペイン：ケース一覧"]
            CaseFilter["フィルター: 担当者/ステータス/優先度"]
            CaseList["テストケース一覧<br/>ステータスアイコン付き"]
        end

        subgraph RIGHT["右ペイン：結果入力"]
            CaseContent["テストケース内容表示<br/>手順 / 期待結果"]
            subgraph RESULT["結果入力エリア"]
                ResultBtn["✅Pass ❌Fail ➖N/A ⏸Block ⏳保留"]
                Timer["⏱ ストップウォッチ"]
                Comment["コメント WYSIWYG入力"]
                Attachment["📎 添付ファイル / クリップボード貼付"]
                Reproducible{"再現性"}
                BugLink["🐛 バグ登録・紐付け"]
            end
        end

        subgraph ACTIONS["アクション"]
            direction LR
            BulkInput["一括入力モード"]
            ReRun["🔄 Re-Run"]
            CloseRun["🔒 テストランクローズ"]
        end
    end

    HDR --> LEFT
    HDR --> RIGHT
    LEFT --> ACTIONS
    RIGHT --> ACTIONS
```

---

## 7. バグ・課題管理画面（S-1101〜S-1109）

```mermaid
flowchart TD
    subgraph BTOOLBAR["ツールバー"]
        direction LR
        BT1["＋ 新規登録"] --- BT2["🔍 フィルター"]
        BT3["📊 サマリー"] --- BT4["🔗 Jira/Redmine同期"]
    end

    subgraph BUGLIST["バグ一覧グリッド"]
        BugGrid["ID / タイトル / 種別 / ステータス<br/>担当者 / 優先度 / 作成日 / 期限"]
    end

    subgraph BUGDETAIL["バグ詳細"]
        direction LR
        subgraph DL["左：基本情報"]
            BugInfo["タイトル / 種別<br/>ステータス / 担当者<br/>優先度 / 再現手順<br/>期待結果 / 実際結果"]
            WorkFlow["ワークフロー遷移ボタン"]
        end
        subgraph DR["右：付帯情報"]
            SubTasks["📋 サブタスク"]
            Comments["💬 コメント/Q&A"]
            History["📜 変更履歴"]
            LinkedTC["🔗 関連TC"]
            WorkTime["⏱ 作業時間"]
        end
    end

    BTOOLBAR --> BUGLIST --> BUGDETAIL
```

---

## 8. ガントチャート画面（S-0102, S-0108）

```mermaid
flowchart TD
    subgraph GTOOLBAR["ツールバー"]
        direction LR
        GT1["📅 今日へ移動"] --- GT2["🔍 ズーム切替"]
        GT3["＋ マイルストーン"] --- GT4["⬇ エクスポート"]
    end

    subgraph TASKLIST["左ペイン：タスク一覧"]
        direction LR
        TaskList["タスク名 / 担当者<br/>開始日 / 終了日 / 重要度"]
        AddTask["＋ タスク追加"]
    end

    subgraph CHARTAREA["右ペイン：チャートエリア"]
        direction LR
        TimeAxis["日付軸 日/週/月 切替"] --- GanttBars["ガントバー D&D操作"]
        MilestoneMark["◆ マイルストーン"] --- Dependencies["→ 依存関係矢印"]
    end

    GTOOLBAR --> TASKLIST --> CHARTAREA
```

---

## 9. 分析・レポート画面（S-1401〜S-1411）

```mermaid
flowchart TD
    subgraph TABS["グラフ選択タブ"]
        direction LR
        T1["📈 テスト進捗"] --- T2["🥧 サマリー"]
        T3["📉 累積不具合"] --- T4["🔥 バーンダウン"]
        T5["📐 信頼度成長曲線"] --- T6["⚙ MTBF/MTTF"]
        T7["🔬 ODC分析"] --- T8["👤 実行者分析"]
    end

    subgraph FILTER["フィルター"]
        direction LR
        F1["対象期間"] --- F2["対象工程/仕様書"]
        F3["担当者/チーム"] --- F4["環境別集計"]
    end

    subgraph CHART["グラフエリア"]
        direction LR
        ChartArea["インタラクティブグラフ<br/>ホバーで詳細値表示"]
        DLChart["🖼 グラフ画像DL"]
    end

    subgraph REPORT["レポート出力"]
        direction LR
        ExportPDF["📄 PDF"] --- ExportExcel["📊 Excel"]
        ReportType["クロスPJ/ケース<br/>欠陥/結果/サマリー"]
    end

    TABS --> FILTER --> CHART --> REPORT
```

---

## 10. システム管理画面（S-2001〜S-2007, S-2201〜S-2205）

```mermaid
flowchart TD
    subgraph SYSADMIN["システム管理（管理者専用）"]
        subgraph USERMGMT["ユーザー管理"]
            UM1["ユーザー一覧: 名前/メール/ロール/ステータス"]
            UM2["+ ユーザー招待 メール/CSV一括"]
            UM3["ロール割当: 管理者/メンバー/ゲスト"]
            UM4["グループ・勤務地設定"]
        end

        subgraph SECURITY["セキュリティ設定"]
            SS1["パスワードポリシー<br/>最小文字数/文字種/有効期間/ロック"]
            SS2["多要素認証 MFA<br/>メール/TOTP"]
            SS3["セッションタイムアウト設定"]
            SS4["SSO設定<br/>Azure AD/Google/Okta/ADFS"]
        end

        subgraph CUSTOMIZE["システムカスタマイズ"]
            SC1["カスタムフィールド管理<br/>テキスト/プルダウン/チェックボックス"]
            SC2["ワークフロー管理<br/>ステータス遷移定義"]
            SC3["ロゴ・テーマカラー設定"]
            SC4["言語設定 日本語/多言語"]
            SC5["メールテンプレート Enterprise"]
        end

        subgraph APIMGMT["API管理"]
            API1["APIトークン発行・管理"]
            API2["有効化/無効化"]
            API3["トライアル実行"]
        end

        subgraph AUDITLOG["監査ログ"]
            AL1["操作ログ一覧<br/>ユーザー/操作内容/日時/IPアドレス"]
            AL2["ログエクスポート CSV"]
        end
    end
```

---

## 11. 画面別アクセス権限マトリクス

```mermaid
flowchart TD
    subgraph ALL["👁 閲覧可能（全ロール）"]
        direction LR
        V1["ダッシュボード"] --- V2["テスト仕様書閲覧"]
        V3["テストラン閲覧"] --- V4["進捗グラフ閲覧"]
    end

    subgraph MEMBER["✏️ 編集可能（メンバー以上）"]
        direction LR
        E1["テストケース 作成・編集"] --- E2["テスト結果 登録"]
        E3["バグ 登録・編集"] --- E4["コメント 投稿"]
    end

    subgraph PADMIN["🔧 管理操作（PJ管理者以上）"]
        direction LR
        M1["プロジェクト設定"] --- M2["ユーザー招待"]
        M3["ロール設定"] --- M4["仕様書 移動・削除"]
    end

    subgraph SADMIN["👑 システム操作（管理者のみ）"]
        direction LR
        S1["システム設定"] --- S2["カタログ削除"]
        S3["監査ログ参照"] --- S4["API管理"]
    end

    ALL --> MEMBER --> PADMIN --> SADMIN
```

---

## 12. 入力コンポーネント仕様

```mermaid
flowchart TD
    subgraph RTE["リッチテキスト MDXEditor"]
        direction LR
        RTE1["見出し H1〜H4"] --- RTE2["太字・斜体・下線"]
        RTE3["テーブル 挿入・編集"] --- RTE4["画像 貼付・UP"]
        RTE5["コードブロック"] --- RTE6["箇条書き・リスト"]
        RTE7["Markdown変換保存"]
    end

    subgraph ELG["Excelライクグリッド"]
        direction LR
        ELG1["インライン編集"] --- ELG2["列幅調整"]
        ELG3["ソート・フィルター"] --- ELG4["コピー&ペースト"]
        ELG5["行の追加・削除"]
    end

    subgraph DnD["ドラッグ&ドロップ"]
        direction LR
        DnD1["セクションツリー並び替え"] --- DnD2["ガントバー移動"]
        DnD3["ダッシュボードウィジェット"]
    end

    RTE --> ELG --> DnD
```

---

*本GUI仕様書はMermaid図形式で画面構成・遷移・機能を定義しています。*
*詳細なワイヤーフレームは別途UI設計書（Figma等）で管理します。*
