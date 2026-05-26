'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { TestSpecStatusBadge } from './test-spec-status-badge';
import { type TestSpec } from '@/types/test-spec';
import { ArrowLeft, FileText, Calendar, Lock, Pencil, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TestSpecHeaderProps {
  testSpec: TestSpec;
  projectId: string;
  backHref?: string;
}

export function TestSpecHeader({ testSpec, projectId, backHref }: TestSpecHeaderProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-specs/${testSpec.id}/pdf`);

      if (!response.ok) {
        throw new Error('PDF生成に失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-spec-${testSpec.name}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'PDFをダウンロードしました',
        description: 'テスト仕様書のPDFが正常にダウンロードされました。',
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: 'エラー',
        description: 'PDFのダウンロードに失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Download className="mr-1 size-3" />
                )}
                PDF
              </Button>
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
