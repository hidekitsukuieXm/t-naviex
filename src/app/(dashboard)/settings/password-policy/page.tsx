'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordPolicyForm } from '@/components/password-policy/password-policy-form';
import {
  type PasswordPolicy,
  type UpdatePasswordPolicyData,
  DEFAULT_PASSWORD_POLICY,
} from '@/types/password-policy';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function PasswordPolicyPage() {
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchPolicy = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/password-policy');
      if (!response.ok) {
        throw new Error('パスワードポリシーの取得に失敗しました。');
      }

      const data: PasswordPolicy = await response.json();

      startTransition(() => {
        setPolicy(data);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
        // エラー時はデフォルト値を使用
        setPolicy({
          id: '0',
          ...DEFAULT_PASSWORD_POLICY,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const handleSubmit = async (data: UpdatePasswordPolicyData) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/password-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'パスワードポリシーの更新に失敗しました。');
      }

      const updatedPolicy: PasswordPolicy = await response.json();
      setPolicy(updatedPolicy);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">パスワードポリシー設定</h1>
        <p className="text-muted-foreground">
          パスワードの要件やアカウントロックに関する設定を管理します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            セキュリティ設定
          </CardTitle>
          <CardDescription>
            パスワードの文字数・文字種要件、有効期間、アカウントロックの設定を行います。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error && !policy ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : policy ? (
            <PasswordPolicyForm policy={policy} onSubmit={handleSubmit} isLoading={isSaving} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
