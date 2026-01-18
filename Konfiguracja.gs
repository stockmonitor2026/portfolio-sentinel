A/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 KONFIGURACJA.gs - Centralny plik konfiguracyjny
 * ═══════════════════════════════════════════════════════════════
 * 
 * INSTRUKCJA:
 * 1. Ustaw klucz API Finnhub w Script Properties:
 *    - Plik → Ustawienia projektu → Właściwości skryptu
 *    - Dodaj: FINNHUB_KEY = twój_klucz
 */

const CONFIG = {
  // ═══════════════ KLUCZE API ═══════════════
  get FINNHUB_KEY() {
    return PropertiesService.getScriptProperties().getProperty('FINNHUB_KEY') || '';
  },
  
  // ═══════════════ LIMITY API ═══════════════
  API_DELAY_MS: 1100,           // Odstęp między zapytaniami (54 req/min - bezpieczny margines)
  MAX_REQUESTS_PER_RUN: 50,     // Max zapytań na jedno uruchomienie
  
  // ═══════════════ CACHE ═══════════════
  CACHE_PRICES_TTL: 300,        // 5 minut dla cen akcji
  CACHE_CURRENCY_TTL: 900,      // 15 minut dla kursów walut
  
  // ═══════════════ ARKUSZ ═══════════════
  SHEET_NAME: 'PORTFEL',
  
  // ═══════════════ KOLUMNY (1-indexed) ═══════════════
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
  
  // ═══════════════ WALUTY ═══════════════
  CURRENCY_CELLS: {
    USD: 'N2',
    EUR: 'N3'
  },
  
  // ═══════════════ KATEGORIE AKTYWÓW ═══════════════
  ASSET_TYPES: ['AKCJA', 'ETF', 'KRYPTO', 'OBLIGACJA', 'SUROWIEC', 'GOTÓWKA'],
  
  // ═══════════════ WALUTY OBSŁUGIWANE ═══════════════
  CURRENCIES: ['USD', 'EUR', 'PLN', 'GBP']
};

/**
 * Pobierz klucz Finnhub (kompatybilność wsteczna)
 */
function POBIERZ_KLUCZ_FINNHUB() {
  return CONFIG.FINNHUB_KEY;
}

/**
 * Logowanie z timestampem
 */
function logInfo(message) {
  console.log(`[${new Date().toISOString()}] ℹ️ ${message}`);
}

function logError(message) {
  console.error(`[${new Date().toISOString()}] ❌ ${message}`);
}

function logSuccess(message) {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
}
