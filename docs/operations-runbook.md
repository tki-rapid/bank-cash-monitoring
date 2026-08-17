# Operations Runbook

## Start

```bash
cd /Users/tki/Desktop/dev/bank-cash-monitoring
npm run start -- --hostname 0.0.0.0 --port 10005
```

## Verify

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:10005/
curl -fsS -o /dev/null -w '%{http_code}\n' http://10.10.0.7:10005/
```

## Manual bank accounts

Finance opens **Bank Accounts**, selects an active bank, enters a display name and account number, and submits. The account is created in IDR without any bank portal connection.

## Manual balance

Finance selects an account, enters the available IDR balance, optionally adds a note, and submits. The application creates an immutable manual snapshot and labels it `Manual`. Automatic and Computer Use balance updates are disabled.

## Port ownership

Before starting, confirm port 10005 is not owned by Stitch Umroh or another service.
