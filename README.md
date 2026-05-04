# WagerWire — P2P Subjective Betting Platform

**Hackathon: GenLayer Testnet Bradbury**

Two-chain architecture resolving social/creative subjective bets via GenLayer AI consensus.

## What It Does

Two friends stake equal USDC on a subjective real-world question:
- *"Will this tweet go viral?"*
- *"Will this Kickstarter reach its goal?"*
- *"Will this restaurant get a Michelin star next month?"*

The GenLayer Intelligent Contract fetches live data, processes it through LLM validators, and settles the bet via AI consensus. Funds live on Base Sepolia escrow; GenLayer only handles the verdict.

## Architecture

- **Base Sepolia**: USDC escrow, player deposits/withdrawals (`contracts/WagerWireEscrow.sol`)
- **GenLayer Bradbury**: Verdict resolution, source validation, consensus logging (`contracts/WagerWire.py`)
- **Frontend**: React + Vite + TypeScript + genlayer-js + wagmi/viem (`frontend/`)

## GenLayer Primitives Used

- `gl.nondet.web.render(url, mode="text")` — Reader Pattern to fetch live data
- `gl.eq_principle.prompt_comparative()` — Text-based AI consensus (sentiment, qualitative judgments)
- `gl.eq_principle.custom()` — Numerical thresholds (e.g., follower count > X)
- Domain whitelisting via `TreeMap[str, bool]` to prevent fake URL attacks

## Quick Start

### 1. Setup Python Environment (GenLayer Contract)

```bash
python -m venv venv
venv\Scripts\pip install --upgrade pip
venv\Scripts\pip install genlayer-py
```

### 2. Setup Frontend

```bash
cd frontend
cp ..\.env.example .env.local
# Edit .env.local with your deployed contract addresses
npm install
npm run dev
```

### 3. Deploy Contracts

- Deploy `WagerWireEscrow.sol` to Base Sepolia with your USDC token address
- Deploy `WagerWire.py` to GenLayer Bradbury via GenLayer Studio or CLI
- Update `.env.local` with deployed addresses

## Testnet Details

- **RPC**: `zksync-os-testnet-genlayer.zksync.dev`
- **Chain ID**: `4221`
- **Symbol**: `GEN`
- **Faucet**: https://testnet-faucet.genlayer.foundation/
- **Explorer**: https://zksync-os-testnet-genlayer.explorer.zksync.dev/

## Build Plan (Completed)

1. ✅ Core GenLayer contract (create + resolve wager) with whitelisted domains
2. ✅ Base Sepolia escrow contract in Solidity
3. ✅ React frontend + genlayer-js integration + wagmi wallet connect
4. 🔄 Test on Bradbury with real subjective bets between test accounts
5. 🔄 Submit to Hackathon portal with live demo URL + GitHub repo

## Differentiation

- **Proven** = sports/politics head-to-head outcomes
- **Callit** = prediction markets with four-stage AI consensus
- **WagerWire** = social/creative subjective bets resolved by fetching live social/Kickstarter data

## License

MIT
