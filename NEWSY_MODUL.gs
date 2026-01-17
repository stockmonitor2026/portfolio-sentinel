/**
 * ═══════════════════════════════════════════════════════════════
 * 📰 NEWSY_MODUL.gs - System Analizy Newsów z AI
 * ═══════════════════════════════════════════════════════════════
 * 
 * FUNKCJE:
 * - Pobieranie newsów z RSS (Google News)
 * - Analiza AI przez Gemini Flash (DARMOWE 1500 req/dzień)
 * - Scoring 1-10 (filtrowanie szumu)
 * - Cache i deduplikacja
 * 
 * INSTRUKCJA:
 * 1. Ustaw klucz Gemini w Script Properties: GEMINI_KEY
 * 2. Utwórz arkusz "NEWSY_BAZA" z kolumnami:
 *    A: ID | B: TICKER | C: DATA | D: TYTUL | E: ANALIZA | F: SENTIMENT | G: SCORE
 */

// ═══════════════════════════════════════════════════════════════
// 📋 KONFIGURACJA NEWSÓW
// ═══════════════════════════════════════════════════════════════

const NEWS_CONFIG = {
  // Arkusze
  SHEET_NEWSY: 'NEWSY_BAZA',
  SHEET_PORTFEL: 'PORTFEL',
  
  // === WYBÓR PROVIDERA AI ===
  // Ustaw 'GEMINI' lub 'GROQ'
  AI_PROVIDER: 'GROQ',  // <-- ZMIEŃ TUTAJ NA 'GEMINI' LUB 'GROQ'
  
  // API Gemini
  get GEMINI_KEY() {
    return PropertiesService.getScriptProperties().getProperty('GEMINI_KEY') || '';
  },
  GEMINI_MODEL: 'gemini-2.0-flash-lite',
  
  // API Groq (DARMOWE - 30 req/min, modele Llama)
  // Zdobądź klucz: https://console.groq.com/keys
  get GROQ_KEY() {
    return PropertiesService.getScriptProperties().getProperty('GROQ_KEY') || '';
  },
  GROQ_MODEL: 'llama-3.3-70b-versatile',  // Bardzo dobry, darmowy
  
  // === LIMITY BEZPIECZEŃSTWA API ===
  DAILY_API_LIMIT: 500,
  DAILY_API_WARNING: 400,
  
  // === CZYŚCIEC - ARCHIWIZACJA I CZYSZCZENIE ===
  SHEET_ARCHIWUM: 'NEWSY_ARCHIWUM',
  
  // Reguły retencji (w dniach)
  RETENTION: {
    NOISE: 1,          // Score 1-3: usuń po 1 dniu
    LOW: 3,            // Score 4-5: usuń po 3 dniach
    MEDIUM: 7,         // Score 6-7: archiwizuj po 7 dniach
    HIGH: 14           // Score 8-10: archiwizuj po 14 dniach
  },
  
  // Progi score dla akcji
  SCORE_THRESHOLDS: {
    ARCHIVE_MIN: 6,    // Minimalny score do archiwum (6+)
    NOISE_MAX: 3       // Maksymalny score dla szumu (1-3)
  },
  
  // Limity
  MAX_NEWS_PER_TICKER: 3,
  MAX_NEWS_TO_ANALYZE: 15,
  BATCH_SIZE: 5,
  API_DELAY_MS: 2500,
  
  // Cache
  CACHE_TTL: 3600,
  
  // Kolumny NEWSY_BAZA (1-indexed)
  // UWAGA: Po aktualizacji dodaj kolumny PEWNOŚĆ i HORYZONT do arkusza!
  COL: {
    ID: 1,
    TICKER: 2,
    DATA: 3,
    TYTUL: 4,
    ANALIZA: 5,
    SENTIMENT: 6,
    SCORE: 7,
    PEWNOSC: 8,    // NOWE - Pewność AI (70-100%)
    HORYZONT: 9    // NOWE - Krótki/Długi/Mix
  },
  
  // Źródła RSS
  RSS_SOURCES: [
    'https://news.google.com/rss/search?q={TICKER}+stock&hl=en-US&gl=US&ceid=US:en'
  ],
  
  // Słowa kluczowe do filtrowania szumu
  NOISE_KEYWORDS: [
    'ad', 'sponsored', 'promotion', 'giveaway', 
    'click here', 'subscribe', 'newsletter'
  ],
  
  // Słowa kluczowe ważnych newsów
  IMPORTANT_KEYWORDS: [
    'earnings', 'revenue', 'profit', 'loss', 'guidance',
    'acquisition', 'merger', 'buyout', 'ipo', 'sec',
    'lawsuit', 'investigation', 'fda', 'approval',
    'ceo', 'cfo', 'resign', 'fired', 'appointed',
    'dividend', 'buyback', 'split', 'offering',
    'upgrade', 'downgrade', 'target', 'rating',
    'beat', 'miss', 'exceed', 'below'
  ]
};

// ═══════════════════════════════════════════════════════════════
// 🔒 LICZNIK ZAPYTAŃ API (OCHRONA KLUCZA)
// ═══════════════════════════════════════════════════════════════

/**
 * Pobiera dzisiejszą liczbę zapytań API
 */
function getApiUsageToday_() {
  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const savedDate = props.getProperty('API_USAGE_DATE');
  const savedCount = parseInt(props.getProperty('API_USAGE_COUNT') || '0');
  
  // Jeśli nowy dzień - resetuj licznik
  if (savedDate !== today) {
    props.setProperty('API_USAGE_DATE', today);
    props.setProperty('API_USAGE_COUNT', '0');
    logInfo('📊 Licznik API zresetowany na nowy dzień');
    return 0;
  }
  
  return savedCount;
}

/**
 * Zwiększa licznik zapytań API
 * @returns {boolean} true jeśli można kontynuować, false jeśli limit
 */
function incrementApiUsage_(count) {
  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().split('T')[0];
  
  // Upewnij się że data jest aktualna
  const savedDate = props.getProperty('API_USAGE_DATE');
  if (savedDate !== today) {
    props.setProperty('API_USAGE_DATE', today);
    props.setProperty('API_USAGE_COUNT', '0');
  }
  
  const currentCount = parseInt(props.getProperty('API_USAGE_COUNT') || '0');
  const newCount = currentCount + count;
  
  // Sprawdź limit
  if (newCount > NEWS_CONFIG.DAILY_API_LIMIT) {
    logError(`🚨 LIMIT DZIENNY OSIĄGNIĘTY! (${newCount}/${NEWS_CONFIG.DAILY_API_LIMIT})`);
    logError('Zatrzymuję zapytania do jutra.');
    return false;
  }
  
  // Ostrzeżenie
  if (newCount > NEWS_CONFIG.DAILY_API_WARNING) {
    logInfo(`⚠️ UWAGA: Zbliżasz się do limitu! (${newCount}/${NEWS_CONFIG.DAILY_API_LIMIT})`);
  }
  
  props.setProperty('API_USAGE_COUNT', newCount.toString());
  return true;
}

/**
 * Sprawdza status dziennego limitu
 */
function SPRAWDZ_LIMIT_API() {
  const usage = getApiUsageToday_();
  const limit = NEWS_CONFIG.DAILY_API_LIMIT;
  const percent = ((usage / limit) * 100).toFixed(1);
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo(`📊 STATYSTYKI API - ${new Date().toISOString().split('T')[0]}`);
  logInfo(`   Zapytania dziś: ${usage}`);
  logInfo(`   Limit dzienny: ${limit}`);
  logInfo(`   Wykorzystanie: ${percent}%`);
  
  if (usage >= limit) {
    logError('   Status: 🔴 LIMIT OSIĄGNIĘTY');
  } else if (usage >= NEWS_CONFIG.DAILY_API_WARNING) {
    logInfo('   Status: 🟡 ZBLIŻASZ SIĘ DO LIMITU');
  } else {
    logSuccess('   Status: 🟢 OK');
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * Resetuje licznik ręcznie (użyj ostrożnie!)
 */
function RESET_LICZNIKA_API() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('API_USAGE_COUNT', '0');
  props.setProperty('API_USAGE_DATE', new Date().toISOString().split('T')[0]);
  logSuccess('Licznik API zresetowany do 0');
}

// ═══════════════════════════════════════════════════════════════
// 🚀 GŁÓWNE FUNKCJE
// ═══════════════════════════════════════════════════════════════


/**
 * 🎮 URUCHOM CAŁY SYSTEM NEWSÓW
 * Pobiera newsy RSS i analizuje przez AI
 */
function URUCHOM_SYSTEM_NEWSOW() {
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('📰 START SYSTEMU NEWSÓW');
  
  const startTime = new Date();
  
  try {
    // 1. Pobierz newsy RSS
    const noweNewsy = POBIERZ_NEWSY_RSS();
    logInfo(`📥 Pobrano ${noweNewsy} nowych newsów`);
    
    // 2. Analizuj przez AI
    if (noweNewsy > 0) {
      ANALIZUJ_NEWSY_AI();
    }
    
    const duration = (new Date() - startTime) / 1000;
    logSuccess(`System newsów zakończony w ${duration.toFixed(1)}s`);
    
  } catch (e) {
    logError(`Błąd systemu newsów: ${e.message}`);
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════
// 📡 MODUŁ RSS
// ═══════════════════════════════════════════════════════════════

/**
 * Pobiera newsy RSS dla wszystkich tickerów w portfelu
 * @returns {number} Liczba nowych newsów
 */
function POBIERZ_NEWSY_RSS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const portfel = ss.getSheetByName(NEWS_CONFIG.SHEET_PORTFEL);
  const baza = ss.getSheetByName(NEWS_CONFIG.SHEET_NEWSY);
  
  if (!portfel || !baza) {
    logError('Nie znaleziono arkuszy PORTFEL lub NEWSY_BAZA');
    return 0;
  }
  
  if (portfel.getLastRow() < 2) return 0;
  
  // Pobierz tickery z kolumny B
  const tickery = portfel.getRange('B2:B' + portfel.getLastRow())
                         .getValues()
                         .flat()
                         .filter(t => t && t !== 'TICKER');
  
  // Usuń duplikaty
  const unikalneTicker = [...new Set(tickery)];
  
  // Cache istniejących tytułów (ostatnie 100)
  const istniejaceTytuly = getExistingTitles_(baza, 100);
  
  let noweNewsyCount = 0;
  
  for (const ticker of unikalneTicker) {
    const newsy = fetchNewsForTicker_(ticker);
    
    for (const news of newsy) {
      // Sprawdź duplikaty
      if (istniejaceTytuly.has(news.title.toLowerCase())) continue;
      
      // Pre-scoring (szybki filtr przed AI)
      const preScore = calculatePreScore_(news.title);
      
      // Zapisz do bazy
      baza.appendRow([
        generateNewsId_(),
        ticker,
        new Date(),
        news.title,
        '',                    // Analiza (wypełni AI)
        'Nowy',                // Status
        preScore > 3 ? '' : '💤 1'  // Pre-score dla oczywistego szumu
      ]);
      
      istniejaceTytuly.add(news.title.toLowerCase());
      noweNewsyCount++;
    }
    
    // Pauza między tickerami
    Utilities.sleep(500);
  }
  
  return noweNewsyCount;
}

/**
 * Pobiera newsy dla pojedynczego tickera
 */
function fetchNewsForTicker_(ticker) {
  const allNews = [];
  
  for (const sourceTemplate of NEWS_CONFIG.RSS_SOURCES) {
    try {
      const url = sourceTemplate.replace('{TICKER}', encodeURIComponent(ticker));
      const xml = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();
      const doc = XmlService.parse(xml);
      const items = doc.getRootElement().getChild('channel').getChildren('item');
      
      for (let i = 0; i < Math.min(items.length, NEWS_CONFIG.MAX_NEWS_PER_TICKER); i++) {
        const title = items[i].getChild('title').getText();
        const link = items[i].getChild('link') ? items[i].getChild('link').getText() : '';
        const pubDate = items[i].getChild('pubDate') ? items[i].getChild('pubDate').getText() : '';
        
        allNews.push({ title, link, pubDate });
      }
      
      // Jeśli mamy wystarczająco, przerwij
      if (allNews.length >= NEWS_CONFIG.MAX_NEWS_PER_TICKER) break;
      
    } catch (e) {
      logError(`RSS error for ${ticker}: ${e.message}`);
    }
  }
  
  // Ogranicz do max
  return allNews.slice(0, NEWS_CONFIG.MAX_NEWS_PER_TICKER);
}

/**
 * Pobiera istniejące tytuły do sprawdzenia duplikatów
 */
function getExistingTitles_(sheet, count) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();
  
  const startRow = Math.max(2, lastRow - count + 1);
  const numRows = lastRow - startRow + 1;
  
  const titles = sheet.getRange(startRow, NEWS_CONFIG.COL.TYTUL, numRows, 1)
                      .getValues()
                      .flat()
                      .map(t => t.toString().toLowerCase());
  
  return new Set(titles);
}

/**
 * Pre-scoring - szybki filtr przed AI
 */
function calculatePreScore_(title) {
  const lowerTitle = title.toLowerCase();
  let score = 5; // Bazowy score
  
  // Sprawdź szum
  for (const noise of NEWS_CONFIG.NOISE_KEYWORDS) {
    if (lowerTitle.includes(noise)) {
      score -= 2;
    }
  }
  
  // Sprawdź ważne słowa
  for (const important of NEWS_CONFIG.IMPORTANT_KEYWORDS) {
    if (lowerTitle.includes(important)) {
      score += 1;
    }
  }
  
  return Math.max(1, Math.min(10, score));
}

/**
 * Generuje unikalne ID dla newsa
 */
function generateNewsId_() {
  return 'N-' + Utilities.getUuid().slice(0, 8);
}

// ═══════════════════════════════════════════════════════════════
// 🧠 MODUŁ AI - OBSŁUGA GEMINI I GROQ
// ═══════════════════════════════════════════════════════════════

/**
 * Analizuje nowe newsy przez AI (Gemini lub Groq)
 */
function ANALIZUJ_NEWSY_AI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const baza = ss.getSheetByName(NEWS_CONFIG.SHEET_NEWSY);
  
  // 🔒 Sprawdź limit API przed rozpoczęciem
  const currentUsage = getApiUsageToday_();
  if (currentUsage >= NEWS_CONFIG.DAILY_API_LIMIT) {
    logError(`🚨 Limit dzienny osiągnięty (${currentUsage}/${NEWS_CONFIG.DAILY_API_LIMIT}). Pomijam analizę.`);
    return;
  }
  
  // Wybierz providera i klucz
  const provider = NEWS_CONFIG.AI_PROVIDER;
  let apiKey;
  
  if (provider === 'GROQ') {
    apiKey = NEWS_CONFIG.GROQ_KEY;
    if (!apiKey) {
      logError('Brak klucza GROQ_KEY! Ustaw w Script Properties lub zmień AI_PROVIDER na GEMINI');
      return;
    }
    logInfo('🧠 Używam Groq (Llama 3.3)');
  } else {
    apiKey = NEWS_CONFIG.GEMINI_KEY;
    if (!apiKey) {
      logError('Brak klucza GEMINI_KEY w Script Properties!');
      return;
    }
    logInfo('🧠 Używam Gemini');
  }
  
  // Znajdź newsy do analizy
  const newsyDoAnalizy = findNewsToAnalyze_(baza);
  
  logInfo(`🔍 Znaleziono ${newsyDoAnalizy.length} newsów do analizy AI`);
  logInfo(`📊 Użycie API dziś: ${currentUsage}/${NEWS_CONFIG.DAILY_API_LIMIT}`);
  
  if (newsyDoAnalizy.length === 0) return;
  
  // Przetwarzaj w paczkach
  let batchCount = 0;
  for (let i = 0; i < newsyDoAnalizy.length; i += NEWS_CONFIG.BATCH_SIZE) {
    // 🔒 Sprawdź limit przed każdą paczką
    if (!incrementApiUsage_(1)) {
      logError('Zatrzymuję przetwarzanie - limit osiągnięty.');
      break;
    }
    
    const batch = newsyDoAnalizy.slice(i, i + NEWS_CONFIG.BATCH_SIZE);
    batchCount++;
    
    logInfo(`📤 Analizuję paczkę ${batchCount}...`);
    
    if (provider === 'GROQ') {
      processNewsBatchGroq_(batch, apiKey, baza);
    } else {
      processNewsBatchGemini_(batch, apiKey, baza);
    }
    
    // Pauza między paczkami
    if (i + NEWS_CONFIG.BATCH_SIZE < newsyDoAnalizy.length) {
      Utilities.sleep(NEWS_CONFIG.API_DELAY_MS);
    }
  }
}

/**
 * Znajduje newsy wymagające analizy
 */
function findNewsToAnalyze_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const newsyDoAnalizy = [];
  
  for (let i = 0; i < data.length; i++) {
    const status = data[i][5];
    const score = data[i][6];
    
    if (status === 'Nowy' || (typeof status === 'string' && status.includes('Błąd'))) {
      if (score && score.toString().includes('💤')) continue;
      
      newsyDoAnalizy.push({
        row: i + 2,
        id: data[i][0],
        ticker: data[i][1],
        title: data[i][3]
      });
      
      if (newsyDoAnalizy.length >= NEWS_CONFIG.MAX_NEWS_TO_ANALYZE) break;
    }
  }
  
  return newsyDoAnalizy;
}

/**
 * Przetwarza paczkę przez GROQ (Llama 3.3)
 */
function processNewsBatchGroq_(batch, apiKey, sheet) {
  const prompt = buildAnalysisPrompt_(batch);
  
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const payload = {
    model: NEWS_CONFIG.GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'Jesteś profesjonalnym analitykiem finansowym. Odpowiadaj TYLKO w zadanym formacie.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 2048
  };
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      const text = result.choices[0].message.content;
      
      parseAndSaveResults_(text, batch, sheet);
      logSuccess(`Paczka ${batch.length} newsów przeanalizowana (Groq)`);
      
    } else {
      const errorText = response.getContentText();
      logError(`Groq API error ${response.getResponseCode()}: ${errorText.slice(0, 200)}`);
      
      batch.forEach(item => {
        sheet.getRange(item.row, NEWS_CONFIG.COL.SENTIMENT).setValue(`Błąd ${response.getResponseCode()}`);
      });
    }
    
  } catch (e) {
    logError(`Groq batch error: ${e.message}`);
    batch.forEach(item => {
      sheet.getRange(item.row, NEWS_CONFIG.COL.SENTIMENT).setValue('Błąd: ' + e.message.slice(0, 50));
    });
  }
}

/**
 * Przetwarza paczkę przez GEMINI
 */
function processNewsBatchGemini_(batch, apiKey, sheet) {
  const prompt = buildAnalysisPrompt_(batch);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${NEWS_CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      const text = result.candidates[0].content.parts[0].text;
      
      parseAndSaveResults_(text, batch, sheet);
      logSuccess(`Paczka ${batch.length} newsów przeanalizowana (Gemini)`);
      
    } else {
      const errorText = response.getContentText();
      logError(`Gemini API error ${response.getResponseCode()}: ${errorText.slice(0, 200)}`);
      
      batch.forEach(item => {
        sheet.getRange(item.row, NEWS_CONFIG.COL.SENTIMENT).setValue(`Błąd ${response.getResponseCode()}`);
      });
    }
    
  } catch (e) {
    logError(`Gemini batch error: ${e.message}`);
    batch.forEach(item => {
      sheet.getRange(item.row, NEWS_CONFIG.COL.SENTIMENT).setValue('Błąd: ' + e.message.slice(0, 50));
    });
  }
}

/**
 * Buduje prompt dla Gemini - ENHANCED VERSION
 * Dodano: Pewność AI, wpływ krótko/długoterminowy, kategorie wydarzeń
 */
function buildAnalysisPrompt_(batch) {
  const newsList = batch.map((item, i) => `[${i}] ${item.ticker}: ${item.title}`).join('\n');
  
  return `Jesteś chłodnym, obiektywnym analitykiem finansowym z 20+ lat doświadczenia. Przeanalizuj poniższe newsy giełdowe.

DLA KAŻDEGO NEWSA PODAJ:

1. SCORE (1-10):
   - 1-2: Szum (clickbait, reklama, niejasne pogłoski)
   - 3-4: Małe znaczenie (drobne update'y, opinie analityków)
   - 5-6: Istotne (zmiany w zarządzie, nowi klienci, partnerstwa)
   - 7-8: Ważne (wyniki kwartalne, znaczące kontrakty, zmiany strategii)
   - 9: Bardzo ważne (przejęcia, duże pozwy, znaczące zmiany regulacji)
   - 10: Krytyczne (M&A, bankructwo, śmierć CEO, fraud, wycofanie produktu)

2. SENTIMENT: POZYTYWNY / NEGATYWNY / NEUTRALNY

3. PEWNOŚĆ (70-100%): Jak pewny jesteś tej oceny?
   - 90%+: Jednoznaczny news, oczywisty wpływ
   - 80-89%: Dość pewny, jasny kontekst
   - 70-79%: Niepewny, wymaga weryfikacji

4. HORYZONT: KRÓTKI / DŁUGI / MIX
   - KRÓTKI: Wpływ 1-7 dni (earnings beat/miss, daily news)
   - DŁUGI: Wpływ miesiące/lata (M&A, nowa strategia, regulacje)
   - MIX: Oba horyzonty

5. ANALIZA: Krótko (max 40 słów) - kluczowy insight + dlaczego taki score?

FORMAT ODPOWIEDZI (ŚCIŚLE - bez odstępstw):
[numer]|SCORE|SENTIMENT|PEWNOŚĆ|HORYZONT|ANALIZA

PRZYKŁAD:
[0]|8|POZYTYWNY|92%|KRÓTKI|Wyniki Q4 zdecydowanie powyżej oczekiwań, EPS +15% YoY. Krótkoterminowy boost pewny.

NEWSY DO ANALIZY:
${newsList}

ODPOWIEDZ TERAZ W FORMACIE:`;
}


/**
 * Parsuje odpowiedź AI i zapisuje do arkusza - ENHANCED VERSION
 * Obsługuje nowy format: [numer]|SCORE|SENTIMENT|PEWNOŚĆ|HORYZONT|ANALIZA
 */
function parseAndSaveResults_(responseText, batch, sheet) {
  const lines = responseText.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    // Nowy format: [numer]|SCORE|SENTIMENT|PEWNOŚĆ|HORYZONT|ANALIZA
    const matchNew = line.match(/\[(\d+)\]\|(\d+)\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)/);
    // Stary format (fallback): [numer]|SCORE|SENTIMENT|ANALIZA
    const matchOld = line.match(/\[(\d+)\]\|(\d+)\|([^|]+)\|(.+)/);
    
    let match = matchNew || matchOld;
    
    if (match) {
      const index = parseInt(match[1]);
      const score = parseInt(match[2]);
      const sentiment = match[3].trim();
      
      // Rozróżnij nowy i stary format
      let pewnosc = '';
      let horyzont = '';
      let analiza = '';
      
      if (matchNew) {
        pewnosc = match[4].trim();
        horyzont = match[5].trim();
        analiza = match[6].trim();
      } else {
        analiza = match[4].trim();
      }
      
      if (index < batch.length) {
        const row = batch[index].row;
        
        // Format score z ikonką
        let scoreDisplay = formatScore_(score);
        
        // Format sentiment
        let sentimentDisplay = formatSentiment_(sentiment);
        
        // Zapisz podstawowe kolumny
        sheet.getRange(row, NEWS_CONFIG.COL.ANALIZA).setValue(analiza);
        sheet.getRange(row, NEWS_CONFIG.COL.SENTIMENT).setValue(sentimentDisplay);
        sheet.getRange(row, NEWS_CONFIG.COL.SCORE).setNumberFormat('@').setValue(scoreDisplay);
        
        // Zapisz nowe kolumny jeśli są dostępne
        if (pewnosc) {
          sheet.getRange(row, NEWS_CONFIG.COL.PEWNOSC).setValue(pewnosc);
        }
        if (horyzont) {
          const horzDisplay = formatHoryzont_(horyzont);
          sheet.getRange(row, NEWS_CONFIG.COL.HORYZONT).setValue(horzDisplay);
        }
      }
    }
  }
}

/**
 * Formatuje horyzont czasowy z ikonką
 */
function formatHoryzont_(horyzont) {
  const upper = horyzont.toUpperCase();
  
  if (upper.includes('KRÓT') || upper.includes('SHORT')) {
    return '⏱️ KRÓTKI';
  } else if (upper.includes('DŁUG') || upper.includes('LONG')) {
    return '📅 DŁUGI';
  } else {
    return '🔄 MIX';
  }
}

/**
 * Formatuje score z ikonką
 */
function formatScore_(score) {
  let icon = '💤'; // 1-3
  
  if (score >= 9) icon = '🚀';       // Krytyczne
  else if (score >= 7) icon = '🔥';  // Ważne
  else if (score >= 5) icon = '⚡';  // Istotne
  else if (score >= 4) icon = '⚖️';  // Neutralne
  
  return `${icon} ${score}`;
}

/**
 * Formatuje sentiment
 */
function formatSentiment_(sentiment) {
  const upper = sentiment.toUpperCase();
  
  if (upper.includes('POZ') || upper.includes('POS')) {
    return '🟢 POZYTYWNY';
  } else if (upper.includes('NEG')) {
    return '🔴 NEGATYWNY';
  } else {
    return '⚪ NEUTRALNY';
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧹 CZYŚCIEC - ARCHIWIZACJA I CZYSZCZENIE
// ═══════════════════════════════════════════════════════════════

/**
 * 🧹 GŁÓWNA FUNKCJA CZYŚĆCA
 * Uruchamiaj codziennie (trigger) lub ręcznie
 * 
 * Działanie:
 * - Score 1-3 (szum): usuń po 1 dniu
 * - Score 4-5 (niski): usuń po 3 dniach
 * - Score 6-7 (średni): archiwizuj po 7 dniach
 * - Score 8-10 (wysoki): archiwizuj po 14 dniach
 */
function URUCHOM_CZYSCIEC() {
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('🧹 CZYŚCIEC - Start');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const baza = ss.getSheetByName(NEWS_CONFIG.SHEET_NEWSY);
  
  if (!baza || baza.getLastRow() < 2) {
    logInfo('Brak newsów do przetworzenia');
    return;
  }
  
  // Upewnij się że arkusz archiwum istnieje
  const archiwum = getOrCreateArchiveSheet_(ss);
  
  const now = new Date();
  const data = baza.getRange(2, 1, baza.getLastRow() - 1, 7).getValues();
  
  let usunietych = 0;
  let zarchiwizowanych = 0;
  const rowsToDelete = [];
  
  // Przetwarzaj od końca (żeby indeksy się nie zmieniały)
  for (let i = data.length - 1; i >= 0; i--) {
    const row = i + 2;
    const newsDate = new Date(data[i][2]);
    const scoreRaw = data[i][6];
    const ageInDays = (now - newsDate) / (1000 * 60 * 60 * 24);
    
    // Wyciągnij liczbę ze score (np. "🔥 8" → 8)
    const score = extractScoreNumber_(scoreRaw);
    
    // Pomiń newsy bez score (jeszcze nie przeanalizowane)
    if (score === 0 && !scoreRaw.toString().includes('💤')) continue;
    
    // Określ akcję na podstawie score i wieku
    const action = determineAction_(score, ageInDays);
    
    if (action === 'DELETE') {
      rowsToDelete.push(row);
      usunietych++;
    } else if (action === 'ARCHIVE') {
      // Przenieś do archiwum
      archiwum.appendRow(data[i]);
      rowsToDelete.push(row);
      zarchiwizowanych++;
    }
    // action === 'KEEP' - nic nie rób
  }
  
  // Usuń wiersze (od końca!)
  rowsToDelete.sort((a, b) => b - a);
  for (const row of rowsToDelete) {
    baza.deleteRow(row);
  }
  
  logSuccess(`Czyściec zakończony:`);
  logInfo(`   📂 Zarchiwizowanych: ${zarchiwizowanych}`);
  logInfo(`   🗑️ Usuniętych: ${usunietych}`);
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * Wyciąga liczbę score z formatu "🔥 8" → 8
 */
function extractScoreNumber_(scoreRaw) {
  if (!scoreRaw) return 0;
  
  const str = scoreRaw.toString();
  const match = str.match(/(\d+)/);
  
  return match ? parseInt(match[1]) : 0;
}

/**
 * Określa akcję dla newsa na podstawie score i wieku
 */
function determineAction_(score, ageInDays) {
  const R = NEWS_CONFIG.RETENTION;
  const T = NEWS_CONFIG.SCORE_THRESHOLDS;
  
  // Score 1-3 (szum) - usuń po NOISE dni
  if (score <= T.NOISE_MAX && ageInDays >= R.NOISE) {
    return 'DELETE';
  }
  
  // Score 4-5 (niski) - usuń po LOW dni
  if (score >= 4 && score <= 5 && ageInDays >= R.LOW) {
    return 'DELETE';
  }
  
  // Score 6-7 (średni) - archiwizuj po MEDIUM dni
  if (score >= 6 && score <= 7 && ageInDays >= R.MEDIUM) {
    return 'ARCHIVE';
  }
  
  // Score 8-10 (wysoki) - archiwizuj po HIGH dni
  if (score >= 8 && ageInDays >= R.HIGH) {
    return 'ARCHIVE';
  }
  
  return 'KEEP';
}

/**
 * Tworzy lub pobiera arkusz archiwum
 */
function getOrCreateArchiveSheet_(ss) {
  let archiwum = ss.getSheetByName(NEWS_CONFIG.SHEET_ARCHIWUM);
  
  if (!archiwum) {
    archiwum = ss.insertSheet(NEWS_CONFIG.SHEET_ARCHIWUM);
    
    // Nagłówki
    archiwum.getRange(1, 1, 1, 7).setValues([[
      'ID', 'TICKER', 'DATA', 'TYTUŁ', 'ANALIZA', 'SENTIMENT', 'SCORE'
    ]]);
    
    // Formatowanie
    archiwum.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#9e9e9e').setFontColor('white');
    archiwum.setFrozenRows(1);
    
    // Szerokości
    archiwum.setColumnWidth(1, 80);
    archiwum.setColumnWidth(2, 80);
    archiwum.setColumnWidth(3, 120);
    archiwum.setColumnWidth(4, 350);
    archiwum.setColumnWidth(5, 250);
    archiwum.setColumnWidth(6, 120);
    archiwum.setColumnWidth(7, 80);
    
    logSuccess('Utworzono arkusz NEWSY_ARCHIWUM');
  }
  
  return archiwum;
}

/**
 * Pokazuje statystyki newsów
 */
function STATYSTYKI_NEWSOW() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const baza = ss.getSheetByName(NEWS_CONFIG.SHEET_NEWSY);
  const archiwum = ss.getSheetByName(NEWS_CONFIG.SHEET_ARCHIWUM);
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('📊 STATYSTYKI NEWSÓW');
  
  if (baza && baza.getLastRow() > 1) {
    const data = baza.getRange(2, 7, baza.getLastRow() - 1, 1).getValues().flat();
    
    let szum = 0, niski = 0, sredni = 0, wysoki = 0, brakScore = 0;
    
    for (const scoreRaw of data) {
      const score = extractScoreNumber_(scoreRaw);
      if (score === 0) brakScore++;
      else if (score <= 3) szum++;
      else if (score <= 5) niski++;
      else if (score <= 7) sredni++;
      else wysoki++;
    }
    
    logInfo(`📰 NEWSY_BAZA: ${baza.getLastRow() - 1} newsów`);
    logInfo(`   💤 Szum (1-3): ${szum}`);
    logInfo(`   ⚖️ Niski (4-5): ${niski}`);
    logInfo(`   ⚡ Średni (6-7): ${sredni}`);
    logInfo(`   🔥 Wysoki (8-10): ${wysoki}`);
    logInfo(`   ❓ Bez score: ${brakScore}`);
  } else {
    logInfo('📰 NEWSY_BAZA: pusta');
  }
  
  if (archiwum && archiwum.getLastRow() > 1) {
    logInfo(`📂 NEWSY_ARCHIWUM: ${archiwum.getLastRow() - 1} newsów`);
  } else {
    logInfo('📂 NEWSY_ARCHIWUM: puste');
  }
  
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * Ustawia trigger dla czyśćca (raz dziennie o 3:00)
 */
function USTAW_TRIGGER_CZYSCIEC() {
  // Usuń istniejące
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'URUCHOM_CZYSCIEC') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Nowy trigger - codziennie o 3:00
  ScriptApp.newTrigger('URUCHOM_CZYSCIEC')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();
  
  logSuccess('Trigger czyśćca ustawiony: codziennie o 3:00');
}

/**
 * Tworzy arkusz NEWSY_BAZA jeśli nie istnieje
 */
function UTWORZ_ARKUSZ_NEWSY() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let baza = ss.getSheetByName(NEWS_CONFIG.SHEET_NEWSY);
  
  if (!baza) {
    baza = ss.insertSheet(NEWS_CONFIG.SHEET_NEWSY);
    
    // Nagłówki
    baza.getRange(1, 1, 1, 7).setValues([[
      'ID', 'TICKER', 'DATA', 'TYTUŁ', 'ANALIZA', 'SENTIMENT', 'SCORE'
    ]]);
    
    // Formatowanie
    baza.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#4a86e8').setFontColor('white');
    baza.setFrozenRows(1);
    
    // Szerokości kolumn
    baza.setColumnWidth(1, 80);   // ID
    baza.setColumnWidth(2, 80);   // TICKER
    baza.setColumnWidth(3, 120);  // DATA
    baza.setColumnWidth(4, 400);  // TYTUŁ
    baza.setColumnWidth(5, 300);  // ANALIZA
    baza.setColumnWidth(6, 120);  // SENTIMENT
    baza.setColumnWidth(7, 80);   // SCORE
    
    logSuccess('Utworzono arkusz NEWSY_BAZA');
  }
  
  return baza;
}

/**
 * Test połączenia z Gemini
 */
function TEST_GEMINI() {
  const apiKey = NEWS_CONFIG.GEMINI_KEY;
  
  if (!apiKey) {
    logError('Brak klucza GEMINI_KEY! Ustaw w: Plik → Ustawienia projektu → Właściwości skryptu');
    return;
  }
  
  logInfo('Testuję połączenie z Gemini...');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${NEWS_CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [{ text: 'Odpowiedz jednym słowem: Działa!' }]
    }]
  };
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      const text = result.candidates[0].content.parts[0].text;
      logSuccess(`Gemini działa! Odpowiedź: ${text}`);
    } else {
      logError(`Gemini error ${response.getResponseCode()}: ${response.getContentText().slice(0, 200)}`);
    }
    
  } catch (e) {
    logError(`Gemini test failed: ${e.message}`);
  }
}

/**
 * Test połączenia z Groq
 * Zdobądź klucz: https://console.groq.com/keys
 */
function TEST_GROQ() {
  const apiKey = NEWS_CONFIG.GROQ_KEY;
  
  if (!apiKey) {
    logError('Brak klucza GROQ_KEY!');
    logInfo('Zdobądź klucz na: https://console.groq.com/keys');
    logInfo('Ustaw w: Plik → Ustawienia projektu → Właściwości skryptu → GROQ_KEY');
    return;
  }
  
  logInfo('Testuję połączenie z Groq (Llama 3.3)...');
  
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const payload = {
    model: NEWS_CONFIG.GROQ_MODEL,
    messages: [
      { role: 'user', content: 'Odpowiedz jednym słowem: Działa!' }
    ],
    max_tokens: 50
  };
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      const text = result.choices[0].message.content;
      logSuccess(`Groq działa! Odpowiedź: ${text}`);
    } else {
      logError(`Groq error ${response.getResponseCode()}: ${response.getContentText().slice(0, 200)}`);
    }
    
  } catch (e) {
    logError(`Groq test failed: ${e.message}`);
  }
}

/**
 * Ustawia trigger dla newsów (opcjonalnie)
 */
function USTAW_TRIGGER_NEWSY_1H() {
  // Usuń istniejące
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'URUCHOM_SYSTEM_NEWSOW') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Nowy trigger co godzinę
  ScriptApp.newTrigger('URUCHOM_SYSTEM_NEWSOW')
    .timeBased()
    .everyHours(1)
    .create();
  
  logSuccess('Trigger newsów ustawiony: co 1 godzinę');
}
