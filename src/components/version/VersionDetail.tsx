'use client';

/**
 * VersionDetail Component
 *
 * バージョン詳細（スナップショット内容）を表示するコンポーネント
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  TestSpecVersion,
  SectionSnapshot,
  TestCaseSnapshot,
  buildSectionTree,
} from '@/types/version-management';

interface VersionDetailProps {
  testSpecId: string;
  versionId: string;
  onClose?: () => void;
  onRestore?: (version: TestSpecVersion) => void;
}

export function VersionDetail({ testSpecId, versionId, onClose, onRestore }: VersionDetailProps) {
  const [version, setVersion] = useState<TestSpecVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/test-specs/${testSpecId}/versions/${versionId}`);

        if (cancelled) return;

        if (!response.ok) {
          throw new Error('バージョンの取得に失敗しました');
        }

        const data = await response.json();
        if (!cancelled) {
          setVersion(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    retryRef.current = fetchData;
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [testSpecId, versionId]);

  const handleRetry = () => {
    retryRef.current();
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSectionTree = (
    sections: (SectionSnapshot & { children: SectionSnapshot[] })[],
    testCases: TestCaseSnapshot[],
    depth = 0
  ) => {
    return sections.map((section) => {
      const sectionTestCases = testCases.filter((tc) => tc.sectionId === section.id);
      const isExpanded = expandedSections.has(section.id);
      const hasChildren = section.children.length > 0 || sectionTestCases.length > 0;

      return (
        <div key={section.id} style={{ marginLeft: `${depth * 16}px` }}>
          <div
            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
              isExpanded ? 'bg-gray-50' : ''
            }`}
            onClick={() => toggleSection(section.id)}
          >
            {hasChildren && <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>}
            <span className="font-medium">{section.name}</span>
            <span className="text-xs text-gray-500">({sectionTestCases.length}件)</span>
          </div>
          {isExpanded && (
            <div className="ml-4">
              {/* 子セクション */}
              {section.children.length > 0 &&
                renderSectionTree(
                  section.children as (SectionSnapshot & { children: SectionSnapshot[] })[],
                  testCases,
                  depth + 1
                )}
              {/* テストケース */}
              {sectionTestCases.map((tc) => (
                <div key={tc.id} className="p-2 ml-4 border-l-2 border-gray-200">
                  <div className="text-sm font-medium">{tc.title}</div>
                  {tc.description && (
                    <div className="text-xs text-gray-500 mt-1">{tc.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {tc.priority && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                        {tc.priority}
                      </span>
                    )}
                    {tc.status && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{tc.status}</span>
                    )}
                    {tc.steps.length > 0 && (
                      <span className="text-xs text-gray-500">{tc.steps.length}ステップ</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <p>{error}</p>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={handleRetry}>
            再試行
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              閉じる
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!version) {
    return null;
  }

  const sectionTree = version.content ? buildSectionTree(version.content.sections) : [];

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">バージョン {version.version}</h3>
          <p className="text-sm text-gray-500">{formatDate(version.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {onRestore && version.content && (
            <Button variant="outline" onClick={() => onRestore(version)}>
              このバージョンを復元
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              閉じる
            </Button>
          )}
        </div>
      </div>

      {/* 変更メモ */}
      {version.changeNote && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">変更メモ: </span>
          <span className="text-sm">{version.changeNote}</span>
        </div>
      )}

      {/* 統計情報 */}
      <div className="flex items-center gap-4 text-sm">
        <div className="px-3 py-1.5 bg-blue-50 rounded">
          <span className="text-gray-500">セクション: </span>
          <span className="font-medium">{version.sectionCount || 0}</span>
        </div>
        <div className="px-3 py-1.5 bg-green-50 rounded">
          <span className="text-gray-500">テストケース: </span>
          <span className="font-medium">{version.testCaseCount || 0}</span>
        </div>
      </div>

      {/* スナップショット内容 */}
      {version.content ? (
        <div className="border rounded-lg">
          <div className="p-3 bg-gray-50 border-b">
            <span className="font-medium">スナップショット内容</span>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {sectionTree.length > 0 ? (
              renderSectionTree(sectionTree, version.content.testCases)
            ) : (
              <p className="text-gray-500 text-center">セクションがありません</p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500 border rounded-lg">
          このバージョンにはスナップショットがありません
        </div>
      )}
    </div>
  );
}

export default VersionDetail;
