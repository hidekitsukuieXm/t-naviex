import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSectionKeyboardShortcuts } from '../use-section-keyboard-shortcuts';
import type { TestSectionWithChildren } from '@/types/test-section';
import type { ClipboardData } from '@/components/test-specs/section-context-menu';

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

const mockClipboard: ClipboardData = {
  type: 'section',
  sectionId: 'section-2',
  sectionName: 'コピーされたセクション',
  operation: 'copy',
};

describe('useSectionKeyboardShortcuts', () => {
  const defaultProps = {
    selectedSection: mockSection,
    clipboard: null as ClipboardData | null,
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onPaste: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onCreate: vi.fn(),
    enabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
  });

  const dispatchKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    document.dispatchEvent(event);
  };

  describe('Copy shortcut (Ctrl+C)', () => {
    it('should call onCopy when Ctrl+C is pressed with selected section', () => {
      const onCopy = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onCopy,
        })
      );

      dispatchKeyboardEvent('c', { ctrlKey: true });

      expect(onCopy).toHaveBeenCalledWith(mockSection);
    });

    it('should not call onCopy when no section is selected', () => {
      const onCopy = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          selectedSection: null,
          onCopy,
        })
      );

      dispatchKeyboardEvent('c', { ctrlKey: true });

      expect(onCopy).not.toHaveBeenCalled();
    });

    it('should not call onCopy when disabled', () => {
      const onCopy = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onCopy,
          enabled: false,
        })
      );

      dispatchKeyboardEvent('c', { ctrlKey: true });

      expect(onCopy).not.toHaveBeenCalled();
    });
  });

  describe('Cut shortcut (Ctrl+X)', () => {
    it('should call onCut when Ctrl+X is pressed with selected section', () => {
      const onCut = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onCut,
        })
      );

      dispatchKeyboardEvent('x', { ctrlKey: true });

      expect(onCut).toHaveBeenCalledWith(mockSection);
    });

    it('should not call onCut when no section is selected', () => {
      const onCut = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          selectedSection: null,
          onCut,
        })
      );

      dispatchKeyboardEvent('x', { ctrlKey: true });

      expect(onCut).not.toHaveBeenCalled();
    });
  });

  describe('Paste shortcut (Ctrl+V)', () => {
    it('should call onPaste when Ctrl+V is pressed with clipboard data', () => {
      const onPaste = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          clipboard: mockClipboard,
          onPaste,
        })
      );

      dispatchKeyboardEvent('v', { ctrlKey: true });

      expect(onPaste).toHaveBeenCalledWith(mockSection);
    });

    it('should not call onPaste when clipboard is empty', () => {
      const onPaste = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          clipboard: null,
          onPaste,
        })
      );

      dispatchKeyboardEvent('v', { ctrlKey: true });

      expect(onPaste).not.toHaveBeenCalled();
    });
  });

  describe('Delete shortcut', () => {
    it('should call onDelete when Delete key is pressed', () => {
      const onDelete = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onDelete,
        })
      );

      dispatchKeyboardEvent('Delete');

      expect(onDelete).toHaveBeenCalledWith(mockSection);
    });

    it('should call onDelete when Backspace key is pressed', () => {
      const onDelete = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onDelete,
        })
      );

      dispatchKeyboardEvent('Backspace');

      expect(onDelete).toHaveBeenCalledWith(mockSection);
    });

    it('should not call onDelete when no section is selected', () => {
      const onDelete = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          selectedSection: null,
          onDelete,
        })
      );

      dispatchKeyboardEvent('Delete');

      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('Rename shortcut (F2)', () => {
    it('should call onRename when F2 is pressed', () => {
      const onRename = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onRename,
        })
      );

      dispatchKeyboardEvent('F2');

      expect(onRename).toHaveBeenCalled();
    });

    it('should not call onRename when no section is selected', () => {
      const onRename = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          selectedSection: null,
          onRename,
        })
      );

      dispatchKeyboardEvent('F2');

      expect(onRename).not.toHaveBeenCalled();
    });
  });

  describe('New section shortcut (Ctrl+N)', () => {
    it('should call onCreate when Ctrl+N is pressed', () => {
      const onCreate = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onCreate,
        })
      );

      dispatchKeyboardEvent('n', { ctrlKey: true });

      expect(onCreate).toHaveBeenCalledWith(mockSection);
    });

    it('should call onCreate with null when no section is selected', () => {
      const onCreate = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          selectedSection: null,
          onCreate,
        })
      );

      dispatchKeyboardEvent('n', { ctrlKey: true });

      expect(onCreate).toHaveBeenCalledWith(null);
    });
  });

  describe('Insert shortcut', () => {
    it('should call onCreate when Insert key is pressed', () => {
      const onCreate = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onCreate,
        })
      );

      dispatchKeyboardEvent('Insert');

      expect(onCreate).toHaveBeenCalledWith(mockSection);
    });
  });

  describe('Input focus handling', () => {
    it('should not trigger shortcuts when focus is on input element', () => {
      const onCopy = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onCopy,
        })
      );

      // Create and focus an input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Dispatch event with input as target
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: input });
      document.dispatchEvent(event);

      expect(onCopy).not.toHaveBeenCalled();

      // Clean up
      document.body.removeChild(input);
    });

    it('should not trigger shortcuts when focus is on textarea element', () => {
      const onCopy = vi.fn();
      renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onCopy,
        })
      );

      // Create and focus a textarea element
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      // Dispatch event with textarea as target
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: textarea });
      document.dispatchEvent(event);

      expect(onCopy).not.toHaveBeenCalled();

      // Clean up
      document.body.removeChild(textarea);
    });
  });

  describe('Hook cleanup', () => {
    it('should remove event listener on unmount', () => {
      const onCopy = vi.fn();
      const { unmount } = renderHook(() =>
        useSectionKeyboardShortcuts({
          ...defaultProps,
          onCopy,
        })
      );

      unmount();

      // After unmount, shortcuts should not work
      dispatchKeyboardEvent('c', { ctrlKey: true });
      expect(onCopy).not.toHaveBeenCalled();
    });

    it('should remove event listener when disabled changes to false', () => {
      const onCopy = vi.fn();
      const { rerender } = renderHook((props) => useSectionKeyboardShortcuts(props), {
        initialProps: { ...defaultProps, onCopy, enabled: true },
      });

      // First, shortcut should work
      dispatchKeyboardEvent('c', { ctrlKey: true });
      expect(onCopy).toHaveBeenCalledTimes(1);

      // Disable shortcuts
      rerender({ ...defaultProps, onCopy, enabled: false });

      // Now shortcut should not work
      dispatchKeyboardEvent('c', { ctrlKey: true });
      expect(onCopy).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });
});
