# BNI Computer Use Runbook

Status: connector contract only; live portal discovery is pending authorised Finance/CEO review.

## Required workflow

1. Finance starts a retrieval for a configured BNI account.
2. Hermes opens a fresh isolated browser session.
3. The authorised operator completes login and any CAPTCHA/OTP manually.
4. Hermes navigates only to the approved account overview.
5. Hermes extracts available balance and account number.
6. The application validates IDR and a non-negative integer balance.
7. The run stores a `computer_use` snapshot and closes the browser session.

Never provide passwords, OTPs, CAPTCHA values, cookies, or recovery codes to the application or chat. Do not automate CAPTCHA solving.

## Pending discovery fields

- Official BNI portal URL
- Accessibility labels/selectors for login and account overview
- Exact account-number and available-balance labels
- Approved automation terms and operator procedure
