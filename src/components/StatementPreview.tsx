import React, { useState, useMemo } from 'react';
import { 
  Download, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet, 
  Building, 
  Calendar, 
  Hash, 
  Filter,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  Database
} from 'lucide-react';
import { ParseResult, Transaction } from '../types';
import { exportStatementToExcel } from '../utils/excelExporter';
import { GoogleSheetsModal } from './GoogleSheetsModal';

interface StatementPreviewProps {
  result: ParseResult;
  onReset: () => void;
}

export const StatementPreview: React.FC<StatementPreviewProps> = ({ result, onReset }) => {
  const { summary, transactions } = result;

  // View state
  const [previewLimit, setPreviewLimit] = useState<'5' | '10' | 'all'>('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DB' | 'CR'>('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Formatter uang Rupiah
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filter & search logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = 
        tx.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.tanggal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.cabang && tx.cabang.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = 
        filterType === 'ALL' ? true : tx.tipe === filterType;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, filterType]);

  // Sliced data based on user preference (5, 10, or all)
  const displayedTransactions = useMemo(() => {
    if (previewLimit === '5') return filteredTransactions.slice(0, 5);
    if (previewLimit === '10') return filteredTransactions.slice(0, 10);
    return filteredTransactions;
  }, [filteredTransactions, previewLimit]);

  const handleDownloadExcel = () => {
    setIsExporting(true);
    try {
      exportStatementToExcel(result);
    } catch (err) {
      console.error('Export Excel failed:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner: File Info & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                {result.fileName}
              </h2>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md">
                Pembersihan Data Selesai
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {summary.bankName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                {summary.accountNumber || 'Rekening Terverifikasi'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {summary.period}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap justify-end">
          <button
            id="reset-statement-btn"
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Unggah Ulang</span>
          </button>

          <button
            id="sync-sheets-btn"
            type="button"
            onClick={() => setIsSheetsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-2xs hover:border-emerald-400"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simpan ke Google Sheets</span>
          </button>

          <button
            id="download-excel-btn"
            type="button"
            onClick={handleDownloadExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all hover:shadow-emerald-500/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Menyusun Excel...' : 'Unduh File Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Financial Summary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kredit (Pemasukan) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Total Pemasukan (Kredit)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold font-mono tracking-tight text-emerald-700">
            {formatIDR(summary.totalKredit)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Uang masuk ke rekening
          </p>
        </div>

        {/* Total Debit (Pengeluaran) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Total Pengeluaran (Debit)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold font-mono tracking-tight text-rose-700">
            {formatIDR(summary.totalDebit)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Biaya, transfer keluar & penarikan
          </p>
        </div>

        {/* Net Cashflow */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Net Arus Kas (Selisih)</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-lg font-bold font-mono tracking-tight ${
            (summary.totalKredit - summary.totalDebit) >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {formatIDR(summary.totalKredit - summary.totalDebit)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Kredit dikurangi Debit
          </p>
        </div>

        {/* Saldo Akhir & Status Rekonsiliasi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Saldo Akhir & Audit</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold font-mono tracking-tight text-slate-900">
            {formatIDR(summary.saldoAkhir)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {summary.isBalanced ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saldo Kontinu (Valid)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Cek Saldo Awal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table Controls: Search, Filter, & Preview Slicing */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-transactions-input"
              type="text"
              placeholder="Cari transaksi (e.g. QRIS, Gaji, Vendor, Bunga)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
            />
          </div>

          {/* Type Filter & Preview Limit Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter DB/CR */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterType === 'ALL' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-500'
                }`}
              >
                Semua ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('DB')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterType === 'DB' ? 'bg-white text-rose-700 font-semibold shadow-2xs' : 'text-slate-500'
                }`}
              >
                Debit (DB)
              </button>
              <button
                type="button"
                onClick={() => setFilterType('CR')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterType === 'CR' ? 'bg-white text-emerald-700 font-semibold shadow-2xs' : 'text-slate-500'
                }`}
              >
                Kredit (CR)
              </button>
            </div>

            {/* Preview Limit Toggle (5 vs 10 vs All) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto sm:ml-0">
              <span className="hidden lg:inline text-[11px]">Pratinjau:</span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 font-medium">
                <button
                  type="button"
                  onClick={() => setPreviewLimit('5')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    previewLimit === '5' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  5 Baris
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLimit('10')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    previewLimit === '10' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  10 Baris
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLimit('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    previewLimit === 'all' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Semua ({filteredTransactions.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Informational callout for multi-line description & cleaning */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-emerald-50/60 border border-emerald-100/80 px-3 py-1.5 rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            <b>Smart Parser Aktif:</b> Keterangan transaksi multi-baris otomatis disambung (stitched), format nominal distandarkan ke angka numerik, dan baris kosong dihapus.
          </span>
        </div>
      </div>

      {/* Main Table Preview */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-28 text-center">Tanggal</th>
                <th className="py-3 px-4 min-w-[280px]">Uraian Keterangan Transaksi</th>
                <th className="py-3 px-3 w-20 text-center">Cabang</th>
                <th className="py-3 px-3 w-16 text-center">Tipe</th>
                <th className="py-3 px-4 w-36 text-right">Mutasi Debit (Rp)</th>
                <th className="py-3 px-4 w-36 text-right">Mutasi Kredit (Rp)</th>
                <th className="py-3 px-4 w-40 text-right">Saldo Akhir (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700 whitespace-nowrap">
                      {tx.tanggal}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 leading-relaxed font-medium">
                      {tx.keterangan}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {tx.cabang || '0000'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          tx.tipe === 'CR'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tx.tipe}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-rose-600 whitespace-nowrap">
                      {tx.mutasiDebit > 0 ? formatIDR(tx.mutasiDebit) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-emerald-600 whitespace-nowrap">
                      {tx.mutasiKredit > 0 ? formatIDR(tx.mutasiKredit) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatIDR(tx.saldo)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Display Count */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-900">{displayedTransactions.length}</span> dari{' '}
            <span className="font-semibold text-slate-900">{transactions.length}</span> total baris transaksi terverifikasi
          </div>

          {previewLimit !== 'all' && transactions.length > displayedTransactions.length && (
            <button
              type="button"
              onClick={() => setPreviewLimit('all')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2"
            >
              Tampilkan Seluruh {transactions.length} Transaksi
            </button>
          )}
        </div>
      </div>

      {/* Google Sheets Database Synchronization Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        result={result}
      />
    </div>
  );
};
