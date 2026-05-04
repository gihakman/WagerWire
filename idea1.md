# WagerWire — P2P Subjective Betting Platform

## Portal Task to Submit Under
**Hackathon: GenLayer Testnet Bradbury** + **Projects & Milestones** (as it scales)

## Estimated Points
- Hackathon submission: 750–2000 pts (track winner potential)
- Projects & Milestones follow-up: 500–2000 pts as it grows

## Why It Wins (Based on Accepted Projects)
Proven (the Prediction Markets Track winner) proved P2P betting on real-world outcomes works. Callit proved two-chain architecture (GenLayer + Base) wins. **WagerWire differentiates by targeting social/creative subjective bets** — not sports/politics but "Will this tweet go viral?" "Will this Kickstarter reach its goal?" "Will this restaurant get a Michelin star next month?" These are harder to resolve objectively and require GenLayer's subjective AI consensus. No house edge, no oracle dependency.

## What It Does
Two friends stake equal USDC on a subjective real-world question. The GenLayer Intelligent Contract fetches live data (tweet metrics, Kickstarter page, Michelin guide rumors), processes it through LLM validators, and settles the bet via AI consensus. Funds live on Base Sepolia escrow; GenLayer only handles the verdict.

## GenLayer Primitives Used
- `gl.nondet.web.render(url, mode="text")` — Reader Pattern to fetch live data
- `gl.eq_principle.prompt_comparative()` — for text-based consensus (sentiment, qualitative judgments)
- `gl.eq_principle.custom()` — for numerical thresholds (e.g., follower count > X)
- Domain whitelisting via `TreeMap[str, bool]` to prevent fake URL attacks

## Contract Architecture

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class WagerWire(gl.Contract):
    # State
    wagers: DynArray[dict]
    whitelist: TreeMap[str, bool]
    owner: str

    def __init__(self):
        self.wagers = []
        self.whitelist = {
            "twitter.com": True,
            "x.com": True,
            "kickstarter.com": True,
            "guide.michelin.com": True
        }
        self.owner = gl.message.sender_address

    @gl.public.write
    def create_wager(self, question: str, source_url: str, metric: str, threshold: str, opponent: str):
        assert self.whitelist.get(source_url.split("/")[2], False), "Domain not whitelisted"
        wager = {
            "id": len(self.wagers),
            "creator": gl.message.sender_address,
            "opponent": opponent,
            "question": question,
            "source_url": source_url,
            "metric": metric,
            "threshold": threshold,
            "status": "open",
            "winner": None
        }
        self.wagers.append(wager)
        return wager["id"]

    @gl.public.write
    def resolve_wager(self, wager_id: u256):
        wager = self.wagers[wager_id]
        assert wager["status"] == "open"

        def _resolve():
            html = gl.nondet.web.render(wager["source_url"], mode="text")
            prompt = f"""
            Question: {wager["question"]}
            Source data: {html}
            Metric to check: {wager["metric"]}
            Threshold: {wager["threshold"]}

            Return ONLY a JSON object:
            {{"verdict": true or false, "confidence": "high|medium|low", "explanation": "..."}}
            """
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(result, sort_keys=True)

        consensus = json.loads(gl.eq_principle.prompt_comparative(_resolve))
        wager["status"] = "resolved"
        wager["winner"] = wager["creator"] if consensus["verdict"] else wager["opponent"]
        self.wagers[wager_id] = wager

    @gl.public.view
    def get_wager(self, wager_id: u256) -> dict:
        return self.wagers[wager_id]
```

## Frontend Concept
React + genlayer-js + wagmi (for Base Sepolia USDC escrow). XMTP chat between bettors (like Proven). Simple lobby: paste URL, write question, pick metric, invite opponent via wallet address. Once both stake USDC on Base, GenLayer resolves.

## Two-Chain Architecture
- **Base Sepolia**: USDC escrow, player deposits/withdrawals
- **GenLayer Bradbury**: Verdict resolution, source validation, consensus logging
- Bridge via LayerZero or manual oracle pattern (GenLayer contract emits event, Base contract listens)

## Build Plan
1. Week 1: Core contract (create + resolve wager) with 3 whitelisted domains
2. Week 2: Base Sepolia escrow contract in Solidity
3. Week 3: React frontend + genlayer-js integration + XMTP chat
4. Week 4: Test on Bradbury with real subjective bets between test accounts
5. Submit to Hackathon portal with live demo URL + GitHub repo

## Differentiation
- Proven = sports/politics head-to-head outcomes
- Callit = prediction markets with four-stage AI consensus
- **WagerWire = social/creative subjective bets resolved by fetching live social/Kickstarter data**
