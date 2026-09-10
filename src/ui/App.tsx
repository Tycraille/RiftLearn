import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Decks } from './pages/Decks'
import { Study } from './pages/Study'
import { CardsBrowser } from './pages/CardsBrowser'
import { CardDetail } from './pages/CardDetail'
import { SettingsPage } from './pages/SettingsPage'

const NAV: { to: string; label: string; icon: string }[] = [
  { to: '/', label: 'Accueil', icon: '⌂' },
  { to: '/decks', label: 'Paquets', icon: '▤' },
  { to: '/cards', label: 'Cartes', icon: '⌕' },
  { to: '/settings', label: 'Réglages', icon: '⚙' },
]

export function App() {
  const { pathname } = useLocation()
  const inStudy = pathname.startsWith('/study')
  return (
    <div className="min-h-dvh md:flex">
      {!inStudy && (
        <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-line md:bg-panel">
          <div className="px-5 py-5 text-lg font-bold tracking-tight">
            <span className="text-accent">Rift</span>Learn
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 ${isActive ? 'bg-panel-2 text-ink' : 'text-muted hover:bg-panel-2 hover:text-ink'}`
                }
              >
                <span className="mr-2">{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}
      <main className={`flex-1 ${inStudy ? '' : 'pb-20 md:pb-8'}`}>
        <div className={inStudy ? '' : 'mx-auto max-w-5xl px-4 py-4 md:px-8 md:py-8'}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/decks" element={<Decks />} />
            <Route path="/study/:deckId" element={<Study />} />
            <Route path="/cards" element={<CardsBrowser />} />
            <Route path="/cards/:cardId" element={<CardDetail />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
      {!inStudy && (
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-panel/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `flex flex-1 flex-col items-center py-2 text-xs ${isActive ? 'text-accent' : 'text-muted'}`}
            >
              <span className="text-xl leading-none">{n.icon}</span>
              <span className="mt-1">{n.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
