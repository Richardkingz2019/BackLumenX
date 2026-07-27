import {
  Contract,
  TransactionBuilder,
  Networks,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import {
  Server,
  assembleTransaction as sorobanAssemble,
  Api as SorobanApi,
} from '@stellar/stellar-sdk/rpc';

// ── Configuration ────────────────────────────────────────────────────

const CONFIG = {
  contractId: import.meta.env.VITE_CONTRACT_ID || '',
  rpcUrl:
    import.meta.env.VITE_SOROBAN_RPC_URL ||
    'https://soroban-testnet.stellar.org',
  horizonUrl:
    import.meta.env.VITE_HORIZON_URL ||
    'https://horizon-testnet.stellar.org',
  networkPassphrase:
    import.meta.env.VITE_NETWORK_PASSPHRASE ||
    Networks.TESTNET,
};

const rpc = new Server(CONFIG.rpcUrl, {
  allowHttp: CONFIG.rpcUrl.startsWith('http://'),
});

// ── Error Types ──────────────────────────────────────────────────────

export class CampaignStateError extends Error {
  constructor(message = 'This campaign has ended and is no longer accepting pledges.') {
    super(message);
    this.name = 'CampaignStateError';
  }
}

export class WalletInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WalletInputError';
  }
}

export class NetworkSimulationError extends Error {
  constructor(message = 'Network error — please try again.') {
    super(message);
    this.name = 'NetworkSimulationError';
  }
}

// ── Helper: Convert stroops to XLM and vice versa ──────────────────

const STROOP = 10_000_000;

export function stroopsToXlm(stroops) {
  return Number(stroops) / STROOP;
}

export function xlmToStroops(xlm) {
  return BigInt(Math.floor(Number(xlm) * STROOP));
}

// ── Helper: Shorten address for display ─────────────────────────────

export function shortenAddress(address) {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ── Horizon: Get account balance ────────────────────────────────────

export async function getBalance(publicKey) {
  try {
    const response = await fetch(
      `${CONFIG.horizonUrl}/accounts/${publicKey}`
    );
    if (!response.ok) {
      throw new WalletInputError('Unable to fetch account balance.');
    }
    const data = await response.json();
    const nativeBalance = data.balances.find(
      (b) => b.asset_type === 'native'
    );
    return nativeBalance ? nativeBalance.balance : '0';
  } catch (err) {
    if (err instanceof WalletInputError) throw err;
    throw new NetworkSimulationError('Failed to fetch balance from Horizon.');
  }
}

// ── Contract: Simulate get_campaign_info (read-only) ────────────────

export async function simulateCampaignInfo(publicKey) {
  try {
    const contract = new Contract(CONFIG.contractId);
    const source = await rpc.getAccount(publicKey).catch(() => {
      // If account doesn't exist yet (unfunded), use a funded testnet account
      return null;
    });

    if (!source) {
      throw new WalletInputError(
        'Account not found on testnet. Please fund your wallet first using the Stellar Friendbot.'
      );
    }

    const tx = new TransactionBuilder(source, {
      fee: '100',
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(contract.call('get_campaign_info'))
      .setTimeout(30)
      .build();

    const sim = await rpc.simulateTransaction(tx);

    if (SorobanApi.isSimulationError(sim)) {
      throw new NetworkSimulationError(
        `Simulation failed: ${sim.error || 'Unknown error'}`
      );
    }

    if (!sim.result) {
      throw new NetworkSimulationError('Simulation returned no result.');
    }

    const scVal = sim.result.retval;
    return scValToNative(scVal);
  } catch (err) {
    if (
      err instanceof CampaignStateError ||
      err instanceof WalletInputError ||
      err instanceof NetworkSimulationError
    ) {
      throw err;
    }
    throw new NetworkSimulationError(
      `Campaign simulation failed: ${err.message || 'Unknown error'}`
    );
  }
}

// ── Contract: Build contribute transaction ──────────────────────────

export async function buildContributeTransaction(publicKey, amountStroops) {
  try {
    const contract = new Contract(CONFIG.contractId);
    const source = await rpc.getAccount(publicKey).catch(() => null);

    if (!source) {
      throw new WalletInputError(
        'Account not found on testnet. Fund your wallet first.'
      );
    }

    // Build the transaction with the contribute call
    const tx = new TransactionBuilder(source, {
      fee: '100000', // 0.1 XLM fee for contract invoke
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'contribute',
          nativeToScVal(publicKey, { type: 'address' }),
          nativeToScVal(amountStroops, { type: 'i128' })
        )
      )
      .setTimeout(30)
      .build();

    return tx;
  } catch (err) {
    if (err instanceof WalletInputError) throw err;
    throw new NetworkSimulationError(
      `Failed to build transaction: ${err.message || 'Unknown error'}`
    );
  }
}

// ── Contract: Simulate a transaction ────────────────────────────────

export async function simulateTransaction(tx) {
  try {
    const sim = await rpc.simulateTransaction(tx);

    if (SorobanApi.isSimulationError(sim)) {
      const errorStr = sim.error || '';
      // Check for campaign-ended error from the contract
      if (errorStr.includes('campaign has ended') || errorStr.includes('no longer accepting')) {
        throw new CampaignStateError();
      }
      throw new NetworkSimulationError(
        `Transaction simulation failed: ${errorStr || 'Unknown error'}`
      );
    }

    if (!sim.result) {
      throw new NetworkSimulationError('Simulation returned no result.');
    }

    return sim;
  } catch (err) {
    if (err instanceof CampaignStateError || err instanceof NetworkSimulationError) {
      throw err;
    }
    throw new NetworkSimulationError(
      `Simulation error: ${err.message || 'Unknown error'}`
    );
  }
}

// ── Contract: Assemble and prepare for signing ──────────────────────

export function assembleTransaction(tx, simulation) {
  try {
    // Apply the simulation's footprint and auth requirements
    const assembled = sorobanAssemble(tx, simulation);
    return assembled.build();
  } catch (err) {
    throw new NetworkSimulationError(
      `Failed to assemble transaction: ${err.message || 'Unknown error'}`
    );
  }
}

// ── Contract: Submit signed transaction ─────────────────────────────

export async function submitTransaction(signedTxXdr) {
  try {
    const tx = TransactionBuilder.fromXDR(
      signedTxXdr,
      CONFIG.networkPassphrase
    );

    const result = await rpc.sendTransaction(tx);

    if (result.status === 'ERROR') {
      throw new NetworkSimulationError(
        `Transaction submission failed: ${result.errorResult || 'Unknown error'}`
      );
    }

    return result.hash;
  } catch (err) {
    if (err instanceof NetworkSimulationError) throw err;
    throw new NetworkSimulationError(
      `Failed to submit transaction: ${err.message || 'Unknown error'}`
    );
  }
}

// ── Transaction Status Polling ──────────────────────────────────────

export async function pollTransactionStatus(hash, maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await rpc.getTransaction(hash);

      if (response.status === SorobanApi.GetTransactionStatus.SUCCESS) {
        return { status: 'SUCCESS', hash, response };
      }

      if (response.status === SorobanApi.GetTransactionStatus.FAILED) {
        return {
          status: 'FAILED',
          hash,
          error: response.resultXdr || 'Transaction failed on-chain',
        };
      }

      // Still pending — wait and retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      // RPC may throw on NOT_FOUND — keep polling
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return {
    status: 'TIMEOUT',
    hash,
    error: 'Transaction status polling timed out.',
  };
}

// ── Full contribute flow (build → simulate → assemble → sign → submit → track) ──

export async function fullContributeFlow(
  publicKey,
  amountXlm,
  signTransactionFn
) {
  const amountStroops = xlmToStroops(amountXlm);

  // Step 1: Build
  const tx = await buildContributeTransaction(publicKey, amountStroops);

  // Step 2: Simulate
  const sim = await simulateTransaction(tx);

  // Step 3: Assemble
  const assembledTx = assembleTransaction(tx, sim);

  // Step 4: Sign (via wallet)
  const signedXdr = await signTransactionFn(assembledTx.toXDR());

  // Step 5: Submit
  const hash = await submitTransaction(signedXdr);

  // Step 6: Track
  const result = await pollTransactionStatus(hash);

  return result;
}

// ── RPC & Config accessors ──────────────────────────────────────────

export function getConfig() {
  return { ...CONFIG };
}

export function getRpc() {
  return rpc;
}
