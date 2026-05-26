'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Paperclip,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  File,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BugAttachmentWithRelations } from '@/types/bug-attachment';

interface BugAttachmentSectionProps {
  projectId: string;
  bugId: string;
}

export function BugAttachmentSection({ projectId, bugId }: BugAttachmentSectionProps) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<BugAttachmentWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAttachments = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}/attachments`);
        if (!isMounted) return;
        if (!response.ok) {
          throw new Error('添付ファイルの取得に失敗しました。');
        }
        const data = await response.json();
        if (!isMounted) return;
        setAttachments(data.attachments || []);
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

    loadAttachments();
    return () => {
      isMounted = false;
    };
  }, [projectId, bugId, toast]);

  const fetchAttachments = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}/attachments`);
      if (!response.ok) {
        throw new Error('添付ファイルの取得に失敗しました。');
      }
      const data = await response.json();
      setAttachments(data.attachments || []);
    } catch {
      // エラーは無視（再読み込み時のエラーは静かに失敗）
    }
  }, [projectId, bugId]);

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('この添付ファイルを削除してもよろしいですか？')) {
      return;
    }

    setDeletingId(attachmentId);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/bugs/${bugId}/attachments/${attachmentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添付ファイルの削除に失敗しました。');
      }

      toast({
        title: '添付ファイルを削除しました',
      });

      fetchAttachments();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="size-8 text-blue-500" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText className="size-8 text-red-500" />;
    }
    return <File className="size-8 text-gray-500" />;
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
          <Paperclip className="size-5" />
          添付ファイル ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Paperclip className="mx-auto mb-2 size-8" />
            <p>添付ファイルはありません。</p>
            <p className="text-sm mt-1">ファイルのアップロード機能は今後実装予定です。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id.toString()}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {getFileIcon(attachment.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{attachment.fileName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span>•</span>
                    <span>{attachment.uploadedBy?.name || '不明'}</span>
                    <span>•</span>
                    <span>{formatDate(attachment.createdAt)}</span>
                  </div>
                  {attachment.description && (
                    <p className="text-sm text-muted-foreground mt-1">{attachment.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toast({ title: 'ダウンロード機能は今後実装予定です' })}
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(attachment.id.toString())}
                    disabled={deletingId === attachment.id.toString()}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingId === attachment.id.toString() ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
