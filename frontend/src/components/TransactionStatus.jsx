import React from 'react';

/**
 * TransactionStatus - displays the transaction status pipeline.
 *
 * Shows the current phase, any error, and a link to Stellar Expert
 * once the transaction is confirmed.
 */
export default function TransactionStatus({ phase, hash, error, onRetry }) {
  if (!phase) return null;

  const phases = [
    { key: 'building', label: 'Building transaction' },
    { key: 'simulating', label: 'Simulating' },
    { key: 'awaiting_signature', label: 'Awaiting signature' },
    { key: 'submitting', label: 'Submitting' },
    { key: 'confirming', label: 'Confirming' },
    { key: 'confirmed', label: 'Confirmed' },
  ];

  const currentIndex = phases.findIndex((p) => p.key === phase);

  const getStatusClass = (index) => {
    if (phase === 'failed') return 'step-failed';
    if (index < currentIndex) return 'step-done';
    if (index === currentIndex) return 'step-active';
    return 'step-pending';
  };

  const getStatusIcon = (index) => {
    if (phase === 'failed' && index === currentIndex) return '✕';
    if (index < currentIndex) return '✓';
    if (index === currentIndex && phase === 'failed') return '✕';
    if (index === currentIndex) return '○';
    return '○';
  };

  // Classify error for display
  const errorClass = error
    ? error.includes('campaign has ended')
      ? 'error-campaign'
      : error.includes('rejected') || error.includes('wallet')
        ? 'error-wallet'
        : 'error-network'
    : null;

  return (
    <div className={`tx-status ${phase === 'failed' ? 'tx-failed' : ''} ${phase === 'confirmed' ? 'tx-confirmed' : ''}`}>
      <h4 className="tx-status-title">
        {phase === 'confirmed'
          ? '✓ Transaction Confirmed'
          : phase === 'failed'
            ? '✕ Transaction Failed'
            : 'Transaction in Progress'}
      </h4>

      {/* Phase pipeline */}
      <div className="tx-pipeline">
        {phases.map((p, i) => (
          <div
            key={p.key}
            className={`tx-step ${getStatusClass(i)}`}
          >
            <span className="tx-step-icon">{getStatusIcon(i)}</span>
            <span className="tx-step-label">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className={`tx-error ${errorClass}`}>
          <p>{error}</p>
          {error.includes('please try again') && onRetry && (
            <button className="btn btn-secondary btn-sm" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Success with explorer link */}
      {phase === 'confirmed' && hash && (
        <div className="tx-explorer-link">
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-link"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View on Stellar Expert (Testnet)
          </a>
        </div>
      )}
    </div>
  );
}
