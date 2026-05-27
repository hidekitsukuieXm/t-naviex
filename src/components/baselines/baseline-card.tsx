'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  type BaselineWithStats,
  BASELINE_STATUS_INFO,
  type BaselineStatus,
} from '@/types/baseline';
import {
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle,
  Lock,
  Archive,
  GitCompare,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface BaselineCardProps {
  baseline: BaselineWithStats;
  onView: (baseline: BaselineWithStats) => void;
  onApprove?: (baseline: BaselineWithStats) => void;
  onLock?: (baseline: BaselineWithStats) => void;
  onArchive?: (baseline: BaselineWithStats) => void;
  onCompare?: (baseline: BaselineWithStats) => void;
  onDelete?: (baseline: BaselineWithStats) => void;
}

export function BaselineCard({
  baseline,
  onView,
  onApprove,
  onLock,
  onArchive,
  onCompare,
  onDelete,
}: BaselineCardProps) {
  const statusColors: Record<BaselineStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    APPROVED: 'bg-green-100 text-green-800',
    LOCKED: 'bg-blue-100 text-blue-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };

  const canApprove = baseline.status === 'DRAFT';
  const canLock = baseline.status === 'APPROVED';
  const canArchive = baseline.status !== 'ARCHIVED';
  const canDelete = baseline.status !== 'LOCKED';

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium leading-none">{baseline.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">v{baseline.version}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(baseline)}>
                <Eye className="mr-2 size-4" />
                詳細を表示
              </DropdownMenuItem>
              {onCompare && (
                <DropdownMenuItem onClick={() => onCompare(baseline)}>
                  <GitCompare className="mr-2 size-4" />
                  比較
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canApprove && onApprove && (
                <DropdownMenuItem onClick={() => onApprove(baseline)}>
                  <CheckCircle className="mr-2 size-4" />
                  承認
                </DropdownMenuItem>
              )}
              {canLock && onLock && (
                <DropdownMenuItem onClick={() => onLock(baseline)}>
                  <Lock className="mr-2 size-4" />
                  ロック
                </DropdownMenuItem>
              )}
              {canArchive && onArchive && (
                <DropdownMenuItem onClick={() => onArchive(baseline)}>
                  <Archive className="mr-2 size-4" />
                  アーカイブ
                </DropdownMenuItem>
              )}
              {canDelete && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(baseline)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    削除
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        <div className="mb-3">
          <Badge className={statusColors[baseline.status]}>
            {BASELINE_STATUS_INFO[baseline.status].label}
          </Badge>
        </div>

        {baseline.description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{baseline.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="size-3" />
            <span>{baseline.totalCases} ケース</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>{baseline.totalSteps} ステップ</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1">
            <User className="size-3" />
            <span>{baseline.createdBy?.name || '-'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            <span>{format(new Date(baseline.snapshotAt), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>
          </div>
        </div>
        {baseline.approvedBy && baseline.approvedAt && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="size-3" />
            <span>
              {baseline.approvedBy.name}が
              {format(new Date(baseline.approvedAt), 'yyyy/MM/dd', { locale: ja })}に承認
            </span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
