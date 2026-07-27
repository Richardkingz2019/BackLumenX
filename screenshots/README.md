# Screenshots

This directory contains screenshots for the BackLumenX project submission.

---

## Included Screenshots

### `wallet-options.svg`
Shows the **Stellar Wallets Kit modal** with available wallet options:
- Freighter (marked as "Installed")
- Albedo
- xBull
- WalletConnect

### `campaign-view.svg`
Shows the **full campaign page** with:
- Campaign title and contract address
- Progress bar at 0.5% (5 XLM raised of 1,000 XLM goal)
- Contribution form with amount input
- Confirmed transaction status pipeline
- Stellar Expert explorer link

---

## Replacing with Live Screenshots

The current SVGs are generated mockups. To replace them with real browser screenshots:

1. **Start the frontend** at `http://localhost:3000`:
   ```bash
   cd frontend && npm run dev
   ```

2. **Wallet options screenshot:**
   - Click "Connect Wallet to Get Started"
   - Screenshot the Stellar Wallets Kit modal
   - Save as `wallet-options.png` (overwrite the SVG)

3. **Campaign view screenshot:**
   - Connect your Freighter wallet
   - The campaign page loads with the progress bar
   - Optionally make a contribution to show the transaction flow
   - Screenshot the full page
   - Save as `campaign-view.png`

4. **Update the README** image paths from `.svg` to `.png` if using PNG screenshots.
