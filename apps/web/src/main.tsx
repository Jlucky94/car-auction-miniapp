import React from 'react';
import { createRoot } from 'react-dom/client';
import { applyClick, createInitialState } from '@car-auction/shared';

const initial = createInitialState();
const afterClick = applyClick(initial);

const App = () => (
  <main>
    <h1>Car Auction Mini App</h1>
    <p>Initial balance: {initial.balance}</p>
    <p>Balance after one click: {afterClick.balance}</p>
  </main>
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
