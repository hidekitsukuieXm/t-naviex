'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Save, Key, Lock, Clock, History } from 'lucide-react';
import {
  type PasswordPolicy,
  type UpdatePasswordPolicyData,
  validatePasswordPolicySettings,
  PASSWORD_POLICY_LABELS,
  PASSWORD_POLICY_DESCRIPTIONS,
} from '@/types/password-policy';

interface PasswordPolicyFormProps {
  policy: PasswordPolicy;
  onSubmit: (data: UpdatePasswordPolicyData) => Promise<void>;
  isLoading?: boolean;
}

export function PasswordPolicyForm({
  policy,
  onSubmit,
  isLoading = false,
}: PasswordPolicyFormProps) {
  const [formData, setFormData] = useState<UpdatePasswordPolicyData>({
    minLength: policy.minLength,
    maxLength: policy.maxLength,
    requireUppercase: policy.requireUppercase,
    requireLowercase: policy.requireLowercase,
    requireNumbers: policy.requireNumbers,
    requireSpecialChars: policy.requireSpecialChars,
    expirationDays: policy.expirationDays,
    preventReuse: policy.preventReuse,
    maxLoginAttempts: policy.maxLoginAttempts,
    lockoutDurationMinutes: policy.lockoutDurationMinutes,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validatePasswordPolicySettings(formData);
    if (!validation.valid) {
      setError(validation.errors.join(' '));
      return;
    }

    try {
      await onSubmit(formData);
      setSuccess('パスワードポリシーを更新しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    }
  };

  const handleNumberChange = (field: keyof UpdatePasswordPolicyData, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setFormData({ ...formData, [field]: numValue });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          <Save className="size-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 文字数設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="size-5" />
            文字数要件
          </CardTitle>
          <CardDescription>パスワードの文字数に関する設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minLength">{PASSWORD_POLICY_LABELS.minLength}</Label>
              <Input
                id="minLength"
                type="number"
                min={1}
                max={50}
                value={formData.minLength}
                onChange={(e) => handleNumberChange('minLength', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.minLength}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLength">{PASSWORD_POLICY_LABELS.maxLength}</Label>
              <Input
                id="maxLength"
                type="number"
                min={50}
                max={200}
                value={formData.maxLength}
                onChange={(e) => handleNumberChange('maxLength', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.maxLength}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 文字種要件 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="size-5" />
            文字種要件
          </CardTitle>
          <CardDescription>パスワードに含める必要がある文字種の設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{PASSWORD_POLICY_LABELS.requireUppercase}</Label>
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.requireUppercase}
              </p>
            </div>
            <Switch
              checked={formData.requireUppercase}
              onCheckedChange={(checked) => setFormData({ ...formData, requireUppercase: checked })}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{PASSWORD_POLICY_LABELS.requireLowercase}</Label>
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.requireLowercase}
              </p>
            </div>
            <Switch
              checked={formData.requireLowercase}
              onCheckedChange={(checked) => setFormData({ ...formData, requireLowercase: checked })}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{PASSWORD_POLICY_LABELS.requireNumbers}</Label>
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.requireNumbers}
              </p>
            </div>
            <Switch
              checked={formData.requireNumbers}
              onCheckedChange={(checked) => setFormData({ ...formData, requireNumbers: checked })}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{PASSWORD_POLICY_LABELS.requireSpecialChars}</Label>
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.requireSpecialChars}
              </p>
            </div>
            <Switch
              checked={formData.requireSpecialChars}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, requireSpecialChars: checked })
              }
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* パスワード有効期間・履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="size-5" />
            パスワード有効期間・履歴
          </CardTitle>
          <CardDescription>パスワードの有効期間と再利用に関する設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expirationDays">{PASSWORD_POLICY_LABELS.expirationDays}</Label>
              <Input
                id="expirationDays"
                type="number"
                min={0}
                max={365}
                value={formData.expirationDays}
                onChange={(e) => handleNumberChange('expirationDays', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.expirationDays}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preventReuse">{PASSWORD_POLICY_LABELS.preventReuse}</Label>
              <Input
                id="preventReuse"
                type="number"
                min={0}
                max={24}
                value={formData.preventReuse}
                onChange={(e) => handleNumberChange('preventReuse', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.preventReuse}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アカウントロック設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="size-5" />
            アカウントロック設定
          </CardTitle>
          <CardDescription>ログイン失敗時のアカウントロックに関する設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">{PASSWORD_POLICY_LABELS.maxLoginAttempts}</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min={1}
                max={10}
                value={formData.maxLoginAttempts}
                onChange={(e) => handleNumberChange('maxLoginAttempts', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.maxLoginAttempts}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockoutDurationMinutes">
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  {PASSWORD_POLICY_LABELS.lockoutDurationMinutes}
                </span>
              </Label>
              <Input
                id="lockoutDurationMinutes"
                type="number"
                min={1}
                max={1440}
                value={formData.lockoutDurationMinutes}
                onChange={(e) => handleNumberChange('lockoutDurationMinutes', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_DESCRIPTIONS.lockoutDurationMinutes}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              設定を保存
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
