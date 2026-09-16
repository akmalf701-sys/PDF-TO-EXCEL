import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, PlayCircle, Shield, Building2, Sparkles, Loader2 } from 'lucide-react';
import { SupportedBank } from '../types';
import { SUPPORTED_BANKS, SAMPLE_BANK_STATEMENTS } from '../data/bankPresets';

interface UploadAreaProps {
  onFileSelected: (file: File, bankHint: SupportedBank) => Promise<void>;
  onLoadSample: (sampleId: string) => void;
  isLoading: boolean;
  loadingStep: string;
  loadingProgress: number;
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  onFileSelected,
  onLoadSample,
  isLoading,
  loadingStep,
  loadingProgress
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedBank, setSelectedBank] = useState<SupportedBank>('AUTO');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setErrorMessage(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndProcess(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const validateAndProcess = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Hanya file dokumen berekstensi .PDF yang diperbolehkan.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal adalah 25MB.');
      return;
    }

    onFileSelected(file, selectedBank);
  };

  return (
    <div className="w-full space-y-6">
      {/* Bank Selection Ribbon */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Target Template Perbankan</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih bank spesifik atau gunakan Auto-Detect untuk ekstraksi dinamis
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
            Regex Engine: v2.4 Indonesian Banking
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {SUPPORTED_BANKS.map((b) => {
            const isSelected = selectedBank === b.id;
            return (
              <button
                key={b.id}
                id={`bank-btn-${b.id.toLowerCase()}`}
                type="button"
                onClick={() => setSelectedBank(b.id)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{b.id}</span>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                    {b.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{b.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Drag & Drop Area */}
      <div
        id="pdf-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/60 scale-[1.005]'
            : 'border-slate-300 hover:border-slate-400 bg-white shadow-xs'
        } ${isLoading ? 'pointer-events-none opacity-90' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="pdf-file-input"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {isLoading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin flex items-center justify-center"></div>
              <Sparkles className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto" />
            </div>

            <div className="max-w-md w-full space-y-2">
              <h3 className="text-base font-semibold text-slate-900">
                Memproses Dokumen Rekening Koran
              </h3>
              <p className="text-xs text-slate-500 font-mono tracking-tight animate-pulse">
                {loadingStep}
              </p>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-400">
                In-Memory processing aktif • Nol penulisan ke disk server
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Tarik & Lepaskan File PDF Rekening Koran di Sini
              </h3>
              <p className="text-xs text-slate-500">
                atau <span className="text-emerald-600 font-semibold underline underline-offset-2">pilih file dari komputer</span> (Maksimal 25MB)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Multi-line Notes Stitching
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Normalisasi Angka IDR
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Ekspor ke Excel (.xlsx) Sejati
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Quick Test Drive with Sample Statements */}
      <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">
              Uji Coba Cepat dengan Rekening Koran Contoh (Sample Preset)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Tidak punya PDF perbankan saat ini? Gunakan data contoh di bawah:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_BANK_STATEMENTS.map((sample) => (
            <button
              key={sample.id}
              id={`load-sample-${sample.bank.toLowerCase()}`}
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample(sample.id);
              }}
              className="p-3 bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs rounded-xl text-left transition-all group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  {sample.name}
                </span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {sample.transactions.length} Baris
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                {sample.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
