export interface Transaction {
  id: string;
  tanggal: string; // e.g. "01/08/2024" or "2024-08-01"
  keterangan: string; // Multi-line cleaned description
  cabang?: string;
  mutasiDebit: number; // 0 if none
  mutasiKredit: number; // 0 if none
  tipe: 'DB' | 'CR';
  saldo: number;
  barisAsli?: number;
}

export interface StatementSummary {
  bankName: string;
  accountNumber?: string;
  accountHolder?: string;
  period?: string;
  currency?: string;
  saldoAwal: number;
  totalDebit: number;
  totalKredit: number;
  saldoAkhir: number;
  transactionCount: number;
  isBalanced?: boolean;
}

export interface ParseResult {
  summary: StatementSummary;
  transactions: Transaction[];
  rawText?: string;
  fileName: string;
  fileSize: number;
  processedAt: string;
  methodUsed: 'native_pdf' | 'ocr_fallback' | 'sample_template';
}

export type SupportedBank = 'BCA' | 'MANDIRI' | 'BNI' | 'BRI' | 'AUTO';

export interface BankConfig {
  id: SupportedBank;
  name: string;
  color: string;
  badge: string;
  dateFormats: string[];
  description: string;
}
