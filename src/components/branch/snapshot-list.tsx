'use client';

/**
 * Snapshot List Component
 *
 * スナップショット履歴表示コンポーネント
 */

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCommit, Clock, FileText } from 'lucide-react';
import { BranchSnapshot } from '@/types/branch';

interface SnapshotListProps {
  snapshots: BranchSnapshot[];
  onSelectSnapshot?: (snapshotId: string) => void;
  selectedSnapshotId?: string;
  maxHeight?: string;
  isLoading?: boolean;
}

export function SnapshotList({
  snapshots,
  onSelectSnapshot,
  selectedSnapshotId,
  maxHeight = '400px',
  isLoading,
}: SnapshotListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <GitCommit className="h-8 w-8 mb-2" />
        <p>スナップショットがありません</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }}>
      <div className="space-y-2 p-1">
        {snapshots.map((snapshot, index) => (
          <div
            key={snapshot.id}
            onClick={() => onSelectSnapshot?.(snapshot.id)}
            className={`
              p-3 rounded-lg border transition-colors
              ${onSelectSnapshot ? 'cursor-pointer hover:bg-muted/50' : ''}
              ${selectedSnapshotId === snapshot.id ? 'border-primary bg-primary/5' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* コミットアイコン */}
              <div className="relative">
                <GitCommit className="h-5 w-5 text-muted-foreground mt-0.5" />
                {index < snapshots.length - 1 && (
                  <div className="absolute top-6 left-1/2 w-px h-8 bg-border -translate-x-1/2" />
                )}
              </div>

              {/* コミット情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs shrink-0">
                    v{snapshot.version}
                  </Badge>
                  <span className="text-sm font-medium truncate">{snapshot.commitMessage}</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(snapshot.createdAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {snapshot.testCases.length} テストケース
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default SnapshotList;
