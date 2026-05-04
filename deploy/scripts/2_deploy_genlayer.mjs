import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

let privateKey = (process.env.PRIVATE_KEY || "").trim();
if (!privateKey || privateKey === "0xYOUR_PRIVATE_KEY_HERE") {
  throw new Error("Set PRIVATE_KEY in deploy/.env first");
}
if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;

const account = createAccount(privateKey);
const client = createClient({ chain: testnetBradbury });

const contractCode = readFileSync(
  join(__dirname, "../../contracts/WagerWire.py"),
  "utf8"
);

console.log("Deploying WagerWire.py to GenLayer Bradbury testnet...");
console.log("Account:", account.address);

const txHash = await client.deployContract({
  account,
  code: contractCode,
  args: [],
  value: BigInt(0),
});

console.log("Tx hash:", txHash);
console.log("Waiting for confirmation (may take ~30–60s)...");

const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  retries: 60,
  interval: 3000,
});

// Serialize receipt safely (BigInt → string)
const safeReceipt = JSON.parse(
  JSON.stringify(receipt, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
);

// Try common field locations for contract address across GenLayer receipt shapes
const contractAddress =
  safeReceipt?.data?.contractAddress ??
  safeReceipt?.data?.contract_address ??
  safeReceipt?.result?.contract_address ??
  safeReceipt?.contractAddress ??
  safeReceipt?.to ??
  safeReceipt?.data?.to ??
  null;

if (!contractAddress) {
  console.log("\nFull receipt:");
  console.log(JSON.stringify(safeReceipt, null, 2));
  console.error(
    "\nCould not auto-detect address. Copy it from above and edit deploy/deployed.json:\n  { \"genlayer\": \"0xYOUR_ADDRESS\" }\nThen run: npm run 3"
  );
  process.exit(1);
}

console.log("\nGenLayer contract deployed at:", contractAddress);

const deployedPath = join(__dirname, "../deployed.json");
const deployed = existsSync(deployedPath)
  ? JSON.parse(readFileSync(deployedPath, "utf8"))
  : {};
deployed.genlayer = contractAddress;
writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));
console.log("Saved to deploy/deployed.json — run step 3 next.");
