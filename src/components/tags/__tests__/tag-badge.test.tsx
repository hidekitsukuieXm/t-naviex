import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagBadge } from '../tag-badge';

describe('TagBadge', () => {
  describe('Rendering', () => {
    it('should render tag name', () => {
      render(<TagBadge name="Bug" color="#ef4444" />);
      expect(screen.getByText('Bug')).toBeDefined();
    });

    it('should apply background color', () => {
      const { container } = render(<TagBadge name="Bug" color="#ef4444" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveProperty('style.backgroundColor', 'rgb(239, 68, 68)');
    });

    it('should use dark text on light background', () => {
      const { container } = render(<TagBadge name="Light" color="#ffffff" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveProperty('style.color', 'rgb(0, 0, 0)');
    });

    it('should use light text on dark background', () => {
      const { container } = render(<TagBadge name="Dark" color="#000000" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveProperty('style.color', 'rgb(255, 255, 255)');
    });

    it('should not render remove button without onRemove', () => {
      render(<TagBadge name="Bug" color="#ef4444" />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('should render remove button with onRemove', () => {
      render(<TagBadge name="Bug" color="#ef4444" onRemove={() => {}} />);
      expect(screen.getByRole('button')).toBeDefined();
    });
  });

  describe('Interactions', () => {
    it('should call onRemove when remove button is clicked', () => {
      const onRemove = vi.fn();
      render(<TagBadge name="Bug" color="#ef4444" onRemove={onRemove} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onRemove).toHaveBeenCalledOnce();
    });

    it('should stop event propagation when remove button is clicked', () => {
      const onRemove = vi.fn();
      const onParentClick = vi.fn();

      render(
        <div onClick={onParentClick}>
          <TagBadge name="Bug" color="#ef4444" onRemove={onRemove} />
        </div>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onRemove).toHaveBeenCalledOnce();
      expect(onParentClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label on remove button', () => {
      render(<TagBadge name="Bug" color="#ef4444" onRemove={() => {}} />);
      expect(screen.getByLabelText('Bugを削除')).toBeDefined();
    });
  });
});
