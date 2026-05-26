'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LayoutDashboard, Star, Globe } from 'lucide-react';
import type { DashboardSafe } from '@/types/dashboard';

interface DashboardSelectorProps {
  dashboards: DashboardSafe[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function DashboardSelector({
  dashboards,
  selectedId,
  onSelect,
  disabled,
}: DashboardSelectorProps) {
  if (dashboards.length === 0) {
    return null;
  }

  return (
    <Select value={selectedId} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="ダッシュボードを選択" />
      </SelectTrigger>
      <SelectContent>
        {dashboards.map((dashboard) => (
          <SelectItem key={dashboard.id} value={dashboard.id}>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <span className="truncate max-w-[180px]">{dashboard.name}</span>
              {dashboard.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
              {dashboard.isPublic && <Globe className="h-3 w-3 text-blue-500" />}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
