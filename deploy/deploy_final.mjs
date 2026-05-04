import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

let rawKey = (process.env.PRIVATE_KEY || "").trim();
if (!rawKey.startsWith("0x")) rawKey = "0x" + rawKey;

const account = createAccount(rawKey);
const client = createClient({ chain: testnetBradbury });

const contractCode = readFileSync(join(__dirname, "../contracts/WagerWire.py"), "utf8");

console.log("Account    :", account.address);
console.log("Deploying WagerWire.py...");

const txHash = await client.deployContract({ account, code: contractCode, value: BigInt(0) });
console.log("GL tx hash :", txHash);

console.log("\nWaiting for consensus (ACCEPTED)...");
const receipt = await client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });

const safe = JSON.parse(JSON.stringify(receipt, (_, v) => typeof v === "bigint" ? v.toString() : v));
console.log("Status     :", safe?.status_name);
console.log("Result     :", safe?.txExecutionResultName);

// Contract address for deployments is in the 'recipient' field of getTransaction
console.log("\nFetching contract address from transaction...");
const tx = await client.getTransaction({ hash: txHash });
const addr = tx?.recipient ?? null;

if (addr && addr !== "0x0000000000000000000000000000000000000000") {
  console.log("✅ DEPLOYED :", addr);

  const deployedPath = join(__dirname, "deployed.json");
  let existing = {};
  try { existing = JSON.parse(readFileSync(deployedPath, "utf8")); } catch {}
  existing.genlayer = addr;
  writeFileSync(deployedPath, JSON.stringify(existing, null, 2));
  console.log("Saved to deployed.json");

  // Quick verify
  try {
    const owner = await client.readContract({ address: addr, functionName: "get_owner", args: [], stateStatus: "accepted" });
    console.log("✅ get_owner():", owner);
  } catch (e) {
    console.log("⚠️  get_owner() failed:", e.message?.slice(0, 100));
  }
} else {
  console.log("❌ Contract address not found");
  try {
    const trace = await client.debugTraceTransaction({ hash: txHash, round: 0 });
    console.log("result_code:", trace.result_code);
    if (trace.stderr) console.log("stderr:", trace.stderr.slice(0, 300));
  } catch (e) {}
}
