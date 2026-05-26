'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IntegrationSettingsTable } from '@/components/integrations/integration-settings-table';
import { Loader2, Link } from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link className="size-6" />
          <h1 className="text-2xl font-bold tracking-tight">外部連携設定</h1>
        </div>
        <p className="text-muted-foreground">
          Redmine、Backlog、JIRA、GitHub等の外部サービスとの連携を設定します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>連携設定一覧</CardTitle>
          <CardDescription>
            登録済みの外部連携設定を管理します。接続テストを実行して設定が正しいことを確認してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationSettingsTable />
        </CardContent>
      </Card>
    </div>
  );
}
