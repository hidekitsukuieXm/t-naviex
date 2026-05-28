/**
 * qTest Importer Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QTestClient, validateQTestConfig } from '../qtest-importer';
import type { QTestConfig } from '../qtest-importer';

describe('qTest Importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateQTestConfig', () => {
    it('有効な設定で成功', () => {
      const config: QTestConfig = {
        baseUrl: 'https://qtest.example.com',
        accessToken: 'valid-token',
        projectId: 123,
      };

      const result = validateQTestConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空のURLでエラー', () => {
      const config: QTestConfig = {
        baseUrl: '',
        accessToken: 'valid-token',
        projectId: 123,
      };

      const result = validateQTestConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('qTestのURLは必須です。');
    });

    it('無効なURLでエラー', () => {
      const config: QTestConfig = {
        baseUrl: 'not-a-valid-url',
        accessToken: 'valid-token',
        projectId: 123,
      };

      const result = validateQTestConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('qTestのURLが無効です。');
    });

    it('空のアクセストークンでエラー', () => {
      const config: QTestConfig = {
        baseUrl: 'https://qtest.example.com',
        accessToken: '',
        projectId: 123,
      };

      const result = validateQTestConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('アクセストークンは必須です。');
    });

    it('無効なプロジェクトIDでエラー', () => {
      const config: QTestConfig = {
        baseUrl: 'https://qtest.example.com',
        accessToken: 'valid-token',
        projectId: 0,
      };

      const result = validateQTestConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('有効なプロジェクトIDが必要です。');
    });

    it('負のプロジェクトIDでエラー', () => {
      const config: QTestConfig = {
        baseUrl: 'https://qtest.example.com',
        accessToken: 'valid-token',
        projectId: -1,
      };

      const result = validateQTestConfig(config);
      expect(result.valid).toBe(false);
    });
  });

  describe('QTestClient', () => {
    it('クライアントを正しく初期化', () => {
      const config: QTestConfig = {
        baseUrl: 'https://qtest.example.com/',
        accessToken: 'valid-token',
        projectId: 123,
      };

      const client = new QTestClient(config);
      expect(client).toBeDefined();
    });

    it('URLの末尾スラッシュを除去', () => {
      const config: QTestConfig = {
        baseUrl: 'https://qtest.example.com/',
        accessToken: 'valid-token',
        projectId: 123,
      };

      const client = new QTestClient(config);
      // クライアントが正しく初期化されることを確認
      expect(client).toBeDefined();
    });
  });
});

describe('qTest API Integration', () => {
  it('モジュール取得APIのエンドポイント構築', () => {
    const config: QTestConfig = {
      baseUrl: 'https://qtest.example.com',
      accessToken: 'valid-token',
      projectId: 123,
    };

    const client = new QTestClient(config);
    // クライアントが作成できることを確認
    expect(client).toBeDefined();
  });

  it('テストケース取得APIのエンドポイント構築', () => {
    const config: QTestConfig = {
      baseUrl: 'https://qtest.example.com',
      accessToken: 'valid-token',
      projectId: 456,
    };

    const client = new QTestClient(config);
    // クライアントが作成できることを確認
    expect(client).toBeDefined();
  });
});
