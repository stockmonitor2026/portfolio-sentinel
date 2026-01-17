/**
 * ═══════════════════════════════════════════════════════════════
 * 🚀 SETUP_WIZARD.gs - Konfiguracja dla nowych użytkowników
 * ═══════════════════════════════════════════════════════════════
 * 
 * Funkcje startowe dla nowego arkusza:
 * 1. PEŁNA_INSTALACJA() - Setup jednym kliknięciem
 * 2. KONFIGURUJ_STRATEGIĘ() - Wybór profilu inwestycyjnego
 * 3. TESTUJ_POŁĄCZENIE() - Sprawdź czy wszystko działa
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// 📋 PROFILE INWESTYCYJNE
// ═══════════════════════════════════════════════════════════════

const PROFILE_INWESTYCYJNE = {
  KONSERWATYWNY: {
    nazwa: 'Konserwatywny (Bezpieczeństwo)',
    opis: 'Dla osób ceniących stabilność. Minimalne ryzyko.',
    core_procent: 85,
    satellites_procent: 15,
    core_typy: ['ETF', 'SKARB', 'REIT', 'BANK_DIV'],
    satellites_typy: ['AKCJA'],
    alert_core_min: 75,
    max_single_satellite: 10,
    emoji: '🛡️'
  },
  
  ZBALANSOWANY: {
    nazwa: 'Zbalansowany (Równowaga)',
    opis: 'Równowaga między wzrostem a bezpieczeństwem.',
    core_procent: 70,
    satellites_procent: 30,
    core_typy: ['ETF', 'SKARB', 'REIT', 'BANK_DIV'],
    satellites_typy: ['AKCJA', 'KRYPTO'],
    alert_core_min: 60,
    max_single_satellite: 20,
    emoji: '⚖️'
  },
  
  AGRESYWNY: {
    nazwa: 'Agresywny (Wzrost)',
    opis: 'Maksymalny potencjał wzrostu. Wyższe ryzyko.',
    core_procent: 50,
    satellites_procent: 50,
    core_typy: ['ETF'],
    satellites_typy: ['AKCJA', 'KRYPTO', 'KASYNO'],
    alert_core_min: 40,
    max_single_satellite: 30,
    emoji: '🚀'
  }
};

// ═══════════════════════════════════════════════════════════════
// 🎯 GŁÓWNE FUNKCJE
// ═══════════════════════════════════════════════════════════════

/**
 * Pełna instalacja jednym kliknięciem
 * Uruchom to jako PIERWSZY po skopiowaniu arkusza!
 */
function PELNA_INSTALACJA() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('🚀 SENTINEL - PEŁNA INSTALACJA');
  Logger.log('═══════════════════════════════════════════════════════════');
  
  // 1. Sprawdź czy już zainstalowany
  const props = PropertiesService.getScriptProperties();
  const installed = props.getProperty('SENTINEL_INSTALLED');
  
  if (installed === 'true') {
    Logger.log('⚠️ SENTINEL już zainstalowany!');
    Logger.log('Aby zresetować: usuń SENTINEL_INSTALLED z właściwości skryptu');
    return;
  }
  
  // 2. Utwórz arkusze pomocnicze
  Logger.log('\n📊 Tworzenie arkuszy...');
  utworzArkuszePodstawowe_();
  
  // 3. Utwórz arkusz CSV_IMPORT
  Logger.log('\n📥 Tworzenie arkusza CSV_IMPORT...');
  try {
    UTWORZ_ARKUSZ_CSV_IMPORT();
  } catch(e) {
    Logger.log('⚠️ UTWORZ_ARKUSZ_CSV_IMPORT nie znaleziony lub błąd');
  }
  
  // 4. Domyślny profil: Zbalansowany
  Logger.log('\n⚖️ Ustawiam domyślny profil: ZBALANSOWANY');
  ustawProfil_('ZBALANSOWANY');
  
  // 5. Pokaż instrukcję
  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('✅ INSTALACJA ZAKOŃCZONA!');
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('\n📌 NASTĘPNE KROKI:');
  Logger.log('1. Dodaj klucze API (Ustawienia projektu → Właściwości skryptu):');
  Logger.log('   - GROQ_KEY: https://console.groq.com/keys');
  Logger.log('   - FINNHUB_KEY: https://finnhub.io (opcjonalnie)');
  Logger.log('');
  Logger.log('2. Wybierz profil inwestycyjny:');
  Logger.log('   - KONFIGURUJ_STRATEGIE() → pokazuje profile');
  Logger.log('   - USTAW_PROFIL_KONSERWATYWNY() → dla bezpieczeństwa');
  Logger.log('   - USTAW_PROFIL_AGRESYWNY() → dla wzrostu');
  Logger.log('');
  Logger.log('3. Zaimportuj portfel:');
  Logger.log('   - INSTRUKCJA_IMPORT_CSV() → z Trading 212');
  Logger.log('   - Lub wpisz ręcznie do arkusza PORTFEL');
  Logger.log('');
  Logger.log('4. Testuj:');
  Logger.log('   - TESTUJ_POLACZENIE() → sprawdź czy wszystko działa');
  Logger.log('   - ZAPYTAJ_ASYSTENTA("Oceń mój portfel")');
  
  // Oznacz jako zainstalowany
  props.setProperty('SENTINEL_INSTALLED', 'true');
  props.setProperty('SENTINEL_INSTALL_DATE', new Date().toISOString());
  
  return 'Instalacja zakończona! Sprawdź logi.';
}

/**
 * Pokazuje dostępne profile i aktualne ustawienia
 */
function KONFIGURUJ_STRATEGIE() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('🎯 PROFILE INWESTYCYJNE SENTINEL');
  Logger.log('═══════════════════════════════════════════════════════════');
  
  const aktualny = pobierzAktualnyProfil_();
  
  for (const [key, profil] of Object.entries(PROFILE_INWESTYCYJNE)) {
    const czyAktualny = (key === aktualny) ? ' ← AKTUALNY' : '';
    Logger.log(`\n${profil.emoji} ${profil.nazwa}${czyAktualny}`);
    Logger.log(`   ${profil.opis}`);
    Logger.log(`   Core: ${profil.core_procent}% | Satellites: ${profil.satellites_procent}%`);
    Logger.log(`   Max pozycja spekulacyjna: ${profil.max_single_satellite}%`);
  }
  
  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('📌 Aby zmienić profil, uruchom jedną z funkcji:');
  Logger.log('   - USTAW_PROFIL_KONSERWATYWNY()');
  Logger.log('   - USTAW_PROFIL_ZBALANSOWANY()');
  Logger.log('   - USTAW_PROFIL_AGRESYWNY()');
  
  return `Aktualny profil: ${aktualny || 'ZBALANSOWANY'}`;
}

/**
 * Ustawia profil KONSERWATYWNY (85/15)
 */
function USTAW_PROFIL_KONSERWATYWNY() {
  ustawProfil_('KONSERWATYWNY');
  Logger.log('🛡️ Profil zmieniony na KONSERWATYWNY');
  Logger.log('   Core: 85% | Satellites: 15%');
  Logger.log('   SENTINEL będzie teraz bardziej ostrożny w rekomendacjach.');
  return 'Profil: KONSERWATYWNY';
}

/**
 * Ustawia profil ZBALANSOWANY (70/30)
 */
function USTAW_PROFIL_ZBALANSOWANY() {
  ustawProfil_('ZBALANSOWANY');
  Logger.log('⚖️ Profil zmieniony na ZBALANSOWANY');
  Logger.log('   Core: 70% | Satellites: 30%');
  Logger.log('   SENTINEL będzie balansować bezpieczeństwo ze wzrostem.');
  return 'Profil: ZBALANSOWANY';
}

/**
 * Ustawia profil AGRESYWNY (50/50)
 */
function USTAW_PROFIL_AGRESYWNY() {
  ustawProfil_('AGRESYWNY');
  Logger.log('🚀 Profil zmieniony na AGRESYWNY');
  Logger.log('   Core: 50% | Satellites: 50%');
  Logger.log('   SENTINEL pozwoli na więcej ryzyka w rekomendacjach.');
  return 'Profil: AGRESYWNY';
}

/**
 * Testuje połączenie i konfigurację
 */
function TESTUJ_POLACZENIE() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('🔧 TEST POŁĄCZENIA SENTINEL');
  Logger.log('═══════════════════════════════════════════════════════════');
  
  const props = PropertiesService.getScriptProperties();
  let errors = 0;
  
  // 1. Sprawdź klucze API
  Logger.log('\n📡 Klucze API:');
  
  const groqKey = props.getProperty('GROQ_KEY');
  if (groqKey) {
    Logger.log('   ✅ GROQ_KEY: Ustawiony');
    // Test połączenia
    try {
      const testUrl = 'https://api.groq.com/openai/v1/models';
      const response = UrlFetchApp.fetch(testUrl, {
        headers: { 'Authorization': `Bearer ${groqKey}` },
        muteHttpExceptions: true
      });
      if (response.getResponseCode() === 200) {
        Logger.log('   ✅ Groq API: Działa!');
      } else {
        Logger.log('   ⚠️ Groq API: Błąd ' + response.getResponseCode());
        errors++;
      }
    } catch(e) {
      Logger.log('   ❌ Groq API: ' + e.message);
      errors++;
    }
  } else {
    Logger.log('   ❌ GROQ_KEY: Brak (SENTINEL nie będzie działać)');
    errors++;
  }
  
  const geminiKey = props.getProperty('GEMINI_KEY');
  if (geminiKey) {
    Logger.log('   ✅ GEMINI_KEY: Ustawiony');
  } else {
    Logger.log('   ⚠️ GEMINI_KEY: Brak (opcjonalny)');
  }
  
  const finnhubKey = props.getProperty('FINNHUB_KEY');
  if (finnhubKey) {
    Logger.log('   ✅ FINNHUB_KEY: Ustawiony');
  } else {
    Logger.log('   ⚠️ FINNHUB_KEY: Brak (ceny nie będą aktualizowane automatycznie)');
  }
  
  // 2. Sprawdź arkusze
  Logger.log('\n📊 Arkusze:');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wymagane = ['PORTFEL'];
  const opcjonalne = ['NEWSY_BAZA', 'CSV_IMPORT', 'ASYSTENT_CHAT', 'ASYSTENT_PAMIEC'];
  
  for (const nazwa of wymagane) {
    const sheet = ss.getSheetByName(nazwa);
    if (sheet) {
      Logger.log(`   ✅ ${nazwa}: Istnieje`);
    } else {
      Logger.log(`   ❌ ${nazwa}: BRAK (wymagany!)`);
      errors++;
    }
  }
  
  for (const nazwa of opcjonalne) {
    const sheet = ss.getSheetByName(nazwa);
    Logger.log(`   ${sheet ? '✅' : '⚠️'} ${nazwa}: ${sheet ? 'Istnieje' : 'Brak'}`);
  }
  
  // 3. Sprawdź profil
  Logger.log('\n🎯 Profil inwestycyjny:');
  const profil = pobierzAktualnyProfil_();
  if (profil) {
    const p = PROFILE_INWESTYCYJNE[profil];
    Logger.log(`   ✅ ${p.emoji} ${p.nazwa} (Core: ${p.core_procent}%)`);
  } else {
    Logger.log('   ⚠️ Brak profilu - używam domyślnego ZBALANSOWANY');
  }
  
  // Podsumowanie
  Logger.log('\n═══════════════════════════════════════════════════════════');
  if (errors === 0) {
    Logger.log('✅ WSZYSTKO OK! SENTINEL gotowy do pracy.');
    return 'OK';
  } else {
    Logger.log(`⚠️ Znaleziono ${errors} problemów. Sprawdź logi.`);
    return `${errors} błędów`;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 FUNKCJE POMOCNICZE
// ═══════════════════════════════════════════════════════════════

/**
 * Tworzy podstawowe arkusze jeśli nie istnieją
 */
function utworzArkuszePodstawowe_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // PORTFEL
  if (!ss.getSheetByName('PORTFEL')) {
    const sheet = ss.insertSheet('PORTFEL');
    const headers = ['ID', 'TICKER', 'TYP', 'WALUTA', 'ILOŚĆ', 'CENA_ZAKUPU', 'KURS_ZAKUPU_PLN', 
                     'KOSZT_PLN', 'CENA_AKTUALNA', 'WARTOSC_PLN', 'ZYSK_TOTAL', 'WYNIK_AKCJI', 'WPLYW_FX'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1a73e8')
      .setFontColor('white');
    sheet.setFrozenRows(1);
    Logger.log('   ✅ Utworzono arkusz PORTFEL');
  } else {
    Logger.log('   ⚠️ PORTFEL już istnieje');
  }
  
  // NEWSY_BAZA
  if (!ss.getSheetByName('NEWSY_BAZA')) {
    const sheet = ss.insertSheet('NEWSY_BAZA');
    const headers = ['ID', 'TICKER', 'DATA', 'TYTUŁ', 'ANALIZA', 'SENTIMENT', 'SCORE'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#673ab7')
      .setFontColor('white');
    sheet.setFrozenRows(1);
    Logger.log('   ✅ Utworzono arkusz NEWSY_BAZA');
  }
  
  // ASYSTENT_CHAT
  if (!ss.getSheetByName('ASYSTENT_CHAT')) {
    const sheet = ss.insertSheet('ASYSTENT_CHAT');
    const headers = ['DATA', 'PYTANIE', 'ODPOWIEDŹ', 'STATUS'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#00897b')
      .setFontColor('white');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 300);
    sheet.setColumnWidth(3, 500);
    Logger.log('   ✅ Utworzono arkusz ASYSTENT_CHAT');
  }
  
  // ASYSTENT_PAMIEC
  if (!ss.getSheetByName('ASYSTENT_PAMIEC')) {
    const sheet = ss.insertSheet('ASYSTENT_PAMIEC');
    const headers = ['DATA', 'TYP', 'TICKER', 'TREŚĆ', 'WYNIK'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#ff9800')
      .setFontColor('white');
    sheet.setFrozenRows(1);
    Logger.log('   ✅ Utworzono arkusz ASYSTENT_PAMIEC');
  }
}

/**
 * Ustawia profil inwestycyjny
 */
function ustawProfil_(nazaProfilu) {
  const profil = PROFILE_INWESTYCYJNE[nazaProfilu];
  if (!profil) {
    throw new Error('Nieznany profil: ' + nazaProfilu);
  }
  
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SENTINEL_PROFIL', nazaProfilu);
  props.setProperty('SENTINEL_CORE_PROCENT', profil.core_procent.toString());
  props.setProperty('SENTINEL_SATELLITES_PROCENT', profil.satellites_procent.toString());
  props.setProperty('SENTINEL_CORE_TYPY', JSON.stringify(profil.core_typy));
  props.setProperty('SENTINEL_SATELLITES_TYPY', JSON.stringify(profil.satellites_typy));
  props.setProperty('SENTINEL_ALERT_CORE_MIN', profil.alert_core_min.toString());
  props.setProperty('SENTINEL_MAX_SINGLE_SATELLITE', profil.max_single_satellite.toString());
  
  Logger.log(`Profil ${nazaProfilu} zapisany.`);
}

/**
 * Pobiera aktualny profil
 */
function pobierzAktualnyProfil_() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('SENTINEL_PROFIL') || 'ZBALANSOWANY';
}

/**
 * Pobiera ustawienia strategii (dla ASYSTENT_MODUL)
 * Ta funkcja może być wywołana z innych modułów
 */
function pobierzStrategieUsera_() {
  const props = PropertiesService.getScriptProperties();
  
  return {
    CORE_PROCENT: parseInt(props.getProperty('SENTINEL_CORE_PROCENT')) || 70,
    SATELLITES_PROCENT: parseInt(props.getProperty('SENTINEL_SATELLITES_PROCENT')) || 30,
    CORE_TYPY: JSON.parse(props.getProperty('SENTINEL_CORE_TYPY') || '["ETF", "SKARB", "REIT"]'),
    SATELLITES_TYPY: JSON.parse(props.getProperty('SENTINEL_SATELLITES_TYPY') || '["AKCJA", "KRYPTO"]'),
    ALERT_CORE_MIN: parseInt(props.getProperty('SENTINEL_ALERT_CORE_MIN')) || 60,
    MAX_SINGLE_SATELLITE: parseInt(props.getProperty('SENTINEL_MAX_SINGLE_SATELLITE')) || 20
  };
}

// ═══════════════════════════════════════════════════════════════
// 📋 INSTRUKCJA DLA NOWEGO UŻYTKOWNIKA
// ═══════════════════════════════════════════════════════════════

/**
 * Wyświetla pełną instrukcję dla nowego użytkownika
 */
function INSTRUKCJA_NOWY_UZYTKOWNIK() {
  const instrukcja = `
╔══════════════════════════════════════════════════════════════╗
║  🚀 SENTINEL - INSTRUKCJA DLA NOWEGO UŻYTKOWNIKA            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  KROK 1: PEŁNA INSTALACJA (jednorazowo)                      ║
║  ────────────────────────────────────────                    ║
║  Uruchom: PELNA_INSTALACJA()                                 ║
║  → Tworzy wszystkie arkusze i ustawienia                     ║
║                                                              ║
║  KROK 2: KLUCZ API (wymagany)                                ║
║  ────────────────────────────────────────                    ║
║  1. Idź na: https://console.groq.com/keys                    ║
║  2. Załóż darmowe konto                                      ║
║  3. Skopiuj klucz API                                        ║
║  4. W Apps Script: Ustawienia → Właściwości skryptu          ║
║  5. Dodaj: GROQ_KEY = twój_klucz                             ║
║                                                              ║
║  KROK 3: WYBIERZ PROFIL INWESTYCYJNY                         ║
║  ────────────────────────────────────────                    ║
║  Uruchom: KONFIGURUJ_STRATEGIE()                             ║
║  → Zobaczy dostępne profile                                  ║
║                                                              ║
║  • KONSERWATYWNY: 85% Core / 15% Satellites (bezpieczny)     ║
║  • ZBALANSOWANY: 70% Core / 30% Satellites (domyślny)        ║
║  • AGRESYWNY: 50% Core / 50% Satellites (ryzykowny)          ║
║                                                              ║
║  KROK 4: ZAIMPORTUJ PORTFEL                                  ║
║  ────────────────────────────────────────                    ║
║  Opcja A - Z Trading 212:                                    ║
║  1. Uruchom: UTWORZ_ARKUSZ_CSV_IMPORT()                      ║
║  2. W T212: History → Export CSV                             ║
║  3. Wklej do arkusza CSV_IMPORT                              ║
║  4. Uruchom: IMPORTUJ_TRANSAKCJE_T212()                      ║
║                                                              ║
║  Opcja B - Ręcznie:                                          ║
║  Wpisz pozycje bezpośrednio do arkusza PORTFEL               ║
║                                                              ║
║  KROK 5: TESTUJ I UŻYWAJ                                     ║
║  ────────────────────────────────────────                    ║
║  • TESTUJ_POLACZENIE() - sprawdź czy wszystko OK             ║
║  • ZAPYTAJ_ASYSTENTA("Oceń mój portfel")                     ║
║  • OCENA_PORTFELA() - szczegółowa analiza                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

  Logger.log(instrukcja);
  return instrukcja;
}
