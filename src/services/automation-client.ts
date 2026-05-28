/**
 * Automation Tool Client
 * Parses test results from various automation tools (Playwright, JUnit, TestNG)
 */

import { XMLParser } from 'fast-xml-parser';

// ============================================
// Common Types
// ============================================

export type TestResultStatus = 'passed' | 'failed' | 'skipped' | 'pending' | 'flaky';

export interface AutomationTestResult {
  name: string;
  suiteName?: string;
  className?: string;
  status: TestResultStatus;
  duration: number; // in milliseconds
  startTime?: string;
  endTime?: string;
  message?: string;
  errorMessage?: string;
  stackTrace?: string;
  retries?: number;
  attachments?: AutomationAttachment[];
  annotations?: AutomationAnnotation[];
  tags?: string[];
}

export interface AutomationAttachment {
  name: string;
  path?: string;
  contentType: string;
  body?: string;
}

export interface AutomationAnnotation {
  type: string;
  description?: string;
}

export interface AutomationSuite {
  name: string;
  tests: AutomationTestResult[];
  suites?: AutomationSuite[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  flaky: number;
  timestamp?: string;
}

export interface AutomationReport {
  format: 'playwright' | 'junit' | 'testng' | 'unknown';
  title?: string;
  suites: AutomationSuite[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
    flaky: number;
    duration: number;
  };
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface ParseResult {
  success: boolean;
  data?: AutomationReport;
  error?: string;
}

// ============================================
// Playwright JSON Parser
// ============================================

interface PlaywrightJsonReport {
  suites: PlaywrightSuite[];
  stats?: {
    startTime: string;
    duration: number;
    expected: number;
    skipped: number;
    unexpected: number;
    flaky: number;
  };
  config?: Record<string, unknown>;
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  line?: number;
  column?: number;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightSpec {
  title: string;
  ok: boolean;
  tags?: string[];
  tests: PlaywrightTest[];
}

interface PlaywrightTest {
  timeout: number;
  annotations?: Array<{ type: string; description?: string }>;
  expectedStatus: string;
  projectName?: string;
  results: PlaywrightTestResult[];
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
}

interface PlaywrightTestResult {
  workerIndex: number;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  startTime: string;
  retry: number;
  error?: {
    message?: string;
    stack?: string;
  };
  attachments?: Array<{
    name: string;
    path?: string;
    contentType: string;
    body?: string;
  }>;
}

export function parsePlaywrightJson(jsonString: string): ParseResult {
  try {
    const report: PlaywrightJsonReport = JSON.parse(jsonString);

    const parseSuite = (suite: PlaywrightSuite): AutomationSuite => {
      const tests: AutomationTestResult[] = [];

      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          const lastResult = test.results[test.results.length - 1];
          if (!lastResult) continue;

          let status: TestResultStatus;
          if (test.status === 'flaky') {
            status = 'flaky';
          } else if (test.status === 'skipped') {
            status = 'skipped';
          } else if (lastResult.status === 'passed') {
            status = 'passed';
          } else if (lastResult.status === 'skipped') {
            status = 'skipped';
          } else {
            status = 'failed';
          }

          tests.push({
            name: spec.title,
            suiteName: suite.title,
            status,
            duration: lastResult.duration,
            startTime: lastResult.startTime,
            message: lastResult.error?.message,
            errorMessage: lastResult.error?.message,
            stackTrace: lastResult.error?.stack,
            retries: lastResult.retry,
            tags: spec.tags,
            annotations: test.annotations?.map((a) => ({
              type: a.type,
              description: a.description,
            })),
            attachments: lastResult.attachments?.map((a) => ({
              name: a.name,
              path: a.path,
              contentType: a.contentType,
              body: a.body,
            })),
          });
        }
      }

      const childSuites = suite.suites?.map(parseSuite) || [];
      const allTests = [...tests, ...childSuites.flatMap((s) => s.tests)];

      return {
        name: suite.title,
        tests: allTests,
        suites: childSuites.length > 0 ? childSuites : undefined,
        duration: allTests.reduce((sum, t) => sum + t.duration, 0),
        passed: allTests.filter((t) => t.status === 'passed').length,
        failed: allTests.filter((t) => t.status === 'failed').length,
        skipped: allTests.filter((t) => t.status === 'skipped').length,
        pending: allTests.filter((t) => t.status === 'pending').length,
        flaky: allTests.filter((t) => t.status === 'flaky').length,
      };
    };

    const suites = report.suites.map(parseSuite);
    const allTests = suites.flatMap((s) => s.tests);

    return {
      success: true,
      data: {
        format: 'playwright',
        suites,
        summary: {
          total: allTests.length,
          passed: allTests.filter((t) => t.status === 'passed').length,
          failed: allTests.filter((t) => t.status === 'failed').length,
          skipped: allTests.filter((t) => t.status === 'skipped').length,
          pending: allTests.filter((t) => t.status === 'pending').length,
          flaky: allTests.filter((t) => t.status === 'flaky').length,
          duration: report.stats?.duration || allTests.reduce((sum, t) => sum + t.duration, 0),
        },
        timestamp: report.stats?.startTime,
        metadata: report.config,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Playwright JSONの解析に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================
// JUnit XML Parser
// ============================================

interface JUnitXml {
  testsuites?: {
    testsuite?: JUnitTestSuite | JUnitTestSuite[];
    '@_name'?: string;
    '@_time'?: string;
    '@_tests'?: string;
    '@_failures'?: string;
    '@_errors'?: string;
    '@_skipped'?: string;
  };
  testsuite?: JUnitTestSuite;
}

interface JUnitTestSuite {
  testcase?: JUnitTestCase | JUnitTestCase[];
  '@_name'?: string;
  '@_classname'?: string;
  '@_time'?: string;
  '@_tests'?: string;
  '@_failures'?: string;
  '@_errors'?: string;
  '@_skipped'?: string;
  '@_timestamp'?: string;
}

interface JUnitTestCase {
  failure?: JUnitFailure | JUnitFailure[];
  error?: JUnitError | JUnitError[];
  skipped?: unknown;
  '@_name': string;
  '@_classname'?: string;
  '@_time'?: string;
}

interface JUnitFailure {
  '#text'?: string;
  '@_message'?: string;
  '@_type'?: string;
}

interface JUnitError {
  '#text'?: string;
  '@_message'?: string;
  '@_type'?: string;
}

export function parseJUnitXml(xmlString: string): ParseResult {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    const parsed: JUnitXml = parser.parse(xmlString);

    const parseTestSuite = (suite: JUnitTestSuite): AutomationSuite => {
      const testcases = suite.testcase
        ? Array.isArray(suite.testcase)
          ? suite.testcase
          : [suite.testcase]
        : [];

      const tests: AutomationTestResult[] = testcases.map((tc) => {
        let status: TestResultStatus = 'passed';
        let errorMessage: string | undefined;
        let stackTrace: string | undefined;

        if (tc.skipped !== undefined) {
          status = 'skipped';
        } else if (tc.failure) {
          status = 'failed';
          const failures = Array.isArray(tc.failure) ? tc.failure : [tc.failure];
          errorMessage = failures.map((f) => f['@_message'] || '').join('; ');
          stackTrace = failures.map((f) => f['#text'] || '').join('\n');
        } else if (tc.error) {
          status = 'failed';
          const errors = Array.isArray(tc.error) ? tc.error : [tc.error];
          errorMessage = errors.map((e) => e['@_message'] || '').join('; ');
          stackTrace = errors.map((e) => e['#text'] || '').join('\n');
        }

        return {
          name: tc['@_name'],
          className: tc['@_classname'],
          suiteName: suite['@_name'],
          status,
          duration: parseFloat(tc['@_time'] || '0') * 1000,
          errorMessage,
          stackTrace,
        };
      });

      return {
        name: suite['@_name'] || 'Test Suite',
        tests,
        duration: parseFloat(suite['@_time'] || '0') * 1000,
        passed: tests.filter((t) => t.status === 'passed').length,
        failed: tests.filter((t) => t.status === 'failed').length,
        skipped: tests.filter((t) => t.status === 'skipped').length,
        pending: 0,
        flaky: 0,
        timestamp: suite['@_timestamp'],
      };
    };

    let suites: AutomationSuite[] = [];

    if (parsed.testsuites?.testsuite) {
      const testsuites = Array.isArray(parsed.testsuites.testsuite)
        ? parsed.testsuites.testsuite
        : [parsed.testsuites.testsuite];
      suites = testsuites.map(parseTestSuite);
    } else if (parsed.testsuite) {
      suites = [parseTestSuite(parsed.testsuite)];
    }

    const allTests = suites.flatMap((s) => s.tests);

    return {
      success: true,
      data: {
        format: 'junit',
        title: parsed.testsuites?.['@_name'],
        suites,
        summary: {
          total: allTests.length,
          passed: allTests.filter((t) => t.status === 'passed').length,
          failed: allTests.filter((t) => t.status === 'failed').length,
          skipped: allTests.filter((t) => t.status === 'skipped').length,
          pending: 0,
          flaky: 0,
          duration: suites.reduce((sum, s) => sum + s.duration, 0),
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `JUnit XMLの解析に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================
// TestNG XML Parser
// ============================================

interface TestNGXml {
  'testng-results'?: {
    suite?: TestNGSuite | TestNGSuite[];
    '@_skipped'?: string;
    '@_failed'?: string;
    '@_passed'?: string;
    '@_total'?: string;
  };
}

interface TestNGSuite {
  test?: TestNGTest | TestNGTest[];
  '@_name'?: string;
  '@_duration-ms'?: string;
  '@_started-at'?: string;
  '@_finished-at'?: string;
}

interface TestNGTest {
  class?: TestNGClass | TestNGClass[];
  '@_name'?: string;
  '@_duration-ms'?: string;
}

interface TestNGClass {
  'test-method'?: TestNGMethod | TestNGMethod[];
  '@_name'?: string;
}

interface TestNGMethod {
  exception?: TestNGException;
  '@_name': string;
  '@_status': string;
  '@_duration-ms'?: string;
  '@_started-at'?: string;
  '@_finished-at'?: string;
  '@_description'?: string;
  '@_is-config'?: string;
}

interface TestNGException {
  message?: string;
  'full-stacktrace'?: string;
}

export function parseTestNGXml(xmlString: string): ParseResult {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    const parsed: TestNGXml = parser.parse(xmlString);

    if (!parsed['testng-results']) {
      return {
        success: false,
        error: 'Invalid TestNG XML format: testng-results element not found',
      };
    }

    const results = parsed['testng-results'];
    const suitesData = results.suite
      ? Array.isArray(results.suite)
        ? results.suite
        : [results.suite]
      : [];

    const suites: AutomationSuite[] = suitesData.map((suite) => {
      const tests: AutomationTestResult[] = [];

      const testsData = suite.test ? (Array.isArray(suite.test) ? suite.test : [suite.test]) : [];

      for (const test of testsData) {
        const classesData = test.class
          ? Array.isArray(test.class)
            ? test.class
            : [test.class]
          : [];

        for (const cls of classesData) {
          const methodsData = cls['test-method']
            ? Array.isArray(cls['test-method'])
              ? cls['test-method']
              : [cls['test-method']]
            : [];

          for (const method of methodsData) {
            // Skip configuration methods
            if (method['@_is-config'] === 'true') continue;

            let status: TestResultStatus;
            switch (method['@_status']?.toUpperCase()) {
              case 'PASS':
                status = 'passed';
                break;
              case 'SKIP':
                status = 'skipped';
                break;
              case 'FAIL':
              default:
                status = 'failed';
            }

            tests.push({
              name: method['@_name'],
              className: cls['@_name'],
              suiteName: suite['@_name'],
              status,
              duration: parseInt(method['@_duration-ms'] || '0', 10),
              startTime: method['@_started-at'],
              endTime: method['@_finished-at'],
              message: method['@_description'],
              errorMessage: method.exception?.message,
              stackTrace: method.exception?.['full-stacktrace'],
            });
          }
        }
      }

      return {
        name: suite['@_name'] || 'Test Suite',
        tests,
        duration: parseInt(suite['@_duration-ms'] || '0', 10),
        passed: tests.filter((t) => t.status === 'passed').length,
        failed: tests.filter((t) => t.status === 'failed').length,
        skipped: tests.filter((t) => t.status === 'skipped').length,
        pending: 0,
        flaky: 0,
        timestamp: suite['@_started-at'],
      };
    });

    const allTests = suites.flatMap((s) => s.tests);

    return {
      success: true,
      data: {
        format: 'testng',
        suites,
        summary: {
          total: parseInt(results['@_total'] || String(allTests.length), 10),
          passed: parseInt(
            results['@_passed'] || String(allTests.filter((t) => t.status === 'passed').length),
            10
          ),
          failed: parseInt(
            results['@_failed'] || String(allTests.filter((t) => t.status === 'failed').length),
            10
          ),
          skipped: parseInt(
            results['@_skipped'] || String(allTests.filter((t) => t.status === 'skipped').length),
            10
          ),
          pending: 0,
          flaky: 0,
          duration: suites.reduce((sum, s) => sum + s.duration, 0),
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `TestNG XMLの解析に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================
// Auto-detect and Parse
// ============================================

export function detectAndParseReport(content: string): ParseResult {
  const trimmedContent = content.trim();

  // Try to detect format
  if (trimmedContent.startsWith('{')) {
    // JSON format - try Playwright
    return parsePlaywrightJson(content);
  } else if (trimmedContent.startsWith('<?xml') || trimmedContent.startsWith('<')) {
    // XML format - try to detect JUnit or TestNG
    if (trimmedContent.includes('testng-results') || trimmedContent.includes('<testng')) {
      return parseTestNGXml(content);
    } else if (trimmedContent.includes('testsuite') || trimmedContent.includes('testcase')) {
      return parseJUnitXml(content);
    }
  }

  return {
    success: false,
    error: 'Unknown report format. Supported formats: Playwright JSON, JUnit XML, TestNG XML',
  };
}

// ============================================
// Result Mapping
// ============================================

export interface TestCaseMapping {
  automationTestName: string;
  testCaseId: bigint;
  testCaseName: string;
}

export interface MappedTestResult {
  testCaseId: bigint;
  testCaseName: string;
  automationTestName: string;
  status: TestResultStatus;
  duration: number;
  errorMessage?: string;
  stackTrace?: string;
  attachments?: AutomationAttachment[];
}

export function mapResultsToTestCases(
  report: AutomationReport,
  mappings: TestCaseMapping[]
): MappedTestResult[] {
  const results: MappedTestResult[] = [];
  const allTests = report.suites.flatMap((suite) => suite.tests);

  for (const mapping of mappings) {
    // Find matching automation test
    const automationTest = allTests.find((test) => {
      // Match by exact name or full path (suiteName.name or className.name)
      const fullName = [test.suiteName, test.name].filter(Boolean).join('.');
      const classFullName = [test.className, test.name].filter(Boolean).join('.');
      return (
        test.name === mapping.automationTestName ||
        fullName === mapping.automationTestName ||
        classFullName === mapping.automationTestName
      );
    });

    if (automationTest) {
      results.push({
        testCaseId: mapping.testCaseId,
        testCaseName: mapping.testCaseName,
        automationTestName: mapping.automationTestName,
        status: automationTest.status,
        duration: automationTest.duration,
        errorMessage: automationTest.errorMessage,
        stackTrace: automationTest.stackTrace,
        attachments: automationTest.attachments,
      });
    }
  }

  return results;
}
