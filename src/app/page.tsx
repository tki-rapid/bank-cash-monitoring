"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, BarChart3, CheckCircle2, CircleAlert, FileSpreadsheet, Landmark, LayoutDashboard, LogIn, Plus, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";

type Role = "CEO" | "FINANCE";
type View = "dashboard" | "accounts" | "expenses" | "forecast";
type Actor = { id: string; name: string; role: Role };
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
  retrieve: string;
  sourceManual: string;
  sourceAuto: string;
  current: string;
  stale: string;
  finance: string;
  ceo: string;
};

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const labels: Record<"id" | "en", Translation> = {
  id: { dashboard: "Dashboard Kas", accounts: "Rekening Bank", expenses: "Rencana Pengeluaran", forecast: "Forecast 6 Bulan", balance: "Saldo tersedia", manual: "Input saldo manual", retrieve: "Ambil via Computer Use", sourceManual: "Manual", sourceAuto: "Computer Use", current: "Terkini", stale: "Perlu diperbarui", finance: "Finance", ceo: "CEO" },
  en: { dashboard: "Cash Dashboard", accounts: "Bank Accounts", expenses: "Expense Planning", forecast: "6-Month Forecast", balance: "Available balance", manual: "Enter balance manually", retrieve: "Retrieve via Computer Use", sourceManual: "Manual", sourceAuto: "Computer Use", current: "Current", stale: "Stale", finance: "Finance", ceo: "CEO" },
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
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualAccountId, setManualAccountId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [expenseForm, setExpenseForm] = useState({ title: "", category: "payroll", amount: "", plannedDate: "", recurrence: "one_time" });
  const t = labels[language];

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [session, balanceResponse, expenseResponse, forecastResponse] = await Promise.all([
        api<{ actor: Actor }>("/api/auth/session"),
        api<{ balances: Balance[] }>("/api/balances"),
        api<{ expenses: Expense[] }>("/api/expenses"),
        api<Forecast>("/api/forecast"),
      ]);
      setActor(session.actor);
      setBalances(balanceResponse.balances);
      setExpenses(expenseResponse.expenses);
      setForecast(forecastResponse);
      setManualAccountId((current) => current || balanceResponse.balances[0]?.accountId || "");
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

  async function switchRole(role: Role) {
    await api("/api/auth/session", { method: "POST", body: JSON.stringify({ role }) });
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

  async function requestRetrieval(accountId: string) {
    try {
      const result = await api<{ message: string }>("/api/retrieval-runs", { method: "POST", body: JSON.stringify({ bankAccountId: accountId }) });
      setMessage(result.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Retrieval gagal dibuat"); }
  }

  async function submitExpense(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/expenses", { method: "POST", body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount), plannedDate: new Date(expenseForm.plannedDate).toISOString() }) });
      setExpenseForm({ title: "", category: "payroll", amount: "", plannedDate: "", recurrence: "one_time" }); setMessage("Rencana pengeluaran berhasil dibuat."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pengeluaran gagal dibuat"); }
  }

  async function updateExpense(id: string, status: "approved" | "paid") {
    try { await api(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); setMessage("Status pengeluaran diperbarui."); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status gagal diperbarui"); }
  }

  const totalCash = useMemo(() => balances.reduce((sum, item) => sum + BigInt(item.availableBalance), BigInt(0)), [balances]);
  const submitted = expenses.filter((expense) => expense.status === "submitted").reduce((sum, expense) => sum + BigInt(expense.amount), BigInt(0));
  const approved = expenses.filter((expense) => expense.status === "approved").reduce((sum, expense) => sum + BigInt(expense.amount), BigInt(0));
  const staleCount = balances.filter((balance) => balance.freshness === "stale").length;
  const baseMonths = forecast?.months.base.months ?? [];

  if (loading && !actor) return <main className="loading-screen">Memuat TKI Cash Control...</main>;
  if (!actor) return <main className="loading-screen">{error ?? "Akses belum tersedia"}</main>;

  const nav = [
    { id: "dashboard" as const, label: t.dashboard, icon: LayoutDashboard },
    { id: "accounts" as const, label: t.accounts, icon: Landmark },
    { id: "expenses" as const, label: t.expenses, icon: WalletCards },
    { id: "forecast" as const, label: t.forecast, icon: BarChart3 },
  ];

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">TKI</div><div><strong>Cash Control</strong><small>PT TKI finance room</small></div></div>
      <nav className="nav">{nav.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><Icon size={17} /><span>{item.label}</span></button>; })}</nav>
      <div className="side-note"><ShieldCheck size={16} /><br />Demo access is enabled for this internal prototype. Configure PT TKI authentication before wider deployment.<br /><br />Read-only bank monitoring. Password, OTP, CAPTCHA, and bank sessions are never stored.</div>
    </aside>
    <section className="main">
      <header className="topbar"><div><p className="kicker">{actor.role === "FINANCE" ? t.finance : t.ceo} · PT TKI</p><h1>{view === "dashboard" ? t.dashboard : nav.find((item) => item.id === view)?.label}</h1><p className="muted">Manage cash visibility, office commitments, and six-month liquidity planning.</p></div><div className="role-box"><label>Demo access</label><select value={actor.role} onChange={(event) => void switchRole(event.target.value as Role)}><option value="CEO">CEO — {t.ceo}</option><option value="FINANCE">Finance — {t.finance}</option></select><div className="action-row"><button className="button" onClick={() => setLanguage(language === "id" ? "en" : "id")}>{language === "id" ? "EN" : "ID"}</button><button className="button" onClick={() => void refresh()}><RefreshCw size={14} />Refresh</button></div></div></header>
      <div className="demo-warning"><ShieldCheck size={16} />Prototype demo mode aktif. Konfigurasikan autentikasi PT TKI sebelum deployment lebih luas.</div>
      {(message || error) && <div className={error ? "notice error" : "notice"}><CircleAlert size={17} />{error ?? message}<button onClick={() => { setError(null); setMessage(null); }}>×</button></div>}

      {view === "dashboard" && <>
        <div className="metric-grid"><section className="metric teal"><small>{t.balance}</small><strong>{formatMoney(totalCash)}</strong><span>{balances.length} rekening terdaftar</span></section><section className="metric purple"><small>Submitted expenses</small><strong>{formatMoney(submitted)}</strong><span>Menunggu approval</span></section><section className="metric orange"><small>Approved expenses</small><strong>{formatMoney(approved)}</strong><span>Menunggu pembayaran</span></section><section className="metric"><small>Stale balances</small><strong>{staleCount}</strong><span>Perlu retrieval atau input manual</span></section></div>
        <div className="grid"><BalancePanel balances={balances} role={actor.role} t={t} onManual={(id) => { setManualAccountId(id); setView("accounts"); }} onRetrieve={(id) => void requestRetrieval(id)} /><ForecastPanel months={baseMonths} t={t} /></div>
        <div className="grid"><ExpensePanel expenses={expenses.slice(0, 5)} onUpdate={updateExpense} role={actor.role} /><section className="panel"><div className="panel-heading"><div><h2>Security boundary</h2><p>Current operational guardrails</p></div><ShieldCheck color="var(--accent)" size={22} /></div><div className="list-stack"><div className="expense-row"><div><strong>Portal access</strong><small>Read-only, human-in-the-loop</small></div><span className="pill auto">Protected</span></div><div className="expense-row"><div><strong>Bank credentials</strong><small>Never sent to this app</small></div><span className="pill auto">Not stored</span></div><div className="expense-row"><div><strong>Transfers</strong><small>No payment or transfer API</small></div><span className="pill">Disabled</span></div></div></section></div>
      </>}

      {view === "accounts" && <div className="grid"><BalancePanel balances={balances} role={actor.role} t={t} onManual={(id) => setManualAccountId(id)} onRetrieve={(id) => void requestRetrieval(id)} /><ManualBalanceForm balances={balances} accountId={manualAccountId} setAccountId={setManualAccountId} amount={manualAmount} setAmount={setManualAmount} note={manualNote} setNote={setManualNote} onSubmit={submitManualBalance} t={t} role={actor.role} /></div>}
      {view === "expenses" && <div className="grid"><ExpensePanel expenses={expenses} onUpdate={updateExpense} role={actor.role} /><ExpenseForm form={expenseForm} setForm={setExpenseForm} onSubmit={submitExpense} role={actor.role} /></div>}
      {view === "forecast" && <div className="grid"><ForecastPanel months={baseMonths} t={t} /><section className="panel"><div className="panel-heading"><div><h2>Scenario planning</h2><p>Forecast is deterministic and input-driven.</p></div><FileSpreadsheet size={22} color="var(--accent)" /></div><p className="muted">Base, optimistic, and conservative scenarios are available through the forecast API. Cash movement recommendations are informational only; no transfer is executed.</p><div className="action-row"><a className="button primary" href="/api/reports/export.xlsx"><FileSpreadsheet size={15} />Export Excel</a></div></section></div>}
    </section>
  </main>;
}

function BalancePanel({ balances, role, t, onManual, onRetrieve }: { balances: Balance[]; role: Role; t: typeof labels.id; onManual: (id: string) => void; onRetrieve: (id: string) => void }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{t.accounts}</h2><p>Latest available balance by account</p></div><span className="pill"><Landmark size={13} />{balances.length} accounts</span></div><div className="balance-list">{balances.map((balance) => <div className="balance-card" key={balance.accountId}><div className="balance-name"><strong>{balance.bank} · {balance.displayName}</strong><small>{formatAccount(balance.accountNumber)} · {balance.capturedAt ? date.format(new Date(balance.capturedAt)) : "Belum ada data"}</small><span className={balance.source === "manual" ? "pill manual" : "pill auto"}>{balance.source === "manual" ? t.sourceManual : t.sourceAuto} · {balance.freshness === "current" ? t.current : t.stale}</span></div><div className="balance-value"><strong>{formatMoney(balance.availableBalance)}</strong>{role === "FINANCE" && <div className="action-row"><button className="button" onClick={() => onManual(balance.accountId)}><Plus size={13} />Manual</button><button className="button secondary" onClick={() => onRetrieve(balance.accountId)}><LogIn size={13} />Portal</button></div>}</div></div>)}</div></section>;
}

function ManualBalanceForm({ balances, accountId, setAccountId, amount, setAmount, note, setNote, onSubmit, t, role }: { balances: Balance[]; accountId: string; setAccountId: (value: string) => void; amount: string; setAmount: (value: string) => void; note: string; setNote: (value: string) => void; onSubmit: (event: FormEvent) => void; t: typeof labels.id; role: Role }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{t.manual}</h2><p>Finance-only, immutable balance snapshot</p></div><Banknote color="var(--warning)" /></div>{role !== "FINANCE" ? <div className="empty">Mode CEO hanya dapat membaca saldo.</div> : <form className="form-grid" onSubmit={onSubmit}><label className="field full"><span>Rekening</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)} required>{balances.map((balance) => <option key={balance.accountId} value={balance.accountId}>{balance.bank} · {balance.displayName}</option>)}</select></label><label className="field full"><span>Available balance (IDR)</span><input inputMode="numeric" type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Contoh: 125000000" required /></label><label className="field full"><span>Catatan (opsional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Sumber pengecekan saldo" /></label><div className="form-actions"><button className="button primary" type="submit"><CheckCircle2 size={15} />Simpan saldo manual</button></div></form>}</section>;
}

function ForecastPanel({ months, t }: { months: ForecastMonth[]; t: typeof labels.id }) {
  const max = Math.max(...months.map((month) => Number(month.closingBalance)), 1);
  return <section className="panel"><div className="panel-heading"><div><h2>{t.forecast}</h2><p>Base scenario · IDR</p></div><BarChart3 color="var(--accent-2)" /></div>{months.length ? <div className="chart-wrap">{months.map((month) => <div className="bar-row" key={month.month}><span>{month.month}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, Math.min(100, Number(month.closingBalance) / max * 100))}%` }} /></div><b>{formatMoney(month.closingBalance)}</b></div>)}</div> : <div className="empty">Belum ada data forecast.</div>}</section>;
}

function ExpensePanel({ expenses, onUpdate, role }: { expenses: Expense[]; onUpdate: (id: string, status: "approved" | "paid") => void; role: Role }) {
  return <section className="panel"><div className="panel-heading"><div><h2>Expense planning</h2><p>Submitted · approved · paid</p></div><WalletCards color="var(--warning)" /></div>{expenses.length ? <div className="expense-list">{expenses.map((expense) => <div className="expense-row" key={expense.id}><div><strong>{expense.title}</strong><small>{expense.category} · {new Date(expense.plannedDate).toLocaleDateString("id-ID")}</small></div><div className="balance-value"><strong>{formatMoney(expense.amount)}</strong><span className={`status ${expense.status}`}>{expense.status}</span>{role === "FINANCE" && expense.status !== "paid" && <div className="action-row"><button className="button" onClick={() => onUpdate(expense.id, expense.status === "submitted" ? "approved" : "paid")}>{expense.status === "submitted" ? "Approve" : "Mark paid"}</button></div>}</div></div>)}</div> : <div className="empty">Belum ada rencana pengeluaran.</div>}</section>;
}

function ExpenseForm({ form, setForm, onSubmit, role }: { form: { title: string; category: string; amount: string; plannedDate: string; recurrence: string }; setForm: (value: { title: string; category: string; amount: string; plannedDate: string; recurrence: string }) => void; onSubmit: (event: FormEvent) => void; role: Role }) {
  return <section className="panel"><div className="panel-heading"><div><h2>Tambah expense</h2><p>Finance-only planning input</p></div><WalletCards /></div>{role !== "FINANCE" ? <div className="empty">Mode CEO hanya dapat membaca rencana pengeluaran.</div> : <form className="form-grid" onSubmit={onSubmit}><label className="field full"><span>Judul</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label><label className="field"><span>Kategori</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="payroll">Payroll</option><option value="vendors">Vendors</option><option value="infrastructure">Infrastructure</option><option value="taxes">Taxes</option><option value="employee_bonus">Employee bonus</option><option value="other">Other</option></select></label><label className="field"><span>Recurring</span><select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value })}><option value="one_time">One-time</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></label><label className="field"><span>Amount (IDR)</span><input type="number" min="0" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label><label className="field"><span>Planned date</span><input type="date" value={form.plannedDate} onChange={(event) => setForm({ ...form, plannedDate: event.target.value })} required /></label><div className="form-actions"><button type="submit" className="button primary"><Plus size={15} />Submit expense</button></div></form>}</section>;
}
