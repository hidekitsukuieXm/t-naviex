/**
 * Gherkin Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseGherkin, serializeGherkin, validateGherkin, formatGherkin } from '../gherkin-parser';

describe('Gherkin Parser', () => {
  describe('parseGherkin', () => {
    it('日本語のFeatureをパースできる', () => {
      const text = `機能: ログイン機能
  ユーザーがシステムにログインできること

  シナリオ: 正常なログイン
    前提 ユーザーがログイン画面にいる
    もし 有効な認証情報を入力する
    ならば ダッシュボードが表示される`;

      const doc = parseGherkin(text, 'ja');

      expect(doc.feature).toBeDefined();
      expect(doc.feature?.name).toBe('ログイン機能');
      expect(doc.feature?.language).toBe('ja');
      expect(doc.feature?.scenarios).toHaveLength(1);
      expect(doc.feature?.scenarios[0].name).toBe('正常なログイン');
      expect(doc.feature?.scenarios[0].steps).toHaveLength(3);
    });

    it('英語のFeatureをパースできる', () => {
      const text = `Feature: Login functionality
  Users can log into the system

  Scenario: Successful login
    Given User is on the login page
    When User enters valid credentials
    Then Dashboard is displayed`;

      const doc = parseGherkin(text, 'en');

      expect(doc.feature).toBeDefined();
      expect(doc.feature?.name).toBe('Login functionality');
      expect(doc.feature?.language).toBe('en');
      expect(doc.feature?.scenarios).toHaveLength(1);
    });

    it('タグをパースできる', () => {
      const text = `@login @smoke
機能: ログイン機能

  @positive
  シナリオ: 正常なログイン
    前提 ユーザーがいる`;

      const doc = parseGherkin(text, 'ja');

      expect(doc.feature?.tags).toContain('@login');
      expect(doc.feature?.tags).toContain('@smoke');
      expect(doc.feature?.scenarios[0].tags).toContain('@positive');
    });

    it('背景（Background）をパースできる', () => {
      const text = `機能: テスト機能

  背景:
    前提 システムが起動している
    かつ ユーザーがログインしている

  シナリオ: テスト
    もし 操作する`;

      const doc = parseGherkin(text, 'ja');

      expect(doc.feature?.background).toBeDefined();
      expect(doc.feature?.background?.steps).toHaveLength(2);
    });

    it('シナリオアウトラインをパースできる', () => {
      const text = `機能: ログイン機能

  シナリオアウトライン: 複数パターンのログイン
    前提 ユーザーが<画面>にいる
    もし <ユーザー名>でログインする
    ならば <結果>が表示される

  例:
    | 画面       | ユーザー名 | 結果       |
    | ログイン画面 | admin     | ダッシュボード |
    | ログイン画面 | guest     | エラー      |`;

      const doc = parseGherkin(text, 'ja');

      expect(doc.feature?.scenarios).toHaveLength(1);
      const scenario = doc.feature?.scenarios[0];
      expect('examples' in scenario!).toBe(true);

      const outline = scenario as {
        examples: { table: { headers: string[]; rows: string[][] } }[];
      };
      expect(outline.examples).toHaveLength(1);
      expect(outline.examples[0].table.headers).toContain('画面');
      expect(outline.examples[0].table.rows).toHaveLength(2);
    });

    it('データテーブルをパースできる', () => {
      const text = `機能: テスト

  シナリオ: テスト
    前提 以下のユーザーが存在する
      | 名前   | メール            |
      | 田中   | tanaka@example.com |
      | 鈴木   | suzuki@example.com |`;

      const doc = parseGherkin(text, 'ja');

      const step = doc.feature?.scenarios[0].steps[0];
      expect(step?.dataTable).toBeDefined();
      expect(step?.dataTable?.headers).toContain('名前');
      expect(step?.dataTable?.rows).toHaveLength(2);
    });

    it('Doc Stringをパースできる', () => {
      const text = `機能: テスト

  シナリオ: テスト
    前提 以下のJSONデータ
      """
      {
        "name": "test",
        "value": 123
      }
      """`;

      const doc = parseGherkin(text, 'ja');

      const step = doc.feature?.scenarios[0].steps[0];
      expect(step?.docString).toBeDefined();
      expect(step?.docString).toContain('"name": "test"');
    });

    it('コメントをパースできる', () => {
      const text = `# これはコメントです
機能: テスト
  # 機能の説明

  シナリオ: テスト
    # ステップのコメント
    前提 テスト`;

      const doc = parseGherkin(text, 'ja');

      expect(doc.comments).toHaveLength(3);
      expect(doc.comments[0].text).toBe('これはコメントです');
    });

    it('And/But ステップをパースできる', () => {
      const text = `機能: テスト

  シナリオ: テスト
    前提 条件1
    かつ 条件2
    しかし 条件3ではない`;

      const doc = parseGherkin(text, 'ja');

      const steps = doc.feature?.scenarios[0].steps;
      expect(steps?.[0].type).toBe('GIVEN');
      expect(steps?.[1].type).toBe('AND');
      expect(steps?.[2].type).toBe('BUT');
    });
  });

  describe('serializeGherkin', () => {
    it('パースしたドキュメントをテキストに戻せる', () => {
      const originalText = `機能: テスト機能
  テストの説明

  シナリオ: テストシナリオ
    前提 条件がある
    もし アクションを実行
    ならば 結果が得られる`;

      const doc = parseGherkin(originalText, 'ja');
      const serialized = serializeGherkin(doc);

      expect(serialized).toContain('機能: テスト機能');
      expect(serialized).toContain('シナリオ: テストシナリオ');
      expect(serialized).toContain('前提 条件がある');
    });

    it('タグを含めてシリアライズできる', () => {
      const text = `@tag1 @tag2
機能: テスト`;

      const doc = parseGherkin(text, 'ja');
      const serialized = serializeGherkin(doc, { includeTags: true });

      expect(serialized).toContain('@tag1');
      expect(serialized).toContain('@tag2');
    });

    it('タグを除外してシリアライズできる', () => {
      const text = `@tag1
機能: テスト`;

      const doc = parseGherkin(text, 'ja');
      const serialized = serializeGherkin(doc, { includeTags: false });

      expect(serialized).not.toContain('@tag1');
    });
  });

  describe('validateGherkin', () => {
    it('有効なドキュメントはエラーなし', () => {
      const text = `機能: テスト

  シナリオ: テスト
    前提 条件`;

      const doc = parseGherkin(text, 'ja');
      const errors = validateGherkin(doc);

      expect(errors).toHaveLength(0);
    });

    it('Featureがない場合エラー', () => {
      const doc = parseGherkin('# コメントのみ', 'ja');
      const errors = validateGherkin(doc);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('Feature'))).toBe(true);
    });

    it('Feature名が空の場合エラー', () => {
      const text = `機能:

  シナリオ: テスト
    前提 条件`;

      const doc = parseGherkin(text, 'ja');
      const errors = validateGherkin(doc);

      expect(errors.some((e) => e.message.includes('Feature名'))).toBe(true);
    });

    it('Scenarioがない場合エラー', () => {
      const text = `機能: テスト`;

      const doc = parseGherkin(text, 'ja');
      const errors = validateGherkin(doc);

      expect(errors.some((e) => e.message.includes('Scenario'))).toBe(true);
    });

    it('Scenarioにステップがない場合エラー', () => {
      const text = `機能: テスト

  シナリオ: 空のシナリオ`;

      const doc = parseGherkin(text, 'ja');
      const errors = validateGherkin(doc);

      expect(errors.some((e) => e.message.includes('ステップ'))).toBe(true);
    });

    it('Scenario OutlineにExamplesがない場合エラー', () => {
      const text = `機能: テスト

  シナリオアウトライン: テスト
    前提 <パラメータ>がある`;

      const doc = parseGherkin(text, 'ja');
      const errors = validateGherkin(doc);

      expect(errors.some((e) => e.message.includes('Examples'))).toBe(true);
    });

    it('プレースホルダーがExamplesにない場合エラー', () => {
      const text = `機能: テスト

  シナリオアウトライン: テスト
    前提 <存在しない>がある

  例:
    | 別の列 |
    | 値    |`;

      const doc = parseGherkin(text, 'ja');
      const errors = validateGherkin(doc);

      expect(errors.some((e) => e.message.includes('プレースホルダー'))).toBe(true);
    });
  });

  describe('formatGherkin', () => {
    it('インデントを整形できる', () => {
      const text = `機能: テスト
シナリオ: テスト
前提 条件`;

      const formatted = formatGherkin(text, 'ja');

      expect(formatted).toContain('  シナリオ:');
      expect(formatted).toContain('    前提');
    });
  });
});
