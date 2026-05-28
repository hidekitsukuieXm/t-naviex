/**
 * Group Management Types
 *
 * グループ管理機能の型定義
 */

/**
 * グループ基本情報
 */
export interface Group {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * グループ（階層情報付き）
 */
export interface GroupWithHierarchy extends Group {
  parent?: Group | null;
  children?: Group[];
  depth?: number;
  path?: string[];
}

/**
 * グループ（メンバー情報付き）
 */
export interface GroupWithMembers extends Group {
  members: GroupMember[];
  memberCount: number;
}

/**
 * グループメンバー情報
 */
export interface GroupMember {
  userId: string;
  groupId: string;
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
  joinedAt: Date;
}

/**
 * グループツリーノード（UI表示用）
 */
export interface GroupTreeNode {
  id: string;
  name: string;
  description?: string | null;
  children: GroupTreeNode[];
  memberCount: number;
  isExpanded?: boolean;
  isSelected?: boolean;
}

/**
 * グループ作成リクエスト
 */
export interface CreateGroupRequest {
  name: string;
  description?: string;
  parentId?: string;
}

/**
 * グループ更新リクエスト
 */
export interface UpdateGroupRequest {
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

/**
 * グループメンバー追加リクエスト
 */
export interface AddGroupMemberRequest {
  userId: string;
}

/**
 * グループメンバー一括追加リクエスト
 */
export interface BulkAddGroupMembersRequest {
  userIds: string[];
}

/**
 * グループ検索パラメータ
 */
export interface GroupSearchParams {
  query?: string;
  parentId?: string | null;
  includeChildren?: boolean;
  includeMembers?: boolean;
  page?: number;
  limit?: number;
}

/**
 * グループ一覧レスポンス
 */
export interface GroupListResponse {
  groups: Group[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * グループツリーレスポンス
 */
export interface GroupTreeResponse {
  tree: GroupTreeNode[];
  totalGroups: number;
}

/**
 * グループ移動リクエスト（階層変更）
 */
export interface MoveGroupRequest {
  newParentId: string | null;
}

/**
 * グループマージリクエスト
 */
export interface MergeGroupsRequest {
  sourceGroupId: string;
  targetGroupId: string;
  deleteSource?: boolean;
}

/**
 * グループ操作結果
 */
export interface GroupOperationResult {
  success: boolean;
  message: string;
  group?: Group;
  error?: string;
}

/**
 * グループメンバー操作結果
 */
export interface GroupMemberOperationResult {
  success: boolean;
  message: string;
  addedCount?: number;
  removedCount?: number;
  error?: string;
}

/**
 * グループ統計情報
 */
export interface GroupStatistics {
  totalGroups: number;
  totalMembers: number;
  rootGroups: number;
  maxDepth: number;
  averageMembersPerGroup: number;
}

/**
 * グループ権限設定
 */
export interface GroupPermission {
  groupId: string;
  resourceType: 'PROJECT' | 'TEST_CASE' | 'TEST_PLAN' | 'REPORT';
  resourceId: string;
  permission: 'READ' | 'WRITE' | 'ADMIN';
}

/**
 * グループとSSO連携設定
 */
export interface GroupSsoMapping {
  id: string;
  groupId: string;
  ssoGroupName: string;
  autoSync: boolean;
  createdAt: Date;
  updatedAt: Date;
}
