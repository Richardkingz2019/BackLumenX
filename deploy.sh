#!/bin/bash
# deploy.sh — Full deployment script for BackLumenX
# Usage: ./deploy.sh <deployer_secret_key>

set -euo pipefail

DEPLOYER_SECRET="${1:-}"
BENEFICIARY_ADDR="${2:-}"
TITLE="${3:-Save the Ocean}"
DESC="${4:-Help us clean up the Pacific Ocean and protect marine wildlife.}"
GOAL="${5:-10000000000}"      # 1000 XLM in stroops
DEADLINE="${6:-1800000000}"   # Far-future deadline

if [ -z "$DEPLOYER_SECRET" ]; then
  echo "Usage: ./deploy.sh <deployer_secret_key> [beneficiary_addr] [title] [description] [goal_stroops] [deadline_timestamp]"
  echo ""
  echo "Example:"
  echo "  ./deploy.sh SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \\"
  echo "    GCZ55HR4B... \"Save the Ocean\" \"Help us clean...\" 10000000000 1800000000"
  exit 1
fi

if [ -z "$BENEFICIARY_ADDR" ]; then
  echo "Warning: No beneficiary specified, using deployer address."
  # Derive public key from secret
  BENEFICIARY_ADDR=$(soroban keys address "$DEPLOYER_SECRET" 2>/dev/null || echo "")
  if [ -z "$BENEFICIARY_ADDR" ]; then
    # Extract from secret key format
    BENEFICIARY_ADDR="G...please_provide_beneficiary_address"
  fi
fi

echo "╔══════════════════════════════════════════════╗"
echo "║     BackLumenX Contract Deployment           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Deployer: $(soroban keys address "$DEPLOYER_SECRET" 2>/dev/null || echo 'Using secret key')"
echo "Beneficiary: $BENEFICIARY_ADDR"
echo "Goal: $GOAL stroops"
echo "Deadline: $DEADLINE"
echo ""

# Step 1: Build
echo "📦 [1/3] Building contract..."
cd contract
cargo build --target wasm32-unknown-unknown --release
echo "   ✓ Build complete"
echo ""

# Step 2: Deploy
echo "🚀 [2/3] Deploying to Stellar Testnet..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/backlumenx.wasm \
  --source "$DEPLOYER_SECRET" \
  --network testnet 2>&1 | tail -1)
echo "   ✓ Deployed!"
echo "   Contract ID: $CONTRACT_ID"
echo ""

# Step 3: Initialize
echo "⚙️  [3/3] Initializing campaign..."
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$DEPLOYER_SECRET" \
  --network testnet \
  -- \
  init \
  --title "$TITLE" \
  --description "$DESC" \
  --beneficiary "$BENEFICIARY_ADDR" \
  --goal "$GOAL" \
  --deadline "$DEADLINE"
echo "   ✓ Campaign initialized!"
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║  Deployment Complete!                        ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Contract ID:                               ║"
echo "║  $CONTRACT_ID"
echo "║                                              ║"
echo "║  Update frontend/.env:                       ║"
echo "║  VITE_CONTRACT_ID=$CONTRACT_ID"
echo "║                                              ║"
echo "║  Start frontend:                             ║"
echo "║  cd frontend && npm install && npm run dev   ║"
echo "╚══════════════════════════════════════════════╝"
