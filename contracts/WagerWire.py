# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }
from genlayer import *
import json


class WagerWire(gl.Contract):
    """
    P2P Subjective Betting Platform - GenLayer Intelligent Contract
    Resolves subjective wagers by fetching live data and applying AI consensus.
    """

    wagers_json: str
    whitelist_json: str
    owner: str

    def __init__(self):
        self.owner = str(gl.message.sender_address)
        self.wagers_json = "[]"
        self.whitelist_json = json.dumps({
            "twitter.com": True,
            "x.com": True,
            "kickstarter.com": True,
            "guide.michelin.com": True,
            "www.kickstarter.com": True,
            "www.guide.michelin.com": True
        })

    def _get_wagers(self):
        return json.loads(self.wagers_json)

    def _set_wagers(self, wagers):
        self.wagers_json = json.dumps(wagers)

    def _get_whitelist(self):
        return json.loads(self.whitelist_json)

    def _set_whitelist(self, wl):
        self.whitelist_json = json.dumps(wl)

    def _extract_domain(self, url):
        """Extract domain from URL for whitelist validation."""
        url = url.strip()
        if url.startswith("http://"):
            url = url[len("http://"):]
        elif url.startswith("https://"):
            url = url[len("https://"):]
        url = url.split("/")[0]
        url = url.split("?")[0]
        url = url.split("#")[0]
        url = url.split(":")[0]
        url = url.split("@")[-1]
        return url

    @gl.public.write
    def create_wager(self, question, source_url, metric, threshold, opponent):
        """Create a new wager. Creator must stake equal USDC on Base escrow."""
        assert 0 < len(question) <= 2000, "Question invalid length"
        assert 0 < len(source_url) <= 2000, "Source URL invalid length"
        assert 0 < len(metric) <= 2000, "Metric invalid length"
        assert 0 < len(threshold) <= 2000, "Threshold invalid length"
        domain = self._extract_domain(source_url)
        wl = self._get_whitelist()
        assert wl.get(domain, False), f"Domain '{domain}' not whitelisted"
        assert opponent != str(gl.message.sender_address), "Cannot bet against yourself"

        wagers = self._get_wagers()
        wager = {
            "id": str(len(wagers)),
            "creator": str(gl.message.sender_address),
            "opponent": opponent,
            "question": question,
            "source_url": source_url,
            "metric": metric,
            "threshold": threshold,
            "status": "open",
            "winner": ""
        }
        wagers.append(wager)
        self._set_wagers(wagers)
        return str(len(wagers) - 1)

    @gl.public.write
    def accept_wager(self, wager_id):
        """Opponent accepts the wager. Must have staked equal USDC on Base escrow."""
        wagers = self._get_wagers()
        idx = int(wager_id)
        assert 0 <= idx < len(wagers), "Invalid wager ID"
        wager = wagers[idx]
        assert wager["status"] == "open", "Wager not open"
        assert str(gl.message.sender_address) == wager["opponent"], "Only opponent can accept"
        wager["status"] = "accepted"
        self._set_wagers(wagers)

    @gl.public.write
    def resolve_wager(self, wager_id):
        """Resolve wager via AI consensus by fetching live data and evaluating."""
        wagers = self._get_wagers()
        idx = int(wager_id)
        assert 0 <= idx < len(wagers), "Invalid wager ID"
        wager = wagers[idx]
        assert wager["status"] == "accepted", "Wager not accepted"
        assert (
            str(gl.message.sender_address) == wager["creator"]
            or str(gl.message.sender_address) == wager["opponent"]
            or str(gl.message.sender_address) == self.owner
        ), "Not authorized to resolve"

        def _resolve():
            html = gl.nondet.web.render(wager["source_url"], mode="text")
            prompt = f"""You are an impartial judge resolving a peer-to-peer bet.

Question: {wager["question"]}
Source URL: {wager["source_url"]}
Metric to check: {wager["metric"]}
Threshold / Condition: {wager["threshold"]}

Live source data:
{html[:8000]}

Analyze the data carefully. Determine whether the condition described in the question is met based on the live data.

Return ONLY a JSON object with this exact schema:
{{"verdict": true or false, "confidence": "high|medium|low", "explanation": "concise reasoning"}}
"""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(result, sort_keys=True)

        consensus_str = gl.eq_principle.prompt_comparative(_resolve)
        consensus = json.loads(consensus_str)

        verdict = consensus.get("verdict", False)
        confidence = consensus.get("confidence", "low")

        if confidence == "low":
            def _resolve_retry():
                html = gl.nondet.web.render(wager["source_url"], mode="text")
                prompt = f"""You are an impartial judge resolving a peer-to-peer bet. Be decisive.

Question: {wager["question"]}
Source data: {html[:8000]}
Metric: {wager["metric"]}
Threshold: {wager["threshold"]}

Return ONLY: {{"verdict": true or false, "confidence": "high|medium|low", "explanation": "..."}}
"""
                result = gl.nondet.exec_prompt(prompt, response_format="json")
                return json.dumps(result, sort_keys=True)

            consensus_str = gl.eq_principle.prompt_comparative(_resolve_retry)
            consensus = json.loads(consensus_str)
            verdict = consensus.get("verdict", False)
            confidence = consensus.get("confidence", "low")
            assert confidence != "low", "Resolution confidence too low after retry"

        wager["status"] = "resolved"
        wager["winner"] = wager["creator"] if verdict else wager["opponent"]
        self._set_wagers(wagers)

    @gl.public.write
    def add_whitelist(self, domain):
        """Owner can add new domains to the whitelist."""
        assert str(gl.message.sender_address) == self.owner, "Only owner"
        wl = self._get_whitelist()
        wl[domain] = True
        self._set_whitelist(wl)

    @gl.public.write
    def remove_whitelist(self, domain):
        """Owner can remove domains from the whitelist."""
        assert str(gl.message.sender_address) == self.owner, "Only owner"
        wl = self._get_whitelist()
        wl[domain] = False
        self._set_whitelist(wl)

    @gl.public.view
    def get_wager(self, wager_id):
        """Get wager details by ID."""
        wagers = self._get_wagers()
        idx = int(wager_id)
        assert 0 <= idx < len(wagers), "Invalid wager ID"
        return json.dumps(wagers[idx])

    @gl.public.view
    def get_wager_count(self):
        """Total number of wagers created."""
        return str(len(self._get_wagers()))

    @gl.public.view
    def get_wagers_by_creator(self, creator):
        """Get all wagers created by a specific address."""
        wagers = self._get_wagers()
        result = [w for w in wagers if w["creator"] == creator]
        return json.dumps(result)

    @gl.public.view
    def get_wagers_by_opponent(self, opponent):
        """Get all wagers where address is the opponent."""
        wagers = self._get_wagers()
        result = [w for w in wagers if w["opponent"] == opponent]
        return json.dumps(result)

    @gl.public.view
    def get_whitelist(self):
        """Get current domain whitelist."""
        return self.whitelist_json

    @gl.public.view
    def get_owner(self):
        """Get contract owner."""
        return self.owner
