# WagerWire — P2P Subjective Betting Platform

Live: https://wagerwire-genlayer.vercel.app

P2P subjective betting on real-world outcomes. Two players stake USDC on questions like "Will this tweet hit 50k retweets?" or "Will this Kickstarter reach $100k?". A GenLayer AI jury fetches live evidence and reaches consensus to settle the bet.

## How It Works

1. **Creator** posts a wager with a question, evidence URL, metric, threshold, and opponent address
2. **Both players** fund the escrow with equal USDC stakes on Base Sepolia
3. **GenLayer AI validators** scrape the evidence source and vote on the outcome
4. **Winner** receives the pooled USDC automatically

## Contracts

| Contract | Network | Address | Explorer |
|---|---|---|---|
| WagerWireEscrow.sol | Base Sepolia | `0xB4BB6457aE3E3c13AbD0b384788b6a7bfd77436e` | [Base Sepolia](https://sepolia.basescan.org/address/0xB4BB6457aE3E3c13AbD0b384788b6a7bfd77436e) |
| WagerWire.py | GenLayer Bradbury | `0x9aFbb1C13eC434dc310420c358579e06b65B667C` | [Bradbury Explorer](https://explorer-bradbury.genlayer.com/tx/0x70b805a5b8f2aaa35f6c889cdd0d11ae8e024c7db8ef6663f175ae339dac24e3) |
| USDC (testnet) | Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | [Base Sepolia](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) |

## Architecture

- **Base Sepolia**: USDC escrow, create/fund/cancel/resolve wagers (`contracts/WagerWireEscrow.sol`)
- **GenLayer Bradbury**: AI consensus, source validation, verdict resolution (`contracts/WagerWire.py`)
- **Frontend**: React 18 + Vite + TypeScript, using `wagmi`/`viem` for the Base Sepolia escrow and `genlayer-js` for the GenLayer resolver (`frontend/`)

## Whitelisted Sources

- `twitter.com` / `x.com`
- `kickstarter.com`
- `guide.michelin.com`

## GenLayer Primitives

- `gl.nondet.web.render(url, mode="text")` — live data fetching from the evidence URL
- `gl.nondet.exec_prompt(prompt, response_format="json")` — LLM judgment of the outcome
- `gl.eq_principle.prompt_comparative()` — validator consensus over the AI verdict
- Domain whitelist stored on-chain as JSON (`get_whitelist` / `add_whitelist` / `remove_whitelist`)

## Local Development

The frontend is a Vite + React + TypeScript app in `frontend/`.

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in the deployed contract addresses
npm run dev                  # http://localhost:5173
```

Production build:

```bash
npm run build                # outputs static files to frontend/dist
npm run preview              # serve the production build locally
```

Requires a browser wallet (e.g. MetaMask) on the Base Sepolia network.

### Environment variables

Set these in `frontend/.env.local` for local dev, and in your host's dashboard for deployment:

| Variable | Value |
|---|---|
| `VITE_ESCROW_CONTRACT` | `0xB4BB6457aE3E3c13AbD0b384788b6a7bfd77436e` |
| `VITE_USDC_CONTRACT` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `VITE_BASE_RPC` | `https://sepolia.base.org` |
| `VITE_GENLAYER_CONTRACT` | `0x9aFbb1C13eC434dc310420c358579e06b65B667C` |

## Deployment

Deployed as a static Vite build. Recommended settings (Vercel):

- **Root Directory**: `frontend`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment variables**: the four `VITE_*` values above

## Networks

- **Base Sepolia RPC**: `https://sepolia.base.org`
- **Base Sepolia Chain ID**: `84532`
- **GenLayer Bradbury Explorer**: `https://explorer-bradbury.genlayer.com`

## License

MIT
