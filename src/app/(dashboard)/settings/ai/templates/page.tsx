'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, FileText, Copy, Star } from 'lucide-react';
import {
  PromptTemplate,
  PromptTemplateType,
  PROMPT_TEMPLATE_TYPE_LABELS,
  extractVariables,
} from '@/types/prompt-template';

export default function PromptTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<PromptTemplateType | 'ALL'>('ALL');
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<PromptTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fetchedRef = useRef(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<PromptTemplateType>('TEST_CASE_GENERATION');
  const [formContent, setFormContent] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  const fetchTemplates = async () => {
    try {
      const typeParam = selectedType === 'ALL' ? '' : `&type=${selectedType}`;
      const response = await fetch(`/api/settings/ai/templates?initialize=true${typeParam}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast({
        title: 'エラー',
        description: 'テンプレートの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchTemplates();
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) {
      fetchTemplates();
    }
  }, [selectedType]);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormDescription('');
    setFormType('TEST_CASE_GENERATION');
    setFormContent('');
    setFormIsDefault(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description || '');
    setFormType(template.type);
    setFormContent(template.content);
    setFormIsDefault(template.isDefault);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const data = {
        name: formName,
        description: formDescription || undefined,
        type: formType,
        content: formContent,
        variables: extractVariables(formContent).map((name) => ({
          name,
          description: '',
          required: true,
        })),
        isDefault: formIsDefault,
      };

      let response;
      if (editingTemplate) {
        response = await fetch(`/api/settings/ai/templates/${editingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        response = await fetch('/api/settings/ai/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save template');
      }

      setIsDialogOpen(false);
      fetchTemplates();

      toast({
        title: '保存完了',
        description: editingTemplate ? 'テンプレートを更新しました' : 'テンプレートを作成しました',
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'テンプレートの保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      const response = await fetch(`/api/settings/ai/templates/${deletingTemplate.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete template');
      }

      setDeletingTemplate(null);
      fetchTemplates();

      toast({
        title: '削除完了',
        description: 'テンプレートを削除しました',
      });
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'テンプレートの削除に失敗しました',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = (template: PromptTemplate) => {
    setEditingTemplate(null);
    setFormName(`${template.name}のコピー`);
    setFormDescription(template.description || '');
    setFormType(template.type);
    setFormContent(template.content);
    setFormIsDefault(false);
    setIsDialogOpen(true);
  };

  const detectedVariables = extractVariables(formContent);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">プロンプトテンプレート</h2>
          <p className="text-muted-foreground">
            AI機能で使用するプロンプトテンプレートを管理します
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Label htmlFor="type-filter">タイプで絞り込み</Label>
        <Select
          value={selectedType}
          onValueChange={(value) => setSelectedType(value as PromptTemplateType | 'ALL')}
        >
          <SelectTrigger id="type-filter" className="w-64">
            <SelectValue placeholder="すべて" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">すべて</SelectItem>
            {Object.entries(PROMPT_TEMPLATE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id.toString()}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.isSystem && <Badge variant="secondary">システム</Badge>}
                  {template.isDefault && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3" />
                      デフォルト
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(template)}
                    title="コピー"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!template.isSystem && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                        title="編集"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTemplate(template)}
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline">{PROMPT_TEMPLATE_TYPE_LABELS[template.type]}</Badge>
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">変数:</span>{' '}
                {template.variables.length > 0
                  ? template.variables.map((v) => `{{${v.name}}}`).join(', ')
                  : 'なし'}
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="text-center text-muted-foreground py-8">テンプレートがありません</div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'テンプレートを編集' : '新規テンプレート'}</DialogTitle>
            <DialogDescription>プロンプトテンプレートの内容を入力してください</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">テンプレート名</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="テストケース生成（カスタム）"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">タイプ</Label>
                <Select
                  value={formType}
                  onValueChange={(value) => setFormType(value as PromptTemplateType)}
                  disabled={!!editingTemplate}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROMPT_TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="このテンプレートの説明"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">プロンプト内容</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="プロンプトを入力してください。変数は {{変数名}} の形式で指定します。"
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                変数は {'{{変数名}}'} の形式で指定します。例: {'{{requirement}}'}, {'{{feature}}'}
              </p>
            </div>

            {detectedVariables.length > 0 && (
              <div className="space-y-2">
                <Label>検出された変数</Label>
                <div className="flex flex-wrap gap-2">
                  {detectedVariables.map((name) => (
                    <Badge key={name} variant="secondary">
                      {`{{${name}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isDefault">デフォルトテンプレートに設定</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formName || !formContent}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTemplate ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テンプレートを削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingTemplate?.name}」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
