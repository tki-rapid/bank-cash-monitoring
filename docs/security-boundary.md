# Security Boundary

- Bank balance data is entered manually by Finance; automatic retrieval and Computer Use updates are disabled.
- Google OAuth is allowlisted: only active user accounts created or activated by the CEO can sign in.
- Google client secrets and AUTH_SECRET are environment-only and never committed.
- No bank passwords, OTPs, CAPTCHA values, cookies, or browser sessions are stored.
- Balance history is immutable and records the Finance operator and timestamp.
- Only account number and available balance are extracted.
- Manual balance entry is recorded with source, operator, timestamp, and optional note.
- No transfer, payment, beneficiary, or bank-write API exists.
- The internal actor switcher is demo-only and must not be exposed outside the trusted LAN. When Google OAuth is configured, production authentication is fail-closed without a Google session.
