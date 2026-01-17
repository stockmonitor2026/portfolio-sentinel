/**
 * ═══════════════════════════════════════════════════════════════
 * 💱 TRANSAKCJE.gs - Dokupowanie i Sprzedaż Częściowa
 * ═══════════════════════════════════════════════════════════════
 * 
 * FUNKCJE:
 * - DOKUP_DO_POZYCJI - dodaj do istniejącej pozycji z przeliczeniem średniej
 * - SPRZEDAJ_CZESC - sprzedaj część pozycji (reszta zostaje)
 * - Obsługa kursu wymiany PLN/USD przy transakcji
 */

// ═══════════════════════════════════════════════════════════════
// 📈 DOKUPOWANIE DO POZYCJI
// ═══════════════════════════════════════════════════════════════

/**
 * Dokupuje do istniejącej pozycji z przeliczeniem średniej ważonej
 * Zaznacz wiersz z pozycją w arkuszu PORTFEL przed uruchomieniem
 */
function DOKUP_DO_POZYCJI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PORTFEL');
  const ui = SpreadsheetApp.getUi();
  
  if (!sheet) {
    ui.alert('Błąd: Nie znaleziono arkusza PORTFEL');
    return;
  }
  
  // Sprawdź czy jesteśmy w PORTFELU
  if (ss.getActiveSheet().getName() !== 'PORTFEL') {
    ui.alert('Przejdź do arkusza PORTFEL i zaznacz wiersz pozycji do dokupienia.');
    return;
  }
  
  const row = sheet.getActiveRange().getRow();
  if (row < 2) {
    ui.alert('Zaznacz wiersz z pozycją (nie nagłówek).');
    return;
  }
  
  // Pobierz aktualne dane pozycji
  // Kolumny: A-ID, B-TICKER, C-TYP, D-WALUTA, E-ILOŚĆ, F-CENA_USD, G-CENA_PLN, H-KOSZT
  const rowData = sheet.getRange(row, 1, 1, 8).getValues()[0];
  
  const ticker = rowData[1];
  const waluta = rowData[3];
  const staraIlosc = parseFloat(rowData[4]) || 0;
  const staraCenaUSD = parseFloat(rowData[5]) || 0;
  const staraCenaPLN = parseFloat(rowData[6]) || 0;
  
  if (!ticker) {
    ui.alert('Zaznaczony wiersz nie zawiera pozycji.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Ilość dokupiona
  // ═══════════════════════════════════════════════════════════════
  const iloscResponse = ui.prompt(
    `📈 Dokup: ${ticker}`,
    `Aktualna ilość: ${staraIlosc}\n\nPodaj ilość do dokupienia:`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (iloscResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const nowaIlosc = parseFloat(iloscResponse.getResponseText().replace(',', '.'));
  if (isNaN(nowaIlosc) || nowaIlosc <= 0) {
    ui.alert('Błąd: Podaj prawidłową ilość.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Cena zakupu w walucie aktywa
  // ═══════════════════════════════════════════════════════════════
  const cenaResponse = ui.prompt(
    `💰 Cena zakupu: ${ticker}`,
    `Podaj cenę zakupu za sztukę (w ${waluta}):`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (cenaResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const nowaCena = parseFloat(cenaResponse.getResponseText().replace(',', '.'));
  if (isNaN(nowaCena) || nowaCena <= 0) {
    ui.alert('Błąd: Podaj prawidłową cenę.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Cena w PLN za 1 akcję (jeśli waluta ≠ PLN)
  // ═══════════════════════════════════════════════════════════════
  let nowaCenaPLN = nowaCena; // Domyślnie równa cenie w walucie (dla PLN)
  
  if (waluta !== 'PLN') {
    // Oblicz domyślną cenę PLN na podstawie aktualnego kursu
    let aktualnyKurs = 1;
    if (waluta === 'USD') {
      aktualnyKurs = sheet.getRange('N2').getValue() || 4.0;
    } else if (waluta === 'EUR') {
      aktualnyKurs = sheet.getRange('N3').getValue() || 4.3;
    }
    const domyslnaCenaPLN = nowaCena * aktualnyKurs;
    
    const cenaPLNResponse = ui.prompt(
      `💵 Cena w PLN za 1 akcję`,
      `Cena zakupu: ${nowaCena} ${waluta}\n\n` +
      `Podaj cenę w PLN za 1 akcję:\n` +
      `(zostaw puste dla: ${domyslnaCenaPLN.toFixed(2)} PLN)`,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (cenaPLNResponse.getSelectedButton() !== ui.Button.OK) return;
    
    const cenaPLNText = cenaPLNResponse.getResponseText().trim();
    if (cenaPLNText === '') {
      nowaCenaPLN = domyslnaCenaPLN;
    } else {
      nowaCenaPLN = parseFloat(cenaPLNText.replace(',', '.'));
      if (isNaN(nowaCenaPLN) || nowaCenaPLN <= 0) {
        ui.alert('Błąd: Podaj prawidłową cenę.');
        return;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // OBLICZENIA - Średnia ważona
  // ═══════════════════════════════════════════════════════════════
  
  // Stary koszt w walucie oryginalnej (USD/EUR)
  const staryKosztWaluta = staraIlosc * staraCenaUSD;
  
  // Nowy koszt w walucie oryginalnej
  const nowyKosztWaluta = nowaIlosc * nowaCena;
  
  // Stary koszt w PLN
  const staryKosztPLN = staraIlosc * staraCenaPLN;
  
  // Nowy koszt w PLN (używamy ceny PLN wpisanej przez użytkownika)
  const nowyKosztPLN = nowaIlosc * nowaCenaPLN;
  
  // Całkowita ilość
  const calkowitaIlosc = staraIlosc + nowaIlosc;
  
  // Nowa średnia cena w walucie oryginalnej (bezpośrednia średnia ważona)
  const nowaSredniaWaluta = (staryKosztWaluta + nowyKosztWaluta) / calkowitaIlosc;
  
  // Nowa średnia cena w PLN (bezpośrednia średnia ważona)
  const nowaSredniaPLN = (staryKosztPLN + nowyKosztPLN) / calkowitaIlosc;
  
  // Nowy całkowity koszt w walucie oryginalnej
  const nowyCalkowityKosztWaluta = staryKosztWaluta + nowyKosztWaluta;
  
  // Nowy całkowity koszt w PLN
  const nowyCalkowityKoszt = staryKosztPLN + nowyKosztPLN;
  
  // ═══════════════════════════════════════════════════════════════
  // AKTUALIZACJA ARKUSZA
  // ═══════════════════════════════════════════════════════════════
  
  // E - ILOŚĆ
  sheet.getRange(row, 5).setValue(calkowitaIlosc);
  
  // F - CENA_SREDNIA_USD (w walucie oryginalnej)
  sheet.getRange(row, 6).setValue(nowaSredniaWaluta);
  
  // G - CENA_SREDNIA_PLN
  sheet.getRange(row, 7).setValue(nowaSredniaPLN);
  
  // H - KOSZT_CALKOWITY zostanie przeliczony przez formułę (E*G)
  // Ale jeśli nie ma formuły, ustawiamy ręcznie
  sheet.getRange(row, 8).setValue(nowyCalkowityKoszt);
  
  // ═══════════════════════════════════════════════════════════════
  // POTWIERDZENIE
  // ═══════════════════════════════════════════════════════════════
  
  ui.alert(
    '✅ Dokupiono do pozycji',
    `${ticker}\n\n` +
    `📊 Poprzednia ilość: ${staraIlosc}\n` +
    `➕ Dokupiono: ${nowaIlosc} × ${nowaCena} ${waluta} (${nowaCenaPLN.toFixed(2)} PLN)\n` +
    `📈 Nowa ilość: ${calkowitaIlosc}\n\n` +
    `💰 Stara średnia: ${staraCenaUSD.toFixed(2)} ${waluta} / ${staraCenaPLN.toFixed(2)} PLN\n` +
    `💰 Nowa średnia: ${nowaSredniaWaluta.toFixed(2)} ${waluta} / ${nowaSredniaPLN.toFixed(2)} PLN\n\n` +
    `📦 Całkowity koszt: ${nowyCalkowityKosztWaluta.toFixed(2)} ${waluta} / ${nowyCalkowityKoszt.toFixed(2)} PLN`,
    ui.ButtonSet.OK
  );
  
  console.log(`[DOKUP] ${ticker}: +${nowaIlosc} @ ${nowaCena} ${waluta} (${nowaCenaPLN.toFixed(2)} PLN), nowa średnia: ${nowaSredniaPLN.toFixed(2)} PLN`);
}

// ═══════════════════════════════════════════════════════════════
// 📉 SPRZEDAŻ CZĘŚCIOWA
// ═══════════════════════════════════════════════════════════════

/**
 * Sprzedaje część pozycji - reszta zostaje w portfelu
 * Część sprzedana trafia do arkusza ZAMKNIĘTE
 */
function SPRZEDAJ_CZESC() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PORTFEL');
  const ui = SpreadsheetApp.getUi();
  
  if (!sheet) {
    ui.alert('Błąd: Nie znaleziono arkusza PORTFEL');
    return;
  }
  
  if (ss.getActiveSheet().getName() !== 'PORTFEL') {
    ui.alert('Przejdź do arkusza PORTFEL i zaznacz wiersz pozycji.');
    return;
  }
  
  const row = sheet.getActiveRange().getRow();
  if (row < 2) {
    ui.alert('Zaznacz wiersz z pozycją (nie nagłówek).');
    return;
  }
  
  // Pobierz dane pozycji
  const rowData = sheet.getRange(row, 1, 1, 14).getValues()[0];
  
  const id = rowData[0];
  const ticker = rowData[1];
  const typ = rowData[2];
  const waluta = rowData[3];
  const aktualnaIlosc = parseFloat(rowData[4]) || 0;
  const cenaKupnaUSD = parseFloat(rowData[5]) || 0;
  const cenaKupnaPLN = parseFloat(rowData[6]) || 0;
  
  if (!ticker) {
    ui.alert('Zaznaczony wiersz nie zawiera pozycji.');
    return;
  }
  
  if (aktualnaIlosc <= 0) {
    ui.alert('Brak akcji do sprzedania.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Ilość do sprzedaży
  // ═══════════════════════════════════════════════════════════════
  const iloscResponse = ui.prompt(
    `📉 Sprzedaj: ${ticker}`,
    `Aktualna ilość: ${aktualnaIlosc}\n\nIle sztuk sprzedajesz?`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (iloscResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const iloscSprzedana = parseFloat(iloscResponse.getResponseText().replace(',', '.'));
  
  if (isNaN(iloscSprzedana) || iloscSprzedana <= 0) {
    ui.alert('Błąd: Podaj prawidłową ilość.');
    return;
  }
  
  if (iloscSprzedana > aktualnaIlosc) {
    ui.alert(`Błąd: Nie możesz sprzedać więcej niż masz (${aktualnaIlosc}).`);
    return;
  }
  
  // Jeśli sprzedaje wszystko - użyj funkcji PRZENIES_DO_ZAMKNIETYCH
  if (iloscSprzedana === aktualnaIlosc) {
    const confirm = ui.alert(
      'Sprzedajesz całą pozycję',
      'Czy chcesz przenieść całą pozycję do ZAMKNIĘTE?',
      ui.ButtonSet.YES_NO
    );
    if (confirm === ui.Button.YES) {
      PRZENIES_DO_ZAMKNIETYCH();
    }
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Cena sprzedaży
  // ═══════════════════════════════════════════════════════════════
  const cenaResponse = ui.prompt(
    `💰 Cena sprzedaży: ${ticker}`,
    `Podaj cenę sprzedaży za sztukę (w ${waluta}):`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (cenaResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const cenaSprzedazy = parseFloat(cenaResponse.getResponseText().replace(',', '.'));
  if (isNaN(cenaSprzedazy) || cenaSprzedazy <= 0) {
    ui.alert('Błąd: Podaj prawidłową cenę.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Cena w PLN za 1 akcję (jeśli waluta ≠ PLN)
  // ═══════════════════════════════════════════════════════════════
  let cenaSprzedazyPLN = cenaSprzedazy;
  
  if (waluta !== 'PLN') {
    let aktualnyKurs = 1;
    if (waluta === 'USD') {
      aktualnyKurs = sheet.getRange('N2').getValue() || 4.0;
    } else if (waluta === 'EUR') {
      aktualnyKurs = sheet.getRange('N3').getValue() || 4.3;
    }
    const domyslnaCenaPLN = cenaSprzedazy * aktualnyKurs;
    
    const cenaPLNResponse = ui.prompt(
      `💵 Cena sprzedaży w PLN za 1 akcję`,
      `Cena sprzedaży: ${cenaSprzedazy} ${waluta}\n\n` +
      `Podaj cenę w PLN za 1 akcję:\n` +
      `(zostaw puste dla: ${domyslnaCenaPLN.toFixed(2)} PLN)`,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (cenaPLNResponse.getSelectedButton() !== ui.Button.OK) return;
    
    const cenaPLNText = cenaPLNResponse.getResponseText().trim();
    if (cenaPLNText === '') {
      cenaSprzedazyPLN = domyslnaCenaPLN;
    } else {
      cenaSprzedazyPLN = parseFloat(cenaPLNText.replace(',', '.'));
      if (isNaN(cenaSprzedazyPLN) || cenaSprzedazyPLN <= 0) {
        ui.alert('Błąd: Podaj prawidłową cenę.');
        return;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // OBLICZENIA
  // ═══════════════════════════════════════════════════════════════
  
  // Koszt sprzedanej części (proporcjonalny)
  const kosztSprzedanejCzesci = iloscSprzedana * cenaKupnaPLN;
  
  // Wartość sprzedaży
  const wartoscSprzedazy = iloscSprzedana * cenaSprzedazyPLN;
  
  // Zysk zrealizowany
  const zyskZrealizowany = wartoscSprzedazy - kosztSprzedanejCzesci;
  const zyskProcent = kosztSprzedanejCzesci > 0 ? (zyskZrealizowany / kosztSprzedanejCzesci) * 100 : 0;
  
  // Pozostała ilość
  const pozostalaIlosc = aktualnaIlosc - iloscSprzedana;
  
  // Oblicz kurs transakcji (do zapisu)
  const kursTransakcji = cenaSprzedazyPLN / cenaSprzedazy;
  
  // ═══════════════════════════════════════════════════════════════
  // DODAJ DO ZAMKNIĘTE
  // ═══════════════════════════════════════════════════════════════
  
  // Utwórz arkusz ZAMKNIĘTE jeśli nie istnieje
  let closedSheet = ss.getSheetByName('ZAMKNIĘTE');
  if (!closedSheet) {
    closedSheet = UTWORZ_ARKUSZ_ZAMKNIETE();
  }
  
  const newRow = closedSheet.getLastRow() + 1;
  const dataSprzedazy = new Date();
  
  // Generuj ID dla częściowej sprzedaży
  const partialId = `${id}-PART-${Date.now()}`;
  
  closedSheet.getRange(newRow, 1, 1, 14).setValues([[
    partialId,
    ticker,
    typ,
    waluta,
    iloscSprzedana,
    cenaKupnaUSD,
    cenaKupnaPLN,
    kosztSprzedanejCzesci,
    cenaSprzedazy,
    dataSprzedazy,
    wartoscSprzedazy,
    zyskZrealizowany,
    zyskProcent / 100,
    kursTransakcji
  ]]);
  
  // Formatowanie
  closedSheet.getRange(newRow, 10).setNumberFormat('yyyy-mm-dd');
  closedSheet.getRange(newRow, 13).setNumberFormat('0.00%');
  closedSheet.getRange(newRow, 8).setNumberFormat('#,##0.00 "PLN"');
  closedSheet.getRange(newRow, 11).setNumberFormat('#,##0.00 "PLN"');
  closedSheet.getRange(newRow, 12).setNumberFormat('#,##0.00 "PLN"');
  
  // ═══════════════════════════════════════════════════════════════
  // AKTUALIZUJ PORTFEL - zmniejsz ilość
  // ═══════════════════════════════════════════════════════════════
  
  // E - ILOŚĆ (zmniejszona)
  sheet.getRange(row, 5).setValue(pozostalaIlosc);
  
  // H - KOSZT_CALKOWITY (proporcjonalnie zmniejszony)
  const nowyKosztCalkowity = pozostalaIlosc * cenaKupnaPLN;
  sheet.getRange(row, 8).setValue(nowyKosztCalkowity);
  
  // ═══════════════════════════════════════════════════════════════
  // POTWIERDZENIE
  // ═══════════════════════════════════════════════════════════════
  
  const zyskText = zyskZrealizowany >= 0 ? `+${zyskZrealizowany.toFixed(2)}` : zyskZrealizowany.toFixed(2);
  
  ui.alert(
    '✅ Sprzedano część pozycji',
    `${ticker}\n\n` +
    `📉 Sprzedano: ${iloscSprzedana} × ${cenaSprzedazy} ${waluta} (${cenaSprzedazyPLN.toFixed(2)} PLN)\n` +
    `💵 Wartość: ${wartoscSprzedazy.toFixed(2)} PLN\n` +
    `${zyskZrealizowany >= 0 ? '📈' : '📉'} Zysk: ${zyskText} PLN (${zyskProcent.toFixed(2)}%)\n\n` +
    `📦 Pozostało w portfelu: ${pozostalaIlosc} szt.`,
    ui.ButtonSet.OK
  );
  
  console.log(`[SPRZEDAJ] ${ticker}: -${iloscSprzedana} @ ${cenaSprzedazy} ${waluta}, zysk: ${zyskText} PLN, pozostało: ${pozostalaIlosc}`);
}

// ═══════════════════════════════════════════════════════════════
// 🆕 NOWA POZYCJA
// ═══════════════════════════════════════════════════════════════

/**
 * Dodaje nową pozycję do portfela przez dialog
 */
function DODAJ_NOWA_POZYCJE() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PORTFEL');
  const ui = SpreadsheetApp.getUi();
  
  if (!sheet) {
    ui.alert('Błąd: Nie znaleziono arkusza PORTFEL');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Ticker
  // ═══════════════════════════════════════════════════════════════
  const tickerResponse = ui.prompt(
    '🆕 Nowa pozycja',
    'Podaj ticker (np. AAPL, VUAA, BTC):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (tickerResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const ticker = tickerResponse.getResponseText().trim().toUpperCase();
  if (!ticker) {
    ui.alert('Błąd: Ticker nie może być pusty.');
    return;
  }
  
  // Sprawdź czy ticker już istnieje
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const tickers = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (let i = 0; i < tickers.length; i++) {
      if (tickers[i][0] && tickers[i][0].toString().toUpperCase() === ticker) {
        const confirm = ui.alert(
          '⚠️ Ticker już istnieje',
          `${ticker} już jest w portfelu. Czy chcesz dokupić do istniejącej pozycji?`,
          ui.ButtonSet.YES_NO
        );
        if (confirm === ui.Button.YES) {
          // Zaznacz wiersz i uruchom DOKUP
          sheet.setActiveRange(sheet.getRange(i + 2, 1));
          DOKUP_DO_POZYCJI();
        }
        return;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Typ aktywa
  // ═══════════════════════════════════════════════════════════════
  const typResponse = ui.prompt(
    '📁 Typ aktywa',
    'Podaj typ:\n1. AKCJA\n2. ETF\n3. KRYPTO\n4. OBLIGACJA\n5. SUROWIEC\n6. GOTÓWKA\n\n(wpisz numer lub nazwę)',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (typResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const typyMap = { '1': 'AKCJA', '2': 'ETF', '3': 'KRYPTO', '4': 'OBLIGACJA', '5': 'SUROWIEC', '6': 'GOTÓWKA' };
  let typ = typResponse.getResponseText().trim().toUpperCase();
  typ = typyMap[typ] || typ;
  
  if (!['AKCJA', 'ETF', 'KRYPTO', 'OBLIGACJA', 'SUROWIEC', 'GOTÓWKA'].includes(typ)) {
    ui.alert('Błąd: Nieznany typ aktywa.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Waluta
  // ═══════════════════════════════════════════════════════════════
  const walutaResponse = ui.prompt(
    '💱 Waluta',
    'Podaj walutę (USD, EUR, PLN, GBP):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (walutaResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const waluta = walutaResponse.getResponseText().trim().toUpperCase();
  if (!['USD', 'EUR', 'PLN', 'GBP'].includes(waluta)) {
    ui.alert('Błąd: Nieznana waluta.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Ilość
  // ═══════════════════════════════════════════════════════════════
  const iloscResponse = ui.prompt(
    '📊 Ilość',
    `Podaj ilość ${ticker}:`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (iloscResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const ilosc = parseFloat(iloscResponse.getResponseText().replace(',', '.'));
  if (isNaN(ilosc) || ilosc <= 0) {
    ui.alert('Błąd: Podaj prawidłową ilość.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Cena zakupu w walucie
  // ═══════════════════════════════════════════════════════════════
  const cenaResponse = ui.prompt(
    '💰 Cena zakupu',
    `Podaj cenę zakupu za sztukę (w ${waluta}):`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (cenaResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const cenaWaluta = parseFloat(cenaResponse.getResponseText().replace(',', '.'));
  if (isNaN(cenaWaluta) || cenaWaluta <= 0) {
    ui.alert('Błąd: Podaj prawidłową cenę.');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DIALOG: Cena w PLN (jeśli waluta ≠ PLN)
  // ═══════════════════════════════════════════════════════════════
  let cenaPLN = cenaWaluta; // Domyślnie równa cenie w walucie (dla PLN)
  
  if (waluta !== 'PLN') {
    // Oblicz domyślną cenę PLN na podstawie aktualnego kursu
    let aktualnyKurs = 1;
    if (waluta === 'USD') {
      aktualnyKurs = sheet.getRange('N2').getValue() || 4.0;
    } else if (waluta === 'EUR') {
      aktualnyKurs = sheet.getRange('N3').getValue() || 4.3;
    }
    const domyslnaCenaPLN = cenaWaluta * aktualnyKurs;
    
    const cenaPLNResponse = ui.prompt(
      `💵 Cena w PLN za 1 akcję`,
      `Cena zakupu: ${cenaWaluta} ${waluta}\n\n` +
      `Podaj cenę w PLN za 1 akcję:\n` +
      `(zostaw puste dla: ${domyslnaCenaPLN.toFixed(2)} PLN)`,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (cenaPLNResponse.getSelectedButton() !== ui.Button.OK) return;
    
    const cenaPLNText = cenaPLNResponse.getResponseText().trim();
    if (cenaPLNText === '') {
      cenaPLN = domyslnaCenaPLN;
    } else {
      cenaPLN = parseFloat(cenaPLNText.replace(',', '.'));
      if (isNaN(cenaPLN) || cenaPLN <= 0) {
        ui.alert('Błąd: Podaj prawidłową cenę.');
        return;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // OBLICZENIA I ZAPIS
  // ═══════════════════════════════════════════════════════════════
  const kosztCalkowity = ilosc * cenaPLN;
  
  // Generuj ID
  const id = `PF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Dodaj wiersz
  const newRow = sheet.getLastRow() + 1;
  
  sheet.getRange(newRow, 1, 1, 8).setValues([[
    id,
    ticker,
    typ,
    waluta,
    ilosc,
    cenaWaluta,  // Cena w walucie oryginalnej
    cenaPLN,     // Cena w PLN
    kosztCalkowity
  ]]);
  
  // ═══════════════════════════════════════════════════════════════
  // USTAW FORMUŁY DLA NOWEGO WIERSZA (kolumny J-M)
  // ═══════════════════════════════════════════════════════════════
  
  // J - WARTOSC_PLN: =IF(D="USD", E*I*$N$2, IF(D="EUR", E*I*$N$3, E*I))
  sheet.getRange(newRow, 10).setFormula(
    `=IF(D${newRow}="USD", E${newRow}*I${newRow}*$N$2, IF(D${newRow}="EUR", E${newRow}*I${newRow}*$N$3, E${newRow}*I${newRow}))`
  );
  
  // K - ZYSK_TOTAL: =J-H
  sheet.getRange(newRow, 11).setFormula(`=J${newRow}-H${newRow}`);
  
  // L - WYNIK_AKCJI: różnica cen * ilość * kurs
  sheet.getRange(newRow, 12).setFormula(
    `=IF(D${newRow}="USD", (I${newRow}-F${newRow})*E${newRow}*$N$2, IF(D${newRow}="EUR", (I${newRow}-F${newRow})*E${newRow}*$N$3, 0))`
  );
  
  // M - WPLYW_FX: =ZYSK_TOTAL - WYNIK_AKCJI
  sheet.getRange(newRow, 13).setFormula(`=K${newRow}-L${newRow}`);
  
  // ═══════════════════════════════════════════════════════════════
  // POTWIERDZENIE
  // ═══════════════════════════════════════════════════════════════
  
  ui.alert(
    '✅ Dodano nową pozycję',
    `${ticker}\n\n` +
    `📁 Typ: ${typ}\n` +
    `💱 Waluta: ${waluta}\n` +
    `📊 Ilość: ${ilosc}\n` +
    `💰 Cena: ${cenaWaluta} ${waluta} = ${cenaPLN.toFixed(2)} PLN\n` +
    `📦 Całkowity koszt: ${kosztCalkowity.toFixed(2)} PLN`,
    ui.ButtonSet.OK
  );
  
  console.log(`[NOWA] ${ticker}: ${ilosc} × ${cenaWaluta} ${waluta}, koszt: ${kosztCalkowity.toFixed(2)} PLN`);
}

// ═══════════════════════════════════════════════════════════════
// 📋 MENU TRANSAKCJI
// ═══════════════════════════════════════════════════════════════

/**
 * Dodaje menu transakcji
 */
function dodajMenuTransakcje_() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('💱 Transakcje')
    .addItem('🆕 Nowa pozycja', 'DODAJ_NOWA_POZYCJE')
    .addItem('📈 Dokup do pozycji', 'DOKUP_DO_POZYCJI')
    .addSeparator()
    .addItem('📉 Sprzedaj część', 'SPRZEDAJ_CZESC')
    .addItem('🔄 Zamknij całą pozycję', 'PRZENIES_DO_ZAMKNIETYCH')
    .addItem('⚡ Zamknij po aktualnej cenie', 'ZAMKNIJ_PO_AKTUALNEJ_CENIE')
    .addSeparator()
    .addItem('📊 Podsumowanie zamkniętych', 'PODSUMOWANIE_ZAMKNIETYCH')
    .addToUi();
}

/**
 * Rozszerz onOpen o menu transakcji
 * UWAGA: Dodaj wywołanie tej funkcji do głównego onOpen
 */
function setupTransakcjeMenu() {
  dodajMenuTransakcje_();
}

// ═══════════════════════════════════════════════════════════════
// 📥 IMPORT CSV - Trading 212
// ═══════════════════════════════════════════════════════════════

/**
 * 📥 Importuje pozycje z CSV Trading 212
 * 
 * INSTRUKCJA:
 * 1. W Trading 212: Portfolio → Export → CSV
 * 2. Utwórz arkusz IMPORT_CSV i wklej tam dane
 * 3. Uruchom tę funkcję
 * 
 * INTELIGENTNA DEDULIKACJA:
 * - Jeśli ticker już istnieje → aktualizuje ilość i średnią cenę
 * - Jeśli nie istnieje → dodaje nową pozycję
 */
function IMPORTUJ_CSV_TRADING212() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  // Sprawdź czy jest arkusz IMPORT_CSV
  let importSheet = ss.getSheetByName('IMPORT_CSV');
  
  if (!importSheet) {
    ui.alert(
      '📥 Import CSV - Instrukcja',
      'Aby zaimportować dane z Trading 212:\n\n' +
      '1. Utwórz nowy arkusz o nazwie IMPORT_CSV\n' +
      '2. W Trading 212: Portfolio → Export → Download CSV\n' +
      '3. Otwórz plik CSV i skopiuj zawartość\n' +
      '4. Wklej do arkusza IMPORT_CSV\n' +
      '5. Uruchom ponownie tę funkcję\n\n' +
      'Oczekiwane kolumny:\n' +
      '• Ticker / Instrument\n' +
      '• No. of shares / Quantity\n' +
      '• Price / share / Average price\n' +
      '• Currency (opcjonalnie)',
      ui.ButtonSet.OK
    );
    return;
  }
  
  const portfel = ss.getSheetByName('PORTFEL');
  if (!portfel) {
    ui.alert('Błąd: Nie znaleziono arkusza PORTFEL');
    return;
  }
  
  // Pobierz dane z IMPORT_CSV
  const lastRow = importSheet.getLastRow();
  const lastCol = importSheet.getLastColumn();
  
  if (lastRow < 2) {
    ui.alert('Arkusz IMPORT_CSV jest pusty lub zawiera tylko nagłówek.');
    return;
  }
  
  // Znajdź kolumny na podstawie nagłówków
  const headers = importSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => h.toString().toLowerCase());
  
  const colMap = {
    ticker: findColumn_(headers, ['ticker', 'instrument', 'symbol', 'name']),
    shares: findColumn_(headers, ['no. of shares', 'shares', 'quantity', 'qty', 'ilość']),
    price: findColumn_(headers, ['price / share', 'price', 'average', 'avg price', 'avg. price', 'cena']),
    currency: findColumn_(headers, ['currency', 'waluta', 'ccy']),
    value: findColumn_(headers, ['value', 'total', 'wartość'])
  };
  
  if (colMap.ticker === -1) {
    ui.alert('Nie znaleziono kolumny z tickerem.\nSprawdź czy nagłówki są poprawne.');
    return;
  }
  
  if (colMap.shares === -1) {
    ui.alert('Nie znaleziono kolumny z ilością akcji.\nSprawdź czy nagłówki są poprawne.');
    return;
  }
  
  // Pobierz istniejące pozycje z portfela
  const existingPositions = getExistingPositions_(portfel);
  
  // Pobierz dane do importu
  const importData = importSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const logs = [];
  
  for (const row of importData) {
    let ticker = colMap.ticker >= 0 ? row[colMap.ticker] : '';
    let shares = colMap.shares >= 0 ? parseFloat(row[colMap.shares]) || 0 : 0;
    let price = colMap.price >= 0 ? parseFloat(row[colMap.price]) || 0 : 0;
    let currency = colMap.currency >= 0 ? row[colMap.currency] : 'USD';
    
    // Wyczyść ticker
    ticker = cleanTicker_(ticker);
    
    if (!ticker || shares <= 0) {
      skipped++;
      continue;
    }
    
    // Ustaw domyślną walutę jeśli pusta
    if (!currency) currency = 'USD';
    currency = currency.toString().toUpperCase();
    
    // Pobierz kurs waluty
    let kurs = 1;
    if (currency === 'USD') {
      kurs = portfel.getRange('N2').getValue() || 4.0;
    } else if (currency === 'EUR') {
      kurs = portfel.getRange('N3').getValue() || 4.3;
    }
    
    // Sprawdź czy ticker już istnieje
    const existingRow = existingPositions[ticker.toUpperCase()];
    
    if (existingRow) {
      // AKTUALIZUJ istniejącą pozycję
      updateExistingPosition_(portfel, existingRow, shares, price, price * kurs);
      updated++;
      logs.push(`🔄 ${ticker}: zaktualizowano (${shares} szt. @ ${price} ${currency})`);
    } else {
      // DODAJ nową pozycję
      addNewPosition_(portfel, ticker, shares, price, currency, kurs);
      added++;
      logs.push(`➕ ${ticker}: dodano (${shares} szt. @ ${price} ${currency})`);
      
      // Dodaj do mapy żeby uniknąć duplikatów w tej samej sesji importu
      existingPositions[ticker.toUpperCase()] = portfel.getLastRow();
    }
  }
  
  // Podsumowanie
  const summary = `📥 IMPORT ZAKOŃCZONY\n\n` +
    `➕ Dodano: ${added}\n` +
    `🔄 Zaktualizowano: ${updated}\n` +
    `⏭️ Pominięto: ${skipped}\n\n` +
    `Szczegóły w logach (Widok → Logi)`;
  
  ui.alert('Import Trading 212', summary, ui.ButtonSet.OK);
  
  // Loguj szczegóły
  for (const log of logs) {
    console.log(log);
  }
  
  console.log(`[IMPORT] Dodano: ${added}, Zaktualizowano: ${updated}, Pominięto: ${skipped}`);
}

/**
 * Znajduje indeks kolumny na podstawie możliwych nazw
 */
function findColumn_(headers, possibleNames) {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toString().toLowerCase().trim();
    for (const name of possibleNames) {
      if (header.includes(name.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Czyści ticker z niepotrzebnych znaków
 */
function cleanTicker_(ticker) {
  if (!ticker) return '';
  
  let cleaned = ticker.toString().trim().toUpperCase();
  
  // Usuń sufiks giełdy (np. "_EQ" z Trading 212)
  cleaned = cleaned.replace(/_EQ$/i, '');
  cleaned = cleaned.replace(/_US$/i, '');
  cleaned = cleaned.replace(/_UK$/i, '');
  
  // Usuń białe znaki
  cleaned = cleaned.replace(/\s+/g, '');
  
  return cleaned;
}

/**
 * Pobiera mapę istniejących pozycji (ticker → row number)
 */
function getExistingPositions_(sheet) {
  const positions = {};
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return positions;
  
  const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  
  for (let i = 0; i < data.length; i++) {
    const ticker = data[i][0];
    if (ticker) {
      positions[ticker.toString().toUpperCase()] = i + 2; // Row number (1-indexed, +1 for header)
    }
  }
  
  return positions;
}

/**
 * Aktualizuje istniejącą pozycję (średnia ważona)
 */
function updateExistingPosition_(sheet, rowNum, newShares, newPriceUSD, newPricePLN) {
  // Pobierz aktualne dane
  const currentData = sheet.getRange(rowNum, 5, 1, 3).getValues()[0];
  const currentShares = parseFloat(currentData[0]) || 0;
  const currentPriceUSD = parseFloat(currentData[1]) || 0;
  const currentPricePLN = parseFloat(currentData[2]) || 0;
  
  // Oblicz średnią ważoną
  const totalShares = currentShares + newShares;
  const avgPriceUSD = (currentShares * currentPriceUSD + newShares * newPriceUSD) / totalShares;
  const avgPricePLN = (currentShares * currentPricePLN + newShares * newPricePLN) / totalShares;
  const totalCost = totalShares * avgPricePLN;
  
  // Zaktualizuj
  sheet.getRange(rowNum, 5).setValue(totalShares);   // Ilość
  sheet.getRange(rowNum, 6).setValue(avgPriceUSD);   // Cena USD
  sheet.getRange(rowNum, 7).setValue(avgPricePLN);   // Cena PLN
  sheet.getRange(rowNum, 8).setValue(totalCost);     // Koszt całkowity
}

/**
 * Dodaje nową pozycję do portfela
 */
function addNewPosition_(sheet, ticker, shares, priceUSD, currency, kurs) {
  const pricePLN = priceUSD * kurs;
  const totalCost = shares * pricePLN;
  
  // Określ typ na podstawie tickera
  let typ = 'AKCJA';
  if (ticker.includes('ETF') || ['VUAA', 'VWCE', 'CSPX', 'SPY', 'QQQ'].includes(ticker)) {
    typ = 'ETF';
  } else if (['BTC', 'ETH', 'SOL', 'XRP'].includes(ticker)) {
    typ = 'KRYPTO';
  }
  
  const id = `PF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newRow = sheet.getLastRow() + 1;
  
  // Dodaj dane
  sheet.getRange(newRow, 1, 1, 8).setValues([[
    id,
    ticker,
    typ,
    currency,
    shares,
    priceUSD,
    pricePLN,
    totalCost
  ]]);
  
  // Ustaw formuły
  sheet.getRange(newRow, 10).setFormula(
    `=IF(D${newRow}="USD", E${newRow}*I${newRow}*$N$2, IF(D${newRow}="EUR", E${newRow}*I${newRow}*$N$3, E${newRow}*I${newRow}))`
  );
  sheet.getRange(newRow, 11).setFormula(`=J${newRow}-H${newRow}`);
  sheet.getRange(newRow, 12).setFormula(
    `=IF(D${newRow}="USD", (I${newRow}-F${newRow})*E${newRow}*$N$2, IF(D${newRow}="EUR", (I${newRow}-F${newRow})*E${newRow}*$N$3, 0))`
  );
  sheet.getRange(newRow, 13).setFormula(`=K${newRow}-L${newRow}`);
}

/**
 * 🧹 Czyści arkusz IMPORT_CSV po zakończonym imporcie
 */
function WYCZYSC_IMPORT_CSV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('IMPORT_CSV');
  
  if (sheet) {
    sheet.clear();
    logSuccess('Arkusz IMPORT_CSV wyczyszczony');
  }
}
