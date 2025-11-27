import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeOfflineHandling } from './api/offlineHandler'

// Initialize offline handling
initializeOfflineHandling()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Listen for main process messages (only in Electron)
if (window.electronAPI?.onMainProcessMessage) {
  window.electronAPI.onMainProcessMessage((message) => {
    console.log('[Electron Main Process]', message)
  })
}
