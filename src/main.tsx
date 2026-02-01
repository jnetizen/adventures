import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initRemoteLogger } from './lib/remoteLogger'

// Initialize remote logging - captures errors and key debug logs automatically
initRemoteLogger();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
