import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

const APP_VERSION = '0.1.0';
const COPYRIGHT_YEAR = new Date().getFullYear();

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        'flex h-10 shrink-0 items-center justify-between border-t bg-muted/50 px-4 text-xs text-muted-foreground',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>T-NaviEx</span>
        <span className="text-muted-foreground/60">v{APP_VERSION}</span>
      </div>
      <div>&copy; {COPYRIGHT_YEAR} T-NaviEx. All rights reserved.</div>
    </footer>
  );
}
