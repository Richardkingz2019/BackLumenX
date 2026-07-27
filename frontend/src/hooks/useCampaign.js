import { useState, useEffect, useCallback, useRef } from 'react';
import { signTransaction as freighterSign } from '@stellar/freighter-api';
import {
  simulateCampaignInfo,
  fullContributeFlow,
  getBalance,
  getContributionEvents,
} from '../lib/stellar';

/**
 * Custom hook for campaign state management.
 *
 * Provides:
 * - campaign: { title, description, goal, raised, deadline } in stroops
 * - loading: boolean for initial fetch
 * - error: campaign-level errors
 * - refreshCampaign: manual refresh
 * - contribute: function to contribute
 * - txStatus: { phase, hash, error } for the current transaction
 */
export function useCampaign(publicKey, selectedWallet) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [txStatus, setTxStatus] = useState({
    phase: null,
    hash: null,
    error: null,
  });
  const [balance, setBalance] = useState(null);

  const pollingRef = useRef(null);
  const isContributingRef = useRef(false);

  // ── Fetch campaign info ──────────────────────────────────────────

  const refreshCampaign = useCallback(async () => {
    if (!publicKey) return;

    try {
      setError(null);
      const info = await simulateCampaignInfo(publicKey);
      setCampaign(info);
    } catch (err) {
      setError(err.message || 'Failed to load campaign.');
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // ── Fetch balance ────────────────────────────────────────────────

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    try {
      const bal = await getBalance(publicKey);
      setBalance(bal);
    } catch {
      // Silently fail for balance
    }
  }, [publicKey]);

  // ── Initial load + periodic refresh ──────────────────────────────

  useEffect(() => {
    if (publicKey) {
      refreshCampaign();
      refreshBalance();

      // Poll every 8 seconds for live updates from other backers.
      // Uses Soroban getEvents() for fast event detection, with
      // an unconditional periodic refresh as a fallback.
      let lastEventLedger = null;
      let refreshTickCount = 0;
      pollingRef.current = setInterval(async () => {
        // Skip polling during active contributions to avoid races
        if (isContributingRef.current) return;

        refreshTickCount++;

        // Always refresh every 3rd tick (24s) to guarantee state sync
        const forceRefresh = refreshTickCount % 3 === 0;

        try {
          const { events, latestLedger } = await getContributionEvents(
            lastEventLedger
          );
          if (events.length > 0 || !lastEventLedger || forceRefresh) {
            // New events detected, first poll, or periodic refresh
            await refreshCampaign();
            await refreshBalance();
          }
          if (latestLedger) lastEventLedger = latestLedger;
        } catch {
          // Fall back to standard refresh on event polling failure
          refreshCampaign();
          refreshBalance();
        }
      }, 8000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    } else {
      setCampaign(null);
      setBalance(null);
      setLoading(false);
    }
  }, [publicKey, refreshCampaign, refreshBalance]);

  // ── Contribute ───────────────────────────────────────────────────

  const contribute = useCallback(
    async (amountXlm) => {
      if (!publicKey) {
        setTxStatus({
          phase: 'failed',
          hash: null,
          error: 'Wallet not connected.',
        });
        return;
      }

      // Pause polling during contribution
      isContributingRef.current = true;

      try {
        // Phase 1: Building transaction
        setTxStatus({ phase: 'building', hash: null, error: null });

        // Build signing function based on selected wallet type
        const signFn = async (xdr) => {
          try {
            if (selectedWallet === 'albedo' && window.albedo) {
              // Albedo wallet signing
              const result = await window.albedo.signTransaction(xdr);
              return result.signed_envelope_xdr || result.xdr;
            }
            if (selectedWallet === 'xbull' && window.xBullSDK) {
              // xBull wallet signing
              const result = await window.xBullSDK.signTransaction(xdr);
              return result.signed_envelope_xdr || result.xdr;
            }
            // Default: Freighter wallet signing (also handles 'freighter' explicitly)
            const signedXdr = await freighterSign(xdr, {
              network: 'TESTNET',
            });
            return signedXdr;
          } catch (signErr) {
            const msg = signErr.message || signErr.toString();
            if (
              msg.includes('rejected') ||
              msg.includes('cancelled') ||
              msg.includes('denied')
            ) {
              throw new Error(
                'Signature request was rejected. Please try again.'
              );
            }
            throw signErr;
          }
        };

        // Phase 2 & 3: Simulating → Awaiting signature
        setTxStatus({ phase: 'simulating', hash: null, error: null });

        // Full flow: build → simulate → assemble → sign → submit → track
        const result = await fullContributeFlow(publicKey, amountXlm, signFn);

        if (result.status === 'SUCCESS') {
          setTxStatus({
            phase: 'confirmed',
            hash: result.hash,
            error: null,
          });

          // Refresh campaign data immediately
          await refreshCampaign();
          await refreshBalance();
        } else {
          setTxStatus({
            phase: 'failed',
            hash: result.hash || null,
            error: result.error || 'Transaction failed.',
          });
        }
      } catch (err) {
        setTxStatus({
          phase: 'failed',
          hash: null,
          error: err.message || 'An unexpected error occurred.',
        });
      } finally {
        // Resume polling
        isContributingRef.current = false;
      }
    },
    [publicKey, selectedWallet, refreshCampaign, refreshBalance]
  );

  // ── Reset transaction status ─────────────────────────────────────

  const resetTxStatus = useCallback(() => {
    setTxStatus({ phase: null, hash: null, error: null });
  }, []);

  return {
    campaign,
    loading,
    error,
    txStatus,
    balance,
    refreshCampaign,
    contribute,
    resetTxStatus,
  };
}
