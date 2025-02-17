# Requirements

## **Step 1: Install `pipx`**

Installation:
```bash
python3 -m pip install --user pipx
python3 -m pipx ensurepath
```

Verify installation:
```bash
pipx --version
```

## **Step 2: Install `mxpy`**

Installation:
```bash
pipx install multiversx-sdk-cli --force
```

Verify installation:
```bash
mxpy --version
```

## **Step 3: Install Rust**

Installation (Debian):
```bash
apt install build-essential pkg-config libssl-dev
mxpy deps install rust --overwrite
```

Verify installation:
```bash
rustup show
```

# Smart Contract

## Creating a new Smart Contract

Initialize a new smart contract project:
```bash
sc-meta new --template empty --name voting-sc
```

Verify the project setup:
```bash
cargo check
```

---

## Building the Smart Contract

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
### Key Outputs:
- **`voting-sc.wasm`**: Compiled bytecode for deployment.
- **`voting-sc.abi.json`**: ABI for interacting with the contract.

---

(Following examples are using Devnet environment)

---

## Deploying the Smart Contract

Deploy the contract:
```bash
mxpy --verbose contract deploy \
  --recall-nonce \
  --bytecode="./output/voting-sc.wasm" \
  --proxy=https://devnet-gateway.multiversx.com \
  --abi ./output/voting-sc.abi.json \
  --gas-limit 500000000 \
  --pem="./<your-wallet>.pem" \
  --send
```

Replace `<your-wallet>.pem` with your wallet file name. Note the contract address after successful deployment.

---

## Upgrading the Smart Contract

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
     --gas-limit 50000000 \
     --pem="./<your-wallet>.pem" \
     --send
   ```

---

## Interacting with the Smart Contract

### Call
Example 1: Create a poll.
```bash
mxpy contract call erd1<your-contract-address> \ 
  --function create_poll \ 
  --arguments-file ./src/arguments_examples/create_poll_arguments.json \ 
  --proxy https://devnet-gateway.multiversx.com \ 
  --pem "./<your-wallet>.pem" \ 
  --send
```

Example 2: Cast a vote for an option.
```bash
mxpy contract call erd1<your-contract-address> \ 
  --function cast_vote \ 
  --arguments-file ./src/arguments_examples/cast_vote_arguments.json \ 
  --proxy https://devnet-gateway.multiversx.com \ 
  --pem "./<your-wallet>.pem" \ 
  --send
```

### Query
Example 3: Fetch the current poll question.
```bash
mxpy contract query erd1<your-contract-address> \ 
  --function getPollQuestion \ 
  --arguments u64:1 \ 
  --proxy https://devnet-gateway.multiversx.com
```