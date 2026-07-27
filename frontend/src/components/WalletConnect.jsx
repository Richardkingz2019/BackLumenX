import React from 'react';
import { shortenAddress } from '../lib/stellar';

/**
 * WalletConnect - handles wallet connect/disconnect UI.
 *
 * Shows connect button when disconnected, and wallet info
 * (shortened address, balance, disconnect) when connected.
 */
export default function WalletConnect({
  address,
  balance,
  isConnecting,
  onConnect,
  onDisconnect,
}) {
  return (
    <div className="wallet-connect">
      {address ? (
        <div className="wallet-connected">
          <div className="wallet-info">
            <div className="wallet-address-badge">
              <span className="wallet-dot" />
              <span className="wallet-address">
                {shortenAddress(address)}
              </span>
            </div>
            {balance !== null && (
              <span className="wallet-balance">
                {Number(balance).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}{' '}
                XLM
              </span>
            )}
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={onDisconnect}
            title="Disconnect wallet"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <span className="spinner" />
              Connecting...
            </>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="wallet-icon"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 10h-4a3 3 0 0 0 0 6h4" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
              Connect Wallet
            </>
          )}
        </button>
      )}
    </div>
  );
}
