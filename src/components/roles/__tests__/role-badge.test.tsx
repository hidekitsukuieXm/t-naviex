import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from '../role-badge';

describe('RoleBadge', () => {
  it('システムロールのバッジが表示される', () => {
    render(<RoleBadge displayName="システム管理者" isSystemRole={true} />);

    expect(screen.getByText('システム管理者')).toBeTruthy();
    // システムロールは青色の背景
    const badge = screen.getByText('システム管理者').closest('span');
    expect(badge?.className).toContain('bg-blue');
  });

  it('カスタムロールのバッジが表示される', () => {
    render(<RoleBadge displayName="カスタムロール" isSystemRole={false} />);

    expect(screen.getByText('カスタムロール')).toBeTruthy();
    // カスタムロールはグレーの背景
    const badge = screen.getByText('カスタムロール').closest('span');
    expect(badge?.className).toContain('bg-gray');
  });

  it('カスタムclassNameが適用される', () => {
    render(<RoleBadge displayName="テストロール" isSystemRole={false} className="custom-class" />);

    const badge = screen.getByText('テストロール').closest('span');
    expect(badge?.className).toContain('custom-class');
  });

  it('アイコンが表示される', () => {
    const { container } = render(<RoleBadge displayName="テストロール" isSystemRole={true} />);

    // SVGアイコンが含まれている
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
