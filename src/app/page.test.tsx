import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from './page';

describe('Home Page', () => {
  it('renders the Next.js logo', () => {
    render(<Page />);
    const logo = screen.getByAltText('Next.js logo');
    expect(logo).toBeDefined();
  });

  it('renders deploy link', () => {
    render(<Page />);
    const deployLink = screen.getByRole('link', { name: /deploy now/i });
    expect(deployLink).toBeDefined();
  });
});
