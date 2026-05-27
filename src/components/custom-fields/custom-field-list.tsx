'use client';

/**
 * Custom Field List Component
 *
 * カスタムフィールド定義の一覧コンポーネント
 */

import { useState, useCallback } from 'react';
import {
  Type,
  Hash,
  Calendar,
  List,
  ListChecks,
  CheckSquare,
  Link,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Search,
  Filter,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CustomFieldType,
  CustomFieldTargetEntity,
  CustomFieldDefinitionWithDetails,
  CUSTOM_FIELD_TYPE_INFO,
  TARGET_ENTITY_INFO,
} from '@/types/custom-field';

// ========================================
// Types
// ========================================

export interface CustomFieldListProps {
  definitions: CustomFieldDefinitionWithDetails[];
  onEdit: (definition: CustomFieldDefinitionWithDetails) => void;
  onDelete: (id: number) => Promise<void>;
  onToggleActive: (id: number, isActive: boolean) => Promise<void>;
  isLoading?: boolean;
}

// ========================================
// Icon Map
// ========================================

const FIELD_TYPE_ICONS: Record<CustomFieldType, typeof Type> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  SELECT_SINGLE: List,
  SELECT_MULTI: ListChecks,
  CHECKBOX: CheckSquare,
  URL: Link,
  EMAIL: Mail,
};

// ========================================
// Component
// ========================================

export function CustomFieldList({
  definitions,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading = false,
}: CustomFieldListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<CustomFieldDefinitionWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // フィルタリング
  const filteredDefinitions = definitions.filter((def) => {
    const matchesSearch =
      def.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === 'all' || def.targetEntity === entityFilter;
    return matchesSearch && matchesEntity;
  });

  // グループ化（対象エンティティ別）
  const groupedDefinitions = filteredDefinitions.reduce(
    (acc, def) => {
      const entity = def.targetEntity as CustomFieldTargetEntity;
      if (!acc[entity]) {
        acc[entity] = [];
      }
      acc[entity].push(def);
      return acc;
    },
    {} as Record<CustomFieldTargetEntity, CustomFieldDefinitionWithDetails[]>
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDelete]);

  if (isLoading) {
    return <CustomFieldListSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="フィールドを検索..."
            className="pl-9"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="エンティティ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {Object.entries(TARGET_ENTITY_INFO).map(([entity, info]) => (
              <SelectItem key={entity} value={entity}>
                {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 一覧 */}
      {filteredDefinitions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {definitions.length === 0
              ? 'カスタムフィールドがまだ定義されていません'
              : '検索条件に一致するフィールドがありません'}
          </CardContent>
        </Card>
      ) : entityFilter === 'all' ? (
        // エンティティ別にグループ表示
        Object.entries(groupedDefinitions).map(([entity, defs]) => (
          <Card key={entity}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {TARGET_ENTITY_INFO[entity as CustomFieldTargetEntity].label}
                <Badge variant="secondary">{defs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <FieldTable
                definitions={defs}
                onEdit={onEdit}
                onDelete={setDeleteTarget}
                onToggleActive={onToggleActive}
              />
            </CardContent>
          </Card>
        ))
      ) : (
        // 単一テーブル表示
        <Card>
          <CardContent className="p-0">
            <FieldTable
              definitions={filteredDefinitions}
              onEdit={onEdit}
              onDelete={setDeleteTarget}
              onToggleActive={onToggleActive}
            />
          </CardContent>
        </Card>
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>カスタムフィールドを削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.displayName}」を削除しますか？
              このフィールドに関連するすべての値も削除されます。 この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ========================================
// Sub Components
// ========================================

interface FieldTableProps {
  definitions: CustomFieldDefinitionWithDetails[];
  onEdit: (definition: CustomFieldDefinitionWithDetails) => void;
  onDelete: (definition: CustomFieldDefinitionWithDetails) => void;
  onToggleActive: (id: number, isActive: boolean) => Promise<void>;
}

function FieldTable({ definitions, onEdit, onDelete, onToggleActive }: FieldTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]" />
          <TableHead>フィールド名</TableHead>
          <TableHead>タイプ</TableHead>
          <TableHead className="text-center">必須</TableHead>
          <TableHead className="text-center">検索</TableHead>
          <TableHead className="text-center">状態</TableHead>
          <TableHead className="text-right">使用数</TableHead>
          <TableHead className="w-[40px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {definitions.map((def) => {
          const Icon = FIELD_TYPE_ICONS[def.fieldType as CustomFieldType];
          const typeInfo = CUSTOM_FIELD_TYPE_INFO[def.fieldType as CustomFieldType];

          return (
            <TableRow key={def.id} className={!def.isActive ? 'opacity-50' : ''}>
              <TableCell>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{def.displayName}</div>
                  <div className="text-xs text-muted-foreground">{def.name}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{typeInfo.label}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {def.isRequired ? (
                  <Badge variant="destructive" className="text-xs">
                    必須
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {def.isSearchable ? (
                  <Search className="h-4 w-4 text-green-600 mx-auto" />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {def.isActive ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    有効
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    無効
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{def._count?.values ?? 0}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(def)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      編集
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleActive(def.id, !def.isActive)}>
                      {def.isActive ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          無効化
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          有効化
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(def)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function CustomFieldListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
