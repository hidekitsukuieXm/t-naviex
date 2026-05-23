// RBAC (Role-Based Access Control) ユーティリティ
// エクスポート一覧

export {
  withPermission,
  requirePermission,
  checkPermission,
  type PermissionCheckResult,
  type WithPermissionOptions,
} from './middleware';

export {
  ForbiddenError,
  UnauthorizedError,
  PermissionDeniedError,
  handleRBACError,
} from './errors';

export { PermissionGate, type PermissionGateProps } from './components';
