import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInitialState, tap } from '@car-auction/shared';

const initial = createInitialState();
const afterTap = tap(initial);

const App = () => (
  <main>
    <h1>Car Auction Mini App</h1>
    <p>Initial coins: {initial.coins}</p>
    <p>Coins after one tap: {afterTap.coins}</p>
  </main>
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
