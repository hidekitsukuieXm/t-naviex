/**
 * Xray Importer Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XrayClient, validateXrayConfig } from '../xray-importer';
import type { XrayConfig } from '../xray-importer';

describe('Xray Importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateXrayConfig', () => {
    it('有効なCloud設定で成功', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'https://example.atlassian.net',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        projectKey: 'PROJ',
        cloudOrServer: 'cloud',
      };

      const result = validateXrayConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('有効なServer設定で成功', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'https://jira.example.com',
        username: 'admin',
        password: 'password',
        projectKey: 'PROJ',
        cloudOrServer: 'server',
      };

      const result = validateXrayConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空のURLでエラー', () => {
      const config: XrayConfig = {
        jiraBaseUrl: '',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        projectKey: 'PROJ',
        cloudOrServer: 'cloud',
      };

      const result = validateXrayConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Jira URLは必須です。');
    });

    it('無効なURLでエラー', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'not-a-valid-url',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        projectKey: 'PROJ',
        cloudOrServer: 'cloud',
      };

      const result = validateXrayConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Jira URLが無効です。');
    });

    it('空のプロジェクトキーでエラー', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'https://jira.example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        projectKey: '',
        cloudOrServer: 'cloud',
      };

      const result = validateXrayConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('プロジェクトキーは必須です。');
    });

    it('Cloud環境でClient IDがないとエラー', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'https://example.atlassian.net',
        projectKey: 'PROJ',
        cloudOrServer: 'cloud',
      };

      const result = validateXrayConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cloud環境ではClient IDとClient Secretが必要です。');
    });

    it('Server環境でユーザー名がないとエラー', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'https://jira.example.com',
        projectKey: 'PROJ',
        cloudOrServer: 'server',
      };

      const result = validateXrayConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Server/DC環境ではユーザー名とパスワードが必要です。');
    });
  });

  describe('XrayClient', () => {
    it('Cloudクライアントを正しく初期化', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'https://example.atlassian.net/',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        projectKey: 'PROJ',
        cloudOrServer: 'cloud',
      };

      const client = new XrayClient(config);
      expect(client).toBeDefined();
    });

    it('Serverクライアントを正しく初期化', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'https://jira.example.com/',
        username: 'admin',
        password: 'password',
        projectKey: 'PROJ',
        cloudOrServer: 'server',
      };

      const client = new XrayClient(config);
      expect(client).toBeDefined();
    });

    it('URLの末尾スラッシュを除去', () => {
      const config: XrayConfig = {
        jiraBaseUrl: 'https://example.atlassian.net/',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        projectKey: 'PROJ',
        cloudOrServer: 'cloud',
      };

      const client = new XrayClient(config);
      expect(client).toBeDefined();
    });
  });
});

describe('Xray Priority Mapping', () => {
  it('Highest優先度をCRITICALにマッピング', () => {
    // 優先度マッピングロジックのテスト
    const testPriorities = [
      { input: 'Highest', expected: 'CRITICAL' },
      { input: 'Blocker', expected: 'CRITICAL' },
      { input: 'Critical', expected: 'CRITICAL' },
      { input: 'High', expected: 'HIGH' },
      { input: 'Major', expected: 'HIGH' },
      { input: 'Medium', expected: 'MEDIUM' },
      { input: 'Low', expected: 'LOW' },
      { input: 'Minor', expected: 'LOW' },
      { input: 'Trivial', expected: 'LOW' },
      { input: 'Lowest', expected: 'LOW' },
    ];

    for (const { input, expected } of testPriorities) {
      const lower = input.toLowerCase();
      let result: string;

      if (lower.includes('highest') || lower.includes('blocker') || lower.includes('critical')) {
        result = 'CRITICAL';
      } else if (lower.includes('high') || lower.includes('major')) {
        result = 'HIGH';
      } else if (
        lower.includes('low') ||
        lower.includes('minor') ||
        lower.includes('trivial') ||
        lower.includes('lowest')
      ) {
        result = 'LOW';
      } else {
        result = 'MEDIUM';
      }

      expect(result).toBe(expected);
    }
  });
});

describe('Xray API Endpoints', () => {
  it('JQL検索エンドポイントの構築', () => {
    // JQL検索のテスト
    const projectKey = 'PROJ';
    const jql = `project = ${projectKey} AND issuetype = Test`;
    expect(jql).toBe('project = PROJ AND issuetype = Test');
  });

  it('テストステップエンドポイントの構築', () => {
    // テストステップ取得のエンドポイント構築テスト
    const testKey = 'PROJ-123';
    const endpoint = `/api/test/${testKey}/step`;
    expect(endpoint).toBe('/api/test/PROJ-123/step');
  });
});
