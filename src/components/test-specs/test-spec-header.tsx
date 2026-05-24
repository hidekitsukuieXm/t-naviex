'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { TestSpecStatusBadge } from './test-spec-status-badge';
import { type TestSpec } from '@/types/test-spec';
import { ArrowLeft, FileText, Calendar, Lock, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestSpecHeaderProps {
  testSpec: TestSpec;
  projectId: string;
  backHref?: string;
}

export function TestSpecHeader({ testSpec, projectId, backHref }: TestSpecHeaderProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <Link
        href={backHref || `/projects/${projectId}/test-specs`}
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
      >
        <ArrowLeft className="mr-2 size-4" />
        テスト仕様書一覧に戻る
      </Link>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{testSpec.name}</h1>
                {testSpec.isLocked && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="size-3" />
                    ロック中
                  </span>
                )}
              </div>
              {testSpec.description && (
                <p className="text-sm text-muted-foreground">{testSpec.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TestSpecStatusBadge status={testSpec.status} />
              <Link
                href={`/projects/${projectId}/test-specs/${testSpec.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Pencil className="mr-1 size-3" />
                編集
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="size-4" />
              <span>バージョン: v{testSpec.version}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="size-4" />
              <span>作成日: {formatDate(testSpec.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="size-4" />
              <span>更新日: {formatDate(testSpec.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
