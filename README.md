# BackLumenX — Crowdfunding dApp on Stellar Soroban

A decentralized crowdfunding application where campaigns are backed by **Soroban smart contracts** on the **Stellar Testnet**. Visitors connect their **Freighter wallet** (or any Stellar-compatible wallet), contribute XLM toward a funding goal, and watch the campaign's progress bar update in real time as pledges come in.

---

## ✨ Features

- **Multi-wallet support** — Connect via Freighter, Albedo, xBull, WalletConnect (powered by Stellar Wallets Kit)
- **On-chain campaign** — A Soroban smart contract enforces campaign rules (deadline, goal, beneficiary-only withdrawal)
- **Real-time progress** — Live progress bar that updates after every contribution and refreshes periodically
- **Full transaction pipeline** — Building → Simulating → Awaiting Signature → Submitting → Confirmed/Failed
- **Three error types handled**:
  1. **Campaign state errors** — contributions after deadline rejected on-chain
  2. **Wallet/input errors** — no wallet installed, not connected, invalid amount, rejected signature
  3. **Network/simulation errors** — RPC timeout, simulation failure, insufficient balance
- **Stellar Expert integration** — Confirmed transactions link directly to the Stellar Expert Testnet explorer

---

## 📁 Project Structure

```
BackLumenX/
├── contract/                   # Soroban smart contract (Rust)
│   ├── Cargo.toml              # Rust dependencies
│   ├── Makefile                # Build/deploy commands
│   └── src/
│       ├── lib.rs              # Contract: contribute, get_campaign_info, withdraw
│       └── test.rs             # Unit tests
├── frontend/                   # React + Vite frontend
│   ├── package.json            # Dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── index.html              # HTML entry point
│   ├── .env.example            # Environment variable template
│   └── src/
│       ├── main.jsx            # React entry
│       ├── App.jsx             # Root component (wallet, campaign orchestration)
│       ├── App.css             # Complete stylesheet
│       ├── lib/
│       │   └── stellar.js      # Wallet, contract-call, and error-mapping helpers
│       ├── hooks/
│       │   └── useCampaign.js  # Campaign state & contribution hook
│       └── components/
│           ├── WalletConnect.jsx      # Connect/disconnect UI
│           ├── CampaignDisplay.jsx    # Title & description
│           ├── ProgressBar.jsx        # Animated progress bar
│           ├── ContributeForm.jsx     # Amount input + submit
│           └── TransactionStatus.jsx  # Pipeline + explorer link
├── deploy.sh                   # Full deployment script
├── .gitignore
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites

1. **Rust & Cargo** — [Install Rust](https://rustup.rs/)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   ```

2. **Soroban CLI** — [Install Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup)
   ```bash
   cargo install soroban-cli
   ```

3. **Node.js 18+** — [Install Node.js](https://nodejs.org/)
   ```bash
   node --version  # Should be v18+
   ```

4. **A Stellar Testnet account** with XLM (fund via [Friendbot](https://laboratory.stellar.org/#create-account))

5. **Freighter Wallet** browser extension — [Install Freighter](https://freighter.app/)

---

### 1. Build & Deploy the Smart Contract

#### Option A: Using the deployment script

```bash
# From the project root
./deploy.sh SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  GCZ55HR4B... "Save the Ocean" "Help us clean up the Pacific Ocean." 10000000000 1800000000
```

> Replace `S...` with your testnet account's secret key and `GCZ...` with the beneficiary address.

#### Option B: Manual deployment

```bash
# Build the contract
cd contract
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/backlumenx.wasm \
  --source SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --network testnet

# Save the Contract ID from output (e.g., CB...)

# Initialize the campaign
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --network testnet \
  -- \
  init \
  --title "Save the Ocean" \
  --description "Help us clean up the Pacific Ocean and protect marine wildlife." \
  --beneficiary <BENEFICIARY_ADDRESS> \
  --goal 10000000000 \
  --deadline 1800000000
```

#### Run contract tests

```bash
cd contract
cargo test
```

---

### 2. Configure the Frontend

```bash
cd frontend

# Copy the environment template
cp .env.example .env

# Edit .env with your deployed contract ID
# VITE_CONTRACT_ID=CB...
```

The `.env` file should contain:

```env
VITE_CONTRACT_ID=CBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

### 3. Run the Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

The app will open at **http://localhost:3000**.

---

## 🔧 Smart Contract API

| Function | Auth Required | Description |
|---|---|---|
| `init(title, description, beneficiary, goal, deadline)` | Deployer | Initializes the campaign (once) |
| `contribute(contributor, amount)` | Contributor | Records a pledge in stroops |
| `get_campaign_info()` | None | Returns full campaign state |
| `get_contributor_amount(contributor)` | None | Returns contributor's total |
| `withdraw()` | Beneficiary | Allows withdrawal after deadline or goal met |
| `is_initialized()` | None | Returns whether campaign is set up |

**Events emitted:**
- `contribution(contributor, amount)` — on every successful `contribute()`
- `withdraw(beneficiary, amount)` — on successful `withdraw()`

---

## 📸 Screenshots

### Wallet Connection Options

> 📸 **Add your screenshot here:** Take a screenshot of the Stellar Wallets Kit modal showing available wallets (Freighter, Albedo, xBull, etc.) and replace this section with the image.
>
> Recommended format: `![Wallet Options](./screenshots/wallet-options.png)`

---

## 📜 Deployed Contract Address

| Field | Value |
|---|---|
| **Network** | Stellar Testnet |
| **Contract ID** | `CB...` *(replace with your deployed contract ID after running `soroban contract deploy`)* |
| **Verification** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CB...) |

---

## 🔗 Transaction Hash

| Field | Value |
|---|---|
| **Function Called** | `contribute(contributor, amount)` |
| **Transaction Hash** | `...` *(replace after making a live `contribute()` call through the frontend)* |
| **Verification** | [View on Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet/tx/...) |

---

## 🛡️ Error Handling

The dApp handles three categories of errors:

### 1. Campaign State Errors
> *"This campaign has ended and is no longer accepting pledges."*

- **Trigger:** Contribution attempted after the `deadline` timestamp
- **Source:** Contract-level assertion in `contribute()`
- **UI:** Yellow warning banner on the contribution form

### 2. Wallet / Input Errors
- *"Wallet not connected"* — no wallet attached
- *"Invalid amount"* — zero or negative value entered
- *"Insufficient balance"* — XLM balance too low for pledge + fees
- *"Signature rejected"* — user declined the wallet signature prompt

### 3. Network / Simulation Errors
> *"Network error — please try again."*

- **Trigger:** Soroban RPC timeout, simulation failure, dropped transaction
- **UI:** Red error banner with a **Retry** button

---

## 🧪 Verification Checklist

- [ ] Contract deployed on Stellar Testnet
- [ ] Campaign initialized via `init()`
- [ ] Frontend loads and displays campaign info
- [ ] Wallet connect/disconnect works with Freighter
- [ ] Progress bar shows correct raised/goal percentage
- [ ] Contribution flow: Build → Simulate → Sign → Submit → Confirmed
- [ ] Transaction hash links to Stellar Expert (Testnet)
- [ ] Contribution after deadline shows campaign-ended error
- [ ] Zero/negative amount shows validation error
- [ ] Real-time progress updates after contribution
- [ ] Periodic refresh picks up contributions from other backers

---

## 🌐 Live Demo (Optional)

> Deploy to Vercel or Netlify and paste your URL here:
>
> **[Live Demo](https://backlumenx.vercel.app)**

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract** | Soroban SDK v21 (Rust) |
| **Frontend** | React 18 + Vite |
| **Wallet Integration** | Stellar Wallets Kit |
| **SDK** | @stellar/stellar-sdk v16 |
| **Network** | Stellar Testnet |

---

## 📄 License

MIT
