# Security Boundary

- Bank balance data is entered manually by Finance; automatic retrieval and Computer Use updates are disabled.
- No bank passwords, OTPs, CAPTCHA values, cookies, or browser sessions are stored.
- Balance history is immutable and records the Finance operator and timestamp.
- Only account number and available balance are extracted.
- Manual balance entry is recorded with source, operator, timestamp, and optional note.
- No transfer, payment, beneficiary, or bank-write API exists.
- The current internal actor switcher is demo-only and must not be exposed outside the trusted LAN. Replace it with PT TKI authentication before production use.
