import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentActor, canReadFinancialData } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const [accounts, expenses, snapshots] = await Promise.all([
    prisma.bankAccount.findMany({ include: { bank: true }, orderBy: { displayName: "asc" } }),
    prisma.expensePlan.findMany({ orderBy: { plannedDate: "asc" } }),
    prisma.balanceSnapshot.findMany({ include: { account: true }, orderBy: { capturedAt: "desc" }, take: 500 }),
  ]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PT TKI Cash Control";
  const accountSheet = workbook.addWorksheet("Bank Accounts");
  accountSheet.addRow(["Bank", "Rekening", "Nomor Rekening", "Saldo Terakhir (IDR)", "Sumber Saldo", "Waktu Capture"]);
  accounts.forEach((account) => accountSheet.addRow([account.bank.name, account.displayName, account.accountNumber, String(account.lastAvailableBalance ?? BigInt(0)), account.lastBalanceSource ?? "-", account.lastCapturedAt?.toISOString() ?? "-"]));
  const expenseSheet = workbook.addWorksheet("Expenses");
  expenseSheet.addRow(["Kode", "Judul", "Kategori", "Jumlah (IDR)", "Status", "Rencana Tanggal", "Recurring"]);
  expenses.forEach((expense) => expenseSheet.addRow([expense.code, expense.title, expense.category, String(expense.amount), expense.status, expense.plannedDate.toISOString(), expense.recurrence]));
  const historySheet = workbook.addWorksheet("Balance History");
  historySheet.addRow(["Rekening", "Saldo (IDR)", "Sumber", "Waktu Capture", "Catatan"]);
  snapshots.forEach((snapshot) => historySheet.addRow([snapshot.account.displayName, String(snapshot.availableBalance), snapshot.source, snapshot.capturedAt.toISOString(), snapshot.note ?? ""]));
  [accountSheet, expenseSheet, historySheet].forEach((sheet) => { sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17364F" } }; sheet.columns.forEach((column) => { column.width = Math.min(Math.max((column.header?.length ?? 12) + 4, 16), 34); }); });
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="tki-cash-control-${new Date().toISOString().slice(0, 10)}.xlsx"` } });
}
