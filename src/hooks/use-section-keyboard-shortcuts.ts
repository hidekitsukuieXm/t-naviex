'use client';

import { useCallback, useEffect } from 'react';
import { type TestSectionWithChildren } from '@/types/test-section';
import { type ClipboardData } from '@/components/test-specs/section-context-menu';

interface UseSectionKeyboardShortcutsProps {
  selectedSection: TestSectionWithChildren | null;
  clipboard: ClipboardData | null;
  onCopy: (section: TestSectionWithChildren) => void;
  onCut: (section: TestSectionWithChildren) => void;
  onPaste: (targetSection: TestSectionWithChildren | null) => void;
  onDelete: (section: TestSectionWithChildren) => void;
  onRename: () => void;
  onCreate: (parentSection: TestSectionWithChildren | null) => void;
  enabled?: boolean;
}

/**
 * Check if a section is a descendant of another section
 */
function isDescendant(
  ancestorId: string,
  descendantId: string,
  section: TestSectionWithChildren
): boolean {
  if (section.id === descendantId) return true;
  for (const child of section.children) {
    if (isDescendant(ancestorId, descendantId, child)) return true;
  }
  return false;
}

/**
 * Check if pasting clipboard data to target section is valid
 */
function canPaste(
  clipboard: ClipboardData | null,
  targetSection: TestSectionWithChildren | null,
  findSection: (id: string) => TestSectionWithChildren | null
): boolean {
  if (!clipboard) return false;

  // Can always paste to root
  if (!targetSection) return true;

  // Can't paste to self
  if (clipboard.sectionId === targetSection.id) return false;

  // Can't paste to descendant (would create circular reference)
  const sourceSection = findSection(clipboard.sectionId);
  if (sourceSection && isDescendant(sourceSection.id, targetSection.id, sourceSection)) {
    return false;
  }

  return true;
}

export function useSectionKeyboardShortcuts({
  selectedSection,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onCreate,
  enabled = true,
}: UseSectionKeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if focus is on an input element
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl+C / Cmd+C - Copy
      if (ctrlOrCmd && event.key === 'c' && !event.shiftKey && !event.altKey) {
        if (selectedSection) {
          event.preventDefault();
          onCopy(selectedSection);
        }
        return;
      }

      // Ctrl+X / Cmd+X - Cut
      if (ctrlOrCmd && event.key === 'x' && !event.shiftKey && !event.altKey) {
        if (selectedSection) {
          event.preventDefault();
          onCut(selectedSection);
        }
        return;
      }

      // Ctrl+V / Cmd+V - Paste
      if (ctrlOrCmd && event.key === 'v' && !event.shiftKey && !event.altKey) {
        if (clipboard) {
          event.preventDefault();
          onPaste(selectedSection);
        }
        return;
      }

      // Delete / Backspace - Delete
      if ((event.key === 'Delete' || event.key === 'Backspace') && !ctrlOrCmd) {
        if (selectedSection) {
          event.preventDefault();
          onDelete(selectedSection);
        }
        return;
      }

      // F2 - Rename
      if (event.key === 'F2' && !ctrlOrCmd && !event.shiftKey && !event.altKey) {
        if (selectedSection) {
          event.preventDefault();
          onRename();
        }
        return;
      }

      // Ctrl+N / Cmd+N - New section
      if (ctrlOrCmd && event.key === 'n' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        onCreate(selectedSection);
        return;
      }

      // Insert - New subsection (as child of selected)
      if (event.key === 'Insert' && !ctrlOrCmd && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        onCreate(selectedSection);
        return;
      }
    },
    [enabled, selectedSection, clipboard, onCopy, onCut, onPaste, onDelete, onRename, onCreate]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    canPaste: (findSection: (id: string) => TestSectionWithChildren | null) =>
      canPaste(clipboard, selectedSection, findSection),
  };
}
