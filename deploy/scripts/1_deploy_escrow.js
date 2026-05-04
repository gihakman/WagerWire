const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEPLOYED_FILE = path.join(__dirname, "../deployed.json");

function loadDeployed() {
  if (fs.existsSync(DEPLOYED_FILE)) return JSON.parse(fs.readFileSync(DEPLOYED_FILE, "utf8"));
  return {};
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer has no ETH. Get Base Sepolia ETH from https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
  }

  // Base Sepolia USDC (official Circle address)
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("\nDeploying WagerWireEscrow...");
  const Escrow = await ethers.getContractFactory("WagerWireEscrow");
  const escrow = await Escrow.deploy(USDC_ADDRESS);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("WagerWireEscrow deployed at:", address);

  // Set deployer as resolver so resolveWager can be called manually
  // (will be updated after step 2 once GenLayer contract address is known)
  console.log("Setting genlayerResolver to deployer...");
  const tx = await escrow.setGenLayerResolver(deployer.address);
  await tx.wait();
  console.log("genlayerResolver set to:", deployer.address);

  const deployed = loadDeployed();
  deployed.escrow = address;
  deployed.resolver = deployer.address;
  fs.writeFileSync(DEPLOYED_FILE, JSON.stringify(deployed, null, 2));
  console.log("\nSaved to deploy/deployed.json — run step 2 next.");
}

main().catch((e) => { console.error(e); process.exit(1); });
