# multiversx-voting-project
Voting dApp using MultiversX Smart Contracts.

## Pre-requisites (Smart Contract)

### **Step 1: Install `pipx`**

Installation:
```bash
python3 -m pip install --user pipx
python3 -m pipx ensurepath
```

Verify installation:
```bash
pipx --version
```

### **Step 2: Install `mxpy`**

Installation:
```bash
pipx install multiversx-sdk-cli --force
```

Verify installation:
```bash
mxpy --version
```

### **Step 3: Install Rust**

Installation (Debian):
```bash
apt install build-essential pkg-config libssl-dev
mxpy deps install rust --overwrite
```

Verify installation:
```bash
rustup show
```

## Smart Contract

### Creating a new Smart Contract

Initialize a new smart contract project:
```bash
sc-meta new --template empty --name voting-sc
```

Verify the project setup:
```bash
cargo check
```

---

### Building the Smart Contract

Compile the smart contract into WebAssembly (WASM) bytecode:
```bash
sc-meta all build
```

This generates an output directory containing:
```
output/
├── voting-sc.abi.json
├── voting-sc.imports.json
├── voting-sc.mxsc.json
└── voting-sc.wasm
```
#### Key Outputs:
- **`voting-sc.wasm`**: Compiled bytecode for deployment.
- **`voting-sc.abi.json`**: ABI for interacting with the contract.

---

(Following examples are using Devnet environment)

---

### Deploying the Smart Contract

#### Deployment

Define the deployment arguments in `deploy_arguments.json`.

Example:
```json
[
  "What is your favorite programming language?", 
  ["Rust", "Python", "JavaScript", "C++", "PHP"]
]
```

Deploy the contract:
```bash
mxpy --verbose contract deploy \
  --recall-nonce \
  --bytecode="./output/voting-sc.wasm" \
  --proxy=https://devnet-gateway.multiversx.com \
  --abi ./output/voting-sc.abi.json \
  --arguments-file ./deploy_arguments.json \
  --gas-limit 500000000 \
  --keyfile="./<your-wallet-keyfile>.json" \
  --send
```

Replace `<your-wallet-keyfile>.json` with your wallet keyfile name. Note the contract address after successful deployment.

---

### Upgrading the Smart Contract

To upgrade a deployed contract:

1. Build the updated contract:
   ```bash
   sc-meta all build
   ```

2. Deploy the upgraded bytecode:
   ```bash
   mxpy contract upgrade erd1<your-contract-address> \
     --bytecode ./output/voting-sc.wasm \
     --proxy=https://devnet-gateway.multiversx.com \
     --chain D \
     --recall-nonce \
     --gas-limit 5000000 \
     --keyfile="./<your-wallet-keyfile>.json" \
     --send
   ```

---

### Interacting with the Smart Contract

#### Query
Example: Fetch the current poll question.
```bash
mxpy contract query erd1<your-contract-address> \
  --proxy https://devnet-gateway.multiversx.com \
  --function getPollQuestion
```

#### Call
Example: Cast a vote for an option (e.g., `Rust`):
```bash
mxpy contract call erd1<your-contract-address> \
  --function vote \
  --arguments str:Rust \
  --proxy https://devnet-gateway.multiversx.com \
  --keyfile "./<your-wallet-keyfile>.json" \
  --send
```