import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const mockLoginUser = vi.hoisted(() => vi.fn());
const mockGetProfile = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../../api/chatwoot', () => ({
  loginUser: mockLoginUser,
  getProfile: mockGetProfile,
}));

function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="user">{auth.user ? auth.user.name : 'no user'}</div>
      <div data-testid="accounts-count">{auth.accounts.length}</div>
      <div data-testid="selected-account">{auth.selectedAccount ? auth.selectedAccount.name : 'none'}</div>
      <button data-testid="login-btn" onClick={() => auth.login('test@test.com', '123456')}>Login</button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>Logout</button>
      {auth.accounts.length > 1 && (
        <button data-testid="select-account-btn" onClick={() => auth.selectAccount(auth.accounts[1])}>Select Account 2</button>
      )}
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockGetProfile.mockResolvedValue({});
});

describe('AuthContext', () => {
  it('should provide unauthenticated initial state', () => {
    renderWithProvider();

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('no user');
    expect(screen.getByTestId('selected-account').textContent).toBe('none');
  });

  it('should handle login with single account auto-selection', async () => {
    mockLoginUser.mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        available_name: 'Test',
        avatar_url: '',
        type: 'standard',
        accounts: [
          { id: 1, name: 'Main Account', status: 'active', locale: 'pt_BR' },
        ],
        pubsub_token: 'pubsub-123',
      },
      token: 'token-abc',
    });

    renderWithProvider();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    expect(screen.getByTestId('user').textContent).toBe('Test User');
    expect(screen.getByTestId('selected-account').textContent).toBe('Main Account');

    const stored = JSON.parse(localStorage.getItem('caen_crm_auth')!);
    expect(stored.token).toBe('token-abc');
  });

  it('should require account selection when multiple accounts exist', async () => {
    mockLoginUser.mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@test.com',
        name: 'Multi User',
        available_name: 'Multi',
        avatar_url: '',
        type: 'standard',
        accounts: [
          { id: 1, name: 'Account 1', status: 'active', locale: 'pt_BR' },
          { id: 2, name: 'Account 2', status: 'active', locale: 'en' },
        ],
      },
      token: 'token-xyz',
    });

    renderWithProvider();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('accounts-count').textContent).toBe('2');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('selected-account').textContent).toBe('none');

    await user.click(screen.getByTestId('select-account-btn'));

    expect(screen.getByTestId('selected-account').textContent).toBe('Account 2');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('should handle logout', async () => {
    localStorage.setItem('caen_crm_auth', JSON.stringify({ user: { id: 1, name: 'Test', email: 'test@test.com', accounts: [{ id: 1, name: 'Main', status: 'active', locale: 'pt_BR' }] }, token: 'tok' }));
    localStorage.setItem('caen_crm_account', JSON.stringify({ id: 1, name: 'Main', status: 'active', locale: 'pt_BR' }));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('logout-btn'));

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('no user');
    expect(localStorage.getItem('caen_crm_auth')).toBeNull();
    expect(localStorage.getItem('caen_crm_account')).toBeNull();
  });

  it('should throw error when useAuth is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider');

    consoleSpy.mockRestore();
  });
});
