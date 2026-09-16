import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Server, 
  Terminal,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { 
  ARCHITECTURE_BLUEPRINT, 
  BACKEND_FASTAPI_CODE, 
  CORE_PROCESSOR_PYTHON_CODE, 
  REQUIREMENTS_TXT, 
  DOCKERFILE_CODE 
} from '../data/pythonCodeSnippets';

type SnippetTab = 'blueprint' | 'frontend' | 'fastapi' | 'core_processor' | 'deploy';

export const ArchitectureHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SnippetTab>('blueprint');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const frontendSampleCode = `/**
 * Bagian 1: Kode Frontend (React.js Component dengan Tailwind CSS)
 * File: BankStatementUploader.tsx
 * 
 * Komponen UI modern, clean, dan minimalis untuk upload PDF rekening koran,
 * drag-and-drop, preview tabel (5-10 baris), dan download file Excel (.xlsx).
 */

import React, { useState } from 'react';
import { UploadCloud, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export const BankStatementUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle upload & panggil backend FastAPI
  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Panggil endpoint /api/parse-statement FastAPI
      const res = await fetch('http://localhost:8000/api/parse-statement?preview_rows=10', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal memproses rekening koran');
      }

      const result = await res.json();
      setSummary(result.summary);
      setPreviewData(result.preview); // 5-10 baris pertama
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Unduh file Excel langsung dari backend
  const handleDownloadExcel = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('http://localhost:8000/api/export-excel', {
      method: 'POST',
      body: formData,
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${file.name.replace('.pdf', '')}_rekening_koran.xlsx\`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white shadow-xs">
        <UploadCloud className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800">Unggah PDF Rekening Koran</h3>
        <p className="text-xs text-slate-500 mb-4">Format BCA, Mandiri, BRI, BNI (In-Memory Processing)</p>
        <input 
          type="file" 
          accept=".pdf" 
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="text-xs text-slate-600"
        />
      </div>

      {/* Preview Tabel */}
      {previewData.length > 0 && (
        <div className="bg-white border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-900">Pratinjau Data Transaksi (10 Baris Pertama)</h4>
            <button 
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-emerald-700"
            >
              <Download className="w-4 h-4" /> Unduh Excel (.xlsx)
            </button>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-2">Tanggal</th>
                <th className="p-2">Keterangan</th>
                <th className="p-2 text-right">Debit</th>
                <th className="p-2 text-right">Kredit</th>
                <th className="p-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewData.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-2 font-mono">{row.tanggal}</td>
                  <td className="p-2">{row.keterangan}</td>
                  <td className="p-2 text-right font-mono text-rose-600">{row.mutasi_debit || '-'}</td>
                  <td className="p-2 text-right font-mono text-emerald-600">{row.mutasi_kredit || '-'}</td>
                  <td className="p-2 text-right font-mono font-bold">{row.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
`;

  return (
    <div className="w-full space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
              SaaS Blueprint & Production Code
            </span>
            <span className="text-xs text-slate-400">FastAPI • pdfplumber • Pandas • openpyxl</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Arsitektur & Kode Sumber Lengkap
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Spesifikasi modular dan teruji untuk ekstraksi rekening koran perbankan Indonesia. 
            Menerapkan prinsip zero-disk retention (data diproses murni di RAM menggunakan <code className="text-emerald-300 font-mono">io.BytesIO</code>), 
            algoritma penggabungan deskripsi multi-baris, dan format numerik Excel sejati.
          </p>
        </div>

        {/* Decorative Grid Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('blueprint')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'blueprint'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>1. Blueprint Arsitektur</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('frontend')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'frontend'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Bagian 1: Frontend (React)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fastapi')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'fastapi'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Bagian 2: Backend (FastAPI)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('core_processor')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'core_processor'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Bagian 3: Core Processor (Python)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deploy')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'deploy'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Deploy & Dependencies</span>
        </button>
      </div>

      {/* Code / Content Container */}
      <div className="bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Code Header Bar */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            <span className="text-xs font-mono text-slate-400 ml-2">
              {activeTab === 'blueprint' && 'ARCHITECTURE_BLUEPRINT.md'}
              {activeTab === 'frontend' && 'BankStatementUploader.tsx'}
              {activeTab === 'fastapi' && 'main.py (FastAPI App)'}
              {activeTab === 'core_processor' && 'statement_processor.py (Core Engine)'}
              {activeTab === 'deploy' && 'requirements.txt & Dockerfile'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={() => {
                let code = '';
                if (activeTab === 'blueprint') code = ARCHITECTURE_BLUEPRINT;
                if (activeTab === 'frontend') code = frontendSampleCode;
                if (activeTab === 'fastapi') code = BACKEND_FASTAPI_CODE;
                if (activeTab === 'core_processor') code = CORE_PROCESSOR_PYTHON_CODE;
                if (activeTab === 'deploy') code = `${REQUIREMENTS_TXT}\n\n# --- DOCKERFILE ---\n${DOCKERFILE_CODE}`;
                handleCopy(code, activeTab);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              {copied === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>

            {/* Download File Button */}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'blueprint') handleDownloadFile(ARCHITECTURE_BLUEPRINT, 'ARCHITECTURE_BLUEPRINT.txt');
                if (activeTab === 'frontend') handleDownloadFile(frontendSampleCode, 'BankStatementUploader.tsx');
                if (activeTab === 'fastapi') handleDownloadFile(BACKEND_FASTAPI_CODE, 'main.py');
                if (activeTab === 'core_processor') handleDownloadFile(CORE_PROCESSOR_PYTHON_CODE, 'statement_processor.py');
                if (activeTab === 'deploy') handleDownloadFile(REQUIREMENTS_TXT, 'requirements.txt');
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File</span>
            </button>
          </div>
        </div>

        {/* Code Content Block */}
        <div className="p-5 max-h-[650px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300">
          <pre className="whitespace-pre-wrap selection:bg-emerald-900 selection:text-emerald-100">
            {activeTab === 'blueprint' && ARCHITECTURE_BLUEPRINT}
            {activeTab === 'frontend' && frontendSampleCode}
            {activeTab === 'fastapi' && BACKEND_FASTAPI_CODE}
            {activeTab === 'core_processor' && CORE_PROCESSOR_PYTHON_CODE}
            {activeTab === 'deploy' && (
              <>
                <div className="text-emerald-400 font-bold mb-2"># File: requirements.txt</div>
                {REQUIREMENTS_TXT}
                <div className="text-emerald-400 font-bold mt-6 mb-2"># File: Dockerfile</div>
                {DOCKERFILE_CODE}
              </>
            )}
          </pre>
        </div>
      </div>

      {/* Production Guide Checklist */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Kepatuhan Keamanan & Privasi Data Perbankan (Zero-Retention Policy)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">1. Memory-Only Pipeline</span>
            <p className="text-slate-500">
              PDF dibaca menggunakan <code className="font-mono text-slate-700">io.BytesIO</code> langsung di RAM tanpa pernah menyentuh file system lokal atau cache disk.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">2. Auto Multi-Line Stitching</span>
            <p className="text-slate-500">
              Menghubungkan baris catatan transaksi yang terpotong menjadi 1 kolom uraian lengkap dan rapi secara deterministik.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">3. Standarisasi Excel (.xlsx)</span>
            <p className="text-slate-500">
              Nilai rupiah diformat sebagai <code className="font-mono text-slate-700">numeric</code> (bukan string) sehingga formula <code className="font-mono text-slate-700">=SUM()</code> langsung aktif di Excel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
