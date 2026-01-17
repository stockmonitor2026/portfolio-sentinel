/**
 * ═══════════════════════════════════════════════════════════════
 * 💱 WALUTY.gs - Moduł kursów walut
 * ═══════════════════════════════════════════════════════════════
 * 
 * Funkcje:
 * - Pobieranie kursów USD/PLN i EUR/PLN
 * - Cache 15 minut
 * - Zapis do komórek N2 (USD) i N3 (EUR)
 */

/**
 * Aktualizuje kursy walut w arkuszu
 * Używa Yahoo Finance z 15-minutowym cache
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
  const usdRate = getCurrencyRate('USD', 'PLN', cache);
  if (usdRate > 0) {
    sheet.getRange(CONFIG.CURRENCY_CELLS.USD).setValue(usdRate);
    logSuccess(`USD/PLN: ${usdRate}`);
  }
  
  // EUR/PLN
  const eurRate = getCurrencyRate('EUR', 'PLN', cache);
  if (eurRate > 0) {
    sheet.getRange(CONFIG.CURRENCY_CELLS.EUR).setValue(eurRate);
    logSuccess(`EUR/PLN: ${eurRate}`);
  }
  
  logInfo('Aktualizacja walut zakończona.');
}

/**
 * Pobiera kurs waluty z cache lub API
 */
function getCurrencyRate(from, to, cache) {
  const cacheKey = `CURRENCY_${from}_${to}`;
  
  // Sprawdź cache
  const cached = cache.get(cacheKey);
  if (cached) {
    logInfo(`Cache hit: ${cacheKey}`);
    return parseFloat(cached);
  }
  
  // Pobierz z API
  let rate = fetchCurrencyFromYahoo(from, to);
  
  // Backup: Finnhub forex
  if (!rate || rate <= 0) {
    rate = fetchCurrencyFromFinnhub(from, to);
  }
  
  // Zapisz do cache
  if (rate && rate > 0) {
    cache.put(cacheKey, rate.toString(), CONFIG.CACHE_CURRENCY_TTL);
  }
  
  return rate || 0;
}

/**
 * Pobiera kurs z Yahoo Finance
 */
function fetchCurrencyFromYahoo(from, to) {
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
 * Pobiera kurs z Finnhub (backup)
 */
function fetchCurrencyFromFinnhub(from, to) {
  const apiKey = CONFIG.FINNHUB_KEY;
  if (!apiKey) return 0;
  
  // Finnhub używa formatu OANDA:EUR_USD
  const symbol = `OANDA:${from}_${to}`;
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      if (json.c && json.c > 0) {
        logInfo(`Finnhub ${from}/${to}: ${json.c}`);
        return json.c;
      }
    }
  } catch (e) {
    logError(`Finnhub forex error: ${e.message}`);
  }
  
  return 0;
}

/**
 * Custom function: Pobierz kurs waluty
 * Użycie: =KURS_WALUTY("USD"; "PLN")
 * @customfunction
 */
function KURS_WALUTY(from, to) {
  if (!from || !to) return 'BŁĄD: Podaj waluty';
  if (from === to) return 1;
  
  const cache = CacheService.getScriptCache();
  const rate = getCurrencyRate(from.toString().toUpperCase(), to.toString().toUpperCase(), cache);
  
  return rate > 0 ? rate : 'BŁĄD';
}
