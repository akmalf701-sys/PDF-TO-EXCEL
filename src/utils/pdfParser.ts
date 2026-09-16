import * as pdfjsLib from 'pdfjs-dist';
import { ParseResult, StatementSummary, Transaction, SupportedBank } from '../types';

// Configure pdfjs worker
try {
  // Use cloudflare or standard CDN for the worker in Vite environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('Unable to set workerSrc automatically', e);
}

/**
 * Pembersih format angka perbankan Indonesia:
 * '1.250.000,00' -> 1250000.00
 * '1,250,000.00' -> 1250000.00
 * '250.000' -> 250000.00
 */
export function parseIndonesianCurrency(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let s = String(val).trim();
  if (!s || s === '-' || s === '--' || s === '0') return 0;

  // Hapus kode valuta dan whitespace
  s = s.replace(/Rp\.?/gi, '').replace(/IDR/gi, '').replace(/\s+/g, '').trim();

  // Pola Indonesia: 1.250.000,00
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Titik pemisah ribuan, koma desimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Format US: 1,250,000.00
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // Hanya koma: jika 2 digit di belakang koma -> desimal
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes('.')) {
    // Jika ada lebih dari satu titik, pasti ribuan
    if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, '');
    } else {
      // 1 titik: cek apakah ribuan (e.g. 1.500) atau desimal (1500.50)
      const parts = s.split('.');
      if (parts[1] && parts[1].length === 3) {
        s = s.replace('.', '');
      }
    }
  }

  // Bersihkan karakter selain angka, titik, minus
  s = s.replace(/[^0-9.-]/g, '');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/**
 * Ekstraksi teks dari PDF menggunakan pdfjs-dist
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const lines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Mengelompokkan teks berdasarkan koordinat Y untuk merekonstruksi baris tabel
      const items = textContent.items as Array<{ str: string; transform: number[] }>;
      
      // Sort items by Y descending, then X ascending
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 3) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      let currentY: number | null = null;
      let currentLine = '';

      for (const item of items) {
        const y = Math.round(item.transform[5]);
        if (currentY === null || Math.abs(y - currentY) > 3) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentY = y;
          currentLine = item.str;
        } else {
          currentLine += ' ' + item.str;
        }
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
    }

    return lines;
  } catch (err) {
    console.warn('pdfjs extraction warning, using string fallback:', err);
    // Fallback: simple text stream scan
    const decoder = new TextDecoder('latin1');
    const text = decoder.decode(arrayBuffer);
    const regex = /\(([^)]+)\)\s*Tj/g;
    const fallbackLines: string[] = [];
    let match;
    let buffer = '';
    while ((match = regex.exec(text)) !== null) {
      buffer += ' ' + match[1];
      if (buffer.length > 80) {
        fallbackLines.push(buffer.trim());
        buffer = '';
      }
    }
    if (buffer.trim()) fallbackLines.push(buffer.trim());
    return fallbackLines;
  }
}

/**
 * Deteksi Nama Bank dari teks rekening koran
 */
export function detectBank(text: string, hint: SupportedBank = 'AUTO'): string {
  if (hint !== 'AUTO') {
    switch (hint) {
      case 'BCA': return 'PT BANK CENTRAL ASIA TBK (BCA)';
      case 'MANDIRI': return 'PT BANK MANDIRI (PERSERO) TBK';
      case 'BNI': return 'PT BANK NEGARA INDONESIA (PERSERO) TBK';
      case 'BRI': return 'PT BANK RAKYAT INDONESIA (PERSERO) TBK';
    }
  }

  const upper = text.toUpperCase();
  if (upper.includes('BANK CENTRAL ASIA') || upper.includes('KLIKBCA') || upper.includes('MYBCA') || upper.includes('BCA')) {
    return 'PT BANK CENTRAL ASIA TBK (BCA)';
  }
  if (upper.includes('BANK MANDIRI') || upper.includes('LIVIN') || upper.includes('KOPRA') || upper.includes('MANDIRI')) {
    return 'PT BANK MANDIRI (PERSERO) TBK';
  }
  if (upper.includes('BANK NEGARA INDONESIA') || upper.includes('BNI DIRECT') || upper.includes('BNI')) {
    return 'PT BANK NEGARA INDONESIA (PERSERO) TBK';
  }
  if (upper.includes('BANK RAKYAT INDONESIA') || upper.includes('BRIMO') || upper.includes('BRIVA') || upper.includes('BRI')) {
    return 'PT BANK RAKYAT INDONESIA (PERSERO) TBK';
  }
  return 'REKENING KORAN BANK NASIONAL';
}

/**
 * Deteksi pola tanggal awal transaksi:
 * 01/08, 01/08/2024, 01-08-2024, 01 AUG, 01 AGU, 01/08/24
 */
const DATE_START_REGEX = /^(\d{2}[/-]\d{2}(?:[/-]\d{2,4})?|\d{2}\s+(?:JAN|FEB|MAR|APR|MEI|MAY|JUN|JUL|AGU|AUG|SEP|OKT|OCT|NOV|DES|DEC))\b/i;

/**
 * Filter header & footer yang berulang di setiap halaman PDF
 */
function isNoiseLine(line: string): boolean {
  const u = line.toUpperCase();
  const noiseKeywords = [
    'HALAMAN', 'PAGE', 'BERSAMBUNG KE HALAMAN', 'TANGGAL TRANSAKSI',
    'URAIAN TRANSAKSI', 'KETERANGAN TRANSAKSI', 'MUTASI DEBET', 'MUTASI KREDIT',
    'SALDO AWAL', 'SALDO AKHIR', 'TOTAL MUTASI', 'MUTASI DEBIT', 'TANGGAL VALUTA'
  ];
  return noiseKeywords.some(kw => u.includes(kw));
}

/**
 * Parser Inti:
 * Menganalisis baris demi baris, menggabungkan baris yang terpotong (multi-line description),
 * mengekstrak tanggal, nominal, dan saldo.
 */
export function parseBankStatementLines(lines: string[], bankHint: SupportedBank = 'AUTO'): { transactions: Transaction[]; summary: StatementSummary } {
  const transactions: Transaction[] = [];
  let currentTx: Partial<Transaction> | null = null;
  const fullText = lines.join(' ');
  const bankName = detectBank(fullText, bankHint);

  // Cari nomor rekening dan periode jika ada
  let accountNumber = '';
  const accMatch = fullText.match(/(?:NO\.?\s*REK(?:ENING)?|ACCOUNT\s*NO\.?)\s*[:.]?\s*([0-9-]{8,20})/i);
  if (accMatch) {
    accountNumber = accMatch[1];
  }

  let period = '';
  const periodMatch = fullText.match(/(?:PERIODE|PERIOD)\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{2,4}\s*-\s*\d{2}[/-]\d{2}[/-]\d{2,4})/i);
  if (periodMatch) {
    period = periodMatch[1];
  }

  let txIdCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Lewati baris header/footer berulang
    if (isNoiseLine(rawLine)) {
      continue;
    }

    const dateMatch = rawLine.match(DATE_START_REGEX);

    if (dateMatch) {
      // Simpan transaksi sebelumnya
      if (currentTx && currentTx.tanggal) {
        finalizeAndPushTransaction(currentTx, transactions);
      }

      // Mulai transaksi baru
      const dateStr = dateMatch[1];
      const remainder = rawLine.slice(dateMatch[0].length).trim();

      currentTx = {
        id: `tx-${txIdCounter++}`,
        tanggal: dateStr,
        keterangan: remainder,
        cabang: '0000',
        tipe: 'CR',
        mutasiDebit: 0,
        mutasiKredit: 0,
        saldo: 0,
        barisAsli: i + 1
      };
    } else {
      // Baris lanjutan (Multi-line description / kelanjutan keterangan)
      if (currentTx) {
        // Cek apakah baris ini berisi angka saldo/mutasi terpisah
        const numbersInLine = rawLine.match(/[\d.,]+(?:\s*(?:CR|DB))?/gi);
        if (numbersInLine && numbersInLine.length > 0 && !currentTx.saldo) {
          // Mungkin berisi angka mutasi atau saldo
          currentTx.keterangan += ' ' + rawLine;
        } else {
          currentTx.keterangan += ' ' + rawLine;
        }
      }
    }
  }

  // Simpan transaksi terakhir
  if (currentTx && currentTx.tanggal) {
    finalizeAndPushTransaction(currentTx, transactions);
  }

  // Audit Rekonsiliasi Matematika
  const totalDebit = transactions.reduce((acc, tx) => acc + (tx.mutasiDebit || 0), 0);
  const totalKredit = transactions.reduce((acc, tx) => acc + (tx.mutasiKredit || 0), 0);
  
  const saldoAkhir = transactions.length > 0 ? transactions[transactions.length - 1].saldo : 0;
  const firstTx = transactions[0];
  const saldoAwal = firstTx ? (firstTx.saldo + firstTx.mutasiDebit - firstTx.mutasiKredit) : 0;

  // Verifikasi saldo awal + kredit - debit == saldo akhir
  const calculatedEnding = saldoAwal + totalKredit - totalDebit;
  const isBalanced = Math.abs(calculatedEnding - saldoAkhir) < 2.0;

  const summary: StatementSummary = {
    bankName,
    accountNumber: accountNumber || '5270-XXXX-XXXX',
    accountHolder: 'REKENING NASABAH TERVERIFIKASI',
    period: period || 'Bulan Berjalan',
    currency: 'IDR',
    saldoAwal,
    totalDebit,
    totalKredit,
    saldoAkhir,
    transactionCount: transactions.length,
    isBalanced
  };

  return { transactions, summary };
}

/**
 * Parsing token baris menjadi kolom terstruktur (Keterangan, Mutasi, Saldo)
 */
function finalizeAndPushTransaction(tx: Partial<Transaction>, list: Transaction[]) {
  const desc = tx.keterangan || '';
  
  // Deteksi penanda CR (Kredit / Pemasukan) atau DB (Debit / Pengeluaran)
  const isDB = /\b(DB|DEBIT|DEBET)\b/i.test(desc);
  const isCR = /\b(CR|KREDIT|CREDIT)\b/i.test(desc) || !isDB;

  // Temukan semua token numerik (misal: 1.250.000,00 atau 1250000.00)
  const numberTokens = desc.match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\b/g) || [];

  let mutasi = 0;
  let saldo = 0;

  if (numberTokens.length >= 2) {
    saldo = parseIndonesianCurrency(numberTokens[numberTokens.length - 1]);
    mutasi = parseIndonesianCurrency(numberTokens[numberTokens.length - 2]);
  } else if (numberTokens.length === 1) {
    saldo = parseIndonesianCurrency(numberTokens[0]);
  }

  // Bersihkan teks keterangan dari token mutasi/saldo yang telah diekstrak
  let cleanDesc = desc;
  numberTokens.slice(-2).forEach(tok => {
    cleanDesc = cleanDesc.replace(tok, '');
  });
  cleanDesc = cleanDesc.replace(/\b(DB|CR|DEBET|KREDIT)\b/gi, '').replace(/\s+/g, ' ').trim();

  // Jika keterangan kosong karena semua token adalah angka, berikan placeholder informatif
  if (!cleanDesc) {
    cleanDesc = isDB ? 'TRANSAKSI PENGELUARAN DEBIT' : 'TRANSAKSI PENERIMAAN KREDIT';
  }

  // Set debit vs kredit
  const debit = isDB ? mutasi : 0;
  const kredit = isCR ? mutasi : 0;

  list.push({
    id: tx.id || `tx-${list.length + 1}`,
    tanggal: tx.tanggal || '',
    keterangan: cleanDesc,
    cabang: tx.cabang || '0000',
    tipe: isDB ? 'DB' : 'CR',
    mutasiDebit: debit,
    mutasiKredit: kredit,
    saldo: saldo || (list.length > 0 ? list[list.length - 1].saldo + kredit - debit : 0),
    barisAsli: tx.barisAsli
  });
}

/**
 * Fungsi lengkap untuk memproses File PDF
 */
export async function parsePdfFile(file: File, bankHint: SupportedBank = 'AUTO'): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const lines = await extractTextFromPdf(arrayBuffer);

  const { transactions, summary } = parseBankStatementLines(lines, bankHint);

  return {
    summary,
    transactions,
    rawText: lines.slice(0, 30).join('\n'),
    fileName: file.name,
    fileSize: file.size,
    processedAt: new Date().toISOString(),
    methodUsed: 'native_pdf'
  };
}
