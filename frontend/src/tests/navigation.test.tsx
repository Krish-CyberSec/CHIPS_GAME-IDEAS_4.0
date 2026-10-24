import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../pages/HomePage';
import { SetupPage } from '../pages/SetupPage';

describe('landing navigation', () => {
  it('opens the mobile menu and closes it with the close control', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toBeVisible();
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(screen.getByRole('button', { name: 'Close navigation menu' }));
    expect(document.body.style.overflow).toBe('');
  });

  it('uses the same connected site destinations as the internal shell', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getAllByRole('link', { name: 'Profile' }).every((link) => link.getAttribute('href') === '/profile')).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Operator' }).every((link) => link.getAttribute('href') === '/admin')).toBe(true);
    expect(screen.getByText('Camera stays local')).toBeInTheDocument();
  });
});


describe('camera-only setup', () => {
  it('does not expose keyboard or mouse controller choices', () => {
    render(<MemoryRouter><SetupPage /></MemoryRouter>);
    expect(screen.getByText('Camera control only')).toBeInTheDocument();
    expect(screen.queryByText('Keyboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Mouse')).not.toBeInTheDocument();
  });
});
