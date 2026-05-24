import '@testing-library/react';
import { vi } from 'vitest';

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
