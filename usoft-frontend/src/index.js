import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import store from './app/store'; 

import './shared/styles/colors.css';
import ConfirmProvider from './shared/ui/ConfirmProvider';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
     </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
