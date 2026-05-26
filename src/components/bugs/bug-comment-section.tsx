'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageSquare, Send, Reply } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BugCommentWithRelations } from '@/types/bug-comment';

interface BugCommentSectionProps {
  projectId: string;
  bugId: string;
}

export function BugCommentSection({ projectId, bugId }: BugCommentSectionProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<BugCommentWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadComments = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/bugs/${bugId}/comments?includeInternal=true`
        );
        if (!isMounted) return;
        if (!response.ok) {
          throw new Error('コメントの取得に失敗しました。');
        }
        const data = await response.json();
        if (!isMounted) return;
        setComments(data.comments || []);
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

    loadComments();
    return () => {
      isMounted = false;
    };
  }, [projectId, bugId, toast]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/bugs/${bugId}/comments?includeInternal=true`
      );
      if (!response.ok) {
        throw new Error('コメントの取得に失敗しました。');
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch {
      // エラーは無視（再読み込み時のエラーは静かに失敗）
    }
  }, [projectId, bugId]);

  const handleSubmitComment = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          parentId: parentId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'コメントの投稿に失敗しました。');
      }

      toast({
        title: 'コメントを投稿しました',
      });

      if (parentId) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }
      fetchComments();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          <MessageSquare className="size-5" />
          コメント ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Comment Form */}
        <div className="space-y-2">
          <Textarea
            placeholder="コメントを入力..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => handleSubmitComment()}
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              投稿
            </Button>
          </div>
        </div>

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 size-8" />
            <p>コメントはまだありません。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id.toString()} className="space-y-3">
                <div className="flex gap-3">
                  <Avatar className="size-8">
                    <AvatarImage src={comment.author?.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {comment.author?.name ? getInitials(comment.author.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author?.name || '不明'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.isInternal && (
                        <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          内部
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setReplyingTo(
                          replyingTo === comment.id.toString() ? null : comment.id.toString()
                        )
                      }
                    >
                      <Reply className="mr-1 size-3" />
                      返信
                    </Button>

                    {/* Reply Form */}
                    {replyingTo === comment.id.toString() && (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          placeholder="返信を入力..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                          >
                            キャンセル
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitComment(comment.id.toString())}
                            disabled={isSubmitting || !replyContent.trim()}
                          >
                            返信
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-muted pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id.toString()} className="flex gap-3">
                            <Avatar className="size-6">
                              <AvatarFallback className="text-xs">?</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs">返信</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(reply.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
