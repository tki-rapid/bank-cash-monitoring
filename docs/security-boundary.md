# Security Boundary

- No bank passwords, OTPs, CAPTCHA values, cookies, or browser sessions are stored.
- Bank portal retrieval is read-only and human-in-the-loop.
- CAPTCHA pauses the workflow for the authorised operator.
- Only account number and available balance are extracted.
- Manual balance entry is recorded with source, operator, timestamp, and optional note.
- No transfer, payment, beneficiary, or bank-write API exists.
- The current internal actor switcher is demo-only and must not be exposed outside the trusted LAN. Replace it with PT TKI authentication before production use.
