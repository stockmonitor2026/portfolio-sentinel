/**
 * ═══════════════════════════════════════════════════════════════
 * 📱 APPSHEET_MODUL.gs - Dane dla AppSheet Dashboard
 * ═══════════════════════════════════════════════════════════════
 * 
 * OPTYMALIZACJA DLA APPSHEET:
 * - Nazwy kolumn bez polskich znaków
 * - Kolumny _Color dla automatycznych kolorów
 * - _RowKey jako unikalny identyfikator
 * - Prawidłowe typy danych
 * 
 * INSTRUKCJA:
 * 1. Uruchom UTWORZ_ARKUSZ_APPSHEET() aby stworzyć strukturę
 * 2. Uruchom AKTUALIZUJ_APPSHEET() aby odświeżyć dane
 * 3. W Sheets: Rozszerzenia → AppSheet → Utwórz aplikację
 */

// ═══════════════════════════════════════════════════════════════
// 📋 KONFIGURACJA
// ═══════════════════════════════════════════════════════════════

const APPSHEET_CONFIG = {
  // Arkusze źródłowe
  SHEET_PORTFEL: 'PORTFEL',
  SHEET_NEWSY: 'NEWSY_BAZA',
  SHEET_HISTORIA: 'SENTINEL_HISTORIA',
  SHEET_KALENDARZ_DIV: 'KALENDARZ_DIV',
  
  // Arkusze AppSheet (zoptymalizowane)
  SHEET_DASHBOARD: 'APP_Dashboard',
  SHEET_POSITIONS: 'APP_Positions',
  SHEET_ALERTS: 'APP_Alerts',
  SHEET_NEWS: 'APP_News',
  SHEET_DIVIDENDS: 'APP_Dividends',
  
  // Limity
  MAX_NEWS: 15,
  MAX_ALERTS: 20,
  MAX_DIVIDENDS: 20
};

// ═══════════════════════════════════════════════════════════════
// 🎯 GŁÓWNE FUNKCJE
// ═══════════════════════════════════════════════════════════════

/**
 * 📱 Tworzy wszystkie arkusze zoptymalizowane dla AppSheet
 */
function UTWORZ_ARKUSZ_APPSHEET() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('📱 APPSHEET SETUP - Tworzę zoptymalizowaną strukturę...');
  
  // 1. Dashboard - metryki
  createDashboardSheet_(ss);
  
  // 2. Positions - pozycje portfela
  createPositionsSheet_(ss);
  
  // 3. Alerts - powiadomienia
  createAlertsSheet_(ss);
  
  // 4. News - top newsy
  createNewsSheet_(ss);
  
  // 5. Dividends - kalendarz dywidend
  createDividendsSheet_(ss);
  
  logSuccess('📱 Wszystkie arkusze AppSheet utworzone!');
  logInfo('Teraz uruchom AKTUALIZUJ_APPSHEET() aby wypełnić dane.');
  logInfo('Następnie: Rozszerzenia → AppSheet → Utwórz aplikację');
  logInfo('═══════════════════════════════════════════════════════');
}

/**
 * 🔄 Aktualizuje wszystkie dane dla AppSheet
 */
function AKTUALIZUJ_APPSHEET() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  logInfo('📱 APPSHEET - Aktualizacja danych...');
  
  updateDashboard_(ss);
  updatePositions_(ss);
  updateAlerts_(ss);
  updateNews_(ss);
  updateDividends_(ss);
  
  logSuccess('📱 Dane AppSheet zaktualizowane!');
}

// ═══════════════════════════════════════════════════════════════
// 📊 TWORZENIE ARKUSZY (AppSheet-optimized)
// ═══════════════════════════════════════════════════════════════

function createDashboardSheet_(ss) {
  let sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_DASHBOARD);
  
  if (!sheet) {
    sheet = ss.insertSheet(APPSHEET_CONFIG.SHEET_DASHBOARD);
    
    // AppSheet-friendly headers
    const headers = ['_RowKey', 'Metric', 'Value', 'Icon', '_Color'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    sheet.setFrozenRows(1);
    
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 300);
    sheet.setColumnWidth(4, 60);
    sheet.setColumnWidth(5, 100);
    
    logSuccess('Utworzono APP_Dashboard');
  }
  return sheet;
}

function createPositionsSheet_(ss) {
  let sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_POSITIONS);
  
  if (!sheet) {
    sheet = ss.insertSheet(APPSHEET_CONFIG.SHEET_POSITIONS);
    
    // Kolumny zoptymalizowane dla AppSheet
    const headers = [
      '_RowKey', 'Ticker', 'Type', 'Currency', 
      'Shares', 'AvgPrice', 'CurrentPrice', 'Value',
      'Profit', 'ProfitPct', 'Status', '_Color'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#34a853').setFontColor('white');
    sheet.setFrozenRows(1);
    
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 80);
    sheet.setColumnWidth(3, 70);
    sheet.setColumnWidth(4, 60);
    sheet.setColumnWidth(5, 70);
    sheet.setColumnWidth(6, 90);
    sheet.setColumnWidth(7, 90);
    sheet.setColumnWidth(8, 100);
    sheet.setColumnWidth(9, 100);
    sheet.setColumnWidth(10, 80);
    sheet.setColumnWidth(11, 80);
    sheet.setColumnWidth(12, 80);
    
    logSuccess('Utworzono APP_Positions');
  }
  return sheet;
}

function createAlertsSheet_(ss) {
  let sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_ALERTS);
  
  if (!sheet) {
    sheet = ss.insertSheet(APPSHEET_CONFIG.SHEET_ALERTS);
    
    const headers = ['_RowKey', 'Date', 'Type', 'Ticker', 'Message', 'Priority', '_Color'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#ea4335').setFontColor('white');
    sheet.setFrozenRows(1);
    
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 80);
    sheet.setColumnWidth(5, 350);
    sheet.setColumnWidth(6, 80);
    sheet.setColumnWidth(7, 80);
    
    logSuccess('Utworzono APP_Alerts');
  }
  return sheet;
}

function createNewsSheet_(ss) {
  let sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_NEWS);
  
  if (!sheet) {
    sheet = ss.insertSheet(APPSHEET_CONFIG.SHEET_NEWS);
    
    const headers = ['_RowKey', 'Ticker', 'Date', 'Title', 'Score', 'Sentiment', 'Analysis', '_Color'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fbbc05').setFontColor('white');
    sheet.setFrozenRows(1);
    
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 80);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 300);
    sheet.setColumnWidth(5, 60);
    sheet.setColumnWidth(6, 100);
    sheet.setColumnWidth(7, 250);
    sheet.setColumnWidth(8, 80);
    
    logSuccess('Utworzono APP_News');
  }
  return sheet;
}

function createDividendsSheet_(ss) {
  let sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_DIVIDENDS);
  
  if (!sheet) {
    sheet = ss.insertSheet(APPSHEET_CONFIG.SHEET_DIVIDENDS);
    
    const headers = ['_RowKey', 'Ticker', 'ExDate', 'PayDate', 'Amount', 'Yield', 'DaysLeft', 'Status', '_Color'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#ff9800').setFontColor('white');
    sheet.setFrozenRows(1);
    
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 80);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 80);
    sheet.setColumnWidth(6, 60);
    sheet.setColumnWidth(7, 80);
    sheet.setColumnWidth(8, 100);
    sheet.setColumnWidth(9, 80);
    
    logSuccess('Utworzono APP_Dividends');
  }
  return sheet;
}

// ═══════════════════════════════════════════════════════════════
// 📈 AKTUALIZACJA DANYCH (z kolorami dla AppSheet)
// ═══════════════════════════════════════════════════════════════

function updateDashboard_(ss) {
  const sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_DASHBOARD);
  if (!sheet) return;
  
  const portfel = ss.getSheetByName(APPSHEET_CONFIG.SHEET_PORTFEL);
  if (!portfel || portfel.getLastRow() < 2) return;
  
  // Zbierz dane portfela
  const data = portfel.getRange(2, 1, portfel.getLastRow() - 1, 13).getValues();
  
  let totalValue = 0, totalProfit = 0, coreValue = 0, satValue = 0;
  let positions = [];
  
  for (const row of data) {
    const ticker = row[1];
    const typ = row[2];
    const wartosc = parseFloat(row[9]) || 0;
    const zysk = parseFloat(row[10]) || 0;
    
    if (ticker && ticker !== 'TICKER' && wartosc > 0) {
      totalValue += wartosc;
      totalProfit += zysk;
      positions.push({ ticker, zysk });
      
      if (['ETF', 'SKARB', 'REIT', 'BANK_DIV'].includes(typ)) {
        coreValue += wartosc;
      } else if (['AKCJA', 'KRYPTO'].includes(typ)) {
        satValue += wartosc;
      }
    }
  }
  
  const profitPct = totalValue > 0 ? (totalProfit / (totalValue - totalProfit) * 100) : 0;
  const corePct = totalValue > 0 ? (coreValue / totalValue * 100) : 0;
  const satPct = totalValue > 0 ? (satValue / totalValue * 100) : 0;
  
  positions.sort((a, b) => b.zysk - a.zysk);
  const best = positions[0] ? positions[0].ticker : 'N/A';
  const worst = positions[positions.length - 1] ? positions[positions.length - 1].ticker : 'N/A';
  
  // Dane z kolorami
  const metrics = [
    ['DASH-1', 'Portfolio Value', `${totalValue.toFixed(0)} PLN`, '💼', '#4285f4'],
    ['DASH-2', 'Total Profit/Loss', `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(0)} PLN (${profitPct.toFixed(1)}%)`, totalProfit >= 0 ? '📈' : '📉', totalProfit >= 0 ? '#34a853' : '#ea4335'],
    ['DASH-3', 'CORE %', `${corePct.toFixed(1)}% (target: 70%)`, '🎯', corePct >= 65 ? '#34a853' : '#fbbc05'],
    ['DASH-4', 'SATELLITES %', `${satPct.toFixed(1)}% (target: 25%)`, '🚀', satPct <= 30 ? '#34a853' : '#fbbc05'],
    ['DASH-5', 'Positions', positions.length, '📝', '#4285f4'],
    ['DASH-6', 'Best Performer', best, '💚', '#34a853'],
    ['DASH-7', 'Worst Performer', worst, '❤️', '#ea4335'],
    ['DASH-8', 'Last Update', new Date().toLocaleString('pl-PL'), '🕐', '#9e9e9e']
  ];
  
  // Wyczyść i zapisz
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).clearContent();
  }
  sheet.getRange(2, 1, metrics.length, 5).setValues(metrics);
}

function updatePositions_(ss) {
  const sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_POSITIONS);
  const portfel = ss.getSheetByName(APPSHEET_CONFIG.SHEET_PORTFEL);
  
  if (!sheet || !portfel || portfel.getLastRow() < 2) return;
  
  // Wyczyść
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).clearContent();
  }
  
  const data = portfel.getRange(2, 1, portfel.getLastRow() - 1, 13).getValues();
  const rows = [];
  
  for (const row of data) {
    const id = row[0];
    const ticker = row[1];
    const typ = row[2];
    const waluta = row[3];
    const ilosc = parseFloat(row[4]) || 0;
    const cenaAvg = parseFloat(row[5]) || 0;
    const cenaCurrent = parseFloat(row[8]) || 0;
    const wartosc = parseFloat(row[9]) || 0;
    const zysk = parseFloat(row[10]) || 0;
    
    if (!ticker || ticker === 'TICKER' || ilosc <= 0) continue;
    
    const zyskPct = wartosc > 0 && (wartosc - zysk) > 0 ? (zysk / (wartosc - zysk) * 100) : 0;
    
    let status = 'NEUTRAL';
    let color = '#9e9e9e';
    
    if (zyskPct > 10) {
      status = 'PROFIT';
      color = '#34a853';
    } else if (zyskPct > 0) {
      status = 'GAIN';
      color = '#8bc34a';
    } else if (zyskPct > -10) {
      status = 'LOSS';
      color = '#ff9800';
    } else {
      status = 'DOWN';
      color = '#ea4335';
    }
    
    rows.push([
      id || `POS-${ticker}`,
      ticker,
      typ,
      waluta,
      ilosc,
      cenaAvg.toFixed(2),
      cenaCurrent.toFixed(2),
      wartosc.toFixed(0),
      zysk.toFixed(0),
      `${zyskPct >= 0 ? '+' : ''}${zyskPct.toFixed(1)}%`,
      status,
      color
    ]);
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 12).setValues(rows);
  }
}

function updateAlerts_(ss) {
  const sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_ALERTS);
  if (!sheet) return;
  
  // Wyczyść
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).clearContent();
  }
  
  const alerts = [];
  
  // 1. Sprawdź proporcje Core/Satellites
  const portfel = ss.getSheetByName(APPSHEET_CONFIG.SHEET_PORTFEL);
  if (portfel && portfel.getLastRow() > 1) {
    const data = portfel.getRange(2, 1, portfel.getLastRow() - 1, 13).getValues();
    
    let totalValue = 0, coreValue = 0;
    
    for (const row of data) {
      const typ = row[2];
      const wartosc = parseFloat(row[9]) || 0;
      
      if (wartosc > 0) {
        totalValue += wartosc;
        if (['ETF', 'SKARB', 'REIT', 'BANK_DIV'].includes(typ)) {
          coreValue += wartosc;
        }
      }
    }
    
    if (totalValue > 0) {
      const corePct = (coreValue / totalValue) * 100;
      
      if (corePct < 55) {
        alerts.push([
          `ALERT-CORE-${Date.now()}`,
          new Date(),
          'CRITICAL',
          'PORTFOLIO',
          `CORE only ${corePct.toFixed(1)}%! Target: 70%. Rebalancing needed.`,
          1,
          '#ea4335'
        ]);
      } else if (corePct < 65) {
        alerts.push([
          `ALERT-CORE-${Date.now()}`,
          new Date(),
          'WARNING',
          'PORTFOLIO',
          `CORE at ${corePct.toFixed(1)}%. Consider increasing to 70%.`,
          2,
          '#ff9800'
        ]);
      }
    }
  }
  
  // 2. Sprawdź krytyczne newsy
  const newsy = ss.getSheetByName(APPSHEET_CONFIG.SHEET_NEWSY);
  if (newsy && newsy.getLastRow() > 1) {
    const newsData = newsy.getRange(2, 1, Math.min(newsy.getLastRow() - 1, 50), 7).getValues();
    
    for (const row of newsData) {
      const newsDate = new Date(row[2]);
      const daysSince = (new Date() - newsDate) / (1000 * 60 * 60 * 24);
      
      if (daysSince > 2) continue;
      
      const scoreRaw = row[6] ? row[6].toString() : '0';
      const scoreMatch = scoreRaw.match(/(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
      
      if (score >= 9) {
        alerts.push([
          row[0] || `ALERT-NEWS-${Date.now()}`,
          row[2],
          score === 10 ? 'CRITICAL' : 'IMPORTANT',
          row[1],
          row[3].slice(0, 100),
          score === 10 ? 1 : 2,
          score === 10 ? '#ea4335' : '#ff9800'
        ]);
      }
    }
  }
  
  // 3. Sprawdź nadchodzące dywidendy (z KALENDARZ_DIV)
  const kalendarz = ss.getSheetByName(APPSHEET_CONFIG.SHEET_KALENDARZ_DIV);
  if (kalendarz && kalendarz.getLastRow() > 1) {
    const divData = kalendarz.getRange(2, 1, kalendarz.getLastRow() - 1, 6).getValues();
    const now = new Date();
    
    for (const row of divData) {
      const ticker = row[0];
      const exDate = new Date(row[1]);
      const daysLeft = Math.ceil((exDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft >= 0 && daysLeft <= 7) {
        alerts.push([
          `ALERT-DIV-${ticker}-${exDate.toISOString().split('T')[0]}`,
          new Date(),
          daysLeft <= 3 ? 'URGENT' : 'INFO',
          ticker,
          `Ex-dividend in ${daysLeft} days (${exDate.toLocaleDateString('pl-PL')})`,
          daysLeft <= 3 ? 1 : 3,
          daysLeft <= 3 ? '#ea4335' : '#4285f4'
        ]);
      }
    }
  }
  
  // Sortuj po priorytecie
  alerts.sort((a, b) => a[5] - b[5]);
  
  const limited = alerts.slice(0, APPSHEET_CONFIG.MAX_ALERTS);
  if (limited.length > 0) {
    sheet.getRange(2, 1, limited.length, 7).setValues(limited);
  }
}

function updateNews_(ss) {
  const sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_NEWS);
  const newsy = ss.getSheetByName(APPSHEET_CONFIG.SHEET_NEWSY);
  
  if (!sheet || !newsy || newsy.getLastRow() < 2) return;
  
  // Wyczyść
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).clearContent();
  }
  
  const data = newsy.getRange(2, 1, newsy.getLastRow() - 1, 7).getValues();
  
  // Wyciągnij score i posortuj
  const scored = data.map(row => {
    const scoreRaw = row[6] ? row[6].toString() : '0';
    const scoreMatch = scoreRaw.match(/(\d+)/);
    return {
      row: row,
      score: scoreMatch ? parseInt(scoreMatch[1]) : 0
    };
  }).filter(item => item.score >= 5);
  
  scored.sort((a, b) => b.score - a.score);
  
  const rows = scored.slice(0, APPSHEET_CONFIG.MAX_NEWS).map(item => {
    const row = item.row;
    const score = item.score;
    
    let color = '#9e9e9e';
    if (score >= 9) color = '#ea4335';
    else if (score >= 7) color = '#ff9800';
    else if (score >= 5) color = '#4285f4';
    
    const sentiment = row[5] ? row[5].toString() : '';
    let sentimentClean = 'NEUTRAL';
    if (sentiment.includes('POZYTYWNY') || sentiment.includes('POSITIVE')) sentimentClean = 'POSITIVE';
    else if (sentiment.includes('NEGATYWNY') || sentiment.includes('NEGATIVE')) sentimentClean = 'NEGATIVE';
    
    return [
      row[0] || `NEWS-${Date.now()}`,
      row[1],
      row[2],
      row[3],
      score,
      sentimentClean,
      row[4] || '',
      color
    ];
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
}

function updateDividends_(ss) {
  const sheet = ss.getSheetByName(APPSHEET_CONFIG.SHEET_DIVIDENDS);
  const kalendarz = ss.getSheetByName(APPSHEET_CONFIG.SHEET_KALENDARZ_DIV);
  
  if (!sheet) {
    createDividendsSheet_(ss);
    return;
  }
  
  // Wyczyść
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).clearContent();
  }
  
  if (!kalendarz || kalendarz.getLastRow() < 2) return;
  
  const data = kalendarz.getRange(2, 1, kalendarz.getLastRow() - 1, 6).getValues();
  const now = new Date();
  const rows = [];
  
  for (const row of data) {
    const ticker = row[0];
    const exDate = new Date(row[1]);
    const payDate = row[2] ? new Date(row[2]) : null;
    const amount = row[3] || 0;
    const yieldPct = row[4] || 0;
    
    const daysLeft = Math.ceil((exDate - now) / (1000 * 60 * 60 * 24));
    
    // Tylko nadchodzące lub minęły max 7 dni temu
    if (daysLeft < -7) continue;
    
    let status = 'UPCOMING';
    let color = '#34a853';
    
    if (daysLeft < 0) {
      status = 'PASSED';
      color = '#9e9e9e';
    } else if (daysLeft <= 3) {
      status = 'URGENT';
      color = '#ea4335';
    } else if (daysLeft <= 7) {
      status = 'SOON';
      color = '#ff9800';
    }
    
    rows.push([
      `DIV-${ticker}-${exDate.toISOString().split('T')[0]}`,
      ticker,
      exDate,
      payDate,
      amount,
      `${yieldPct}%`,
      daysLeft,
      status,
      color
    ]);
  }
  
  // Sortuj po dacie
  rows.sort((a, b) => new Date(a[2]) - new Date(b[2]));
  
  const limited = rows.slice(0, APPSHEET_CONFIG.MAX_DIVIDENDS);
  if (limited.length > 0) {
    sheet.getRange(2, 1, limited.length, 9).setValues(limited);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧪 TEST
// ═══════════════════════════════════════════════════════════════

/**
 * Test modułu AppSheet
 */
function TEST_APPSHEET() {
  logInfo('═══════════════════════════════════════════════════════');
  logInfo('📱 TEST APPSHEET - Start');
  
  UTWORZ_ARKUSZ_APPSHEET();
  AKTUALIZUJ_APPSHEET();
  
  logSuccess('📱 TEST ZAKOŃCZONY');
  logInfo('Sprawdź arkusze APP_* i uruchom Rozszerzenia → AppSheet → Utwórz aplikację');
  logInfo('═══════════════════════════════════════════════════════');
}
