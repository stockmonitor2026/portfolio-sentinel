/**
 * ═══════════════════════════════════════════════════════════════
 * 💰 CENY_GLOWNE.gs - Główny moduł aktualizacji cen
 * ═══════════════════════════════════════════════════════════════
 * 
 * Główna funkcja uruchamiana co 5 minut przez trigger
 * Zarządza całym procesem aktualizacji cen i walut
 */

/**
 * 🚀 GŁÓWNA FUNKCJA - Aktualizuje wszystkie ceny i waluty
 * Uruchamiaj przez trigger co 5 minut
 */
function AKTUALIZUJ_WSZYSTKO() {
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('🚀 Rozpoczynam pełną aktualizację portfela...');
  
  const startTime = new Date();
  
  try {
    // 1. Najpierw waluty (są potrzebne do obliczeń)
    AKTUALIZUJ_WALUTY();
    
    // 2. Potem ceny akcji
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
    // Sprawdź limit zapytań
    if (requestCount >= CONFIG.MAX_REQUESTS_PER_RUN) {
      logInfo(`Osiągnięto limit ${CONFIG.MAX_REQUESTS_PER_RUN} zapytań. Przerywam.`);
      break;
    }
    
    const ticker = data[i][0];   // Kolumna B
    const typ = data[i][1];      // Kolumna C
    const waluta = data[i][2];   // Kolumna D
    
    // Pomiń puste wiersze i nagłówki
    if (!ticker || ticker === '' || ticker === 'TICKER') continue;
    
    // Pomiń gotówkę
    if (typ === 'GOTÓWKA' || typ === 'GOTOWKA') continue;
    
    logInfo(`Przetwarzam: ${ticker} (${waluta})`);
    
    // Znajdź cenę używając smart search
    const result = findTickerPrice(ticker, waluta, cache);
    requestCount++;
    
    if (result.price > 0) {
      // Zapisz cenę do kolumny I (CENA_LIVE)
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

/**
 * Ustawia automatyczny trigger (uruchom raz)
 */
function USTAW_TRIGGER_5MIN() {
  // Usuń istniejące triggery
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'AKTUALIZUJ_WSZYSTKO') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Utwórz nowy trigger co 5 minut
  ScriptApp.newTrigger('AKTUALIZUJ_WSZYSTKO')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  logSuccess('Trigger ustawiony: AKTUALIZUJ_WSZYSTKO co 5 minut');
}

/**
 * Usuwa wszystkie triggery (do debugowania)
 */
function USUN_WSZYSTKIE_TRIGGERY() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  logInfo(`Usunięto ${triggers.length} triggerów`);
}

/**
 * Testowa funkcja - sprawdza konfigurację
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
