import React, { useState, useCallback, useEffect } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit/sdk';
import { Networks } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import WalletConnect from './components/WalletConnect';
import CampaignDisplay from './components/CampaignDisplay';
import ContributeForm from './components/ContributeForm';
import ProgressBar from './components/ProgressBar';
import TransactionStatus from './components/TransactionStatus';
import { useCampaign } from './hooks/useCampaign';
import { stroopsToXlm } from './lib/stellar';

// ── Initialize wallets kit once ──────────────────────────────────────

StellarWalletsKit.init({
  modules: defaultModules(),
  network: Networks.TESTNET,
});

/**
 * App component — wallet state and campaign orchestration.
 */
function App() {
  const [address, setAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);

  const {
    campaign,
    loading,
    error,
    txStatus,
    balance,
    contribute,
    resetTxStatus,
  } = useCampaign(address, selectedWallet);

  // ── Connect handler ──────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result = await StellarWalletsKit.getAddress();
      if (result?.address) {
        setAddress(result.address);
        setSelectedWallet('freighter');
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Disconnect handler ───────────────────────────────────────────

  const handleDisconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
    setAddress(null);
    setSelectedWallet(null);
    resetTxStatus();
  }, [resetTxStatus]);

  // ── Derived display values ────────────────────────────────────────

  const goalXlm = campaign ? stroopsToXlm(campaign.goal) : null;
  const raisedXlm = campaign ? stroopsToXlm(campaign.raised) : null;

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <h1>BackLumenX</h1>
          </div>
          <WalletConnect
            address={address}
            balance={balance}
            isConnecting={isConnecting}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="main">
        {!address ? (
          /* ── Not Connected State ─────────────────────────────── */
          <div className="hero">
            <div className="hero-content">
              <div className="hero-icon">✦</div>
              <h2>Welcome to BackLumenX</h2>
              <p className="hero-subtitle">
                Crowdfunding powered by Stellar Soroban smart contracts.
                Connect your wallet to view and back campaigns.
              </p>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <span className="spinner" />
                    Connecting...
                  </>
                ) : (
                  'Connect Wallet to Get Started'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── Connected State ─────────────────────────────────── */
          <div className="campaign-layout">
            {loading ? (
              <div className="loading-container">
                <div className="spinner-lg" />
                <p>Loading campaign data...</p>
              </div>
            ) : error ? (
              <div className="error-card">
                <span className="error-icon">⚠</span>
                <h3>Unable to Load Campaign</h3>
                <p>{error}</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            ) : campaign ? (
              <>
                {/* ── Campaign Info Section ──────────────────────── */}
                <CampaignDisplay
                  title={campaign.title}
                  description={campaign.description}
                />

                {/* ── Progress Section ───────────────────────────── */}
                <div className="progress-section">
                  <div className="progress-stats">
                    <div className="stat">
                      <span className="stat-value">
                        {raisedXlm?.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}{' '}
                        XLM
                      </span>
                      <span className="stat-label">
                        raised of {goalXlm?.toLocaleString()} XLM goal
                      </span>
                    </div>
                    <div className="stat stat-right">
                      <span className="stat-value">
                        {campaign
                          ? Math.min(
                              Math.round(
                                (Number(campaign.raised) /
                                  Number(campaign.goal)) *
                                  100
                              ),
                              100
                            )
                          : 0}
                        %
                      </span>
                      <span className="stat-label">funded</span>
                    </div>
                  </div>
                  <ProgressBar
                    raised={campaign.raised}
                    goal={campaign.goal}
                  />
                  <p className="deadline-text">
                    {campaign.deadline
                      ? `Campaign ends ${new Date(
                          Number(campaign.deadline) * 1000
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}`
                      : ''}
                  </p>
                </div>

                {/* ── Contribute Form ────────────────────────────── */}
                <ContributeForm
                  onContribute={contribute}
                  txStatus={txStatus}
                  onReset={resetTxStatus}
                  balance={balance}
                />

                {/* ── Transaction Status ─────────────────────────── */}
                {txStatus.phase && (
                  <TransactionStatus
                    phase={txStatus.phase}
                    hash={txStatus.hash}
                    error={txStatus.error}
                    onRetry={resetTxStatus}
                  />
                )}
              </>
            ) : (
              <div className="error-card">
                <span className="error-icon">⚠</span>
                <h3>Campaign Not Found</h3>
                <p>
                  The campaign contract has not been initialized yet.
                  Please deploy and initialize the contract first.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="footer">
        <p>
          Built with{' '}
          <a
            href="https://stellar.org/soroban"
            target="_blank"
            rel="noopener noreferrer"
          >
            Stellar Soroban
          </a>{' '}
          • Testnet •{' '}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
