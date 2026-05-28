'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check, Loader2 } from 'lucide-react';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { toast } from 'sonner';

interface LanguageSwitcherProps {
  currentLocale: Locale;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = async (locale: Locale) => {
    if (locale === currentLocale) return;

    try {
      const response = await fetch('/api/settings/language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });

      if (!response.ok) {
        throw new Error('Failed to change language');
      }

      startTransition(() => {
        router.refresh();
      });

      toast.success(locale === 'ja' ? '言語を変更しました' : 'Language changed successfully');
    } catch {
      toast.error(
        currentLocale === 'ja' ? '言語の変更に失敗しました' : 'Failed to change language'
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {localeFlags[locale]}
              </span>
              {localeNames[locale]}
            </span>
            {locale === currentLocale && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
