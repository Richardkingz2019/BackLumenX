import React from 'react';

/**
 * CampaignDisplay - renders campaign title and description.
 */
export default function CampaignDisplay({ title, description }) {
  return (
    <div className="campaign-display">
      <div className="campaign-badge">Active Campaign</div>
      <h2 className="campaign-title">{title || 'Untitled Campaign'}</h2>
      <p className="campaign-description">
        {description || 'No description provided.'}
      </p>
    </div>
  );
}
