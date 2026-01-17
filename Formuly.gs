/**
 * ═══════════════════════════════════════════════════════════════
 * 📐 FORMULY.gs - Formuły arkusza i funkcje pomocnicze
 * ═══════════════════════════════════════════════════════════════
 * 
 * Zawiera:
 * - Formuły do wklejenia w arkusz
 * - Funkcje custom do użycia w komórkach
 * - Funkcje walidacji danych
 */

/**
 * ═══════════════════════════════════════════
 * 📋 FORMUŁY DO WKLEJENIA W ARKUSZ
 * ═══════════════════════════════════════════
 * 
 * Skopiuj te formuły do odpowiednich kolumn w wierszu 2,
 * a następnie przeciągnij w dół.
 * 
 * KOLUMNA H - KOSZT_CALKOWITY:
 * =E2*G2
 * 
 * KOLUMNA J - WARTOSC_PLN:
 * =JEŻELI(D2="USD"; E2*I2*$N$2; JEŻELI(D2="EUR"; E2*I2*$N$3; E2*I2))
 * 
 * KOLUMNA K - ZYSK_TOTAL:
 * =J2-H2
 * 
 * KOLUMNA L - WYNIK_AKCJI:
 * =JEŻELI(D2="USD"; (I2-F2)*E2*$N$2; JEŻELI(D2="EUR"; (I2-F2)*E2*$N$3; 0))
 * 
 * KOLUMNA M - WPLYW_FX:
 * =K2-L2
 * 
 * Alternatywnie, WPLYW_FX może być obliczony jako:
 * =J2-H2-JEŻELI(D2="USD"; (I2-F2)*E2*$N$2; JEŻELI(D2="EUR"; (I2-F2)*E2*$N$3; 0))
 */

/**
 * Ustawia formuły w arkuszu automatycznie
 * Uruchom raz po skonfigurowaniu arkusza
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
    
    // J - WARTOSC_PLN: =JEŻELI(D="USD"; E*I*$N$2; JEŻELI(D="EUR"; E*I*$N$3; E*I))
    sheet.getRange(row, CONFIG.COL.WARTOSC_PLN).setFormula(
      `=IF(D${row}="USD", E${row}*I${row}*$N$2, IF(D${row}="EUR", E${row}*I${row}*$N$3, E${row}*I${row}))`
    );
    
    // K - ZYSK_TOTAL: =J-H
    sheet.getRange(row, CONFIG.COL.ZYSK_TOTAL).setFormula(`=J${row}-H${row}`);
    
    // L - WYNIK_AKCJI: różnica cen * ilość * kurs
    sheet.getRange(row, CONFIG.COL.WYNIK_AKCJI).setFormula(
      `=IF(D${row}="USD", (I${row}-F${row})*E${row}*$N$2, IF(D${row}="EUR", (I${row}-F${row})*E${row}*$N$3, 0))`
    );
    
    // M - WPLYW_FX: =ZYSK_TOTAL - WYNIK_AKCJI
    sheet.getRange(row, CONFIG.COL.WPLYW_FX).setFormula(`=K${row}-L${row}`);
  }
  
  logSuccess(`Formuły ustawione dla wierszy 2-${lastRow}`);
}

/**
 * Generuje unikalny ID dla nowej pozycji
 * Użycie w AppSheet: =GENERUJ_ID()
 * @customfunction
 */
function GENERUJ_ID() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `PF-${timestamp}-${random}`;
}

/**
 * Waliduje ticker - sprawdza czy istnieje na giełdzie
 * @customfunction
 */
function WALIDUJ_TICKER(ticker) {
  if (!ticker) return 'BŁĄD: Pusty ticker';
  
  const cache = CacheService.getScriptCache();
  const result = findTickerPrice(ticker, 'USD', cache);
  
  if (result.price > 0) {
    return `OK: ${result.foundOn}${result.suffix}`;
  }
  
  return 'NIE ZNALEZIONO';
}

/**
 * Formatuje walutę jako PLN
 * @customfunction
 */
function FORMAT_PLN(value) {
  if (isNaN(value)) return 'BŁĄD';
  
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(value);
}

/**
 * Oblicza procentową zmianę
 * @customfunction
 */
function ZMIANA_PROCENT(wartoscPoczatkowa, wartoscKoncowa) {
  if (!wartoscPoczatkowa || wartoscPoczatkowa === 0) return 0;
  return ((wartoscKoncowa - wartoscPoczatkowa) / wartoscPoczatkowa) * 100;
}

/**
 * Ustawia walidację danych dla kolumny TYP
 */
function USTAW_WALIDACJE() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return;
  
  const lastRow = Math.max(sheet.getLastRow(), 100); // Min 100 wierszy
  
  // Walidacja dla TYP (kolumna C)
  const typRange = sheet.getRange(2, CONFIG.COL.TYP, lastRow - 1, 1);
  const typRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.ASSET_TYPES, true)
    .setAllowInvalid(false)
    .setHelpText('Wybierz typ aktywa')
    .build();
  typRange.setDataValidation(typRule);
  
  // Walidacja dla WALUTA (kolumna D)
  const walutaRange = sheet.getRange(2, CONFIG.COL.WALUTA, lastRow - 1, 1);
  const walutaRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.CURRENCIES, true)
    .setAllowInvalid(false)
    .setHelpText('Wybierz walutę')
    .build();
  walutaRange.setDataValidation(walutaRule);
  
  logSuccess('Walidacje ustawione dla TYP i WALUTA');
}

/**
 * Ustawia formatowanie warunkowe dla zysków/strat
 */
function USTAW_FORMATOWANIE() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return;
  
  const lastRow = Math.max(sheet.getLastRow(), 100);
  
  // Kolumny z zyskami: K (ZYSK_TOTAL), L (WYNIK_AKCJI), M (WPLYW_FX)
  const columns = [CONFIG.COL.ZYSK_TOTAL, CONFIG.COL.WYNIK_AKCJI, CONFIG.COL.WPLYW_FX];
  
  columns.forEach(col => {
    const range = sheet.getRange(2, col, lastRow - 1, 1);
    
    // Usuń istniejące reguły
    range.clearFormat();
    
    // Zielony dla dodatnich
    const positiveRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0)
      .setBackground('#c6efce')
      .setFontColor('#006100')
      .setRanges([range])
      .build();
    
    // Czerwony dla ujemnych
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
