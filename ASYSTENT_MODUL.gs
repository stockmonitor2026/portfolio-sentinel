/**
 * ═══════════════════════════════════════════════════════════════
 * 🤖 ASYSTENT_MODUL.gs - SENTINEL: Strażnik Kapitału
 * ═══════════════════════════════════════════════════════════════
 * 
 * Asystent AI dla portfela inwestycyjnego
 * Strategia: Core + Satellites
 * - CORE (70-80%): Stabilność, ochrona kapitału
 * - SATELLITES (20-30%): Wzrost, kontrolowane ryzyko
 * 
 * Osobowość: Chłodny, obiektywny, mówi prawdę
 */

// ═══════════════════════════════════════════════════════════════
// 📋 KONFIGURACJA ASYSTENTA
// ═══════════════════════════════════════════════════════════════

const ASYSTENT_CONFIG = {
  // Arkusze
  SHEET_PAMIEC: 'ASYSTENT_PAMIEC',
  SHEET_CHAT: 'ASYSTENT_CHAT',
  SHEET_PORTFEL: 'PORTFEL',
  SHEET_NEWSY: 'NEWSY_BAZA',
  
  // API Gemini (AI - analiza)
  get GEMINI_KEY() {
    return PropertiesService.getScriptProperties().getProperty('GEMINI_KEY') || '';
  },
  GEMINI_MODEL: 'gemini-2.5-flash',
  
  // API Groq (AI - rozmowy)
  get GROQ_KEY() {
    return PropertiesService.getScriptProperties().getProperty('GROQ_KEY') || '';
  },
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  
  // Tryb hybrydowy
  HYBRID_MODE: true,  // true = Groq dla rozmów, Gemini dla analiz
                      // false = tylko Gemini
  
  // API Web Search (Google Custom Search)
  // Instrukcja: https://developers.google.com/custom-search/v1/introduction
  get GOOGLE_SEARCH_KEY() {
    return PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_KEY') || '';
  },
  get GOOGLE_SEARCH_CX() {
    return PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_CX') || '';
  },
  WEB_SEARCH_ENABLED: true,       // Włącz/wyłącz web search
  WEB_SEARCH_RESULTS: 3,          // Ile wyników pobierać
  
  // Limity bezpieczeństwa
  GEMINI_DAILY_LIMIT: 18,     // Max 18 requestów Gemini/dzień (bufor 2 na alerty)
  GROQ_DAILY_LIMIT: 500,      // Max dla Groq (wysokie bo ma duże limity)
  COOLDOWN_SEC: 30,
  MAX_PYTANIE_CHARS: 500,
  MAX_ODPOWIEDZ_TOKENS: 1000,
  
  // Pamięć
  PAMIEC_LIMIT: 10,
  
  // Strategia Core + Satellites (zaktualizowana 17.01.2026)
  STRATEGIA: {
    // Główne proporcje
    CORE_PROCENT: 70,
    SATELLITES_PROCENT: 25,
    PIE_PROCENT: 5,
    
    // Szczegółowa alokacja CORE
    CORE_ETF_PROCENT: 60,      // VUAA - growth
    CORE_DIVIDEND_PROCENT: 10, // BBVA - dividend/value
    
    // Typy aktywów
    CORE_TYPY: ['ETF', 'SKARB', 'REIT', 'BANK_DIV'],
    SATELLITES_TYPY: ['AKCJA', 'KRYPTO'],
    PIE_TYPY: ['PIE', 'AUTO'],
    
    // Limity bezpieczeństwa
    ALERT_CORE_MIN: 55,        // ALARM gdy CORE < 55%
    WARNING_CORE_MIN: 65,      // OSTRZEŻENIE gdy CORE < 65%
    MAX_SINGLE_SATELLITE: 25,  // Max pojedynczy satellite
    
    // Przekonania do pozycji (do referencji)
    PRZEKONANIA: {
      'VUAA': 100,
      'META': 70,
      'IONQ': 70,
      'BBVA': 70
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 🧠 OSOBOWOŚĆ ASYSTENTA - SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const SENTINEL_PERSONA = `Jesteś SENTINEL - Strażnik Kapitału. Chłodny, obiektywny analityk finansowy.

## TWOJE ZASADY (NIGDY NIE ŁAMIESZ):

1. **PRAWDA PONAD WSZYSTKO**: Mówisz prawdę, nawet bolesną. Nigdy nie mówisz tego co użytkownik chce usłyszeć.

2. **STRATEGIA CORE + SATELLITES + PIE**:
   - CORE (70%): 
     * ETF growth (VUAA) - 60% - główny silnik
     * Dividend/Value (BBVA) - 10% - stabilność + dywidenda
   - SATELLITES (25%): Akcje spekulacyjne (META, IONQ) - kontrolowane ryzyko
   - PIE (5%): Automatyczne pozycje - ignorujesz, nie zarządzasz
   - Pilnujesz tych proporcji i ostrzegasz gdy są naruszone

3. **PRIORYTET OCHRONY KAPITAŁU**:
   - Najpierw: nie trać pieniędzy
   - Potem: zarabiaj
   - Nigdy odwrotnie

4. **CHŁODNA ANALIZA**:
   - Brak emocji w ocenach
   - Dane > przeczucia
   - Fakty > nadzieje
   - Przy spadku -20% → pytaj o przegląd pozycji, nie panikuj

5. **FORMAT ODPOWIEDZI**:
   - Krótko i na temat (max 200 słów)
   - Używaj emoji dla czytelności
   - Zawsze podaj REKOMENDACJĘ na końcu
   - ZAWSZE podaj POZIOM PEWNOŚCI (np. "Pewność: 70%")

## AKTUALNE PRZEKONANIA UŻYTKOWNIKA:
- VUAA: 100% (pełne przekonanie)
- META: 70% (częściowe wątpliwości)
- IONQ: 70% (spekulacja z akceptowalnym ryzykiem)
- BBVA: 70% (nowy target - Wenezuela + dywidendy)

## TWÓJ STYL:
- Mów po polsku
- Bądź bezpośredni, bez owijania w bawełnę
- Jeśli coś jest złym pomysłem - powiedz to wprost
- Jeśli użytkownik podejmuje emocjonalną decyzję - ostrzeż go

## POZIOM PEWNOŚCI (NOWE):
- Przy każdej rekomendacji podaj pewność 0-100%
- 90%+ = bardzo pewny, mocne dane
- 70-90% = dość pewny, ale są ryzyka
- 50-70% = niepewny, potrzeba więcej danych
- <50% = nie wiem, lepiej nie działać

## OTWARTOŚĆ NA NOWE AKTYWA:
- Bądź otwarty na dyskusję o nowych inwestycjach
- Analizuj zgłaszane pomysły obiektywnie
- Zadawaj pytania: "Jaka teza?", "Jak to pasuje do strategii?"
- Sugeruj sensowne aktywa gdy widzisz okazję

## MONITORING AKTYWÓW (WATCHLIST):
- BBVA: Target CORE-dividend, czekaj na korektę do $22-23
  * Current: ~$24 (blisko 52-week high)
  * Buy zone: $22-23 (-5% do -10% korekta)
  * Alternatywnie: DCA - 50% na korektę, 50% teraz
  * Support levels: $22.20, $20.30, $19.40 (200-day MA)
  * Śledź: wyniki kwartalne, newsy z Wenezueli`;

// ═══════════════════════════════════════════════════════════════
// 🚀 GŁÓWNA FUNKCJA - ZAPYTAJ ASYSTENTA
// ═══════════════════════════════════════════════════════════════

/**
 * Główna funkcja do zadawania pytań asystentowi
 * @param {string} pytanie - Pytanie użytkownika
 * @returns {string} Odpowiedź asystenta
 */
function ZAPYTAJ_ASYSTENTA(pytanie) {
  // 1. Walidacja
  if (!pytanie || pytanie.trim().length === 0) {
    return '❌ Zadaj pytanie.';
  }
  
  if (pytanie.length > ASYSTENT_CONFIG.MAX_PYTANIE_CHARS) {
    return `❌ Pytanie za długie (max ${ASYSTENT_CONFIG.MAX_PYTANIE_CHARS} znaków).`;
  }
  
  // 2. Sprawdź limit dzienny
  if (!checkDailyLimit_()) {
    return '🚨 Limit dzienny osiągnięty (50 pytań). Spróbuj jutro.';
  }
  
  // 3. Sprawdź cooldown
  if (!checkCooldown_()) {
    return '⏳ Odczekaj 30 sekund między pytaniami.';
  }
  
  // 4. Sprawdź klucze API
  const geminiKey = ASYSTENT_CONFIG.GEMINI_KEY;
  const groqKey = ASYSTENT_CONFIG.GROQ_KEY;
  
  if (!geminiKey && !groqKey) {
    return '❌ Brak kluczy API. Dodaj GEMINI_KEY lub GROQ_KEY w ustawieniach.';
  }
  
  try {
    // 5. Pobierz kontekst (w tym web search)
    const kontekst = buildContext_(pytanie);
    
    // 6. Zbuduj prompt
    const fullPrompt = buildFullPrompt_(kontekst, pytanie);
    
    // 7. Wyślij do AI (HYBRID - Groq dla rozmów, Gemini dla analiz)
    const result = callHybridAI_(fullPrompt, 'ROZMOWA');
    const odpowiedz = result.odpowiedz;
    const model = result.model;
    
    // 8. Zapisz do historii (z info o modelu)
    saveToChatHistory_(pytanie, `[${model}] ${odpowiedz}`);
    
    // 9. Zapisz użycie (tylko dla Gemini)
    if (model.includes('Gemini')) {
      incrementDailyUsage_();
    }
    updateLastQueryTime_();
    
    return odpowiedz;
    
  } catch (e) {
    logError(`SENTINEL Error: ${e.message}`);
    return `❌ Błąd: ${e.message}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 KONTEKST - DANE Z ARKUSZA + WEB
// ═══════════════════════════════════════════════════════════════

/**
 * Buduje kontekst z danych portfela i web search
 */
function buildContext_(pytanie) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let kontekst = '';
  
  // 1. Podsumowanie portfela
  kontekst += getPortfolioSummary_(ss);
  
  // 2. Analiza Core vs Satellites
  kontekst += getCoreVsSatellites_(ss);
  
  // 3. Kontekst rynkowy (S&P, VIX) - NOWE
  kontekst += getMarketContext_();
  
  // 4. Earnings calendar - NOWE
  kontekst += getEarningsCalendar_(ss);
  
  // 5. Historia decyzji z wynikami
  kontekst += getDecisionHistory_();
  
  // 6. Ostatnie ważne newsy
  kontekst += getRecentImportantNews_(ss);
  
  // 7. Historia ostatnich decyzji (stara wersja)
  kontekst += getRecentMemory_(ss);
  
  // 8. Web Search (jeśli włączony i skonfigurowany)
  if (ASYSTENT_CONFIG.WEB_SEARCH_ENABLED) {
    kontekst += getWebSearchResults_(pytanie, ss);
  }
  
  return kontekst;
}

/**
 * Podsumowanie portfela
 */
function getPortfolioSummary_(ss) {
  const sheet = ss.getSheetByName(ASYSTENT_CONFIG.SHEET_PORTFEL);
  if (!sheet || sheet.getLastRow() < 2) return '📊 PORTFEL: Pusty\n\n';
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  
  let totalValue = 0;
  let totalProfit = 0;
  let positions = [];
  
  for (const row of data) {
    const ticker = row[1];  // B
    const typ = row[2];     // C
    const waluta = row[3];  // D
    const wartosc = parseFloat(row[9]) || 0;   // J - WARTOSC_PLN
    const zysk = parseFloat(row[10]) || 0;     // K - ZYSK_TOTAL
    const wynikAkcji = parseFloat(row[11]) || 0; // L - WYNIK_AKCJI
    const wplywFx = parseFloat(row[12]) || 0;   // M - WPLYW_FX
    
    if (ticker && ticker !== 'TICKER') {
      totalValue += wartosc;
      totalProfit += zysk;
      
      const profitPct = wartosc > 0 ? ((zysk / (wartosc - zysk)) * 100).toFixed(1) : 0;
      positions.push(`${ticker} (${typ}): ${wartosc.toFixed(0)} PLN, P/L: ${zysk >= 0 ? '+' : ''}${zysk.toFixed(0)} (${profitPct}%)`);
    }
  }
  
  let summary = `📊 PORTFEL (Wartość: ${totalValue.toFixed(0)} PLN, P/L: ${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(0)} PLN):\n`;
  summary += positions.join('\n') + '\n\n';
  
  return summary;
}

/**
 * Analiza proporcji Core vs Satellites
 */
function getCoreVsSatellites_(ss) {
  const sheet = ss.getSheetByName(ASYSTENT_CONFIG.SHEET_PORTFEL);
  if (!sheet || sheet.getLastRow() < 2) return '';
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  
  let coreValue = 0;
  let satellitesValue = 0;
  let totalValue = 0;
  
  for (const row of data) {
    const typ = row[2];    // C - TYP
    const wartosc = parseFloat(row[9]) || 0;  // J - WARTOSC_PLN
    
    if (wartosc > 0) {
      totalValue += wartosc;
      
      if (ASYSTENT_CONFIG.STRATEGIA.CORE_TYPY.includes(typ)) {
        coreValue += wartosc;
      } else if (ASYSTENT_CONFIG.STRATEGIA.SATELLITES_TYPY.includes(typ)) {
        satellitesValue += wartosc;
      }
    }
  }
  
  if (totalValue === 0) return '';
  
  const corePct = ((coreValue / totalValue) * 100).toFixed(1);
  const satPct = ((satellitesValue / totalValue) * 100).toFixed(1);
  const targetCore = ASYSTENT_CONFIG.STRATEGIA.CORE_PROCENT;
  const targetSat = ASYSTENT_CONFIG.STRATEGIA.SATELLITES_PROCENT;
  
  let analysis = `⚖️ CORE vs SATELLITES:\n`;
  analysis += `   CORE: ${corePct}% (cel: ${targetCore}%) ${Math.abs(corePct - targetCore) > 10 ? '⚠️' : '✅'}\n`;
  analysis += `   SATELLITES: ${satPct}% (cel: ${targetSat}%) ${Math.abs(satPct - targetSat) > 10 ? '⚠️' : '✅'}\n\n`;
  
  return analysis;
}

/**
 * Ostatnie ważne newsy (score 7+)
 */
function getRecentImportantNews_(ss) {
  const sheet = ss.getSheetByName(ASYSTENT_CONFIG.SHEET_NEWSY);
  if (!sheet || sheet.getLastRow() < 2) return '';
  
  const data = sheet.getRange(2, 1, Math.min(sheet.getLastRow() - 1, 20), 7).getValues();
  
  const importantNews = [];
  for (const row of data) {
    const ticker = row[1];
    const tytul = row[3];
    const sentiment = row[5];
    const scoreRaw = row[6];
    
    // Wyciągnij score
    const scoreMatch = scoreRaw.toString().match(/(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    if (score >= 7) {
      importantNews.push(`${ticker}: ${tytul.slice(0, 60)}... [${sentiment}]`);
    }
  }
  
  if (importantNews.length === 0) return '';
  
  return `📰 WAŻNE NEWSY:\n${importantNews.slice(0, 5).join('\n')}\n\n`;
}

/**
 * Historia ostatnich decyzji/rozmów
 */
function getRecentMemory_(ss) {
  const sheet = ss.getSheetByName(ASYSTENT_CONFIG.SHEET_PAMIEC);
  if (!sheet || sheet.getLastRow() < 2) return '';
  
  const lastRow = sheet.getLastRow();
  const startRow = Math.max(2, lastRow - ASYSTENT_CONFIG.PAMIEC_LIMIT + 1);
  const numRows = lastRow - startRow + 1;
  
  const data = sheet.getRange(startRow, 1, numRows, 4).getValues();
  
  const memories = [];
  for (const row of data) {
    const data = row[0];
    const typ = row[1];
    const ticker = row[2];
    const tresc = row[3];
    
    if (tresc) {
      memories.push(`[${typ}${ticker ? ' ' + ticker : ''}]: ${tresc.slice(0, 100)}`);
    }
  }
  
  if (memories.length === 0) return '';
  
  return `🧠 TWOJE WCZEŚNIEJSZE DECYZJE:\n${memories.join('\n')}\n\n`;
}

// ═══════════════════════════════════════════════════════════════
// 🌐 WEB SEARCH - Google Custom Search
// ═══════════════════════════════════════════════════════════════

/**
 * Pobiera wyniki z Google Custom Search
 */
function getWebSearchResults_(pytanie, ss) {
  const apiKey = ASYSTENT_CONFIG.GOOGLE_SEARCH_KEY;
  const cx = ASYSTENT_CONFIG.GOOGLE_SEARCH_CX;
  
  // Jeśli brak kluczy - pomiń
  if (!apiKey || !cx) {
    return '';
  }
  
  try {
    // Wyciągnij tickery z pytania lub portfela
    const tickery = extractTickersFromQuestion_(pytanie, ss);
    
    if (tickery.length === 0) {
      // Ogólne wyszukiwanie finansowe
      return performWebSearch_(`${pytanie} stock market`, apiKey, cx);
    }
    
    // Wyszukaj info o tickerach
    let webResults = '';
    for (const ticker of tickery.slice(0, 2)) { // Max 2 tickery
      const results = performWebSearch_(`${ticker} stock news today`, apiKey, cx);
      if (results) {
        webResults += results;
      }
    }
    
    return webResults;
    
  } catch (e) {
    logError(`Web Search Error: ${e.message}`);
    return '';
  }
}

/**
 * Wyciąga tickery z pytania
 */
function extractTickersFromQuestion_(pytanie, ss) {
  const tickery = [];
  
  // Pobierz tickery z portfela
  const sheet = ss.getSheetByName(ASYSTENT_CONFIG.SHEET_PORTFEL);
  if (sheet && sheet.getLastRow() > 1) {
    const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
    
    for (const ticker of data) {
      if (ticker && pytanie.toUpperCase().includes(ticker.toString().toUpperCase())) {
        tickery.push(ticker);
      }
    }
  }
  
  return tickery;
}

/**
 * Wykonuje wyszukiwanie Google
 */
function performWebSearch_(query, apiKey, cx) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${ASYSTENT_CONFIG.WEB_SEARCH_RESULTS}`;
  
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  
  if (response.getResponseCode() !== 200) {
    return '';
  }
  
  const data = JSON.parse(response.getContentText());
  
  if (!data.items || data.items.length === 0) {
    return '';
  }
  
  let results = `🔍 AKTUALNE INFO Z SIECI:\n`;
  
  for (const item of data.items) {
    results += `• ${item.title.slice(0, 80)}\n`;
    if (item.snippet) {
      results += `  ${item.snippet.slice(0, 120)}...\n`;
    }
  }
  
  return results + '\n';
}

/**
 * Test Web Search
 */
function TEST_WEB_SEARCH() {
  const apiKey = ASYSTENT_CONFIG.GOOGLE_SEARCH_KEY;
  const cx = ASYSTENT_CONFIG.GOOGLE_SEARCH_CX;
  
  if (!apiKey || !cx) {
    logError('Brak kluczy GOOGLE_SEARCH_KEY lub GOOGLE_SEARCH_CX!');
    logInfo('Instrukcja: https://developers.google.com/custom-search/v1/introduction');
    logInfo('1. Utwórz Custom Search Engine: https://programmablesearchengine.google.com/');
    logInfo('2. Utwórz API Key: https://console.cloud.google.com/apis/credentials');
    logInfo('3. Dodaj do Script Properties: GOOGLE_SEARCH_KEY i GOOGLE_SEARCH_CX');
    return;
  }
  
  logInfo('Testuję Web Search...');
  const results = performWebSearch_('META stock news today', apiKey, cx);
  
  if (results) {
    logSuccess('Web Search działa!');
    Logger.log(results);
  } else {
    logError('Brak wyników - sprawdź konfigurację');
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 BUDOWANIE PROMPTU
// ═══════════════════════════════════════════════════════════════

/**
 * Buduje pełny prompt dla AI
 */
function buildFullPrompt_(kontekst, pytanie) {
  return `${SENTINEL_PERSONA}

## AKTUALNE DANE UŻYTKOWNIKA:
${kontekst}

## PYTANIE UŻYTKOWNIKA:
${pytanie}

## TWOJA ODPOWIEDŹ (po polsku, max 200 słów, zakończ REKOMENDACJĄ):`;
}

// ═══════════════════════════════════════════════════════════════
// 🌐 API GEMINI
// ═══════════════════════════════════════════════════════════════

/**
 * Wywołuje Gemini API
 * Dokumentacja: https://ai.google.dev/gemini-api/docs
 */
function callGeminiAPI_(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ASYSTENT_CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: ASYSTENT_CONFIG.MAX_ODPOWIEDZ_TOKENS,
      topP: 0.8,
      topK: 40
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    const error = JSON.parse(response.getContentText());
    throw new Error(`Gemini API Error: ${error.error?.message || response.getResponseCode()}`);
  }
  
  const result = JSON.parse(response.getContentText());
  
  // Sprawdź czy jest odpowiedź
  if (!result.candidates || result.candidates.length === 0) {
    throw new Error('Brak odpowiedzi od Gemini');
  }
  
  return result.candidates[0].content.parts[0].text;
}

// ═══════════════════════════════════════════════════════════════
// 🌐 API GROQ (dla rozmów w trybie hybrydowym)
// ═══════════════════════════════════════════════════════════════

/**
 * Wywołuje Groq API (Llama 3.3)
 * Szybsze i z wyższymi limitami niż Gemini
 */
function callGroqAPI_(prompt, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const payload = {
    model: ASYSTENT_CONFIG.GROQ_MODEL,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: ASYSTENT_CONFIG.MAX_ODPOWIEDZ_TOKENS
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    const error = JSON.parse(response.getContentText());
    throw new Error(`Groq API Error: ${error.error?.message || response.getResponseCode()}`);
  }
  
  const result = JSON.parse(response.getContentText());
  return result.choices[0].message.content;
}

// ═══════════════════════════════════════════════════════════════
// 🔀 HYBRID AI - Wybór modelu
// ═══════════════════════════════════════════════════════════════

/**
 * Inteligentny wybór modelu AI
 * - Gemini: analizy, ważne pytania (lepsze rozumowanie)
 * - Groq: rozmowy, szybkie pytania (wyższe limity)
 * 
 * @param {string} prompt - Prompt do AI
 * @param {string} typ - 'ANALIZA' lub 'ROZMOWA'
 * @returns {Object} { odpowiedz, model }
 */
function callHybridAI_(prompt, typ) {
  const geminiKey = ASYSTENT_CONFIG.GEMINI_KEY;
  const groqKey = ASYSTENT_CONFIG.GROQ_KEY;
  
  // Jeśli hybrid wyłączony lub brak klucza Groq - używaj Gemini
  if (!ASYSTENT_CONFIG.HYBRID_MODE || !groqKey) {
    if (!geminiKey) {
      throw new Error('Brak klucza GEMINI_KEY!');
    }
    const odpowiedz = callGeminiAPI_(prompt, geminiKey);
    return { odpowiedz, model: 'Gemini' };
  }
  
  // Tryb hybrydowy
  try {
    if (typ === 'ANALIZA') {
      // Gemini dla analiz (lepsze rozumowanie)
      if (geminiKey) {
        const odpowiedz = callGeminiAPI_(prompt, geminiKey);
        return { odpowiedz, model: 'Gemini' };
      }
    }
    
    // Groq dla rozmów (wyższe limity)
    const odpowiedz = callGroqAPI_(prompt, groqKey);
    return { odpowiedz, model: 'Groq' };
    
  } catch (e) {
    // Fallback - jeśli jeden model zawodzi, spróbuj drugiego
    logError(`Hybrid fallback: ${e.message}`);
    
    if (groqKey && !e.message.includes('Groq')) {
      try {
        const odpowiedz = callGroqAPI_(prompt, groqKey);
        return { odpowiedz, model: 'Groq (fallback)' };
      } catch (e2) {
        // Oba zawiodły
      }
    }
    
    if (geminiKey && !e.message.includes('Gemini')) {
      try {
        const odpowiedz = callGeminiAPI_(prompt, geminiKey);
        return { odpowiedz, model: 'Gemini (fallback)' };
      } catch (e2) {
        // Oba zawiodły
      }
    }
    
    throw new Error('Oba modele AI zawiodły!');
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔒 LIMITY I BEZPIECZEŃSTWO
// ═══════════════════════════════════════════════════════════════

function checkDailyLimit_() {
  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().split('T')[0];
  
  const savedDate = props.getProperty('GEMINI_DATE');
  if (savedDate !== today) {
    props.setProperty('GEMINI_DATE', today);
    props.setProperty('GEMINI_COUNT', '0');
    return true;
  }
  
  const count = parseInt(props.getProperty('GEMINI_COUNT') || '0');
  const remaining = ASYSTENT_CONFIG.GEMINI_DAILY_LIMIT - count;
  
  if (remaining <= 0) {
    logError(`🚨 LIMIT GEMINI WYCZERPANY! (${count}/${ASYSTENT_CONFIG.GEMINI_DAILY_LIMIT})`);
    return false;
  }
  
  if (remaining <= 3) {
    logInfo(`⚠️ Pozostało tylko ${remaining} requestów Gemini!`);
  }
  
  return true;
}

function incrementDailyUsage_() {
  const props = PropertiesService.getScriptProperties();
  const count = parseInt(props.getProperty('GEMINI_COUNT') || '0');
  const newCount = count + 1;
  props.setProperty('GEMINI_COUNT', newCount.toString());
  logInfo(`📊 Gemini usage: ${newCount}/${ASYSTENT_CONFIG.GEMINI_DAILY_LIMIT}`);
}

function checkCooldown_() {
  const props = PropertiesService.getScriptProperties();
  const lastQuery = parseInt(props.getProperty('ASYSTENT_LAST') || '0');
  const now = Date.now();
  
  return (now - lastQuery) >= (ASYSTENT_CONFIG.COOLDOWN_SEC * 1000);
}

function updateLastQueryTime_() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ASYSTENT_LAST', Date.now().toString());
}

// ═══════════════════════════════════════════════════════════════
// 💾 HISTORIA I PAMIĘĆ
// ═══════════════════════════════════════════════════════════════

/**
 * Zapisuje rozmowę do historii chatu
 */
function saveToChatHistory_(pytanie, odpowiedz) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ASYSTENT_CONFIG.SHEET_CHAT);
  
  if (!sheet) {
    sheet = ss.insertSheet(ASYSTENT_CONFIG.SHEET_CHAT);
    sheet.getRange(1, 1, 1, 4).setValues([['DATA', 'PYTANIE', 'ODPOWIEDZ', 'STATUS']]);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#673ab7').setFontColor('white');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 300);
    sheet.setColumnWidth(3, 500);
  }
  
  sheet.appendRow([new Date(), pytanie, odpowiedz, 'OK']);
}

/**
 * Zapisuje decyzję do pamięci długoterminowej
 * @param {string} typ - DECYZJA, TAKTYKA, ALERT
 * @param {string} ticker - Symbol (opcjonalnie)
 * @param {string} tresc - Co się wydarzyło
 */
function ZAPISZ_DECYZJE(typ, ticker, tresc) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ASYSTENT_CONFIG.SHEET_PAMIEC);
  
  if (!sheet) {
    sheet = ss.insertSheet(ASYSTENT_CONFIG.SHEET_PAMIEC);
    sheet.getRange(1, 1, 1, 5).setValues([['DATA', 'TYP', 'TICKER', 'TRESC', 'WYNIK']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#ff9800').setFontColor('white');
    sheet.setFrozenRows(1);
  }
  
  sheet.appendRow([new Date(), typ, ticker || '', tresc, '']);
  logSuccess(`Zapisano do pamięci: [${typ}] ${tresc.slice(0, 50)}...`);
}

// ═══════════════════════════════════════════════════════════════
// 📊 FUNKCJE DIAGNOSTYCZNE
// ═══════════════════════════════════════════════════════════════

/**
 * Sprawdza status asystenta
 */
function STATUS_ASYSTENTA() {
  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().split('T')[0];
  
  const savedDate = props.getProperty('ASYSTENT_DATE');
  let count = 0;
  if (savedDate === today) {
    count = parseInt(props.getProperty('ASYSTENT_COUNT') || '0');
  }
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('🤖 STATUS ASYSTENTA SENTINEL');
  logInfo(`   Pytania dziś: ${count}/${ASYSTENT_CONFIG.DAILY_LIMIT}`);
  logInfo(`   Klucz API: ${ASYSTENT_CONFIG.GEMINI_KEY ? '✅ OK' : '❌ BRAK'}`);
  logInfo(`   Model: ${ASYSTENT_CONFIG.MODEL} (Gemini)`);
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * Test asystenta
 */
function TEST_ASYSTENTA() {
  const odpowiedz = ZAPYTAJ_ASYSTENTA('Jak wygląda mój portfel? Krótko.');
  Logger.log('🤖 SENTINEL odpowiada:');
  Logger.log(odpowiedz);
}

/**
 * Resetuje limity (ostrożnie!)
 */
function RESET_LIMITU_ASYSTENTA() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ASYSTENT_COUNT', '0');
  props.setProperty('ASYSTENT_LAST', '0');
  logSuccess('Limity asystenta zresetowane');
}

// ═══════════════════════════════════════════════════════════════
// 🎯 SZYBKIE AKCJE (dla AppSheet)
// ═══════════════════════════════════════════════════════════════

/**
 * Analizuje konkretny ticker
 */
function ANALIZUJ_TICKER(ticker) {
  return ZAPYTAJ_ASYSTENTA(`Przeanalizuj spółkę ${ticker}. Jakie są ryzyka i szanse? Czy powinienem zwiększyć/zmniejszyć pozycję?`);
}

/**
 * Prosi o rebalancing
 */
function SPRAWDZ_BALANS() {
  return ZAPYTAJ_ASYSTENTA('Sprawdź proporcje Core vs Satellites. Czy potrzebuję rebalansingu? Jeśli tak, co konkretnie zrobić?');
}

/**
 * Ogólna ocena portfela
 */
function OCENA_PORTFELA() {
  return ZAPYTAJ_ASYSTENTA('Daj mi szczerą, chłodną ocenę mojego portfela. Co robię dobrze? Co źle? Co zmienić?');
}

// ═══════════════════════════════════════════════════════════════
// 📊 HISTORIA DECYZJI - System uczenia się z wyników
// ═══════════════════════════════════════════════════════════════

const HISTORIA_CONFIG = {
  SHEET_NAME: 'SENTINEL_HISTORIA',
  COLUMNS: ['DATA', 'TYP', 'TICKER', 'CENA_WTEDY', 'CENA_TERAZ', 'WYNIK_%', 'OCENA', 'NOTATKA', 'DNI'],
  TYPY: ['KUPNO', 'SPRZEDAZ', 'TRZYMAJ', 'OBSERWUJ']
};

/**
 * Zapisuje decyzję inwestycyjną do historii
 * @param {string} typ - KUPNO, SPRZEDAZ, TRZYMAJ, OBSERWUJ
 * @param {string} ticker - Symbol akcji
 * @param {number} cena - Cena w momencie decyzji
 * @param {string} notatka - Dlaczego podjąłeś tę decyzję
 */
function ZAPISZ_DECYZJE_V2(typ, ticker, cena, notatka) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(HISTORIA_CONFIG.SHEET_NAME);
  
  // Utwórz arkusz jeśli nie istnieje
  if (!sheet) {
    sheet = ss.insertSheet(HISTORIA_CONFIG.SHEET_NAME);
    sheet.getRange(1, 1, 1, HISTORIA_CONFIG.COLUMNS.length)
      .setValues([HISTORIA_CONFIG.COLUMNS])
      .setFontWeight('bold')
      .setBackground('#1a73e8')
      .setFontColor('white');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 9, 100);
    sheet.setColumnWidth(8, 300); // Notatka szersza
  }
  
  // Walidacja typu
  if (!HISTORIA_CONFIG.TYPY.includes(typ.toUpperCase())) {
    logError(`Nieprawidłowy typ decyzji: ${typ}. Dozwolone: ${HISTORIA_CONFIG.TYPY.join(', ')}`);
    return false;
  }
  
  // Zapisz decyzję
  const row = [
    new Date(),           // DATA
    typ.toUpperCase(),    // TYP
    ticker.toUpperCase(), // TICKER
    cena || '',           // CENA_WTEDY
    '',                   // CENA_TERAZ (formuła później)
    '',                   // WYNIK_% (formuła później)
    'NOWA',               // OCENA
    notatka || '',        // NOTATKA
    0                     // DNI
  ];
  
  const lastRow = sheet.getLastRow() + 1;
  sheet.appendRow(row);
  
  // Dodaj formuły dla CENA_TERAZ i WYNIK_%
  if (cena) {
    // Formuła pobierająca aktualną cenę z PORTFEL
    sheet.getRange(lastRow, 5).setFormula(
      `=IFERROR(VLOOKUP(C${lastRow},PORTFEL!B:I,8,FALSE),"")`
    );
    // Formuła obliczająca wynik %
    sheet.getRange(lastRow, 6).setFormula(
      `=IF(AND(D${lastRow}<>"",E${lastRow}<>""),(E${lastRow}-D${lastRow})/D${lastRow}*100,"")`
    );
    // Formuła obliczająca dni od decyzji
    sheet.getRange(lastRow, 9).setFormula(
      `=DAYS(TODAY(),A${lastRow})`
    );
  }
  
  logSuccess(`📝 Zapisano decyzję: ${typ} ${ticker} @ ${cena}`);
  return true;
}

/**
 * Ocenia wyniki decyzji (uruchom ręcznie lub jako trigger)
 */
function OCEN_WYNIKI_DECYZJI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(HISTORIA_CONFIG.SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() < 2) {
    logInfo('Brak decyzji do oceny');
    return;
  }
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  let updated = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const typ = row[1];        // TYP
    const wynik = row[5];      // WYNIK_%
    const ocena = row[6];      // OCENA
    const dni = row[8];        // DNI
    
    // Oceń tylko po min. 3 dniach i jeśli jest wynik
    if (dni >= 3 && wynik !== '' && ocena === 'NOWA') {
      let nowaOcena = 'NEUTRALNA';
      
      if (typ === 'KUPNO') {
        if (wynik > 5) nowaOcena = 'DOBRA';
        else if (wynik < -5) nowaOcena = 'ZLA';
      } else if (typ === 'SPRZEDAZ') {
        // Dla sprzedaży - jeśli cena spadła po sprzedaży = dobra decyzja
        if (wynik < -5) nowaOcena = 'DOBRA';
        else if (wynik > 5) nowaOcena = 'ZLA';
      }
      
      sheet.getRange(i + 2, 7).setValue(nowaOcena);
      updated++;
      
      // Dodaj formatowanie warunkowe
      const color = nowaOcena === 'DOBRA' ? '#c6efce' : 
                   nowaOcena === 'ZLA' ? '#ffc7ce' : '#fff2cc';
      sheet.getRange(i + 2, 7).setBackground(color);
    }
  }
  
  logSuccess(`📊 Oceniono ${updated} decyzji`);
}

/**
 * Pobiera historię decyzji do kontekstu AI
 * @returns {string} Sformatowana historia decyzji
 */
function getDecisionHistory_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(HISTORIA_CONFIG.SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() < 2) {
    return '';
  }
  
  const data = sheet.getRange(2, 1, Math.min(sheet.getLastRow() - 1, 10), 9).getValues();
  
  const decisions = [];
  for (const row of data) {
    const data_str = row[0] ? new Date(row[0]).toLocaleDateString('pl-PL') : '';
    const typ = row[1];
    const ticker = row[2];
    const cena_wtedy = row[3];
    const cena_teraz = row[4];
    const wynik = row[5];
    const ocena = row[6];
    const dni = row[8];
    
    if (ticker) {
      const wynikStr = wynik !== '' ? `${wynik > 0 ? '+' : ''}${parseFloat(wynik).toFixed(1)}%` : 'brak danych';
      decisions.push(`${typ} ${ticker} @ ${cena_wtedy} → ${wynikStr} [${ocena}] (${dni} dni temu)`);
    }
  }
  
  if (decisions.length === 0) return '';
  
  return `📜 HISTORIA TWOICH DECYZJI:
${decisions.join('\n')}

`;
}

/**
 * Szybkie zapisanie kupna
 */
function ZAPISZ_KUPNO(ticker, cena, notatka) {
  return ZAPISZ_DECYZJE_V2('KUPNO', ticker, cena, notatka);
}

/**
 * Szybkie zapisanie sprzedaży
 */
function ZAPISZ_SPRZEDAZ(ticker, cena, notatka) {
  return ZAPISZ_DECYZJE_V2('SPRZEDAZ', ticker, cena, notatka);
}

/**
 * Test systemu historii
 */
function TEST_HISTORIA() {
  logInfo('Testuję system historii decyzji...');
  
  // Zapisz testową decyzję
  ZAPISZ_DECYZJE_V2('OBSERWUJ', 'TEST', 100, 'Test systemu historii');
  
  // Pobierz historię
  const historia = getDecisionHistory_();
  Logger.log('Historia decyzji:');
  Logger.log(historia);
  
  logSuccess('Test zakończony!');
}

// ═══════════════════════════════════════════════════════════════
// 📈 KONTEKST RYNKOWY - S&P 500, VIX
// ═══════════════════════════════════════════════════════════════

/**
 * Pobiera kontekst rynkowy przez web search
 * @returns {string} Informacje o stanie rynku
 */
function getMarketContext_() {
  // Użyj cache żeby nie odpytywać za często
  const cache = CacheService.getScriptCache();
  const cached = cache.get('MARKET_CONTEXT');
  
  if (cached) {
    return cached;
  }
  
  try {
    const apiKey = ASYSTENT_CONFIG.GOOGLE_SEARCH_KEY;
    const cx = ASYSTENT_CONFIG.GOOGLE_SEARCH_CX;
    
    if (!apiKey || !cx) {
      // Bez web search - podstawowy kontekst
      return `📈 KONTEKST RYNKOWY: Brak danych (skonfiguruj Web Search)\n\n`;
    }
    
    // Wyszukaj aktualny stan rynku
    const query = 'S&P 500 today VIX market sentiment';
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=2`;
    
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      return '';
    }
    
    const data = JSON.parse(response.getContentText());
    
    if (!data.items || data.items.length === 0) {
      return '';
    }
    
    let context = `📈 KONTEKST RYNKOWY:\n`;
    for (const item of data.items) {
      context += `• ${item.snippet ? item.snippet.slice(0, 150) : item.title}\n`;
    }
    context += '\n';
    
    // Cache na 30 minut
    cache.put('MARKET_CONTEXT', context, 1800);
    
    return context;
    
  } catch (e) {
    logError(`Market context error: ${e.message}`);
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════
// 📅 EARNINGS CALENDAR - Wyniki kwartalne
// ═══════════════════════════════════════════════════════════════

// Zakodowane daty earnings dla głównych spółek (aktualizuj ręcznie lub przez API)
const EARNINGS_DATES = {
  'META': { date: '2026-02-05', q: 'Q4 2025' },
  'AAPL': { date: '2026-01-30', q: 'Q1 2026' },
  'MSFT': { date: '2026-01-28', q: 'Q2 2026' },
  'GOOGL': { date: '2026-02-04', q: 'Q4 2025' },
  'NVDA': { date: '2026-02-26', q: 'Q4 2026' },
  'IONQ': { date: '2026-02-28', q: 'Q4 2025' },
  'BBVA': { date: '2026-01-31', q: 'Q4 2025' },
  // Dodaj więcej według potrzeb
};

/**
 * Pobiera nadchodzące earnings dla tickerów z portfela
 * @param {Spreadsheet} ss - Arkusz
 * @returns {string} Kalendarz earnings
 */
function getEarningsCalendar_(ss) {
  const sheet = ss.getSheetByName(ASYSTENT_CONFIG.SHEET_PORTFEL);
  if (!sheet || sheet.getLastRow() < 2) return '';
  
  const tickers = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
  const today = new Date();
  const upcoming = [];
  
  for (const ticker of tickers) {
    if (ticker && EARNINGS_DATES[ticker.toUpperCase()]) {
      const earning = EARNINGS_DATES[ticker.toUpperCase()];
      const earningsDate = new Date(earning.date);
      const daysUntil = Math.ceil((earningsDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntil >= 0 && daysUntil <= 30) {
        const urgency = daysUntil <= 7 ? '⚠️' : daysUntil <= 14 ? '📌' : '';
        upcoming.push({
          ticker: ticker.toUpperCase(),
          date: earning.date,
          days: daysUntil,
          q: earning.q,
          urgency: urgency
        });
      }
    }
  }
  
  if (upcoming.length === 0) return '';
  
  // Sortuj po dniach
  upcoming.sort((a, b) => a.days - b.days);
  
  let result = `📅 NADCHODZĄCE WYNIKI KWARTALNE:\n`;
  for (const e of upcoming) {
    result += `${e.urgency} ${e.ticker}: ${e.date} (za ${e.days} dni) - ${e.q}\n`;
  }
  result += '\n';
  
  return result;
}

/**
 * Aktualizuje datę earnings dla tickera
 * @param {string} ticker - Symbol
 * @param {string} date - Data w formacie YYYY-MM-DD
 * @param {string} quarter - Kwartał np. "Q4 2025"
 */
function USTAW_EARNINGS(ticker, date, quarter) {
  EARNINGS_DATES[ticker.toUpperCase()] = { date: date, q: quarter };
  logSuccess(`Ustawiono earnings ${ticker}: ${date} (${quarter})`);
}

/**
 * KOMPLEKSOWY TEST SILNIKA SENTINEL (V2026)
 * Jedno wywołanie sprawdzające wszystkie moduły bez palenia kluczy.
 */
function TEST_SILNIKA_COMPLEX() {
  logInfo('🚀 ROZPOCZYNAM TEST SILNIKA SENTINEL 100%...');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Test Danych Rynkowych i Earnings
  logInfo('Krok 1: Weryfikacja danych rynkowych i kalendarza...');
  const market = getMarketContext_();
  const earnings = getEarningsCalendar_(ss);
  logInfo(`- Market Context: ${market ? '✅ Pobrano' : '❌ Brak (sprawdź Web Search)'}`);
  logInfo(`- Earnings: ${earnings ? '✅ Są nadchodzące' : 'ℹ️ Brak w najbliższych 30 dniach'}`);
  
  // 2. Test Historii Decyzji
  logInfo('Krok 2: Weryfikacja modułu historii...');
  const historia = getDecisionHistory_();
  logInfo(`- Historia: ${historia ? '✅ Pobrano dane' : 'ℹ️ Arkusz pusty'}`);
  
  // 3. Test Hybrydy AI (GROQ + GEMINI)
  logInfo('Krok 3: Test połączenia z modelami AI...');
  const testPrompt = "TEST: Odpowiedz jednym słowem 'GOTOWY' jeśli mnie słyszysz.";
  
  try {
    const resRozmowa = callHybridAI_(testPrompt, 'ROZMOWA');
    logInfo(`- Tryb Rozmowa: ✅ OK (Model: ${resRozmowa.model})`);
  } catch (e) {
    logError(`- Tryb Rozmowa: ❌ BŁĄD: ${e.message}`);
  }
  
  try {
    // Uwaga: Gemini (analiza) jest bardziej kosztowna/limitowana
    const resAnaliza = callHybridAI_(testPrompt, 'ANALIZA');
    logInfo(`- Tryb Analiza: ✅ OK (Model: ${resAnaliza.model})`);
  } catch (e) {
    logError(`- Tryb Analiza: ❌ BŁĄD: ${e.message}`);
  }
  
  logSuccess('🏁 TEST SILNIKA ZAKOŃCZONY. Jeśli wszystko na zielono - silnik 100% READY.');
}

// ═══════════════════════════════════════════════════════════════
// ⏰ MASTER TRIGGER MANAGEMENT - Centralne zarządzanie triggerami
// ═══════════════════════════════════════════════════════════════

/**
 * 🎛️ MASTER_SETUP_TRIGGERS
 * Konfiguruje wszystkie automatyczne zadania:
 * - System newsów co 1 godzinę
 * - Czyściec bazy raz dziennie o 3:00
 * - Aktualizacja cen co 30 minut (opcjonalnie)
 */
function MASTER_SETUP_TRIGGERS() {
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('⏰ MASTER TRIGGER SETUP - Start');
  
  // Najpierw usuń wszystkie istniejące triggery projektu
  const existingTriggers = ScriptApp.getProjectTriggers();
  logInfo(`🗑️ Usuwam ${existingTriggers.length} istniejących triggerów...`);
  existingTriggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // 1. NEWSY - co 1 godzinę
  ScriptApp.newTrigger('URUCHOM_SYSTEM_NEWSOW')
    .timeBased()
    .everyHours(1)
    .create();
  logSuccess('✅ Trigger NEWSY: co 1 godzinę');
  
  // 2. CZYŚCIEC - codziennie o 3:00
  ScriptApp.newTrigger('URUCHOM_CZYSCIEC')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();
  logSuccess('✅ Trigger CZYŚCIEC: codziennie o 3:00');
  
  // 3. CENY - co 30 minut (w godzinach giełdowych US: 15:30 - 22:00 CET)
  ScriptApp.newTrigger('AKTUALIZUJ_CENY_TRIGGER_')
    .timeBased()
    .everyMinutes(30)
    .create();
  logSuccess('✅ Trigger CENY: co 30 minut');
  
  logInfo('═══════════════════════════════════════════════════════');
  logSuccess('🎉 Wszystkie triggery zostały skonfigurowane!');
  logInfo('Uruchom POKAZ_TRIGGERY() aby zobaczyć aktywne triggery.');
}

/**
 * Wrapper dla aktualizacji cen wywoływanej przez trigger
 * Sprawdza czy giełda jest otwarta przed aktualizacją
 */
function AKTUALIZUJ_CENY_TRIGGER_() {
  const now = new Date();
  const hour = now.getHours();
  
  // Giełda US otwarta: 15:30 - 22:00 CET (9:30 - 16:00 EST)
  // Aktualizuj tylko w tych godzinach
  if (hour >= 15 && hour <= 22) {
    logInfo('⏰ Trigger: Aktualizacja cen (giełda otwarta)');
    try {
      // Wywołaj funkcję z CenyGlowne.gs jeśli istnieje
      if (typeof AKTUALIZUJ_WSZYSTKO === 'function') {
        AKTUALIZUJ_WSZYSTKO();
      }
    } catch (e) {
      logError(`Błąd aktualizacji cen: ${e.message}`);
    }
  } else {
    logInfo('💤 Trigger: Giełda zamknięta, pomijam aktualizację cen.');
  }
}

/**
 * 🗑️ Usuwa wszystkie triggery projektu
 */
function USUN_WSZYSTKIE_TRIGGERY() {
  const triggers = ScriptApp.getProjectTriggers();
  logInfo(`🗑️ Usuwam ${triggers.length} triggerów...`);
  
  triggers.forEach(trigger => {
    logInfo(`   - ${trigger.getHandlerFunction()}`);
    ScriptApp.deleteTrigger(trigger);
  });
  
  logSuccess('Wszystkie triggery usunięte.');
}

/**
 * 📋 Pokazuje aktywne triggery
 */
function POKAZ_TRIGGERY() {
  const triggers = ScriptApp.getProjectTriggers();
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo(`📋 AKTYWNE TRIGGERY: ${triggers.length}`);
  
  if (triggers.length === 0) {
    logInfo('   (brak)');
    logInfo('   Uruchom MASTER_SETUP_TRIGGERS() aby je skonfigurować.');
  } else {
    triggers.forEach(trigger => {
      const func = trigger.getHandlerFunction();
      const type = trigger.getTriggerSource();
      logInfo(`   • ${func} [${type}]`);
    });
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}
