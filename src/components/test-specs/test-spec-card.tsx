'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { type TestSpec } from '@/types/test-spec';
import { TestSpecStatusBadge } from './test-spec-status-badge';
import { Pencil, Trash2, Loader2, Calendar, Lock, FileText } from 'lucide-react';

interface TestSpecCardProps {
  testSpec: TestSpec;
  projectId: string;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function TestSpecCard({ testSpec, projectId, onDelete, isDeleting }: TestSpecCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="line-clamp-1 text-lg">
              <Link
                href={`/projects/${projectId}/test-specs/${testSpec.id}`}
                className="hover:underline"
              >
                {testSpec.name}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2 min-h-[2.5rem]">
              {testSpec.description || 'テスト仕様書の説明がありません'}
            </CardDescription>
          </div>
          <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
            <TestSpecStatusBadge status={testSpec.status} />
            {testSpec.isLocked && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3" />
                ロック中
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="size-3.5" />
            <span>v{testSpec.version}</span>
          </div>
          {testSpec._count && (
            <div className="flex items-center gap-1">
              <span>{testSpec._count.versions}件のバージョン</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            <span>{formatDate(testSpec.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${projectId}/test-specs/${testSpec.id}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'flex-1' })}
          >
            <Pencil className="mr-1.5 size-3.5" />
            編集
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(testSpec.id)}
            disabled={isDeleting || testSpec.isLocked}
            className="flex-1 text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-3.5" />
            )}
            削除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
