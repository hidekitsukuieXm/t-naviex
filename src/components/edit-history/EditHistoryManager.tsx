'use client';

/**
 * EditHistoryManager Component
 *
 * 編集履歴管理のメインコンポーネント
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EditHistory } from '@/types/edit-history';
import { EditHistoryList } from './EditHistoryList';
import { EditHistoryDetail } from './EditHistoryDetail';
import { SideBySideDiff } from './SideBySideDiff';

type ViewMode = 'list' | 'detail' | 'diff';

interface EditHistoryManagerProps {
  testCaseId: string;
  testCaseTitle: string;
}

export function EditHistoryManager({ testCaseId, testCaseTitle }: EditHistoryManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedHistory, setSelectedHistory] = useState<EditHistory | null>(null);
  const [compareIds, setCompareIds] = useState<{
    source: string;
    target: string;
  } | null>(null);

  const handleSelectHistory = (history: EditHistory) => {
    setSelectedHistory(history);
    setViewMode('detail');
  };

  const handleCompare = (sourceId: string, targetId: string) => {
    setCompareIds({ source: sourceId, target: targetId });
    setViewMode('diff');
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedHistory(null);
    setCompareIds(null);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">編集履歴</h2>
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
        <EditHistoryList
          testCaseId={testCaseId}
          onSelectHistory={handleSelectHistory}
          onCompare={handleCompare}
        />
      )}

      {viewMode === 'detail' && selectedHistory && (
        <EditHistoryDetail history={selectedHistory} onClose={handleBack} />
      )}

      {viewMode === 'diff' && compareIds && (
        <SideBySideDiff
          testCaseId={testCaseId}
          sourceId={compareIds.source}
          targetId={compareIds.target}
          type="history"
          onClose={handleBack}
        />
      )}
    </div>
  );
}
