# 🤖 Bot Discord dla Klanu Minecraft

Bot Discord z pełnym systemem weryfikacji, ticketów (podań), moderacji i statystyk.

## ✨ Funkcje

- ✅ **System weryfikacji** - Automatyczna weryfikacja przez przycisk
- 🎫 **System ticketów/podań** - Tworzenie prywatnych kanałów do rekrutacji
- 🔨 **Moderacja** - Mute, kick, ban z logami
- 📊 **Statystyki** - Liczba członków, online, boty
- 👋 **Powiadomienia** - Automatyczne wiadomości o nowych członkach
- 📝 **Logi** - Wszystkie akcje zapisywane w kanale administracyjnym

---

## 📋 Wymagania

- **Node.js** (wersja 16.9.0 lub nowsza) - [Pobierz tutaj](https://nodejs.org/)
- **Konto Discord** z uprawnieniami administratora na serwerze
- **Token bota** z Discord Developer Portal

---

## 🚀 Instalacja

### Krok 1: Pobierz Node.js
1. Wejdź na https://nodejs.org/
2. Pobierz wersję **LTS** (zalecana)
3. Zainstaluj (klikaj "Next" i zostaw domyślne ustawienia)
4. Sprawdź instalację - otwórz CMD i wpisz:
```bash
node --version
npm --version
```

### Krok 2: Utwórz aplikację Discord Bot

1. Wejdź na https://discord.com/developers/applications
2. Kliknij **"New Application"**
3. Podaj nazwę (np. "Minecraft Clan Bot") i kliknij **Create**
4. Przejdź do zakładki **"Bot"** (po lewej stronie)
5. Kliknij **"Add Bot"** → **"Yes, do it!"**
6. **WAŻNE:** Włącz te opcje w sekcji "Privileged Gateway Intents":
   - ✅ **PRESENCE INTENT**
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT**
7. Kliknij **"Reset Token"** i skopiuj token (NIGDY NIE UDOSTĘPNIAJ!)

### Krok 3: Dodaj bota na serwer

1. Przejdź do zakładki **"OAuth2"** → **"URL Generator"**
2. Zaznacz:
   - **SCOPES:** `bot`
   - **BOT PERMISSIONS:** `Administrator` (lub wybierz konkretne uprawnienia)
3. Skopiuj wygenerowany link na dole strony
4. Wklej link w przeglądarce i dodaj bota na swój serwer

### Krok 4: Skonfiguruj bota

1. Otwórz folder `discord-bot` w CMD:
```bash
cd discord-bot
```

2. Zainstaluj zależności:
```bash
npm install
```

3. Skopiuj plik `.env.example` i zmień nazwę na `.env`:
```bash
copy .env.example .env
```

4. Otwórz plik `.env` w Notatniku i uzupełnij:

```env
DISCORD_TOKEN=twoj_token_z_kroku_2

GUILD_ID=id_twojego_serwera
WELCOME_CHANNEL_ID=id_kanalu_powitania
VERIFICATION_CHANNEL_ID=id_kanalu_weryfikacji
TICKET_CATEGORY_ID=id_kategorii_ticketow
LOGS_CHANNEL_ID=id_kanalu_logow

VERIFIED_ROLE_ID=id_roli_zweryfikowany
MODERATOR_ROLE_ID=id_roli_moderator
ADMIN_ROLE_ID=id_roli_admin
```

### Krok 5: Jak znaleźć ID?

1. W Discord włącz **Tryb Dewelopera**:
   - Ustawienia → Zaawansowane → Tryb Dewelopera (włącz)

2. Kliknij prawym przyciskiem myszy na:
   - **Serwer** → Kopiuj identyfikator serwera
   - **Kanał** → Kopiuj identyfikator kanału
   - **Rolę** (w ustawieniach serwera) → Kopiuj identyfikator roli

3. Wklej te ID do pliku `.env`

### Krok 6: Uruchom bota

```bash
npm start
```

Jeśli wszystko działa, zobaczysz:
```
✅ Bot zalogowany jako Minecraft Clan Bot#1234
📊 Serwery: 1
👥 Użytkownicy: 50
```

---

## 📚 Komendy

### 👥 Ogólne
- `!members` lub `!członkowie` - Statystyki serwera
- `!help` lub `!pomoc` - Lista komend

### 🔨 Moderacja (wymaga uprawnień)
- `!mute @użytkownik 10m powód` - Wycisz użytkownika (10s, 5m, 2h, 1d)
- `!unmute @użytkownik` - Odcisz użytkownika
- `!kick @użytkownik powód` - Wyrzuć użytkownika
- `!ban @użytkownik powód` - Zbanuj użytkownika

### ⚙️ Administracja (tylko administratorzy)
- `!setup-verification` - Utwórz panel weryfikacji (użyj w kanale weryfikacji)
- `!setup-tickets` - Utwórz panel ticketów (użyj w kanale podań)

---

## 🎯 Jak używać?

### 1. System weryfikacji
1. Utwórz kanał `✅│weryfikacja`
2. Wpisz w nim komendę: `!setup-verification`
3. Bot utworzy panel z przyciskiem
4. Użytkownicy klikają przycisk i dostają rolę "Zweryfikowany"

### 2. System ticketów (podań)
1. Utwórz kategorię `📝 REKRUTACJA`
2. Utwórz kanał `📋│podanie` w tej kategorii
3. Wpisz w nim komendę: `!setup-tickets`
4. Bot utworzy panel z przyciskiem
5. Użytkownicy klikają przycisk → tworzy się prywatny kanał
6. Moderatorzy mogą zamknąć ticket przyciskiem

### 3. Powiadomienia o nowych członkach
- Bot automatycznie wysyła wiadomość powitalną w kanale `WELCOME_CHANNEL_ID`
- Pokazuje numer członka (np. "Jesteś 50 członkiem!")

### 4. Logi administracyjne
- Wszystkie akcje (mute, kick, ban, weryfikacje, tickety) są logowane
- Logi trafiają do kanału `LOGS_CHANNEL_ID`

---

## ⚠️ Rozwiązywanie problemów

### Bot się nie loguje
- Sprawdź czy token w `.env` jest poprawny
- Upewnij się, że włączyłeś wszystkie **Intents** w Discord Developer Portal

### Bot nie reaguje na komendy
- Sprawdź czy bot ma uprawnienia do czytania i wysyłania wiadomości
- Upewnij się, że włączyłeś **MESSAGE CONTENT INTENT**

### Weryfikacja nie działa
- Sprawdź czy `VERIFIED_ROLE_ID` w `.env` jest poprawne
- Upewnij się, że rola bota jest wyżej niż rola "Zweryfikowany"

### Tickety się nie tworzą
- Sprawdź czy `TICKET_CATEGORY_ID` jest poprawne
- Upewnij się, że bot ma uprawnienia do tworzenia kanałów

---

## 🔧 Dostosowywanie

### Zmiana koloru embedów
W pliku `bot.js` znajdź `.setColor('#0099FF')` i zmień na swój kolor (hex)

### Zmiana emoji
Zamień emoji w kodzie (np. `👋` na `🎉`)

### Dodanie własnych komend
Dodaj nowy blok `if (command === 'twoja-komenda')` w sekcji `messageCreate`

---

## 📞 Wsparcie

Jeśli masz problemy:
1. Sprawdź czy wszystkie ID w `.env` są poprawne
2. Sprawdź czy bot ma odpowiednie uprawnienia
3. Sprawdź logi w konsoli (CMD) - tam zobaczysz błędy

---

## 📝 Licencja

MIT - możesz swobodnie modyfikować i używać tego bota!

---

**Autor:** Twój Bot Discord
**Wersja:** 1.0.0
