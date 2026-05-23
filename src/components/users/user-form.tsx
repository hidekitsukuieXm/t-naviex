'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { type User, type UserStatus, USER_STATUS_LABELS, validatePassword } from '@/types/user';

export interface UserFormData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  status: UserStatus;
}

interface UserFormProps {
  user?: User;
  onSubmit: (data: Omit<UserFormData, 'confirmPassword'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UserForm({ user, onSubmit, onCancel, isLoading = false }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email ?? '',
    name: user?.name ?? '',
    password: '',
    confirmPassword: '',
    status: user?.status ?? 'ACTIVE',
  });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email.trim()) {
      setError('メールアドレスは必須です。');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('メールアドレスの形式が正しくありません。');
      return;
    }

    if (!formData.name.trim()) {
      setError('名前は必須です。');
      return;
    }

    if (formData.name.length > 255) {
      setError('名前は255文字以内で入力してください。');
      return;
    }

    // Password validation (required only for new users)
    if (!user) {
      if (!formData.password) {
        setError('パスワードは必須です。');
        return;
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.errors.join(' '));
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('パスワードが一致しません。');
        return;
      }
    } else if (formData.password) {
      // For existing users, only validate if password is provided
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.errors.join(' '));
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('パスワードが一致しません。');
        return;
      }
    }

    try {
      await onSubmit({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        status: formData.status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">
          メールアドレス <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="user@example.com"
          disabled={isLoading}
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">
          名前 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="ユーザー名を入力"
          disabled={isLoading}
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          パスワード {!user && <span className="text-destructive">*</span>}
          {user && <span className="text-muted-foreground text-xs">（変更する場合のみ入力）</span>}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={user ? '新しいパスワードを入力' : 'パスワードを入力'}
            disabled={isLoading}
            maxLength={100}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          8文字以上、大文字・小文字・数字を含めてください
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          パスワード（確認） {!user && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="パスワードを再入力"
            disabled={isLoading}
            maxLength={100}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">ステータス</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as UserStatus })}
          disabled={isLoading}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="ステータスを選択" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(USER_STATUS_LABELS) as [UserStatus, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              保存中...
            </>
          ) : user ? (
            '更新'
          ) : (
            '作成'
          )}
        </Button>
      </div>
    </form>
  );
}
