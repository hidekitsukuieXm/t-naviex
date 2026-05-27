'use client';

/**
 * TestCaseVersionDetail Component
 *
 * テストケースバージョンの詳細を表示するコンポーネント
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  TestCaseVersion,
  TestCaseVersionContent,
  getTestCaseFieldLabel,
} from '@/types/test-case-version';

interface TestCaseVersionDetailProps {
  versionId: string;
  onClose?: () => void;
  onRestore?: (version: TestCaseVersion) => void;
}

export function TestCaseVersionDetail({
  versionId,
  onClose,
  onRestore,
}: TestCaseVersionDetailProps) {
  const [version, setVersion] = useState<TestCaseVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/test-cases/0/versions/${versionId}`);

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
  }, [versionId]);

  const handleRetry = () => {
    retryRef.current();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
          再試行
        </Button>
      </div>
    );
  }

  if (!version) {
    return <div className="p-8 text-center text-gray-500">バージョンが見つかりません</div>;
  }

  const content = version.content as TestCaseVersionContent;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">バージョン {version.version}</h3>
          <p className="text-sm text-gray-500">{formatDate(version.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {onRestore && (
            <Button variant="outline" size="sm" onClick={() => onRestore(version)}>
              このバージョンに復元
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              閉じる
            </Button>
          )}
        </div>
      </div>

      {version.changeNote && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">{version.changeNote}</span>
        </div>
      )}

      {/* コンテンツ */}
      <div className="space-y-4">
        {/* 基本情報 */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">基本情報</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">{getTestCaseFieldLabel('title')}</dt>
            <dd>{content.title}</dd>

            {content.description && (
              <>
                <dt className="text-gray-500">{getTestCaseFieldLabel('description')}</dt>
                <dd>{content.description}</dd>
              </>
            )}

            {content.preconditions && (
              <>
                <dt className="text-gray-500">{getTestCaseFieldLabel('preconditions')}</dt>
                <dd>{content.preconditions}</dd>
              </>
            )}

            {content.priority && (
              <>
                <dt className="text-gray-500">{getTestCaseFieldLabel('priority')}</dt>
                <dd>{content.priority}</dd>
              </>
            )}

            {content.testType && (
              <>
                <dt className="text-gray-500">{getTestCaseFieldLabel('testType')}</dt>
                <dd>{content.testType}</dd>
              </>
            )}

            {content.testTechnique && (
              <>
                <dt className="text-gray-500">{getTestCaseFieldLabel('testTechnique')}</dt>
                <dd>{content.testTechnique}</dd>
              </>
            )}

            {content.estimatedTime && (
              <>
                <dt className="text-gray-500">{getTestCaseFieldLabel('estimatedTime')}</dt>
                <dd>{content.estimatedTime}分</dd>
              </>
            )}
          </dl>
        </div>

        {/* タグ */}
        {content.tags && content.tags.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">{getTestCaseFieldLabel('tags')}</h4>
            <div className="flex flex-wrap gap-2">
              {content.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* テストステップ */}
        {content.steps && content.steps.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">{getTestCaseFieldLabel('steps')}</h4>
            <div className="space-y-2">
              {content.steps.map((step) => (
                <div key={step.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium">
                      {step.stepNumber}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div>
                        <span className="text-xs text-gray-500">操作:</span>
                        <p className="text-sm">{step.action}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">期待結果:</span>
                        <p className="text-sm">{step.expectedResult}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
