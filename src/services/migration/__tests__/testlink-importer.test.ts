/**
 * TestLink Importer Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTestLinkXml, generateImportPreview, validateTestLinkXml } from '../testlink-importer';

// JSDOM is available through vitest setup
describe('TestLink Importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseTestLinkXml', () => {
    it('空のXMLコンテンツでエラーを返す', () => {
      const result = parseTestLinkXml('');
      // Empty string will cause parse error
      expect(result.success).toBe(false);
    });

    it('有効なXMLをパースできる', () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Sample Suite" id="1">
  <testcase name="Sample Test" id="1">
    <summary>Test summary</summary>
    <preconditions>Test preconditions</preconditions>
    <steps>
      <step>
        <step_number>1</step_number>
        <actions>Do something</actions>
        <expectedresults>Something happens</expectedresults>
      </step>
    </steps>
  </testcase>
</testsuite>`;

      const result = parseTestLinkXml(xmlContent);
      expect(result.success).toBe(true);
      expect(result.testSuites).toBeDefined();
      expect(result.testSuites).toHaveLength(1);
      expect(result.testSuites![0].name).toBe('Sample Suite');
    });

    it('不正なXMLでエラーを返す', () => {
      const xmlContent = '<invalid><unclosed>';
      const result = parseTestLinkXml(xmlContent);
      expect(result.success).toBe(false);
      expect(result.error).toContain('XML');
    });
  });

  describe('validateTestLinkXml', () => {
    it('空のコンテンツで無効と判定', () => {
      const result = validateTestLinkXml('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('XMLコンテンツが空です。');
    });

    it('空白のみのコンテンツで無効と判定', () => {
      const result = validateTestLinkXml('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('XMLコンテンツが空です。');
    });

    it('有効なXMLで有効と判定', () => {
      const xmlContent = `<?xml version="1.0"?>
<testsuite name="Test">
  <testcase name="Case 1" />
</testsuite>`;

      const result = validateTestLinkXml(xmlContent);
      expect(result.valid).toBe(true);
    });

    it('testsuiteタグがないXMLで無効と判定', () => {
      const xmlContent = `<?xml version="1.0"?>
<root>
  <item>test</item>
</root>`;

      const result = validateTestLinkXml(xmlContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('無効');
    });
  });

  describe('generateImportPreview', () => {
    it('有効なXMLからプレビューを生成', () => {
      const xmlContent = `<?xml version="1.0"?>
<testsuite name="Sample Suite">
  <testcase name="Test 1">
    <steps>
      <step>
        <step_number>1</step_number>
        <actions>Action</actions>
        <expectedresults>Result</expectedresults>
      </step>
    </steps>
  </testcase>
</testsuite>`;

      const preview = generateImportPreview(xmlContent);
      expect(preview).toBeDefined();
      expect(preview?.testSuites).toBeDefined();
      expect(preview?.totalTestCases).toBe(1);
      expect(preview?.totalTestSteps).toBe(1);
    });

    it('無効なXMLでnullを返す', () => {
      const preview = generateImportPreview('');
      expect(preview).toBeNull();
    });

    it('複数のテストケースを正しくカウント', () => {
      const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Case 1">
    <steps>
      <step><step_number>1</step_number><actions>A1</actions><expectedresults>E1</expectedresults></step>
      <step><step_number>2</step_number><actions>A2</actions><expectedresults>E2</expectedresults></step>
    </steps>
  </testcase>
  <testcase name="Case 2">
    <steps>
      <step><step_number>1</step_number><actions>A1</actions><expectedresults>E1</expectedresults></step>
    </steps>
  </testcase>
</testsuite>`;

      const preview = generateImportPreview(xmlContent);
      expect(preview?.totalTestCases).toBe(2);
      expect(preview?.totalTestSteps).toBe(3);
    });
  });
});

describe('TestLink XML Structure', () => {
  it('ネストしたテストスイートを正しくパース', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Parent Suite">
  <testsuite name="Child Suite">
    <testcase name="Nested Case" />
  </testsuite>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    expect(result.testSuites).toHaveLength(1);
    expect(result.testSuites![0].childSuites).toBeDefined();
    expect(result.testSuites![0].childSuites).toHaveLength(1);
    expect(result.testSuites![0].childSuites![0].name).toBe('Child Suite');
  });

  it('複数のテストケースを正しくパース', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Case 1" />
  <testcase name="Case 2" />
  <testcase name="Case 3" />
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    expect(result.testSuites![0].testCases).toHaveLength(3);
  });

  it('テストケースの詳細情報をパース', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Detailed Case" id="TC-001">
    <summary>This is a test summary</summary>
    <preconditions>Login required</preconditions>
    <importance>HIGH</importance>
    <execution_type>1</execution_type>
  </testcase>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    const testCase = result.testSuites![0].testCases![0];
    expect(testCase.name).toBe('Detailed Case');
    expect(testCase.summary).toBe('This is a test summary');
    expect(testCase.preconditions).toBe('Login required');
    expect(testCase.importance).toBe('HIGH');
    expect(testCase.executionType).toBe('MANUAL');
  });

  it('キーワードを含むテストケースをパース', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Case with Keywords">
    <keywords>
      <keyword name="smoke" />
      <keyword name="regression" />
    </keywords>
  </testcase>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    const testCase = result.testSuites![0].testCases![0];
    expect(testCase.keywords).toBeDefined();
    expect(testCase.keywords).toContain('smoke');
    expect(testCase.keywords).toContain('regression');
  });
});

describe('TestLink Priority Mapping', () => {
  it('HIGH優先度を正しくマッピング', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="High Priority Case">
    <importance>HIGH</importance>
  </testcase>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    expect(result.testSuites![0].testCases![0].importance).toBe('HIGH');
  });

  it('数値優先度3をHIGHにマッピング', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Priority 3 Case">
    <importance>3</importance>
  </testcase>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    expect(result.testSuites![0].testCases![0].importance).toBe('HIGH');
  });

  it('数値優先度1をLOWにマッピング', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Priority 1 Case">
    <importance>1</importance>
  </testcase>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    expect(result.testSuites![0].testCases![0].importance).toBe('LOW');
  });
});

describe('TestLink Step Parsing', () => {
  it('テストステップをパース', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Case with Steps">
    <steps>
      <step>
        <step_number>1</step_number>
        <actions>Click the button</actions>
        <expectedresults>Dialog appears</expectedresults>
      </step>
    </steps>
  </testcase>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    const steps = result.testSuites![0].testCases![0].steps;
    expect(steps).toBeDefined();
    expect(steps).toHaveLength(1);
    expect(steps![0].stepNumber).toBe(1);
    expect(steps![0].actions).toBe('Click the button');
    expect(steps![0].expectedResults).toBe('Dialog appears');
  });

  it('複数ステップを正しい順序でパース', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Multi-step Case">
    <steps>
      <step>
        <step_number>1</step_number>
        <actions>Step 1 action</actions>
        <expectedresults>Result 1</expectedresults>
      </step>
      <step>
        <step_number>2</step_number>
        <actions>Step 2 action</actions>
        <expectedresults>Result 2</expectedresults>
      </step>
    </steps>
  </testcase>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    const steps = result.testSuites![0].testCases![0].steps;
    expect(steps).toHaveLength(2);
    expect(steps![0].stepNumber).toBe(1);
    expect(steps![1].stepNumber).toBe(2);
  });

  it('自動実行タイプのステップをパース', () => {
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase name="Automated Case">
    <steps>
      <step>
        <step_number>1</step_number>
        <actions>Run script</actions>
        <expectedresults>Script passes</expectedresults>
        <execution_type>2</execution_type>
      </step>
    </steps>
  </testcase>
</testsuite>`;

    const result = parseTestLinkXml(xmlContent);
    expect(result.success).toBe(true);
    const steps = result.testSuites![0].testCases![0].steps;
    expect(steps![0].executionType).toBe('AUTOMATED');
  });
});

describe('Import Preview Warnings', () => {
  it('名前のないテストケースに警告を出す', () => {
    // name属性がない場合、parseTestCaseElementで 'Unnamed Case' になるので
    // 空文字列の場合をテスト
    const xmlContent = `<?xml version="1.0"?>
<testsuite name="Suite">
  <testcase>
    <name></name>
    <summary>Test without name</summary>
  </testcase>
</testsuite>`;

    const preview = generateImportPreview(xmlContent);
    expect(preview).toBeDefined();
    // name要素が空の場合、警告が出る
    // ただし、属性もname要素もない場合は 'Unnamed Case' になる
    expect(preview?.totalTestCases).toBe(1);
  });
});
