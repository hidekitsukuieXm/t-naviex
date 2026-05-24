import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  TreeView,
  TreeItem,
  TreeViewToolbar,
  TreeViewLabel,
  TreeViewActions,
  TreeViewAction,
  collectAllIds,
  findNodeById,
  getAncestorIds,
  type TreeNode,
} from '../tree-view';

describe('TreeView', () => {
  it('should render tree role', () => {
    render(
      <TreeView>
        <TreeItem id="1" label="Item 1" />
      </TreeView>
    );

    expect(screen.getByRole('tree')).toBeDefined();
  });

  it('should render with custom aria-label', () => {
    render(
      <TreeView aria-label="Custom Tree">
        <TreeItem id="1" label="Item 1" />
      </TreeView>
    );

    expect(screen.getByRole('tree')).toHaveProperty('ariaLabel', 'Custom Tree');
  });

  it('should render tree items', () => {
    render(
      <TreeView>
        <TreeItem id="1" label="Item 1" />
        <TreeItem id="2" label="Item 2" />
      </TreeView>
    );

    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 2')).toBeDefined();
  });

  it('should handle selection', () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <TreeView onSelectedIdsChange={onSelectedIdsChange}>
        <TreeItem id="1" label="Item 1" />
        <TreeItem id="2" label="Item 2" />
      </TreeView>
    );

    fireEvent.click(screen.getByText('Item 1'));
    expect(onSelectedIdsChange).toHaveBeenCalledWith(['1']);
  });

  it('should highlight selected item', () => {
    render(
      <TreeView selectedIds={['1']}>
        <TreeItem id="1" label="Item 1" />
        <TreeItem id="2" label="Item 2" />
      </TreeView>
    );

    const item = screen.getByText('Item 1').closest('[role="treeitem"]');
    expect(item?.getAttribute('aria-selected')).toBe('true');
  });

  it('should support multiSelect', async () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <TreeView multiSelect onSelectedIdsChange={onSelectedIdsChange}>
        <TreeItem id="1" label="Item 1" />
        <TreeItem id="2" label="Item 2" />
      </TreeView>
    );

    fireEvent.click(screen.getByText('Item 1'));
    expect(onSelectedIdsChange).toHaveBeenCalledWith(['1']);

    // Wait for state to update before clicking the second item
    await waitFor(() => {
      fireEvent.click(screen.getByText('Item 2'));
    });
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['1', '2']);
  });

  it('should set aria-multiselectable when multiSelect is true', () => {
    render(
      <TreeView multiSelect>
        <TreeItem id="1" label="Item 1" />
      </TreeView>
    );

    expect(screen.getByRole('tree').getAttribute('aria-multiselectable')).toBe('true');
  });
});

describe('TreeItem', () => {
  it('should render treeitem role', () => {
    render(
      <TreeView>
        <TreeItem id="1" label="Item 1" />
      </TreeView>
    );

    expect(screen.getByRole('treeitem')).toBeDefined();
  });

  it('should render label', () => {
    render(
      <TreeView>
        <TreeItem id="1" label="Test Label" />
      </TreeView>
    );

    expect(screen.getByText('Test Label')).toBeDefined();
  });

  it('should render icon', () => {
    render(
      <TreeView>
        <TreeItem id="1" label="Item 1" icon={<span data-testid="icon">Icon</span>} />
      </TreeView>
    );

    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('should render nested items', () => {
    render(
      <TreeView defaultExpandedIds={['1']}>
        <TreeItem id="1" label="Parent">
          <TreeItem id="1-1" label="Child 1" />
          <TreeItem id="1-2" label="Child 2" />
        </TreeItem>
      </TreeView>
    );

    expect(screen.getByText('Parent')).toBeDefined();
    expect(screen.getByText('Child 1')).toBeDefined();
    expect(screen.getByText('Child 2')).toBeDefined();
  });

  it('should hide children when collapsed', () => {
    render(
      <TreeView defaultExpandedIds={[]}>
        <TreeItem id="1" label="Parent">
          <TreeItem id="1-1" label="Child 1" />
        </TreeItem>
      </TreeView>
    );

    expect(screen.queryByText('Child 1')).toBeNull();
  });

  it('should toggle expand/collapse when clicking toggle button', () => {
    render(
      <TreeView defaultExpandedIds={['1']}>
        <TreeItem id="1" label="Parent">
          <TreeItem id="1-1" label="Child 1" />
        </TreeItem>
      </TreeView>
    );

    // Initially expanded
    expect(screen.getByText('Child 1')).toBeDefined();

    // Click collapse button
    const toggleButton = screen.getByRole('button', { name: '折りたたむ' });
    fireEvent.click(toggleButton);

    // Child should be hidden
    expect(screen.queryByText('Child 1')).toBeNull();
  });

  it('should set aria-expanded on items with children', () => {
    render(
      <TreeView defaultExpandedIds={['1']}>
        <TreeItem id="1" label="Parent">
          <TreeItem id="1-1" label="Child 1" />
        </TreeItem>
        <TreeItem id="2" label="No Children" />
      </TreeView>
    );

    const parentItem = screen.getByText('Parent').closest('[role="treeitem"]');
    expect(parentItem?.getAttribute('aria-expanded')).toBe('true');

    const leafItem = screen.getByText('No Children').closest('[role="treeitem"]');
    expect(leafItem?.getAttribute('aria-expanded')).toBeNull();
  });

  it('should handle keyboard navigation - Enter to select', () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <TreeView onSelectedIdsChange={onSelectedIdsChange}>
        <TreeItem id="1" label="Item 1" />
      </TreeView>
    );

    const item = screen.getByText('Item 1').closest('[role="treeitem"]');
    fireEvent.keyDown(item!, { key: 'Enter' });
    expect(onSelectedIdsChange).toHaveBeenCalledWith(['1']);
  });

  it('should handle keyboard navigation - Space to select', () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <TreeView onSelectedIdsChange={onSelectedIdsChange}>
        <TreeItem id="1" label="Item 1" />
      </TreeView>
    );

    const item = screen.getByText('Item 1').closest('[role="treeitem"]');
    fireEvent.keyDown(item!, { key: ' ' });
    expect(onSelectedIdsChange).toHaveBeenCalledWith(['1']);
  });

  it('should handle keyboard navigation - ArrowRight to expand', () => {
    const onExpandedIdsChange = vi.fn();
    render(
      <TreeView defaultExpandedIds={[]} onExpandedIdsChange={onExpandedIdsChange}>
        <TreeItem id="1" label="Parent">
          <TreeItem id="1-1" label="Child 1" />
        </TreeItem>
      </TreeView>
    );

    const item = screen.getByText('Parent').closest('[role="treeitem"]');
    fireEvent.keyDown(item!, { key: 'ArrowRight' });
    expect(onExpandedIdsChange).toHaveBeenCalledWith(['1']);
  });

  it('should handle keyboard navigation - ArrowLeft to collapse', () => {
    const onExpandedIdsChange = vi.fn();
    render(
      <TreeView defaultExpandedIds={['1']} onExpandedIdsChange={onExpandedIdsChange}>
        <TreeItem id="1" label="Parent">
          <TreeItem id="1-1" label="Child 1" />
        </TreeItem>
      </TreeView>
    );

    const item = screen.getByText('Parent').closest('[role="treeitem"]');
    fireEvent.keyDown(item!, { key: 'ArrowLeft' });
    expect(onExpandedIdsChange).toHaveBeenCalledWith([]);
  });

  it('should support disabled items', () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <TreeView onSelectedIdsChange={onSelectedIdsChange}>
        <TreeItem id="1" label="Disabled Item" disabled />
      </TreeView>
    );

    const item = screen.getByText('Disabled Item').closest('[role="treeitem"]');
    expect(item?.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(screen.getByText('Disabled Item'));
    expect(onSelectedIdsChange).not.toHaveBeenCalled();
  });

  it('should render different icons for expanded/collapsed states', () => {
    render(
      <TreeView defaultExpandedIds={['1']}>
        <TreeItem
          id="1"
          label="Parent"
          expandedIcon={<span data-testid="expanded-icon">Expanded</span>}
          collapsedIcon={<span data-testid="collapsed-icon">Collapsed</span>}
        >
          <TreeItem id="1-1" label="Child 1" />
        </TreeItem>
      </TreeView>
    );

    // Expanded state
    expect(screen.getByTestId('expanded-icon')).toBeDefined();
    expect(screen.queryByTestId('collapsed-icon')).toBeNull();

    // Collapse
    const toggleButton = screen.getByRole('button', { name: '折りたたむ' });
    fireEvent.click(toggleButton);

    // Collapsed state
    expect(screen.queryByTestId('expanded-icon')).toBeNull();
    expect(screen.getByTestId('collapsed-icon')).toBeDefined();
  });
});

describe('TreeViewToolbar', () => {
  it('should render toolbar', () => {
    render(
      <TreeViewToolbar>
        <span>Toolbar Content</span>
      </TreeViewToolbar>
    );

    expect(screen.getByText('Toolbar Content')).toBeDefined();
  });
});

describe('TreeViewLabel', () => {
  it('should render label', () => {
    render(<TreeViewLabel>Tree Label</TreeViewLabel>);
    expect(screen.getByText('Tree Label')).toBeDefined();
  });
});

describe('TreeViewActions', () => {
  it('should render actions', () => {
    render(
      <TreeViewActions>
        <button>Action 1</button>
        <button>Action 2</button>
      </TreeViewActions>
    );

    expect(screen.getByText('Action 1')).toBeDefined();
    expect(screen.getByText('Action 2')).toBeDefined();
  });
});

describe('TreeViewAction', () => {
  it('should render action button', () => {
    render(<TreeViewAction>Action</TreeViewAction>);
    expect(screen.getByRole('button', { name: 'Action' })).toBeDefined();
  });

  it('should handle click', () => {
    const onClick = vi.fn();
    render(<TreeViewAction onClick={onClick}>Action</TreeViewAction>);

    fireEvent.click(screen.getByText('Action'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('Utility Functions', () => {
  const testNodes: TreeNode[] = [
    {
      id: '1',
      label: 'Node 1',
      children: [
        { id: '1-1', label: 'Node 1-1' },
        {
          id: '1-2',
          label: 'Node 1-2',
          children: [{ id: '1-2-1', label: 'Node 1-2-1' }],
        },
      ],
    },
    { id: '2', label: 'Node 2' },
  ];

  describe('collectAllIds', () => {
    it('should collect all node IDs', () => {
      const ids = collectAllIds(testNodes);
      expect(ids).toContain('1');
      expect(ids).toContain('1-1');
      expect(ids).toContain('1-2');
      expect(ids).toContain('1-2-1');
      expect(ids).toContain('2');
      expect(ids).toHaveLength(5);
    });

    it('should return empty array for empty nodes', () => {
      const ids = collectAllIds([]);
      expect(ids).toHaveLength(0);
    });
  });

  describe('findNodeById', () => {
    it('should find node by ID', () => {
      const node = findNodeById(testNodes, '1-2-1');
      expect(node?.label).toBe('Node 1-2-1');
    });

    it('should return null for non-existent ID', () => {
      const node = findNodeById(testNodes, 'non-existent');
      expect(node).toBeNull();
    });

    it('should find root node', () => {
      const node = findNodeById(testNodes, '1');
      expect(node?.label).toBe('Node 1');
    });
  });

  describe('getAncestorIds', () => {
    it('should get ancestor IDs', () => {
      const ancestors = getAncestorIds(testNodes, '1-2-1');
      expect(ancestors).toContain('1');
      expect(ancestors).toContain('1-2');
      expect(ancestors).not.toContain('1-2-1');
    });

    it('should return empty array for root node', () => {
      const ancestors = getAncestorIds(testNodes, '1');
      expect(ancestors).toHaveLength(0);
    });

    it('should return empty array for non-existent node', () => {
      const ancestors = getAncestorIds(testNodes, 'non-existent');
      expect(ancestors).toHaveLength(0);
    });
  });
});
