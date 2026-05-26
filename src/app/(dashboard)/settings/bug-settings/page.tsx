'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BugTypeMasterTable } from '@/components/bug-settings/bug-type-master-table';
import { BugStatusMasterTable } from '@/components/bug-settings/bug-status-master-table';
import { BugPriorityMasterTable } from '@/components/bug-settings/bug-priority-master-table';
import { BugSeverityMasterTable } from '@/components/bug-settings/bug-severity-master-table';
import { Loader2, Settings2 } from 'lucide-react';

export default function BugSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load delay for smooth transition
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
          <Settings2 className="size-6" />
          <h1 className="text-2xl font-bold tracking-tight">バグ設定</h1>
        </div>
        <p className="text-muted-foreground">
          バグの種別、ステータス、優先度、重要度のマスタデータを管理します。
        </p>
      </div>

      <Tabs defaultValue="types">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="types">種別</TabsTrigger>
          <TabsTrigger value="statuses">ステータス</TabsTrigger>
          <TabsTrigger value="priorities">優先度</TabsTrigger>
          <TabsTrigger value="severities">重要度</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>バグ種別マスタ</CardTitle>
              <CardDescription>
                バグの種別（不具合、機能要望、タスクなど）を管理します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BugTypeMasterTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statuses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>バグステータスマスタ</CardTitle>
              <CardDescription>
                バグのステータス（新規、対応中、解決済みなど）を管理します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BugStatusMasterTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priorities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>バグ優先度マスタ</CardTitle>
              <CardDescription>バグの優先度（緊急、高、中、低など）を管理します。</CardDescription>
            </CardHeader>
            <CardContent>
              <BugPriorityMasterTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="severities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>バグ重要度マスタ</CardTitle>
              <CardDescription>
                バグの重要度（ブロッカー、致命的、重大など）を管理します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BugSeverityMasterTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
