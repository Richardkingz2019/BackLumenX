# BackLumenX Contract Makefile

SOROBAN_CLI = soroban

.PHONY: all build test deploy init help

help:
	@echo "BackLumenX Smart Contract Commands"
	@echo "==================================="
	@echo "make build          - Build the contract .wasm"
	@echo "make test           - Run contract unit tests"
	@echo "make deploy         - Build & deploy to testnet"
	@echo "make init           - Initialize a campaign (requires DEPLOYER_SECRET)"
	@echo "make clean          - Remove build artifacts"
	@echo ""
	@echo "Deploy env vars:"
	@echo "  DEPLOYER_SECRET    - Secret key of the deployer account"
	@echo "  BENEFICIARY_ADDR   - Beneficiary address (for init)"
	@echo "  GOAL_STROOPS       - Funding goal in stroops (default: 10000000000 = 1000 XLM)"
	@echo "  DEADLINE           - Unix timestamp deadline"

build:
	cargo build --target wasm32-unknown-unknown --release
	ls -la target/wasm32-unknown-unknown/release/backlumenx.wasm

test:
	cargo test

deploy: build
	@if [ -z "$(DEPLOYER_SECRET)" ]; then \
		echo "ERROR: Set DEPLOYER_SECRET to your testnet account secret key"; \
		exit 1; \
	fi
	$(SOROBAN_CLI) contract deploy \
		--wasm target/wasm32-unknown-unknown/release/backlumenx.wasm \
		--source $(DEPLOYER_SECRET) \
		--network testnet

init:
	@if [ -z "$(DEPLOYER_SECRET)" ] || [ -z "$(CONTRACT_ID)" ] || [ -z "$(BENEFICIARY_ADDR)" ]; then \
		echo "ERROR: Set DEPLOYER_SECRET, CONTRACT_ID, and BENEFICIARY_ADDR"; \
		exit 1; \
	fi
	$(SOROBAN_CLI) contract invoke \
		--id $(CONTRACT_ID) \
		--source $(DEPLOYER_SECRET) \
		--network testnet \
		-- \
		init \
		--title "Save the Ocean" \
		--description "Help us clean up the Pacific Ocean and protect marine wildlife." \
		--beneficiary $(BENEFICIARY_ADDR) \
		--goal $(or $(GOAL_STROOPS),10000000000) \
		--deadline $(or $(DEADLINE),1735689600)

clean:
	cargo clean
	rm -f *.wasm
