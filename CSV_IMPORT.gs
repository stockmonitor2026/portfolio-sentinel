/**
 * ═══════════════════════════════════════════════════════════════
 * 📥 CSV_IMPORT.gs - Import transakcji z Trading 212
 * ═══════════════════════════════════════════════════════════════
 * 
 * Obsługuje format CSV z Trading 212:
 * - Kolumny: Action, Time, ISIN, Ticker, Name, No. of shares, 
 *            Price / share, Currency (Price / share), Exchange rate,
 *            Total, Currency (Total), etc.
 * 
 * UŻYCIE:
 * 1. Eksportuj CSV z Trading 212 (History → Export)
 * 2. Wklej zawartość do arkusza "CSV_IMPORT"
 * 3. Uruchom IMPORTUJ_TRANSAKCJE_T212()
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// 📋 KONFIGURACJA
// ═══════════════════════════════════════════════════════════════

const CSV_CONFIG = {
  // Arkusze
  SHEET_IMPORT: 'CSV_IMPORT',
  SHEET_PORTFEL: 'PORTFEL',
  
  // Mapowanie typów T212 na nasze typy
  TYPE_MAPPING: {
    // Akcje
    'AAPL': 'AKCJA', 'MSFT': 'AKCJA', 'GOOGL': 'AKCJA', 'META': 'AKCJA',
    'AMZN': 'AKCJA', 'NVDA': 'AKCJA', 'TSLA': 'AKCJA', 'IONQ': 'AKCJA',
    'SOUN': 'AKCJA', 'PLTR': 'AKCJA', 'RKLB': 'AKCJA',
    
    // ETF-y
    'VUAA': 'ETF', 'VWCE': 'ETF', 'CSPX': 'ETF', 'EQQQ': 'ETF',
    'VUSA': 'ETF', 'IUSA': 'ETF', 'SWDA': 'ETF',
    
    // REIT-y
    'O': 'REIT', 'STAG': 'REIT', 'VICI': 'REIT', 'WPC': 'REIT',
    
    // Default
    '_DEFAULT': 'AKCJA'
  },
  
  // Kolumny T212 CSV (0-indexed)
  T212_COLUMNS: {
    ACTION: 0,           // "Market buy", "Limit buy", etc.
    TIME: 1,             // Data transakcji
    ISIN: 2,             // ISIN code
    TICKER: 3,           // Symbol
    NAME: 4,             // Nazwa spółki
    SHARES: 5,           // Ilość akcji
    PRICE: 6,            // Cena za akcję
    CURRENCY_PRICE: 7,   // Waluta ceny
    EXCHANGE_RATE: 8,    // Kurs wymiany (dla PLN)
    TOTAL: 9,            // Wartość transakcji
    CURRENCY_TOTAL: 10   // Waluta totalu
  }
};

// ═══════════════════════════════════════════════════════════════
// 🎯 GŁÓWNE FUNKCJE
// ═══════════════════════════════════════════════════════════════

/**
 * Tworzy arkusz do wklejenia CSV
 */
function UTWORZ_ARKUSZ_CSV_IMPORT() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheet = ss.getSheetByName(CSV_CONFIG.SHEET_IMPORT);
  if (sheet) {
    Logger.log('⚠️ Arkusz CSV_IMPORT już istnieje');
    return;
  }
  
  sheet = ss.insertSheet(CSV_CONFIG.SHEET_IMPORT);
  
  // Nagłówki
  const headers = [
    'Action', 'Time', 'ISIN', 'Ticker', 'Name', 'No. of shares',
    'Price / share', 'Currency (Price)', 'Exchange rate', 
    'Total', 'Currency (Total)', 'Notes'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  
  // Instrukcja
  sheet.getRange('A3').setValue('📌 INSTRUKCJA:');
  sheet.getRange('A4').setValue('1. W Trading 212: History → Export → CSV');
  sheet.getRange('A5').setValue('2. Otwórz CSV w Excel/Notepad');
  sheet.getRange('A6').setValue('3. Skopiuj wszystkie wiersze (bez nagłówka)');
  sheet.getRange('A7').setValue('4. Wklej tutaj od wiersza 2');
  sheet.getRange('A8').setValue('5. Uruchom: IMPORTUJ_TRANSAKCJE_T212()');
  
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 200);
  
  Logger.log('✅ Utworzono arkusz CSV_IMPORT');
  Logger.log('📌 Wklej dane CSV od wiersza 2 i uruchom IMPORTUJ_TRANSAKCJE_T212()');
}

/**
 * Importuje transakcje z T212 CSV do arkusza PORTFEL
 */
function IMPORTUJ_TRANSAKCJE_T212() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName(CSV_CONFIG.SHEET_IMPORT);
  const portfelSheet = ss.getSheetByName(CSV_CONFIG.SHEET_PORTFEL);
  
  if (!importSheet) {
    Logger.log('❌ Brak arkusza CSV_IMPORT. Uruchom najpierw UTWORZ_ARKUSZ_CSV_IMPORT()');
    return;
  }
  
  if (!portfelSheet) {
    Logger.log('❌ Brak arkusza PORTFEL');
    return;
  }
  
  // Pobierz dane z CSV (od wiersza 2)
  const lastRow = importSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('⚠️ Brak danych do importu. Wklej CSV od wiersza 2.');
    return;
  }
  
  const csvData = importSheet.getRange(2, 1, lastRow - 1, 12).getValues();
  
  // Agreguj transakcje per ticker
  const positions = aggregateTransactions_(csvData);
  
  Logger.log(`📊 Znaleziono ${Object.keys(positions).length} unikalnych pozycji`);
  
  // Dodaj do PORTFEL
  const added = addToPortfel_(portfelSheet, positions);
  
  Logger.log(`✅ Import zakończony! Dodano/zaktualizowano ${added} pozycji.`);
  
  // Podsumowanie
  return {
    totalPositions: Object.keys(positions).length,
    added: added,
    positions: positions
  };
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Agreguje transakcje buy/sell per ticker
 */
function aggregateTransactions_(csvData) {
  const positions = {};
  
  for (const row of csvData) {
    const action = String(row[CSV_CONFIG.T212_COLUMNS.ACTION]).toLowerCase();
    const ticker = String(row[CSV_CONFIG.T212_COLUMNS.TICKER]).trim();
    const shares = parseFloat(row[CSV_CONFIG.T212_COLUMNS.SHARES]) || 0;
    const price = parseFloat(row[CSV_CONFIG.T212_COLUMNS.PRICE]) || 0;
    const currency = String(row[CSV_CONFIG.T212_COLUMNS.CURRENCY_PRICE]).trim() || 'USD';
    const exchangeRate = parseFloat(row[CSV_CONFIG.T212_COLUMNS.EXCHANGE_RATE]) || 1;
    
    // Skip empty rows or non-buy/sell
    if (!ticker || ticker === 'Ticker' || shares === 0) continue;
    
    // Tylko buy/sell (ignoruj dividends, interest, etc.)
    const isBuy = action.includes('buy');
    const isSell = action.includes('sell');
    
    if (!isBuy && !isSell) continue;
    
    // Inicjalizuj pozycję
    if (!positions[ticker]) {
      positions[ticker] = {
        ticker: ticker,
        totalShares: 0,
        totalCost: 0,
        currency: currency,
        avgExchangeRate: 0,
        exchangeRateSum: 0,
        transactionCount: 0,
        type: getTickerType_(ticker)
      };
    }
    
    const pos = positions[ticker];
    
    if (isBuy) {
      // Dodaj do pozycji
      const cost = shares * price;
      pos.totalShares += shares;
      pos.totalCost += cost;
      pos.exchangeRateSum += exchangeRate;
      pos.transactionCount++;
    } else if (isSell) {
      // Odejmij od pozycji (proporcjonalnie koszt)
      if (pos.totalShares > 0) {
        const avgPrice = pos.totalCost / pos.totalShares;
        pos.totalShares -= shares;
        pos.totalCost -= shares * avgPrice;
        
        // Nie pozwól na ujemne
        if (pos.totalShares < 0.0001) {
          pos.totalShares = 0;
          pos.totalCost = 0;
        }
      }
    }
  }
  
  // Oblicz średnie
  for (const ticker in positions) {
    const pos = positions[ticker];
    if (pos.totalShares > 0) {
      pos.avgPrice = pos.totalCost / pos.totalShares;
      pos.avgExchangeRate = pos.exchangeRateSum / pos.transactionCount;
    } else {
      // Pozycja zamknięta - usuń
      delete positions[ticker];
    }
  }
  
  return positions;
}

/**
 * Określa typ aktywu na podstawie tickera
 */
function getTickerType_(ticker) {
  return CSV_CONFIG.TYPE_MAPPING[ticker] || CSV_CONFIG.TYPE_MAPPING['_DEFAULT'];
}

/**
 * Dodaje pozycje do arkusza PORTFEL
 */
function addToPortfel_(sheet, positions) {
  // Pobierz istniejące tickery
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const existingTickers = {};
  
  if (lastRow > 1) {
    const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      const ticker = String(data[i][0]).trim();
      if (ticker) {
        existingTickers[ticker] = i + 2; // Row number
      }
    }
  }
  
  let addedCount = 0;
  
  for (const ticker in positions) {
    const pos = positions[ticker];
    
    if (existingTickers[ticker]) {
      // Aktualizuj istniejącą pozycję
      const row = existingTickers[ticker];
      sheet.getRange(row, 5).setValue(pos.totalShares);           // Ilość
      sheet.getRange(row, 6).setValue(pos.avgPrice);              // Cena zakupu
      sheet.getRange(row, 7).setValue(pos.avgExchangeRate);       // Kurs PLN
      Logger.log(`🔄 Zaktualizowano: ${ticker}`);
    } else {
      // Dodaj nową pozycję
      const newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 2).setValue(pos.ticker);              // B: Ticker
      sheet.getRange(newRow, 3).setValue(pos.type);                // C: Typ
      sheet.getRange(newRow, 4).setValue(pos.currency);            // D: Waluta
      sheet.getRange(newRow, 5).setValue(pos.totalShares);         // E: Ilość
      sheet.getRange(newRow, 6).setValue(pos.avgPrice);            // F: Cena zakupu
      sheet.getRange(newRow, 7).setValue(pos.avgExchangeRate);     // G: Kurs PLN
      Logger.log(`➕ Dodano: ${ticker} (${pos.totalShares} szt @ ${pos.avgPrice.toFixed(2)})`);
    }
    
    addedCount++;
  }
  
  return addedCount;
}

// ═══════════════════════════════════════════════════════════════
// 🧪 TEST
// ═══════════════════════════════════════════════════════════════

/**
 * Test parsowania przykładowego CSV
 */
function TEST_CSV_PARSER() {
  // Przykładowe dane T212
  const testData = [
    ['Market buy', '2024-01-15 10:30:00', 'US0378331005', 'AAPL', 'Apple Inc', 5, 180.50, 'USD', 3.95, 902.50, 'USD', ''],
    ['Market buy', '2024-02-20 14:15:00', 'US0378331005', 'AAPL', 'Apple Inc', 3, 175.00, 'USD', 4.02, 525.00, 'USD', ''],
    ['Market buy', '2024-03-10 09:45:00', 'IE00B4L5Y983', 'VUAA', 'Vanguard S&P 500', 2, 85.50, 'EUR', 4.35, 171.00, 'EUR', '']
  ];
  
  const result = aggregateTransactions_(testData);
  
  Logger.log('=== TEST RESULTS ===');
  for (const ticker in result) {
    const pos = result[ticker];
    Logger.log(`${ticker}: ${pos.totalShares} szt @ avg ${pos.avgPrice.toFixed(2)} ${pos.currency}`);
  }
  
  return result;
}

/**
 * Pokazuje instrukcję użycia
 */
function INSTRUKCJA_IMPORT_CSV() {
  const msg = `
╔══════════════════════════════════════════════════════════════╗
║  📥 IMPORT CSV z Trading 212                                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  KROK 1: W Trading 212                                       ║
║  • Otwórz History (Historia)                                 ║
║  • Kliknij 📥 Export → CSV                                   ║
║  • Pobierz plik                                              ║
║                                                              ║
║  KROK 2: W Google Sheets                                     ║
║  • Uruchom: UTWORZ_ARKUSZ_CSV_IMPORT()                       ║
║  • Otwórz plik CSV w Excelu/Notatniku                        ║
║  • Skopiuj wszystkie wiersze (bez nagłówka!)                 ║
║  • Przejdź do arkusza CSV_IMPORT                             ║
║  • Wklej od wiersza 2                                        ║
║                                                              ║
║  KROK 3: Import                                              ║
║  • Uruchom: IMPORTUJ_TRANSAKCJE_T212()                       ║
║  • Gotowe! Pozycje dodane do PORTFEL                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `;
  
  Logger.log(msg);
  return msg;
}
