'use client';

import type { DashboardSafe, DashboardWidgetSafe } from '@/types/dashboard';
import { WidgetContainer } from './widget-container';
import { WidgetTypeLabels } from '@/types/dashboard';
import { DEFAULT_LAYOUT } from '@/types/dashboard';

interface DashboardGridProps {
  dashboard: DashboardSafe;
  isEditing?: boolean;
  onRemoveWidget?: (widgetId: string) => void;
  onWidgetSettings?: (widget: DashboardWidgetSafe) => void;
  renderWidget?: (widget: DashboardWidgetSafe) => React.ReactNode;
}

export function DashboardGrid({
  dashboard,
  isEditing = false,
  onRemoveWidget,
  onWidgetSettings,
  renderWidget,
}: DashboardGridProps) {
  const widgets = dashboard.widgets || [];
  const layout = (dashboard.layout as typeof DEFAULT_LAYOUT) || DEFAULT_LAYOUT;
  const { columns, rowHeight, gap } = layout;

  // ウィジェットがない場合
  if (widgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">ウィジェットがありません</p>
          <p className="text-sm">「編集」モードでウィジェットを追加してください</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
        minHeight: '400px',
      }}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          style={{
            gridColumn: `${widget.x + 1} / span ${widget.width}`,
            gridRow: `${widget.y + 1} / span ${widget.height}`,
            minHeight: `${widget.height * rowHeight}px`,
          }}
        >
          <WidgetContainer
            widget={widget}
            isEditing={isEditing}
            onRemove={() => onRemoveWidget?.(widget.id)}
            onSettings={() => onWidgetSettings?.(widget)}
          >
            {renderWidget ? renderWidget(widget) : <DefaultWidgetContent widget={widget} />}
          </WidgetContainer>
        </div>
      ))}
    </div>
  );
}

// デフォルトのウィジェットコンテンツ（プレースホルダー）
function DefaultWidgetContent({ widget }: { widget: DashboardWidgetSafe }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <p className="text-sm">{WidgetTypeLabels[widget.widgetType]}</p>
        <p className="text-xs">準備中</p>
      </div>
    </div>
  );
}
