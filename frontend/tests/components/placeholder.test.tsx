import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Logo } from '@/components/layout/Logo';

describe('Logo', () => {
  it('exposes a single accessible name for the brand lockup', () => {
    render(<Logo />);

    const link = screen.getByRole('link', { name: 'Qelvix, home' });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders the icon and wordmark as two separate assets', () => {
    const { container } = render(<Logo />);

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);
  });
});
