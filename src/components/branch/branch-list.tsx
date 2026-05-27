'use client';

/**
 * Branch List Component
 *
 * ブランチ一覧表示コンポーネント
 */

import { useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, GitBranch, Trash2, Edit2, Lock, GitMerge } from 'lucide-react';
import {
  Branch,
  BranchType,
  BranchStatus,
  getBranchTypeLabel,
  getBranchStatusLabel,
  getBranchTypeColor,
  getBranchStatusColor,
} from '@/types/branch';

interface BranchListProps {
  branches: Branch[];
  currentBranchId?: string;
  onSelectBranch: (branchId: string) => void;
  onEditBranch?: (branchId: string) => void;
  onDeleteBranch?: (branchId: string) => void;
  onFreezeBranch?: (branchId: string) => void;
  onCreateMergeRequest?: (sourceBranchId: string) => void;
  isLoading?: boolean;
}

export function BranchList({
  branches,
  currentBranchId,
  onSelectBranch,
  onEditBranch,
  onDeleteBranch,
  onFreezeBranch,
  onCreateMergeRequest,
  isLoading,
}: BranchListProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteTargetId && onDeleteBranch) {
      onDeleteBranch(deleteTargetId);
    }
    setDeleteTargetId(null);
  };

  const getTypeVariant = (type: BranchType): 'default' | 'secondary' | 'outline' => {
    const colorClass = getBranchTypeColor(type);
    if (colorClass.includes('blue')) return 'default';
    if (colorClass.includes('green')) return 'secondary';
    return 'outline';
  };

  const getStatusVariant = (
    status: BranchStatus
  ): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const colorClass = getBranchStatusColor(status);
    if (colorClass.includes('green')) return 'default';
    if (colorClass.includes('blue')) return 'secondary';
    if (colorClass.includes('yellow')) return 'outline';
    if (colorClass.includes('red')) return 'destructive';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <GitBranch className="h-8 w-8 mb-2" />
        <p>ブランチがありません</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ブランチ名</TableHead>
            <TableHead>タイプ</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>作成日</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow
              key={branch.id}
              className={branch.id === currentBranchId ? 'bg-muted/50' : ''}
            >
              <TableCell>
                <button
                  onClick={() => onSelectBranch(branch.id)}
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{branch.name}</span>
                  {branch.id === currentBranchId && (
                    <Badge variant="outline" className="text-xs">
                      現在
                    </Badge>
                  )}
                </button>
                {branch.description && (
                  <p className="text-sm text-muted-foreground mt-1">{branch.description}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={getTypeVariant(branch.type)}>
                  {getBranchTypeLabel(branch.type)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(branch.status)}>
                  {getBranchStatusLabel(branch.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(branch.createdAt).toLocaleDateString('ja-JP')}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEditBranch && branch.type !== BranchType.MASTER && (
                      <DropdownMenuItem onClick={() => onEditBranch(branch.id)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        編集
                      </DropdownMenuItem>
                    )}
                    {onFreezeBranch && branch.status === BranchStatus.ACTIVE && (
                      <DropdownMenuItem onClick={() => onFreezeBranch(branch.id)}>
                        <Lock className="h-4 w-4 mr-2" />
                        凍結
                      </DropdownMenuItem>
                    )}
                    {onCreateMergeRequest && branch.type !== BranchType.MASTER && (
                      <DropdownMenuItem onClick={() => onCreateMergeRequest(branch.id)}>
                        <GitMerge className="h-4 w-4 mr-2" />
                        マージリクエスト作成
                      </DropdownMenuItem>
                    )}
                    {onDeleteBranch && branch.type !== BranchType.MASTER && (
                      <DropdownMenuItem
                        onClick={() => setDeleteTargetId(branch.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ブランチを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。ブランチに関連するスナップショットも削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default BranchList;
