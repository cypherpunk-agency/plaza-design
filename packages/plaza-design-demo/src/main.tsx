import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'plaza-design-core/plaza.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
