import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionContextMenu, RenameDialog } from '../section-context-menu';
import type { TestSectionWithChildren } from '@/types/test-section';

// Mock Base UI context menu
vi.mock('@base-ui/react/context-menu', () => ({
  ContextMenu: {
    Root: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-root">{children}</div>
    ),
    Trigger: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-trigger">{children}</div>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-portal">{children}</div>
    ),
    Positioner: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-positioner">{children}</div>
    ),
    Popup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="context-menu-popup" className={className}>
        {children}
      </div>
    ),
    Group: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-group">{children}</div>
    ),
    GroupLabel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="context-menu-group-label" className={className}>
        {children}
      </div>
    ),
    Item: ({
      children,
      onClick,
      disabled,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button data-testid="context-menu-item" onClick={onClick} disabled={disabled} type="button">
        {children}
      </button>
    ),
    SubmenuRoot: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-submenu-root">{children}</div>
    ),
    SubmenuTrigger: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-submenu-trigger">{children}</div>
    ),
    Separator: () => <hr data-testid="context-menu-separator" />,
    CheckboxItem: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-checkbox-item">{children}</div>
    ),
    CheckboxItemIndicator: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="context-menu-checkbox-item-indicator">{children}</span>
    ),
    RadioGroup: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-radio-group">{children}</div>
    ),
    RadioItem: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-radio-item">{children}</div>
    ),
    RadioItemIndicator: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="context-menu-radio-item-indicator">{children}</span>
    ),
  },
}));

// Mock dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog" role="dialog">
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogClose: ({
    children,
    render,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <button data-testid="dialog-close" type="button">
      {render ? children : children}
    </button>
  ),
}));

const mockSection: TestSectionWithChildren = {
  id: 'section-1',
  testSpecId: 'spec-1',
  parentId: null,
  name: 'テストセクション',
  sortOrder: 0,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  children: [],
};

const mockSectionWithChildren: TestSectionWithChildren = {
  id: 'section-1',
  testSpecId: 'spec-1',
  parentId: null,
  name: 'テストセクション',
  sortOrder: 0,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  children: [
    {
      id: 'section-1-1',
      testSpecId: 'spec-1',
      parentId: 'section-1',
      name: 'サブセクション',
      sortOrder: 0,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
      children: [],
    },
  ],
};

const mockAllSections: TestSectionWithChildren[] = [
  mockSection,
  {
    id: 'section-2',
    testSpecId: 'spec-1',
    parentId: null,
    name: 'セクション2',
    sortOrder: 1,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    children: [],
  },
];

describe('SectionContextMenu', () => {
  const defaultProps = {
    section: mockSection,
    allSections: mockAllSections,
    clipboard: null,
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onPaste: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onCreate: vi.fn(),
    onMove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children within context menu trigger', () => {
    render(
      <SectionContextMenu {...defaultProps}>
        <div data-testid="child-content">Child Content</div>
      </SectionContextMenu>
    );

    expect(screen.getByTestId('child-content')).toBeDefined();
    expect(screen.getByText('Child Content')).toBeDefined();
  });

  it('should render context menu items', () => {
    render(
      <SectionContextMenu {...defaultProps}>
        <div>Child</div>
      </SectionContextMenu>
    );

    // Check for menu items
    expect(screen.getByText('新規サブセクション作成')).toBeDefined();
    expect(screen.getByText('名前の変更')).toBeDefined();
    expect(screen.getByText('コピー')).toBeDefined();
    expect(screen.getByText('切り取り')).toBeDefined();
    expect(screen.getByText('貼り付け')).toBeDefined();
    expect(screen.getByText('削除')).toBeDefined();
    expect(screen.getByText('移動先')).toBeDefined();
  });

  it('should call onCopy when copy item is clicked', () => {
    const onCopy = vi.fn();
    render(
      <SectionContextMenu {...defaultProps} onCopy={onCopy}>
        <div>Child</div>
      </SectionContextMenu>
    );

    const copyItem = screen
      .getAllByTestId('context-menu-item')
      .find((item) => item.textContent?.includes('コピー'));
    fireEvent.click(copyItem!);

    expect(onCopy).toHaveBeenCalledWith(mockSection);
  });

  it('should call onCut when cut item is clicked', () => {
    const onCut = vi.fn();
    render(
      <SectionContextMenu {...defaultProps} onCut={onCut}>
        <div>Child</div>
      </SectionContextMenu>
    );

    const cutItem = screen
      .getAllByTestId('context-menu-item')
      .find((item) => item.textContent?.includes('切り取り'));
    fireEvent.click(cutItem!);

    expect(onCut).toHaveBeenCalledWith(mockSection);
  });

  it('should call onCreate when new subsection item is clicked', () => {
    const onCreate = vi.fn();
    render(
      <SectionContextMenu {...defaultProps} onCreate={onCreate}>
        <div>Child</div>
      </SectionContextMenu>
    );

    const createItem = screen
      .getAllByTestId('context-menu-item')
      .find((item) => item.textContent?.includes('新規サブセクション作成'));
    fireEvent.click(createItem!);

    expect(onCreate).toHaveBeenCalledWith(mockSection);
  });

  it('should disable paste when no clipboard data', () => {
    render(
      <SectionContextMenu {...defaultProps} clipboard={null}>
        <div>Child</div>
      </SectionContextMenu>
    );

    const pasteItem = screen
      .getAllByTestId('context-menu-item')
      .find((item) => item.textContent?.includes('貼り付け'));
    expect(pasteItem?.disabled).toBe(true);
  });

  it('should enable paste when clipboard has valid data', () => {
    const clipboard = {
      type: 'section' as const,
      sectionId: 'section-2',
      sectionName: 'Other Section',
      operation: 'copy' as const,
    };

    render(
      <SectionContextMenu {...defaultProps} clipboard={clipboard}>
        <div>Child</div>
      </SectionContextMenu>
    );

    const pasteItem = screen
      .getAllByTestId('context-menu-item')
      .find((item) => item.textContent?.includes('貼り付け'));
    expect(pasteItem?.disabled).toBe(false);
  });

  it('should not render context menu when disabled', () => {
    render(
      <SectionContextMenu {...defaultProps} disabled>
        <div data-testid="child-content">Child Content</div>
      </SectionContextMenu>
    );

    expect(screen.getByTestId('child-content')).toBeDefined();
    // Context menu root should not be rendered
    expect(screen.queryByTestId('context-menu-root')).toBeNull();
  });

  it('should render keyboard shortcuts', () => {
    render(
      <SectionContextMenu {...defaultProps}>
        <div>Child</div>
      </SectionContextMenu>
    );

    expect(screen.getByText('F2')).toBeDefined();
    expect(screen.getByText('Ctrl+C')).toBeDefined();
    expect(screen.getByText('Ctrl+X')).toBeDefined();
    expect(screen.getByText('Ctrl+V')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });
});

describe('RenameDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    currentName: 'テストセクション',
    onRename: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog when open', () => {
    render(<RenameDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('should not render dialog when closed', () => {
    render(<RenameDialog {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render dialog title', () => {
    render(<RenameDialog {...defaultProps} />);
    expect(screen.getByText('セクション名の変更')).toBeDefined();
  });

  it('should render input with current name', () => {
    render(<RenameDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('セクション名を入力');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('テストセクション');
  });

  it('should call onRename with new name when form is submitted', () => {
    const onRename = vi.fn();
    render(<RenameDialog {...defaultProps} onRename={onRename} />);

    const input = screen.getByPlaceholderText('セクション名を入力');
    fireEvent.change(input, { target: { value: '新しい名前' } });

    const form = input.closest('form');
    fireEvent.submit(form!);

    expect(onRename).toHaveBeenCalledWith('新しい名前');
  });

  it('should not call onRename when name is unchanged', () => {
    const onRename = vi.fn();
    render(<RenameDialog {...defaultProps} onRename={onRename} />);

    const form = screen.getByPlaceholderText('セクション名を入力').closest('form');
    fireEvent.submit(form!);

    expect(onRename).not.toHaveBeenCalled();
  });

  it('should disable submit button when name is empty', () => {
    render(<RenameDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('セクション名を入力');
    fireEvent.change(input, { target: { value: '' } });

    const submitButton = screen.getByText('変更');
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('should disable submit button when name is unchanged', () => {
    render(<RenameDialog {...defaultProps} />);

    const submitButton = screen.getByText('変更');
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('SectionContextMenu - Move functionality', () => {
  const defaultProps = {
    section: mockSection,
    allSections: mockAllSections,
    clipboard: null,
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onPaste: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onCreate: vi.fn(),
    onMove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render move submenu', () => {
    render(
      <SectionContextMenu {...defaultProps}>
        <div>Child</div>
      </SectionContextMenu>
    );

    expect(screen.getByText('移動先')).toBeDefined();
    expect(screen.getByText('ルートへ移動')).toBeDefined();
  });
});

describe('SectionContextMenu - Delete dialog', () => {
  const defaultProps = {
    section: mockSectionWithChildren,
    allSections: [mockSectionWithChildren],
    clipboard: null,
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onPaste: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onCreate: vi.fn(),
    onMove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show delete confirmation dialog', () => {
    render(
      <SectionContextMenu {...defaultProps}>
        <div>Child</div>
      </SectionContextMenu>
    );

    const deleteItem = screen
      .getAllByTestId('context-menu-item')
      .find((item) => item.textContent?.includes('削除'));
    fireEvent.click(deleteItem!);

    // Dialog should open
    expect(screen.getByText('セクションの削除')).toBeDefined();
  });
});
