/**
 * SSO Configuration API Route
 *
 * 個別SSO設定APIルート
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSsoConfiguration,
  updateSsoConfiguration,
  deleteSsoConfiguration,
  updateSsoConfigStatus,
  getSsoLoginLogs,
} from '@/repositories/sso-repository';
import { generateAuthorizationUrl, generateState, generateNonce } from '@/types/sso';

interface RouteParams {
  params: Promise<{ configId: string }>;
}

/**
 * SSO設定を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { configId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const config = await getSsoConfiguration(configId);
    if (!config) {
      return NextResponse.json({ error: 'SSO設定が見つかりません' }, { status: 404 });
    }

    // ログイン開始（認可URL生成）
    if (action === 'start-auth') {
      const redirectUri = searchParams.get('redirectUri');
      if (!redirectUri) {
        return NextResponse.json({ error: 'redirectUri is required' }, { status: 400 });
      }

      const state = generateState();
      const nonce = generateNonce();
      const authUrl = generateAuthorizationUrl(config, redirectUri, state, nonce);

      return NextResponse.json({
        authUrl,
        state,
        nonce,
      });
    }

    // ログインログ取得
    if (action === 'logs') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const logs = await getSsoLoginLogs(configId, limit);
      return NextResponse.json({ logs });
    }

    // シークレット情報を除去
    const safeConfig = {
      ...config,
      clientSecret: config.clientSecret ? '***' : undefined,
      privateKey: config.privateKey ? '***' : undefined,
    };

    return NextResponse.json(safeConfig);
  } catch (error) {
    console.error('Failed to get SSO configuration:', error);
    return NextResponse.json({ error: 'SSO設定の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * SSO設定を更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { configId } = await params;
    const body = await request.json();

    const existing = await getSsoConfiguration(configId);
    if (!existing) {
      return NextResponse.json({ error: 'SSO設定が見つかりません' }, { status: 404 });
    }

    const config = await updateSsoConfiguration(configId, body);

    // シークレット情報を除去
    const safeConfig = {
      ...config,
      clientSecret: config.clientSecret ? '***' : undefined,
      privateKey: config.privateKey ? '***' : undefined,
    };

    return NextResponse.json(safeConfig);
  } catch (error) {
    console.error('Failed to update SSO configuration:', error);
    return NextResponse.json({ error: 'SSO設定の更新に失敗しました' }, { status: 500 });
  }
}

/**
 * SSO設定を削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { configId } = await params;

    const existing = await getSsoConfiguration(configId);
    if (!existing) {
      return NextResponse.json({ error: 'SSO設定が見つかりません' }, { status: 404 });
    }

    await deleteSsoConfiguration(configId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete SSO configuration:', error);
    return NextResponse.json({ error: 'SSO設定の削除に失敗しました' }, { status: 500 });
  }
}

/**
 * SSO設定のステータス変更やテスト
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { configId } = await params;
    const body = await request.json();
    const { action, status } = body;

    const config = await getSsoConfiguration(configId);
    if (!config) {
      return NextResponse.json({ error: 'SSO設定が見つかりません' }, { status: 404 });
    }

    switch (action) {
      case 'set-status': {
        if (!status) {
          return NextResponse.json({ error: 'status is required' }, { status: 400 });
        }

        const updated = await updateSsoConfigStatus(configId, status);
        return NextResponse.json(updated);
      }

      case 'test-connection': {
        // 接続テスト
        const result = {
          success: true,
          message: '接続テストに成功しました',
          details: {
            authorizationUrl: !!config.authorizationUrl,
            tokenUrl: !!config.tokenUrl,
            userInfoUrl: !!config.userInfoUrl,
            certificate: !!config.certificate,
          },
        };

        // 実際のURLへの接続テスト（簡易版）
        if (config.authorizationUrl) {
          try {
            const response = await fetch(config.authorizationUrl, {
              method: 'HEAD',
            });
            result.details.authorizationUrl = response.ok || response.status === 400;
          } catch {
            result.details.authorizationUrl = false;
            result.success = false;
          }
        }

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to patch SSO configuration:', error);
    return NextResponse.json({ error: '操作に失敗しました' }, { status: 500 });
  }
}
