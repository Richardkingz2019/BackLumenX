#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, String,
};

/// Represents the campaign's configuration and current state.
#[contracttype]
#[derive(Clone, Debug)]
pub struct CampaignInfo {
    /// Title of the crowdfunding campaign
    pub title: String,
    /// Description of the campaign
    pub description: String,
    /// Address that receives funds on successful withdrawal
    pub beneficiary: Address,
    /// Funding goal in stroops (1 XLM = 10_000_000 stroops)
    pub goal: i128,
    /// Total amount raised so far in stroops
    pub raised: i128,
    /// Unix timestamp after which contributions are rejected
    pub deadline: u64,
}

/// Storage keys for the contract's persistent state.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// The main campaign configuration
    Campaign,
    /// Per-contributor pledge records, keyed by Address
    Contributor(Address),
    /// Whether funds have been withdrawn
    Withdrawn,
}

#[contract]
pub struct BackLumenX;

#[contractimpl]
impl BackLumenX {
    // ── Initialization ──────────────────────────────────────────────

    /// Initializes the campaign. Must be called once after deployment.
    /// `goal` and `amount` values are in stroops (1 XLM = 10_000_000).
    pub fn init(
        env: Env,
        title: String,
        description: String,
        beneficiary: Address,
        goal: i128,
        deadline: u64,
    ) {
        // Prevent re-initialization
        assert!(
            !env.storage().instance().has(&DataKey::Campaign),
            "Campaign already initialized"
        );

        let info = CampaignInfo {
            title,
            description,
            beneficiary,
            goal,
            raised: 0,
            deadline,
        };

        env.storage().instance().set(&DataKey::Campaign, &info);
    }

    // ── Contribution ────────────────────────────────────────────────

    /// Accepts a pledge from `contributor` for `amount` stroops.
    ///
    /// Transfers XLM from the contributor to this contract via the
    /// Stellar Asset Contract for native XLM. Requires the contributor
    /// to authorize both the contract call and the token transfer.
    ///
    /// Rejects if:
    /// - The campaign deadline has passed.
    /// - The amount is zero or negative.
    pub fn contribute(env: Env, contributor: Address, amount: i128) {
        // Require the contributor's signature
        contributor.require_auth();

        // Validate amount
        assert!(amount > 0, "Contribution amount must be positive");

        // Load campaign state
        let mut info: CampaignInfo = env
            .storage()
            .instance()
            .get(&DataKey::Campaign)
            .unwrap_or_else(|| panic!("Campaign not initialized"));

        // Check deadline
        let now = env.ledger().timestamp();
        assert!(
            now < info.deadline,
            "This campaign has ended and is no longer accepting pledges."
        );

        // ── Transfer XLM from contributor to this contract ────────
        // Use the native Stellar Asset Contract (SAC) to move XLM on-chain.
        // The SAC address for native XLM on all networks:
        // CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
        let sac_address = Address::from_string(
            &String::from_str(
                &env,
                "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
            ),
        );
        let native_token = token::Client::new(&env, &sac_address);
        let contract_address = env.current_contract_address();
        // Transfer XLM from contributor to this contract
        native_token.transfer(&contributor, &contract_address, &amount);

        // Update contributor's total
        let contrib_key = DataKey::Contributor(contributor.clone());
        let current: i128 = env.storage().instance().get(&contrib_key).unwrap_or(0);
        env.storage()
            .instance()
            .set(&contrib_key, &(current + amount));

        // Update total raised
        info.raised += amount;
        env.storage().instance().set(&DataKey::Campaign, &info);

        // Emit event for real-time listeners
        env.events()
            .publish(
                (symbol_short!("contrib"),),
                (contributor, amount),
            );
    }

    // ── Read-Only Queries ───────────────────────────────────────────

    /// Returns the full campaign state. No auth required.
    pub fn get_campaign_info(env: Env) -> CampaignInfo {
        env.storage()
            .instance()
            .get(&DataKey::Campaign)
            .unwrap_or_else(|| panic!("Campaign not initialized"))
    }

    /// Returns the total amount pledged by a specific contributor.
    pub fn get_contributor_amount(env: Env, contributor: Address) -> i128 {
        let key = DataKey::Contributor(contributor);
        env.storage().instance().get(&key).unwrap_or(0)
    }

    // ── Withdrawal (Beneficiary Only) ───────────────────────────────

    /// Allows the beneficiary to withdraw after the deadline passes
    /// OR after the funding goal is met. Restricted to beneficiary address.
    /// Can only be called once — sets a withdrawn flag to prevent re-entry.
    ///
    /// Transfers the total raised XLM from this contract to the beneficiary
    /// via the Stellar Asset Contract for native XLM.
    pub fn withdraw(env: Env) {
        let info: CampaignInfo = env
            .storage()
            .instance()
            .get(&DataKey::Campaign)
            .unwrap_or_else(|| panic!("Campaign not initialized"));

        // Only the beneficiary may call this
        info.beneficiary.require_auth();

        let now = env.ledger().timestamp();
        assert!(
            now >= info.deadline || info.raised >= info.goal,
            "Cannot withdraw yet: deadline not reached and goal not met"
        );

        // Prevent double-withdrawal
        let already_withdrawn: bool = env
            .storage()
            .instance()
            .get(&DataKey::Withdrawn)
            .unwrap_or(false);
        assert!(!already_withdrawn, "Funds have already been withdrawn");

        // ── Transfer XLM from this contract to the beneficiary ────
        let raised = info.raised;
        let beneficiary = info.beneficiary.clone();

        let sac_address = Address::from_string(
            &String::from_str(
                &env,
                "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
            ),
        );
        let native_token = token::Client::new(&env, &sac_address);
        let contract_address = env.current_contract_address();

        // Transfer XLM from this contract to the beneficiary.
        // No explicit authorization needed — the protocol recognizes
        // the contract as the source of the call.
        if raised > 0 {
            native_token.transfer(&contract_address, &beneficiary, &raised);
        }

        // Mark as withdrawn
        env.storage()
            .instance()
            .set(&DataKey::Withdrawn, &true);

        // Emit withdrawal event
        env.events()
            .publish(
                (symbol_short!("withdraw"),),
                (info.beneficiary, info.raised),
            );
    }

    // ── Admin: Check if initialized ─────────────────────────────────

    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Campaign)
    }
}

// ── Tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod test;
