# Screenshots Guide

This directory contains screenshots for the BackLumenX project submission.

---

## Required Screenshot: Wallet Connection Options

The README requires a screenshot showing the **Stellar Wallets Kit modal** with available wallet options (Freighter, Albedo, xBull, etc.).

### How to Capture

1. **Start the frontend** (if not already running):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open in browser** at `http://localhost:3000`

3. **Open DevTools** (F12 or Cmd+Option+I) and set the viewport to a clean size (e.g., 1280×800).

4. **Click** the "Connect Wallet to Get Started" button on the hero page.

5. **Capture the modal** that appears showing wallet options:
   - On macOS: `Cmd+Shift+4` then drag to select the modal area
   - On Windows/Linux: `Win+Shift+S` or use a screenshot extension
   - Or use browser DevTools: `Cmd+Shift+P` → "Capture screenshot"

6. **Save** the screenshot in this directory as `wallet-options.png`.

### Recommended Screenshot Content

The screenshot should clearly show:
- The Stellar Wallets Kit modal (centered overlay)
- Multiple wallet options visible (Freighter, Albedo, xBull, etc.)
- The "BackLumenX" branding in the background
- Clean, well-lit UI with no sensitive information exposed

### Adding to README

Once captured, the README will automatically reference it at:
```
![Wallet Options](./screenshots/wallet-options.png)
```

---

## Optional: Additional Screenshots

- `campaign-view.png` — The full campaign page with progress bar and contribute form
- `transaction-confirmed.png` — The transaction status showing "Confirmed" with the Stellar Expert link
- `error-state.png` — Any of the error states (wallet not connected, invalid amount, etc.)
