'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Plus,
  BarChart3,
  PieChart,
  Bug,
  Users,
  Flag,
  Activity,
  Target,
  TrendingDown,
  LineChart,
  Settings,
  Monitor,
} from 'lucide-react';
import type { WidgetType } from '@/generated/prisma';
import { WidgetTypeLabels } from '@/types/dashboard';

interface WidgetSelectorDialogProps {
  onSelect: (widgetType: WidgetType, title?: string) => void;
  disabled?: boolean;
}

const widgetOptions: {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    type: 'PROGRESS_SUMMARY',
    label: WidgetTypeLabels.PROGRESS_SUMMARY,
    description: 'テストの実行状況をサマリー表示',
    icon: Target,
  },
  {
    type: 'PROGRESS_CHART',
    label: WidgetTypeLabels.PROGRESS_CHART,
    description: 'テスト進捗を棒グラフで表示',
    icon: BarChart3,
  },
  {
    type: 'BUG_SUMMARY',
    label: WidgetTypeLabels.BUG_SUMMARY,
    description: 'バグの件数をステータス別に表示',
    icon: Bug,
  },
  {
    type: 'BUG_CHART',
    label: WidgetTypeLabels.BUG_CHART,
    description: 'バグの分布を円グラフで表示',
    icon: PieChart,
  },
  {
    type: 'TEAM_INFO',
    label: WidgetTypeLabels.TEAM_INFO,
    description: 'チームメンバーの情報を表示',
    icon: Users,
  },
  {
    type: 'MILESTONE',
    label: WidgetTypeLabels.MILESTONE,
    description: 'マイルストーンの進捗を表示',
    icon: Flag,
  },
  {
    type: 'RECENT_ACTIVITY',
    label: WidgetTypeLabels.RECENT_ACTIVITY,
    description: '最近の活動履歴を表示',
    icon: Activity,
  },
  {
    type: 'COVERAGE_STATS',
    label: WidgetTypeLabels.COVERAGE_STATS,
    description: 'テスト結果の比率を円グラフで表示',
    icon: PieChart,
  },
  {
    type: 'BURNDOWN_CHART',
    label: WidgetTypeLabels.BURNDOWN_CHART,
    description: 'バーンダウンチャートを表示',
    icon: TrendingDown,
  },
  {
    type: 'RELIABILITY_CHART',
    label: WidgetTypeLabels.RELIABILITY_CHART,
    description: '信頼度成長曲線を表示',
    icon: LineChart,
  },
  {
    type: 'ENVIRONMENT_STATS',
    label: WidgetTypeLabels.ENVIRONMENT_STATS,
    description: '環境別のテスト実行状況を表示',
    icon: Monitor,
  },
  {
    type: 'CUSTOM',
    label: WidgetTypeLabels.CUSTOM,
    description: 'カスタム設定のウィジェット',
    icon: Settings,
  },
];

export function WidgetSelectorDialog({ onSelect, disabled }: WidgetSelectorDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  const handleSelect = () => {
    if (selectedType) {
      onSelect(selectedType, customTitle || undefined);
      setOpen(false);
      setSelectedType(null);
      setCustomTitle('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          ウィジェット追加
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ウィジェットを追加</DialogTitle>
          <DialogDescription>追加するウィジェットの種類を選択してください</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto py-4">
          {widgetOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                  selectedType === option.type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
                onClick={() => setSelectedType(option.type)}
              >
                <div className="p-2 rounded-md bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {selectedType && (
          <div className="space-y-2">
            <Label htmlFor="widget-title">タイトル（任意）</Label>
            <Input
              id="widget-title"
              placeholder="カスタムタイトルを入力..."
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSelect} disabled={!selectedType}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
