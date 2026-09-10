import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import { CardsProvider } from './data/CardsContext'
import { I18nProvider } from './i18n/I18nContext'
import { App, LoadingCards } from './ui/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <I18nProvider>
        <CardsProvider fallback={<LoadingCards />}>
          <App />
        </CardsProvider>
      </I18nProvider>
    </HashRouter>
  </StrictMode>,
)
