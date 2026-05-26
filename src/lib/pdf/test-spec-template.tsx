/**
 * Test Specification PDF Template
 */

import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { commonStyles, priorityLabels, priorityColors } from './styles';

export interface TestSpecPDFData {
  projectName: string;
  specName: string;
  phase: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  description: string | null;
  sections: Array<{
    id: string;
    name: string;
    description: string | null;
    cases: Array<{
      id: string;
      title: string;
      description: string | null;
      priority: string;
      precondition: string | null;
      steps: Array<{
        stepNumber: number;
        action: string;
        expectedResult: string;
      }>;
      tags: string[];
    }>;
  }>;
}

interface Props {
  data: TestSpecPDFData;
}

const phaseLabels: Record<string, string> = {
  UNIT: '単体テスト',
  INTEGRATION: '結合テスト',
  SYSTEM: 'システムテスト',
  ACCEPTANCE: '受入テスト',
  REGRESSION: '回帰テスト',
};

export function TestSpecPDF({ data }: Props) {
  const totalCases = data.sections.reduce((sum, s) => sum + s.cases.length, 0);

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Header */}
        <View style={commonStyles.header}>
          <Text style={commonStyles.headerTitle}>{data.specName}</Text>
          <Text style={commonStyles.headerSubtitle}>テスト仕様書</Text>
          <View style={commonStyles.headerInfo}>
            <Text>プロジェクト: {data.projectName}</Text>
            <Text>フェーズ: {phaseLabels[data.phase] || data.phase}</Text>
            <Text>バージョン: {data.version}</Text>
          </View>
          <View style={commonStyles.headerInfo}>
            <Text>作成者: {data.authorName}</Text>
            <Text>作成日: {new Date(data.createdAt).toLocaleDateString('ja-JP')}</Text>
            <Text>更新日: {new Date(data.updatedAt).toLocaleDateString('ja-JP')}</Text>
          </View>
        </View>

        {/* Description */}
        {data.description && (
          <View style={commonStyles.section}>
            <Text style={commonStyles.sectionTitle}>概要</Text>
            <Text style={commonStyles.text}>{data.description}</Text>
          </View>
        )}

        {/* Summary */}
        <View style={commonStyles.summaryBox}>
          <View style={commonStyles.summaryItem}>
            <Text style={commonStyles.summaryValue}>{data.sections.length}</Text>
            <Text style={commonStyles.summaryLabel}>セクション</Text>
          </View>
          <View style={commonStyles.summaryItem}>
            <Text style={commonStyles.summaryValue}>{totalCases}</Text>
            <Text style={commonStyles.summaryLabel}>テストケース</Text>
          </View>
        </View>

        {/* Table of Contents */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.sectionTitle}>目次</Text>
          <View style={commonStyles.table}>
            {data.sections.map((section, index) => (
              <View key={section.id} style={commonStyles.tableRow}>
                <Text style={[commonStyles.tableCell, { width: '10%' }]}>{index + 1}.</Text>
                <Text style={[commonStyles.tableCell, { width: '70%' }]}>{section.name}</Text>
                <Text style={[commonStyles.tableCell, { width: '20%', textAlign: 'right' }]}>
                  {section.cases.length}件
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={commonStyles.footer} fixed>
          <Text>T-NaviEx - テスト仕様書</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* Test Case Details Pages */}
      {data.sections.map((section, sectionIndex) => (
        <Page key={section.id} size="A4" style={commonStyles.page}>
          <View style={commonStyles.section}>
            <Text style={commonStyles.sectionTitle}>
              {sectionIndex + 1}. {section.name}
            </Text>
            {section.description && <Text style={commonStyles.text}>{section.description}</Text>}
          </View>

          {section.cases.map((testCase, caseIndex) => (
            <View
              key={testCase.id}
              style={[commonStyles.section, { marginBottom: 20 }]}
              wrap={false}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 5,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold' }}>
                  {sectionIndex + 1}.{caseIndex + 1} {testCase.title}
                </Text>
                <View
                  style={[
                    commonStyles.badge,
                    { backgroundColor: priorityColors[testCase.priority] || '#6b7280' },
                  ]}
                >
                  <Text>{priorityLabels[testCase.priority] || testCase.priority}</Text>
                </View>
              </View>

              {testCase.description && (
                <Text style={[commonStyles.text, { marginBottom: 5 }]}>{testCase.description}</Text>
              )}

              {testCase.precondition && (
                <View style={{ marginBottom: 5 }}>
                  <Text style={[commonStyles.textSmall, { fontWeight: 'bold' }]}>前提条件:</Text>
                  <Text style={commonStyles.textSmall}>{testCase.precondition}</Text>
                </View>
              )}

              {testCase.tags.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 5, marginBottom: 5 }}>
                  {testCase.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: '#e5e7eb',
                        padding: '2 4',
                        borderRadius: 2,
                      }}
                    >
                      <Text style={{ fontSize: 7, color: '#374151' }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Steps Table */}
              {testCase.steps.length > 0 && (
                <View style={commonStyles.table}>
                  <View style={[commonStyles.tableRow, commonStyles.tableRowHeader]}>
                    <Text style={[commonStyles.tableCellHeader, { width: '8%' }]}>No.</Text>
                    <Text style={[commonStyles.tableCellHeader, { width: '46%' }]}>操作</Text>
                    <Text style={[commonStyles.tableCellHeader, { width: '46%' }]}>期待結果</Text>
                  </View>
                  {testCase.steps.map((step, stepIndex) => (
                    <View
                      key={step.stepNumber}
                      style={[
                        commonStyles.tableRow,
                        stepIndex % 2 === 1 ? commonStyles.tableRowAlt : {},
                      ]}
                    >
                      <Text style={[commonStyles.tableCell, { width: '8%' }]}>
                        {step.stepNumber}
                      </Text>
                      <Text style={[commonStyles.tableCell, { width: '46%' }]}>{step.action}</Text>
                      <Text style={[commonStyles.tableCell, { width: '46%' }]}>
                        {step.expectedResult}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {/* Footer */}
          <View style={commonStyles.footer} fixed>
            <Text>T-NaviEx - テスト仕様書</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
}
