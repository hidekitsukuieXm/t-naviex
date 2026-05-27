'use client';

/**
 * TestCaseVersionManager Component
 *
 * テストケースバージョン管理のメインコンポーネント
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TestCaseVersion } from '@/types/test-case-version';
import { TestCaseVersionList } from './TestCaseVersionList';
import { TestCaseVersionDetail } from './TestCaseVersionDetail';
import { TestCaseVersionComparison } from './TestCaseVersionComparison';
import { TestCaseVersionRestore } from './TestCaseVersionRestore';

type ViewMode = 'list' | 'detail' | 'comparison' | 'restore';

interface TestCaseVersionManagerProps {
  testCaseId: string;
  testCaseTitle: string;
  currentVersion?: number;
  onVersionRestored?: () => void;
}

export function TestCaseVersionManager({
  testCaseId,
  testCaseTitle,
  currentVersion,
  onVersionRestored,
}: TestCaseVersionManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVersion, setSelectedVersion] = useState<TestCaseVersion | null>(null);
  const [compareVersionIds, setCompareVersionIds] = useState<{
    source: string;
    target: string;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectVersion = (version: TestCaseVersion) => {
    setSelectedVersion(version);
    setViewMode('detail');
  };

  const handleCompare = (sourceId: string, targetId: string) => {
    setCompareVersionIds({ source: sourceId, target: targetId });
    setViewMode('comparison');
  };

  const handleRestore = (version: TestCaseVersion) => {
    setSelectedVersion(version);
    setViewMode('restore');
  };

  const handleRestoreSuccess = () => {
    setViewMode('list');
    setSelectedVersion(null);
    setRefreshKey((prev) => prev + 1);
    onVersionRestored?.();
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedVersion(null);
    setCompareVersionIds(null);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">バージョン履歴</h2>
          <p className="text-sm text-gray-500">{testCaseTitle}</p>
        </div>
        {viewMode !== 'list' && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            ← 一覧に戻る
          </Button>
        )}
      </div>

      {/* コンテンツ */}
      {viewMode === 'list' && (
        <TestCaseVersionList
          key={refreshKey}
          testCaseId={testCaseId}
          currentVersion={currentVersion}
          onSelectVersion={handleSelectVersion}
          onCompare={handleCompare}
          onRestore={handleRestore}
        />
      )}

      {viewMode === 'detail' && selectedVersion && (
        <TestCaseVersionDetail
          versionId={selectedVersion.id}
          onClose={handleBack}
          onRestore={(version) => handleRestore(version)}
        />
      )}

      {viewMode === 'comparison' && compareVersionIds && (
        <TestCaseVersionComparison
          testCaseId={testCaseId}
          sourceVersionId={compareVersionIds.source}
          targetVersionId={compareVersionIds.target}
          onClose={handleBack}
        />
      )}

      {viewMode === 'restore' && selectedVersion && (
        <TestCaseVersionRestore
          testCaseId={testCaseId}
          version={selectedVersion}
          onSuccess={handleRestoreSuccess}
          onCancel={handleBack}
        />
      )}
    </div>
  );
}
