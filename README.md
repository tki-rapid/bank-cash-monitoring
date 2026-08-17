# TKI Cash Control

PT TKI bank cash monitoring and office expense planning.

## Current scope

- CEO and Finance dashboard
- Multiple bank accounts in IDR
- Manual available-balance input
- Manual bank-account registration by Finance
- Automatic and Computer Use balance retrieval disabled
- Six-month cash forecast scenarios
- Expense planning: submitted, approved, paid
- Excel reports
- Indonesian/English responsive UI

## Development

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name initial_bank_cash_monitoring
npm run db:seed
npm run dev -- --hostname 0.0.0.0 --port 10005
```

This initial build uses a local internal demo actor switcher until PT TKI selects the production authentication method. Do not expose it outside the trusted LAN.

## Safety boundary

The application never accepts or stores bank passwords, OTPs, CAPTCHA values, cookies, or bank sessions. Bank accounts and balances are maintained manually by Finance. Automatic and Computer Use balance updates are disabled. Manual balance entries are auditable and immutable.
