import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiTokenCard } from '../api-token-card';
import { ApiTokenList } from '../api-token-list';
import type { ApiToken } from '@/types/api-token';

// グローバルfetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// クリップボードのモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

const mockToken: ApiToken = {
  id: '1',
  userId: '1',
  name: 'Test Token',
  tokenPrefix: 'abc12345',
  scopes: ['READ_PROJECTS', 'WRITE_PROJECTS'],
  expiresAt: null,
  lastUsedAt: new Date().toISOString(),
  lastUsedIp: '192.168.1.1',
  isActive: true,
  revokedAt: null,
  revokedReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockExpiredToken: ApiToken = {
  ...mockToken,
  id: '2',
  name: 'Expired Token',
  expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
};

const mockRevokedToken: ApiToken = {
  ...mockToken,
  id: '3',
  name: 'Revoked Token',
  isActive: false,
  revokedAt: new Date().toISOString(),
  revokedReason: 'Security concern',
};

describe('API Token Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ApiTokenCard', () => {
    it('should render token information', () => {
      render(
        <ApiTokenCard
          token={mockToken}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('Test Token')).toBeInTheDocument();
      expect(screen.getByText('abc12345...')).toBeInTheDocument();
      expect(screen.getByText('有効')).toBeInTheDocument();
    });

    it('should show expiration badge for expired token', () => {
      render(
        <ApiTokenCard
          token={mockExpiredToken}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('期限切れ')).toBeInTheDocument();
    });

    it('should show revoked badge and reason', () => {
      render(
        <ApiTokenCard
          token={mockRevokedToken}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('失効済み')).toBeInTheDocument();
      expect(screen.getByText(/Security concern/)).toBeInTheDocument();
    });

    it('should display scope badges', () => {
      render(
        <ApiTokenCard
          token={mockToken}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('プロジェクト読み取り')).toBeInTheDocument();
      expect(screen.getByText('プロジェクト書き込み')).toBeInTheDocument();
    });

    it('should show last used time', () => {
      render(
        <ApiTokenCard
          token={mockToken}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // 時間の表示を確認
      expect(screen.getByText(/秒前|分前|時間前|日前/)).toBeInTheDocument();
    });

    it('should show "未使用" for never used token', () => {
      const unusedToken = { ...mockToken, lastUsedAt: null };
      render(
        <ApiTokenCard
          token={unusedToken}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('未使用')).toBeInTheDocument();
    });

    it('should call onRevoke when revoke is confirmed', async () => {
      const onRevoke = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <ApiTokenCard
          token={mockToken}
          onRevoke={onRevoke}
          onDelete={vi.fn()}
        />
      );

      // メニューを開く（getAllByRoleの最初の要素を使用）
      const menuButtons = screen.getAllByRole('button', { name: /メニューを開く/i });
      await user.click(menuButtons[0]);

      // 失効オプションをクリック
      const revokeButton = await screen.findByText('トークンを失効');
      await user.click(revokeButton);

      // 確認ダイアログで失効ボタンをクリック
      const confirmButton = await screen.findByRole('button', { name: /失効する/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onRevoke).toHaveBeenCalledWith(mockToken.id);
      });
    });

    it('should call onDelete when delete is confirmed', async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <ApiTokenCard
          token={mockToken}
          onRevoke={vi.fn()}
          onDelete={onDelete}
        />
      );

      // メニューを開く（getAllByRoleの最初の要素を使用）
      const menuButtons = screen.getAllByRole('button', { name: /メニューを開く/i });
      await user.click(menuButtons[0]);

      // 削除オプションをクリック
      const deleteButton = await screen.findByText('削除');
      await user.click(deleteButton);

      // 確認ダイアログで削除ボタンをクリック
      const confirmButton = await screen.findByRole('button', { name: /削除する/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith(mockToken.id);
      });
    });

    it('should show "無期限" for token without expiration', () => {
      render(
        <ApiTokenCard
          token={mockToken}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('無期限')).toBeInTheDocument();
    });
  });

  describe('ApiTokenList', () => {
    it('should render list of tokens', () => {
      render(
        <ApiTokenList
          tokens={[mockToken, mockExpiredToken]}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('Test Token')).toBeInTheDocument();
      expect(screen.getByText('Expired Token')).toBeInTheDocument();
    });

    it('should show empty state when no tokens', () => {
      render(
        <ApiTokenList
          tokens={[]}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText(/APIトークンはまだ作成されていません/)).toBeInTheDocument();
    });

    it('should render all provided tokens', () => {
      const tokens = [mockToken, mockExpiredToken, mockRevokedToken];
      render(
        <ApiTokenList
          tokens={tokens}
          onRevoke={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('Test Token')).toBeInTheDocument();
      expect(screen.getByText('Expired Token')).toBeInTheDocument();
      expect(screen.getByText('Revoked Token')).toBeInTheDocument();
    });
  });
});
