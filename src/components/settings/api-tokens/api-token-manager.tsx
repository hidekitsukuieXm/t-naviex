'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiTokenCreateDialog } from './api-token-create-dialog';
import { ApiTokenList } from './api-token-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { type ApiToken, type ApiTokenListResponse } from '@/types/api-token';
import { useToast } from '@/hooks/use-toast';

type FilterStatus = 'all' | 'active' | 'inactive';

export function ApiTokenManager() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const { toast } = useToast();

  const fetchTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterStatus === 'active') {
        params.set('isActive', 'true');
      } else if (filterStatus === 'inactive') {
        params.set('isActive', 'false');
      }

      const response = await fetch(`/api/tokens?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'トークン一覧の取得に失敗しました。');
      }

      const data: ApiTokenListResponse = await response.json();
      setTokens(data.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTokens();
  }, [fetchTokens]);

  const handleRevoke = async (id: string, reason?: string) => {
    try {
      const response = await fetch(`/api/tokens/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'トークンの失効に失敗しました。');
      }

      toast({
        title: 'トークンを失効しました',
        description: 'APIトークンが正常に失効されました。',
      });

      fetchTokens();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'トークンの失効に失敗しました。',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/tokens/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'トークンの削除に失敗しました。');
      }

      toast({
        title: 'トークンを削除しました',
        description: 'APIトークンが正常に削除されました。',
      });

      fetchTokens();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'トークンの削除に失敗しました。',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // 検索フィルタリング
  const filteredTokens = tokens.filter((token) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      token.name.toLowerCase().includes(query) || token.tokenPrefix.toLowerCase().includes(query)
    );
  });

  // ステータス別集計
  const activeCount = tokens.filter((t) => t.isActive && !t.revokedAt).length;
  const inactiveCount = tokens.filter((t) => !t.isActive || t.revokedAt).length;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">APIトークン管理</h2>
          <p className="text-sm text-muted-foreground">
            外部アプリケーションからAPIにアクセスするためのトークンを管理します。
          </p>
        </div>
        <ApiTokenCreateDialog onSuccess={fetchTokens} />
      </div>

      {/* フィルター */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="トークン名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(value) => setFilterStatus(value as FilterStatus)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて ({tokens.length})</SelectItem>
            <SelectItem value="active">有効 ({activeCount})</SelectItem>
            <SelectItem value="inactive">無効/失効 ({inactiveCount})</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchTokens} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="sr-only">更新</span>
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* タブ */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            すべて
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {filteredTokens.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="active">
            有効
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {filteredTokens.filter((t) => t.isActive && !t.revokedAt).length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            無効/失効
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {filteredTokens.filter((t) => !t.isActive || t.revokedAt).length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ApiTokenList
            tokens={filteredTokens}
            isLoading={isLoading}
            onRevoke={handleRevoke}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="active">
          <ApiTokenList
            tokens={filteredTokens.filter((t) => t.isActive && !t.revokedAt)}
            isLoading={isLoading}
            onRevoke={handleRevoke}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="inactive">
          <ApiTokenList
            tokens={filteredTokens.filter((t) => !t.isActive || t.revokedAt)}
            isLoading={isLoading}
            onRevoke={handleRevoke}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      {/* セキュリティ情報 */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-medium">セキュリティに関する注意</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>- APIトークンはパスワードと同様に機密情報として扱ってください。</li>
          <li>
            -
            トークンは作成時に一度だけ表示されます。紛失した場合は新しいトークンを作成してください。
          </li>
          <li>- 不要になったトークンは速やかに失効または削除してください。</li>
          <li>- 最小限の権限（スコープ）のみを付与することを推奨します。</li>
          <li>- 定期的にトークンの使用状況を確認し、不審なアクセスがないか監視してください。</li>
        </ul>
      </div>
    </div>
  );
}
