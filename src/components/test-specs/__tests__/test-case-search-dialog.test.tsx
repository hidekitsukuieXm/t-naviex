import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestCaseSearchDialog } from '../test-case-search-dialog';

describe('TestCaseSearchDialog', () => {
  const defaultProps = {
    testSpecId: '100',
  };

  it('should render trigger button', () => {
    render(<TestCaseSearchDialog {...defaultProps} />);
    expect(screen.getByText('全文検索')).toBeTruthy();
  });

  it('should render custom trigger', () => {
    render(
      <TestCaseSearchDialog
        {...defaultProps}
        trigger={<button data-testid="custom-trigger">カスタム検索ボタン</button>}
      />
    );
    expect(screen.getByTestId('custom-trigger')).toBeTruthy();
    expect(screen.getByText('カスタム検索ボタン')).toBeTruthy();
  });
});
