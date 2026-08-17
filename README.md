# TKI Cash Control

PT TKI bank cash monitoring and office expense planning.

## Current scope

- CEO and Finance dashboard
- CEO-managed login accounts
- Google OAuth login for approved PT TKI accounts
- Arif Arinto provisioned as CEO (`arifarinto@gmail.com`)
- Multiple bank accounts in IDR
- Manual available-balance input
- Manual bank-account registration by Finance
- Automatic and Computer Use balance retrieval disabled
- Six-month cash forecast scenarios
- Expense planning: submitted, approved, paid
- Excel reports
- Indonesian/English responsive UI

## Installation

See [`INSTALLATION.md`](./INSTALLATION.md) for the complete database, demo-mode, Google OAuth, and LAN deployment procedure.

## Development

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name initial_bank_cash_monitoring
npm run db:seed
npm run dev -- --hostname 0.0.0.0 --port 10005
```

This initial build uses a local internal demo actor switcher while Google OAuth credentials are not configured. Set `DEMO_MODE=false` only after Google OAuth is configured. Do not expose demo mode outside the trusted LAN.

## Google login setup

1. Create a Google OAuth **Web application** client in Google Cloud.
2. Add this authorised redirect URI:

   `http://10.10.0.7:10005/api/auth/callback/google`

3. Set `NEXTAUTH_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in the local `.env` file. Never send the client secret in chat or commit it.
4. Run the seed command so the CEO and Finance accounts are provisioned.
5. Set `DEMO_MODE=false` and restart the application.

The CEO uses **User Management** to add or activate login accounts. Google users must sign in with the exact email address registered by the CEO. In the current local environment the Google credentials are intentionally blank, so the demo actor switcher remains active and the Google endpoint returns `503` until configured.

## Safety boundary

The application never accepts or stores bank passwords, OTPs, CAPTCHA values, cookies, or bank sessions. Bank accounts and balances are maintained manually by Finance. Automatic and Computer Use balance updates are disabled. Manual balance entries are auditable and immutable.
