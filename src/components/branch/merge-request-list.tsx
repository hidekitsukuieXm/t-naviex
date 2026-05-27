'use client';

/**
 * Merge Request List Component
 *
 * マージリクエスト一覧表示コンポーネント
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, GitMerge, Eye, XCircle, AlertTriangle } from 'lucide-react';
import {
  MergeRequest,
  MergeStatus,
  getMergeStatusLabel,
  getMergeStatusColor,
} from '@/types/branch';

interface MergeRequestListProps {
  mergeRequests: MergeRequest[];
  branches: { id: string; name: string }[];
  onViewMergeRequest: (mergeRequestId: string) => void;
  onCancelMergeRequest?: (mergeRequestId: string) => void;
  isLoading?: boolean;
}

export function MergeRequestList({
  mergeRequests,
  branches,
  onViewMergeRequest,
  onCancelMergeRequest,
  isLoading,
}: MergeRequestListProps) {
  const getBranchName = (branchId: string) => {
    return branches.find((b) => b.id === branchId)?.name || 'Unknown';
  };

  const getStatusVariant = (
    status: MergeStatus
  ): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const colorClass = getMergeStatusColor(status);
    if (colorClass.includes('green')) return 'default';
    if (colorClass.includes('yellow')) return 'outline';
    if (colorClass.includes('red')) return 'destructive';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (mergeRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <GitMerge className="h-8 w-8 mb-2" />
        <p>マージリクエストがありません</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>タイトル</TableHead>
          <TableHead>ソース → ターゲット</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>作成日</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mergeRequests.map((mr) => (
          <TableRow key={mr.id}>
            <TableCell>
              <button
                onClick={() => onViewMergeRequest(mr.id)}
                className="text-left hover:underline"
              >
                <span className="font-medium">{mr.title}</span>
                {mr.conflicts.length > 0 && !mr.conflicts.every((c) => c.isResolved) && (
                  <span className="ml-2 inline-flex items-center text-yellow-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {mr.conflicts.filter((c) => !c.isResolved).length} 件のコンフリクト
                  </span>
                )}
              </button>
              {mr.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{mr.description}</p>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{getBranchName(mr.sourceBranchId)}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline">{getBranchName(mr.targetBranchId)}</Badge>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(mr.status)}>{getMergeStatusLabel(mr.status)}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(mr.createdAt).toLocaleDateString('ja-JP')}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewMergeRequest(mr.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    詳細を見る
                  </DropdownMenuItem>
                  {onCancelMergeRequest &&
                    mr.status !== MergeStatus.COMPLETED &&
                    mr.status !== MergeStatus.CANCELLED && (
                      <DropdownMenuItem
                        onClick={() => onCancelMergeRequest(mr.id)}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        キャンセル
                      </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default MergeRequestList;
