/**
 * Group Service
 *
 * グループ管理サービス
 */

import type {
  Group,
  GroupWithHierarchy,
  GroupTreeNode,
  GroupStatistics,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupOperationResult,
  GroupMemberOperationResult,
} from '@/types/group';

/**
 * グループ管理サービスクラス
 */
export class GroupService {
  /**
   * グループ名のバリデーション
   */
  static validateGroupName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'グループ名は必須です' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return { valid: false, error: 'グループ名は必須です' };
    }

    if (trimmedName.length > 255) {
      return { valid: false, error: 'グループ名は255文字以内で入力してください' };
    }

    // 特殊文字のチェック
    const invalidChars = /[<>:"\/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      return { valid: false, error: 'グループ名に使用できない文字が含まれています' };
    }

    return { valid: true };
  }

  /**
   * グループ作成リクエストのバリデーション
   */
  static validateCreateRequest(request: CreateGroupRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const nameValidation = this.validateGroupName(request.name);
    if (!nameValidation.valid) {
      errors.push(nameValidation.error!);
    }

    if (request.parentId && !/^\d+$/.test(request.parentId)) {
      errors.push('親グループIDの形式が不正です');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * グループ更新リクエストのバリデーション
   */
  static validateUpdateRequest(request: UpdateGroupRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (request.name !== undefined) {
      const nameValidation = this.validateGroupName(request.name);
      if (!nameValidation.valid) {
        errors.push(nameValidation.error!);
      }
    }

    if (request.parentId !== undefined && request.parentId !== null) {
      if (!/^\d+$/.test(request.parentId)) {
        errors.push('親グループIDの形式が不正です');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * グループが別のグループの子孫かどうかをチェック
   */
  static checkIsDescendant(groupPath: string[], potentialAncestorId: string): boolean {
    return groupPath.includes(potentialAncestorId);
  }

  /**
   * グループツリーを構築
   */
  static buildGroupTree(
    groups: GroupWithHierarchy[],
    parentId: string | null = null
  ): GroupTreeNode[] {
    return groups
      .filter((g) => g.parentId === parentId)
      .map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        children: this.buildGroupTree(groups, group.id),
        memberCount: 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }

  /**
   * グループツリーの深度を計算
   */
  static calculateTreeDepth(node: GroupTreeNode, currentDepth: number = 1): number {
    if (node.children.length === 0) {
      return currentDepth;
    }

    return Math.max(
      ...node.children.map((child) => this.calculateTreeDepth(child, currentDepth + 1))
    );
  }

  /**
   * 全ツリーの最大深度を計算
   */
  static calculateMaxDepth(tree: GroupTreeNode[]): number {
    if (tree.length === 0) {
      return 0;
    }

    return Math.max(...tree.map((node) => this.calculateTreeDepth(node)));
  }

  /**
   * グループパスを文字列に変換
   */
  static formatGroupPath(path: { id: string; name: string }[]): string {
    return path.map((p) => p.name).join(' > ');
  }

  /**
   * グループを検索（フィルタリング）
   */
  static filterGroups(groups: Group[], query: string): Group[] {
    const lowerQuery = query.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(lowerQuery) ||
        (g.description && g.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 統計情報を計算
   */
  static calculateStatistics(groups: Group[], memberCounts: Map<string, number>): GroupStatistics {
    const totalGroups = groups.length;
    const rootGroups = groups.filter((g) => !g.parentId).length;

    let totalMembers = 0;
    memberCounts.forEach((count) => {
      totalMembers += count;
    });

    const averageMembersPerGroup = totalGroups > 0 ? totalMembers / totalGroups : 0;

    // 深度を計算するには階層情報が必要
    // ここでは簡略化のため、直接計算は行わない
    const maxDepth = 0;

    return {
      totalGroups,
      totalMembers,
      rootGroups,
      maxDepth,
      averageMembersPerGroup: Math.round(averageMembersPerGroup * 100) / 100,
    };
  }

  /**
   * グループ操作結果を作成
   */
  static createSuccessResult(message: string, group?: Group): GroupOperationResult {
    return {
      success: true,
      message,
      group,
    };
  }

  /**
   * グループ操作エラー結果を作成
   */
  static createErrorResult(error: string): GroupOperationResult {
    return {
      success: false,
      message: error,
      error,
    };
  }

  /**
   * メンバー操作結果を作成
   */
  static createMemberSuccessResult(
    message: string,
    addedCount?: number,
    removedCount?: number
  ): GroupMemberOperationResult {
    return {
      success: true,
      message,
      addedCount,
      removedCount,
    };
  }

  /**
   * メンバー操作エラー結果を作成
   */
  static createMemberErrorResult(error: string): GroupMemberOperationResult {
    return {
      success: false,
      message: error,
      error,
    };
  }

  /**
   * グループをソート
   */
  static sortGroups(
    groups: Group[],
    sortBy: 'name' | 'createdAt' | 'updatedAt' = 'name',
    order: 'asc' | 'desc' = 'asc'
  ): Group[] {
    const sorted = [...groups].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ja');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * 循環参照をチェック
   */
  static wouldCreateCycle(
    groupId: string,
    newParentId: string,
    getParentId: (id: string) => string | null | undefined
  ): boolean {
    // 自分自身を親に設定しようとしている場合
    if (groupId === newParentId) {
      return true;
    }

    // newParentIdから祖先を辿り、groupIdに到達するかチェック
    let currentId: string | null | undefined = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        // すでに訪問済み（既存の循環）
        return true;
      }

      if (currentId === groupId) {
        // groupIdが祖先にいる = 循環が発生する
        return true;
      }

      visited.add(currentId);
      currentId = getParentId(currentId);
    }

    return false;
  }
}

export default GroupService;
