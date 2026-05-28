/**
 * Automation Client Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parsePlaywrightJson,
  parseJUnitXml,
  parseTestNGXml,
  detectAndParseReport,
  mapResultsToTestCases,
  type AutomationReport,
} from '@/services/automation-client';

describe('Automation Client', () => {
  describe('parsePlaywrightJson', () => {
    it('should parse valid Playwright JSON report', () => {
      const playwrightReport = JSON.stringify({
        suites: [
          {
            title: 'Login Tests',
            file: 'tests/login.spec.ts',
            specs: [
              {
                title: 'should login successfully',
                ok: true,
                tags: ['@smoke'],
                tests: [
                  {
                    timeout: 30000,
                    expectedStatus: 'passed',
                    status: 'expected',
                    results: [
                      {
                        workerIndex: 0,
                        status: 'passed',
                        duration: 1500,
                        startTime: '2024-01-01T00:00:00.000Z',
                        retry: 0,
                      },
                    ],
                  },
                ],
              },
              {
                title: 'should show error for invalid credentials',
                ok: false,
                tags: [],
                tests: [
                  {
                    timeout: 30000,
                    expectedStatus: 'passed',
                    status: 'unexpected',
                    results: [
                      {
                        workerIndex: 0,
                        status: 'failed',
                        duration: 2000,
                        startTime: '2024-01-01T00:00:02.000Z',
                        retry: 0,
                        error: {
                          message: 'Expected element to be visible',
                          stack: 'Error: Expected element to be visible\n  at login.spec.ts:15',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
            suites: [],
          },
        ],
        stats: {
          startTime: '2024-01-01T00:00:00.000Z',
          duration: 3500,
          expected: 1,
          skipped: 0,
          unexpected: 1,
          flaky: 0,
        },
      });

      const result = parsePlaywrightJson(playwrightReport);

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('playwright');
      expect(result.data?.suites).toHaveLength(1);
      expect(result.data?.summary.total).toBe(2);
      expect(result.data?.summary.passed).toBe(1);
      expect(result.data?.summary.failed).toBe(1);
    });

    it('should handle flaky tests', () => {
      const playwrightReport = JSON.stringify({
        suites: [
          {
            title: 'Flaky Tests',
            specs: [
              {
                title: 'flaky test',
                ok: true,
                tests: [
                  {
                    timeout: 30000,
                    expectedStatus: 'passed',
                    status: 'flaky',
                    results: [
                      { workerIndex: 0, status: 'failed', duration: 1000, retry: 0 },
                      { workerIndex: 0, status: 'passed', duration: 1000, retry: 1 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = parsePlaywrightJson(playwrightReport);

      expect(result.success).toBe(true);
      expect(result.data?.summary.flaky).toBe(1);
    });

    it('should handle skipped tests', () => {
      const playwrightReport = JSON.stringify({
        suites: [
          {
            title: 'Skipped Tests',
            specs: [
              {
                title: 'skipped test',
                ok: true,
                tests: [
                  {
                    timeout: 30000,
                    expectedStatus: 'skipped',
                    status: 'skipped',
                    results: [{ workerIndex: 0, status: 'skipped', duration: 0, retry: 0 }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = parsePlaywrightJson(playwrightReport);

      expect(result.success).toBe(true);
      expect(result.data?.summary.skipped).toBe(1);
    });

    it('should return error for invalid JSON', () => {
      const result = parsePlaywrightJson('invalid json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Playwright JSON');
    });
  });

  describe('parseJUnitXml', () => {
    it('should parse valid JUnit XML report', () => {
      const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
        <testsuites name="Test Suite" tests="3" failures="1" errors="0" skipped="1" time="2.5">
          <testsuite name="LoginTests" tests="3" failures="1" errors="0" skipped="1" time="2.5" timestamp="2024-01-01T00:00:00">
            <testcase name="testLoginSuccess" classname="com.example.LoginTests" time="1.0"/>
            <testcase name="testLoginFailure" classname="com.example.LoginTests" time="1.0">
              <failure message="Assertion failed" type="AssertionError">Expected true but was false</failure>
            </testcase>
            <testcase name="testSkipped" classname="com.example.LoginTests" time="0.5">
              <skipped/>
            </testcase>
          </testsuite>
        </testsuites>`;

      const result = parseJUnitXml(junitXml);

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('junit');
      expect(result.data?.suites).toHaveLength(1);
      expect(result.data?.summary.total).toBe(3);
      expect(result.data?.summary.passed).toBe(1);
      expect(result.data?.summary.failed).toBe(1);
      expect(result.data?.summary.skipped).toBe(1);
    });

    it('should parse single testsuite without testsuites wrapper', () => {
      const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
        <testsuite name="SimpleTests" tests="1" failures="0" time="0.5">
          <testcase name="testSimple" classname="com.example.SimpleTests" time="0.5"/>
        </testsuite>`;

      const result = parseJUnitXml(junitXml);

      expect(result.success).toBe(true);
      expect(result.data?.suites).toHaveLength(1);
      expect(result.data?.summary.total).toBe(1);
      expect(result.data?.summary.passed).toBe(1);
    });

    it('should handle error elements', () => {
      const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
        <testsuite name="ErrorTests" tests="1" errors="1" time="1.0">
          <testcase name="testWithError" classname="com.example.ErrorTests" time="1.0">
            <error message="NullPointerException" type="java.lang.NullPointerException">Stack trace here</error>
          </testcase>
        </testsuite>`;

      const result = parseJUnitXml(junitXml);

      expect(result.success).toBe(true);
      expect(result.data?.summary.failed).toBe(1);
      expect(result.data?.suites[0].tests[0].errorMessage).toContain('NullPointerException');
    });

    it('should return empty suites for non-testsuite XML', () => {
      const result = parseJUnitXml('<root>not valid junit</root>');

      expect(result.success).toBe(true);
      expect(result.data?.suites).toHaveLength(0);
    });
  });

  describe('parseTestNGXml', () => {
    it('should parse valid TestNG XML report', () => {
      const testngXml = `<?xml version="1.0" encoding="UTF-8"?>
        <testng-results skipped="1" failed="1" passed="2" total="4">
          <suite name="Test Suite" duration-ms="5000" started-at="2024-01-01T00:00:00Z">
            <test name="Login Tests" duration-ms="5000">
              <class name="com.example.LoginTest">
                <test-method name="testLoginSuccess" status="PASS" duration-ms="1000" started-at="2024-01-01T00:00:00Z"/>
                <test-method name="testLoginWithValidUser" status="PASS" duration-ms="1500" started-at="2024-01-01T00:00:01Z"/>
                <test-method name="testLoginFailure" status="FAIL" duration-ms="2000" started-at="2024-01-01T00:00:03Z">
                  <exception>
                    <message>Expected element not found</message>
                    <full-stacktrace>at com.example.LoginTest.testLoginFailure(LoginTest.java:25)</full-stacktrace>
                  </exception>
                </test-method>
                <test-method name="testSkipped" status="SKIP" duration-ms="0"/>
              </class>
            </test>
          </suite>
        </testng-results>`;

      const result = parseTestNGXml(testngXml);

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('testng');
      expect(result.data?.suites).toHaveLength(1);
      expect(result.data?.summary.total).toBe(4);
      expect(result.data?.summary.passed).toBe(2);
      expect(result.data?.summary.failed).toBe(1);
      expect(result.data?.summary.skipped).toBe(1);
    });

    it('should skip configuration methods', () => {
      const testngXml = `<?xml version="1.0" encoding="UTF-8"?>
        <testng-results skipped="0" failed="0" passed="1" total="1">
          <suite name="Test Suite" duration-ms="2000">
            <test name="Tests">
              <class name="com.example.Test">
                <test-method name="setUp" status="PASS" is-config="true" duration-ms="500"/>
                <test-method name="testMethod" status="PASS" duration-ms="1000"/>
                <test-method name="tearDown" status="PASS" is-config="true" duration-ms="500"/>
              </class>
            </test>
          </suite>
        </testng-results>`;

      const result = parseTestNGXml(testngXml);

      expect(result.success).toBe(true);
      expect(result.data?.suites[0].tests).toHaveLength(1);
      expect(result.data?.suites[0].tests[0].name).toBe('testMethod');
    });

    it('should return error for invalid TestNG XML', () => {
      const result = parseTestNGXml('<invalid>not testng</invalid>');

      expect(result.success).toBe(false);
      expect(result.error).toContain('testng-results');
    });
  });

  describe('detectAndParseReport', () => {
    it('should detect and parse Playwright JSON', () => {
      const playwrightReport = JSON.stringify({
        suites: [
          {
            title: 'Test',
            specs: [
              {
                title: 'test',
                ok: true,
                tests: [
                  {
                    status: 'expected',
                    results: [{ status: 'passed', duration: 100, retry: 0 }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = detectAndParseReport(playwrightReport);

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('playwright');
    });

    it('should detect and parse JUnit XML', () => {
      const junitXml = `<?xml version="1.0"?>
        <testsuite name="Tests">
          <testcase name="test1" time="0.1"/>
        </testsuite>`;

      const result = detectAndParseReport(junitXml);

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('junit');
    });

    it('should detect and parse TestNG XML', () => {
      const testngXml = `<?xml version="1.0"?>
        <testng-results passed="1" failed="0" skipped="0" total="1">
          <suite name="Suite">
            <test name="Test">
              <class name="TestClass">
                <test-method name="test" status="PASS" duration-ms="100"/>
              </class>
            </test>
          </suite>
        </testng-results>`;

      const result = detectAndParseReport(testngXml);

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('testng');
    });

    it('should return error for unknown format', () => {
      const result = detectAndParseReport('random content');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown report format');
    });
  });

  describe('mapResultsToTestCases', () => {
    it('should map automation results to test cases', () => {
      const report: AutomationReport = {
        format: 'playwright',
        suites: [
          {
            name: 'Login Tests',
            tests: [
              {
                name: 'should login successfully',
                suiteName: 'Login Tests',
                status: 'passed',
                duration: 1500,
              },
              {
                name: 'should show error',
                suiteName: 'Login Tests',
                status: 'failed',
                duration: 2000,
                errorMessage: 'Element not found',
              },
            ],
            duration: 3500,
            passed: 1,
            failed: 1,
            skipped: 0,
            pending: 0,
            flaky: 0,
          },
        ],
        summary: {
          total: 2,
          passed: 1,
          failed: 1,
          skipped: 0,
          pending: 0,
          flaky: 0,
          duration: 3500,
        },
      };

      const mappings = [
        {
          automationTestName: 'should login successfully',
          testCaseId: BigInt(1),
          testCaseName: 'TC-001: Login Test',
        },
        {
          automationTestName: 'should show error',
          testCaseId: BigInt(2),
          testCaseName: 'TC-002: Error Test',
        },
      ];

      const results = mapResultsToTestCases(report, mappings);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('passed');
      expect(results[0].testCaseId).toBe(BigInt(1));
      expect(results[1].status).toBe('failed');
      expect(results[1].errorMessage).toBe('Element not found');
    });

    it('should match by full path (suiteName.name)', () => {
      const report: AutomationReport = {
        format: 'junit',
        suites: [
          {
            name: 'LoginTests',
            tests: [
              {
                name: 'testLogin',
                suiteName: 'LoginTests',
                status: 'passed',
                duration: 1000,
              },
            ],
            duration: 1000,
            passed: 1,
            failed: 0,
            skipped: 0,
            pending: 0,
            flaky: 0,
          },
        ],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          skipped: 0,
          pending: 0,
          flaky: 0,
          duration: 1000,
        },
      };

      const mappings = [
        {
          automationTestName: 'LoginTests.testLogin',
          testCaseId: BigInt(1),
          testCaseName: 'Login Test',
        },
      ];

      const results = mapResultsToTestCases(report, mappings);

      expect(results).toHaveLength(1);
      expect(results[0].testCaseId).toBe(BigInt(1));
    });

    it('should match by className.name', () => {
      const report: AutomationReport = {
        format: 'testng',
        suites: [
          {
            name: 'Suite',
            tests: [
              {
                name: 'testMethod',
                className: 'com.example.TestClass',
                status: 'passed',
                duration: 500,
              },
            ],
            duration: 500,
            passed: 1,
            failed: 0,
            skipped: 0,
            pending: 0,
            flaky: 0,
          },
        ],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          skipped: 0,
          pending: 0,
          flaky: 0,
          duration: 500,
        },
      };

      const mappings = [
        {
          automationTestName: 'com.example.TestClass.testMethod',
          testCaseId: BigInt(1),
          testCaseName: 'Test Method',
        },
      ];

      const results = mapResultsToTestCases(report, mappings);

      expect(results).toHaveLength(1);
    });

    it('should return empty array when no mappings match', () => {
      const report: AutomationReport = {
        format: 'playwright',
        suites: [
          {
            name: 'Tests',
            tests: [{ name: 'test1', status: 'passed', duration: 100 }],
            duration: 100,
            passed: 1,
            failed: 0,
            skipped: 0,
            pending: 0,
            flaky: 0,
          },
        ],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          skipped: 0,
          pending: 0,
          flaky: 0,
          duration: 100,
        },
      };

      const mappings = [
        {
          automationTestName: 'nonexistent',
          testCaseId: BigInt(1),
          testCaseName: 'Test',
        },
      ];

      const results = mapResultsToTestCases(report, mappings);

      expect(results).toHaveLength(0);
    });
  });
});
