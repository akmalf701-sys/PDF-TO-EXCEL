import * as XLSX from 'xlsx';
import { ParseResult, Transaction } from '../types';

export function exportStatementToExcel(result: ParseResult, customFileName?: string) {
  const { summary, transactions, fileName } = result;

  // 1. Inisialisasi Workbook
  const wb = XLSX.utils.book_new();

  // 2. Metadata & Ringkasan Akuntansi
  const metaRows = [
    ['LAPORAN REKENING KORAN TERVERIFIKASI'],
    ['Bank:', summary.bankName || 'BANK NASIONAL'],
    ['No. Rekening:', summary.accountNumber || '-'],
    ['Nama Pemilik:', summary.accountHolder || '-'],
    ['Periode:', summary.period || '-'],
    ['Mata Uang:', summary.currency || 'IDR'],
    ['Status Rekonsiliasi:', summary.isBalanced ? 'SEIMBANG / BALANCED' : 'PERLU PENYESUAIAN'],
    [],
    ['RINGKASAN KAS & MUTASI'],
    ['Saldo Awal Estimasi (Rp):', summary.saldoAwal],
    ['Total Mutasi Debit / Pengeluaran (Rp):', summary.totalDebit],
    ['Total Mutasi Kredit / Pemasukan (Rp):', summary.totalKredit],
    ['Net Cashflow (Rp):', summary.totalKredit - summary.totalDebit],
    ['Saldo Akhir (Rp):', summary.saldoAkhir],
    ['Total Transaksi:', summary.transactionCount],
    [],
    // Row 17: Table Headers
    ['No', 'Tanggal', 'Keterangan / Uraian Transaksi', 'Cabang', 'Tipe', 'Mutasi Debit (Rp)', 'Mutasi Kredit (Rp)', 'Saldo Akhir (Rp)']
  ];

  // 3. Tambahkan baris-baris transaksi
  const dataRows = transactions.map((tx, idx) => [
    idx + 1,
    tx.tanggal,
    tx.keterangan,
    tx.cabang || '0000',
    tx.tipe,
    tx.mutasiDebit,
    tx.mutasiKredit,
    tx.saldo
  ]);

  const allRows = [...metaRows, ...dataRows];

  // 4. Konversi ke Worksheet
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // 5. Atur lebar kolom agar rapi dan mudah dibaca di Excel
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Tanggal
    { wch: 48 }, // Keterangan
    { wch: 10 }, // Cabang
    { wch: 8 },  // Tipe
    { wch: 22 }, // Debit
    { wch: 22 }, // Kredit
    { wch: 24 }, // Saldo
  ];

  // 6. Format tipe numerik untuk angka mutasi & saldo agar terbaca sebagai number di Excel
  const startRowIdx = 18; // 1-indexed row for data start in Excel
  for (let i = 0; i < transactions.length; i++) {
    const rowNum = startRowIdx + i;
    // Kolom F (Debit), G (Kredit), H (Saldo)
    ['F', 'G', 'H'].forEach((col) => {
      const cellAddress = `${col}${rowNum}`;
      if (ws[cellAddress]) {
        ws[cellAddress].t = 'n'; // Numeric type
        ws[cellAddress].z = '#,##0.00'; // Excel currency format
      }
    });
  }

  // Format angka pada tabel ringkasan
  if (ws['B10']) { ws['B10'].t = 'n'; ws['B10'].z = '#,##0.00'; }
  if (ws['B11']) { ws['B11'].t = 'n'; ws['B11'].z = '#,##0.00'; }
  if (ws['B12']) { ws['B12'].t = 'n'; ws['B12'].z = '#,##0.00'; }
  if (ws['B13']) { ws['B13'].t = 'n'; ws['B13'].z = '#,##0.00'; }
  if (ws['B14']) { ws['B14'].t = 'n'; ws['B14'].z = '#,##0.00'; }

  // 7. Masukkan sheet ke workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Rekening Koran');

  // 8. Trigger Download ke pengguna
  const rawBaseName = (customFileName || fileName || 'rekening_koran').replace(/\.[^/.]+$/, '');
  const finalFileName = `${rawBaseName}_converted.xlsx`;
  
  XLSX.writeFile(wb, finalFileName);
}
