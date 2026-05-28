'use client';

import { ApiTokenCard } from './api-token-card';
import { type ApiToken } from '@/types/api-token';
import { Skeleton } from '@/components/ui/skeleton';

interface ApiTokenListProps {
  tokens: ApiToken[];
  isLoading?: boolean;
  onRevoke: (id: string, reason?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ApiTokenList({ tokens, isLoading, onRevoke, onDelete }: ApiTokenListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          APIトークンはまだ作成されていません。
        </p>
        <p className="text-sm text-muted-foreground">
          「新規トークン作成」ボタンから最初のトークンを作成してください。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tokens.map((token) => (
        <ApiTokenCard
          key={token.id}
          token={token}
          onRevoke={onRevoke}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
