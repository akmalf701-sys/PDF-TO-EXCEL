import React, { useState } from 'react';
import { Header } from './components/Header';
import { UploadArea } from './components/UploadArea';
import { StatementPreview } from './components/StatementPreview';
import { ArchitectureHub } from './components/ArchitectureHub';
import { ParseResult, SupportedBank } from './types';
import { parsePdfFile } from './utils/pdfParser';
import { SAMPLE_BANK_STATEMENTS } from './data/bankPresets';
import { ShieldCheck, FileSpreadsheet, Lock, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'blueprint'>('converter');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Mempersiapkan parser...');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Proses upload file PDF nyata
  const handleFileSelected = async (file: File, bankHint: SupportedBank) => {
    setIsLoading(true);
    setLoadingProgress(15);
    setLoadingStep('Membaca stream biner file PDF ke dalam memori...');

    try {
      await new Promise((res) => setTimeout(res, 300));
      setLoadingProgress(45);
      setLoadingStep('Mengekstrak layout tabel, mendeteksi header berulang & multi-line description...');

      await new Promise((res) => setTimeout(res, 350));
      setLoadingProgress(75);
      setLoadingStep('Menstandarkan format nominal Indonesia & memvalidasi rekonsiliasi saldo...');

      const parsed = await parsePdfFile(file, bankHint);

      setLoadingProgress(95);
      setLoadingStep('Menyusun pratinjau data dan struktur lembar kerja Excel...');
      await new Promise((res) => setTimeout(res, 200));

      setLoadingProgress(100);
      setResult(parsed);
    } catch (err: any) {
      console.error('Error parsing PDF:', err);
      alert('Gagal memproses file PDF: ' + (err.message || 'Format tidak dikenali'));
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  // Muat data sampel perbankan untuk uji coba instan
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_BANK_STATEMENTS.find((s) => s.id === sampleId);
    if (!sample) return;

    setIsLoading(true);
    setLoadingProgress(30);
    setLoadingStep(`Memuat data rekening koran contoh: ${sample.name}...`);

    setTimeout(() => {
      setLoadingProgress(70);
      setLoadingStep('Menyaring baris transaksi dan menstandarkan format numerik...');

      setTimeout(() => {
        setLoadingProgress(100);
        setResult({
          summary: sample.summary,
          transactions: sample.transactions,
          fileName: `${sample.bank.toLowerCase()}_statement_sample.pdf`,
          fileSize: 450 * 1024,
          processedAt: new Date().toISOString(),
          methodUsed: 'sample_template'
        });
        setIsLoading(false);
        setLoadingProgress(0);
      }, 300);
    }, 400);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Bar */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'converter' ? (
          <div className="space-y-6">
            {/* Value Proposition Hero (only when no file is active) */}
            {!result && (
              <div className="text-center max-w-3xl mx-auto space-y-3 pt-2 pb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Spesialis Rekening Koran Perbankan Indonesia</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Konversi PDF Rekening Koran ke Excel{' '}
                  <span className="text-emerald-600">(.xlsx) Rapi & Akurat</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                  Ekstraksi cerdas untuk tabel bank yang rumit, header berulang, dan catatan transaksi multi-baris (BCA, Mandiri, BRI, BNI). Data otomatis bersih dan siap dianalisis di Excel.
                </p>
              </div>
            )}

            {/* Main Interactive Screen */}
            {!result ? (
              <UploadArea
                onFileSelected={handleFileSelected}
                onLoadSample={handleLoadSample}
                isLoading={isLoading}
                loadingStep={loadingStep}
                loadingProgress={loadingProgress}
              />
            ) : (
              <StatementPreview result={result} onReset={handleReset} />
            )}
          </div>
        ) : (
          <ArchitectureHub />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Privasi Perbankan Terjamin: Seluruh proses PDF dieksekusi secara lokal di memori (in-memory) tanpa penyimpanan permanen.
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI • pdfplumber • Pandas • openpyxl</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
