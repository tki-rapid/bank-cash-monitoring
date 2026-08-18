"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { Banknote, BarChart3, CheckCircle2, CircleAlert, FileSpreadsheet, Landmark, LayoutDashboard, Plus, RefreshCw, ShieldCheck, UserRound, Users, WalletCards } from "lucide-react";

type Role = "CEO" | "FINANCE";
type View = "dashboard" | "accounts" | "expenses" | "forecast" | "users";
type Actor = { id: string; name: string; email: string; role: Role };
type ManagedUser = Actor & { active: boolean };
type SessionResponse = { actor: Actor | null; authMode: "demo" | "google"; googleConfigured: boolean; error?: string };
type Bank = { id: string; code: string; name: string };
type Balance = { accountId: string; bank: string; displayName: string; accountNumber: string; availableBalance: number | string; capturedAt: string | null; source: "manual" | "computer_use"; freshness: "current" | "stale" };
type Expense = { id: string; title: string; category: string; amount: number | string; plannedDate: string; status: "submitted" | "approved" | "paid"; recurrence: string };
type ForecastMonth = { month: string; closingBalance: number | string; inflows: number | string; outflows: number | string };
type Forecast = { openingBalance: number | string; months: { base: { months: ForecastMonth[] }; optimistic: { months: ForecastMonth[] }; conservative: { months: ForecastMonth[] } } };

type Translation = {
  dashboard: string;
  accounts: string;
  expenses: string;
  forecast: string;
  balance: string;
  manual: string;
  sourceManual: string;
  current: string;
  stale: string;
  sourceLegacy: string;
  finance: string;
  ceo: string;
};

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const labels: Record<"id" | "en", Translation> = {
  id: { dashboard: "Dashboard Kas", accounts: "Rekening Bank", expenses: "Rencana Pengeluaran", forecast: "Forecast 6 Bulan", balance: "Saldo tersedia", manual: "Input saldo manual", sourceManual: "Manual", sourceLegacy: "Riwayat legacy", current: "Terkini", stale: "Perlu diperbarui", finance: "Finance", ceo: "CEO" },
  en: { dashboard: "Cash Dashboard", accounts: "Bank Accounts", expenses: "Expense Planning", forecast: "6-Month Forecast", balance: "Available balance", manual: "Enter balance manually", sourceManual: "Manual", sourceLegacy: "Legacy record", current: "Current", stale: "Stale", finance: "Finance", ceo: "CEO" },
} as const;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request gagal");
  return payload as T;
}

function formatAccount(value: string): string {
  return value.length > 4 ? `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : value;
}

function formatMoney(value: number | string | bigint): string {
  return idr.format(typeof value === "string" ? BigInt(value) : value);
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [actor, setActor] = useState<Actor | null>(null);
  const [authMode, setAuthMode] = useState<"demo" | "google">("demo");
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualAccountId, setManualAccountId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [accountForm, setAccountForm] = useState({ bankInstitutionId: "", displayName: "", accountNumber: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "FINANCE" as Role });
  const [expenseForm, setExpenseForm] = useState({ title: "", category: "payroll", amount: "", plannedDate: "", recurrence: "one_time" });
  const t = labels[language];

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const session = await api<SessionResponse>("/api/session");
      setAuthMode(session.authMode);
      setGoogleConfigured(session.googleConfigured);
      setActor(session.actor);
      if (!session.actor) {
        setError(session.error ?? "Login diperlukan");
        return;
      }
      const [bankResponse, balanceResponse, expenseResponse, forecastResponse] = await Promise.all([
        api<{ banks: Array<{ id: string; code: string; name: string }> }>("/api/banks"),
        api<{ balances: Balance[] }>("/api/balances"),
        api<{ expenses: Expense[] }>("/api/expenses"),
        api<Forecast>("/api/forecast"),
      ]);
      setBanks(bankResponse.banks);
      setBalances(balanceResponse.balances);
      setExpenses(expenseResponse.expenses);
      setForecast(forecastResponse);
      setManualAccountId((current) => current || balanceResponse.balances[0]?.accountId || "");
      setAccountForm((current) => ({ ...current, bankInstitutionId: current.bankInstitutionId || bankResponse.banks[0]?.id || "" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (view !== "users" || actor?.role !== "CEO") return;
    void api<{ users: ManagedUser[] }>("/api/users").then((response) => setUsers(response.users)).catch((cause) => setError(cause instanceof Error ? cause.message : "User management gagal dimuat"));
  }, [view, actor?.role]);

  async function switchRole(role: Role) {
    await api("/api/session", { method: "POST", body: JSON.stringify({ role }) });
    if (role !== "CEO" && view === "users") setView("dashboard");
    setMessage(role === "FINANCE" ? "Mode Finance aktif." : "Mode CEO aktif.");
    await refresh();
  }

  async function submitManualBalance(event: FormEvent) {
    event.preventDefault();
    try {
      await api(`/api/accounts/${manualAccountId}/balances/manual`, { method: "POST", body: JSON.stringify({ availableBalance: Number(manualAmount), note: manualNote || undefined }) });
      setManualAmount(""); setManualNote(""); setMessage("Saldo manual berhasil disimpan."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Saldo manual gagal disimpan"); }
  }

  async function submitBankAccount(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/accounts", { method: "POST", body: JSON.stringify(accountForm) });
      setAccountForm((current) => ({ ...current, displayName: "", accountNumber: "" }));
      setMessage("Rekening bank berhasil ditambahkan.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Rekening gagal ditambahkan"); }
  }

  async function submitUser(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(userForm) });
      setUserForm({ name: "", email: "", role: "FINANCE" });
      setMessage("Login account berhasil ditambahkan. User dapat login menggunakan Google setelah diaktifkan.");
      const response = await api<{ users: ManagedUser[] }>("/api/users");
      setUsers(response.users);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "User gagal ditambahkan"); }
  }

  async function updateUser(id: string, changes: Partial<Pick<ManagedUser, "role" | "active" | "name">>) {
    try {
      await api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
      const response = await api<{ users: ManagedUser[] }>("/api/users");
      setUsers(response.users);
      setMessage("User account berhasil diperbarui.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "User gagal diperbarui"); }
  }

  async function submitExpense(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/expenses", { method: "POST", body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount), plannedDate: new Date(expenseForm.plannedDate).toISOString() }) });
      setExpenseForm({ title: "", category: "payroll", amount: "", plannedDate: "", recurrence: "one_time" }); setMessage("Rencana pengeluaran berhasil dibuat."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pengeluaran gagal dibuat"); }
  }

  async function updateExpense(id: string, title: string, currentStatus: Expense["status"], nextStatus: "approved" | "paid") {
    const confirmed = window.confirm(`Confirm status change for "${title}"?\n\n${currentStatus} → ${nextStatus}`);
    if (!confirmed) return;
    try { await api(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }); setMessage("Status pengeluaran diperbarui."); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status gagal diperbarui"); }
  }

  const totalCash = useMemo(() => balances.reduce((sum, item) => sum + BigInt(item.availableBalance), BigInt(0)), [balances]);
  const submitted = expenses.filter((expense) => expense.status === "submitted").reduce((sum, expense) => sum + BigInt(expense.amount), BigInt(0));
  const approved = expenses.filter((expense) => expense.status === "approved").reduce((sum, expense) => sum + BigInt(expense.amount), BigInt(0));
  const staleCount = balances.filter((balance) => balance.freshness === "stale").length;
  const baseMonths = forecast?.months.base.months ?? [];

  if (loading && !actor) return <main className="loading-screen">Memuat TKI Cash Control...</main>;
  if (!actor) return <LoginScreen googleConfigured={googleConfigured} error={error} />;

  const nav = [
    { id: "dashboard" as const, label: t.dashboard, icon: LayoutDashboard },
    { id: "accounts" as const, label: t.accounts, icon: Landmark },
    { id: "expenses" as const, label: t.expenses, icon: WalletCards },
    { id: "forecast" as const, label: t.forecast, icon: BarChart3 },
    ...(actor.role === "CEO" ? [{ id: "users" as const, label: "User Management", icon: Users }] : []),
  ];

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">TKI</div><div><strong>Cash Control</strong><small>PT TKI finance room</small></div></div>
      <nav className="nav">{nav.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><Icon size={17} /><span>{item.label}</span></button>; })}</nav>
      <div className="side-note"><ShieldCheck size={16} /><br />{authMode === "demo" ? "Demo access is enabled for this internal prototype. Configure Google login before wider deployment." : "Signed in with Google. User access is controlled by the CEO-managed account allowlist."}<br /><br />Read-only bank monitoring. Password, OTP, CAPTCHA, and bank sessions are never stored.</div>
    </aside>
    <section className="main">
      <header className="topbar"><div><p className="kicker">{actor.role === "FINANCE" ? t.finance : t.ceo} · PT TKI</p><h1>{view === "dashboard" ? t.dashboard : nav.find((item) => item.id === view)?.label}</h1><p className="muted">Manage cash visibility, office commitments, and six-month liquidity planning.</p></div><div className="role-box"><label>{authMode === "google" ? "Google account" : "Demo access"}</label>{authMode === "google" ? <><div className="account-chip"><UserRound size={15} />{actor.email}</div><button className="button" onClick={() => void signOut({ callbackUrl: "/" })}>Sign out</button></> : <select value={actor.role} onChange={(event) => void switchRole(event.target.value as Role)}><option value="CEO">CEO — {t.ceo}</option><option value="FINANCE">Finance — {t.finance}</option></select>}<div className="action-row"><button className="button" onClick={() => setLanguage(language === "id" ? "en" : "id")}>{language === "id" ? "EN" : "ID"}</button><button className="button" onClick={() => void refresh()}><RefreshCw size={14} />Refresh</button></div></div></header>
      {authMode === "demo" && <div className="demo-warning"><ShieldCheck size={16} />Prototype demo mode aktif. Konfigurasikan Google login PT TKI sebelum deployment lebih luas.</div>}
      {(message || error) && <div className={error ? "notice error" : "notice"}><CircleAlert size={17} />{error ?? message}<button onClick={() => { setError(null); setMessage(null); }}>×</button></div>}

      {view === "dashboard" && <>
        <div className="metric-grid"><section className="metric teal"><small>{t.balance}</small><strong>{formatMoney(totalCash)}</strong><span>{balances.length} rekening terdaftar</span></section><section className="metric purple"><small>Submitted expenses</small><strong>{formatMoney(submitted)}</strong><span>Menunggu approval</span></section><section className="metric orange"><small>Approved expenses</small><strong>{formatMoney(approved)}</strong><span>Menunggu pembayaran</span></section><section className="metric"><small>Stale balances</small><strong>{staleCount}</strong><span>Perlu input manual</span></section></div>
        <div className="grid"><BalancePanel balances={balances} role={actor.role} t={t} onManual={(id) => { setManualAccountId(id); setView("accounts"); }} /><ForecastPanel months={baseMonths} t={t} /></div>
        <div className="grid"><ExpensePanel expenses={expenses.slice(0, 5)} onUpdate={updateExpense} role={actor.role} /><section className="panel"><div className="panel-heading"><div><h2>Security boundary</h2><p>Current operational guardrails</p></div><ShieldCheck color="var(--accent)" size={22} /></div><div className="list-stack"><div className="expense-row"><div><strong>Balance updates</strong><small>Manual Finance entry only</small></div><span className="pill auto">Controlled</span></div><div className="expense-row"><div><strong>Bank credentials</strong><small>Never sent to this app</small></div><span className="pill auto">Not stored</span></div><div className="expense-row"><div><strong>Automatic retrieval</strong><small>Computer Use balance updates</small></div><span className="pill">Disabled</span></div></div></section></div>
      </>}

      {view === "accounts" && <><div className="grid"><BalancePanel balances={balances} role={actor.role} t={t} onManual={(id) => setManualAccountId(id)} /><ManualBalanceForm balances={balances} accountId={manualAccountId} setAccountId={setManualAccountId} amount={manualAmount} setAmount={setManualAmount} note={manualNote} setNote={setManualNote} onSubmit={submitManualBalance} t={t} role={actor.role} /></div><ManualAccountForm banks={banks} form={accountForm} setForm={setAccountForm} onSubmit={submitBankAccount} role={actor.role} /></>}
      {view === "expenses" && <div className="grid"><ExpensePanel expenses={expenses} onUpdate={updateExpense} role={actor.role} /><ExpenseForm form={expenseForm} setForm={setExpenseForm} onSubmit={submitExpense} role={actor.role} /></div>}
      {view === "forecast" && <div className="grid"><ForecastPanel months={baseMonths} t={t} /><section className="panel"><div className="panel-heading"><div><h2>Scenario planning</h2><p>Forecast is deterministic and input-driven.</p></div><FileSpreadsheet size={22} color="var(--accent)" /></div><p className="muted">Base, optimistic, and conservative scenarios are available through the forecast API. Cash movement recommendations are informational only; no transfer is executed.</p><div className="action-row"><a className="button primary" href="/api/reports/export.xlsx"><FileSpreadsheet size={15} />Export Excel</a></div></section></div>}
      {view === "users" && actor.role === "CEO" && <UserManagementPanel users={users} form={userForm} setForm={setUserForm} onSubmit={submitUser} onUpdate={updateUser} />}
    </section>
  </main>;
}

function LoginScreen({ googleConfigured, error }: { googleConfigured: boolean; error: string | null }) {
  return <main className="login-screen"><section className="login-card"><div className="brand-mark">TKI</div><p className="kicker">PT TKI · CASH CONTROL</p><h1>Sign in to Cash Control</h1><p className="muted">Use your approved PT TKI Google account to access cash monitoring and expense planning.</p>{googleConfigured ? <button className="button primary google-button" onClick={() => void signIn("google", { callbackUrl: "/" })}><UserRound size={16} />Continue with Google</button> : <div className="notice error">Google login is not configured on this server yet.</div>}{error && <small className="login-error">{error}</small>}<p className="login-help">Only active accounts created by the CEO can sign in.</p></section></main>;
}

function UserManagementPanel({ users, form, setForm, onSubmit, onUpdate }: { users: ManagedUser[]; form: { name: string; email: string; role: Role }; setForm: (value: { name: string; email: string; role: Role }) => void; onSubmit: (event: FormEvent) => void; onUpdate: (id: string, changes: Partial<Pick<ManagedUser, "role" | "active" | "name">>) => void }) {
  return <div className="user-management"><section className="panel"><div className="panel-heading"><div><h2>Login accounts</h2><p>CEO-managed Google login allowlist</p></div><Users color="var(--accent)" /></div><div className="user-list">{users.map((user) => <div className="user-row" key={user.id}><div className="user-identity"><div className="avatar"><UserRound size={16} /></div><div><strong>{user.name}</strong><small>{user.email}</small></div></div><div className="user-controls"><select value={user.role} onChange={(event) => void onUpdate(user.id, { role: event.target.value as Role })}><option value="CEO">CEO</option><option value="FINANCE">Finance</option></select><button className={`button ${user.active ? "secondary" : ""}`} type="button" onClick={() => void onUpdate(user.id, { active: !user.active })}>{user.active ? "Active" : "Activate"}</button></div></div>)}</div></section><section className="panel"><div className="panel-heading"><div><h2>Add login account</h2><p>User must use the same Google email to sign in.</p></div><Plus color="var(--accent)" /></div><form className="form-grid" onSubmit={onSubmit}><label className="field full"><span>Full name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="field full"><span>Google email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value.toLowerCase() })} placeholder="name@gmail.com" required /></label><label className="field full"><span>Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}><option value="FINANCE">Finance</option><option value="CEO">CEO</option></select></label><div className="form-actions"><button type="submit" className="button primary"><Plus size={15} />Create login account</button></div></form></section></div>;
}

function BalancePanel({ balances, role, t, onManual }: { balances: Balance[]; role: Role; t: typeof labels.id; onManual: (id: string) => void }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{t.accounts}</h2><p>Latest balance entered manually by Finance</p></div><span className="pill"><Landmark size={13} />{balances.length} accounts</span></div><div className="balance-list">{balances.map((balance) => <div className="balance-card" key={balance.accountId}><div className="balance-name"><strong>{balance.bank} · {balance.displayName}</strong><small>{formatAccount(balance.accountNumber)} · {balance.capturedAt ? date.format(new Date(balance.capturedAt)) : "Belum ada data"}</small><span className={balance.source === "manual" ? "pill manual" : "pill"}>{balance.source === "manual" ? t.sourceManual : t.sourceLegacy} · {balance.freshness === "current" ? t.current : t.stale}</span></div><div className="balance-value"><strong>{formatMoney(balance.availableBalance)}</strong>{role === "FINANCE" && <div className="action-row"><button className="button" onClick={() => onManual(balance.accountId)}><Plus size={13} />Manual</button></div>}</div></div>)}</div></section>;
}

function ManualAccountForm({ banks, form, setForm, onSubmit, role }: { banks: Bank[]; form: { bankInstitutionId: string; displayName: string; accountNumber: string }; setForm: (value: { bankInstitutionId: string; displayName: string; accountNumber: string }) => void; onSubmit: (event: FormEvent) => void; role: Role }) {
  return <section className="panel"><div className="panel-heading"><div><h2>Tambah rekening bank</h2><p>Finance-only manual account registration · IDR</p></div><Landmark color="var(--accent)" /></div>{role !== "FINANCE" ? <div className="empty">Mode CEO hanya dapat membaca daftar rekening.</div> : <form className="form-grid" onSubmit={onSubmit}><label className="field"><span>Bank</span><select value={form.bankInstitutionId} onChange={(event) => setForm({ ...form, bankInstitutionId: event.target.value })} required><option value="" disabled>Pilih bank</option>{banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name} ({bank.code})</option>)}</select></label><label className="field"><span>Nama rekening</span><input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Contoh: BNI Operasional" required /></label><label className="field full"><span>Nomor rekening</span><input inputMode="numeric" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} placeholder="Nomor rekening bank" required /></label><div className="form-actions"><button type="submit" className="button primary"><Plus size={15} />Simpan rekening</button></div></form>}</section>;
}

function ManualBalanceForm({ balances, accountId, setAccountId, amount, setAmount, note, setNote, onSubmit, t, role }: { balances: Balance[]; accountId: string; setAccountId: (value: string) => void; amount: string; setAmount: (value: string) => void; note: string; setNote: (value: string) => void; onSubmit: (event: FormEvent) => void; t: typeof labels.id; role: Role }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{t.manual}</h2><p>Finance-only, immutable balance snapshot</p></div><Banknote color="var(--warning)" /></div>{role !== "FINANCE" ? <div className="empty">Mode CEO hanya dapat membaca saldo.</div> : <form className="form-grid" onSubmit={onSubmit}><label className="field full"><span>Rekening</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)} required>{balances.map((balance) => <option key={balance.accountId} value={balance.accountId}>{balance.bank} · {balance.displayName}</option>)}</select></label><label className="field full"><span>Available balance (IDR)</span><input inputMode="numeric" type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Contoh: 125000000" required /></label><label className="field full"><span>Catatan (opsional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Sumber pengecekan saldo" /></label><div className="form-actions"><button className="button primary" type="submit"><CheckCircle2 size={15} />Simpan saldo manual</button></div></form>}</section>;
}

function ForecastPanel({ months, t }: { months: ForecastMonth[]; t: typeof labels.id }) {
  const max = Math.max(...months.map((month) => Number(month.closingBalance)), 1);
  return <section className="panel"><div className="panel-heading"><div><h2>{t.forecast}</h2><p>Base scenario · IDR</p></div><BarChart3 color="var(--accent-2)" /></div>{months.length ? <div className="chart-wrap">{months.map((month) => <div className="bar-row" key={month.month}><span>{month.month}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, Math.min(100, Number(month.closingBalance) / max * 100))}%` }} /></div><b>{formatMoney(month.closingBalance)}</b></div>)}</div> : <div className="empty">Belum ada data forecast.</div>}</section>;
}

function ExpensePanel({ expenses, onUpdate, role }: { expenses: Expense[]; onUpdate: (id: string, title: string, currentStatus: Expense["status"], nextStatus: "approved" | "paid") => void; role: Role }) {
  return <section className="panel"><div className="panel-heading"><div><h2>Expense planning</h2><p>Confirm before changing submitted · approved · paid status</p></div><WalletCards color="var(--warning)" /></div>{expenses.length ? <div className="expense-list">{expenses.map((expense) => <div className="expense-row" key={expense.id}><div><strong>{expense.title}</strong><small>{expense.category} · {new Date(expense.plannedDate).toLocaleDateString("id-ID")}</small></div><div className="balance-value"><strong>{formatMoney(expense.amount)}</strong><span className={`status ${expense.status}`}>{expense.status}</span>{role === "FINANCE" && expense.status !== "paid" && <div className="action-row"><button className="button" onClick={() => onUpdate(expense.id, expense.title, expense.status, expense.status === "submitted" ? "approved" : "paid")}>{expense.status === "submitted" ? "Approve" : "Mark paid"}</button></div>}</div></div>)}</div> : <div className="empty">Belum ada rencana pengeluaran.</div>}</section>;
}

function ExpenseForm({ form, setForm, onSubmit, role }: { form: { title: string; category: string; amount: string; plannedDate: string; recurrence: string }; setForm: (value: { title: string; category: string; amount: string; plannedDate: string; recurrence: string }) => void; onSubmit: (event: FormEvent) => void; role: Role }) {
  return <section className="panel"><div className="panel-heading"><div><h2>Tambah expense</h2><p>Finance-only planning input</p></div><WalletCards /></div>{role !== "FINANCE" ? <div className="empty">Mode CEO hanya dapat membaca rencana pengeluaran.</div> : <form className="form-grid" onSubmit={onSubmit}><label className="field full"><span>Judul</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label><label className="field"><span>Kategori</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="payroll">Payroll</option><option value="vendors">Vendors</option><option value="infrastructure">Infrastructure</option><option value="taxes">Taxes</option><option value="employee_bonus">Employee bonus</option><option value="other">Other</option></select></label><label className="field"><span>Recurring</span><select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value })}><option value="one_time">One-time</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></label><label className="field"><span>Amount (IDR)</span><input type="number" min="0" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label><label className="field"><span>Planned date</span><input type="date" value={form.plannedDate} onChange={(event) => setForm({ ...form, plannedDate: event.target.value })} required /></label><div className="form-actions"><button type="submit" className="button primary"><Plus size={15} />Submit expense</button></div></form>}</section>;
}
