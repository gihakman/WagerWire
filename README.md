# WagerWire — P2P Subjective Betting Platform

Live: https://wagerwire.onrender.com

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
| WagerWire.py | GenLayer Bradbury | `0x9aFbb1C1C3eC434dc310420c358579e06b65B667C` | [Bradbury Explorer](https://explorer-bradbury.genlayer.com/tx/0x70b805a5b8f2aaa35f6c889cdd0d11ae8e024c7db8ef6663f175ae339dac24e3) |
| USDC (testnet) | Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | [Base Sepolia](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) |

## Architecture

- **Base Sepolia**: USDC escrow, create/fund/cancel/resolve wagers (`contracts/WagerWireEscrow.sol`)
- **GenLayer Bradbury**: AI consensus, source validation, verdict resolution (`contracts/WagerWire.py`)
- **Frontend**: Standalone HTML + React (Babel standalone) + ethers.js — no build step (`frontend/public/index.html`)

## Whitelisted Sources

- `twitter.com` / `x.com`
- `kickstarter.com`
- `guide.michelin.com`

## GenLayer Primitives

- `gl.nondet.web.render(url, mode="text")` — live data fetching
- `gl.eq_principle.prompt_comparative()` — qualitative AI consensus
- `gl.eq_principle.custom()` — numerical threshold validation
- Domain whitelist via `TreeMap[str, bool]`

## Local Development

The frontend is a single static HTML file. No build step required.

```bash
cd frontend/public
python -m http.server 3000
```

Or open `frontend/public/index.html` directly in a browser with MetaMask installed.

## Networks

- **Base Sepolia RPC**: `https://sepolia.base.org`
- **Base Sepolia Chain ID**: `84532`
- **GenLayer Bradbury Explorer**: `https://explorer-bradbury.genlayer.com`

## License

MIT
