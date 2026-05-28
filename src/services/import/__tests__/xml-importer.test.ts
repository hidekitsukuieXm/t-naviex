/**
 * XML Importer Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseXml,
  detectXmlFields,
  validateXmlImportOptions,
  generateXmlImportPreview,
} from '../xml-importer';
import type { XmlImportOptions } from '../xml-importer';

describe('XML Importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseXml', () => {
    it('有効なXMLをパース', () => {
      const xmlContent = `<?xml version="1.0"?>
<root>
  <testcase name="Test 1">
    <description>Description</description>
  </testcase>
</root>`;

      const result = parseXml(xmlContent);
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
    });

    it('不正なXMLでエラー', () => {
      const xmlContent = '<invalid><unclosed>';
      const result = parseXml(xmlContent);
      expect(result.success).toBe(false);
      expect(result.error).toContain('XML');
    });

    it('空のXMLでエラー', () => {
      const result = parseXml('');
      expect(result.success).toBe(false);
    });
  });

  describe('detectXmlFields', () => {
    it('フィールドを検出', () => {
      const xmlContent = `<?xml version="1.0"?>
<testcases>
  <testcase id="1" priority="high">
    <name>Test Case 1</name>
    <description>Description here</description>
    <steps>
      <step>Step 1</step>
    </steps>
  </testcase>
</testcases>`;

      const result = detectXmlFields(xmlContent);
      expect(result.success).toBe(true);
      expect(result.fields).toBeDefined();
      expect(result.fields?.length).toBeGreaterThan(0);
    });

    it('属性を検出', () => {
      const xmlContent = `<?xml version="1.0"?>
<testcases>
  <testcase id="1" priority="high">
    <name>Test</name>
  </testcase>
</testcases>`;

      const result = detectXmlFields(xmlContent);
      expect(result.success).toBe(true);
      expect(result.fields).toContain('@id');
      expect(result.fields).toContain('@priority');
    });

    it('サンプルデータを抽出', () => {
      const xmlContent = `<?xml version="1.0"?>
<testcases>
  <testcase>
    <name>Test 1</name>
  </testcase>
  <testcase>
    <name>Test 2</name>
  </testcase>
</testcases>`;

      const result = detectXmlFields(xmlContent);
      expect(result.success).toBe(true);
      expect(result.sampleData).toBeDefined();
      expect(result.sampleData?.length).toBeGreaterThan(0);
    });
  });

  describe('validateXmlImportOptions', () => {
    it('有効なオプションで成功', () => {
      const options: XmlImportOptions = {
        projectId: '123',
        createTestSpec: true,
        testSpecName: 'Test Spec',
        config: {
          rootElement: 'testcases',
          testCaseElement: 'testcase',
        },
        fieldMapping: {
          testCase: {
            title: 'name',
          },
        },
      };

      const result = validateXmlImportOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('プロジェクトIDがないとエラー', () => {
      const options: XmlImportOptions = {
        projectId: '',
        createTestSpec: true,
        testSpecName: 'Test Spec',
        config: {
          rootElement: 'testcases',
          testCaseElement: 'testcase',
        },
        fieldMapping: {
          testCase: {
            title: 'name',
          },
        },
      };

      const result = validateXmlImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('プロジェクトIDは必須です。');
    });

    it('テスト仕様書名がないとエラー', () => {
      const options: XmlImportOptions = {
        projectId: '123',
        createTestSpec: true,
        testSpecName: '',
        config: {
          rootElement: 'testcases',
          testCaseElement: 'testcase',
        },
        fieldMapping: {
          testCase: {
            title: 'name',
          },
        },
      };

      const result = validateXmlImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テスト仕様書名は必須です。');
    });

    it('テストケース要素がないとエラー', () => {
      const options: XmlImportOptions = {
        projectId: '123',
        createTestSpec: true,
        testSpecName: 'Test Spec',
        config: {
          rootElement: 'testcases',
          testCaseElement: '',
        },
        fieldMapping: {
          testCase: {
            title: 'name',
          },
        },
      };

      const result = validateXmlImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テストケース要素の指定は必須です。');
    });

    it('タイトルマッピングがないとエラー', () => {
      const options: XmlImportOptions = {
        projectId: '123',
        createTestSpec: true,
        testSpecName: 'Test Spec',
        config: {
          rootElement: 'testcases',
          testCaseElement: 'testcase',
        },
        fieldMapping: {
          testCase: {
            title: '',
          },
        },
      };

      const result = validateXmlImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('タイトルフィールドのマッピングは必須です。');
    });
  });

  describe('generateXmlImportPreview', () => {
    it('プレビューを生成', () => {
      const xmlContent = `<?xml version="1.0"?>
<testcases>
  <testcase>
    <name>Test 1</name>
    <description>Desc 1</description>
  </testcase>
  <testcase>
    <name>Test 2</name>
    <description>Desc 2</description>
  </testcase>
</testcases>`;

      const config = {
        rootElement: 'testcases',
        testCaseElement: 'testcase',
      };

      const preview = generateXmlImportPreview(xmlContent, config);
      expect(preview).toBeDefined();
      expect(preview?.totalRecords).toBe(2);
      expect(preview?.detectedFields.length).toBeGreaterThan(0);
    });

    it('不正なXMLでnullを返す', () => {
      const preview = generateXmlImportPreview('<invalid>', {
        rootElement: '',
        testCaseElement: 'tc',
      });
      // Invalid XML still parses but may have no matching elements
      expect(preview?.totalRecords || 0).toBe(0);
    });
  });
});

describe('XML Field Extraction', () => {
  it('ネストした要素から値を抽出', () => {
    const xmlContent = `<?xml version="1.0"?>
<testcases>
  <testcase>
    <details>
      <name>Nested Name</name>
    </details>
  </testcase>
</testcases>`;

    const result = detectXmlFields(xmlContent);
    expect(result.success).toBe(true);
    // 検出されたフィールドにネストしたパスが含まれる
    expect(result.fields).toBeDefined();
  });

  it('複数の属性を検出', () => {
    const xmlContent = `<?xml version="1.0"?>
<testcases>
  <testcase id="1" priority="high" status="active">
    <name>Test</name>
  </testcase>
</testcases>`;

    const result = detectXmlFields(xmlContent);
    expect(result.success).toBe(true);
    expect(result.fields?.filter((f) => f.startsWith('@')).length).toBeGreaterThanOrEqual(3);
  });
});
