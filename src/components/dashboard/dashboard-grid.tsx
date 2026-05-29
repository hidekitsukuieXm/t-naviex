'use client';

import { useCallback, useMemo, type ComponentProps } from 'react';
import GridLayout from 'react-grid-layout';
import type { DashboardSafe, DashboardWidgetSafe, DashboardLayout } from '@/types/dashboard';
import { WidgetContainer } from './widget-container';
import { WidgetTypeLabels, DEFAULT_LAYOUT } from '@/types/dashboard';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Extract the layout item type from GridLayout props
type GridLayoutProps = ComponentProps<typeof GridLayout>;
type LayoutItem = NonNullable<GridLayoutProps['layout']>[number];

interface DashboardGridProps {
  dashboard: DashboardSafe;
  isEditing?: boolean;
  onRemoveWidget?: (widgetId: string) => void;
  onWidgetSettings?: (widget: DashboardWidgetSafe) => void;
  renderWidget?: (widget: DashboardWidgetSafe) => React.ReactNode;
  onLayoutChange?: (
    widgets: Array<{ id: string; x: number; y: number; width: number; height: number }>
  ) => void;
}

export function DashboardGrid({
  dashboard,
  isEditing = false,
  onRemoveWidget,
  onWidgetSettings,
  renderWidget,
  onLayoutChange,
}: DashboardGridProps) {
  const widgets = useMemo(() => dashboard.widgets || [], [dashboard.widgets]);
  const layout = (dashboard.layout as DashboardLayout | null) || DEFAULT_LAYOUT;
  const { columns, rowHeight, gap } = layout;

  // ウィジェットからレイアウト設定を生成
  const gridLayout: LayoutItem[] = useMemo(
    () =>
      widgets.map((widget) => ({
        i: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.width,
        h: widget.height,
        minW: 2,
        minH: 2,
        maxW: columns,
        static: !isEditing,
      })),
    [widgets, columns, isEditing]
  );

  // レイアウト変更ハンドラ
  const handleLayoutChange = useCallback(
    (newLayout: LayoutItem[]) => {
      if (!isEditing || !onLayoutChange) return;

      const updatedWidgets = newLayout.map((item: LayoutItem) => ({
        id: item.i,
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
      }));

      onLayoutChange(updatedWidgets);
    },
    [isEditing, onLayoutChange]
  );

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
    <div className="dashboard-grid-container">
      <GridLayout
        className="layout"
        layout={gridLayout}
        cols={columns}
        rowHeight={rowHeight}
        width={1200}
        margin={[gap, gap]}
        containerPadding={[0, 0]}
        isDraggable={isEditing}
        isResizable={isEditing}
        // @ts-expect-error - @types/react-grid-layout has incorrect type for onLayoutChange
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        useCSSTransforms={true}
        compactType="vertical"
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
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
      </GridLayout>

      <style jsx global>{`
        .dashboard-grid-container {
          width: 100%;
        }
        .dashboard-grid-container .react-grid-layout {
          position: relative;
          transition: height 200ms ease;
        }
        .dashboard-grid-container .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        .dashboard-grid-container .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }
        .dashboard-grid-container .react-grid-item.resizing {
          z-index: 1;
          will-change: width, height;
        }
        .dashboard-grid-container .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 3;
          will-change: transform;
        }
        .dashboard-grid-container .react-grid-item.dropping {
          visibility: hidden;
        }
        .dashboard-grid-container .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        .dashboard-grid-container .react-grid-item > .react-resizable-handle::after {
          content: '';
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid rgba(0, 0, 0, 0.4);
          border-bottom: 2px solid rgba(0, 0, 0, 0.4);
        }
        .dashboard-grid-container .react-resizable-handle-sw {
          bottom: 0;
          left: 0;
          cursor: sw-resize;
          transform: rotate(90deg);
        }
        .dashboard-grid-container .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
        .dashboard-grid-container .react-resizable-handle-nw {
          top: 0;
          left: 0;
          cursor: nw-resize;
          transform: rotate(180deg);
        }
        .dashboard-grid-container .react-resizable-handle-ne {
          top: 0;
          right: 0;
          cursor: ne-resize;
          transform: rotate(270deg);
        }
        .dashboard-grid-container .react-resizable-handle-w,
        .dashboard-grid-container .react-resizable-handle-e {
          top: 50%;
          margin-top: -10px;
          cursor: ew-resize;
        }
        .dashboard-grid-container .react-resizable-handle-w {
          left: 0;
          transform: rotate(135deg);
        }
        .dashboard-grid-container .react-resizable-handle-e {
          right: 0;
          transform: rotate(315deg);
        }
        .dashboard-grid-container .react-resizable-handle-n,
        .dashboard-grid-container .react-resizable-handle-s {
          left: 50%;
          margin-left: -10px;
          cursor: ns-resize;
        }
        .dashboard-grid-container .react-resizable-handle-n {
          top: 0;
          transform: rotate(225deg);
        }
        .dashboard-grid-container .react-resizable-handle-s {
          bottom: 0;
          transform: rotate(45deg);
        }
        .dashboard-grid-container .react-grid-placeholder {
          background: hsl(var(--primary) / 0.2);
          border-radius: 8px;
          transition-duration: 100ms;
          z-index: 2;
          user-select: none;
        }
      `}</style>
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
