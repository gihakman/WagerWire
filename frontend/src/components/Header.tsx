import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export default function Header() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/favicon.svg" width={30} height={30} alt="WagerWire logo" style={{ display: 'block' }} />
        <h1 style={{ fontSize: 24, margin: 0, color: 'var(--text-h)' }}>
          WagerWire
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text)', opacity: 0.7 }}>
          P2P Subjective Betting
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isConnected && address ? (
          <>
            <code style={{ fontSize: 13, background: 'var(--code-bg)', padding: '6px 10px', borderRadius: 6 }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </code>
            <button type="button" className="btn" onClick={() => disconnect()}>Disconnect</button>
          </>
        ) : (
          <button type="button" className="btn primary" onClick={() => connect({ connector: injected() })}>
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}
