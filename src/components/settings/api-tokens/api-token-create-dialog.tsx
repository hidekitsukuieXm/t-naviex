'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import {
  type ApiTokenScope,
  type CreateApiTokenRequest,
  API_TOKEN_SCOPE_GROUPS,
  API_TOKEN_SCOPE_LABELS,
  API_TOKEN_SCOPE_DESCRIPTIONS,
  TOKEN_EXPIRATION_OPTIONS,
  validateTokenName,
  validateScopes,
  calculateExpirationDate,
} from '@/types/api-token';

interface ApiTokenCreateDialogProps {
  onSuccess?: () => void;
}

type Step = 'form' | 'success';

export function ApiTokenCreateDialog({ onSuccess }: ApiTokenCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<ApiTokenScope[]>([]);
  const [expirationOption, setExpirationOption] = useState<string | null>(null);

  // 作成成功時のトークン
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const resetForm = () => {
    setStep('form');
    setName('');
    setSelectedScopes([]);
    setExpirationOption(null);
    setCreatedToken(null);
    setCopied(false);
    setShowToken(false);
    setError(null);
  };

  const handleClose = () => {
    setOpen(false);
    // ダイアログを閉じた後にフォームをリセット
    setTimeout(resetForm, 300);
  };

  const handleScopeChange = (scope: ApiTokenScope, checked: boolean) => {
    if (checked) {
      setSelectedScopes([...selectedScopes, scope]);
    } else {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    }
  };

  const handleSelectAllInGroup = (scopes: ApiTokenScope[]) => {
    const allSelected = scopes.every((s) => selectedScopes.includes(s));
    if (allSelected) {
      setSelectedScopes(selectedScopes.filter((s) => !scopes.includes(s)));
    } else {
      const newScopes = [...selectedScopes];
      scopes.forEach((s) => {
        if (!newScopes.includes(s)) {
          newScopes.push(s);
        }
      });
      setSelectedScopes(newScopes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // バリデーション
    const nameValidation = validateTokenName(name);
    if (!nameValidation.valid) {
      setError(nameValidation.error || 'トークン名が無効です。');
      return;
    }

    const scopesValidation = validateScopes(selectedScopes);
    if (!scopesValidation.valid) {
      setError(scopesValidation.error || 'スコープが無効です。');
      return;
    }

    setIsLoading(true);

    try {
      const expiresAt = calculateExpirationDate(expirationOption);

      const request: CreateApiTokenRequest = {
        name: name.trim(),
        scopes: selectedScopes,
        expiresAt: expiresAt?.toISOString() ?? null,
      };

      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'トークンの作成に失敗しました。');
      }

      const data = await response.json();
      setCreatedToken(data.plainToken);
      setStep('success');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トークンの作成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (createdToken) {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規トークン作成
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>新規APIトークン作成</DialogTitle>
              <DialogDescription>
                外部アプリケーションからAPIにアクセスするためのトークンを作成します。
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* トークン名 */}
              <div className="space-y-2">
                <Label htmlFor="name">トークン名 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: CI/CD Pipeline Token"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  このトークンの用途がわかりやすい名前を付けてください。
                </p>
              </div>

              {/* 有効期限 */}
              <div className="space-y-2">
                <Label htmlFor="expiration">有効期限</Label>
                <Select
                  value={expirationOption ?? 'null'}
                  onValueChange={(value) => setExpirationOption(value === 'null' ? null : value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="expiration">
                    <SelectValue placeholder="有効期限を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKEN_EXPIRATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value ?? 'null'} value={option.value ?? 'null'}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* スコープ選択 */}
              <div className="space-y-4">
                <Label>アクセス権限（スコープ） *</Label>
                <div className="space-y-4 rounded-md border p-4">
                  {API_TOKEN_SCOPE_GROUPS.map((group) => (
                    <div key={group.name} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-medium"
                          onClick={() => handleSelectAllInGroup(group.scopes)}
                          disabled={isLoading}
                        >
                          {group.name}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          ({group.scopes.filter((s) => selectedScopes.includes(s)).length}/
                          {group.scopes.length})
                        </span>
                      </div>
                      <div className="ml-4 grid gap-2 sm:grid-cols-2">
                        {group.scopes.map((scope) => (
                          <div key={scope} className="flex items-start gap-2">
                            <Checkbox
                              id={scope}
                              checked={selectedScopes.includes(scope)}
                              onCheckedChange={(checked) =>
                                handleScopeChange(scope, checked as boolean)
                              }
                              disabled={isLoading}
                            />
                            <div className="grid gap-0.5 leading-none">
                              <label
                                htmlFor={scope}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {API_TOKEN_SCOPE_LABELS[scope]}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {API_TOKEN_SCOPE_DESCRIPTIONS[scope]}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  選択されたスコープ: {selectedScopes.length}個
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '作成中...' : 'トークンを作成'}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>トークンが作成されました</DialogTitle>
              <DialogDescription>
                このトークンは一度だけ表示されます。必ずコピーして安全な場所に保存してください。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  このトークンは再表示できません。ダイアログを閉じる前に必ずコピーしてください。
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>APIトークン</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={createdToken || ''}
                      readOnly
                      type={showToken ? 'text' : 'password'}
                      className="font-mono pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyToken}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        コピー済み
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        コピー
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">使用方法</p>
                <p className="mt-1 text-muted-foreground">
                  APIリクエストの Authorization ヘッダーに以下の形式で設定してください:
                </p>
                <code className="mt-2 block rounded bg-background p-2 font-mono text-xs">
                  Authorization: Bearer {showToken ? createdToken : '••••••••'}
                </code>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>閉じる</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
