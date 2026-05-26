'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X, Settings, GripVertical } from 'lucide-react';
import type { DashboardWidgetSafe } from '@/types/dashboard';
import { WidgetTypeLabels } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface WidgetContainerProps {
  widget: DashboardWidgetSafe;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRemove?: () => void;
  onSettings?: () => void;
  isEditing?: boolean;
  className?: string;
}

export function WidgetContainer({
  widget,
  children,
  isLoading,
  error,
  onRemove,
  onSettings,
  isEditing,
  className,
}: WidgetContainerProps) {
  const title = widget.title || WidgetTypeLabels[widget.widgetType];

  return (
    <Card className={cn('h-full overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditing && (
            <div className="widget-drag-handle cursor-move text-muted-foreground hover:text-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
        </div>
        {isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onSettings && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onSettings}>
                <Settings className="h-3 w-3" />
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="h-[calc(100%-3rem)] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-destructive text-sm">
            {error}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
