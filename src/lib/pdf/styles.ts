/**
 * PDF Common Styles
 */

import { StyleSheet } from '@react-pdf/renderer';

export const commonStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'NotoSansJP',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    fontSize: 9,
    color: '#6b7280',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 5,
  },
  table: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 25,
    alignItems: 'center',
  },
  tableRowHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    padding: 5,
    fontSize: 9,
  },
  tableCellHeader: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  badge: {
    padding: '2 6',
    borderRadius: 4,
    fontSize: 8,
    color: '#ffffff',
  },
  badgePassed: {
    backgroundColor: '#10b981',
  },
  badgeFailed: {
    backgroundColor: '#ef4444',
  },
  badgeBlocked: {
    backgroundColor: '#f59e0b',
  },
  badgeSkipped: {
    backgroundColor: '#8b5cf6',
  },
  badgeNotRun: {
    backgroundColor: '#6b7280',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
  summaryBox: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
  },
  text: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 5,
  },
  textSmall: {
    fontSize: 8,
    color: '#6b7280',
  },
});

export const priorityColors: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

export const statusColors: Record<string, string> = {
  PASSED: '#10b981',
  FAILED: '#ef4444',
  BLOCKED: '#f59e0b',
  SKIPPED: '#8b5cf6',
  NOT_RUN: '#6b7280',
  RETEST: '#3b82f6',
};

export const statusLabels: Record<string, string> = {
  PASSED: '合格',
  FAILED: '不合格',
  BLOCKED: 'ブロック',
  SKIPPED: 'スキップ',
  NOT_RUN: '未実行',
  RETEST: '再テスト',
};

export const priorityLabels: Record<string, string> = {
  CRITICAL: '緊急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};
