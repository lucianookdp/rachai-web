import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';
import { Home } from './Home';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  it('shows the create-group form by default', () => {
    renderHome();
    expect(screen.getByPlaceholderText('Trip to the lake house')).toBeInTheDocument();
  });

  it('switches to the join-group form when its tab is selected', async () => {
    renderHome();
    await userEvent.click(screen.getByRole('button', { name: 'Join group' }));
    expect(screen.getByPlaceholderText('ABC123')).toBeInTheDocument();
  });
});
