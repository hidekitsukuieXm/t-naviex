'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Star } from 'lucide-react';
import type { TestCaseTemplate, TestCaseTemplateDetail } from '@/types/template';

// ============================================
// Types
// ============================================

interface TemplateSelectProps {
  projectId: string;
  value?: string;
  onSelect?: (template: TestCaseTemplateDetail | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Component
// ============================================

export function TemplateSelect({
  projectId,
  value,
  onSelect,
  placeholder = 'テンプレートを選択',
  disabled,
  className,
}: TemplateSelectProps) {
  const [templates, setTemplates] = useState<TestCaseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadedRef = useRef(false);

  // データ取得
  const fetchTemplates = useCallback(async () => {
    if (loadedRef.current) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/templates`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました。');
      }
      const data = await response.json();
      setTemplates(data.templates);
      loadedRef.current = true;
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // テンプレート詳細取得
  const fetchTemplateDetail = useCallback(
    async (templateId: string): Promise<TestCaseTemplateDetail | null> => {
      setIsLoadingDetail(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/templates/${templateId}`);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました。');
        }
        return await response.json();
      } catch (error) {
        console.error('テンプレート詳細取得エラー:', error);
        return null;
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [projectId]
  );

  // 選択変更
  const handleValueChange = useCallback(
    async (newValue: string) => {
      if (newValue === '__none__') {
        onSelect?.(null);
        return;
      }

      const detail = await fetchTemplateDetail(newValue);
      if (detail) {
        onSelect?.(detail);
      }
    },
    [onSelect, fetchTemplateDetail]
  );

  // 開いた時にデータ取得
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        void fetchTemplates();
      }
    },
    [fetchTemplates]
  );

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => void handleValueChange(v)}
      onOpenChange={handleOpenChange}
      disabled={disabled || isLoadingDetail}
    >
      <SelectTrigger className={className}>
        {isLoadingDetail ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            読み込み中...
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-muted-foreground">テンプレートなし</span>
        </SelectItem>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            テンプレートがありません
          </div>
        ) : (
          templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <span className="flex items-center gap-2">
                <FileText className="size-4" />
                {template.name}
                {template.isDefault && <Star className="size-3 text-yellow-500" />}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

// ============================================
// Apply Template Button Component
// ============================================

interface ApplyTemplateButtonProps {
  projectId: string;
  onApply: (template: TestCaseTemplateDetail) => void;
  disabled?: boolean;
  className?: string;
}

export function ApplyTemplateButton({
  projectId,
  onApply,
  disabled,
  className,
}: ApplyTemplateButtonProps) {
  const [templates, setTemplates] = useState<TestCaseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadedRef = useRef(false);

  // データ取得
  const fetchTemplates = useCallback(async () => {
    if (loadedRef.current) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/templates`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました。');
      }
      const data = await response.json();
      setTemplates(data.templates);
      loadedRef.current = true;
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // テンプレート詳細取得して適用
  const handleApply = useCallback(
    async (templateId: string) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/templates/${templateId}`);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました。');
        }
        const detail = await response.json();
        onApply(detail);
        setIsOpen(false);
      } catch (error) {
        console.error('テンプレート適用エラー:', error);
      }
    },
    [projectId, onApply]
  );

  // 開いた時にデータ取得
  const handleClick = useCallback(() => {
    void fetchTemplates();
    setIsOpen(true);
  }, [fetchTemplates]);

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={className}
      >
        <FileText className="mr-2 size-4" />
        テンプレート適用
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select onValueChange={(v) => void handleApply(v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="テンプレートを選択" />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              テンプレートがありません
            </div>
          ) : (
            templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <span className="flex items-center gap-2">
                  <FileText className="size-4" />
                  {template.name}
                  {template.isDefault && <Star className="size-3 text-yellow-500" />}
                </span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
        キャンセル
      </Button>
    </div>
  );
}
