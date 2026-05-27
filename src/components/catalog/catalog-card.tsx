'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  type CatalogItemWithTags,
  CATALOG_ITEM_TYPE_INFO,
  CATALOG_ITEM_STATUS_INFO,
} from '@/types/catalog-item';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  FileText,
  TestTube,
  Database,
  ClipboardList,
  CheckCircle,
  Share2,
  Layout,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  TEST_CASE: TestTube,
  TEST_PROCEDURE: ClipboardList,
  TEST_DATA: Database,
  PRECONDITION: FileText,
  EXPECTED_RESULT: CheckCircle,
  SHARED_STEP: Share2,
  TEMPLATE: Layout,
  OTHER: HelpCircle,
};

interface CatalogCardProps {
  item: CatalogItemWithTags;
  onEdit: (item: CatalogItemWithTags) => void;
  onDelete: (item: CatalogItemWithTags) => void;
  onDuplicate: (item: CatalogItemWithTags) => void;
  onView: (item: CatalogItemWithTags) => void;
}

export function CatalogCard({ item, onEdit, onDelete, onDuplicate, onView }: CatalogCardProps) {
  const TypeIcon = typeIcons[item.type] || HelpCircle;
  const typeInfo = CATALOG_ITEM_TYPE_INFO[item.type];
  const statusInfo = CATALOG_ITEM_STATUS_INFO[item.status];

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    DEPRECATED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    ARCHIVED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2">
              <TypeIcon className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="line-clamp-1 text-base">{item.name}</CardTitle>
              <CardDescription className="text-xs">{typeInfo.label}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">メニュー</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(item)}>
                <Eye className="mr-2 size-4" />
                詳細を見る
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="mr-2 size-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(item)}>
                <Copy className="mr-2 size-4" />
                複製
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive">
                <Trash2 className="mr-2 size-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        )}

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className={statusColors[item.status]}>
            {statusInfo.label}
          </Badge>
          {item.category && (
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
          )}
          {item.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
          {item.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{item.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>v{item.version}</span>
          <span>使用回数: {item.usageCount}</span>
        </div>

        <div className="text-xs text-muted-foreground">
          更新: {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true, locale: ja })}
        </div>
      </CardContent>
    </Card>
  );
}
