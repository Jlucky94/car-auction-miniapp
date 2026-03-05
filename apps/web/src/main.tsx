import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

type User = {
  id: string;
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  photoUrl: string | null;
};

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; accessToken: string; user: User }
  | { status: 'error'; message: string };

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  }
}

const DEV_INIT_DATA = import.meta.env.VITE_DEV_TELEGRAM_INIT_DATA as string | undefined;

async function authenticate(initData: string) {
  const response = await fetch('/api/v1/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });

  if (!response.ok) {
    throw new Error('Unable to authenticate with Telegram');
  }

  return (await response.json()) as { accessToken: string; user: User };
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [balance, setBalance] = useState<number | null>(null);

  const accessToken = authState.status === 'authenticated' ? authState.accessToken : null;

  const apiFetch = useCallback(
    async (input: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      return fetch(input, {
        ...init,
        headers
      });
    },
    [accessToken]
  );

  const runAuth = useCallback(async () => {
    setAuthState({ status: 'loading' });

    const initData = window.Telegram?.WebApp?.initData || (import.meta.env.DEV ? DEV_INIT_DATA : undefined);

    if (!initData) {
      setAuthState({
        status: 'error',
        message:
          'Telegram initData is missing. Open inside Telegram or set VITE_DEV_TELEGRAM_INIT_DATA for local development.'
      });
      return;
    }

    try {
      const auth = await authenticate(initData);

      const meResponse = await fetch('/api/v1/me', {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`
        }
      });

      if (!meResponse.ok) {
        throw new Error('Authenticated token failed smoke check');
      }

      setAuthState({ status: 'authenticated', ...auth });
    } catch (error) {
      setAuthState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  }, []);

  const loadBalance = useCallback(async () => {
    if (authState.status !== 'authenticated') {
      return;
    }

    const response = await apiFetch(`/api/v1/balance?userId=${authState.user.id}`);
    const data = (await response.json()) as { balance: number };
    setBalance(data.balance);
  }, [apiFetch, authState]);

  useEffect(() => {
    void runAuth();
  }, [runAuth]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const readyContent = useMemo(() => {
    if (authState.status !== 'authenticated') {
      return null;
    }

    return (
      <>
        <p>
          Signed in as {authState.user.firstName}
          {authState.user.username ? ` (@${authState.user.username})` : ''}
        </p>
        <p>Balance: {balance ?? 'Loading...'}</p>
        <button
          type="button"
          onClick={async () => {
            await apiFetch('/api/v1/click', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: authState.user.id })
            });

            await loadBalance();
          }}
        >
          Click
        </button>
      </>
    );
  }, [apiFetch, authState, balance, loadBalance]);

  return (
    <main>
      <h1>Car Auction Mini App</h1>
      {authState.status === 'loading' && <p>Authenticating with Telegram...</p>}
      {authState.status === 'error' && (
        <>
          <p>{authState.message}</p>
          <button type="button" onClick={() => void runAuth()}>
            Retry
          </button>
        </>
      )}
      {readyContent}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
