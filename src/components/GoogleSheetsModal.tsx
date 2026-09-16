import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  X,
  Loader2,
  Database,
  ArrowRight
} from 'lucide-react';
import { ParseResult } from '../types';
import { 
  getSavedSheetsWebhook, 
  saveSheetsWebhook, 
  syncToGoogleSheets, 
  SyncResponse,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL
} from '../utils/googleSheetsSync';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ParseResult;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  result
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getSavedSheetsWebhook());
      setSyncResult(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSync = async () => {
    if (!webhookUrl.trim()) {
      setErrorMessage('Harap masukkan URL Web App Google Apps Script.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSyncResult(null);

    // Simpan URL ke localStorage agar pengguna tidak perlu mengetik ulang
    saveSheetsWebhook(webhookUrl.trim());

    try {
      const response = await syncToGoogleSheets(webhookUrl.trim(), result, DEFAULT_SPREADSHEET_ID);
      setSyncResult(response);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Gagal mengirim data ke Google Sheets. Pastikan Web App disetel ke "Anyone" (Siapa saja).'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCodeSnippet = () => {
    const code = `var SPREADSHEET_ID = '${DEFAULT_SPREADSHEET_ID}';

function getDatabaseSpreadsheet(payload) {
  var id = (payload && payload.spreadsheetId) ? payload.spreadsheetId : SPREADSHEET_ID;
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function doPost(e) {
  try {
    var contents = '';
    if (e && e.postData && e.postData.contents) {
      contents = e.postData.contents;
    } else if (e && e.postData && typeof e.postData.getDataAsString === 'function') {
      contents = e.postData.getDataAsString();
    } else if (e && e.parameter && e.parameter.data) {
      contents = e.parameter.data;
    }
    
    var data = JSON.parse(contents);
    var ss = getDatabaseSpreadsheet(data);
    var sheetName = (data.summary && data.summary.bankName) 
      ? data.summary.bankName.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 25) 
      : 'Rekening Koran';
    
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    
    // Header jika sheet masih baru
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['No', 'Tanggal', 'Keterangan', 'Cabang', 'Tipe', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo (Rp)', 'Waktu Input']);
      sheet.getRange(1, 1, 1, 9).setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
      sheet.setRowHeight(1, 28);
    }
    
    var rows = (data.transactions || []).map(function(t, i) {
      return [
        sheet.getLastRow() + i,
        t.tanggal,
        t.keterangan,
        t.cabang || '0000',
        t.tipe,
        Number(t.mutasiDebit) || 0,
        Number(t.mutasiKredit) || 0,
        Number(t.saldo) || 0,
        Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss')
      ];
    });
    
    if (rows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, 9).setValues(rows);
      sheet.getRange(startRow, 6, rows.length, 3).setNumberFormat('#,##0.00');
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      rowsCount: rows.length, 
      sheetUrl: 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Simpan ke Google Sheets (Database)
              </h3>
              <p className="text-xs text-slate-500">
                Sinkronkan {result.transactions.length} baris transaksi ke spreadsheet Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Spreadsheet Database Indicator */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-bold text-slate-200">Database Spreadsheet Terhubung</div>
                <div className="text-[10px] font-mono text-emerald-400 truncate">
                  ID: {DEFAULT_SPREADSHEET_ID}
                </div>
              </div>
            </div>
            <a
              href={DEFAULT_SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <span>Buka Sheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Success Box */}
          {syncResult && syncResult.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Berhasil Disinkronkan ke Google Spreadsheet!</span>
              </div>
              <p className="text-xs text-emerald-700">
                {syncResult.rowsCount || result.transactions.length} baris transaksi telah ditambahkan ke sheet Anda secara otomatis.
              </p>
              {syncResult.sheetUrl && (
                <a
                  href={syncResult.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs mt-1"
                >
                  <span>Buka Google Spreadsheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Error Box */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Sinkronisasi Gagal</p>
                <p className="text-rose-700 text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Input Webhook Form */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              URL Webhook Google Apps Script
            </label>
            <div className="relative">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full text-xs font-mono p-3 pr-10 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition-all text-slate-900 placeholder:text-slate-400"
              />
              <FileSpreadsheet className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-500">
              URL ini didapatkan dari tombol <b>Deploy &gt; Web App</b> di Google Apps Script spreadsheet Anda.
            </p>
          </div>

          {/* Collapsible Instruction Guide */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full p-3.5 text-left bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-semibold text-slate-700 transition-colors"
            >
              <span>Belum punya Webhook? Lihat Panduan 3 Langkah (2 Menit)</span>
              {showInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showInstructions && (
              <div className="p-4 bg-white border-t border-slate-200 space-y-3 text-slate-600 text-xs">
                <ol className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
                  <li>Buka spreadsheet Anda di <span className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">sheets.new</span>.</li>
                  <li>Buka menu <b>Ekstensi &gt; Apps Script</b>, lalu tempelkan kode di bawah ini pada file <b>Code.gs</b>:</li>
                </ol>

                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-36">
                    {`function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var sheet = ss.getSheetByName("Rekening Koran") || ss.insertSheet("Rekening Koran");
  // Simpan data transaksi
  var rows = (data.transactions || []).map(function(t, i) {
    return [i+1, t.tanggal, t.keterangan, t.tipe, t.mutasiDebit, t.mutasiKredit, t.saldo, new Date()];
  });
  if (rows.length > 0) sheet.getRange(sheet.getLastRow()+1, 1, rows.length, 8).setValues(rows);
  return ContentService.createTextOutput(JSON.stringify({success:true, rowsCount:rows.length})).setMimeType(ContentService.MimeType.JSON);
}`}
                  </pre>
                  <button
                    type="button"
                    onClick={copyCodeSnippet}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[10px] flex items-center gap-1 font-mono transition-colors"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'Tersalin' : 'Salin Kode'}</span>
                  </button>
                </div>

                <ol start={3} className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
                  <li>Klik tombol <b>Terapkan (Deploy) &gt; Deployment baru &gt; Aplikasi Web</b>.</li>
                  <li>Atur <b>Yang memiliki akses (Who has access)</b> menjadi <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">Siapa saja (Anyone)</span>.</li>
                  <li><i>(Penting)</i> Jika sudah pernah deploy sebelumnya, buka <b>Terapkan &gt; Kelola deployment</b>, klik <b>Edit (Pensil)</b>, pilih <b>Versi Baru</b>, lalu Deploy.</li>
                  <li>Salin Web App URL dan tempelkan ke kotak di atas!</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSubmitting || !webhookUrl.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mengirim ke Google Sheets...</span>
              </>
            ) : (
              <>
                <span>Kirim ke Google Sheets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
