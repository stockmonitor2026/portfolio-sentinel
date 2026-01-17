/**
 * ═══════════════════════════════════════════════════════════════
 * 💰 DYWIDENDY_MODUL.gs - Tracker Dywidend
 * ═══════════════════════════════════════════════════════════════
 * 
 * Funkcje:
 * - Śledzenie wypłat dywidend
 * - Obliczanie yield portfela
 * - Alerty o nadchodzących wypłatach
 */

// ═══════════════════════════════════════════════════════════════
// 📋 KONFIGURACJA
// ═══════════════════════════════════════════════════════════════

const DYWIDENDY_CONFIG = {
  SHEET_DYWIDENDY: 'DYWIDENDY',
  SHEET_PORTFEL: 'PORTFEL',
  
  // Kolumny arkusza DYWIDENDY
  COL: {
    ID: 1,
    TICKER: 2,
    DATA_EX: 3,      // Ex-dividend date
    DATA_WYPLATY: 4, // Payment date
    KWOTA_NA_AKCJE: 5,
    ILOSC_AKCJI: 6,
    WALUTA: 7,
    KWOTA_TOTAL: 8,
    KWOTA_PLN: 9,
    STATUS: 10       // OCZEKIWANA, OTRZYMANA
  },
  
  // Znane spółki dywidendowe z częstotliwością
  DIVIDEND_SCHEDULE: {
    'O': { freq: 'MIESIĘCZNA', typical_yield: 5.5 },
    'VUAA': { freq: 'AKUMULUJĄCY', typical_yield: 0 },
    'META': { freq: 'KWARTALNA', typical_yield: 0.4 },
    'AAPL': { freq: 'KWARTALNA', typical_yield: 0.5 },
    'MSFT': { freq: 'KWARTALNA', typical_yield: 0.8 }
  }
};

// ═══════════════════════════════════════════════════════════════
// 🚀 GŁÓWNE FUNKCJE
// ═══════════════════════════════════════════════════════════════

/**
 * Tworzy arkusz dywidend
 */
function UTWORZ_ARKUSZ_DYWIDENDY() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DYWIDENDY_CONFIG.SHEET_DYWIDENDY);
  
  if (sheet) {
    logInfo('Arkusz DYWIDENDY już istnieje');
    return sheet;
  }
  
  sheet = ss.insertSheet(DYWIDENDY_CONFIG.SHEET_DYWIDENDY);
  
  // Nagłówki
  const headers = [
    'ID', 'TICKER', 'DATA_EX', 'DATA_WYPŁATY', 
    'KWOTA/AKCJA', 'ILOŚĆ', 'WALUTA', 'TOTAL', 'PLN', 'STATUS'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Formatowanie
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4caf50')
    .setFontColor('white');
  
  sheet.setFrozenRows(1);
  
  // Szerokości kolumn
  sheet.setColumnWidth(1, 60);   // ID
  sheet.setColumnWidth(2, 80);   // TICKER
  sheet.setColumnWidth(3, 100);  // DATA_EX
  sheet.setColumnWidth(4, 100);  // DATA_WYPŁATY
  sheet.setColumnWidth(5, 100);  // KWOTA/AKCJA
  sheet.setColumnWidth(6, 70);   // ILOŚĆ
  sheet.setColumnWidth(7, 70);   // WALUTA
  sheet.setColumnWidth(8, 100);  // TOTAL
  sheet.setColumnWidth(9, 100);  // PLN
  sheet.setColumnWidth(10, 100); // STATUS
  
  logSuccess('Utworzono arkusz DYWIDENDY');
  return sheet;
}

/**
 * Dodaje wpis o dywidendzie
 */
function DODAJ_DYWIDENDE(ticker, dataWyplaty, kwotaNaAkcje, iloscAkcji, waluta) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DYWIDENDY_CONFIG.SHEET_DYWIDENDY);
  
  if (!sheet) {
    sheet = UTWORZ_ARKUSZ_DYWIDENDY();
  }
  
  // Pobierz kurs waluty
  const kursUSD = getCachedRate_('USD');
  const kursEUR = getCachedRate_('EUR');
  
  const total = kwotaNaAkcje * iloscAkcji;
  let totalPLN = total;
  
  if (waluta === 'USD') {
    totalPLN = total * kursUSD;
  } else if (waluta === 'EUR') {
    totalPLN = total * kursEUR;
  }
  
  const id = 'DYW_' + Date.now().toString(36).toUpperCase();
  
  sheet.appendRow([
    id,
    ticker,
    '', // DATA_EX - do uzupełnienia ręcznie
    new Date(dataWyplaty),
    kwotaNaAkcje,
    iloscAkcji,
    waluta,
    total.toFixed(2),
    totalPLN.toFixed(2),
    'OTRZYMANA'
  ]);
  
  logSuccess(`Dodano dywidendę: ${ticker} - ${totalPLN.toFixed(2)} PLN`);
}

/**
 * Pobiera kurs waluty z cache lub API
 */
function getCachedRate_(currency) {
  try {
    // Spróbuj użyć funkcji z głównego modułu
    if (typeof AKTUALIZUJ_WALUTY === 'function') {
      AKTUALIZUJ_WALUTY();
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const portfel = ss.getSheetByName('PORTFEL');
    
    if (portfel) {
      if (currency === 'USD') {
        return parseFloat(portfel.getRange('N2').getValue()) || 4.0;
      } else if (currency === 'EUR') {
        return parseFloat(portfel.getRange('N3').getValue()) || 4.3;
      }
    }
  } catch (e) {
    logError(`getCachedRate_ error: ${e.message}`);
  }
  
  return currency === 'USD' ? 4.0 : 4.3;
}

// ═══════════════════════════════════════════════════════════════
// 📊 STATYSTYKI DYWIDEND
// ═══════════════════════════════════════════════════════════════

/**
 * Podsumowanie dywidend
 */
function PODSUMOWANIE_DYWIDEND() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DYWIDENDY_CONFIG.SHEET_DYWIDENDY);
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('💰 PODSUMOWANIE DYWIDEND');
  
  if (!sheet || sheet.getLastRow() < 2) {
    logInfo('   Brak wpisów o dywidendach');
    logInfo('   Użyj DODAJ_DYWIDENDE() aby dodać');
    logInfo('═══════════════════════════════════════════════════════');
    return;
  }
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  
  let totalPLN = 0;
  let thisYear = 0;
  let thisMonth = 0;
  const byTicker = {};
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  for (const row of data) {
    const ticker = row[1];
    const dataWyplaty = new Date(row[3]);
    const kwotaPLN = parseFloat(row[8]) || 0;
    const status = row[9];
    
    if (status === 'OTRZYMANA') {
      totalPLN += kwotaPLN;
      
      if (dataWyplaty.getFullYear() === currentYear) {
        thisYear += kwotaPLN;
        
        if (dataWyplaty.getMonth() === currentMonth) {
          thisMonth += kwotaPLN;
        }
      }
      
      byTicker[ticker] = (byTicker[ticker] || 0) + kwotaPLN;
    }
  }
  
  logInfo(`   💵 Dywidendy ogółem: ${totalPLN.toFixed(2)} PLN`);
  logInfo(`   📅 W tym roku: ${thisYear.toFixed(2)} PLN`);
  logInfo(`   📆 W tym miesiącu: ${thisMonth.toFixed(2)} PLN`);
  logInfo('');
  logInfo('   📊 Według tickera:');
  
  for (const [ticker, amount] of Object.entries(byTicker)) {
    logInfo(`      ${ticker}: ${amount.toFixed(2)} PLN`);
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * Oblicza yield portfela (roczny % dywidend)
 */
function OBLICZ_YIELD_PORTFELA() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const portfel = ss.getSheetByName(DYWIDENDY_CONFIG.SHEET_PORTFEL);
  const dywidendy = ss.getSheetByName(DYWIDENDY_CONFIG.SHEET_DYWIDENDY);
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('📈 YIELD PORTFELA');
  
  // Wartość portfela
  let portfolioValue = 0;
  if (portfel && portfel.getLastRow() > 1) {
    const data = portfel.getRange(2, 10, portfel.getLastRow() - 1, 1).getValues();
    for (const row of data) {
      portfolioValue += parseFloat(row[0]) || 0;
    }
  }
  
  // Dywidendy w ostatnim roku
  let annualDividends = 0;
  if (dywidendy && dywidendy.getLastRow() > 1) {
    const data = dywidendy.getRange(2, 1, dywidendy.getLastRow() - 1, 10).getValues();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    for (const row of data) {
      const dataWyplaty = new Date(row[3]);
      const kwotaPLN = parseFloat(row[8]) || 0;
      const status = row[9];
      
      if (status === 'OTRZYMANA' && dataWyplaty >= oneYearAgo) {
        annualDividends += kwotaPLN;
      }
    }
  }
  
  const yieldPercent = portfolioValue > 0 
    ? (annualDividends / portfolioValue * 100) 
    : 0;
  
  logInfo(`   💼 Wartość portfela: ${portfolioValue.toFixed(2)} PLN`);
  logInfo(`   💰 Dywidendy (12 mies.): ${annualDividends.toFixed(2)} PLN`);
  logInfo(`   📊 Yield: ${yieldPercent.toFixed(2)}%`);
  
  // Prognoza miesięczna
  const monthlyAvg = annualDividends / 12;
  logInfo(`   📅 Średnio miesięcznie: ${monthlyAvg.toFixed(2)} PLN`);
  
  logInfo('═══════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════
// 📅 KALENDARZ DYWIDEND
// ═══════════════════════════════════════════════════════════════

/**
 * Pokazuje znane harmonogramy dywidend
 */
function KALENDARZ_DYWIDEND() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const portfel = ss.getSheetByName(DYWIDENDY_CONFIG.SHEET_PORTFEL);
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('📅 KALENDARZ DYWIDEND (TWOJE SPÓŁKI)');
  
  if (!portfel || portfel.getLastRow() < 2) {
    logInfo('   Brak pozycji w portfelu');
    return;
  }
  
  const data = portfel.getRange(2, 2, portfel.getLastRow() - 1, 1).getValues();
  const tickers = [...new Set(data.flat().filter(t => t))];
  
  for (const ticker of tickers) {
    const schedule = DYWIDENDY_CONFIG.DIVIDEND_SCHEDULE[ticker];
    
    if (schedule) {
      const emoji = schedule.freq === 'MIESIĘCZNA' ? '🟢' : 
                    schedule.freq === 'KWARTALNA' ? '🔵' : '⚪';
      logInfo(`   ${emoji} ${ticker}: ${schedule.freq} (yield ~${schedule.typical_yield}%)`);
    } else {
      logInfo(`   ❓ ${ticker}: Nieznany harmonogram`);
    }
  }
  
  logInfo('');
  logInfo('   Legenda: 🟢 Miesięczna | 🔵 Kwartalna | ⚪ Akumulujący');
  logInfo('═══════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════
// 🔧 FUNKCJE POMOCNICZE
// ═══════════════════════════════════════════════════════════════

/**
 * Szybkie dodanie dywidendy z O (Realty Income)
 * O płaci miesięcznie ~$0.26/akcję
 */
function DODAJ_DYWIDENDE_O(iloscAkcji, dataWyplaty) {
  DODAJ_DYWIDENDE('O', dataWyplaty || new Date(), 0.264, iloscAkcji, 'USD');
}

/**
 * Eksportuje podsumowanie dywidend dla SENTINEL
 */
function getDividendSummaryForAI_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DYWIDENDY_CONFIG.SHEET_DYWIDENDY);
  
  if (!sheet || sheet.getLastRow() < 2) {
    return '';
  }
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  
  let totalPLN = 0;
  let thisYear = 0;
  const currentYear = new Date().getFullYear();
  
  for (const row of data) {
    const dataWyplaty = new Date(row[3]);
    const kwotaPLN = parseFloat(row[8]) || 0;
    const status = row[9];
    
    if (status === 'OTRZYMANA') {
      totalPLN += kwotaPLN;
      if (dataWyplaty.getFullYear() === currentYear) {
        thisYear += kwotaPLN;
      }
    }
  }
  
  return `💰 DYWIDENDY: Ogółem ${totalPLN.toFixed(0)} PLN, w tym roku ${thisYear.toFixed(0)} PLN\n\n`;
}

// ═══════════════════════════════════════════════════════════════
// 📡 API DYWIDEND - Automatyczne pobieranie dat z Finnhub
// ═══════════════════════════════════════════════════════════════

/**
 * 📡 Pobiera daty dywidend dla wszystkich tickerów w portfelu
 * Używa Finnhub API (darmowy plan)
 */
function POBIERZ_DATY_DYWIDEND() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const portfel = ss.getSheetByName(DYWIDENDY_CONFIG.SHEET_PORTFEL);
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('📡 POBIERANIE DAT DYWIDEND Z API');
  
  if (!portfel || portfel.getLastRow() < 2) {
    logError('Brak pozycji w portfelu');
    return;
  }
  
  // Pobierz klucz API
  const apiKey = PropertiesService.getScriptProperties().getProperty('FINNHUB_KEY');
  if (!apiKey) {
    logError('Brak klucza FINNHUB_KEY! Ustaw w Script Properties.');
    return;
  }
  
  // Upewnij się że arkusz kalendarza istnieje
  const kalendarz = UTWORZ_KALENDARZ_DIV();
  
  // Pobierz tickery
  const data = portfel.getRange(2, 2, portfel.getLastRow() - 1, 1).getValues();
  const tickers = [...new Set(data.flat().filter(t => t && t !== 'TICKER'))];
  
  logInfo(`📊 Sprawdzam ${tickers.length} tickerów...`);
  
  let found = 0;
  let errors = 0;
  
  for (const ticker of tickers) {
    try {
      const divData = fetchDividendFromFinnhub_(ticker, apiKey);
      
      if (divData && divData.length > 0) {
        // Zapisz najnowsze dane
        for (const div of divData.slice(0, 3)) { // Max 3 wpisy per ticker
          const existing = findExistingDividendEntry_(kalendarz, ticker, div.exDate);
          
          if (!existing) {
            kalendarz.appendRow([
              ticker,
              new Date(div.exDate),
              div.payDate ? new Date(div.payDate) : '',
              div.amount || 0,
              div.yield || 0,
              new Date(div.exDate) > new Date() ? '🟢 NADCHODZI' : '⚪ MINĘŁA',
              new Date() // Last updated
            ]);
            found++;
          }
        }
        logInfo(`   ✅ ${ticker}: ${divData.length} wpisów`);
      } else {
        logInfo(`   ⚪ ${ticker}: Brak danych dywidendowych`);
      }
      
      // Pauza między requestami (API limit)
      Utilities.sleep(300);
      
    } catch (e) {
      logError(`   ❌ ${ticker}: ${e.message}`);
      errors++;
    }
  }
  
  logSuccess(`📡 Pobrano ${found} nowych wpisów, ${errors} błędów`);
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * Pobiera dane dywidend z Finnhub API
 */
function fetchDividendFromFinnhub_(ticker, apiKey) {
  // Zakres dat: teraz - 3 miesiące wstecz, + 6 miesięcy w przód
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 3);
  const toDate = new Date();
  toDate.setMonth(toDate.getMonth() + 6);
  
  const from = fromDate.toISOString().split('T')[0];
  const to = toDate.toISOString().split('T')[0];
  
  const url = `https://finnhub.io/api/v1/stock/dividend?symbol=${ticker}&from=${from}&to=${to}&token=${apiKey}`;
  
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`HTTP ${response.getResponseCode()}`);
  }
  
  const data = JSON.parse(response.getContentText());
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Mapuj dane
  return data.map(d => ({
    exDate: d.exDate || d.date,
    payDate: d.payDate || d.paymentDate,
    amount: d.amount,
    yield: d.yield || 0
  })).filter(d => d.exDate);
}

/**
 * Sprawdza czy wpis już istnieje
 */
function findExistingDividendEntry_(sheet, ticker, exDate) {
  if (sheet.getLastRow() < 2) return false;
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const exDateStr = new Date(exDate).toDateString();
  
  for (const row of data) {
    if (row[0] === ticker && new Date(row[1]).toDateString() === exDateStr) {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// 🔔 ALERTY DYWIDEND
// ═══════════════════════════════════════════════════════════════

/**
 * 🔔 Sprawdza nadchodzące dywidendy i tworzy alerty
 */
function SPRAWDZ_ALERTY_DYWIDEND() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const kalendarz = ss.getSheetByName('KALENDARZ_DIV');
  const alerts = ss.getSheetByName('APPSHEET_ALERTS');
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('🔔 SPRAWDZANIE ALERTÓW DYWIDEND');
  
  if (!kalendarz || kalendarz.getLastRow() < 2) {
    logInfo('   Brak danych w kalendarzu. Uruchom POBIERZ_DATY_DYWIDEND()');
    return;
  }
  
  const now = new Date();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  
  const data = kalendarz.getRange(2, 1, kalendarz.getLastRow() - 1, 6).getValues();
  
  let alertCount = 0;
  
  for (const row of data) {
    const ticker = row[0];
    const exDate = new Date(row[1]);
    const amount = row[3];
    const status = row[5];
    
    // Sprawdź czy ex-date jest w ciągu najbliższych 7 dni
    if (exDate >= now && exDate <= in7Days && status.includes('NADCHODZI')) {
      const daysLeft = Math.ceil((exDate - now) / (1000 * 60 * 60 * 24));
      
      // Dodaj alert do APPSHEET_ALERTS jeśli istnieje
      if (alerts) {
        const alertId = `DIV-${ticker}-${exDate.toISOString().split('T')[0]}`;
        
        // Sprawdź czy alert już nie istnieje
        if (!alertExists_(alerts, alertId)) {
          alerts.appendRow([
            alertId,
            new Date(),
            '💰 DYWIDENDA',
            ticker,
            `Ex-dividend za ${daysLeft} dni! (${exDate.toLocaleDateString('pl-PL')}) - $${amount}/akcję`
          ]);
          alertCount++;
          logInfo(`   🔔 ${ticker}: Ex-date za ${daysLeft} dni`);
        }
      }
    }
  }
  
  if (alertCount === 0) {
    logInfo('   ℹ️ Brak nowych alertów dywidendowych');
  } else {
    logSuccess(`   📢 Dodano ${alertCount} nowych alertów`);
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * Sprawdza czy alert już istnieje
 */
function alertExists_(sheet, alertId) {
  if (sheet.getLastRow() < 2) return false;
  
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  return ids.includes(alertId);
}

// ═══════════════════════════════════════════════════════════════
// 📅 KALENDARZ DYWIDEND - Zarządzanie arkuszem
// ═══════════════════════════════════════════════════════════════

/**
 * Tworzy arkusz kalendarza dywidend
 */
function UTWORZ_KALENDARZ_DIV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('KALENDARZ_DIV');
  
  if (!sheet) {
    sheet = ss.insertSheet('KALENDARZ_DIV');
    
    // Nagłówki
    const headers = ['TICKER', 'EX_DATE', 'PAYMENT_DATE', 'AMOUNT', 'YIELD', 'STATUS', 'UPDATED'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Formatowanie
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#ff9800')
      .setFontColor('white');
    
    sheet.setFrozenRows(1);
    
    // Szerokości
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 80);
    sheet.setColumnWidth(5, 80);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 150);
    
    logSuccess('Utworzono arkusz KALENDARZ_DIV');
  }
  
  return sheet;
}

/**
 * 🔄 Aktualizuje status wpisów w kalendarzu
 */
function AKTUALIZUJ_KALENDARZ_DYWIDEND() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('KALENDARZ_DIV');
  
  if (!sheet || sheet.getLastRow() < 2) {
    logInfo('Najpierw uruchom POBIERZ_DATY_DYWIDEND()');
    return;
  }
  
  const now = new Date();
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  
  for (let i = 0; i < data.length; i++) {
    const exDate = new Date(data[i][1]);
    const currentStatus = data[i][5];
    const newStatus = exDate > now ? '🟢 NADCHODZI' : '⚪ MINĘŁA';
    
    if (currentStatus !== newStatus) {
      sheet.getRange(i + 2, 6).setValue(newStatus);
    }
  }
  
  logSuccess('Kalendarz zaktualizowany');
}

/**
 * ⏰ Ustawia trigger dla codziennego sprawdzania dywidend
 */
function USTAW_TRIGGER_DYWIDENDY() {
  // Usuń istniejące triggery dla tej funkcji
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'SPRAWDZ_ALERTY_DYWIDEND') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Nowy trigger - codziennie o 9:00
  ScriptApp.newTrigger('SPRAWDZ_ALERTY_DYWIDEND')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  logSuccess('Trigger dywidend ustawiony: codziennie o 9:00');
}

/**
 * 📊 Pokazuje nadchodzące dywidendy
 */
function POKAZ_NADCHODZACE_DYWIDENDY() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('KALENDARZ_DIV');
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('📅 NADCHODZĄCE DYWIDENDY');
  
  if (!sheet || sheet.getLastRow() < 2) {
    logInfo('   Brak danych. Uruchom POBIERZ_DATY_DYWIDEND()');
    return;
  }
  
  const now = new Date();
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  
  const upcoming = data
    .filter(row => new Date(row[1]) >= now)
    .sort((a, b) => new Date(a[1]) - new Date(b[1]));
  
  if (upcoming.length === 0) {
    logInfo('   Brak nadchodzących dywidend');
  } else {
    for (const row of upcoming.slice(0, 10)) {
      const ticker = row[0];
      const exDate = new Date(row[1]).toLocaleDateString('pl-PL');
      const amount = row[3];
      logInfo(`   📆 ${ticker}: ex-date ${exDate} ($${amount}/akcję)`);
    }
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * 🧪 Test modułu dywidend
 */
function TEST_DYWIDENDY() {
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('🧪 TEST MODUŁU DYWIDEND');
  
  // 1. Tworzenie arkusza
  logInfo('1. Tworzenie arkusza KALENDARZ_DIV...');
  UTWORZ_KALENDARZ_DIV();
  
  // 2. Pobieranie danych
  logInfo('2. Pobieranie dat z API...');
  POBIERZ_DATY_DYWIDEND();
  
  // 3. Sprawdzanie alertów
  logInfo('3. Sprawdzanie alertów...');
  SPRAWDZ_ALERTY_DYWIDEND();
  
  // 4. Pokazanie nadchodzących
  logInfo('4. Nadchodzące dywidendy:');
  POKAZ_NADCHODZACE_DYWIDENDY();
  
  logSuccess('🧪 TEST ZAKOŃCZONY');
  logInfo('═══════════════════════════════════════════════════════');
}
