import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.tsx';
import './index.css';

const path = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {path === '/privacidad' ? (
      <PrivacyPolicyPage />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </React.StrictMode>,
);
