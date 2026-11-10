import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import { StoreProvider } from './app/providers/StoreProvider.jsx';
import { store } from './app/store/store.js';
import './app/styles/global.scss';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
