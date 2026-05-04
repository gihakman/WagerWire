import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { wagerWireEscrowAbi } from '../abi/WagerWireEscrow'
import { glCreateWager } from '../genlayer'

const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT as `0x${string}` | undefined

const WHITELISTED_DOMAINS = [
  'twitter.com',
  'x.com',
  'kickstarter.com',
  'guide.michelin.com',
]

export default function CreateWager() {
  const { address, isConnected } = useAccount()
  const [question, setQuestion] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [metric, setMetric] = useState('')
  const [threshold, setThreshold] = useState('')
  const [opponent, setOpponent] = useState('')
  const [amount, setAmount] = useState('5')
  const [error, setError] = useState('')
  const [glPending, setGlPending] = useState(false)
  const [glDone, setGlDone] = useState(false)

  const { writeContract: createWager, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  useEffect(() => {
    if (!isSuccess || glDone) return
    setGlPending(true)
    glCreateWager(address ?? '', question, sourceUrl, metric, threshold, opponent)
      .then(() => setGlDone(true))
      .catch((e: unknown) => setError(`Base tx confirmed, but GenLayer failed: ${(e as Error)?.message ?? e}`))
      .finally(() => setGlPending(false))
  }, [isSuccess])

  const validate = (): boolean => {
    setError('')
    if (!ESCROW_ADDRESS || ESCROW_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setError('Escrow contract not configured. Set VITE_ESCROW_CONTRACT in your .env.local')
      return false
    }
    if (!question.trim()) { setError('Question is required'); return false }
    if (!sourceUrl.trim()) { setError('Source URL is required'); return false }
    try {
      const url = new URL(sourceUrl)
      const domain = url.hostname.replace(/^www\./, '')
      if (!WHITELISTED_DOMAINS.includes(domain)) {
        setError(`Domain not whitelisted. Allowed: ${WHITELISTED_DOMAINS.join(', ')}`)
        return false
      }
    } catch {
      setError('Invalid URL format')
      return false
    }
    if (!metric.trim()) { setError('Metric is required'); return false }
    if (!threshold.trim()) { setError('Threshold is required'); return false }
    if (!/^0x[a-fA-F0-9]{40}$/.test(opponent)) { setError('Invalid opponent address'); return false }
    if (opponent.toLowerCase() === address?.toLowerCase()) { setError('Cannot bet against yourself'); return false }
    const parsedNum = parseFloat(amount)
    if (!Number.isFinite(parsedNum) || parsedNum <= 0) { setError('Amount must be a positive number'); return false }
    const decimalPart = amount.split('.')[1]
    if (decimalPart && decimalPart.length > 6) { setError('Amount cannot have more than 6 decimal places'); return false }
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setGlDone(false)
    const parsedAmount = parseUnits(amount, 6)
    createWager({
      address: ESCROW_ADDRESS!,
      abi: wagerWireEscrowAbi,
      functionName: 'createWager',
      args: [opponent as `0x${string}`, parsedAmount, question, sourceUrl],
      account: address,
    } as any)
  }

  if (!isConnected) {
    return (
      <section style={{ padding: 24 }}>
        <p>Connect your wallet to create a wager.</p>
      </section>
    )
  }

  return (
    <section style={{ padding: 24, textAlign: 'left' }}>
      <h2 style={{ marginBottom: 16 }}>Create Wager</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
        <label>
          <span>Question</span>
          <input
            type="text"
            placeholder="Will this tweet go viral?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
        </label>
        <label>
          <span>Source URL (whitelisted domain)</span>
          <input
            type="url"
            placeholder="https://twitter.com/elonmusk/status/..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            required
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            <span>Metric</span>
            <input
              type="text"
              placeholder="Retweet count"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              required
            />
          </label>
          <label>
            <span>Threshold</span>
            <input
              type="text"
              placeholder="> 10000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          <span>Opponent Address</span>
          <input
            type="text"
            placeholder="0x..."
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            required
          />
        </label>
        <label>
          <span>USDC Amount (each player)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        {(error || writeError) && (
          <div style={{ color: '#ef4444', fontSize: 14 }}>
            {error || writeError?.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" className="btn primary" disabled={isPending || isConfirming || glPending}>
            {isPending ? 'Submitting...' : isConfirming ? 'Confirming on Base...' : glPending ? 'Submitting to GenLayer...' : 'Create Wager'}
          </button>
          {isSuccess && !glPending && glDone && (
            <span style={{ color: '#22c55e', fontSize: 14 }}>✓ Wager created on both chains!</span>
          )}
          {isSuccess && glPending && (
            <span style={{ color: '#f59e0b', fontSize: 14 }}>Base confirmed — sending to GenLayer…</span>
          )}
        </div>
      </form>
    </section>
  )
}
