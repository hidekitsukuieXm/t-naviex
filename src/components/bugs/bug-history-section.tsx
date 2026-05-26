'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, History, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BugHistoryWithRelations } from '@/types/bug-history';
import { BUG_HISTORY_FIELD_LABELS, formatFieldValue } from '@/types/bug-history';

interface BugHistorySectionProps {
  projectId: string;
  bugId: string;
}

export function BugHistorySection({ projectId, bugId }: BugHistorySectionProps) {
  const { toast } = useToast();
  const [histories, setHistories] = useState<BugHistoryWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHistories = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}/history`);
        if (!isMounted) return;
        if (!response.ok) {
          throw new Error('変更履歴の取得に失敗しました。');
        }
        const data = await response.json();
        if (!isMounted) return;
        setHistories(data.histories || []);
      } catch (err) {
        if (!isMounted) return;
        toast({
          title: 'エラー',
          description: err instanceof Error ? err.message : 'エラーが発生しました。',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadHistories();
    return () => {
      isMounted = false;
    };
  }, [projectId, bugId, toast]);

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getFieldLabel = (fieldName: string) => {
    return BUG_HISTORY_FIELD_LABELS[fieldName] || fieldName;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          変更履歴 ({histories.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {histories.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <History className="mx-auto mb-2 size-8" />
            <p>変更履歴はありません。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {histories.map((history) => (
              <div key={history.id.toString()} className="flex gap-3 border-l-2 border-muted pl-4">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {history.changedBy?.name ? getInitials(history.changedBy.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{history.changedBy?.name || '不明'}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(history.changedAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="font-medium">{getFieldLabel(history.fieldName)}</span>
                    を変更しました
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="rounded bg-muted px-2 py-0.5">
                      {formatFieldValue(history.fieldName, history.oldValue) || '(なし)'}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                      {formatFieldValue(history.fieldName, history.newValue) || '(なし)'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
