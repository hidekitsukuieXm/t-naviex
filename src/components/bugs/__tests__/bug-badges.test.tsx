/**
 * バグバッジコンポーネントのテスト
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BugStatusBadge } from '../bug-status-badge';
import { BugPriorityBadge } from '../bug-priority-badge';
import { BugSeverityBadge } from '../bug-severity-badge';
import { BugTypeBadge } from '../bug-type-badge';
import {
  BugStatus,
  BugPriority,
  BugSeverity,
  BugType,
  BugStatusLabels,
  BugPriorityLabels,
  BugSeverityLabels,
  BugTypeLabels,
} from '@/types/bug';

describe('BugStatusBadge', () => {
  it.each(Object.entries(BugStatusLabels))('should render %s status as "%s"', (status, label) => {
    render(<BugStatusBadge status={status as BugStatus} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<BugStatusBadge status="NEW" className="custom-class" />);
    const badge = screen.getByText('新規');
    expect(badge).toHaveClass('custom-class');
  });
});

describe('BugPriorityBadge', () => {
  it.each(Object.entries(BugPriorityLabels))(
    'should render %s priority as "%s"',
    (priority, label) => {
      render(<BugPriorityBadge priority={priority as BugPriority} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  it('should apply custom className', () => {
    render(<BugPriorityBadge priority="HIGH" className="custom-class" />);
    const badge = screen.getByText('高');
    expect(badge).toHaveClass('custom-class');
  });
});

describe('BugSeverityBadge', () => {
  it.each(Object.entries(BugSeverityLabels))(
    'should render %s severity as "%s"',
    (severity, label) => {
      render(<BugSeverityBadge severity={severity as BugSeverity} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  it('should apply custom className', () => {
    render(<BugSeverityBadge severity="MAJOR" className="custom-class" />);
    const badge = screen.getByText('重大');
    expect(badge).toHaveClass('custom-class');
  });
});

describe('BugTypeBadge', () => {
  it.each(Object.entries(BugTypeLabels))('should render %s type as "%s"', (type, label) => {
    render(<BugTypeBadge type={type as BugType} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<BugTypeBadge type="BUG" className="custom-class" />);
    const badge = screen.getByText('不具合');
    expect(badge).toHaveClass('custom-class');
  });
});
