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
  --proxy=https://devnet-gateway.multiversx.com --recall-nonce \
  --abi ./output/voting-sc.abi.json \
  --arguments-file ./src/arguments_examples/create_poll_arguments.json \
  --function createPoll \
  --gas-limit 10_000_000 \
  --pem="./<your-wallet>.pem" \
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

Example 3: Fetch all polls.

L'argument de `getPolls` és opcional (Option<PollStatus>) i la codificació segueix el següent patró:

 - None = 0x00
 - Some(valor) = 0x01 seguit del valor codificat de PollStatus (00, 01 o 02)

```bash
mxpy contract query erd1<your-contract-address> \
  --function getPolls \
  --arguments 0x00 \
  --proxy https://devnet-gateway.multiversx.com
```

Example 3A: Fetch all "NotStarted" polls.
```bash
mxpy contract query erd1<your-contract-address> \
  --function getPolls \
  --arguments 0x0100 \
  --proxy https://devnet-gateway.multiversx.com
```

Example 3B: Fetch all "Ongoing" polls.
```bash
mxpy contract query erd1<your-contract-address> \
  --function getPolls \
  --arguments 0x0101 \
  --proxy https://devnet-gateway.multiversx.com
```

Example 3C: Fetch all "Ended" polls.
```bash
mxpy contract query erd1<your-contract-address> \
  --function getPolls \
  --arguments 0x0102 \
  --proxy https://devnet-gateway.multiversx.com
```

Example 4: Fetch poll with id 0.
```bash
mxpy contract query erd1<your-contract-address> \
  --function getPoll \
  --arguments 0 \
  --proxy https://devnet-gateway.multiversx.com
```