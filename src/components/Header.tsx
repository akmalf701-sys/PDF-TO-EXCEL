import React from 'react';
import { FileSpreadsheet, Code2, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'converter' | 'blueprint';
  onTabChange: (tab: 'converter' | 'blueprint') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  Rekening<span className="text-emerald-600">Koran</span>
                </span>
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  SaaS Ready v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                PDF Bank Statement to Excel (.xlsx) Converter & Cleaner
              </p>
            </div>
          </div>

          {/* Center/Right Nav Tabs */}
          <div className="flex items-center gap-3">
            {/* Privacy Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero Disk Retention (In-Memory)</span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                id="tab-converter-btn"
                type="button"
                onClick={() => onTabChange('converter')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'converter'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Converter</span>
              </button>

              <button
                id="tab-blueprint-btn"
                type="button"
                onClick={() => onTabChange('blueprint')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'blueprint'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Blueprint & Python Code</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
