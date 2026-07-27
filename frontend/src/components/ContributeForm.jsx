import React, { useState } from 'react';

/**
 * ContributeForm - amount input and "Back this project" button.
 *
 * Handles input validation and displays transaction state
 * on the button itself.
 */
export default function ContributeForm({
  onContribute,
  txStatus,
  onReset,
  balance,
}) {
  const [amount, setAmount] = useState('');
  const [inputError, setInputError] = useState(null);

  const isInFlight =
    txStatus.phase &&
    txStatus.phase !== 'confirmed' &&
    txStatus.phase !== 'failed';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInputError(null);

    // Validate input
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setInputError('Please enter a valid positive amount.');
      return;
    }

    if (balance !== null && parsed > Number(balance)) {
      setInputError(
        `Insufficient balance. You have ${Number(balance).toLocaleString()} XLM available.`
      );
      return;
    }

    await onContribute(parsed.toString());
    setAmount('');
  };

  const getButtonLabel = () => {
    switch (txStatus.phase) {
      case 'building':
        return 'Building transaction...';
      case 'simulating':
        return 'Simulating...';
      case 'awaiting_signature':
        return 'Check your wallet to sign';
      case 'submitting':
        return 'Submitting to network...';
      case 'confirming':
        return 'Confirming...';
      case 'confirmed':
        return '✓ Contribution successful!';
      default:
        return 'Back this project';
    }
  };

  const isButtonDisabled = isInFlight || txStatus.phase === 'confirmed';

  return (
    <div className="contribute-form-container">
      <h3 className="contribute-heading">Back this campaign</h3>
      <form className="contribute-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="number"
            className={`amount-input ${inputError ? 'input-error' : ''}`}
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setInputError(null);
            }}
            min="0.01"
            step="0.01"
            disabled={isInFlight}
          />
          <span className="input-currency">XLM</span>
        </div>

        {inputError && <p className="input-error-msg">{inputError}</p>}

        {balance !== null && (
          <p className="balance-hint">
            Available: {Number(balance).toLocaleString()} XLM
          </p>
        )}

        <button
          type="submit"
          className={`btn btn-primary btn-full contribute-btn ${
            txStatus.phase === 'confirmed' ? 'btn-success' : ''
          } ${txStatus.phase === 'failed' ? 'btn-error-flash' : ''}`}
          disabled={isButtonDisabled || isInFlight}
        >
          {isInFlight && <span className="spinner" />}
          {getButtonLabel()}
        </button>

        {txStatus.phase === 'failed' && (
          <button
            type="button"
            className="btn btn-outline btn-full retry-btn"
            onClick={onReset}
          >
            Try Again
          </button>
        )}
      </form>
    </div>
  );
}
