import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuLabel,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
} from '../context-menu';

// Mock Base UI context menu
vi.mock('@base-ui/react/context-menu', () => ({
  ContextMenu: {
    Root: ({ children, ...props }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-root" data-slot={props['data-slot'] || 'context-menu'}>
        {children}
      </div>
    ),
    Trigger: ({ children, ...props }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-trigger" data-slot={props['data-slot']}>
        {children}
      </div>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-portal">{children}</div>
    ),
    Positioner: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="context-menu-positioner" className={className}>
        {children}
      </div>
    ),
    Popup: ({
      children,
      className,
      ...props
    }: {
      children: React.ReactNode;
      className?: string;
    }) => (
      <div data-testid="context-menu-popup" className={className} data-slot={props['data-slot']}>
        {children}
      </div>
    ),
    Group: ({ children, ...props }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-group" data-slot={props['data-slot']}>
        {children}
      </div>
    ),
    GroupLabel: ({
      children,
      className,
      ...props
    }: {
      children: React.ReactNode;
      className?: string;
    }) => (
      <div
        data-testid="context-menu-group-label"
        className={className}
        data-slot={props['data-slot']}
      >
        {children}
      </div>
    ),
    Item: ({
      children,
      className,
      onClick,
      ...props
    }: {
      children: React.ReactNode;
      className?: string;
      onClick?: () => void;
    }) => (
      <button
        data-testid="context-menu-item"
        className={className}
        onClick={onClick}
        type="button"
        data-slot={props['data-slot']}
        data-variant={props['data-variant']}
      >
        {children}
      </button>
    ),
    SubmenuRoot: ({ children, ...props }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-submenu-root" data-slot={props['data-slot']}>
        {children}
      </div>
    ),
    SubmenuTrigger: ({
      children,
      className,
      ...props
    }: {
      children: React.ReactNode;
      className?: string;
    }) => (
      <div
        data-testid="context-menu-submenu-trigger"
        className={className}
        data-slot={props['data-slot']}
      >
        {children}
      </div>
    ),
    Separator: ({ className, ...props }: { className?: string }) => (
      <hr
        data-testid="context-menu-separator"
        className={className}
        data-slot={props['data-slot']}
      />
    ),
    CheckboxItem: ({
      children,
      className,
      checked,
      ...props
    }: {
      children: React.ReactNode;
      className?: string;
      checked?: boolean;
    }) => (
      <div
        data-testid="context-menu-checkbox-item"
        className={className}
        data-checked={checked}
        data-slot={props['data-slot']}
      >
        {children}
      </div>
    ),
    CheckboxItemIndicator: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="context-menu-checkbox-item-indicator">{children}</span>
    ),
    RadioGroup: ({ children, ...props }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-radio-group" data-slot={props['data-slot']}>
        {children}
      </div>
    ),
    RadioItem: ({
      children,
      className,
      ...props
    }: {
      children: React.ReactNode;
      className?: string;
    }) => (
      <div
        data-testid="context-menu-radio-item"
        className={className}
        data-slot={props['data-slot']}
      >
        {children}
      </div>
    ),
    RadioItemIndicator: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="context-menu-radio-item-indicator">{children}</span>
    ),
  },
}));

describe('ContextMenu', () => {
  it('should render context menu root', () => {
    render(
      <ContextMenu>
        <div>Content</div>
      </ContextMenu>
    );
    expect(screen.getByTestId('context-menu-root')).toBeDefined();
  });
});

describe('ContextMenuTrigger', () => {
  it('should render trigger', () => {
    render(
      <ContextMenuTrigger>
        <div>Trigger Content</div>
      </ContextMenuTrigger>
    );
    expect(screen.getByTestId('context-menu-trigger')).toBeDefined();
    expect(screen.getByText('Trigger Content')).toBeDefined();
  });
});

describe('ContextMenuContent', () => {
  it('should render content within portal and positioner', () => {
    render(
      <ContextMenuContent>
        <div>Menu Content</div>
      </ContextMenuContent>
    );
    expect(screen.getByTestId('context-menu-portal')).toBeDefined();
    expect(screen.getByTestId('context-menu-positioner')).toBeDefined();
    expect(screen.getByTestId('context-menu-popup')).toBeDefined();
    expect(screen.getByText('Menu Content')).toBeDefined();
  });

  it('should apply custom className', () => {
    render(
      <ContextMenuContent className="custom-class">
        <div>Content</div>
      </ContextMenuContent>
    );
    expect(screen.getByTestId('context-menu-popup').className).toContain('custom-class');
  });
});

describe('ContextMenuItem', () => {
  it('should render menu item', () => {
    render(<ContextMenuItem>Item Text</ContextMenuItem>);
    expect(screen.getByTestId('context-menu-item')).toBeDefined();
    expect(screen.getByText('Item Text')).toBeDefined();
  });

  it('should apply variant data attribute', () => {
    render(<ContextMenuItem variant="destructive">Delete</ContextMenuItem>);
    expect(screen.getByTestId('context-menu-item').getAttribute('data-variant')).toBe(
      'destructive'
    );
  });

  it('should apply custom className', () => {
    render(<ContextMenuItem className="custom-class">Item</ContextMenuItem>);
    expect(screen.getByTestId('context-menu-item').className).toContain('custom-class');
  });
});

describe('ContextMenuSeparator', () => {
  it('should render separator', () => {
    render(<ContextMenuSeparator />);
    expect(screen.getByTestId('context-menu-separator')).toBeDefined();
  });

  it('should apply custom className', () => {
    render(<ContextMenuSeparator className="custom-separator" />);
    expect(screen.getByTestId('context-menu-separator').className).toContain('custom-separator');
  });
});

describe('ContextMenuShortcut', () => {
  it('should render shortcut text', () => {
    render(<ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>);
    expect(screen.getByText('Ctrl+C')).toBeDefined();
  });

  it('should apply custom className', () => {
    render(<ContextMenuShortcut className="custom-shortcut">Ctrl+V</ContextMenuShortcut>);
    expect(screen.getByText('Ctrl+V').className).toContain('custom-shortcut');
  });
});

describe('ContextMenuLabel', () => {
  it('should render label', () => {
    render(<ContextMenuLabel>Label Text</ContextMenuLabel>);
    expect(screen.getByText('Label Text')).toBeDefined();
  });
});

describe('ContextMenuGroup', () => {
  it('should render group', () => {
    render(
      <ContextMenuGroup>
        <ContextMenuItem>Item 1</ContextMenuItem>
        <ContextMenuItem>Item 2</ContextMenuItem>
      </ContextMenuGroup>
    );
    expect(screen.getByTestId('context-menu-group')).toBeDefined();
  });
});

describe('ContextMenuSub', () => {
  it('should render submenu root', () => {
    render(
      <ContextMenuSub>
        <div>Submenu Content</div>
      </ContextMenuSub>
    );
    expect(screen.getByTestId('context-menu-submenu-root')).toBeDefined();
  });
});

describe('ContextMenuSubTrigger', () => {
  it('should render submenu trigger with chevron', () => {
    render(<ContextMenuSubTrigger>Submenu</ContextMenuSubTrigger>);
    expect(screen.getByTestId('context-menu-submenu-trigger')).toBeDefined();
    expect(screen.getByText('Submenu')).toBeDefined();
  });
});

describe('ContextMenuSubContent', () => {
  it('should render submenu content', () => {
    render(
      <ContextMenuSubContent>
        <ContextMenuItem>Sub Item</ContextMenuItem>
      </ContextMenuSubContent>
    );
    expect(screen.getByTestId('context-menu-popup')).toBeDefined();
    expect(screen.getByText('Sub Item')).toBeDefined();
  });
});

describe('ContextMenuCheckboxItem', () => {
  it('should render checkbox item', () => {
    render(<ContextMenuCheckboxItem checked>Checked Item</ContextMenuCheckboxItem>);
    expect(screen.getByTestId('context-menu-checkbox-item')).toBeDefined();
    expect(screen.getByText('Checked Item')).toBeDefined();
  });

  it('should have checked data attribute', () => {
    render(<ContextMenuCheckboxItem checked>Checked</ContextMenuCheckboxItem>);
    expect(screen.getByTestId('context-menu-checkbox-item').getAttribute('data-checked')).toBe(
      'true'
    );
  });
});

describe('ContextMenuRadioGroup', () => {
  it('should render radio group', () => {
    render(
      <ContextMenuRadioGroup>
        <ContextMenuRadioItem value="option1">Option 1</ContextMenuRadioItem>
        <ContextMenuRadioItem value="option2">Option 2</ContextMenuRadioItem>
      </ContextMenuRadioGroup>
    );
    expect(screen.getByTestId('context-menu-radio-group')).toBeDefined();
  });
});

describe('ContextMenuRadioItem', () => {
  it('should render radio item', () => {
    render(<ContextMenuRadioItem value="test">Radio Item</ContextMenuRadioItem>);
    expect(screen.getByTestId('context-menu-radio-item')).toBeDefined();
    expect(screen.getByText('Radio Item')).toBeDefined();
  });
});
