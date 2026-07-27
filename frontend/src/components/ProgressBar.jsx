import React from 'react';

/**
 * ProgressBar - animated progress bar showing raised/goal percentage.
 *
 * @param {bigint|number|string} raised - amount raised in stroops
 * @param {bigint|number|string} goal - funding goal in stroops
 */
export default function ProgressBar({ raised, goal }) {
  const percentage = goal
    ? Math.min(Math.round((Number(raised) / Number(goal)) * 100), 100)
    : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {percentage > 8 && (
            <span className="progress-bar-label">{percentage}%</span>
          )}
        </div>
      </div>
      {percentage <= 8 && (
        <span className="progress-bar-label-outside">{percentage}%</span>
      )}
    </div>
  );
}
