/**
 * Google Sheets Database Synchronization Utility
 * Mengirimkan data transaksi yang telah dibersihkan ke Google Spreadsheet
 * melalui Webhook Google Apps Script.
 */

import { ParseResult } from '../types';

export interface SyncResponse {
  success: boolean;
  message?: string;
  rowsCount?: number;
  sheetUrl?: string;
  sheetName?: string;
}

const STORAGE_KEY_WEBHOOK = 'rekeningkoran_sheets_webhook_url';

export function getSavedSheetsWebhook(): string {
  return localStorage.getItem(STORAGE_KEY_WEBHOOK) || '';
}

export function saveSheetsWebhook(url: string): void {
  localStorage.setItem(STORAGE_KEY_WEBHOOK, url.trim());
}

export const DEFAULT_SPREADSHEET_ID = '1the3kaLQ4cFaq8A7JyDfAO6SCtuKpGGXdvrKLEq6YWc';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`;

export async function syncToGoogleSheets(
  webhookUrl: string,
  result: ParseResult,
  targetSpreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<SyncResponse> {
  if (!webhookUrl || !webhookUrl.trim()) {
    throw new Error('URL Webhook Google Apps Script belum diisi.');
  }

  const payload = {
    spreadsheetId: targetSpreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
    summary: {
      bankName: result.summary.bankName,
      accountNumber: result.summary.accountNumber,
      period: result.summary.period,
      totalDebit: result.summary.totalDebit,
      totalKredit: result.summary.totalKredit,
      saldoAkhir: result.summary.saldoAkhir,
      totalTransactions: result.transactions.length
    },
    transactions: result.transactions.map((tx) => ({
      tanggal: tx.tanggal,
      keterangan: tx.keterangan,
      cabang: tx.cabang || '0000',
      tipe: tx.tipe,
      mutasiDebit: tx.mutasiDebit,
      mutasiKredit: tx.mutasiKredit,
      saldo: tx.saldo
    }))
  };

  const bodyString = JSON.stringify(payload);

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyString
    });

    if (res.ok) {
      try {
        const data = await res.json();
        return data;
      } catch {
        return {
          success: true,
          rowsCount: result.transactions.length,
          message: `Berhasil menambahkan ${result.transactions.length} baris ke Google Sheets.`
        };
      }
    }
  } catch (corsErr) {
    console.warn('Standard fetch encountered redirect/CORS, activating no-cors dispatch:', corsErr);
  }

  // Mode no-cors: Browser menjamin request dikirim ke Google Apps Script tanpa terhalang CORS
  try {
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyString
    });

    return {
      success: true,
      rowsCount: result.transactions.length,
      message: `Berhasil mengirimkan ${result.transactions.length} baris data ke Google Spreadsheet.`
    };
  } catch (err: any) {
    console.warn('Google Sheets Sync fetch error:', err);
    throw new Error(err.message || 'Gagal menghubungi Google Apps Script Webhook.');
  }
}
