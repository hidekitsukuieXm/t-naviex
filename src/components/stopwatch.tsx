'use client';

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StopwatchProps {
  initialSeconds?: number;
  onTimeChange?: (seconds: number) => void;
  autoStart?: boolean;
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface StopwatchRef {
  start: () => void;
  pause: () => void;
  reset: () => void;
  getElapsedSeconds: () => number;
  isRunning: () => boolean;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const Stopwatch = forwardRef<StopwatchRef, StopwatchProps>(
  (
    {
      initialSeconds = 0,
      onTimeChange,
      autoStart = false,
      className,
      showLabels = false,
      size = 'md',
    },
    ref
  ) => {
    const [isRunning, setIsRunning] = useState(autoStart);
    const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
    const [startTime, setStartTime] = useState<number | null>(
      autoStart ? Date.now() - initialSeconds * 1000 : null
    );

    // Timer effect
    useEffect(() => {
      let interval: NodeJS.Timeout | null = null;
      if (isRunning && startTime) {
        interval = setInterval(() => {
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          setElapsedSeconds(elapsed);
          onTimeChange?.(elapsed);
        }, 1000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [isRunning, startTime, onTimeChange]);

    const start = useCallback(() => {
      if (!isRunning) {
        const now = Date.now();
        setStartTime(now - elapsedSeconds * 1000);
        setIsRunning(true);
      }
    }, [isRunning, elapsedSeconds]);

    const pause = useCallback(() => {
      setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
      setIsRunning(false);
      setElapsedSeconds(0);
      setStartTime(null);
      onTimeChange?.(0);
    }, [onTimeChange]);

    const getElapsedSeconds = useCallback(() => {
      return elapsedSeconds;
    }, [elapsedSeconds]);

    const getIsRunning = useCallback(() => {
      return isRunning;
    }, [isRunning]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      start,
      pause,
      reset,
      getElapsedSeconds,
      isRunning: getIsRunning,
    }));

    const sizeClasses = {
      sm: {
        display: 'text-lg',
        buttons: 'size-7',
        icons: 'size-3',
        container: 'p-2 gap-1',
      },
      md: {
        display: 'text-2xl',
        buttons: 'size-8',
        icons: 'size-4',
        container: 'p-3 gap-2',
      },
      lg: {
        display: 'text-4xl',
        buttons: 'size-10',
        icons: 'size-5',
        container: 'p-4 gap-3',
      },
    };

    const sizeConfig = sizeClasses[size];

    return (
      <div
        className={cn('flex items-center rounded-lg bg-muted/50', sizeConfig.container, className)}
      >
        <div
          className={cn('font-mono tabular-nums', sizeConfig.display, isRunning && 'text-primary')}
        >
          {formatTime(elapsedSeconds)}
        </div>
        <div className="flex gap-1">
          {!isRunning ? (
            <Button
              variant="outline"
              size="icon"
              className={sizeConfig.buttons}
              onClick={start}
              title={showLabels ? undefined : '開始'}
            >
              <Play className={sizeConfig.icons} />
              {showLabels && <span className="sr-only">開始</span>}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className={sizeConfig.buttons}
              onClick={pause}
              title={showLabels ? undefined : '一時停止'}
            >
              <Pause className={sizeConfig.icons} />
              {showLabels && <span className="sr-only">一時停止</span>}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className={sizeConfig.buttons}
            onClick={reset}
            title={showLabels ? undefined : 'リセット'}
          >
            <Square className={sizeConfig.icons} />
            {showLabels && <span className="sr-only">リセット</span>}
          </Button>
        </div>
      </div>
    );
  }
);

Stopwatch.displayName = 'Stopwatch';

export { Stopwatch, formatTime };
