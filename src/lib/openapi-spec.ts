// OpenAPI 3.0 Specification for T-NaviEx REST API

import type { OpenAPIDocument } from '@/types/api-docs';

export const openAPISpec: OpenAPIDocument = {
  openapi: '3.0.3',
  info: {
    title: 'T-NaviEx REST API',
    version: '1.0.0',
    description: 'T-NaviExテスト管理システムの外部連携用REST API',
    contact: {
      name: 'T-NaviEx Support',
      email: 'support@t-naviex.example.com',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'REST API v1',
    },
  ],
  tags: [
    { name: 'Projects', description: 'プロジェクト管理' },
    { name: 'Test Specifications', description: 'テスト仕様管理' },
    { name: 'Test Cases', description: 'テストケース管理' },
    { name: 'Test Runs', description: 'テストラン管理' },
    { name: 'Bugs', description: 'バグ管理' },
  ],
  paths: {
    '/projects': {
      get: {
        operationId: 'listProjects',
        summary: 'プロジェクト一覧取得',
        description: 'プロジェクトの一覧を取得します。',
        tags: ['Projects'],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'ページ番号',
            schema: { type: 'integer', example: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: '1ページあたりの件数',
            schema: { type: 'integer', example: 20 },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    projects: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Project' },
                    },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { description: '認証エラー' },
        },
        security: [{ ApiKeyAuth: [] }],
      },
      post: {
        operationId: 'createProject',
        summary: 'プロジェクト作成',
        description: '新しいプロジェクトを作成します。',
        tags: ['Projects'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProjectRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
          '400': { description: 'バリデーションエラー' },
          '401': { description: '認証エラー' },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    },
    '/projects/{id}': {
      get: {
        operationId: 'getProject',
        summary: 'プロジェクト詳細取得',
        tags: ['Projects'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'プロジェクトID',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
          '404': { description: 'プロジェクトが見つかりません' },
        },
        security: [{ ApiKeyAuth: [] }],
      },
      put: {
        operationId: 'updateProject',
        summary: 'プロジェクト更新',
        tags: ['Projects'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProjectRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: '更新成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
          '404': { description: 'プロジェクトが見つかりません' },
        },
        security: [{ ApiKeyAuth: [] }],
      },
      delete: {
        operationId: 'deleteProject',
        summary: 'プロジェクト削除',
        tags: ['Projects'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': { description: '削除成功' },
          '404': { description: 'プロジェクトが見つかりません' },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    },
    '/test-specs': {
      get: {
        operationId: 'listTestSpecs',
        summary: 'テスト仕様一覧取得',
        tags: ['Test Specifications'],
        parameters: [
          {
            name: 'projectId',
            in: 'query',
            description: 'プロジェクトID',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    testSpecs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TestSpec' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    },
    '/test-specs/{id}': {
      get: {
        operationId: 'getTestSpec',
        summary: 'テスト仕様詳細取得',
        tags: ['Test Specifications'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestSpec' },
              },
            },
          },
          '404': { description: 'テスト仕様が見つかりません' },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    },
    '/test-cases': {
      get: {
        operationId: 'listTestCases',
        summary: 'テストケース一覧取得',
        tags: ['Test Cases'],
        parameters: [
          {
            name: 'testSpecId',
            in: 'query',
            description: 'テスト仕様ID',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'ステータス',
            schema: { type: 'string', enum: ['DRAFT', 'REVIEW', 'APPROVED', 'DEPRECATED'] },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    testCases: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TestCase' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
      post: {
        operationId: 'createTestCase',
        summary: 'テストケース作成',
        tags: ['Test Cases'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTestCaseRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestCase' },
              },
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    },
    '/test-cases/{id}': {
      get: {
        operationId: 'getTestCase',
        summary: 'テストケース詳細取得',
        tags: ['Test Cases'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestCase' },
              },
            },
          },
          '404': { description: 'テストケースが見つかりません' },
        },
        security: [{ ApiKeyAuth: [] }],
      },
      put: {
        operationId: 'updateTestCase',
        summary: 'テストケース更新',
        tags: ['Test Cases'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTestCaseRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: '更新成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestCase' },
              },
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
      delete: {
        operationId: 'deleteTestCase',
        summary: 'テストケース削除',
        tags: ['Test Cases'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': { description: '削除成功' },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    },
    '/test-runs': {
      get: {
        operationId: 'listTestRuns',
        summary: 'テストラン一覧取得',
        tags: ['Test Runs'],
        parameters: [
          {
            name: 'projectId',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'],
            },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    testRuns: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TestRun' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
      post: {
        operationId: 'createTestRun',
        summary: 'テストラン作成',
        tags: ['Test Runs'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTestRunRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestRun' },
              },
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    },
    '/bugs': {
      get: {
        operationId: 'listBugs',
        summary: 'バグ一覧取得',
        tags: ['Bugs'],
        parameters: [
          {
            name: 'projectId',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'],
            },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bugs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Bug' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
      post: {
        operationId: 'createBug',
        summary: 'バグ登録',
        tags: ['Bugs'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBugRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Bug' },
              },
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    },
  },
  components: {
    schemas: {
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED', 'DELETED'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'status'],
      },
      CreateProjectRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name'],
      },
      UpdateProjectRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
        },
      },
      TestSpec: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'projectId', 'name'],
      },
      TestCase: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          testSpecId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          preconditions: { type: 'string', nullable: true },
          steps: { type: 'string', nullable: true },
          expectedResults: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['DRAFT', 'REVIEW', 'APPROVED', 'DEPRECATED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'testSpecId', 'title', 'status', 'priority'],
      },
      CreateTestCaseRequest: {
        type: 'object',
        properties: {
          testSpecId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          preconditions: { type: 'string' },
          steps: { type: 'string' },
          expectedResults: { type: 'string' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        },
        required: ['testSpecId', 'title'],
      },
      UpdateTestCaseRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          preconditions: { type: 'string' },
          steps: { type: 'string' },
          expectedResults: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'REVIEW', 'APPROVED', 'DEPRECATED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        },
      },
      TestRun: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'] },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'projectId', 'name', 'status'],
      },
      CreateTestRunRequest: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          testCaseIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['projectId', 'name'],
      },
      Bug: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'],
          },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          testResultId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'projectId', 'title', 'status', 'severity'],
      },
      CreateBugRequest: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          testResultId: { type: 'string' },
        },
        required: ['projectId', 'title', 'severity'],
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'APIトークンを使用した認証',
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};
