'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TEST_SET_STATUS_INFO, type TestSetWithTags } from '@/types/test-set';
import { MoreVertical, Pencil, Trash2, Copy, Eye, ListChecks, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TestSetCardProps {
  testSet: TestSetWithTags & { testCaseCount?: number };
  onEdit: (testSet: TestSetWithTags) => void;
  onDelete: (testSet: TestSetWithTags) => void;
  onDuplicate: (testSet: TestSetWithTags) => void;
  onView: (testSet: TestSetWithTags) => void;
  onCreateTestRun?: (testSet: TestSetWithTags) => void;
}

export function TestSetCard({
  testSet,
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  onCreateTestRun,
}: TestSetCardProps) {
  const statusInfo = TEST_SET_STATUS_INFO[testSet.status];

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    ARCHIVED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2">
              <ListChecks className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="line-clamp-1 text-base">{testSet.name}</CardTitle>
              <CardDescription className="text-xs">v{testSet.version}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">メニュー</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(testSet)}>
                <Eye className="mr-2 size-4" />
                詳細を見る
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(testSet)}>
                <Pencil className="mr-2 size-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(testSet)}>
                <Copy className="mr-2 size-4" />
                複製
              </DropdownMenuItem>
              {onCreateTestRun && testSet.status === 'ACTIVE' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onCreateTestRun(testSet)}>
                    <Play className="mr-2 size-4" />
                    テストラン作成
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(testSet)} className="text-destructive">
                <Trash2 className="mr-2 size-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {testSet.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{testSet.description}</p>
        )}

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className={statusColors[testSet.status]}>
            {statusInfo.label}
          </Badge>
          {testSet.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
          {testSet.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{testSet.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {testSet.testCaseCount !== undefined ? `${testSet.testCaseCount} テストケース` : ''}
          </span>
          <span>実行回数: {testSet.executionCount}</span>
        </div>

        <div className="text-xs text-muted-foreground">
          更新: {formatDistanceToNow(new Date(testSet.updatedAt), { addSuffix: true, locale: ja })}
        </div>
      </CardContent>
    </Card>
  );
}
