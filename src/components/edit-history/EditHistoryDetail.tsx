'use client';

/**
 * EditHistoryDetail Component
 *
 * 編集履歴の詳細を表示するコンポーネント
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  EditHistory,
  getOperationTypeLabel,
  getOperationTypeColor,
  formatEditDate,
  valueToString,
} from '@/types/edit-history';

interface EditHistoryDetailProps {
  history: EditHistory;
  onClose?: () => void;
}

export function EditHistoryDetail({ history, onClose }: EditHistoryDetailProps) {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-sm rounded ${getOperationTypeColor(history.operation)}`}
            >
              {getOperationTypeLabel(history.operation)}
            </span>
            <span className="text-lg font-semibold">{history.summary}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {history.editedByName && <span className="mr-2">{history.editedByName}</span>}
            <span>{formatEditDate(history.editedAt)}</span>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            閉じる
          </Button>
        )}
      </div>

      {/* フィールド変更一覧 */}
      {history.fieldChanges.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">変更内容</h4>
          {history.fieldChanges.map((change, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-2">{change.fieldLabel}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">変更前:</span>
                  <div className="p-2 bg-red-50 rounded mt-1 text-sm whitespace-pre-wrap">
                    {formatValue(change.previousValue)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">変更後:</span>
                  <div className="p-2 bg-green-50 rounded mt-1 text-sm whitespace-pre-wrap">
                    {formatValue(change.newValue)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
          フィールドの変更はありません
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(なし)';
  }
  return valueToString(value);
}
