# 🇵🇱 SZYBKA INSTRUKCJA - Bot Discord

## ⚡ Szybki Start (5 minut)

### 1️⃣ Zainstaluj Node.js
- Pobierz: https://nodejs.org/ (wersja LTS)
- Zainstaluj (klikaj "Next")
- Sprawdź w CMD: `node --version`

### 2️⃣ Utwórz bota Discord
1. Wejdź: https://discord.com/developers/applications
2. Kliknij **"New Application"** → podaj nazwę → **Create**
3. Zakładka **"Bot"** → **"Add Bot"**
4. Włącz te 3 opcje w "Privileged Gateway Intents":
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT  
   - ✅ MESSAGE CONTENT INTENT
5. Kliknij **"Reset Token"** → skopiuj token (schowaj bezpiecznie!)

### 3️⃣ Dodaj bota na serwer
1. Zakładka **"OAuth2"** → **"URL Generator"**
2. Zaznacz: `bot` + `Administrator`
3. Skopiuj link na dole → wklej w przeglądarce → dodaj na serwer

### 4️⃣ Skonfiguruj bota
1. Otwórz CMD w folderze `discord-bot`:
```bash
cd discord-bot
npm install
```

2. Skopiuj plik `.env.example` → zmień nazwę na `.env`

3. Otwórz `.env` w Notatniku i uzupełnij:

**Jak znaleźć ID?**
- Discord → Ustawienia → Zaawansowane → **Tryb Dewelopera** (włącz)
- Kliknij prawym na serwer/kanał/rolę → **Kopiuj identyfikator**

```env
DISCORD_TOKEN=wklej_token_z_kroku_2

GUILD_ID=id_twojego_serwera
WELCOME_CHANNEL_ID=id_kanalu_gdzie_witac_nowych
VERIFICATION_CHANNEL_ID=id_kanalu_weryfikacji
TICKET_CATEGORY_ID=id_kategorii_gdzie_tworzyc_tickety
LOGS_CHANNEL_ID=id_kanalu_logow_admin

VERIFIED_ROLE_ID=id_roli_zweryfikowany
MODERATOR_ROLE_ID=id_roli_moderator
ADMIN_ROLE_ID=id_roli_admin
```

### 5️⃣ Uruchom bota
```bash
npm start
```

Zobaczysz: `✅ Bot zalogowany jako...` - działa! 🎉

---

## 🎮 Jak używać?

### ✅ Weryfikacja
1. Wejdź na kanał weryfikacji
2. Wpisz: `!setup-verification`
3. Gotowe! Użytkownicy klikają przycisk i dostają rolę

### 🎫 Tickety (podania)
1. Utwórz kategorię "REKRUTACJA"
2. Utwórz kanał "podanie" w tej kategorii
3. Wpisz: `!setup-tickets`
4. Użytkownicy klikają → tworzy się prywatny kanał

### 🔨 Moderacja
- `!mute @user 10m powód` - wycisz (10s, 5m, 2h, 1d)
- `!unmute @user` - odcisz
- `!kick @user powód` - wyrzuć
- `!ban @user powód` - zbanuj

### 📊 Statystyki
- `!members` - ile osób na serwerze

### 📚 Pomoc
- `!help` - lista wszystkich komend

---

## ❓ Problemy?

**Bot się nie loguje?**
- Sprawdź token w `.env`
- Włącz wszystkie 3 Intents w Discord Developer Portal

**Bot nie reaguje?**
- Włącz MESSAGE CONTENT INTENT
- Sprawdź uprawnienia bota na serwerze

**Weryfikacja nie działa?**
- Sprawdź czy ID roli w `.env` jest dobre
- Rola bota musi być wyżej niż rola "Zweryfikowany"

**Tickety się nie tworzą?**
- Sprawdź ID kategorii w `.env`
- Bot musi mieć uprawnienia do tworzenia kanałów

---

## 🚀 Gotowe!

Twój bot jest gotowy do użycia! Wszystkie funkcje działają automatycznie.

**Potrzebujesz pomocy?** Sprawdź pełną instrukcję w `README.md`
