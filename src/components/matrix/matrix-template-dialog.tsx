'use client';
'use no memo';

/**
 * Matrix Template Dialog
 *
 * マトリクステンプレート管理ダイアログ
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, FileText, Grid3X3, Star, Search, Loader2 } from 'lucide-react';
import {
  MatrixAxisItem,
  MatrixAxisType,
  MatrixCellValue,
  getAxisTypeLabel,
  getCellValueLabel,
  getCellValueColor,
} from '@/types/matrix';

interface MatrixTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSelect: (template: TemplateData) => void;
  mode?: 'select' | 'create' | 'edit';
  initialTemplate?: TemplateData;
}

interface TemplateData {
  id?: string;
  name: string;
  description?: string;
  rowAxisName: string;
  rowAxisType: MatrixAxisType;
  rowAxisItems: MatrixAxisItem[];
  columnAxisName: string;
  columnAxisType: MatrixAxisType;
  columnAxisItems: MatrixAxisItem[];
  defaultCellValue: MatrixCellValue;
  isDefault?: boolean;
  usageCount?: number;
}

interface ApiTemplate {
  id: string;
  name: string;
  description?: string;
  rowAxisName: string;
  rowAxisType: MatrixAxisType;
  rowAxisItems: MatrixAxisItem[];
  columnAxisName: string;
  columnAxisType: MatrixAxisType;
  columnAxisItems: MatrixAxisItem[];
  defaultCellValue: MatrixCellValue;
  isDefault: boolean;
  usageCount: number;
}

const AXIS_TYPES = Object.values(MatrixAxisType).map((value) => ({
  value,
  label: getAxisTypeLabel(value),
}));

const CELL_VALUES: MatrixCellValue[] = ['EMPTY', 'YES', 'NO', 'NA'];

export function MatrixTemplateDialog({
  open,
  onOpenChange,
  projectId,
  onSelect,
  mode = 'select',
  initialTemplate,
}: MatrixTemplateDialogProps) {
  const [activeTab, setActiveTab] = useState<'select' | 'create'>(
    mode === 'create' ? 'create' : 'select'
  );
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // テンプレート編集状態
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rowAxisName, setRowAxisName] = useState('行');
  const [rowAxisType, setRowAxisType] = useState<MatrixAxisType>('TEXT');
  const [rowAxisItems, setRowAxisItems] = useState<MatrixAxisItem[]>([
    { id: 'row_1', value: '項目1', sortOrder: 0 },
    { id: 'row_2', value: '項目2', sortOrder: 1 },
    { id: 'row_3', value: '項目3', sortOrder: 2 },
  ]);
  const [columnAxisName, setColumnAxisName] = useState('列');
  const [columnAxisType, setColumnAxisType] = useState<MatrixAxisType>('TEXT');
  const [columnAxisItems, setColumnAxisItems] = useState<MatrixAxisItem[]>([
    { id: 'col_1', value: '条件A', sortOrder: 0 },
    { id: 'col_2', value: '条件B', sortOrder: 1 },
    { id: 'col_3', value: '条件C', sortOrder: 2 },
  ]);
  const [defaultCellValue, setDefaultCellValue] = useState<MatrixCellValue>('EMPTY');
  const [isDefault, setIsDefault] = useState(false);

  // テンプレート一覧を取得
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/projects/${projectId}/matrix/templates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, search]);

  // 初期化
  useEffect(() => {
    if (open) {
      if (mode === 'select') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Dialog open triggers initial data fetch
        fetchTemplates();
      }
      if (initialTemplate) {
        setName(initialTemplate.name);
        setDescription(initialTemplate.description || '');
        setRowAxisName(initialTemplate.rowAxisName);
        setRowAxisType(initialTemplate.rowAxisType);
        setRowAxisItems(initialTemplate.rowAxisItems);
        setColumnAxisName(initialTemplate.columnAxisName);
        setColumnAxisType(initialTemplate.columnAxisType);
        setColumnAxisItems(initialTemplate.columnAxisItems);
        setDefaultCellValue(initialTemplate.defaultCellValue);
        setIsDefault(initialTemplate.isDefault || false);
      }
    }
  }, [open, mode, initialTemplate, fetchTemplates]);

  // 検索が変更されたらテンプレートを再取得
  useEffect(() => {
    if (open && activeTab === 'select') {
      const timer = setTimeout(() => {
        fetchTemplates();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search, open, activeTab, fetchTemplates]);

  // 行アイテムを追加
  const addRowItem = () => {
    setRowAxisItems([
      ...rowAxisItems,
      {
        id: `row_${Date.now()}`,
        value: `項目${rowAxisItems.length + 1}`,
        sortOrder: rowAxisItems.length,
      },
    ]);
  };

  // 行アイテムを削除
  const removeRowItem = (index: number) => {
    if (rowAxisItems.length > 1) {
      setRowAxisItems(rowAxisItems.filter((_, i) => i !== index));
    }
  };

  // 行アイテムを更新
  const updateRowItem = (index: number, value: string) => {
    setRowAxisItems(rowAxisItems.map((item, i) => (i === index ? { ...item, value } : item)));
  };

  // 列アイテムを追加
  const addColumnItem = () => {
    setColumnAxisItems([
      ...columnAxisItems,
      {
        id: `col_${Date.now()}`,
        value: `条件${String.fromCharCode(65 + columnAxisItems.length)}`,
        sortOrder: columnAxisItems.length,
      },
    ]);
  };

  // 列アイテムを削除
  const removeColumnItem = (index: number) => {
    if (columnAxisItems.length > 1) {
      setColumnAxisItems(columnAxisItems.filter((_, i) => i !== index));
    }
  };

  // 列アイテムを更新
  const updateColumnItem = (index: number, value: string) => {
    setColumnAxisItems(columnAxisItems.map((item, i) => (i === index ? { ...item, value } : item)));
  };

  // テンプレートを選択
  const handleSelect = (template: ApiTemplate) => {
    onSelect({
      id: template.id,
      name: template.name,
      description: template.description,
      rowAxisName: template.rowAxisName,
      rowAxisType: template.rowAxisType,
      rowAxisItems: template.rowAxisItems,
      columnAxisName: template.columnAxisName,
      columnAxisType: template.columnAxisType,
      columnAxisItems: template.columnAxisItems,
      defaultCellValue: template.defaultCellValue,
      isDefault: template.isDefault,
      usageCount: template.usageCount,
    });
    onOpenChange(false);
  };

  // テンプレートを作成/更新
  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const templateData = {
        name,
        description: description || undefined,
        rowAxisName,
        rowAxisType,
        rowAxisItems,
        columnAxisName,
        columnAxisType,
        columnAxisItems,
        defaultCellValue,
        isDefault,
      };

      if (mode === 'edit' && initialTemplate?.id) {
        // 更新
        const res = await fetch(
          `/api/projects/${projectId}/matrix/templates/${initialTemplate.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateData),
          }
        );
        if (res.ok) {
          onSelect({ ...templateData, id: initialTemplate.id });
          onOpenChange(false);
        }
      } else {
        // 作成
        const res = await fetch(`/api/projects/${projectId}/matrix/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData),
        });
        if (res.ok) {
          const data = await res.json();
          onSelect({ ...templateData, id: data.id });
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  // 新規作成を適用（保存せずにそのまま使用）
  const handleApplyNew = () => {
    onSelect({
      name,
      description: description || undefined,
      rowAxisName,
      rowAxisType,
      rowAxisItems,
      columnAxisName,
      columnAxisType,
      columnAxisItems,
      defaultCellValue,
      isDefault: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            {mode === 'edit' ? 'テンプレートを編集' : 'マトリクステンプレート'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'テンプレートの設定を変更します'
              : 'テンプレートを選択するか、新しいマトリクスを作成します'}
          </DialogDescription>
        </DialogHeader>

        {mode !== 'edit' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'select' | 'create')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">テンプレートから選択</TabsTrigger>
              <TabsTrigger value="create">新規作成</TabsTrigger>
            </TabsList>

            {/* テンプレート選択タブ */}
            <TabsContent value="select" className="flex-1">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="テンプレートを検索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>テンプレートがありません</p>
                      <p className="text-sm mt-1">「新規作成」タブから作成できます</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelect(template)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{template.name}</span>
                                  {template.isDefault && (
                                    <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                  )}
                                </div>
                                {template.description && (
                                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                                    {template.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {template.rowAxisItems.length}行 ×{' '}
                                    {template.columnAxisItems.length}列
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {template.usageCount}回使用
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* 新規作成タブ */}
            <TabsContent value="create" className="flex-1">
              <TemplateForm
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                rowAxisName={rowAxisName}
                setRowAxisName={setRowAxisName}
                rowAxisType={rowAxisType}
                setRowAxisType={setRowAxisType}
                rowAxisItems={rowAxisItems}
                addRowItem={addRowItem}
                removeRowItem={removeRowItem}
                updateRowItem={updateRowItem}
                columnAxisName={columnAxisName}
                setColumnAxisName={setColumnAxisName}
                columnAxisType={columnAxisType}
                setColumnAxisType={setColumnAxisType}
                columnAxisItems={columnAxisItems}
                addColumnItem={addColumnItem}
                removeColumnItem={removeColumnItem}
                updateColumnItem={updateColumnItem}
                defaultCellValue={defaultCellValue}
                setDefaultCellValue={setDefaultCellValue}
                isDefault={isDefault}
                setIsDefault={setIsDefault}
                showIsDefault={true}
              />
            </TabsContent>
          </Tabs>
        )}

        {mode === 'edit' && (
          <TemplateForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            rowAxisName={rowAxisName}
            setRowAxisName={setRowAxisName}
            rowAxisType={rowAxisType}
            setRowAxisType={setRowAxisType}
            rowAxisItems={rowAxisItems}
            addRowItem={addRowItem}
            removeRowItem={removeRowItem}
            updateRowItem={updateRowItem}
            columnAxisName={columnAxisName}
            setColumnAxisName={setColumnAxisName}
            columnAxisType={columnAxisType}
            setColumnAxisType={setColumnAxisType}
            columnAxisItems={columnAxisItems}
            addColumnItem={addColumnItem}
            removeColumnItem={removeColumnItem}
            updateColumnItem={updateColumnItem}
            defaultCellValue={defaultCellValue}
            setDefaultCellValue={setDefaultCellValue}
            isDefault={isDefault}
            setIsDefault={setIsDefault}
            showIsDefault={true}
          />
        )}

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          {(activeTab === 'create' || mode === 'edit') && (
            <>
              {mode !== 'edit' && (
                <Button variant="secondary" onClick={handleApplyNew} disabled={!name.trim()}>
                  適用（保存しない）
                </Button>
              )}
              <Button onClick={handleSave} disabled={!name.trim() || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'edit' ? '更新' : 'テンプレートとして保存'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// テンプレート編集フォーム
interface TemplateFormProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  rowAxisName: string;
  setRowAxisName: (v: string) => void;
  rowAxisType: MatrixAxisType;
  setRowAxisType: (v: MatrixAxisType) => void;
  rowAxisItems: MatrixAxisItem[];
  addRowItem: () => void;
  removeRowItem: (index: number) => void;
  updateRowItem: (index: number, value: string) => void;
  columnAxisName: string;
  setColumnAxisName: (v: string) => void;
  columnAxisType: MatrixAxisType;
  setColumnAxisType: (v: MatrixAxisType) => void;
  columnAxisItems: MatrixAxisItem[];
  addColumnItem: () => void;
  removeColumnItem: (index: number) => void;
  updateColumnItem: (index: number, value: string) => void;
  defaultCellValue: MatrixCellValue;
  setDefaultCellValue: (v: MatrixCellValue) => void;
  isDefault: boolean;
  setIsDefault: (v: boolean) => void;
  showIsDefault: boolean;
}

function TemplateForm({
  name,
  setName,
  description,
  setDescription,
  rowAxisName,
  setRowAxisName,
  rowAxisType,
  setRowAxisType,
  rowAxisItems,
  addRowItem,
  removeRowItem,
  updateRowItem,
  columnAxisName,
  setColumnAxisName,
  columnAxisType,
  setColumnAxisType,
  columnAxisItems,
  addColumnItem,
  removeColumnItem,
  updateColumnItem,
  defaultCellValue,
  setDefaultCellValue,
  isDefault,
  setIsDefault,
  showIsDefault,
}: TemplateFormProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {/* 基本情報 */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">テンプレート名 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: ブラウザ × OS テストマトリクス"
            />
          </div>
          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="テンプレートの説明..."
              rows={2}
            />
          </div>
        </div>

        {/* 行軸設定 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">行軸（縦方向）</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>軸名</Label>
              <Input
                value={rowAxisName}
                onChange={(e) => setRowAxisName(e.target.value)}
                placeholder="例: ブラウザ"
              />
            </div>
            <div>
              <Label>軸タイプ</Label>
              <Select
                value={rowAxisType}
                onValueChange={(v) => setRowAxisType(v as MatrixAxisType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AXIS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>行アイテム</Label>
            {rowAxisItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <Input
                  value={item.value}
                  onChange={(e) => updateRowItem(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRowItem(index)}
                  disabled={rowAxisItems.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRowItem}>
              <Plus className="h-4 w-4 mr-1" />
              行を追加
            </Button>
          </div>
        </div>

        {/* 列軸設定 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">列軸（横方向）</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>軸名</Label>
              <Input
                value={columnAxisName}
                onChange={(e) => setColumnAxisName(e.target.value)}
                placeholder="例: OS"
              />
            </div>
            <div>
              <Label>軸タイプ</Label>
              <Select
                value={columnAxisType}
                onValueChange={(v) => setColumnAxisType(v as MatrixAxisType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AXIS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>列アイテム</Label>
            {columnAxisItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <Input
                  value={item.value}
                  onChange={(e) => updateColumnItem(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeColumnItem(index)}
                  disabled={columnAxisItems.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addColumnItem}>
              <Plus className="h-4 w-4 mr-1" />
              列を追加
            </Button>
          </div>
        </div>

        {/* セル初期値 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">セル設定</h4>
          <div>
            <Label>デフォルト値</Label>
            <Select
              value={defaultCellValue}
              onValueChange={(v) => setDefaultCellValue(v as MatrixCellValue)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CELL_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: getCellValueColor(v) }}
                      />
                      {getCellValueLabel(v)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* デフォルト設定 */}
        {showIsDefault && (
          <div className="flex items-center justify-between">
            <div>
              <Label>デフォルトテンプレート</Label>
              <p className="text-xs text-muted-foreground">新規作成時に自動的に選択されます</p>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default MatrixTemplateDialog;
