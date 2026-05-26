/**
 * 外部連携接続テスト API
 * POST /api/integrations/[id]/test - 接続テスト実行
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getExternalIntegrationById,
  getDecryptedCredentials,
  updateTestResult,
} from '@/repositories/external-integration-repository';
import { IntegrationType, ConnectionTestResult } from '@/types/external-integration';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Redmine接続テスト
 */
async function testRedmineConnection(
  baseUrl: string,
  apiKey: string | null,
  username: string | null,
  password: string | null
): Promise<ConnectionTestResult> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['X-Redmine-API-Key'] = apiKey;
    } else if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else {
      return {
        success: false,
        message: 'APIキーまたはユーザー名/パスワードが必要です。',
      };
    }

    const response = await fetch(`${baseUrl}/users/current.json`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: '接続に成功しました。',
        details: {
          user: data.user?.login || 'Unknown',
          apiVersion: data.user?.api_key ? 'Available' : 'N/A',
        },
      };
    }

    return {
      success: false,
      message: `接続に失敗しました。ステータス: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

/**
 * Backlog接続テスト
 */
async function testBacklogConnection(
  baseUrl: string,
  apiKey: string | null
): Promise<ConnectionTestResult> {
  try {
    if (!apiKey) {
      return {
        success: false,
        message: 'APIキーが必要です。',
      };
    }

    const response = await fetch(`${baseUrl}/api/v2/users/myself?apiKey=${apiKey}`, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: '接続に成功しました。',
        details: {
          user: data.userId || data.name || 'Unknown',
        },
      };
    }

    return {
      success: false,
      message: `接続に失敗しました。ステータス: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

/**
 * JIRA接続テスト
 */
async function testJiraConnection(
  baseUrl: string,
  apiKey: string | null,
  username: string | null
): Promise<ConnectionTestResult> {
  try {
    if (!apiKey || !username) {
      return {
        success: false,
        message: 'メールアドレスとAPIトークンが必要です。',
      };
    }

    const credentials = Buffer.from(`${username}:${apiKey}`).toString('base64');
    const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: '接続に成功しました。',
        details: {
          user: data.displayName || data.emailAddress || 'Unknown',
          accountId: data.accountId,
        },
      };
    }

    return {
      success: false,
      message: `接続に失敗しました。ステータス: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

/**
 * GitHub接続テスト
 */
async function testGitHubConnection(apiKey: string | null): Promise<ConnectionTestResult> {
  try {
    if (!apiKey) {
      return {
        success: false,
        message: 'Personal Access Tokenが必要です。',
      };
    }

    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'T-NaviEx',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: '接続に成功しました。',
        details: {
          user: data.login,
          name: data.name,
        },
      };
    }

    return {
      success: false,
      message: `接続に失敗しました。ステータス: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

/**
 * GitLab接続テスト
 */
async function testGitLabConnection(
  baseUrl: string,
  apiKey: string | null
): Promise<ConnectionTestResult> {
  try {
    if (!apiKey) {
      return {
        success: false,
        message: 'Personal Access Tokenが必要です。',
      };
    }

    const response = await fetch(`${baseUrl}/api/v4/user`, {
      method: 'GET',
      headers: {
        'PRIVATE-TOKEN': apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: '接続に成功しました。',
        details: {
          user: data.username,
          name: data.name,
        },
      };
    }

    return {
      success: false,
      message: `接続に失敗しました。ステータス: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

/**
 * Azure DevOps接続テスト
 */
async function testAzureDevOpsConnection(
  baseUrl: string,
  apiKey: string | null
): Promise<ConnectionTestResult> {
  try {
    if (!apiKey) {
      return {
        success: false,
        message: 'Personal Access Tokenが必要です。',
      };
    }

    const credentials = Buffer.from(`:${apiKey}`).toString('base64');
    const response = await fetch(`${baseUrl}/_apis/projects?api-version=7.0`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: '接続に成功しました。',
        details: {
          projectCount: data.count || data.value?.length || 0,
        },
      };
    }

    return {
      success: false,
      message: `接続に失敗しました。ステータス: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

// POST /api/integrations/[id]/test
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '外部連携設定が見つかりません。' }, { status: 404 });
    }

    // Get decrypted credentials
    const credentials = await getDecryptedCredentials(integrationId);

    let result: ConnectionTestResult;

    switch (integration.integrationType as IntegrationType) {
      case 'REDMINE':
        result = await testRedmineConnection(
          integration.baseUrl,
          credentials?.apiKey || null,
          integration.username,
          credentials?.password || null
        );
        break;

      case 'BACKLOG':
        result = await testBacklogConnection(integration.baseUrl, credentials?.apiKey || null);
        break;

      case 'JIRA':
        result = await testJiraConnection(
          integration.baseUrl,
          credentials?.apiKey || null,
          integration.username
        );
        break;

      case 'GITHUB':
        result = await testGitHubConnection(credentials?.apiKey || null);
        break;

      case 'GITLAB':
        result = await testGitLabConnection(integration.baseUrl, credentials?.apiKey || null);
        break;

      case 'AZURE_DEVOPS':
        result = await testAzureDevOpsConnection(integration.baseUrl, credentials?.apiKey || null);
        break;

      default:
        result = {
          success: false,
          message: `未対応の連携タイプです: ${integration.integrationType}`,
        };
    }

    // Update test result in database
    await updateTestResult(
      integrationId,
      result.success,
      result.success ? undefined : result.message
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test integration error:', error);
    return NextResponse.json({ error: '接続テストに失敗しました。' }, { status: 500 });
  }
}
