/**
 * Group Service Tests
 */

import { describe, it, expect } from 'vitest';
import { GroupService } from '../group-service';
import type { Group, GroupWithHierarchy, GroupTreeNode } from '@/types/group';

describe('GroupService', () => {
  describe('validateGroupName', () => {
    it('有効なグループ名を検証する', () => {
      const result = GroupService.validateGroupName('開発チーム');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('空のグループ名を拒否する', () => {
      const result = GroupService.validateGroupName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('グループ名は必須です');
    });

    it('空白のみのグループ名を拒否する', () => {
      const result = GroupService.validateGroupName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('グループ名は必須です');
    });

    it('255文字を超えるグループ名を拒否する', () => {
      const longName = 'a'.repeat(256);
      const result = GroupService.validateGroupName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('グループ名は255文字以内で入力してください');
    });

    it('255文字のグループ名を許可する', () => {
      const maxName = 'a'.repeat(255);
      const result = GroupService.validateGroupName(maxName);
      expect(result.valid).toBe(true);
    });

    it('特殊文字を含むグループ名を拒否する', () => {
      const invalidNames = ['test<name>', 'test>name', 'test:name', 'test/name', 'test\\name'];
      invalidNames.forEach((name) => {
        const result = GroupService.validateGroupName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('グループ名に使用できない文字が含まれています');
      });
    });

    it('日本語のグループ名を許可する', () => {
      const result = GroupService.validateGroupName('品質管理グループ');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCreateRequest', () => {
    it('有効な作成リクエストを検証する', () => {
      const result = GroupService.validateCreateRequest({
        name: 'テストグループ',
        description: '説明文',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('親グループIDを持つリクエストを検証する', () => {
      const result = GroupService.validateCreateRequest({
        name: 'テストグループ',
        parentId: '123',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('無効な親グループIDを拒否する', () => {
      const result = GroupService.validateCreateRequest({
        name: 'テストグループ',
        parentId: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('親グループIDの形式が不正です');
    });

    it('名前なしのリクエストを拒否する', () => {
      const result = GroupService.validateCreateRequest({
        name: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('グループ名は必須です');
    });
  });

  describe('validateUpdateRequest', () => {
    it('名前のみの更新リクエストを検証する', () => {
      const result = GroupService.validateUpdateRequest({
        name: '新しいグループ名',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('説明のみの更新リクエストを検証する', () => {
      const result = GroupService.validateUpdateRequest({
        description: '新しい説明',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('親グループIDの更新を検証する', () => {
      const result = GroupService.validateUpdateRequest({
        parentId: '456',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('nullの親グループIDを許可する（ルートに移動）', () => {
      const result = GroupService.validateUpdateRequest({
        parentId: null,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('無効な親グループIDを拒否する', () => {
      const result = GroupService.validateUpdateRequest({
        parentId: 'not-a-number',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('親グループIDの形式が不正です');
    });
  });

  describe('checkIsDescendant', () => {
    it('祖先IDがパスに含まれている場合trueを返す', () => {
      const path = ['1', '2', '3', '4'];
      expect(GroupService.checkIsDescendant(path, '2')).toBe(true);
    });

    it('祖先IDがパスに含まれていない場合falseを返す', () => {
      const path = ['1', '2', '3', '4'];
      expect(GroupService.checkIsDescendant(path, '5')).toBe(false);
    });

    it('空のパスでfalseを返す', () => {
      expect(GroupService.checkIsDescendant([], '1')).toBe(false);
    });
  });

  describe('buildGroupTree', () => {
    it('フラットなグループリストからツリーを構築する', () => {
      const groups: GroupWithHierarchy[] = [
        { id: '1', name: 'A', parentId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'B', parentId: '1', createdAt: new Date(), updatedAt: new Date() },
        { id: '3', name: 'C', parentId: '1', createdAt: new Date(), updatedAt: new Date() },
        { id: '4', name: 'D', parentId: '2', createdAt: new Date(), updatedAt: new Date() },
      ];

      const tree = GroupService.buildGroupTree(groups);

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('1');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].id).toBe('2');
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].id).toBe('4');
    });

    it('複数のルートグループを処理する', () => {
      const groups: GroupWithHierarchy[] = [
        { id: '1', name: 'A', parentId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'B', parentId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', name: 'C', parentId: '1', createdAt: new Date(), updatedAt: new Date() },
      ];

      const tree = GroupService.buildGroupTree(groups);

      expect(tree).toHaveLength(2);
    });

    it('空のグループリストで空のツリーを返す', () => {
      const tree = GroupService.buildGroupTree([]);
      expect(tree).toHaveLength(0);
    });

    it('グループを名前順でソートする', () => {
      const groups: GroupWithHierarchy[] = [
        { id: '1', name: 'Zebra', parentId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Apple', parentId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', name: 'Mango', parentId: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const tree = GroupService.buildGroupTree(groups);

      expect(tree[0].name).toBe('Apple');
      expect(tree[1].name).toBe('Mango');
      expect(tree[2].name).toBe('Zebra');
    });
  });

  describe('calculateTreeDepth', () => {
    it('単一ノードの深度は1', () => {
      const node: GroupTreeNode = {
        id: '1',
        name: 'Root',
        children: [],
        memberCount: 0,
      };

      expect(GroupService.calculateTreeDepth(node)).toBe(1);
    });

    it('子を持つノードの深度を計算する', () => {
      const node: GroupTreeNode = {
        id: '1',
        name: 'Root',
        children: [
          {
            id: '2',
            name: 'Child',
            children: [
              {
                id: '3',
                name: 'Grandchild',
                children: [],
                memberCount: 0,
              },
            ],
            memberCount: 0,
          },
        ],
        memberCount: 0,
      };

      expect(GroupService.calculateTreeDepth(node)).toBe(3);
    });

    it('複数の枝を持つツリーの最大深度を計算する', () => {
      const node: GroupTreeNode = {
        id: '1',
        name: 'Root',
        children: [
          {
            id: '2',
            name: 'ShallowChild',
            children: [],
            memberCount: 0,
          },
          {
            id: '3',
            name: 'DeepChild',
            children: [
              {
                id: '4',
                name: 'Grandchild',
                children: [
                  {
                    id: '5',
                    name: 'GreatGrandchild',
                    children: [],
                    memberCount: 0,
                  },
                ],
                memberCount: 0,
              },
            ],
            memberCount: 0,
          },
        ],
        memberCount: 0,
      };

      expect(GroupService.calculateTreeDepth(node)).toBe(4);
    });
  });

  describe('calculateMaxDepth', () => {
    it('空のツリーで0を返す', () => {
      expect(GroupService.calculateMaxDepth([])).toBe(0);
    });

    it('複数のルートから最大深度を計算する', () => {
      const tree: GroupTreeNode[] = [
        {
          id: '1',
          name: 'Shallow',
          children: [],
          memberCount: 0,
        },
        {
          id: '2',
          name: 'Deep',
          children: [
            {
              id: '3',
              name: 'Child',
              children: [
                {
                  id: '4',
                  name: 'Grandchild',
                  children: [],
                  memberCount: 0,
                },
              ],
              memberCount: 0,
            },
          ],
          memberCount: 0,
        },
      ];

      expect(GroupService.calculateMaxDepth(tree)).toBe(3);
    });
  });

  describe('formatGroupPath', () => {
    it('パスを文字列に変換する', () => {
      const path = [
        { id: '1', name: '会社' },
        { id: '2', name: '開発部' },
        { id: '3', name: 'チームA' },
      ];

      expect(GroupService.formatGroupPath(path)).toBe('会社 > 開発部 > チームA');
    });

    it('単一要素のパスを処理する', () => {
      const path = [{ id: '1', name: 'ルート' }];
      expect(GroupService.formatGroupPath(path)).toBe('ルート');
    });

    it('空のパスで空文字を返す', () => {
      expect(GroupService.formatGroupPath([])).toBe('');
    });
  });

  describe('filterGroups', () => {
    const groups: Group[] = [
      {
        id: '1',
        name: '開発チーム',
        description: 'ソフトウェア開発',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: '品質管理',
        description: 'テストと品質保証',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: '営業部',
        description: '顧客対応',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('名前でフィルタリングする', () => {
      const result = GroupService.filterGroups(groups, '開発');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('説明でフィルタリングする', () => {
      const result = GroupService.filterGroups(groups, 'テスト');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('大文字小文字を区別しない', () => {
      const result = GroupService.filterGroups(groups, '開発');
      expect(result).toHaveLength(1);
    });

    it('一致しない場合は空配列を返す', () => {
      const result = GroupService.filterGroups(groups, '存在しない');
      expect(result).toHaveLength(0);
    });

    it('空のクエリで全グループを返す', () => {
      const result = GroupService.filterGroups(groups, '');
      expect(result).toHaveLength(3);
    });
  });

  describe('calculateStatistics', () => {
    it('統計情報を計算する', () => {
      const groups: Group[] = [
        { id: '1', name: 'A', parentId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'B', parentId: '1', createdAt: new Date(), updatedAt: new Date() },
        { id: '3', name: 'C', parentId: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const memberCounts = new Map<string, number>([
        ['1', 5],
        ['2', 3],
        ['3', 2],
      ]);

      const stats = GroupService.calculateStatistics(groups, memberCounts);

      expect(stats.totalGroups).toBe(3);
      expect(stats.totalMembers).toBe(10);
      expect(stats.rootGroups).toBe(2);
      expect(stats.averageMembersPerGroup).toBeCloseTo(3.33, 1);
    });

    it('空のデータで0を返す', () => {
      const stats = GroupService.calculateStatistics([], new Map());

      expect(stats.totalGroups).toBe(0);
      expect(stats.totalMembers).toBe(0);
      expect(stats.rootGroups).toBe(0);
      expect(stats.averageMembersPerGroup).toBe(0);
    });
  });

  describe('createSuccessResult', () => {
    it('成功結果を作成する', () => {
      const group: Group = {
        id: '1',
        name: 'テスト',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = GroupService.createSuccessResult('作成しました', group);

      expect(result.success).toBe(true);
      expect(result.message).toBe('作成しました');
      expect(result.group).toEqual(group);
    });

    it('グループなしの成功結果を作成する', () => {
      const result = GroupService.createSuccessResult('削除しました');

      expect(result.success).toBe(true);
      expect(result.message).toBe('削除しました');
      expect(result.group).toBeUndefined();
    });
  });

  describe('createErrorResult', () => {
    it('エラー結果を作成する', () => {
      const result = GroupService.createErrorResult('エラーが発生しました');

      expect(result.success).toBe(false);
      expect(result.message).toBe('エラーが発生しました');
      expect(result.error).toBe('エラーが発生しました');
    });
  });

  describe('sortGroups', () => {
    const groups: Group[] = [
      {
        id: '1',
        name: 'Banana',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-03-01'),
      },
      {
        id: '2',
        name: 'Apple',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '3',
        name: 'Cherry',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-02-01'),
      },
    ];

    it('名前で昇順ソートする', () => {
      const sorted = GroupService.sortGroups(groups, 'name', 'asc');
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Banana');
      expect(sorted[2].name).toBe('Cherry');
    });

    it('名前で降順ソートする', () => {
      const sorted = GroupService.sortGroups(groups, 'name', 'desc');
      expect(sorted[0].name).toBe('Cherry');
      expect(sorted[1].name).toBe('Banana');
      expect(sorted[2].name).toBe('Apple');
    });

    it('作成日で昇順ソートする', () => {
      const sorted = GroupService.sortGroups(groups, 'createdAt', 'asc');
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('更新日で降順ソートする', () => {
      const sorted = GroupService.sortGroups(groups, 'updatedAt', 'desc');
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('2');
    });

    it('元の配列を変更しない', () => {
      const original = [...groups];
      GroupService.sortGroups(groups, 'name', 'asc');
      expect(groups).toEqual(original);
    });
  });

  describe('wouldCreateCycle', () => {
    const groupMap = new Map<string, string | null>([
      ['1', null],
      ['2', '1'],
      ['3', '2'],
      ['4', '3'],
    ]);

    const getParentId = (id: string) => groupMap.get(id) ?? null;

    it('自分自身を親に設定しようとする場合trueを返す', () => {
      expect(GroupService.wouldCreateCycle('1', '1', getParentId)).toBe(true);
    });

    it('子孫を親に設定しようとする場合trueを返す', () => {
      // グループ1をグループ4の子にしようとする（4 -> 3 -> 2 -> 1）
      // これは1が4の祖先なので循環が発生する
      expect(GroupService.wouldCreateCycle('1', '4', getParentId)).toBe(true);
    });

    it('循環が発生しない場合falseを返す', () => {
      // グループ4をグループ1の直接の子にする（問題なし）
      expect(GroupService.wouldCreateCycle('4', '1', getParentId)).toBe(false);
    });

    it('ルートグループ同士の移動でfalseを返す', () => {
      const isolatedMap = new Map<string, string | null>([
        ['1', null],
        ['2', null],
      ]);
      const getIsolatedParentId = (id: string) => isolatedMap.get(id) ?? null;

      expect(GroupService.wouldCreateCycle('1', '2', getIsolatedParentId)).toBe(false);
    });
  });

  describe('createMemberSuccessResult', () => {
    it('追加成功結果を作成する', () => {
      const result = GroupService.createMemberSuccessResult('メンバーを追加しました', 5);

      expect(result.success).toBe(true);
      expect(result.message).toBe('メンバーを追加しました');
      expect(result.addedCount).toBe(5);
    });

    it('削除成功結果を作成する', () => {
      const result = GroupService.createMemberSuccessResult('メンバーを削除しました', undefined, 3);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(3);
    });
  });

  describe('createMemberErrorResult', () => {
    it('メンバー操作エラー結果を作成する', () => {
      const result = GroupService.createMemberErrorResult('ユーザーが見つかりません');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ユーザーが見つかりません');
    });
  });
});
