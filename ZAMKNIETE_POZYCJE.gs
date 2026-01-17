/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 ZAMKNIETE_POZYCJE.gs - Zarządzanie Zamkniętymi Pozycjami
 * ═══════════════════════════════════════════════════════════════
 * 
 * FUNKCJE:
 * - Tworzenie arkusza "ZAMKNIĘTE" z odpowiednią strukturą
 * - Przenoszenie sprzedanych pozycji z PORTFELA do ZAMKNIĘTE
 * - Obliczanie zrealizowanego zysku/straty
 */

// ═══════════════════════════════════════════════════════════════
// 📋 KONFIGURACJA ZAMKNIĘTYCH POZYCJI
// ═══════════════════════════════════════════════════════════════

const CLOSED_CONFIG = {
  SHEET_NAME: 'ZAMKNIĘTE',
  SOURCE_SHEET: 'PORTFEL',
  
  // Kolumny arkusza ZAMKNIĘTE (rozszerzone o dane sprzedaży)
  COL: {
    ID: 1,                    // A - ID pozycji
    TICKER: 2,                // B - Ticker
    TYP: 3,                   // C - Typ aktywa
    WALUTA: 4,                // D - Waluta
    ILOSC: 5,                 // E - Ilość sprzedana
    CENA_KUPNA_USD: 6,        // F - Cena kupna (USD)
    CENA_KUPNA_PLN: 7,        // G - Cena kupna (PLN)
    KOSZT_CALKOWITY: 8,       // H - Koszt całkowity
    CENA_SPRZEDAZY: 9,        // I - Cena sprzedaży
    DATA_SPRZEDAZY: 10,       // J - Data sprzedaży
    WARTOSC_SPRZEDAZY: 11,    // K - Wartość sprzedaży (PLN)
    ZYSK_ZREALIZOWANY: 12,    // L - Zysk/Strata zrealizowana
    ZYSK_PROCENT: 13,         // M - Zysk %
    KURS_WALUTY: 14           // N - Kurs waluty przy sprzedaży
  },
  
  // Nagłówki
  HEADERS: [
    'ID', 'TICKER', 'TYP', 'WALUTA', 'ILOŚĆ',
    'CENA KUPNA (USD)', 'CENA KUPNA (PLN)', 'KOSZT CAŁKOWITY',
    'CENA SPRZEDAŻY', 'DATA SPRZEDAŻY', 'WARTOŚĆ SPRZEDAŻY (PLN)',
    'ZYSK/STRATA', 'ZYSK %', 'KURS WALUTY'
  ]
};

// ═══════════════════════════════════════════════════════════════
// 🏗️ TWORZENIE ARKUSZA
// ═══════════════════════════════════════════════════════════════

/**
 * Tworzy arkusz ZAMKNIĘTE z odpowiednią strukturą
 */
function UTWORZ_ARKUSZ_ZAMKNIETE() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CLOSED_CONFIG.SHEET_NAME);
  
  if (sheet) {
    logInfo(`Arkusz "${CLOSED_CONFIG.SHEET_NAME}" już istnieje`);
    return sheet;
  }
  
  // Utwórz nowy arkusz
  sheet = ss.insertSheet(CLOSED_CONFIG.SHEET_NAME);
  
  // Ustaw nagłówki
  const headerRange = sheet.getRange(1, 1, 1, CLOSED_CONFIG.HEADERS.length);
  headerRange.setValues([CLOSED_CONFIG.HEADERS]);
  
  // Formatowanie nagłówków
  headerRange
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  // Ustaw szerokości kolumn
  sheet.setColumnWidth(1, 120);  // ID
  sheet.setColumnWidth(2, 80);   // TICKER
  sheet.setColumnWidth(3, 80);   // TYP
  sheet.setColumnWidth(4, 60);   // WALUTA
  sheet.setColumnWidth(5, 70);   // ILOŚĆ
  sheet.setColumnWidth(6, 120);  // CENA KUPNA USD
  sheet.setColumnWidth(7, 120);  // CENA KUPNA PLN
  sheet.setColumnWidth(8, 130);  // KOSZT CAŁKOWITY
  sheet.setColumnWidth(9, 120);  // CENA SPRZEDAŻY
  sheet.setColumnWidth(10, 120); // DATA SPRZEDAŻY
  sheet.setColumnWidth(11, 150); // WARTOŚĆ SPRZEDAŻY
  sheet.setColumnWidth(12, 120); // ZYSK/STRATA
  sheet.setColumnWidth(13, 80);  // ZYSK %
  sheet.setColumnWidth(14, 100); // KURS WALUTY
  
  // Zamroź nagłówek
  sheet.setFrozenRows(1);
  
  // Dodaj formatowanie warunkowe dla zysku/straty
  ustawFormatowanieZamkniete_(sheet);
  
  logSuccess(`Utworzono arkusz "${CLOSED_CONFIG.SHEET_NAME}"`);
  return sheet;
}

/**
 * Ustawia formatowanie warunkowe dla arkusza ZAMKNIĘTE
 */
function ustawFormatowanieZamkniete_(sheet) {
  const lastRow = 100;
  
  // Kolumna L - ZYSK/STRATA
  const zyskRange = sheet.getRange(2, CLOSED_CONFIG.COL.ZYSK_ZREALIZOWANY, lastRow, 1);
  
  // Kolumna M - ZYSK %
  const procentRange = sheet.getRange(2, CLOSED_CONFIG.COL.ZYSK_PROCENT, lastRow, 1);
  
  const ranges = [zyskRange, procentRange];
  
  ranges.forEach(range => {
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
}

// ═══════════════════════════════════════════════════════════════
// 🔄 PRZENOSZENIE POZYCJI
// ═══════════════════════════════════════════════════════════════

/**
 * Przenosi zaznaczony wiersz z PORTFELA do ZAMKNIĘTE
 * Wywołaj gdy masz zaznaczony wiersz pozycji do zamknięcia
 */
function PRZENIES_DO_ZAMKNIETYCH() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(CLOSED_CONFIG.SOURCE_SHEET);
  
  if (!sourceSheet) {
    SpreadsheetApp.getUi().alert(`Błąd: Nie znaleziono arkusza "${CLOSED_CONFIG.SOURCE_SHEET}"`);
    return;
  }
  
  // Sprawdź czy jesteśmy w arkuszu PORTFEL
  const activeSheet = ss.getActiveSheet();
  if (activeSheet.getName() !== CLOSED_CONFIG.SOURCE_SHEET) {
    SpreadsheetApp.getUi().alert('Przejdź do arkusza PORTFEL i zaznacz wiersz do przeniesienia.');
    return;
  }
  
  // Pobierz zaznaczony wiersz
  const selection = sourceSheet.getActiveRange();
  const row = selection.getRow();
  
  if (row < 2) {
    SpreadsheetApp.getUi().alert('Zaznacz wiersz z pozycją (nie nagłówek).');
    return;
  }
  
  // Pobierz dane pozycji
  const rowData = sourceSheet.getRange(row, 1, 1, 14).getValues()[0];
  const ticker = rowData[1]; // B - TICKER
  
  if (!ticker || ticker === '') {
    SpreadsheetApp.getUi().alert('Zaznaczony wiersz nie zawiera pozycji.');
    return;
  }
  
  // Dialogbox do wprowadzenia danych sprzedaży
  const ui = SpreadsheetApp.getUi();
  
  // Pytanie o cenę sprzedaży
  const cenaResponse = ui.prompt(
    '💰 Zamknij pozycję: ' + ticker,
    'Podaj cenę sprzedaży (w walucie aktywa):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (cenaResponse.getSelectedButton() !== ui.Button.OK) {
    logInfo('Anulowano przenoszenie pozycji');
    return;
  }
  
  const cenaSprzedazy = parseFloat(cenaResponse.getResponseText().replace(',', '.'));
  
  if (isNaN(cenaSprzedazy) || cenaSprzedazy <= 0) {
    ui.alert('Błąd: Podaj prawidłową cenę sprzedaży.');
    return;
  }
  
  // Utwórz arkusz ZAMKNIĘTE jeśli nie istnieje
  const closedSheet = UTWORZ_ARKUSZ_ZAMKNIETE();
  
  // Przygotuj dane do przeniesienia
  const id = rowData[0];
  const typ = rowData[2];
  const waluta = rowData[3];
  const ilosc = rowData[4];
  const cenaKupnaUSD = rowData[5];
  const cenaKupnaPLN = rowData[6];
  const kosztCalkowity = rowData[7];
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Kurs wymiany z dnia transakcji
  // ═══════════════════════════════════════════════════════════════
  let kursWaluty = 1;
  
  if (waluta !== 'PLN') {
    // Domyślny kurs z arkusza (format: 1 PLN = X waluty)
    let domyslnyKursArkusz = 1;
    if (waluta === 'USD') {
      domyslnyKursArkusz = sourceSheet.getRange('N2').getValue() || 4.0;
    } else if (waluta === 'EUR') {
      domyslnyKursArkusz = sourceSheet.getRange('N3').getValue() || 4.3;
    }
    // Konwersja na format 1 PLN = X waluty
    const domyslnyKurs = domyslnyKursArkusz > 0 ? (1 / domyslnyKursArkusz) : 0.25;
    
    const kursResponse = ui.prompt(
      `💱 Kurs wymiany: 1 PLN = ? ${waluta}`,
      `Podaj ile ${waluta} dostajesz za 1 PLN:\n` +
      `(zostaw puste dla aktualnego: ${domyslnyKurs.toFixed(4)})`,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (kursResponse.getSelectedButton() !== ui.Button.OK) {
      logInfo('Anulowano przenoszenie pozycji');
      return;
    }
    
    const kursText = kursResponse.getResponseText().trim();
    let kursInput;
    if (kursText === '') {
      kursInput = domyslnyKurs;
    } else {
      kursInput = parseFloat(kursText.replace(',', '.'));
      if (isNaN(kursInput) || kursInput <= 0) {
        ui.alert('Błąd: Podaj prawidłowy kurs.');
        return;
      }
    }
    // Konwersja: 1 PLN = X waluty -> 1 waluta = 1/X PLN
    kursWaluty = 1 / kursInput;
  }
  
  // Oblicz wartość sprzedaży i zysk
  const wartoscSprzedazy = ilosc * cenaSprzedazy * kursWaluty;
  const zyskZrealizowany = wartoscSprzedazy - kosztCalkowity;
  const zyskProcent = kosztCalkowity > 0 ? (zyskZrealizowany / kosztCalkowity) * 100 : 0;
  const dataSprzedazy = new Date();
  
  // Dodaj do arkusza ZAMKNIĘTE
  const newRow = closedSheet.getLastRow() + 1;
  closedSheet.getRange(newRow, 1, 1, 14).setValues([[
    id,
    ticker,
    typ,
    waluta,
    ilosc,
    cenaKupnaUSD,
    cenaKupnaPLN,
    kosztCalkowity,
    cenaSprzedazy,
    dataSprzedazy,
    wartoscSprzedazy,
    zyskZrealizowany,
    zyskProcent / 100, // Format procentowy
    kursWaluty
  ]]);
  
  // Formatowanie daty
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.DATA_SPRZEDAZY).setNumberFormat('yyyy-mm-dd');
  
  // Formatowanie procentu
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.ZYSK_PROCENT).setNumberFormat('0.00%');
  
  // Formatowanie walutowe
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.KOSZT_CALKOWITY).setNumberFormat('#,##0.00 "PLN"');
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.WARTOSC_SPRZEDAZY).setNumberFormat('#,##0.00 "PLN"');
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.ZYSK_ZREALIZOWANY).setNumberFormat('#,##0.00 "PLN"');
  
  // Usuń wiersz z PORTFELA
  sourceSheet.deleteRow(row);
  
  // Pokaż potwierdzenie
  const zyskText = zyskZrealizowany >= 0 ? `+${zyskZrealizowany.toFixed(2)}` : zyskZrealizowany.toFixed(2);
  ui.alert(
    '✅ Pozycja zamknięta',
    `${ticker} przeniesiony do arkusza ZAMKNIĘTE.\n\n` +
    `Cena sprzedaży: ${cenaSprzedazy} ${waluta}\n` +
    `Wartość: ${wartoscSprzedazy.toFixed(2)} PLN\n` +
    `Zysk/Strata: ${zyskText} PLN (${(zyskProcent).toFixed(2)}%)`,
    ui.ButtonSet.OK
  );
  
  logSuccess(`Zamknięto pozycję: ${ticker}, zysk: ${zyskText} PLN`);
}

/**
 * Szybkie zamknięcie pozycji - używa aktualnej ceny rynkowej
 */
function ZAMKNIJ_PO_AKTUALNEJ_CENIE() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(CLOSED_CONFIG.SOURCE_SHEET);
  
  if (!sourceSheet) {
    SpreadsheetApp.getUi().alert(`Błąd: Nie znaleziono arkusza "${CLOSED_CONFIG.SOURCE_SHEET}"`);
    return;
  }
  
  const activeSheet = ss.getActiveSheet();
  if (activeSheet.getName() !== CLOSED_CONFIG.SOURCE_SHEET) {
    SpreadsheetApp.getUi().alert('Przejdź do arkusza PORTFEL i zaznacz wiersz do przeniesienia.');
    return;
  }
  
  const selection = sourceSheet.getActiveRange();
  const row = selection.getRow();
  
  if (row < 2) {
    SpreadsheetApp.getUi().alert('Zaznacz wiersz z pozycją (nie nagłówek).');
    return;
  }
  
  // Pobierz dane pozycji
  const rowData = sourceSheet.getRange(row, 1, 1, 14).getValues()[0];
  const ticker = rowData[1];
  const cenaLive = rowData[8]; // I - CENA_LIVE
  
  if (!ticker || ticker === '') {
    SpreadsheetApp.getUi().alert('Zaznaczony wiersz nie zawiera pozycji.');
    return;
  }
  
  if (!cenaLive || cenaLive <= 0) {
    SpreadsheetApp.getUi().alert(`Brak aktualnej ceny dla ${ticker}. Uruchom najpierw AKTUALIZUJ_WSZYSTKO.`);
    return;
  }
  
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    `💰 Zamknij pozycję: ${ticker}`,
    `Czy chcesz zamknąć pozycję po aktualnej cenie ${cenaLive}?`,
    ui.ButtonSet.YES_NO
  );
  
  if (confirm !== ui.Button.YES) {
    return;
  }
  
  // Utwórz arkusz ZAMKNIĘTE jeśli nie istnieje
  const closedSheet = UTWORZ_ARKUSZ_ZAMKNIETE();
  
  // Dane pozycji
  const id = rowData[0];
  const typ = rowData[2];
  const waluta = rowData[3];
  const ilosc = rowData[4];
  const cenaKupnaUSD = rowData[5];
  const cenaKupnaPLN = rowData[6];
  const kosztCalkowity = rowData[7];
  
  // Kurs waluty
  let kursWaluty = 1;
  if (waluta === 'USD') {
    kursWaluty = sourceSheet.getRange('N2').getValue() || 4.0;
  } else if (waluta === 'EUR') {
    kursWaluty = sourceSheet.getRange('N3').getValue() || 4.3;
  }
  
  // Obliczenia
  const wartoscSprzedazy = ilosc * cenaLive * kursWaluty;
  const zyskZrealizowany = wartoscSprzedazy - kosztCalkowity;
  const zyskProcent = kosztCalkowity > 0 ? (zyskZrealizowany / kosztCalkowity) * 100 : 0;
  const dataSprzedazy = new Date();
  
  // Dodaj do ZAMKNIĘTE
  const newRow = closedSheet.getLastRow() + 1;
  closedSheet.getRange(newRow, 1, 1, 14).setValues([[
    id,
    ticker,
    typ,
    waluta,
    ilosc,
    cenaKupnaUSD,
    cenaKupnaPLN,
    kosztCalkowity,
    cenaLive,
    dataSprzedazy,
    wartoscSprzedazy,
    zyskZrealizowany,
    zyskProcent / 100,
    kursWaluty
  ]]);
  
  // Formatowanie
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.DATA_SPRZEDAZY).setNumberFormat('yyyy-mm-dd');
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.ZYSK_PROCENT).setNumberFormat('0.00%');
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.KOSZT_CALKOWITY).setNumberFormat('#,##0.00 "PLN"');
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.WARTOSC_SPRZEDAZY).setNumberFormat('#,##0.00 "PLN"');
  closedSheet.getRange(newRow, CLOSED_CONFIG.COL.ZYSK_ZREALIZOWANY).setNumberFormat('#,##0.00 "PLN"');
  
  // Usuń z PORTFELA
  sourceSheet.deleteRow(row);
  
  // Potwierdzenie
  const zyskText = zyskZrealizowany >= 0 ? `+${zyskZrealizowany.toFixed(2)}` : zyskZrealizowany.toFixed(2);
  ui.alert(
    '✅ Pozycja zamknięta',
    `${ticker} przeniesiony do arkusza ZAMKNIĘTE.\n\n` +
    `Cena sprzedaży: ${cenaLive} ${waluta}\n` +
    `Wartość: ${wartoscSprzedazy.toFixed(2)} PLN\n` +
    `Zysk/Strata: ${zyskText} PLN (${(zyskProcent).toFixed(2)}%)`,
    ui.ButtonSet.OK
  );
  
  logSuccess(`Zamknięto pozycję: ${ticker}, zysk: ${zyskText} PLN`);
}

// ═══════════════════════════════════════════════════════════════
// 📊 STATYSTYKI ZAMKNIĘTYCH POZYCJI
// ═══════════════════════════════════════════════════════════════

/**
 * Oblicza podsumowanie zamkniętych pozycji
 */
function PODSUMOWANIE_ZAMKNIETYCH() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CLOSED_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Brak arkusza ZAMKNIĘTE. Najpierw zamknij jakąś pozycję.');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Brak zamkniętych pozycji.');
    return;
  }
  
  // Pobierz dane
  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  
  let totalKoszt = 0;
  let totalWartoscSprzedazy = 0;
  let totalZysk = 0;
  let countPositive = 0;
  let countNegative = 0;
  
  data.forEach(row => {
    const koszt = row[CLOSED_CONFIG.COL.KOSZT_CALKOWITY - 1] || 0;
    const wartosc = row[CLOSED_CONFIG.COL.WARTOSC_SPRZEDAZY - 1] || 0;
    const zysk = row[CLOSED_CONFIG.COL.ZYSK_ZREALIZOWANY - 1] || 0;
    
    totalKoszt += koszt;
    totalWartoscSprzedazy += wartosc;
    totalZysk += zysk;
    
    if (zysk > 0) countPositive++;
    if (zysk < 0) countNegative++;
  });
  
  const procentZysku = totalKoszt > 0 ? (totalZysk / totalKoszt) * 100 : 0;
  const winRate = data.length > 0 ? (countPositive / data.length) * 100 : 0;
  
  const message = 
    `📊 PODSUMOWANIE ZAMKNIĘTYCH POZYCJI\n\n` +
    `Liczba transakcji: ${data.length}\n` +
    `✅ Zyskowne: ${countPositive}\n` +
    `❌ Stratne: ${countNegative}\n` +
    `📈 Win Rate: ${winRate.toFixed(1)}%\n\n` +
    `💰 Całkowity koszt: ${totalKoszt.toFixed(2)} PLN\n` +
    `💵 Wartość sprzedaży: ${totalWartoscSprzedazy.toFixed(2)} PLN\n` +
    `${totalZysk >= 0 ? '📈' : '📉'} Zrealizowany zysk: ${totalZysk.toFixed(2)} PLN (${procentZysku.toFixed(2)}%)`;
  
  SpreadsheetApp.getUi().alert(message);
  
  logInfo(message.replace(/\n/g, ' | '));
}

// ═══════════════════════════════════════════════════════════════
// 📋 MENU
// ═══════════════════════════════════════════════════════════════

/**
 * Dodaje menu do arkusza przy otwarciu
 * UWAGA: Ta funkcja rozszerza istniejące onOpen jeśli istnieje
 */
function dodajMenuZamkniete_() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('📁 Zamknięte Pozycje')
    .addItem('🔄 Przenieś do zamkniętych', 'PRZENIES_DO_ZAMKNIETYCH')
    .addItem('⚡ Zamknij po aktualnej cenie', 'ZAMKNIJ_PO_AKTUALNEJ_CENIE')
    .addSeparator()
    .addItem('📊 Podsumowanie zamkniętych', 'PODSUMOWANIE_ZAMKNIETYCH')
    .addItem('🏗️ Utwórz arkusz ZAMKNIĘTE', 'UTWORZ_ARKUSZ_ZAMKNIETE')
    .addToUi();
}

/**
 * Handler dla onOpen - dodaje wszystkie menu
 */
function onOpen() {
  // Menu zamkniętych pozycji
  dodajMenuZamkniete_();
  
  // Menu transakcji (DOKUP, SPRZEDAJ, NOWA POZYCJA)
  if (typeof dodajMenuTransakcje_ === 'function') {
    dodajMenuTransakcje_();
  }
}
