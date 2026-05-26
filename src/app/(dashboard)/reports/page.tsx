'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileSpreadsheet, FileText, TrendingUp } from 'lucide-react';

interface ReportType {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

const reportTypes: ReportType[] = [
  {
    title: 'クロスプロジェクトレポート',
    description: '複数プロジェクトの横断集計・ユーザー工数分析',
    href: '/reports/cross-project',
    icon: BarChart3,
    available: true,
  },
  {
    title: 'ケースレポート',
    description: 'テストケースの詳細レポート',
    href: '/reports/cases',
    icon: FileSpreadsheet,
    available: false,
  },
  {
    title: '欠陥レポート',
    description: 'バグ・欠陥の詳細レポート',
    href: '/reports/defects',
    icon: FileText,
    available: false,
  },
  {
    title: '結果レポート',
    description: 'テスト結果の詳細レポート',
    href: '/reports/results',
    icon: TrendingUp,
    available: false,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">レポート</h1>
        <p className="text-muted-foreground">各種レポートを生成・閲覧できます</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const content = (
            <Card
              className={`${report.available ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50'} transition-colors`}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-md bg-muted">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {!report.available && <span className="text-xs text-muted-foreground">準備中</span>}
              </CardContent>
            </Card>
          );

          if (report.available) {
            return (
              <Link key={report.href} href={report.href}>
                {content}
              </Link>
            );
          }

          return <div key={report.href}>{content}</div>;
        })}
      </div>
    </div>
  );
}
