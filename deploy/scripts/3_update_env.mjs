import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const deployedPath = join(__dirname, "../deployed.json");
if (!existsSync(deployedPath)) {
  console.error("deploy/deployed.json not found. Run steps 1 and 2 first.");
  process.exit(1);
}

const deployed = JSON.parse(readFileSync(deployedPath, "utf8"));
const envPath = join(__dirname, "../../frontend/.env.local");

if (!existsSync(envPath)) {
  console.error("frontend/.env.local not found.");
  process.exit(1);
}

let env = readFileSync(envPath, "utf8");

if (deployed.escrow) {
  env = env.replace(/VITE_ESCROW_CONTRACT=.*/, `VITE_ESCROW_CONTRACT=${deployed.escrow}`);
  console.log("✓ VITE_ESCROW_CONTRACT =", deployed.escrow);
} else {
  console.warn("⚠ No escrow address in deployed.json (step 1 may not have run)");
}

if (deployed.genlayer) {
  env = env.replace(/VITE_GENLAYER_CONTRACT=.*/, `VITE_GENLAYER_CONTRACT=${deployed.genlayer}`);
  console.log("✓ VITE_GENLAYER_CONTRACT =", deployed.genlayer);
} else {
  console.warn("⚠ No genlayer address in deployed.json (step 2 may not have run)");
}

writeFileSync(envPath, env);
console.log("\nfrontend/.env.local updated! Restart the dev server to apply.");
