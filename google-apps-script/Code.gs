/**
 * Rekening Koran to Google Sheets - Server Script
 * File: Code.gs
 * 
 * Petunjuk:
 * 1. Buka Google Spreadsheet baru.
 * 2. Klik menu Ekstensi (Extensions) > Apps Script.
 * 3. Hapus kode default, tempelkan seluruh kode ini di file "Code.gs".
 * 4. Buat file HTML baru dengan nama "Index.html", lalu tempelkan kode dari Index.html.
 * 5. Klik tombol "Terapkan" (Deploy) > "Deployment baru" (New deployment) > pilih "Aplikasi Web" (Web App).
 */

/**
 * Rekening Koran to Google Sheets - Server Script
 * File: Code.gs
 */

/**
 * ID Google Spreadsheet Database Target
 */
var SPREADSHEET_ID = '1the3kaLQ4cFaq8A7JyDfAO6SCtuKpGGXdvrKLEq6YWc';

function getDatabaseSpreadsheet(payload) {
  var id = (payload && payload.spreadsheetId) ? payload.spreadsheetId : SPREADSHEET_ID;
  try {
    return SpreadsheetApp.openById(id);
  } catch (e1) {
    try {
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch (e2) {
      return null;
    }
  }
}

/**
 * 1. FUNGSI UNTUK MENGIZINKAN AKSES & TES KONEKSI DATABASE
 * Pilih fungsi 'tesSimpanManual' di dropdown atas, lalu klik tombol 'Jalankan' (Run ▶️).
 * Google akan memunculkan dialog 'Tinjau Izin' (Review permissions).
 * Klik 'Lanjutan' (Advanced) > 'Buka (tidak aman)' > 'Izinkan' (Allow).
 */
function tesSimpanManual() {
  var ss = getDatabaseSpreadsheet();
  if (!ss) {
    Logger.log('ERROR: Gagal membuka spreadsheet dengan ID: ' + SPREADSHEET_ID);
    return;
  }
  var sheet = ss.getSheetByName('Rekening Koran') || ss.insertSheet('Rekening Koran');
  sheet.appendRow([
    'TEST', 
    Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'), 
    'KONEKSI DATABASE SPREADSHEET BERHASIL (ID: ' + SPREADSHEET_ID + ')', 
    '0000', 
    'CR', 
    0, 
    100000, 
    100000, 
    'DATABASE_READY'
  ]);
  Logger.log('✅ SUKSES! Baris tes berhasil ditulis langsung ke database: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit');
}

function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Rekening Koran to Google Sheets Converter')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } catch (err1) {
    try {
      return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Rekening Koran to Google Sheets Converter')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    } catch (err2) {
      return HtmlService.createHtmlOutput(
        '<div style="font-family:sans-serif;padding:24px;color:#0f172a;">' +
        '<h2>Sistem Rekening Koran Aktif</h2>' +
        '<p>Gunakan Webhook URL ini di aplikasi converter Anda untuk menyimpan transaksi.</p>' +
        '</div>'
      );
    }
  }
}

/**
 * Menyimpan seluruh data transaksi rekening koran langsung ke sheet aktif
 */
function saveStatementData(payload) {
  try {
    var ss = getDatabaseSpreadsheet(payload);

    if (!ss) {
      return { 
        success: false, 
        message: 'Gagal membuka spreadsheet target dengan ID: ' + SPREADSHEET_ID 
      };
    }

    var sheetName = payload.summary && payload.summary.bankName 
      ? payload.summary.bankName.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 25) 
      : 'Rekening Koran';
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.activate();
    }

    var summary = payload.summary || {};
    var transactions = payload.transactions || [];

    if (transactions.length === 0) {
      return { success: false, message: 'Tidak ada transaksi yang dikirim.' };
    }

    // 1. Bersihkan sheet untuk data baru yang rapi
    sheet.clear();

    // 2. Blok Judul & Metadata
    sheet.getRange('A1').setValue('LAPORAN REKENING KORAN TERVERIFIKASI')
      .setFontSize(14).setFontWeight('bold').setFontColor('#0f172a');
    
    sheet.getRange('A2').setValue('Bank: ' + (summary.bankName || 'BANK NASIONAL') + 
      ' | Periode: ' + (summary.period || '-') + 
      ' | No Rek: ' + (summary.accountNumber || '-'))
      .setFontSize(10).setFontStyle('italic').setFontColor('#64748b');

    // 3. Ringkasan Kas (Summary Cards)
    sheet.getRange('A4').setValue('Total Mutasi Debit:').setFontWeight('bold');
    sheet.getRange('B4').setValue(summary.totalDebit || 0).setNumberFormat('#,##0.00').setFontWeight('bold').setFontColor('#b91c1c');

    sheet.getRange('D4').setValue('Total Mutasi Kredit:').setFontWeight('bold');
    sheet.getRange('E4').setValue(summary.totalKredit || 0).setNumberFormat('#,##0.00').setFontWeight('bold').setFontColor('#15803d');

    sheet.getRange('G4').setValue('Saldo Akhir:').setFontWeight('bold');
    sheet.getRange('H4').setValue(summary.saldoAkhir || 0).setNumberFormat('#,##0.00').setFontWeight('bold');

    // 4. Header Tabel Transaksi (Baris 6)
    var headers = [
      'No', 'Tanggal', 'Keterangan / Uraian Transaksi', 'Cabang', 'Tipe', 
      'Mutasi Debit (Rp)', 'Mutasi Kredit (Rp)', 'Saldo Akhir (Rp)', 'Waktu Sinkronisasi'
    ];
    
    var headerRange = sheet.getRange(6, 1, 1, headers.length);
    headerRange.setValues([headers])
      .setBackground('#0f172a')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(6, 28);

    // 5. Susun Baris Data Transaksi
    var nowTimestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
    var rows = [];

    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      rows.push([
        i + 1,
        tx.tanggal || '',
        tx.keterangan || '',
        tx.cabang || '0000',
        tx.tipe || 'CR',
        Number(tx.mutasiDebit) || 0,
        Number(tx.mutasiKredit) || 0,
        Number(tx.saldo) || 0,
        nowTimestamp
      ]);
    }

    var startRow = 7;
    var dataRange = sheet.getRange(startRow, 1, rows.length, headers.length);
    dataRange.setValues(rows);

    // 6. Format Angka Numerik Excel/Sheets (#,##0.00)
    // Kolom F (Debit), G (Kredit), H (Saldo)
    sheet.getRange(startRow, 6, rows.length, 3).setNumberFormat('#,##0.00');

    // Perataan Kolom
    sheet.getRange(startRow, 1, rows.length, 1).setHorizontalAlignment('center'); // No
    sheet.getRange(startRow, 2, rows.length, 1).setHorizontalAlignment('center'); // Tanggal
    sheet.getRange(startRow, 4, rows.length, 2).setHorizontalAlignment('center'); // Cabang & Tipe
    sheet.getRange(startRow, 6, rows.length, 3).setHorizontalAlignment('right');  // Debit, Kredit, Saldo

    // Border Tipis
    dataRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    // 7. Sesuaikan Lebar Kolom
    sheet.setColumnWidth(1, 50);   // No
    sheet.setColumnWidth(2, 100);  // Tanggal
    sheet.setColumnWidth(3, 380);  // Keterangan
    sheet.setColumnWidth(4, 70);   // Cabang
    sheet.setColumnWidth(5, 60);   // Tipe
    sheet.setColumnWidth(6, 150);  // Debit
    sheet.setColumnWidth(7, 150);  // Kredit
    sheet.setColumnWidth(8, 160);  // Saldo
    sheet.setColumnWidth(9, 140);  // Waktu Sinkron

    return {
      success: true,
      rowsCount: transactions.length,
      sheetUrl: ss.getUrl(),
      sheetName: sheetName
    };
  } catch (err) {
    return {
      success: false,
      message: err.toString()
    };
  }
}

/**
 * Endpoint Webhook HTTP POST opsional (jika dipanggil dari cURL / Python luar)
 */
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

    if (!contents) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: 'Payload kosong. Tidak ada data yang diterima di e.postData.' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(contents);
    var res = saveStatementData(data);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
