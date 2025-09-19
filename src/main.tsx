import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StandaloneLiveDisplay } from './components/StandaloneLiveDisplay';
import './index.css';

// Simple routing based on pathname
const renderApp = () => {
  const path = window.location.pathname;
  
  if (path === '/live') {
    return <StandaloneLiveDisplay />;
  }
  
  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {renderApp()}
  </StrictMode>
);
