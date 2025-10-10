# Quick Start - Multi-Language Support

## 🚀 Change Your Module Language in 3 Steps

### Step 1: Edit Your Config File

Open your MagicMirror configuration file:

```bash
nano ~/MagicMirror/config/config.js
```

Or on Windows:
```powershell
notepad C:\Users\[YourUsername]\MagicMirror\config\config.js
```

### Step 2: Set Your Language

Find the `language` setting at the top of the config file and change it:

```javascript
let config = {
    language: "en",  // ← Change this to your language code
    locale: "en-UK",
    // ... rest of config
}
```

**Choose your language code:**

| Language | Code | Example |
|----------|------|---------|
| :scotland: Scottish Gaelic | `gd` | `language: "gd"` |
| :ireland: Irish Gaelic | `ga` | `language: "ga"` |
| 🇬🇧 English | `en` | `language: "en"` |
| 🇪🇸 Spanish | `es` | `language: "es"` |
| 🇫🇷 French | `fr` | `language: "fr"` |
| 🇩🇪 German | `de` | `language: "de"` |
| 🇮🇹 Italian | `it` | `language: "it"` |
| 🇳🇱 Dutch | `nl` | `language: "nl"` |
| 🇵🇹 Portuguese | `pt` | `language: "pt"` |



### Step 3: Restart MagicMirror

**If using PM2:**
```bash
pm2 restart MagicMirror
```

**If running manually:**
```bash
cd ~/MagicMirror
npm start
```

**On Windows:**
```powershell
# Stop MagicMirror (Ctrl+C if running in terminal)
# Then restart:
npm start
```

---

## ✅ That's It!

Your MMM-MyTeams-DriveToMatch module will now display in your chosen language!

---

## 🎯 What You'll See

### Before (English)
```
Loading fixture data...
Routes to Match Stadium
⚡ Fastest
📏 Shortest
via M6, M74
+15m delay
Fuel: £45.50
Routes updated: Just now
```

### After (Spanish)
```
Cargando datos del partido...
Rutas al Estadio del Partido
⚡ Más Rápida
📏 Más Corta
vía M6, M74
+15m retraso
Combustible: £45.50
Rutas actualizadas: Ahora mismo
```

---

## 🔧 Optional: Adjust Date/Time Format

You can also change the `locale` setting to adjust how dates and times are displayed:

```javascript
let config = {
    language: "es",
    locale: "es-ES",  // Spanish date/time format
    // ... rest of config
}
```

**Common locale codes:**

| Language | Locale Code | Date Format Example |
|----------|-------------|---------------------|
| English (UK) | `en-UK` | Sat, 28 Dec, 14:30 |
| English (US) | `en-US` | Sat, Dec 28, 2:30 PM |
| Spanish | `es-ES` | Sáb, 28 Dic, 14:30 |
| French | `fr-FR` | Sam, 28 Déc, 14:30 |
| German | `de-DE` | Sa, 28. Dez, 14:30 |
| Italian | `it-IT` | Sab, 28 Dic, 14:30 |
| Dutch | `nl-NL` | Za, 28 Dec, 14:30 |
| Portuguese | `pt-PT` | Sáb, 28 Dez, 14:30 |

---

## ❓ Troubleshooting

### Module still shows English

**Check:**
1. ✅ Language code is correct (case-sensitive)
2. ✅ Config file saved properly
3. ✅ MagicMirror restarted after change

**Try:**
```bash
# Check for config syntax errors
pm2 logs MagicMirror --lines 50
```

### Some text not translated

**This is normal!** The following are NOT translated:
- Team names (Celtic, Rangers, etc.)
- Venue names (Ibrox Stadium, etc.)
- Competition names (Scottish Premiership, etc.)
- Road names (M6, M74, etc.)

These are proper nouns that stay the same in all languages.

### Translation looks wrong

**Report it!** If you find a translation error:
1. Check the translation file: `translations/[code].json`
2. Open an issue on GitHub
3. Or submit a pull request with the fix

---

## 📚 Need More Help?

- **Full Documentation:** See [`translations/README.md`](README.md)
- **Language Examples:** See [`translations/LANGUAGE_EXAMPLES.md`](LANGUAGE_EXAMPLES.md)
- **Implementation Details:** See [`MULTI_LANGUAGE_IMPLEMENTATION_SUMMARY.md`](../MULTI_LANGUAGE_IMPLEMENTATION_SUMMARY.md)

---

## 🌍 Want to Add Your Language?

It's easy! See the "Adding a New Language" section in [`translations/README.md`](README.md)

We welcome contributions for:
- Norwegian, Swedish, Danish
- Polish, Czech, Russian
- Arabic, Hebrew (RTL support needed)
- Japanese, Chinese, Korean
- And many more!

---

**Happy MagicMirror-ing in your language! 🎉**
