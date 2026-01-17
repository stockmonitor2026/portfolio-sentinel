/**
 * ═══════════════════════════════════════════════════════════════
 * 🔍 SMART_TICKER.gs - Inteligentne wyszukiwanie tickerów
 * ═══════════════════════════════════════════════════════════════
 * 
 * Funkcje:
 * - Wyszukiwanie tickera na wielu giełdach
 * - Automatyczny fallback między rynkami
 * - Obsługa różnych walut (USD, EUR, PLN, GBP)
 */

/**
 * Pobiera mapowanie sufiksów giełdowych
 * (funkcja zamiast const, aby uniknąć konfliktu nazw w Apps Script)
 */
function getExchangeSuffixes_() {
  return {
    'USD': ['', '.US'],           // US markets (default, NASDAQ, NYSE)
    'EUR': ['.DE', '.F', '.PA'],  // Germany (Xetra, Frankfurt), France (Paris)
    'PLN': ['.WA'],               // Warsaw Stock Exchange
    'GBP': ['.L', '.IL']          // London, London International
  };
}

/**
 * Pobiera kolejność przeszukiwania giełd
 */
function getMarketPriority_() {
  return ['USD', 'EUR', 'GBP', 'PLN'];
}

/**
 * Znajduje cenę tickera, przeszukując różne giełdy
 * @param {string} ticker - Symbol akcji (np. AAPL, VUAA)
 * @param {string} preferredCurrency - Preferowana waluta (USD, EUR, PLN)
 * @param {Cache} cache - Google Cache Service
 * @returns {Object} { price: number, foundOn: string, suffix: string }
 */
function findTickerPrice(ticker, preferredCurrency, cache) {
  if (!ticker) return { price: 0, foundOn: null, suffix: '' };
  
  ticker = ticker.toString().toUpperCase().trim();
  preferredCurrency = (preferredCurrency || 'USD').toString().toUpperCase();
  
  const cacheKey = `PRICE_${ticker}_${preferredCurrency}`;
  
  // Sprawdź cache
  const cached = cache.get(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    logInfo(`Cache hit: ${ticker} = ${data.price}`);
    return data;
  }
  
  // Utwórz kolejność przeszukiwania (preferowana waluta pierwsza)
  const marketPriority = getMarketPriority_();
  const exchangeSuffixes = getExchangeSuffixes_();
  const searchOrder = [preferredCurrency, ...marketPriority.filter(c => c !== preferredCurrency)];
  
  for (const currency of searchOrder) {
    const suffixes = exchangeSuffixes[currency] || [''];
    
    for (const suffix of suffixes) {
      const symbol = ticker + suffix;
      
      // Próbuj Finnhub
      let price = fetchPriceFromFinnhub(symbol);
      
      // Fallback: Yahoo
      if (!price || price <= 0) {
        price = fetchPriceFromYahoo(symbol);
      }
      
      if (price && price > 0) {
        const result = { price, foundOn: currency, suffix };
        
        // Zapisz do cache
        cache.put(cacheKey, JSON.stringify(result), CONFIG.CACHE_PRICES_TTL);
        
        logSuccess(`Znaleziono: ${symbol} = ${price} (${currency})`);
        return result;
      }
      
      // Rate limiting
      Utilities.sleep(CONFIG.API_DELAY_MS);
    }
  }
  
  logError(`Nie znaleziono ceny dla: ${ticker}`);
  return { price: 0, foundOn: null, suffix: '' };
}

/**
 * Pobiera cenę z Finnhub
 */
function fetchPriceFromFinnhub(symbol) {
  const apiKey = CONFIG.FINNHUB_KEY;
  if (!apiKey) return 0;
  
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      
      // Finnhub zwraca 'c' dla current price
      if (json.c && json.c > 0) {
        return json.c;
      }
    }
  } catch (e) {
    logError(`Finnhub error (${symbol}): ${e.message}`);
  }
  
  return 0;
}

/**
 * Pobiera cenę z Yahoo Finance
 */
function fetchPriceFromYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      
      if (json.chart && json.chart.result && json.chart.result[0]) {
        return json.chart.result[0].meta.regularMarketPrice;
      }
    }
  } catch (e) {
    logError(`Yahoo error (${symbol}): ${e.message}`);
  }
  
  return 0;
}

/**
 * Custom function: Inteligentne pobieranie ceny
 * Użycie: =SMART_CENA("VUAA"; "EUR")
 * @customfunction
 */
function SMART_CENA(ticker, waluta) {
  if (!ticker) return 'BŁĄD: Podaj ticker';
  
  const cache = CacheService.getScriptCache();
  const result = findTickerPrice(ticker, waluta, cache);
  
  if (result.price > 0) {
    return result.price;
  }
  
  return 'NIE ZNALEZIONO';
}

/**
 * Custom function: Sprawdź gdzie znaleziono ticker
 * @customfunction
 */
function SMART_CENA_INFO(ticker, waluta) {
  if (!ticker) return 'BŁĄD';
  
  const cache = CacheService.getScriptCache();
  const result = findTickerPrice(ticker, waluta, cache);
  
  if (result.price > 0) {
    return `${result.price} (${result.foundOn}${result.suffix})`;
  }
  
  return 'NIE ZNALEZIONO';
}
