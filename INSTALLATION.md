# TKI Cash Control — Installation Guide

PT TKI bank cash monitoring and office expense planning application.

## Included scope

- Next.js application with TypeScript
- PostgreSQL database through Prisma
- Database schema and migrations in `prisma/`
- Manual bank-account registration and manual IDR balance entry
- Expense planning with confirmation before status changes
- CEO-managed login accounts
- Optional Google OAuth login
- Six-month cash forecast and Excel export

Automatic and Computer Use bank-balance retrieval are disabled in the current product mode.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- PostgreSQL 16 or compatible PostgreSQL server
- Git is recommended

## 1. Install dependencies

```bash
cd bank-cash-monitoring
npm ci
```

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set the PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/bank_cash_monitoring?schema=public"
APP_BASE_URL="http://10.10.0.7:10005"
NEXTAUTH_URL="http://10.10.0.7:10005"
```

Do not commit `.env` or send its values through chat.

### Demo mode

For local setup without Google credentials:

```env
DEMO_MODE="true"
```

Demo mode provides the internal CEO/Finance role switcher and must not be exposed outside the trusted LAN.

### Google login mode

To enable Google login, create a Google OAuth Web Application client and set:

```env
AUTH_SECRET="a-long-random-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
DEMO_MODE="false"
```

Configure this redirect URI in Google Cloud:

```text
http://10.10.0.7:10005/api/auth/callback/google
```

Use an HTTPS hostname and matching HTTPS redirect URI when Google requires HTTPS for the deployment environment.

## 3. Prepare the database

Create the PostgreSQL database if it does not already exist:

```bash
createdb bank_cash_monitoring
```

Apply migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

For local development where migrations are being changed, use:

```bash
npx prisma migrate dev
```

## 4. Seed initial data

```bash
npm run db:seed
```

The seed is non-destructive and provisions:

- CEO PT TKI
- Arif Arinto — `arifarinto@gmail.com` — CEO
- Finance PT TKI
- Demo BNI and BRI bank institutions/accounts
- Demo expenses and forecast inputs

## 5. Verify the installation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## 6. Start the application

For the PT TKI LAN deployment:

```bash
npm run start -- --hostname 0.0.0.0 --port 10005
```

Open:

```text
http://10.10.0.7:10005/
```

Health check:

```bash
curl http://127.0.0.1:10005/api/health
```

## User management

When signed in as CEO, open **User Management** to create or activate login accounts. Each user must sign in with the exact Google email registered by the CEO. Roles are `CEO` and `FINANCE`.

## Sensitive files excluded from the source archive

The source archive intentionally excludes:

- `.env` and all environment secret files
- `node_modules/`
- `.next/`
- coverage and local logs
- generated local runtime files

Never store bank passwords, OTPs, CAPTCHA values, cookies, browser sessions, Google client secrets, or `AUTH_SECRET` in the repository.
