import '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Prisma generated enums
vi.mock('@/generated/prisma', () => ({
  // User enums
  UserStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    SUSPENDED: 'SUSPENDED',
    PENDING: 'PENDING',
  },
  ProjectStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    ARCHIVED: 'ARCHIVED',
    PLANNING: 'PLANNING',
  },

  // Best Practice enums
  BestPracticeComplexity: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  BestPracticeStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    DEPRECATED: 'DEPRECATED',
    ARCHIVED: 'ARCHIVED',
  },

  // Test Design Knowledge enums
  TestTechniqueCategory: {
    BLACK_BOX: 'BLACK_BOX',
    WHITE_BOX: 'WHITE_BOX',
    EXPERIENCE_BASED: 'EXPERIENCE_BASED',
    STRUCTURE_BASED: 'STRUCTURE_BASED',
  },
  TestDesignKnowledgeStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    DEPRECATED: 'DEPRECATED',
    ARCHIVED: 'ARCHIVED',
  },

  // Other common enums used in tests
  TestCasePriority: { CRITICAL: 'CRITICAL', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' },
  TestSpecStatus: { DRAFT: 'DRAFT', REVIEW: 'REVIEW', APPROVED: 'APPROVED', ARCHIVED: 'ARCHIVED' },
  WidgetType: { TEST_STATUS: 'TEST_STATUS', BUG_STATUS: 'BUG_STATUS', PROGRESS: 'PROGRESS' },
  BaselineStatus: { DRAFT: 'DRAFT', APPROVED: 'APPROVED', LOCKED: 'LOCKED', ARCHIVED: 'ARCHIVED' },
  CatalogItemType: {
    TEST_CASE: 'TEST_CASE',
    TEST_STEP: 'TEST_STEP',
    TEMPLATE: 'TEMPLATE',
    CHECKLIST: 'CHECKLIST',
  },
  CatalogItemStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    DEPRECATED: 'DEPRECATED',
    ARCHIVED: 'ARCHIVED',
  },
  TestSetStatus: { DRAFT: 'DRAFT', ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED', ARCHIVED: 'ARCHIVED' },

  // Prisma namespace mock (for type operations)
  Prisma: {},
}));

// Mock ResizeObserver for tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollIntoView for tests (used by cmdk)
Element.prototype.scrollIntoView = vi.fn();

// Counter to generate unique IDs for mock RichTextEditor
let mockEditorIdCounter = 0;

// Mock MDXEditor components for testing
vi.mock('@/components/ui/mdx-editor', async () => {
  const React = await import('react');
  return {
    RichTextEditor: ({
      value,
      onChange,
      disabled,
      placeholder,
      error,
    }: {
      value: string;
      onChange: (value: string) => void;
      disabled?: boolean;
      placeholder?: string;
      error?: boolean;
    }) => {
      const id = `mock-rich-text-editor-${mockEditorIdCounter++}`;
      return React.createElement('textarea', {
        id: id,
        value: value,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
        disabled: disabled,
        placeholder: placeholder,
        'data-testid': 'rich-text-editor',
        'aria-invalid': error,
      });
    },
  };
});

// Reset mock editor counter before each test
beforeEach(() => {
  mockEditorIdCounter = 0;
});
