'use client';
'use no memo';

/**
 * Step Library Panel Component
 *
 * ステップライブラリの表示・管理パネル
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Hash,
  Copy,
  Loader2,
} from 'lucide-react';
import {
  GherkinStepType,
  getStepTypeColor,
  getStepTypeLabel,
  getStepKeyword,
} from '@/types/gherkin';

export interface StepDefinition {
  id: string;
  projectId: string;
  type: GherkinStepType;
  pattern: string;
  displayText: string;
  description?: string;
  parameters?: StepParameter[];
  isShared: boolean;
  usageCount: number;
  lastUsedAt?: string;
}

export interface StepParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'table' | 'docstring';
  description?: string;
  defaultValue?: string;
}

export interface StepLibraryPanelProps {
  projectId: string;
  language?: 'ja' | 'en';
  onStepSelect?: (step: StepDefinition) => void;
  onStepInsert?: (text: string) => void;
  className?: string;
}

/**
 * ステップライブラリパネル
 */
export function StepLibraryPanel({
  projectId,
  language = 'ja',
  onStepSelect,
  onStepInsert,
  className,
}: StepLibraryPanelProps) {
  const [steps, setSteps] = useState<StepDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<GherkinStepType | 'ALL'>('ALL');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<StepDefinition | null>(null);
  const isMounted = useRef(true);

  // ステップ定義を取得
  const fetchSteps = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeShared: 'true',
        ...(typeFilter !== 'ALL' && { type: typeFilter }),
        ...(search && { search }),
      });

      const res = await fetch(`/api/projects/${projectId}/bdd/step-definitions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch steps');

      const data = await res.json();
      if (isMounted.current) {
        setSteps(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch step definitions:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [projectId, typeFilter, search]);

  useEffect(() => {
    isMounted.current = true;
    requestAnimationFrame(() => {
      if (isMounted.current) {
        fetchSteps();
      }
    });
    return () => {
      isMounted.current = false;
    };
  }, [fetchSteps]);

  // ステップをクリック
  const handleStepClick = (step: StepDefinition) => {
    if (onStepSelect) {
      onStepSelect(step);
    }
  };

  // ステップを挿入
  const handleInsertStep = (step: StepDefinition) => {
    if (onStepInsert) {
      const keyword = getStepKeyword(step.type, language);
      onStepInsert(`${keyword} ${step.displayText}`);
    }
  };

  // ステップをコピー
  const handleCopyStep = (step: StepDefinition) => {
    const keyword = getStepKeyword(step.type, language);
    navigator.clipboard.writeText(`${keyword} ${step.displayText}`);
  };

  // ステップ削除
  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('このステップ定義を削除しますか？')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/bdd/step-definitions/${stepId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete step');
      fetchSteps();
    } catch (error) {
      console.error('Failed to delete step:', error);
    }
  };

  // タイプ別にグループ化
  const groupedSteps = steps.reduce(
    (acc, step) => {
      if (!acc[step.type]) {
        acc[step.type] = [];
      }
      acc[step.type].push(step);
      return acc;
    },
    {} as Record<GherkinStepType, StepDefinition[]>
  );

  const stepTypes: GherkinStepType[] = ['GIVEN', 'WHEN', 'THEN', 'AND', 'BUT'];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* ヘッダー */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">ステップライブラリ</h3>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            追加
          </Button>
        </div>

        {/* 検索・フィルター */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ステップを検索..."
              className="pl-8 h-8"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as GherkinStepType | 'ALL')}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">すべて</SelectItem>
              {stepTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getStepTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ステップ一覧 */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : steps.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>ステップ定義がありません</p>
            <Button variant="link" className="mt-2" onClick={() => setIsCreateDialogOpen(true)}>
              最初のステップを追加
            </Button>
          </div>
        ) : typeFilter === 'ALL' ? (
          // タイプ別グループ表示
          <div className="p-2 space-y-4">
            {stepTypes.map((type) => {
              const typeSteps = groupedSteps[type];
              if (!typeSteps?.length) return null;

              return (
                <div key={type}>
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getStepTypeColor(type) }}
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      {getStepTypeLabel(type)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {typeSteps.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {typeSteps.map((step) => (
                      <StepItem
                        key={step.id}
                        step={step}
                        language={language}
                        onClick={() => handleStepClick(step)}
                        onInsert={() => handleInsertStep(step)}
                        onCopy={() => handleCopyStep(step)}
                        onEdit={() => setEditingStep(step)}
                        onDelete={() => handleDeleteStep(step.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // フラット表示
          <div className="p-2 space-y-1">
            {steps.map((step) => (
              <StepItem
                key={step.id}
                step={step}
                language={language}
                onClick={() => handleStepClick(step)}
                onInsert={() => handleInsertStep(step)}
                onCopy={() => handleCopyStep(step)}
                onEdit={() => setEditingStep(step)}
                onDelete={() => handleDeleteStep(step.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 作成ダイアログ */}
      <StepDefinitionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
        onSaved={fetchSteps}
      />

      {/* 編集ダイアログ */}
      {editingStep && (
        <StepDefinitionDialog
          open={!!editingStep}
          onOpenChange={(open) => !open && setEditingStep(null)}
          projectId={projectId}
          step={editingStep}
          onSaved={fetchSteps}
        />
      )}
    </div>
  );
}

/**
 * ステップアイテム
 */
interface StepItemProps {
  step: StepDefinition;
  language: 'ja' | 'en';
  onClick: () => void;
  onInsert: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function StepItem({ step, language, onClick, onInsert, onCopy, onEdit, onDelete }: StepItemProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-2 p-2 rounded-md cursor-pointer',
        'hover:bg-accent transition-colors'
      )}
      onClick={onClick}
    >
      <div
        className="w-1 h-full min-h-[24px] rounded-full flex-shrink-0"
        style={{ backgroundColor: getStepTypeColor(step.type) }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          <span className="text-muted-foreground mr-1">{getStepKeyword(step.type, language)}</span>
          {step.displayText}
        </div>
        {step.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{step.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {step.isShared && (
            <Badge variant="outline" className="text-[10px] h-4">
              <Share2 className="w-2.5 h-2.5 mr-0.5" />
              共有
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Hash className="w-2.5 h-2.5" />
            {step.usageCount}回使用
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onInsert}>
            <Plus className="w-4 h-4 mr-2" />
            挿入
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopy}>
            <Copy className="w-4 h-4 mr-2" />
            コピー
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            編集
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * ステップ定義作成・編集ダイアログ
 */
interface StepDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  step?: StepDefinition;
  onSaved: () => void;
}

function StepDefinitionDialog({
  open,
  onOpenChange,
  projectId,
  step,
  onSaved,
}: StepDefinitionDialogProps) {
  const [type, setType] = useState<GherkinStepType>(step?.type || 'GIVEN');
  const [pattern, setPattern] = useState(step?.pattern || '');
  const [displayText, setDisplayText] = useState(step?.displayText || '');
  const [description, setDescription] = useState(step?.description || '');
  const [isShared, setIsShared] = useState(step?.isShared || false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!step;

  const handleSave = async () => {
    if (!pattern.trim() || !displayText.trim()) return;

    try {
      setSaving(true);

      const url = isEdit
        ? `/api/projects/${projectId}/bdd/step-definitions/${step.id}`
        : `/api/projects/${projectId}/bdd/step-definitions`;

      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          pattern,
          displayText,
          description: description || undefined,
          isShared,
        }),
      });

      if (!res.ok) throw new Error('Failed to save step definition');

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save step definition:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'ステップ定義を編集' : '新しいステップ定義'}</DialogTitle>
          <DialogDescription>再利用可能なステップ定義を作成します</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>ステップタイプ</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as GherkinStepType)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['GIVEN', 'WHEN', 'THEN', 'AND', 'BUT'] as GherkinStepType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getStepTypeColor(t) }}
                      />
                      {getStepTypeLabel(t)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>パターン（正規表現）</Label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="ユーザーが(.+)画面にいる"
              disabled={isEdit}
            />
            <p className="text-xs text-muted-foreground">(.+) でパラメータを定義できます</p>
          </div>

          <div className="space-y-2">
            <Label>表示テキスト</Label>
            <Input
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder="ユーザーが<画面名>画面にいる"
            />
          </div>

          <div className="space-y-2">
            <Label>説明（任意）</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このステップの説明..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isShared"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isShared" className="text-sm font-normal">
              他のプロジェクトと共有する
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving || !pattern.trim() || !displayText.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? '更新' : '作成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StepLibraryPanel;
