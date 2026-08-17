# Decisions

- Organisation scope: PT TKI only.
- Currency: IDR.
- User roles: CEO and Finance.
- Login: Google OAuth for CEO-approved email accounts; CEO manages the allowlist and activation state.
- Initial CEO account: Arif Arinto (`arifarinto@gmail.com`).
- Bank balance source: Finance enters accounts and balances manually; automatic and Computer Use retrieval are disabled.
- Manual balance input: Finance only; CEO can read financial data.
- Expense status changes: Finance must confirm each submitted → approved or approved → paid change in the UI.
- Data retention: one year.
- Deployment target: internal LAN on the Mac Mini.
- Requested port: 10005; verify ownership before launch.
- Current authentication: internal demo actor switcher until PT TKI selects SSO or local authentication.
- BNI Computer Use: retired; no live portal connector is enabled in the manual-only product mode.
