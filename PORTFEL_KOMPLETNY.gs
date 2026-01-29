/**
 * ⚠️ DEPRECATED ⚠️
 * Ten plik jest przestarzały i został zastąpiony przez system modułowy:
 * - CenyGlowne.gs
 * - Waluty.gs
 * - Konfiguracja.gs
 * - SmartTicker.gs
 *
 * Kod został zakomentowany, aby uniknąć konfliktów nazw funkcji.
 * Nie usuwaj tego pliku, dopóki nie upewnisz się, że wszystko działa w modułach.
 */

/*
/**
 * ═══════════════════════════════════════════════════════════════
 * 💼 PORTFEL.gs - Kompletny System Portfela Inwestycyjnego
 * ═══════════════════════════════════════════════════════════════
 * 
 * INSTRUKCJA:
 * 1. Skopiuj CAŁY ten plik do Apps Script
 * 2. Ustaw klucz API w: Plik → Ustawienia projektu → Właściwości skryptu
 *    Dodaj: FINNHUB_KEY = twój_klucz
 * 3. Uruchom: TEST_KONFIGURACJI()
 * 4. Uruchom: USTAW_TRIGGER_5MIN()
 */

// ═══════════════════════════════════════════════════════════════
// 📋 KONFIGURACJA
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  // Klucze API
  get FINNHUB_KEY() {
    return PropertiesService.getScriptProperties().getProperty('FINNHUB_KEY') || '';
  },
  
  // Limity API
  API_DELAY_MS: 1100,           // Odstęp między zapytaniami (54 req/min)
  MAX_REQUESTS_PER_RUN: 50,     // Max zapytań na jedno uruchomienie
  
  // Cache
  CACHE_PRICES_TTL: 300,        // 5 minut dla cen akcji
  CACHE_CURRENCY_TTL: 900,      // 15 minut dla kursów walut
  
  // Arkusz
  SHEET_NAME: 'PORTFEL',
  
  // Kolumny (1-indexed)
  COL: {
    ID: 1,              // A
    TICKER: 2,          // B
    TYP: 3,             // C
    WALUTA: 4,          // D
    ILOSC: 5,           // E
    CENA_SREDNIA_USD: 6,// F
    CENA_SREDNIA_PLN: 7,// G
    KOSZT_CALK: 8,      // H
    CENA_LIVE: 9,       // I
    WARTOSC_PLN: 10,    // J
    ZYSK_TOTAL: 11,     // K
    WYNIK_AKCJI: 12,    // L
    WPLYW_FX: 13,       // M
    WALUTA_LIVE: 14     // N
  },
  
  // Waluty - komórki
  CURRENCY_CELLS: {
    USD: 'N2',
    EUR: 'N3'
  },
  
  // Kategorie aktywów
  ASSET_TYPES: ['AKCJA', 'ETF', 'KRYPTO', 'OBLIGACJA', 'SUROWIEC', 'GOTÓWKA'],
  
  // Waluty obsługiwane
  CURRENCIES: ['USD', 'EUR', 'PLN', 'GBP']
};

// ═══════════════════════════════════════════════════════════════
// 📝 LOGOWANIE
// ═══════════════════════════════════════════════════════════════

function logInfo(message) {
  console.log(`[${new Date().toISOString()}] ℹ️ ${message}`);
}

function logError(message) {
  console.error(`[${new Date().toISOString()}] ❌ ${message}`);
}

function logSuccess(message) {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
}

// ═══════════════════════════════════════════════════════════════
// 💱 WALUTY
// ═══════════════════════════════════════════════════════════════

/**
 * Aktualizuje kursy walut w arkuszu
 */
function AKTUALIZUJ_WALUTY() {
  logInfo('Rozpoczynam aktualizację walut...');
  
  const cache = CacheService.getScriptCache();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    logError(`Nie znaleziono arkusza: ${CONFIG.SHEET_NAME}`);
    return;
  }
  
  // USD/PLN
  const usdRate = getCurrencyRate_('USD', 'PLN', cache);
  if (usdRate > 0) {
    sheet.getRange(CONFIG.CURRENCY_CELLS.USD).setValue(usdRate);
    logSuccess(`USD/PLN: ${usdRate}`);
  }
  
  // EUR/PLN
  const eurRate = getCurrencyRate_('EUR', 'PLN', cache);
  if (eurRate > 0) {
    sheet.getRange(CONFIG.CURRENCY_CELLS.EUR).setValue(eurRate);
    logSuccess(`EUR/PLN: ${eurRate}`);
  }
  
  logInfo('Aktualizacja walut zakończona.');
}

/**
 * Pobiera kurs waluty z cache lub API
 */
function getCurrencyRate_(from, to, cache) {
  const cacheKey = `CURRENCY_${from}_${to}`;
  
  // Sprawdź cache
  const cached = cache.get(cacheKey);
  if (cached) {
    logInfo(`Cache hit: ${cacheKey}`);
    return parseFloat(cached);
  }
  
  // Pobierz z Yahoo
  let rate = fetchCurrencyFromYahoo_(from, to);
  
  // Zapisz do cache
  if (rate && rate > 0) {
    cache.put(cacheKey, rate.toString(), CONFIG.CACHE_CURRENCY_TTL);
  }
  
  return rate || 0;
}

/**
 * Pobiera kurs z Yahoo Finance
 */
function fetchCurrencyFromYahoo_(from, to) {
  const symbol = `${from}${to}=X`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      logError(`Yahoo błąd HTTP: ${response.getResponseCode()}`);
      return 0;
    }
    
    const json = JSON.parse(response.getContentText());
    
    if (json.chart && json.chart.result && json.chart.result[0]) {
      const rate = json.chart.result[0].meta.regularMarketPrice;
      logInfo(`Yahoo ${from}/${to}: ${rate}`);
      return rate;
    }
  } catch (e) {
    logError(`Yahoo error (${from}/${to}): ${e.message}`);
  }
  
  return 0;
}

/**
 * Custom function: Pobierz kurs waluty
 * @customfunction
 */
function KURS_WALUTY(from, to) {
  if (!from || !to) return 'BŁĄD: Podaj waluty';
  if (from === to) return 1;
  
  const cache = CacheService.getScriptCache();
  const rate = getCurrencyRate_(from.toString().toUpperCase(), to.toString().toUpperCase(), cache);
  
  return rate > 0 ? rate : 'BŁĄD';
}

// ═══════════════════════════════════════════════════════════════
// 🔍 SMART TICKER - Inteligentne wyszukiwanie
// ═══════════════════════════════════════════════════════════════

/**
 * Pobiera mapowanie sufiksów giełdowych
 */
function getExchangeSuffixes_() {
  return {
    'USD': ['', '.US'],           // US markets
    'EUR': ['.DE', '.F', '.PA'],  // Germany, France
    'PLN': ['.WA'],               // Warsaw
    'GBP': ['.L', '.IL']          // London
  };
}

/**
 * Pobiera kolejność przeszukiwania giełd
 */
function getMarketPriority_() {
  return ['USD', 'EUR', 'GBP', 'PLN'];
}

/**
 * Znajduje cenę tickera, przeszukując różne giełdy
 */
function findTickerPrice(ticker, preferredCurrency, cache) {
  if (!ticker) return { price: 0, foundOn: null, suffix: '' };
  
  ticker = ticker.toString().toUpperCase().trim();
  preferredCurrency = (preferredCurrency || 'USD').toString().toUpperCase();
  
  const cacheKey = `PRICE_${ticker}_${preferredCurrency}`;
  
  // Sprawdź cache
  const cached = cache.get(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    logInfo(`Cache hit: ${ticker} = ${data.price}`);
    return data;
  }
  
  // Utwórz kolejność przeszukiwania
  const marketPriority = getMarketPriority_();
  const exchangeSuffixes = getExchangeSuffixes_();
  const searchOrder = [preferredCurrency, ...marketPriority.filter(c => c !== preferredCurrency)];
  
  for (const currency of searchOrder) {
    const suffixes = exchangeSuffixes[currency] || [''];
    
    for (const suffix of suffixes) {
      const symbol = ticker + suffix;
      
      // Próbuj Finnhub
      let price = fetchPriceFromFinnhub_(symbol);
      
      // Fallback: Yahoo
      if (!price || price <= 0) {
        price = fetchPriceFromYahoo_(symbol);
      }
      
      if (price && price > 0) {
        const result = { price, foundOn: currency, suffix };
        
        // Zapisz do cache
        cache.put(cacheKey, JSON.stringify(result), CONFIG.CACHE_PRICES_TTL);
        
        logSuccess(`Znaleziono: ${symbol} = ${price} (${currency})`);
        return result;
      }
      
      // Rate limiting
      Utilities.sleep(CONFIG.API_DELAY_MS);
    }
  }
  
  logError(`Nie znaleziono ceny dla: ${ticker}`);
  return { price: 0, foundOn: null, suffix: '' };
}

/**
 * Pobiera cenę z Finnhub
 */
function fetchPriceFromFinnhub_(symbol) {
  const apiKey = CONFIG.FINNHUB_KEY;
  if (!apiKey) return 0;
  
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      if (json.c && json.c > 0) {
        return json.c;
      }
    }
  } catch (e) {
    logError(`Finnhub error (${symbol}): ${e.message}`);
  }
  
  return 0;
}

/**
 * Pobiera cenę z Yahoo Finance
 */
function fetchPriceFromYahoo_(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      
      if (json.chart && json.chart.result && json.chart.result[0]) {
        return json.chart.result[0].meta.regularMarketPrice;
      }
    }
  } catch (e) {
    logError(`Yahoo error (${symbol}): ${e.message}`);
  }
  
  return 0;
}

/**
 * Custom function: Inteligentne pobieranie ceny
 * @customfunction
 */
function SMART_CENA(ticker, waluta) {
  if (!ticker) return 'BŁĄD: Podaj ticker';
  
  const cache = CacheService.getScriptCache();
  const result = findTickerPrice(ticker, waluta, cache);
  
  if (result.price > 0) {
    return result.price;
  }
  
  return 'NIE ZNALEZIONO';
}

// ═══════════════════════════════════════════════════════════════
// 💰 GŁÓWNE FUNKCJE AKTUALIZACJI
// ═══════════════════════════════════════════════════════════════

/**
 * 🚀 GŁÓWNA FUNKCJA - Aktualizuje wszystkie ceny i waluty
 */
function AKTUALIZUJ_WSZYSTKO() {
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('🚀 Rozpoczynam pełną aktualizację portfela...');
  
  const startTime = new Date();
  
  try {
    AKTUALIZUJ_WALUTY();
    AKTUALIZUJ_CENY_PORTFELA();
    
    const duration = (new Date() - startTime) / 1000;
    logSuccess(`Aktualizacja zakończona w ${duration.toFixed(1)}s`);
    
  } catch (e) {
    logError(`Krytyczny błąd: ${e.message}`);
    logError(e.stack);
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * Aktualizuje ceny wszystkich pozycji w portfelu
 */
function AKTUALIZUJ_CENY_PORTFELA() {
  logInfo('📊 Aktualizuję ceny portfela...');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    logError(`Nie znaleziono arkusza: ${CONFIG.SHEET_NAME}`);
    return;
  }
  
  const cache = CacheService.getScriptCache();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    logInfo('Brak danych do aktualizacji');
    return;
  }
  
  // Pobierz dane: TICKER (B), TYP (C), WALUTA (D)
  const dataRange = sheet.getRange(2, CONFIG.COL.TICKER, lastRow - 1, 3);
  const data = dataRange.getValues();
  
  let updated = 0;
  let errors = 0;
  let requestCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (requestCount >= CONFIG.MAX_REQUESTS_PER_RUN) {
      logInfo(`Osiągnięto limit ${CONFIG.MAX_REQUESTS_PER_RUN} zapytań. Przerywam.`);
      break;
    }
    
    const ticker = data[i][0];
    const typ = data[i][1];
    const waluta = data[i][2];
    
    if (!ticker || ticker === '' || ticker === 'TICKER') continue;
    if (typ === 'GOTÓWKA' || typ === 'GOTOWKA') continue;
    
    logInfo(`Przetwarzam: ${ticker} (${waluta})`);
    
    const result = findTickerPrice(ticker, waluta, cache);
    requestCount++;
    
    if (result.price > 0) {
      const row = 2 + i;
      sheet.getRange(row, CONFIG.COL.CENA_LIVE).setValue(result.price);
      updated++;
      logSuccess(`${ticker}: ${result.price} USD`);
    } else {
      errors++;
      logError(`${ticker}: nie znaleziono ceny`);
    }
  }
  
  logInfo(`📊 Podsumowanie: ${updated} zaktualizowanych, ${errors} błędów`);
}

// ═══════════════════════════════════════════════════════════════
// ⚙️ TRIGGERY I KONFIGURACJA
// ═══════════════════════════════════════════════════════════════

/**
 * Ustawia automatyczny trigger co 5 minut
 */
function USTAW_TRIGGER_5MIN() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'AKTUALIZUJ_WSZYSTKO') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('AKTUALIZUJ_WSZYSTKO')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  logSuccess('Trigger ustawiony: AKTUALIZUJ_WSZYSTKO co 5 minut');
}

/**
 * Usuwa wszystkie triggery
 */
function USUN_WSZYSTKIE_TRIGGERY() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  logInfo(`Usunięto ${triggers.length} triggerów`);
}

/**
 * 🧪 Test konfiguracji
 */
function TEST_KONFIGURACJI() {
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('🧪 Test konfiguracji...');
  
  // Sprawdź klucz API
  const apiKey = CONFIG.FINNHUB_KEY;
  if (apiKey) {
    logSuccess(`Finnhub API: ${apiKey.substring(0, 4)}...${apiKey.slice(-4)}`);
  } else {
    logError('Brak klucza Finnhub! Ustaw w Script Properties.');
  }
  
  // Sprawdź arkusz
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (sheet) {
    logSuccess(`Arkusz "${CONFIG.SHEET_NAME}" znaleziony`);
    logInfo(`Wiersze: ${sheet.getLastRow()}, Kolumny: ${sheet.getLastColumn()}`);
  } else {
    logError(`Nie znaleziono arkusza: ${CONFIG.SHEET_NAME}`);
  }
  
  // Test pojedynczego tickera
  logInfo('Test pobierania ceny AAPL...');
  const cache = CacheService.getScriptCache();
  const result = findTickerPrice('AAPL', 'USD', cache);
  
  if (result.price > 0) {
    logSuccess(`AAPL: $${result.price}`);
  } else {
    logError('Nie udało się pobrać ceny AAPL');
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════
// 📐 FORMUŁY I WALIDACJE
// ═══════════════════════════════════════════════════════════════

/**
 * Ustawia formuły w arkuszu automatycznie
 * Apps Script wymaga ANGIELSKICH nazw funkcji (IF, nie JEŻELI)
 * ale separatorów zgodnych z lokalizacją arkusza
 */
function USTAW_FORMULY() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    logError(`Nie znaleziono arkusza: ${CONFIG.SHEET_NAME}`);
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    logInfo('Brak danych - dodaj najpierw pierwszą pozycję');
    return;
  }
  
  logInfo('Ustawiam formuły...');
  
  for (let row = 2; row <= lastRow; row++) {
    // H - KOSZT_CALKOWITY: =E*G
    sheet.getRange(row, CONFIG.COL.KOSZT_CALK).setFormula(`=E${row}*G${row}`);
    
    // J - WARTOSC_PLN (używa stałych kursów: N2=USD, N3=EUR)
    sheet.getRange(row, CONFIG.COL.WARTOSC_PLN).setFormula(
      `=IF(D${row}="USD"; E${row}*I${row}*$N$2; IF(D${row}="EUR"; E${row}*I${row}*$N$3; E${row}*I${row}))`
    );
    
    // K - ZYSK_TOTAL: =J-H
    sheet.getRange(row, CONFIG.COL.ZYSK_TOTAL).setFormula(`=J${row}-H${row}`);
    
    // L - WYNIK_AKCJI (używa kursu zakupu = G/F, żeby izolować zysk z akcji od FX)
    // Formuła: (cena_live - cena_kupna_waluta) * ilość * kurs_zakupu
    // gdzie kurs_zakupu = cena_kupna_PLN / cena_kupna_waluta = G/F
    sheet.getRange(row, CONFIG.COL.WYNIK_AKCJI).setFormula(
      `=IF(F${row}>0; (I${row}-F${row})*E${row}*(G${row}/F${row}); 0)`
    );
    
    // M - WPLYW_FX: =K-L
    sheet.getRange(row, CONFIG.COL.WPLYW_FX).setFormula(`=K${row}-L${row}`);
  }
  
  logSuccess(`Formuły ustawione dla wierszy 2-${lastRow}`);
}

/**
 * Ustawia walidację danych dla TYP i WALUTA
 */
function USTAW_WALIDACJE() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return;
  
  const lastRow = Math.max(sheet.getLastRow(), 100);
  
  // TYP (kolumna C)
  const typRange = sheet.getRange(2, CONFIG.COL.TYP, lastRow - 1, 1);
  const typRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.ASSET_TYPES, true)
    .setAllowInvalid(false)
    .build();
  typRange.setDataValidation(typRule);
  
  // WALUTA (kolumna D)
  const walutaRange = sheet.getRange(2, CONFIG.COL.WALUTA, lastRow - 1, 1);
  const walutaRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.CURRENCIES, true)
    .setAllowInvalid(false)
    .build();
  walutaRange.setDataValidation(walutaRule);
  
  logSuccess('Walidacje ustawione dla TYP i WALUTA');
}

/**
 * Ustawia formatowanie warunkowe (zielony/czerwony)
 */
function USTAW_FORMATOWANIE() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return;
  
  const lastRow = Math.max(sheet.getLastRow(), 100);
  const columns = [CONFIG.COL.ZYSK_TOTAL, CONFIG.COL.WYNIK_AKCJI, CONFIG.COL.WPLYW_FX];
  
  columns.forEach(col => {
    const range = sheet.getRange(2, col, lastRow - 1, 1);
    
    const positiveRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0)
      .setBackground('#c6efce')
      .setFontColor('#006100')
      .setRanges([range])
      .build();
    
    const negativeRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(0)
      .setBackground('#ffc7ce')
      .setFontColor('#9c0006')
      .setRanges([range])
      .build();
    
    const rules = sheet.getConditionalFormatRules();
    rules.push(positiveRule, negativeRule);
    sheet.setConditionalFormatRules(rules);
  });
  
  logSuccess('Formatowanie warunkowe ustawione');
}

/**
 * Generuje unikalny ID
 * @customfunction
 */
function GENERUJ_ID() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `PF-${timestamp}-${random}`;
}
*/
