import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const USER_ID = 'dev-user';

const App = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBalance = async () => {
      const response = await fetch(`/api/v1/balance?userId=${USER_ID}`);
      const data = (await response.json()) as { balance: number };
      setBalance(data.balance);
      setIsLoading(false);
    };

    void loadBalance();
  }, []);

  const onClick = async () => {
    const response = await fetch('/api/v1/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: USER_ID })
    });

    const data = (await response.json()) as { balance: number };
    setBalance(data.balance);
  };

  return (
    <main>
      <h1>Car Auction Mini App</h1>
      <p>Balance: {isLoading ? 'Loading...' : balance}</p>
      <button type="button" onClick={onClick} disabled={isLoading}>
        Click
      </button>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
