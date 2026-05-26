/**
 * Test Result Report PDF Template
 */

import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { commonStyles, statusLabels, statusColors } from './styles';

export interface TestResultPDFData {
  projectName: string;
  testRunName: string;
  testRunDescription: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  summary: {
    totalCases: number;
    executed: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    notRun: number;
    executionRate: number;
    passRate: number;
  };
  results: Array<{
    caseId: string;
    caseTitle: string;
    sectionName: string;
    priority: string;
    status: string;
    executedByName: string | null;
    executedAt: string | null;
    executionTime: number | null;
    environment: string | null;
    note: string | null;
    bugCount: number;
  }>;
}

interface Props {
  data: TestResultPDFData;
}

const runStatusLabels: Record<string, string> = {
  NOT_STARTED: '未開始',
  IN_PROGRESS: '実行中',
  COMPLETED: '完了',
  PAUSED: '中断',
  CANCELLED: '中止',
};

export function TestResultPDF({ data }: Props) {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    return `${hours}時間${minutes % 60}分`;
  };

  const totalExecutionTime = data.results.reduce((sum, r) => sum + (r.executionTime || 0), 0);

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Header */}
        <View style={commonStyles.header}>
          <Text style={commonStyles.headerTitle}>{data.testRunName}</Text>
          <Text style={commonStyles.headerSubtitle}>テスト成績書</Text>
          <View style={commonStyles.headerInfo}>
            <Text>プロジェクト: {data.projectName}</Text>
            <Text>ステータス: {runStatusLabels[data.status] || data.status}</Text>
            <Text>作成日: {new Date(data.createdAt).toLocaleDateString('ja-JP')}</Text>
          </View>
          {(data.startDate || data.endDate) && (
            <View style={commonStyles.headerInfo}>
              {data.startDate && (
                <Text>開始日: {new Date(data.startDate).toLocaleDateString('ja-JP')}</Text>
              )}
              {data.endDate && (
                <Text>終了日: {new Date(data.endDate).toLocaleDateString('ja-JP')}</Text>
              )}
            </View>
          )}
        </View>

        {/* Description */}
        {data.testRunDescription && (
          <View style={commonStyles.section}>
            <Text style={commonStyles.sectionTitle}>説明</Text>
            <Text style={commonStyles.text}>{data.testRunDescription}</Text>
          </View>
        )}

        {/* Summary */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.sectionTitle}>サマリー</Text>
          <View style={commonStyles.summaryBox}>
            <View style={commonStyles.summaryItem}>
              <Text style={commonStyles.summaryValue}>{data.summary.totalCases}</Text>
              <Text style={commonStyles.summaryLabel}>総ケース数</Text>
            </View>
            <View style={commonStyles.summaryItem}>
              <Text style={commonStyles.summaryValue}>{data.summary.executed}</Text>
              <Text style={commonStyles.summaryLabel}>実行済み</Text>
            </View>
            <View style={commonStyles.summaryItem}>
              <Text style={[commonStyles.summaryValue, { color: '#10b981' }]}>
                {data.summary.passed}
              </Text>
              <Text style={commonStyles.summaryLabel}>合格</Text>
            </View>
            <View style={commonStyles.summaryItem}>
              <Text style={[commonStyles.summaryValue, { color: '#ef4444' }]}>
                {data.summary.failed}
              </Text>
              <Text style={commonStyles.summaryLabel}>不合格</Text>
            </View>
            <View style={commonStyles.summaryItem}>
              <Text style={[commonStyles.summaryValue, { color: '#f59e0b' }]}>
                {data.summary.blocked}
              </Text>
              <Text style={commonStyles.summaryLabel}>ブロック</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 20, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 3,
                }}
              >
                <Text style={commonStyles.textSmall}>実行率</Text>
                <Text style={commonStyles.textSmall}>{data.summary.executionRate}%</Text>
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${data.summary.executionRate}%`,
                    height: '100%',
                    backgroundColor: '#3b82f6',
                  }}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 3,
                }}
              >
                <Text style={commonStyles.textSmall}>合格率</Text>
                <Text style={commonStyles.textSmall}>{data.summary.passRate}%</Text>
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${data.summary.passRate}%`,
                    height: '100%',
                    backgroundColor: '#10b981',
                  }}
                />
              </View>
            </View>
          </View>

          {totalExecutionTime > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={commonStyles.textSmall}>
                総実行時間: {formatDuration(totalExecutionTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Results Table */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.sectionTitle}>テスト結果一覧</Text>
          <View style={commonStyles.table}>
            <View style={[commonStyles.tableRow, commonStyles.tableRowHeader]}>
              <Text style={[commonStyles.tableCellHeader, { width: '35%' }]}>テストケース</Text>
              <Text style={[commonStyles.tableCellHeader, { width: '12%' }]}>ステータス</Text>
              <Text style={[commonStyles.tableCellHeader, { width: '15%' }]}>実行者</Text>
              <Text style={[commonStyles.tableCellHeader, { width: '18%' }]}>実行日時</Text>
              <Text style={[commonStyles.tableCellHeader, { width: '12%' }]}>時間</Text>
              <Text style={[commonStyles.tableCellHeader, { width: '8%', textAlign: 'right' }]}>
                バグ
              </Text>
            </View>
            {data.results.slice(0, 30).map((result, index) => (
              <View
                key={result.caseId}
                style={[commonStyles.tableRow, index % 2 === 1 ? commonStyles.tableRowAlt : {}]}
              >
                <View style={[commonStyles.tableCell, { width: '35%' }]}>
                  <Text style={{ fontSize: 8 }}>{result.caseTitle}</Text>
                  <Text style={{ fontSize: 7, color: '#9ca3af' }}>{result.sectionName}</Text>
                </View>
                <View style={[commonStyles.tableCell, { width: '12%' }]}>
                  <View
                    style={[
                      commonStyles.badge,
                      { backgroundColor: statusColors[result.status] || '#6b7280' },
                    ]}
                  >
                    <Text>{statusLabels[result.status] || result.status}</Text>
                  </View>
                </View>
                <Text style={[commonStyles.tableCell, { width: '15%', fontSize: 8 }]}>
                  {result.executedByName || '-'}
                </Text>
                <Text style={[commonStyles.tableCell, { width: '18%', fontSize: 8 }]}>
                  {result.executedAt ? new Date(result.executedAt).toLocaleString('ja-JP') : '-'}
                </Text>
                <Text style={[commonStyles.tableCell, { width: '12%', fontSize: 8 }]}>
                  {result.executionTime ? formatDuration(result.executionTime) : '-'}
                </Text>
                <Text
                  style={[
                    commonStyles.tableCell,
                    { width: '8%', textAlign: 'right', fontSize: 8 },
                    result.bugCount > 0 ? { color: '#ef4444', fontWeight: 'bold' } : {},
                  ]}
                >
                  {result.bugCount > 0 ? result.bugCount : '-'}
                </Text>
              </View>
            ))}
          </View>
          {data.results.length > 30 && (
            <Text style={[commonStyles.textSmall, { marginTop: 5 }]}>
              ...他 {data.results.length - 30} 件
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={commonStyles.footer} fixed>
          <Text>T-NaviEx - テスト成績書</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* Additional Pages for remaining results if more than 30 */}
      {data.results.length > 30 && (
        <Page size="A4" style={commonStyles.page}>
          <View style={commonStyles.section}>
            <Text style={commonStyles.sectionTitle}>テスト結果一覧 (続き)</Text>
            <View style={commonStyles.table}>
              <View style={[commonStyles.tableRow, commonStyles.tableRowHeader]}>
                <Text style={[commonStyles.tableCellHeader, { width: '35%' }]}>テストケース</Text>
                <Text style={[commonStyles.tableCellHeader, { width: '12%' }]}>ステータス</Text>
                <Text style={[commonStyles.tableCellHeader, { width: '15%' }]}>実行者</Text>
                <Text style={[commonStyles.tableCellHeader, { width: '18%' }]}>実行日時</Text>
                <Text style={[commonStyles.tableCellHeader, { width: '12%' }]}>時間</Text>
                <Text style={[commonStyles.tableCellHeader, { width: '8%', textAlign: 'right' }]}>
                  バグ
                </Text>
              </View>
              {data.results.slice(30).map((result, index) => (
                <View
                  key={result.caseId}
                  style={[commonStyles.tableRow, index % 2 === 1 ? commonStyles.tableRowAlt : {}]}
                >
                  <View style={[commonStyles.tableCell, { width: '35%' }]}>
                    <Text style={{ fontSize: 8 }}>{result.caseTitle}</Text>
                    <Text style={{ fontSize: 7, color: '#9ca3af' }}>{result.sectionName}</Text>
                  </View>
                  <View style={[commonStyles.tableCell, { width: '12%' }]}>
                    <View
                      style={[
                        commonStyles.badge,
                        { backgroundColor: statusColors[result.status] || '#6b7280' },
                      ]}
                    >
                      <Text>{statusLabels[result.status] || result.status}</Text>
                    </View>
                  </View>
                  <Text style={[commonStyles.tableCell, { width: '15%', fontSize: 8 }]}>
                    {result.executedByName || '-'}
                  </Text>
                  <Text style={[commonStyles.tableCell, { width: '18%', fontSize: 8 }]}>
                    {result.executedAt ? new Date(result.executedAt).toLocaleString('ja-JP') : '-'}
                  </Text>
                  <Text style={[commonStyles.tableCell, { width: '12%', fontSize: 8 }]}>
                    {result.executionTime ? formatDuration(result.executionTime) : '-'}
                  </Text>
                  <Text
                    style={[
                      commonStyles.tableCell,
                      { width: '8%', textAlign: 'right', fontSize: 8 },
                      result.bugCount > 0 ? { color: '#ef4444', fontWeight: 'bold' } : {},
                    ]}
                  >
                    {result.bugCount > 0 ? result.bugCount : '-'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={commonStyles.footer} fixed>
            <Text>T-NaviEx - テスト成績書</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      )}
    </Document>
  );
}
