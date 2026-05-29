'use client';
'use no memo';

/**
 * Custom Fields Settings Page
 *
 * カスタムフィールド管理ページ
 */

import { useState, useEffect, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomFieldForm, CustomFieldList } from '@/components/custom-fields';
import {
  CustomFieldDefinitionWithDetails,
  TARGET_ENTITY_INFO,
  CreateCustomFieldDefinitionRequest,
  UpdateCustomFieldDefinitionRequest,
} from '@/types/custom-field';
import { toast } from 'sonner';

// ========================================
// Page Component
// ========================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CustomFieldsSettingsPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id, 10);
  const router = useRouter();
  const isMounted = useRef(true);

  const [definitions, setDefinitions] = useState<CustomFieldDefinitionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] =
    useState<CustomFieldDefinitionWithDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // データ取得
  const fetchDefinitions = useCallback(async () => {
    try {
      if (isMounted.current) setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/custom-fields`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      if (isMounted.current) setDefinitions(data);
    } catch (error) {
      console.error('Error fetching custom field definitions:', error);
      if (isMounted.current) toast.error('カスタムフィールドの取得に失敗しました');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    isMounted.current = true;
    requestAnimationFrame(() => {
      fetchDefinitions();
    });
    return () => {
      isMounted.current = false;
    };
  }, [fetchDefinitions]);

  // 新規作成
  const handleCreate = useCallback(
    async (data: CreateCustomFieldDefinitionRequest) => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/custom-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create');
        }

        await fetchDefinitions();
        setIsSheetOpen(false);
        toast.success('カスタムフィールドを作成しました');
      } catch (error) {
        console.error('Error creating custom field:', error);
        toast.error(
          error instanceof Error ? error.message : 'カスタムフィールドの作成に失敗しました'
        );
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, fetchDefinitions]
  );

  // 更新
  const handleUpdate = useCallback(
    async (data: UpdateCustomFieldDefinitionRequest) => {
      if (!editingDefinition) return;

      setIsSaving(true);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/custom-fields/${editingDefinition.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) throw new Error('Failed to update');

        await fetchDefinitions();
        setIsSheetOpen(false);
        setEditingDefinition(null);
        toast.success('カスタムフィールドを更新しました');
      } catch (error) {
        console.error('Error updating custom field:', error);
        toast.error('カスタムフィールドの更新に失敗しました');
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, editingDefinition, fetchDefinitions]
  );

  // Submit wrapper
  const handleSubmit = useCallback(
    async (data: CreateCustomFieldDefinitionRequest | UpdateCustomFieldDefinitionRequest) => {
      if (editingDefinition) {
        await handleUpdate(data as UpdateCustomFieldDefinitionRequest);
      } else {
        await handleCreate(data as CreateCustomFieldDefinitionRequest);
      }
    },
    [editingDefinition, handleCreate, handleUpdate]
  );

  // 削除
  const handleDelete = useCallback(
    async (definitionId: number) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/custom-fields/${definitionId}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete');

        await fetchDefinitions();
        toast.success('カスタムフィールドを削除しました');
      } catch (error) {
        console.error('Error deleting custom field:', error);
        toast.error('カスタムフィールドの削除に失敗しました');
      }
    },
    [projectId, fetchDefinitions]
  );

  // 有効/無効切り替え
  const handleToggleActive = useCallback(
    async (definitionId: number, isActive: boolean) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/custom-fields/${definitionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive }),
        });

        if (!response.ok) throw new Error('Failed to update');

        await fetchDefinitions();
        toast.success(isActive ? 'フィールドを有効化しました' : 'フィールドを無効化しました');
      } catch (error) {
        console.error('Error toggling custom field:', error);
        toast.error('更新に失敗しました');
      }
    },
    [projectId, fetchDefinitions]
  );

  // 編集シート開く
  const handleEdit = useCallback((definition: CustomFieldDefinitionWithDetails) => {
    setEditingDefinition(definition);
    setIsSheetOpen(true);
  }, []);

  // シート閉じる
  const handleCloseSheet = useCallback(() => {
    setIsSheetOpen(false);
    setEditingDefinition(null);
  }, []);

  // タブに応じたフィルタリング
  const filteredDefinitions =
    activeTab === 'all' ? definitions : definitions.filter((d) => d.targetEntity === activeTab);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/projects/${projectId}/settings`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              カスタムフィールド管理
            </h1>
            <p className="text-sm text-muted-foreground">
              テストケースやバグにカスタムフィールドを追加・管理します
            </p>
          </div>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規フィールド
        </Button>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="all">
            すべて
            <span className="ml-2 text-xs bg-muted px-1.5 rounded">{definitions.length}</span>
          </TabsTrigger>
          {Object.entries(TARGET_ENTITY_INFO).map(([entity, info]) => {
            const count = definitions.filter((d) => d.targetEntity === entity).length;
            return (
              <TabsTrigger key={entity} value={entity}>
                {info.label}
                {count > 0 && <span className="ml-2 text-xs bg-muted px-1.5 rounded">{count}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <CustomFieldList
            definitions={filteredDefinitions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* 作成/編集シート */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingDefinition ? 'カスタムフィールドを編集' : '新規カスタムフィールド'}
            </SheetTitle>
            <SheetDescription>
              {editingDefinition
                ? 'カスタムフィールドの設定を変更します'
                : '新しいカスタムフィールドを定義します'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CustomFieldForm
              definition={editingDefinition ?? undefined}
              projectId={projectId}
              onSubmit={handleSubmit}
              onCancel={handleCloseSheet}
              isLoading={isSaving}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
