import { useState } from 'react'
import Header from './components/Header'
import CreateWager from './components/CreateWager'
import WagerList from './components/WagerList'
import { LeftSidebar, RightSidebar } from './components/Sidebars'

function App() {
  const [tab, setTab] = useState<'lobby' | 'create'>('lobby')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <LeftSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <nav
            style={{
              display: 'flex',
              gap: 4,
              padding: '0 24px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              className={`tab ${tab === 'lobby' ? 'active' : ''}`}
              onClick={() => setTab('lobby')}
            >
              Lobby
            </button>
            <button
              type="button"
              className={`tab ${tab === 'create' ? 'active' : ''}`}
              onClick={() => setTab('create')}
            >
              Create Wager
            </button>
          </nav>
          <main style={{ flex: 1 }}>
            {tab === 'lobby' ? <WagerList /> : <CreateWager />}
          </main>
        </div>
        <RightSidebar />
      </div>
      <footer
        style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          opacity: 0.5,
          textAlign: 'center',
        }}
      >
        WagerWire — Base Sepolia escrow + GenLayer Bradbury AI consensus · Testnet only
      </footer>
    </div>
  )
}

export default App
