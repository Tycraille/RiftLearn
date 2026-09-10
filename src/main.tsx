import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import { CardsProvider } from './data/CardsContext'
import { App } from './ui/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <CardsProvider fallback={<div className="p-8 text-center text-muted">Chargement des cartes…</div>}>
        <App />
      </CardsProvider>
    </HashRouter>
  </StrictMode>,
)
