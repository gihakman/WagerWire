import { useState, useMemo, useEffect } from 'react'
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { formatUnits } from 'viem'
import { wagerWireEscrowAbi } from '../abi/WagerWireEscrow'
import { glAcceptWager, glResolveWager, glGetWager } from '../genlayer'

const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT as `0x${string}` | undefined
const USDC_ADDRESS = import.meta.env.VITE_USDC_CONTRACT as `0x${string}` | undefined

const STATUS_LABELS = ['Pending', 'Funded', 'Resolved', 'Cancelled', 'Disputed']
const STATUS_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6']

const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

type WagerData = {
  id: bigint
  creator: `0x${string}`
  opponent: `0x${string}`
  amount: bigint
  status: number
  winner: `0x${string}`
  genlayerTxHash: `0x${string}`
  createdAt: bigint
  resolvedAt: bigint
}

function WagerCard({
  wager,
  connectedAddress,
  hasFunded,
}: {
  wager: WagerData
  connectedAddress?: `0x${string}`
  hasFunded: boolean
}) {
  const [actionError, setActionError] = useState('')
  const [glPending, setGlPending] = useState(false)
  const [glSuccess, setGlSuccess] = useState('')
  const [glMeta, setGlMeta] = useState<Record<string, any> | null>(null)
  const [glMetaLoading, setGlMetaLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setGlMetaLoading(true)
    glGetWager(Number(wager.id))
      .then((m) => { if (!cancelled) setGlMeta(m) })
      .catch(() => { if (!cancelled) setGlMeta(null) })
      .finally(() => { if (!cancelled) setGlMetaLoading(false) })
    return () => { cancelled = true }
  }, [wager.id])

  const isCreator = connectedAddress && wager.creator.toLowerCase() === connectedAddress.toLowerCase()
  const isOpponent = connectedAddress && wager.opponent.toLowerCase() === connectedAddress.toLowerCase()
  const isParticipant = isCreator || isOpponent

  const status = wager.status as number
  const canFund = isParticipant && status === 0 && !hasFunded
  const canResolve = isParticipant && status === 1

  const { writeContract: approveTx, data: approveHash, isPending: approvePending } = useWriteContract()
  const { writeContract: fundTx, data: fundHash, isPending: fundPending } = useWriteContract()
  const { writeContract: cancelTx, data: cancelHash, isPending: cancelPending } = useWriteContract()

  const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
    query: { enabled: !!approveHash },
  })
  const { isLoading: cancelConfirming, isSuccess: cancelSuccess } = useWaitForTransactionReceipt({
    hash: cancelHash,
    query: { enabled: !!cancelHash },
  })
  const { isLoading: fundConfirming, isSuccess: fundSuccess } = useWaitForTransactionReceipt({
    hash: fundHash,
    query: { enabled: !!fundHash },
  })

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [connectedAddress as `0x${string}`, ESCROW_ADDRESS as `0x${string}`],
    query: { enabled: !!USDC_ADDRESS && !!connectedAddress && !!ESCROW_ADDRESS && canFund },
  })

  const needsApproval = !approveSuccess && (!allowance || (allowance as bigint) < wager.amount)

  const handleApprove = () => {
    setActionError('')
    approveTx({
      address: USDC_ADDRESS!,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [ESCROW_ADDRESS as `0x${string}`, wager.amount],
      account: connectedAddress,
    } as any)
  }

  const handleFund = () => {
    setActionError('')
    fundTx({
      address: ESCROW_ADDRESS!,
      abi: wagerWireEscrowAbi,
      functionName: 'fundWager',
      args: [wager.id],
      account: connectedAddress,
    } as any)
  }

  const handleCancel = () => {
    setActionError('')
    cancelTx({
      address: ESCROW_ADDRESS!,
      abi: wagerWireEscrowAbi,
      functionName: 'cancelWager',
      args: [wager.id],
      account: connectedAddress,
    } as any)
  }

  const handleAccept = async () => {
    setActionError('')
    setGlPending(true)
    try {
      await glAcceptWager(connectedAddress ?? '', Number(wager.id))
      setGlSuccess('Accepted on GenLayer!')
    } catch (e: unknown) {
      setActionError((e as Error)?.message ?? 'GenLayer accept failed')
    } finally {
      setGlPending(false)
    }
  }

  const handleResolve = async () => {
    setActionError('')
    setGlPending(true)
    try {
      await glResolveWager(connectedAddress ?? '', Number(wager.id))
      setGlSuccess('Resolution submitted to GenLayer AI — check back shortly.')
    } catch (e: unknown) {
      setActionError((e as Error)?.message ?? 'GenLayer resolve failed')
    } finally {
      setGlPending(false)
    }
  }

  const statusLabel = STATUS_LABELS[status] ?? 'Unknown'
  const statusColor = STATUS_COLORS[status] ?? '#6b7280'
  const hasWinner = wager.winner !== '0x0000000000000000000000000000000000000000'

  return (
    <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--code-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>Wager #{Number(wager.id)}</span>
        <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, background: statusColor + '22', color: statusColor, fontWeight: 600 }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 4, marginBottom: 10 }}>
        <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong>Stake:</strong> {formatUnits(wager.amount, 6)} USDC each
          <span style={{ fontSize: 11, background: '#1d4ed822', color: '#60a5fa', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Testnet — no real value</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Creator: <code>{wager.creator.slice(0, 6)}…{wager.creator.slice(-4)}</code>
          {isCreator && <span style={{ color: '#3b82f6', marginLeft: 6, fontWeight: 600 }}>you</span>}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Opponent: <code>{wager.opponent.slice(0, 6)}…{wager.opponent.slice(-4)}</code>
          {isOpponent && <span style={{ color: '#3b82f6', marginLeft: 6, fontWeight: 600 }}>you</span>}
        </div>
        {hasWinner && (
          <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, marginTop: 4 }}>
            Winner: {wager.winner.slice(0, 6)}…{wager.winner.slice(-4)}
          </div>
        )}

        {glMetaLoading && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>Loading GenLayer details…</div>}

        {glMeta && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>Question:</strong> {glMeta.question}
            </div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>Source:</strong>{' '}
              <a href={glMeta.source_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 11 }}>
                {glMeta.source_url.slice(0, 40)}{glMeta.source_url.length > 40 ? '…' : ''}
              </a>
            </div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>Metric:</strong> {glMeta.metric}
            </div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>Threshold:</strong> {glMeta.threshold}
            </div>
            <div style={{ fontSize: 12 }}>
              <strong>GenLayer status:</strong>{' '}
              <span style={{
                fontWeight: 600,
                color: glMeta.status === 'resolved' ? '#22c55e' : glMeta.status === 'accepted' ? '#3b82f6' : '#f59e0b',
              }}>
                {glMeta.status}
              </span>
              {glMeta.status === 'resolved' && glMeta.winner && (
                <span style={{ marginLeft: 8, color: '#22c55e' }}>
                  Winner: {glMeta.winner.slice(0, 6)}…{glMeta.winner.slice(-4)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {hasFunded && status === 0 && (
        <p style={{ fontSize: 12, color: '#22c55e', marginBottom: 8 }}>✓ You have funded — waiting for opponent</p>
      )}

      {actionError && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 8 }}>{actionError}</p>}
      {glSuccess && <p style={{ fontSize: 13, color: '#22c55e', marginBottom: 8 }}>{glSuccess}</p>}
      {fundSuccess && <p style={{ fontSize: 13, color: '#22c55e', marginBottom: 8 }}>✓ Funded!</p>}
      {cancelSuccess && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Wager cancelled.</p>}

      {isParticipant && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {isOpponent && status === 0 && !glSuccess && (
            <button className="btn" onClick={handleAccept} disabled={glPending}>
              {glPending ? 'Accepting…' : 'Accept on GenLayer'}
            </button>
          )}
          {canFund && !fundSuccess && (
            needsApproval ? (
              <button className="btn primary" onClick={handleApprove} disabled={approvePending || approveConfirming}>
                {approvePending || approveConfirming ? 'Approving…' : 'Approve USDC'}
              </button>
            ) : (
              <button className="btn primary" onClick={handleFund} disabled={fundPending || fundConfirming}>
                {fundPending || fundConfirming ? 'Funding…' : `Fund ${formatUnits(wager.amount, 6)} USDC`}
              </button>
            )
          )}
          {canResolve && !glSuccess && (
            <button className="btn" onClick={handleResolve} disabled={glPending}>
              {glPending ? 'Resolving…' : 'Resolve via AI'}
            </button>
          )}
          {isCreator && (status === 0 || status === 1) && !cancelSuccess && (
            <button
              className="btn"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
              onClick={handleCancel}
              disabled={cancelPending || cancelConfirming}
            >
              {cancelPending || cancelConfirming ? 'Cancelling…' : 'Cancel Wager'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const DEMO_WAGERS = [
  {
    id: 0,
    question: 'Will Elon\'s Mars tweet hit 50k retweets in 24h?',
    sourceUrl: 'https://x.com/elonmusk/status/1903847562910',
    metric: 'Retweet count',
    threshold: '> 50,000',
    amount: 10,
    creator: '0xA1B2...C3D4',
    opponent: '0xE5F6...G7H8',
    status: 'open',
  },
  {
    id: 1,
    question: 'Will this board game Kickstarter reach $100k pledged?',
    sourceUrl: 'https://www.kickstarter.com/projects/tacticalgames/neon-chess-2077',
    metric: 'Total pledged USD',
    threshold: '>= $100,000',
    amount: 25,
    creator: '0xB2C3...D4E5',
    opponent: '0xF6G7...H8I9',
    status: 'accepted',
  },
  {
    id: 2,
    question: 'Will this new NYC omakase get a Michelin star in 2024?',
    sourceUrl: 'https://guide.michelin.com/us/en/new-york/restaurant/sushi-tanaka',
    metric: 'Michelin star count',
    threshold: '>= 1 star',
    amount: 50,
    creator: '0xC3D4...E5F6',
    opponent: '0xG7H8...I9J0',
    status: 'accepted',
  },
  {
    id: 3,
    question: 'Will Bitcoin hit $100k before month-end per this thread?',
    sourceUrl: 'https://x.com/cryptoalpha/status/1909876543210',
    metric: 'BTC price at close',
    threshold: '>= $100,000',
    amount: 100,
    creator: '0xD4E5...F6G7',
    opponent: '0xH8I9...J0K1',
    status: 'resolved',
    winner: '0xD4E5...F6G7',
  },
  {
    id: 4,
    question: 'Will this indie film ship physical rewards by June 1?',
    sourceUrl: 'https://www.kickstarter.com/projects/indiefilm/midnight-in-tokyo',
    metric: 'Shipping status',
    threshold: 'Delivered by June 1, 2024',
    amount: 15,
    creator: '0xE5F6...G7H8',
    opponent: '0xI9J0...K1L2',
    status: 'open',
  },
  {
    id: 5,
    question: 'Will Chicago Steakhouse keep its 3-star Michelin rating?',
    sourceUrl: 'https://guide.michelin.com/us/en/chicago/restaurant/chicago-steakhouse',
    metric: 'Michelin star rating',
    threshold: '3 stars maintained',
    amount: 75,
    creator: '0xF6G7...H8I9',
    opponent: '0xJ0K1...L2M3',
    status: 'accepted',
  },
  {
    id: 6,
    question: 'Will SpaceX Starship livestream break 2M concurrent viewers?',
    sourceUrl: 'https://x.com/SpaceX/status/1901122334455',
    metric: 'Concurrent view count',
    threshold: '> 2,000,000',
    amount: 20,
    creator: '0xG7H8...I9J0',
    opponent: '0xK1L2...M3N4',
    status: 'open',
  },
]

function DemoWagerCard({ wager }: { wager: typeof DEMO_WAGERS[0] }) {
  const statusColor = wager.status === 'resolved' ? '#22c55e' : wager.status === 'accepted' ? '#3b82f6' : '#f59e0b'
  return (
    <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--code-bg)', opacity: 0.92 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>Wager #{wager.id}</span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#8b5cf622', color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase' }}>Example</span>
        </div>
        <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, background: statusColor + '22', color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>
          {wager.status}
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-h)' }}>{wager.question}</div>

      <div style={{ display: 'grid', gap: 4, marginBottom: 10, fontSize: 12 }}>
        <div><strong>Source:</strong>{' '}
          <a href={wager.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 11 }}>
            {wager.sourceUrl.slice(0, 45)}{wager.sourceUrl.length > 45 ? '…' : ''}
          </a>
        </div>
        <div><strong>Metric:</strong> {wager.metric}</div>
        <div><strong>Threshold:</strong> {wager.threshold}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <strong>Stake:</strong> {wager.amount} USDC each
          <span style={{ fontSize: 11, background: '#1d4ed822', color: '#60a5fa', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Testnet — no real value</span>
        </div>
        <div style={{ opacity: 0.7 }}>
          Creator: <code>{wager.creator}</code> · Opponent: <code>{wager.opponent}</code>
        </div>
        {wager.status === 'resolved' && wager.winner && (
          <div style={{ color: '#22c55e', fontWeight: 600 }}>Winner: {wager.winner}</div>
        )}
      </div>
    </div>
  )
}

export default function WagerList() {
  const { address } = useAccount()

  const { data: count, isLoading: countLoading } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: wagerWireEscrowAbi,
    functionName: 'getWagerCount',
    query: { enabled: !!ESCROW_ADDRESS },
  })

  const wagerCount = Number(count ?? 0)
  const wagerIds = useMemo(() => Array.from({ length: wagerCount }, (_, i) => i), [wagerCount])

  const { data: wagerResults, isLoading: wagersLoading } = useReadContracts({
    contracts: wagerIds.map((id) => ({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: wagerWireEscrowAbi,
      functionName: 'getWager' as const,
      args: [BigInt(id)] as [bigint],
    })),
    query: { enabled: !!ESCROW_ADDRESS && wagerCount > 0 },
  })

  const { data: fundedResults } = useReadContracts({
    contracts: wagerIds.map((id) => ({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: wagerWireEscrowAbi,
      functionName: 'hasFunded' as const,
      args: [BigInt(id), address as `0x${string}`] as [bigint, `0x${string}`],
    })),
    query: { enabled: !!ESCROW_ADDRESS && !!address && wagerCount > 0 },
  })

  if (!ESCROW_ADDRESS || ESCROW_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return (
      <section style={{ padding: 24 }}>
        <p style={{ color: '#ef4444', fontSize: 14 }}>
          Escrow contract not configured — set <code>VITE_ESCROW_CONTRACT</code> in your <code>.env.local</code>.
        </p>
      </section>
    )
  }

  if (countLoading || wagersLoading) {
    return (
      <section style={{ padding: 24 }}>
        <p style={{ opacity: 0.7 }}>Loading wagers…</p>
      </section>
    )
  }

  const wagers = (wagerResults ?? [])
    .map((r, i) => (r.status === 'success' ? { ...r.result as WagerData, _index: i } : null))
    .filter((w): w is WagerData & { _index: number } => w !== null)

  return (
    <section style={{ padding: 24, textAlign: 'left' }}>
      {wagerCount > 0 && (
        <>
          <h2 style={{ marginBottom: 16 }}>Active Wagers ({wagerCount})</h2>
          <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
            {wagers.map((wager) => (
              <WagerCard
                key={Number(wager.id)}
                wager={wager}
                connectedAddress={address}
                hasFunded={
                  fundedResults?.[wager._index]?.status === 'success'
                    ? (fundedResults[wager._index].result as boolean)
                    : false
                }
              />
            ))}
          </div>
        </>
      )}

      {wagerCount === 0 && !countLoading && (
        <p style={{ opacity: 0.7, marginBottom: 16 }}>No live wagers yet. Be the first to create one, or see examples below.</p>
      )}

      <h2 style={{ marginBottom: 16 }}>Example Wagers</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {DEMO_WAGERS.map((wager) => (
          <DemoWagerCard key={wager.id} wager={wager} />
        ))}
      </div>
    </section>
  )
}
