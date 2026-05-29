/**
 * Group Management Component
 *
 * グループ管理設定コンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type {
  Group,
  GroupTreeNode,
  GroupWithMembers,
  GroupMember,
  GroupStatistics,
} from '@/types/group';

// Extended type for group detail response which includes path
interface GroupDetailResponse extends GroupWithMembers {
  path?: Array<{ id: string; name: string }>;
}

interface GroupFormData {
  name: string;
  description: string;
  parentId: string | null;
}

const initialFormData: GroupFormData = {
  name: '',
  description: '',
  parentId: null,
};

export default function GroupManagement() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [tree, setTree] = useState<GroupTreeNode[]>([]);
  const [statistics, setStatistics] = useState<GroupStatistics | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetailResponse | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<GroupFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  /**
   * グループ一覧を取得
   */
  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/groups?includeChildren=true');
      if (!response.ok) {
        throw new Error('グループの取得に失敗しました');
      }
      const data = await response.json();
      setGroups(data.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  }, []);

  /**
   * グループツリーを取得
   */
  const fetchTree = useCallback(async () => {
    try {
      const response = await fetch('/api/groups/tree');
      if (!response.ok) {
        throw new Error('グループツリーの取得に失敗しました');
      }
      const data = await response.json();
      setTree(data.tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  }, []);

  /**
   * グループ統計を取得
   */
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('/api/groups/statistics');
      if (!response.ok) {
        throw new Error('統計情報の取得に失敗しました');
      }
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error('統計取得エラー:', err);
    }
  }, []);

  /**
   * グループ詳細を取得
   */
  const fetchGroupDetail = useCallback(async (groupId: string) => {
    try {
      const response = await fetch(
        `/api/groups/${groupId}?includeMembers=true&includeHierarchy=true`
      );
      if (!response.ok) {
        throw new Error('グループ詳細の取得に失敗しました');
      }
      const data = await response.json();
      setSelectedGroup(data);
      setMembers(data.members || []);
      setFormData({
        name: data.name,
        description: data.description || '',
        parentId: data.parentId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  }, []);

  /**
   * 初期データ取得
   */
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchGroups(), fetchTree(), fetchStatistics()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchGroups, fetchTree, fetchStatistics]);

  /**
   * グループを作成
   */
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('グループ名を入力してください');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          parentId: formData.parentId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'グループの作成に失敗しました');
      }

      setSuccess('グループを作成しました');
      setFormData(initialFormData);
      await Promise.all([fetchGroups(), fetchTree(), fetchStatistics()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * グループを更新
   */
  const handleUpdate = async () => {
    if (!selectedGroup) return;
    if (!formData.name.trim()) {
      setError('グループ名を入力してください');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          parentId: formData.parentId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'グループの更新に失敗しました');
      }

      setSuccess('グループを更新しました');
      setIsEditing(false);
      await Promise.all([fetchGroups(), fetchTree(), fetchGroupDetail(selectedGroup.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * グループを削除
   */
  const handleDelete = async (groupId: string, cascade: boolean = false) => {
    if (!confirm('このグループを削除してもよろしいですか？')) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}?cascade=${cascade}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.childrenCount && !cascade) {
          if (confirm(`子グループが${data.childrenCount}件あります。すべて削除しますか？`)) {
            await handleDelete(groupId, true);
            return;
          }
        }
        throw new Error(data.error || 'グループの削除に失敗しました');
      }

      setSuccess('グループを削除しました');
      setSelectedGroup(null);
      await Promise.all([fetchGroups(), fetchTree(), fetchStatistics()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * メンバーを追加
   */
  const handleAddMember = async () => {
    if (!selectedGroup || !newMemberEmail.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      // メールアドレスからユーザーを検索
      const userResponse = await fetch(
        `/api/users?email=${encodeURIComponent(newMemberEmail.trim())}`
      );
      if (!userResponse.ok) {
        throw new Error('ユーザーの検索に失敗しました');
      }
      const userData = await userResponse.json();
      if (!userData.users || userData.users.length === 0) {
        throw new Error('指定されたメールアドレスのユーザーが見つかりません');
      }

      const userId = userData.users[0].id;

      const response = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'メンバーの追加に失敗しました');
      }

      setSuccess('メンバーを追加しました');
      setNewMemberEmail('');
      setShowAddMemberDialog(false);
      await fetchGroupDetail(selectedGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * メンバーを削除
   */
  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;
    if (!confirm('このメンバーをグループから削除してもよろしいですか？')) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/members?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'メンバーの削除に失敗しました');
      }

      setSuccess('メンバーを削除しました');
      await fetchGroupDetail(selectedGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * ツリーノードの展開/折りたたみ
   */
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  /**
   * ツリーノードをレンダリング
   */
  const renderTreeNode = (node: GroupTreeNode, level: number = 0): React.JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="tree-node">
        <div
          className={`tree-node-content ${selectedGroup?.id === node.id ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => fetchGroupDetail(node.id)}
        >
          {hasChildren && (
            <button
              className="tree-toggle"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? '[-]' : '[+]'}
            </button>
          )}
          {!hasChildren && <span className="tree-leaf">&nbsp;&nbsp;&nbsp;</span>}
          <span className="tree-node-name">{node.name}</span>
          <span className="tree-node-count">({node.memberCount})</span>
        </div>
        {isExpanded && hasChildren && (
          <div className="tree-children">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="group-management">
      <style jsx>{`
        .group-management {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 24px;
          padding: 24px;
        }

        .sidebar {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
        }

        .main-content {
          background: #ffffff;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .view-toggle {
          display: flex;
          margin-bottom: 16px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          overflow: hidden;
        }

        .view-toggle button {
          flex: 1;
          padding: 8px;
          border: none;
          background: #ffffff;
          cursor: pointer;
        }

        .view-toggle button.active {
          background: #007bff;
          color: white;
        }

        .tree-node-content {
          display: flex;
          align-items: center;
          padding: 8px;
          cursor: pointer;
          border-radius: 4px;
        }

        .tree-node-content:hover {
          background: #e9ecef;
        }

        .tree-node-content.selected {
          background: #cce5ff;
        }

        .tree-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0 4px;
          font-family: monospace;
        }

        .tree-node-name {
          flex: 1;
          margin-left: 4px;
        }

        .tree-node-count {
          color: #6c757d;
          font-size: 0.85em;
        }

        .statistics {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #dee2e6;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 0.9em;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-group textarea {
          min-height: 80px;
          resize: vertical;
        }

        .button-group {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .members-list {
          margin-top: 24px;
        }

        .member-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .member-info {
          display: flex;
          flex-direction: column;
        }

        .member-name {
          font-weight: 500;
        }

        .member-email {
          font-size: 0.85em;
          color: #6c757d;
        }

        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .dialog {
          background: white;
          border-radius: 8px;
          padding: 24px;
          min-width: 400px;
          max-width: 90vw;
        }

        .dialog h3 {
          margin-top: 0;
        }

        .section-title {
          font-size: 1.1em;
          font-weight: 600;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #dee2e6;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #6c757d;
        }

        .group-path {
          font-size: 0.85em;
          color: #6c757d;
          margin-bottom: 8px;
        }

        .group-path span:not(:last-child)::after {
          content: ' > ';
        }
      `}</style>

      {/* サイドバー: グループツリー */}
      <div className="sidebar">
        <div className="view-toggle">
          <button
            className={viewMode === 'tree' ? 'active' : ''}
            onClick={() => setViewMode('tree')}
          >
            ツリー
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            リスト
          </button>
        </div>

        {viewMode === 'tree' ? (
          <div className="tree-view">{tree.map((node) => renderTreeNode(node))}</div>
        ) : (
          <div className="list-view">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`tree-node-content ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                onClick={() => fetchGroupDetail(group.id)}
              >
                <span className="tree-node-name">{group.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* 統計情報 */}
        {statistics && (
          <div className="statistics">
            <div className="section-title">統計</div>
            <div className="stat-item">
              <span>総グループ数</span>
              <strong>{statistics.totalGroups}</strong>
            </div>
            <div className="stat-item">
              <span>総メンバー数</span>
              <strong>{statistics.totalMembers}</strong>
            </div>
            <div className="stat-item">
              <span>ルートグループ</span>
              <strong>{statistics.rootGroups}</strong>
            </div>
            <div className="stat-item">
              <span>最大階層深度</span>
              <strong>{statistics.maxDepth}</strong>
            </div>
          </div>
        )}

        {/* 新規作成ボタン */}
        <div className="button-group" style={{ marginTop: '16px' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedGroup(null);
              setFormData(initialFormData);
              setIsEditing(true);
            }}
          >
            新規グループ作成
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="main-content">
        {error && (
          <div className="alert alert-error">
            {error}
            <button
              style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setError(null)}
            >
              X
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button
              style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setSuccess(null)}
            >
              X
            </button>
          </div>
        )}

        {/* 新規作成/編集フォーム */}
        {(isEditing || !selectedGroup) && (
          <div className="group-form">
            <div className="section-title">
              {selectedGroup ? 'グループを編集' : '新規グループ作成'}
            </div>

            <div className="form-group">
              <label htmlFor="name">グループ名 *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="グループ名を入力"
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">説明</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="グループの説明を入力"
              />
            </div>

            <div className="form-group">
              <label htmlFor="parentId">親グループ</label>
              <select
                id="parentId"
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
              >
                <option value="">なし（ルートグループ）</option>
                {groups
                  .filter((g) => g.id !== selectedGroup?.id)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="button-group">
              {selectedGroup ? (
                <>
                  <button className="btn btn-primary" onClick={handleUpdate} disabled={isSaving}>
                    {isSaving ? '保存中...' : '更新'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      if (selectedGroup) {
                        setFormData({
                          name: selectedGroup.name,
                          description: selectedGroup.description || '',
                          parentId: selectedGroup.parentId || null,
                        });
                      }
                    }}
                  >
                    キャンセル
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={handleCreate} disabled={isSaving}>
                  {isSaving ? '作成中...' : '作成'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* グループ詳細表示 */}
        {selectedGroup && !isEditing && (
          <div className="group-detail">
            {selectedGroup.path && selectedGroup.path.length > 1 && (
              <div className="group-path">
                {selectedGroup.path.map((p: { id: string; name: string }) => (
                  <span key={p.id}>{p.name}</span>
                ))}
              </div>
            )}

            <h2>{selectedGroup.name}</h2>
            {selectedGroup.description && <p>{selectedGroup.description}</p>}

            <div className="button-group">
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                編集
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedGroup.id)}>
                削除
              </button>
            </div>

            {/* メンバー一覧 */}
            <div className="members-list">
              <div className="section-title">
                メンバー ({members.length})
                <button
                  className="btn btn-secondary"
                  style={{ float: 'right', padding: '4px 8px', fontSize: '12px' }}
                  onClick={() => setShowAddMemberDialog(true)}
                >
                  + メンバー追加
                </button>
              </div>

              {members.length === 0 ? (
                <p style={{ color: '#6c757d' }}>メンバーがいません</p>
              ) : (
                members.map((member) => (
                  <div key={member.userId} className="member-item">
                    <div className="member-info">
                      <span className="member-name">{member.user?.name || '名前なし'}</span>
                      <span className="member-email">{member.user?.email}</span>
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => handleRemoveMember(member.userId)}
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* グループ未選択時 */}
        {!selectedGroup && !isEditing && (
          <div style={{ textAlign: 'center', color: '#6c757d', padding: '48px' }}>
            <p>左のツリーからグループを選択するか、新規グループを作成してください</p>
          </div>
        )}
      </div>

      {/* メンバー追加ダイアログ */}
      {showAddMemberDialog && (
        <div className="dialog-overlay" onClick={() => setShowAddMemberDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>メンバーを追加</h3>
            <div className="form-group">
              <label htmlFor="memberEmail">メールアドレス</label>
              <input
                id="memberEmail"
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="button-group">
              <button className="btn btn-primary" onClick={handleAddMember} disabled={isSaving}>
                {isSaving ? '追加中...' : '追加'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAddMemberDialog(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
