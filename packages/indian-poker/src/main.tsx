import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { useGameStore } from './store/gameStore'
import './index.css'

if (import.meta.env.VITE_E2E === '1') {
  ;(window as any).__ipTest = {
    setStore: useGameStore.setState,
    getStore: useGameStore.getState,
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
