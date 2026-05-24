import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireSystemAdmin } from '@/lib/rbac/middleware';
import { handleRBACError } from '@/lib/rbac/errors';
import { getAuditLogs, getAuditLogsForExport } from '@/lib/repositories/audit-log-repository';
import { logAuditLogExport } from '@/lib/audit';
import type { AuditLogSearchParams, AuditAction, AuditTargetType } from '@/types/audit-log';
import { AUDIT_ACTION_LABELS, AUDIT_TARGET_TYPE_LABELS } from '@/types/audit-log';

// GET /api/audit-logs - 監査ログ一覧取得
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // システム管理者権限をチェック
    try {
      await requireSystemAdmin(session.user.id);
    } catch (error) {
      return handleRBACError(error);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // CSV エクスポートの場合
    if (format === 'csv') {
      return handleCsvExport(request, session.user.id);
    }

    // 通常の一覧取得
    const params: AuditLogSearchParams = {
      userId: searchParams.get('userId') || undefined,
      action: (searchParams.get('action') as AuditAction) || undefined,
      targetType: (searchParams.get('targetType') as AuditTargetType) || undefined,
      targetId: searchParams.get('targetId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      query: searchParams.get('query') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sortBy: (searchParams.get('sortBy') as AuditLogSearchParams['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as AuditLogSearchParams['sortOrder']) || 'desc',
    };

    const result = await getAuditLogs(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json({ error: '監査ログ一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// CSVエクスポート処理
async function handleCsvExport(request: Request, userId: string) {
  try {
    const { searchParams } = new URL(request.url);

    const params = {
      userId: searchParams.get('userId') || undefined,
      action: (searchParams.get('action') as AuditAction) || undefined,
      targetType: (searchParams.get('targetType') as AuditTargetType) || undefined,
      targetId: searchParams.get('targetId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortBy: (searchParams.get('sortBy') as AuditLogSearchParams['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as AuditLogSearchParams['sortOrder']) || 'desc',
    };

    const auditLogs = await getAuditLogsForExport(params);

    // CSVヘッダー
    const headers = [
      'ID',
      '日時',
      'ユーザー名',
      'メールアドレス',
      '操作',
      '対象種別',
      '対象ID',
      'IPアドレス',
      '詳細',
    ];

    // CSVデータを生成
    const rows = auditLogs.map((log) => [
      log.id,
      log.createdAt,
      log.userName || '',
      log.userEmail || '',
      AUDIT_ACTION_LABELS[log.action] || log.action,
      AUDIT_TARGET_TYPE_LABELS[log.targetType] || log.targetType,
      log.targetId || '',
      log.ipAddress || '',
      log.details ? JSON.stringify(log.details) : '',
    ]);

    // BOM + CSV生成（Excel対応）
    const bom = '\uFEFF';
    const csvContent =
      bom +
      [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    // 監査ログエクスポートの操作を記録
    await logAuditLogExport(userId, {
      exportedCount: auditLogs.length,
      filters: params,
    });

    // CSVレスポンスを返す
    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export audit logs error:', error);
    return NextResponse.json({ error: '監査ログのエクスポートに失敗しました。' }, { status: 500 });
  }
}
