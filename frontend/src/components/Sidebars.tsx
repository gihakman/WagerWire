import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { wagerWireEscrowAbi } from '../abi/WagerWireEscrow'

const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT as `0x${string}` | undefined
const GENLAYER_ADDRESS = import.meta.env.VITE_GENLAYER_CONTRACT as `0x${string}` | undefined

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org'
const GL_EXPLORER = 'https://explorer-bradbury.genlayer.com'

function ExplorerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#60a5fa', fontSize: 11, wordBreak: 'break-all', textDecoration: 'none' }}
      onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
      onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
    >
      {children}
    </a>
  )
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{value}</span>
    </div>
  )
}

export function LeftSidebar() {
  return (
    <aside style={{ width: 220, flexShrink: 0, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24, borderRight: '1px solid var(--border)' }}>
      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          What is WagerWire?
        </h2>
        <p style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.85, margin: 0 }}>
          WagerWire is a peer-to-peer betting platform for subjective outcomes — questions that can't be settled by a smart contract alone.
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.85, margin: '10px 0 0' }}>
          Instead of a trusted oracle, disputes are resolved by <strong style={{ color: 'var(--text-h)' }}>GenLayer AI validators</strong> — a network of independent nodes that each fetch the source URL, run the same AI judgment, and reach consensus before declaring a winner.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          How it works
        </h2>
        <ol style={{ fontSize: 12, lineHeight: 1.9, opacity: 0.85, margin: 0, paddingLeft: 16 }}>
          <li>Creator proposes a bet with a question and a public source URL</li>
          <li>Opponent accepts</li>
          <li>Both players lock USDC in the Base Sepolia escrow</li>
          <li>Either player triggers AI resolution on GenLayer</li>
          <li>Validators fetch live data, reach consensus, winner collects the pot</li>
        </ol>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Allowed sources
        </h2>
        {['twitter.com / x.com', 'kickstarter.com', 'guide.michelin.com'].map(d => (
          <div key={d} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', opacity: 0.85 }}>
            {d}
          </div>
        ))}
        <p style={{ fontSize: 11, opacity: 0.55, marginTop: 8 }}>
          Only whitelisted domains are accepted as evidence sources.
        </p>
      </section>
    </aside>
  )
}

export function RightSidebar() {
  const { data: wagerCount } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: wagerWireEscrowAbi,
    functionName: 'getWagerCount',
    query: { enabled: !!ESCROW_ADDRESS },
  })

  const { data: totalLocked } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: wagerWireEscrowAbi,
    functionName: 'totalLocked',
    query: { enabled: !!ESCROW_ADDRESS },
  })

  const { data: owner } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: wagerWireEscrowAbi,
    functionName: 'owner',
    query: { enabled: !!ESCROW_ADDRESS },
  })

  const { data: resolver } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: wagerWireEscrowAbi,
    functionName: 'genlayerResolver',
    query: { enabled: !!ESCROW_ADDRESS },
  })

  return (
    <aside style={{ width: 220, flexShrink: 0, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24, borderLeft: '1px solid var(--border)' }}>
      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Live Stats
        </h2>
        <StatRow
          label="Total Wagers"
          value={wagerCount !== undefined ? Number(wagerCount).toString() : '…'}
        />
        <StatRow
          label="USDC in Escrow"
          value={totalLocked !== undefined ? `${formatUnits(totalLocked as bigint, 6)} USDC` : '…'}
        />
        <StatRow
          label="Network"
          value={<span style={{ color: '#22c55e' }}>Base Sepolia</span>}
        />
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Contracts
        </h2>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Escrow — Base Sepolia</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#22c55e' }}>Verified & live</span>
          </div>
          <code style={{ fontSize: 10, wordBreak: 'break-all', opacity: 0.8, display: 'block', marginBottom: 4 }}>
            {ESCROW_ADDRESS}
          </code>
          <ExplorerLink href={`${BASE_SEPOLIA_EXPLORER}/address/${ESCROW_ADDRESS}`}>
            View on Basescan ↗
          </ExplorerLink>
        </div>

        <div>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>AI Resolver — GenLayer Bradbury</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#22c55e' }}>Verified & live — Bradbury</span>
          </div>
          <code style={{ fontSize: 10, wordBreak: 'break-all', opacity: 0.8, display: 'block', marginBottom: 4 }}>
            {GENLAYER_ADDRESS}
          </code>
          {GENLAYER_ADDRESS && (
            <ExplorerLink href={`${GL_EXPLORER}/tx/0x70b805a5b8f2aaa35f6c889cdd0d11ae8e024c7db8ef6663f175ae339dac24e3`}>
              View Deploy Tx on Bradbury ↗
            </ExplorerLink>
          )}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          On-chain Roles
        </h2>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 3 }}>Owner</div>
          <code style={{ fontSize: 10, wordBreak: 'break-all', opacity: 0.85, display: 'block', marginBottom: 3 }}>
            {owner ? `${String(owner).slice(0,6)}…${String(owner).slice(-4)}` : '…'}
          </code>
          {owner && (
            <ExplorerLink href={`${BASE_SEPOLIA_EXPLORER}/address/${String(owner)}`}>Basescan ↗</ExplorerLink>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 3 }}>GenLayer Resolver</div>
          <code style={{ fontSize: 10, wordBreak: 'break-all', opacity: 0.85, display: 'block', marginBottom: 3 }}>
            {resolver ? `${String(resolver).slice(0,6)}…${String(resolver).slice(-4)}` : '…'}
          </code>
          {resolver && (
            <ExplorerLink href={`${BASE_SEPOLIA_EXPLORER}/address/${String(resolver)}`}>Basescan ↗</ExplorerLink>
          )}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Project Stats
        </h2>
        {[
          ['Total contracts', '2 (Escrow + AI)'],
          ['Networks', 'Base Sepolia + GenLayer'],
          ['Consensus model', 'eq_principle prompt comparative'],
          ['Resolution AI', 'Live web scrape + LLM judge'],
          ['Whitelisted sources', '6 domains (X, Kickstarter, Michelin)'],
          ['Max question chars', '2,000'],
          ['Escrow currency', 'USDC testnet'],
          ['Frontend stack', 'React 18 + Vite + wagmi/viem'],
        ].map(([k, v]) => (
          <StatRow key={k} label={k} value={v} />
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          What makes WagerWire unique
        </h2>
        <ul style={{ fontSize: 12, lineHeight: 1.8, opacity: 0.85, margin: 0, paddingLeft: 16 }}>
          <li><strong>Subjective bets:</strong> Not price oracles — real-world questions like "Will this Kickstarter hit $500k?"</li>
          <li><strong>AI jury:</strong> GenLayer validators independently fetch the source page, analyze it with LLM, and reach consensus</li>
          <li><strong>Trustless escrow:</strong> USDC locked on Base Sepolia; AI result unlocks the pot</li>
          <li><strong>Transparent:</strong> Every resolution prompt, source HTML, and consensus step is on-chain verifiable</li>
          <li><strong>No house edge:</strong> P2P only — the contract takes zero fees</li>
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Smart Contract Details
        </h2>
        <div style={{ fontSize: 11, lineHeight: 1.7, opacity: 0.75 }}>
          <strong>Escrow (Solidity)</strong>
          <ul style={{ margin: '4px 0 10px', paddingLeft: 14 }}>
            <li>fundWager / cancelWager / resolveAndPay</li>
            <li>USDC allowance → escrow lock</li>
            <li>Only GenLayer resolver can release</li>
          </ul>
          <strong>Resolver (GenLayer Python)</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 14 }}>
            <li>create_wager / accept_wager / resolve_wager</li>
            <li>Web render + LLM prompt + eq_principle consensus</li>
            <li>Domain whitelist enforced on-chain</li>
          </ul>
        </div>
      </section>
    </aside>
  )
}
