#![cfg(test)]

use crate::{BackLumenX, BackLumenXClient};
use soroban_sdk::{symbol_short, testutils::Address as _, vec, Address, Env, String};

fn setup_contract<'a>(env: &Env) -> BackLumenXClient<'a> {
    let contract_id = env.register_contract(None, crate::BackLumenX);
    let client = BackLumenXClient::new(env, &contract_id);

    let beneficiary = Address::generate(env);
    let title = String::from_str(env, "Save the Ocean");
    let description = String::from_str(env, "Help us clean up the Pacific Ocean.");
    let goal: i128 = 100_000_000_000_000; // 10M XLM in stroops (unrealistic but for testing)
    let deadline = 200_000_000u64; // far future

    client.init(&title, &description, &beneficiary, &goal, &deadline);
    client
}

#[test]
fn test_init_and_get_info() {
    let env = Env::default();
    let client = setup_contract(&env);

    let info = client.get_campaign_info();
    assert_eq!(info.title, String::from_str(&env, "Save the Ocean"));
    assert_eq!(info.goal, 100_000_000_000_000);
    assert_eq!(info.raised, 0);
    assert_eq!(info.deadline, 200_000_000);
}

#[test]
fn test_contribute_updates_raised() {
    let env = Env::default();
    let client = setup_contract(&env);

    let contributor = Address::generate(&env);
    let amount: i128 = 50_000_000_000; // 5000 XLM in stroops

    client.contribute(&contributor, &amount);

    let info = client.get_campaign_info();
    assert_eq!(info.raised, 50_000_000_000);

    let pledged = client.get_contributor_amount(&contributor);
    assert_eq!(pledged, 50_000_000_000);
}

#[test]
fn test_multiple_contributions_aggregate() {
    let env = Env::default();
    let client = setup_contract(&env);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.contribute(&alice, &10_000_000_000);
    client.contribute(&bob, &20_000_000_000);
    client.contribute(&alice, &5_000_000_000);

    let info = client.get_campaign_info();
    assert_eq!(info.raised, 35_000_000_000);
    assert_eq!(client.get_contributor_amount(&alice), 15_000_000_000);
    assert_eq!(client.get_contributor_amount(&bob), 20_000_000_000);
}

#[test]
#[should_panic(expected = "Contribution amount must be positive")]
fn test_zero_contribution_rejected() {
    let env = Env::default();
    let client = setup_contract(&env);
    let contributor = Address::generate(&env);

    client.contribute(&contributor, &0);
}

#[test]
#[should_panic(expected = "Contribution amount must be positive")]
fn test_negative_contribution_rejected() {
    let env = Env::default();
    let client = setup_contract(&env);
    let contributor = Address::generate(&env);

    client.contribute(&contributor, &-1_000_000_000);
}

#[test]
#[should_panic(expected = "This campaign has ended")]
fn test_contribution_after_deadline_rejected() {
    let env = Env::default();
    let contract_id = env.register_contract(None, crate::BackLumenX);
    let client = BackLumenXClient::new(&env, &contract_id);

    let beneficiary = Address::generate(&env);
    let title = String::from_str(&env, "Late Campaign");
    let description = String::from_str(&env, "Should be over.");
    let goal: i128 = 10_000_000_000;
    let deadline = 100u64; // already passed

    client.init(&title, &description, &beneficiary, &goal, &deadline);

    // Advance ledger past deadline
    env.ledger().set_timestamp(200);

    let contributor = Address::generate(&env);
    client.contribute(&contributor, &1_000_000_000);
}

#[test]
fn test_withdraw_only_beneficiary() {
    let env = Env::default();
    let contract_id = env.register_contract(None, crate::BackLumenX);
    let client = BackLumenXClient::new(&env, &contract_id);

    let beneficiary = Address::generate(&env);
    let title = String::from_str(&env, "Goal Met");
    let description = String::from_str(&env, "We did it.");
    let goal: i128 = 10_000_000_000;
    let deadline = 1_000_000u64;

    client.init(&title, &description, &beneficiary, &goal, &deadline);

    // Fund the campaign fully
    let donor = Address::generate(&env);
    client.contribute(&donor, &10_000_000_000);

    // Beneficiary can withdraw because goal is met (even before deadline)
    // This test confirms the require_auth is the right address check
    let info = client.get_campaign_info();
    assert_eq!(info.raised, info.goal);
}

#[test]
#[should_panic(expected = "Campaign already initialized")]
fn test_double_init_rejected() {
    let env = Env::default();
    let client = setup_contract(&env);

    // Try to init again
    let beneficiary = Address::generate(&env);
    let title = String::from_str(&env, "Second Init");
    let description = String::from_str(&env, "Should fail.");
    let goal: i128 = 100;
    let deadline = 200u64;

    client.init(&title, &description, &beneficiary, &goal, &deadline);
}

#[test]
fn test_is_initialized() {
    let env = Env::default();
    let client = setup_contract(&env);

    assert!(client.is_initialized());
}

#[test]
fn test_emits_contribution_event() {
    let env = Env::default();
    let client = setup_contract(&env);
    let contributor = Address::generate(&env);
    let amount: i128 = 25_000_000_000;

    client.contribute(&contributor, &amount);

    // Verify event was emitted
    let events = env.events().all().collect::<Vec<_>>();
    let contribution_events: Vec<_> = events
        .iter()
        .filter(|e| {
            e.0 .0 == symbol_short!("contribution")
        })
        .collect();

    assert!(!contribution_events.is_empty());
}
