import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Play, Bug, CheckCircle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground">プロジェクトの概要と進捗状況を確認できます。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="テストケース"
          value="1,234"
          description="合計テストケース数"
          icon={FileText}
        />
        <StatCard title="テストラン" value="56" description="実行中・完了済みラン" icon={Play} />
        <StatCard title="オープンバグ" value="23" description="未解決のバグ" icon={Bug} />
        <StatCard
          title="合格率"
          value="87.5%"
          description="直近テストランの合格率"
          icon={CheckCircle}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近の更新</CardTitle>
            <CardDescription>直近のテスト活動</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20">
                  <CheckCircle className="size-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">テストラン「リグレッション v2.0」が完了</p>
                  <p className="text-xs text-muted-foreground">5分前</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20">
                  <Bug className="size-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">バグ #123 が新規登録されました</p>
                  <p className="text-xs text-muted-foreground">30分前</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20">
                  <FileText className="size-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    テスト仕様書「ログイン機能」が更新されました
                  </p>
                  <p className="text-xs text-muted-foreground">1時間前</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>進捗サマリー</CardTitle>
            <CardDescription>現在のテスト進捗状況</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>実施率</span>
                  <span className="font-medium">75%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full w-3/4 rounded-full bg-primary" />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>合格率</span>
                  <span className="font-medium">87.5%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full w-[87.5%] rounded-full bg-green-500" />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>バグ解決率</span>
                  <span className="font-medium">62%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full w-[62%] rounded-full bg-orange-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
