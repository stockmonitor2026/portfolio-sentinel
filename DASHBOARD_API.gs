/**
 * ═══════════════════════════════════════════════════════════════
 * 🌐 DASHBOARD_API.gs - Web App API dla Dashboard HTML
 * ═══════════════════════════════════════════════════════════════
 * 
 * Endpoint: GET /exec?key=YOUR_API_KEY
 * Zwraca JSON z danymi portfela dla dashboard
 * 
 * DEPLOYMENT:
 * 1. Deploy → New deployment → Web app
 * 2. Execute as: Me
 * 3. Access: Anyone
 * 4. Skopiuj URL
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// 🔐 KONFIGURACJA
// ═══════════════════════════════════════════════════════════════

const DASHBOARD_API_CONFIG = {
  // Klucz API - pobierany z Script Properties (bezpieczniej)
  get API_KEY() {
    const key = PropertiesService.getScriptProperties().getProperty('DASHBOARD_API_KEY');
    if (!key) {
      // Fallback only if strictly necessary for development, but for production security we should fail.
      // throw new Error('DASHBOARD_API_KEY not set');
      return ''; // Return empty string to ensure authentication fails (unless request key is also empty, which !key check covers)
    }
    return key;
  },
  
  // Arkusze
  SHEET_PORTFEL: 'PORTFEL',
  SHEET_NEWSY: 'NEWSY_BAZA',
  SHEET_HISTORY: 'HISTORIA_WARTOSCI', // Nowy arkusz
  
  // Limity
  MAX_NEWS: 5,
  MAX_POSITIONS: 50
};

// ═══════════════════════════════════════════════════════════════
// 🌐 WEB APP ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * Główny endpoint GET - zwraca dane portfela jako JSON
 */
function doGet(e) {
  // 🔒 SECURITY CHECK
  if (!e.parameter.key || e.parameter.key !== DASHBOARD_API_CONFIG.API_KEY) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: true,
        message: 'Unauthorized: Invalid API Key',
        code: 403
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const data = getPortfolioData_();
    
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: true,
        message: error.message,
        code: 500
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint POST - czat z AI
 * Body: { "question": "pytanie użytkownika" }
 */
function doPost(e) {
  // 🔒 SECURITY CHECK
  if (!e.parameter.key || e.parameter.key !== DASHBOARD_API_CONFIG.API_KEY) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: true,
        message: 'Unauthorized: Invalid API Key',
        code: 403
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const body = JSON.parse(e.postData.contents);
    const question = body.question || '';
    
    if (!question || question.trim().length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({
          error: true,
          message: 'Brak pytania',
          code: 400
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Wywołaj asystenta AI
    const response = ZAPYTAJ_ASYSTENTA(question);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        response: response,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: true,
        message: error.message,
        code: 500
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 POBIERANIE DANYCH
// ═══════════════════════════════════════════════════════════════

/**
 * Agreguje wszystkie dane dla dashboard
 */
function getPortfolioData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  return {
    timestamp: new Date().toISOString(),
    summary: getPortfolioSummary_(ss),
    positions: getPositions_(ss),
    currencies: getCurrencyRates_(ss),
    news: getLatestNews_(ss),
    strategy: getStrategyBalance_(ss),
    history: getHistoryData_(ss) // NOWE
  };
}

/**
 * Podsumowanie portfela
 */
function getPortfolioSummary_(ss) {
  const sheet = ss.getSheetByName(DASHBOARD_API_CONFIG.SHEET_PORTFEL);
  if (!sheet || sheet.getLastRow() < 2) {
    return { totalValue: 0, totalProfit: 0, profitPercent: 0, positionCount: 0 };
  }
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  
  let totalValue = 0;
  let totalCost = 0;
  let positionCount = 0;
  
  for (const row of data) {
    const ticker = row[1];
    const ilosc = parseFloat(row[4]) || 0;
    const koszt = parseFloat(row[7]) || 0;  // KOSZT_PLN
    const wartosc = parseFloat(row[9]) || 0; // WARTOSC_PLN
    
    if (!ticker || ticker === 'TICKER' || ilosc <= 0) continue;
    
    totalValue += wartosc;
    totalCost += koszt;
    positionCount++;
  }
  
  const totalProfit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? (totalProfit / totalCost * 100) : 0;
  
  return {
    totalValue: Math.round(totalValue),
    totalCost: Math.round(totalCost),
    totalProfit: Math.round(totalProfit),
    profitPercent: parseFloat(profitPercent.toFixed(2)),
    positionCount: positionCount
  };
}

/**
 * Lista pozycji
 */
function getPositions_(ss) {
  const sheet = ss.getSheetByName(DASHBOARD_API_CONFIG.SHEET_PORTFEL);
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  const data = sheet.getRange(2, 1, Math.min(sheet.getLastRow() - 1, DASHBOARD_API_CONFIG.MAX_POSITIONS), 13).getValues();
  const positions = [];
  
  for (const row of data) {
    const ticker = row[1];
    const ilosc = parseFloat(row[4]) || 0;
    
    if (!ticker || ticker === 'TICKER' || ilosc <= 0) continue;
    
    const typ = row[2];
    const waluta = row[3];
    const cenaZakupu = parseFloat(row[5]) || 0;
    const cenaAktualna = parseFloat(row[8]) || 0;
    const wartoscPLN = parseFloat(row[9]) || 0;
    const zyskTotal = parseFloat(row[10]) || 0;
    const wynikAkcji = parseFloat(row[11]) || 0;
    const wplywFX = parseFloat(row[12]) || 0;
    
    const koszt = parseFloat(row[7]) || 0;
    const zyskPct = koszt > 0 ? (zyskTotal / koszt * 100) : 0;
    
    positions.push({
      ticker: ticker,
      type: typ,
      currency: waluta,
      quantity: ilosc,
      avgPrice: parseFloat(cenaZakupu.toFixed(2)),
      currentPrice: parseFloat(cenaAktualna.toFixed(2)),
      valuePLN: Math.round(wartoscPLN),
      profitPLN: Math.round(zyskTotal),
      profitPercent: parseFloat(zyskPct.toFixed(2)),
      stockResult: Math.round(wynikAkcji),
      fxImpact: Math.round(wplywFX)
    });
  }
  
  // Sortuj po wartości malejąco
  positions.sort((a, b) => b.valuePLN - a.valuePLN);
  
  return positions;
}

/**
 * Aktualne kursy walut
 */
function getCurrencyRates_(ss) {
  const sheet = ss.getSheetByName(DASHBOARD_API_CONFIG.SHEET_PORTFEL);
  if (!sheet) return { USDPLN: 4.05, EURPLN: 4.25 };
  
  try {
    // ZMIANA (18.01.2026): N1=EUR, N2=USD (według zgłoszenia użytkownika)
    const eurpln = parseFloat(sheet.getRange('N1').getValue()) || 4.25;
    const usdpln = parseFloat(sheet.getRange('N2').getValue()) || 4.05;
    
    // Walidacja - kurs powinien być między 1 a 10
    if (usdpln < 1 || usdpln > 10) {
      return { USDPLN: 4.05, EURPLN: 4.25 };
    }
    
    return {
      USDPLN: parseFloat(usdpln.toFixed(4)),
      EURPLN: parseFloat(eurpln.toFixed(4))
    };
  } catch (e) {
    return { USDPLN: 4.05, EURPLN: 4.25 };
  }
}

/**
 * Pobiera rzeczywiste kursy walut z arkusza Waluty
 */
function getRealCurrencyRates_() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Szukamy funkcji GOOGLEFINANCE lub wartości w arkuszu
    const portfolioSheet = ss.getSheetByName('PORTFEL');
    if (!portfolioSheet) return { USDPLN: 4.05, EURPLN: 4.25 };
    
    // Typowo kursy są gdzieś w nagłówku lub osobnym arkuszu
    // Spróbujmy znaleźć
    const formulas = portfolioSheet.getRange(1, 1, 1, 20).getFormulas()[0];
    
    let usdpln = 4.05;
    let eurpln = 4.25;
    
    // Szukamy komórki z GOOGLEFINANCE("CURRENCY:USDPLN")
    for (let i = 0; i < formulas.length; i++) {
      if (formulas[i].includes('USDPLN')) {
        usdpln = parseFloat(portfolioSheet.getRange(1, i + 1).getValue()) || 4.05;
      }
      if (formulas[i].includes('EURPLN')) {
        eurpln = parseFloat(portfolioSheet.getRange(1, i + 1).getValue()) || 4.25;
      }
    }
    
    return {
      USDPLN: parseFloat(usdpln.toFixed(4)),
      EURPLN: parseFloat(eurpln.toFixed(4))
    };
  } catch (e) {
    return { USDPLN: 4.05, EURPLN: 4.25 };
  }
}

/**
 * Ostatnie newsy
 */
function getLatestNews_(ss) {
  const sheet = ss.getSheetByName(DASHBOARD_API_CONFIG.SHEET_NEWSY);
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  const lastRow = sheet.getLastRow();
  const startRow = Math.max(2, lastRow - DASHBOARD_API_CONFIG.MAX_NEWS + 1);
  const numRows = lastRow - startRow + 1;
  
  const data = sheet.getRange(startRow, 1, numRows, 7).getValues();
  const news = [];
  
  for (const row of data) {
    const ticker = row[1];
    const date = row[2];
    const title = row[3];
    const analysis = row[4];
    const sentiment = row[5];
    const score = parseFloat(row[6]) || 5;
    
    if (!ticker || !title) continue;
    
    news.push({
      ticker: ticker,
      date: date instanceof Date ? date.toISOString().split('T')[0] : String(date),
      title: String(title).substring(0, 100),
      analysis: String(analysis).substring(0, 200),
      sentiment: sentiment,
      score: score
    });
  }
  
  // Najnowsze na górze
  news.reverse();
  
  return news;
}

/**
 * Balans Core/Satellites
 */
function getStrategyBalance_(ss) {
  const positions = getPositions_(ss);
  
  const coreTypes = ['ETF', 'SKARB', 'REIT'];
  const satelliteTypes = ['AKCJA', 'KRYPTO', 'KASYNO'];
  
  let coreValue = 0;
  let satellitesValue = 0;
  
  for (const pos of positions) {
    if (coreTypes.includes(pos.type)) {
      coreValue += pos.valuePLN;
    } else if (satelliteTypes.includes(pos.type)) {
      satellitesValue += pos.valuePLN;
    }
  }
  
  const total = coreValue + satellitesValue;
  
  return {
    coreValue: Math.round(coreValue),
    satellitesValue: Math.round(satellitesValue),
    corePercent: total > 0 ? parseFloat((coreValue / total * 100).toFixed(1)) : 0,
    satellitesPercent: total > 0 ? parseFloat((satellitesValue / total * 100).toFixed(1)) : 0,
    targetCore: 75,
    targetSatellites: 25
  };
}

// ═══════════════════════════════════════════════════════════════
// 🧪 TEST
// ═══════════════════════════════════════════════════════════════

/**
 * Test API lokalnie
 */
function TEST_DASHBOARD_API() {
  const data = getPortfolioData_();
  console.log('=== DASHBOARD API TEST ===');
  console.log('Summary:', JSON.stringify(data.summary, null, 2));
  console.log('Positions count:', data.positions.length);
  console.log('First position:', data.positions[0]);
  console.log('Currencies:', data.currencies);
  console.log('Strategy:', data.strategy);
  console.log('News count:', data.news.length);
  return data;
}

/**
 * Generuje URL do wklejenia w dashboard
 */
function GET_API_URL() {
  const scriptUrl = ScriptApp.getService().getUrl();
  const fullUrl = scriptUrl + '?key=' + DASHBOARD_API_CONFIG.API_KEY;
  
  console.log('=== DASHBOARD API URL ===');
  console.log('Base URL:', scriptUrl);
  console.log('Full URL with key:', fullUrl);
  console.log('\nWklej ten URL do dashboard/index.html w zmiennej API_URL');
  
  return fullUrl;
}

// ═══════════════════════════════════════════════════════════════
// 📜 HISTORIA WARTOŚCI
// ═══════════════════════════════════════════════════════════════

/**
 * Pobiera historię wartości portfela
 */
function getHistoryData_(ss) {
  const sheet = ss.getSheetByName(DASHBOARD_API_CONFIG.SHEET_HISTORY);
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  // Pobierz ostatnie 30 wpisów
  const lastRow = sheet.getLastRow();
  const startRow = Math.max(2, lastRow - 29);
  const numRows = lastRow - startRow + 1;
  
  // Jeśli brak danych
  if (numRows < 1) return [];

  const data = sheet.getRange(startRow, 1, numRows, 3).getValues();
  
  // Format: [Data, Wartość, Zysk]
  return data.map(row => ({
    date: row[0],
    value: parseFloat(row[1]) || 0,
    profit: parseFloat(row[2]) || 0
  }));
}

/**
 * 💾 TRIGGER: Zapisuje codzienną historię
 * Ustaw trigger czasowy (np. codziennie 23:00) na tę funkcję
 */
function saveDailyHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DASHBOARD_API_CONFIG.SHEET_HISTORY);
  
  // Jeśli brak arkusza - utwórz
  if (!sheet) {
    sheet = ss.insertSheet(DASHBOARD_API_CONFIG.SHEET_HISTORY);
    sheet.getRange(1, 1, 1, 3).setValues([['Data', 'Wartość', 'Zysk Total']]);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#263238').setFontColor('white');
  }
  
  // Pobierz aktualne dane
  const summary = getPortfolioSummary_(ss);
  
  const today = new Date();
  const value = summary.totalValue || 0;
  const profit = summary.totalProfit || 0;
  
  // Sprawdź czy już jest wpis z dzisiaj (żeby nie dublować)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const lastDateVal = sheet.getRange(lastRow, 1).getValue();
    const lastDate = new Date(lastDateVal);
    
    // Porównaj daty (dzień, miesiąc, rok)
    if (lastDate.getDate() === today.getDate() && 
        lastDate.getMonth() === today.getMonth() && 
        lastDate.getFullYear() === today.getFullYear()) {
      
      // Aktualizuj dzisiejszy wpis
      sheet.getRange(lastRow, 2, 1, 2).setValues([[value, profit]]);
      console.log('Zaktualizowano historię z dzisiaj.');
      return;
    }
  }
  
  // Dodaj nowy wpis
  sheet.appendRow([today, value, profit]);
  console.log('Dodano nowy wpis do historii.');
}
