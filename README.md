# 📊 Portfolio Monitor - Kompletna Dokumentacja

## 🎯 Co to jest?

System do śledzenia portfela inwestycyjnego zbudowany na Google Sheets + Apps Script.
Składa się z AI asystenta (SENTINEL), automatycznych aktualizacji cen, analizy newsów i trackera dywidend.

---

## 📁 Struktura Plików

| Plik | Opis | Wymagany? |
|------|------|-----------|
| `PORTFEL_KOMPLETNY.gs` | Główny moduł: ceny, waluty, formuły | ✅ TAK |
| `NEWSY_MODUL.gs` | Analiza newsów z AI | ✅ TAK |
| `ASYSTENT_MODUL.gs` | SENTINEL - AI asystent | ✅ TAK |
| `DYWIDENDY_MODUL.gs` | Tracker dywidend | Opcjonalny |

---

## 🔑 Klucze API - Wyjaśnienie

### Wymagane klucze:

| Klucz | Do czego | Gdzie zdobyć | Darmowy limit |
|-------|----------|--------------|---------------|
| `FINNHUB_KEY` | Ceny akcji | https://finnhub.io | 60 req/min |
| `GROQ_KEY` | AI (newsy, SENTINEL) | https://console.groq.com/keys | 14,400/dzień |
| `GOOGLE_SEARCH_KEY` | Web search | Google Cloud Console | 100/dzień |
| `GOOGLE_SEARCH_CX` | Search Engine ID | programmablesearchengine.google.com | - |

### Jak dodać klucze:
1. Otwórz arkusz → `Rozszerzenia` → `Apps Script`
2. Kliknij ⚙️ `Ustawienia projektu`
3. Przewiń do `Właściwości skryptu`
4. Dodaj każdy klucz osobno

---

## 🚀 INSTRUKCJA KROK PO KROKU

### KROK 1: Przygotowanie (jednorazowe)

```
1. TEST_KONFIGURACJI()        ← Sprawdź czy wszystko OK
2. TEST_GROQ()                ← Test AI
3. TEST_WEB_SEARCH()          ← Test wyszukiwania (opcjonalne)
```

### KROK 2: Utworzenie arkuszy

```
4. USTAW_WALIDACJE()          ← Listy rozwijane TYP/WALUTA
5. USTAW_FORMULY()            ← Formuły obliczeniowe
6. USTAW_FORMATOWANIE()       ← Kolory zysk/strata
7. UTWORZ_ARKUSZ_NEWSY()      ← Arkusz newsów
8. UTWORZ_ARKUSZ_DYWIDENDY()  ← Arkusz dywidend (opcjonalne)
```

### KROK 3: Ustawienie triggerów (automatyzacja)

```
9.  USTAW_TRIGGER_5MIN()       ← Ceny co 5 min
10. USTAW_TRIGGER_NEWSY_1H()   ← Newsy co 1h
11. USTAW_TRIGGER_CZYSCIEC()   ← Czyszczenie codziennie o 3:00
```

### KROK 4: Gotowe! Codzienne użycie

#### Ręczne aktualizacje:
- `AKTUALIZUJ_WSZYSTKO()` - odśwież ceny
- `URUCHOM_SYSTEM_NEWSOW()` - pobierz newsy

#### Pytaj SENTINEL:
- `OCENA_PORTFELA()` - szczera ocena
- `SPRAWDZ_BALANS()` - Core vs Satellites
- `ANALIZUJ_TICKER("IONQ")` - analiza spółki
- `ZAPYTAJ_ASYSTENTA("Twoje pytanie")` - dowolne pytanie

#### Dywidendy:
- `DODAJ_DYWIDENDE_O(10)` - dodaj z O (10 akcji)
- `PODSUMOWANIE_DYWIDEND()` - statystyki
- `OBLICZ_YIELD_PORTFELA()` - yield %

#### Diagnostyka:
- `STATUS_ASYSTENTA()` - limity SENTINEL
- `SPRAWDZ_LIMIT_API()` - limity newsów
- `STATYSTYKI_NEWSOW()` - podział newsów

---

## ⚙️ Konfiguracja Strategii

### Core + Satellites (domyślnie 75%/25%)

W pliku `ASYSTENT_MODUL.gs`, linie 52-59:

```javascript
STRATEGIA: {
  CORE_PROCENT: 75,        // Zmień na swój cel
  SATELLITES_PROCENT: 25,
  CORE_TYPY: ['ETF', 'SKARB', 'REIT'],      // Stabilne
  SATELLITES_TYPY: ['AKCJA', 'KRYPTO', 'KASYNO']  // Ryzykowne
}
```

### Typy aktywów:
| TYP | Kategoria | Opis |
|-----|-----------|------|
| ETF | CORE | Fundusze indeksowe |
| SKARB | CORE | Obligacje skarbowe |
| REIT | CORE | Nieruchomości (np. O) |
| AKCJA | SATELLITES | Pojedyncze spółki |
| KRYPTO | SATELLITES | Kryptowaluty |
| KASYNO | SATELLITES | Spekulacyjne |

---

## 📋 Arkusze Google Sheets

### PORTFEL (główny)
| Kolumna | Opis | Auto? |
|---------|------|-------|
| A | ID | Formuła |
| B | TICKER | Ręcznie |
| C | TYP | Lista rozwijana |
| D | WALUTA | Lista rozwijana |
| E | ILOŚĆ | Ręcznie |
| F | CENA_ZAKUPU | Ręcznie |
| G | KURS_ZAKUPU_PLN | Ręcznie (dla USD/EUR) |
| H | KOSZT_PLN | Formuła |
| I | CENA_AKTUALNA | Auto (API) |
| J | WARTOSC_PLN | Formuła |
| K | ZYSK_TOTAL | Formuła |
| L | WYNIK_AKCJI | Formuła |
| M | WPLYW_FX | Formuła |
| N | (Kursy walut) | Auto |

### NEWSY_BAZA
| Kolumna | Opis |
|---------|------|
| A | ID |
| B | TICKER |
| C | DATA |
| D | TYTUŁ |
| E | ANALIZA |
| F | SENTIMENT |
| G | SCORE (1-10) |

### DYWIDENDY
| Kolumna | Opis |
|---------|------|
| A | ID |
| B | TICKER |
| C | DATA_EX |
| D | DATA_WYPŁATY |
| E | KWOTA/AKCJA |
| F | ILOŚĆ |
| G | WALUTA |
| H | TOTAL |
| I | PLN |
| J | STATUS |

---

## 🛡️ Limity i Bezpieczeństwo

### Dzienne limity (domyślne):
| System | Limit | Wykorzystanie typowe |
|--------|-------|---------------------|
| SENTINEL (pytania) | 50/dzień | ~5-10 |
| Newsy AI | 500/dzień | ~70 |
| Web Search | 100/dzień | ~50 |
| Groq (łącznie) | 14,400/dzień | ~1% |

### Automatyczne zabezpieczenia:
- ✅ Cooldown 30s między pytaniami SENTINEL
- ✅ Licznik dziennych zapytań
- ✅ Pre-scoring newsów (oszczędza API)
- ✅ Deduplikacja newsów

---

## 🔧 Troubleshooting

### "Brak klucza X"
→ Dodaj klucz w Właściwościach skryptu

### "Limit exceeded" / "429"
→ Poczekaj lub zmień providera AI (GROQ/GEMINI)

### Formuły nie działają
→ Uruchom `USTAW_FORMULY()` ponownie

### Ceny nie aktualizują się
→ Sprawdź `TEST_KONFIGURACJI()` i klucz FINNHUB

---

## 📞 Funkcje szybkiego dostępu

### ⭐ Najważniejsze:
```
AKTUALIZUJ_WSZYSTKO()     - Odśwież ceny
OCENA_PORTFELA()          - Zapytaj SENTINEL
URUCHOM_SYSTEM_NEWSOW()   - Pobierz newsy
PODSUMOWANIE_DYWIDEND()   - Statystyki dywidend
```

### 🔍 Diagnostyka:
```
TEST_KONFIGURACJI()       - Test portfela
TEST_GROQ()               - Test AI
TEST_WEB_SEARCH()         - Test wyszukiwania
STATUS_ASYSTENTA()        - Limity SENTINEL
SPRAWDZ_LIMIT_API()       - Limity newsów
```

### 📅 Triggery:
```
USTAW_TRIGGER_5MIN()      - Ceny co 5 min
USTAW_TRIGGER_NEWSY_1H()  - Newsy co 1h
USTAW_TRIGGER_CZYSCIEC()  - Czyszczenie o 3:00
```

---

## 📅 Data utworzenia: 15 stycznia 2026

### Wersja: 1.0

### Autor: AI + User collaboration
