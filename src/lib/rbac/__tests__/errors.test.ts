import { describe, it, expect } from 'vitest';
import {
  UnauthorizedError,
  ForbiddenError,
  PermissionDeniedError,
  handleRBACError,
  getPermissionErrorMessage,
} from '../errors';

describe('RBAC Errors', () => {
  describe('UnauthorizedError', () => {
    it('should create error with default message', () => {
      const error = new UnauthorizedError();
      expect(error.name).toBe('UnauthorizedError');
      expect(error.message).toBe('認証が必要です。');
    });

    it('should create error with custom message', () => {
      const error = new UnauthorizedError('ログインしてください。');
      expect(error.message).toBe('ログインしてください。');
    });
  });

  describe('ForbiddenError', () => {
    it('should create error with resource and action', () => {
      const error = new ForbiddenError('testCases', 'create');
      expect(error.name).toBe('ForbiddenError');
      expect(error.resource).toBe('testCases');
      expect(error.action).toBe('create');
      expect(error.message).toBe('testCasesのcreate権限がありません。');
    });

    it('should create error with custom message', () => {
      const error = new ForbiddenError(
        'projects',
        'delete',
        'プロジェクトを削除する権限がありません。'
      );
      expect(error.message).toBe('プロジェクトを削除する権限がありません。');
      expect(error.resource).toBe('projects');
      expect(error.action).toBe('delete');
    });
  });

  describe('PermissionDeniedError', () => {
    it('should create error with default message', () => {
      const error = new PermissionDeniedError();
      expect(error.name).toBe('PermissionDeniedError');
      expect(error.message).toBe('この操作を実行する権限がありません。');
    });

    it('should create error with custom message', () => {
      const error = new PermissionDeniedError('アクセスが拒否されました。');
      expect(error.message).toBe('アクセスが拒否されました。');
    });
  });

  describe('handleRBACError', () => {
    it('should handle UnauthorizedError with 401 status', async () => {
      const error = new UnauthorizedError();
      const response = handleRBACError(error);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should handle ForbiddenError with 403 status', async () => {
      const error = new ForbiddenError('testCases', 'delete');
      const response = handleRBACError(error);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('FORBIDDEN');
      expect(data.resource).toBe('testCases');
      expect(data.action).toBe('delete');
    });

    it('should handle PermissionDeniedError with 403 status', async () => {
      const error = new PermissionDeniedError();
      const response = handleRBACError(error);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('PERMISSION_DENIED');
    });

    it('should handle unknown errors with 500 status', async () => {
      const error = new Error('Unknown error');
      const response = handleRBACError(error);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('PERMISSION_DENIED');
    });
  });

  describe('getPermissionErrorMessage', () => {
    it('should return Japanese error message for projects', () => {
      expect(getPermissionErrorMessage('projects', 'create')).toBe(
        'プロジェクトの作成権限がありません。'
      );
      expect(getPermissionErrorMessage('projects', 'read')).toBe(
        'プロジェクトの閲覧権限がありません。'
      );
      expect(getPermissionErrorMessage('projects', 'update')).toBe(
        'プロジェクトの更新権限がありません。'
      );
      expect(getPermissionErrorMessage('projects', 'delete')).toBe(
        'プロジェクトの削除権限がありません。'
      );
    });

    it('should return Japanese error message for testCases', () => {
      expect(getPermissionErrorMessage('testCases', 'create')).toBe(
        'テストケースの作成権限がありません。'
      );
    });

    it('should return Japanese error message for users', () => {
      expect(getPermissionErrorMessage('users', 'delete')).toBe('ユーザーの削除権限がありません。');
    });

    it('should return Japanese error message for all resource types', () => {
      expect(getPermissionErrorMessage('roles', 'read')).toBe('ロールの閲覧権限がありません。');
      expect(getPermissionErrorMessage('testRuns', 'update')).toBe(
        'テストランの更新権限がありません。'
      );
      expect(getPermissionErrorMessage('testResults', 'create')).toBe(
        'テスト結果の作成権限がありません。'
      );
      expect(getPermissionErrorMessage('bugs', 'delete')).toBe('バグの削除権限がありません。');
      expect(getPermissionErrorMessage('reports', 'read')).toBe('レポートの閲覧権限がありません。');
      expect(getPermissionErrorMessage('settings', 'update')).toBe('設定の更新権限がありません。');
    });
  });
});
