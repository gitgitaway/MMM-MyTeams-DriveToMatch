# Multi-Language Support for MMM-MyTeams-DriveToMatch

## Overview

MMM-MyTeams-DriveToMatch now supports **9 languages** out of the box! The module automatically detects your MagicMirror's configured language and displays all text in that language.

## Supported Languages

| Language | Code | Translation File |
|----------|------|------------------|
| **English** | `en` | `en.json` |
| **Spanish** | `es` | `es.json` |
| **French** | `fr` | `fr.json` |
| **German** | `de` | `de.json` |
| **Italian** | `it` | `it.json` |
| **Dutch** | `nl` | `nl.json` |
| **Portuguese** | `pt` | `pt.json` |
| **Scottish Gaelic** | `gd` | `gd.json` |
| **Irish Gaelic** | `ga` | `ga.json` |

## How to Use

### 1. Set Your Language in MagicMirror Config

Edit your `config/config.js` file and set the `language` parameter:

```javascript
let config = {
    language: "en",  // Change to your preferred language code
    locale: "en-UK",
    // ... rest of config
}
```

**Examples:**
- English: `language: "en"`
- Spanish: `language: "es"`
- French: `language: "fr"`
- German: `language: "de"`
- Italian: `language: "it"`
- Dutch: `language: "nl"`
- Portuguese: `language: "pt"`
- Scottish Gaelic: `language: "gd"`
- Irish Gaelic: `language: "ga"`

### 2. Restart MagicMirror

After changing the language setting, restart MagicMirror:

```bash
pm2 restart MagicMirror
```

Or if running manually:
```bash
npm start
```

## What Gets Translated

All user-facing text in the module is translated, including:

### Status Messages
- Loading fixture data
- Calculating routes
- No upcoming fixtures found
- Stadium coordinates unknown
- Error messages

### Route Information
- "Routes to Match Stadium"
- "Fastest" / "Shortest" / "Alternative"
- "Route" labels
- "via" (waypoints)
- "delay" (traffic delays)
- "Fuel" cost labels
- "Routes updated" timestamp

### Fixture Details
- "vs" (versus)
- "Venue TBC" (to be confirmed)

### Save Route Feature
- "Route Saved ✓"
- "Saved as"
- "Save Failed"
- "Could not save route"
- "Click to save this route" (tooltip)

### Configuration Errors
- "TomTom API key is required"
- "Home coordinates are required"

## Translation Examples

### English (en)
```
Loading fixture data...
Routes to Match Stadium
⚡ Fastest
via M6, M74
+15m delay
Fuel: £45.50
Routes updated: Just now
```

### Spanish (es)
```
Cargando datos del partido...
Rutas al Estadio del Partido
⚡ Más Rápida
vía M6, M74
+15m retraso
Combustible: £45.50
Rutas actualizadas: Ahora mismo
```

### French (fr)
```
Chargement des données du match...
Itinéraires vers le Stade du Match
⚡ Plus Rapide
via M6, M74
+15m retard
Carburant: £45.50
Itinéraires mis à jour: À l'instant
```

### German (de)
```
Spieldaten werden geladen...
Routen zum Spielstadion
⚡ Schnellste
über M6, M74
+15m Verzögerung
Kraftstoff: £45.50
Routen aktualisiert: Gerade eben
```

### Scottish Gaelic (gd)
```
A' luchdachadh dàta geama...
Slighean chun Raon-cluiche
⚡ As Luaithe
tro M6, M74
+15m dàil
Connadh: £45.50
Slighean air ùrachadh: An-dràsta fhèin
```

### Irish Gaelic (ga)
```
Ag lódáil sonraí cluiche...
Bealaí chuig Staid an Chluiche
⚡ Is Tapúla
trí M6, M74
+15m moill
Breosla: €45.50
Bealaí nuashonraithe: Díreach anois
```

## Adding a New Language

Want to add support for another language? It's easy!

### Step 1: Create Translation File

Create a new JSON file in the `translations` folder with your language code:

```bash
translations/[language-code].json
```

For example, for Norwegian: `translations/no.json`

### Step 2: Copy and Translate

Copy the contents of `en.json` and translate all the values (keep the keys in English):

```json
{
  "LOADING": "Your translation here...",
  "ERROR": "Your translation here...",
  "NO_FIXTURES": "Your translation here...",
  ...
}
```

### Step 3: Register the Language

Edit `MMM-MyTeams-DriveToMatch.js` and add your language to the `getTranslations()` function:

```javascript
getTranslations: function() {
    return {
        en: "translations/en.json",
        es: "translations/es.json",
        fr: "translations/fr.json",
        de: "translations/de.json",
        it: "translations/it.json",
        nl: "translations/nl.json",
        pt: "translations/pt.json",
        gd: "translations/gd.json",
        ga: "translations/ga.json",
        no: "translations/no.json"  // Add your new language here
    };
},
```

### Step 4: Test

Set your MagicMirror language to the new code and restart to test!

## Translation Keys Reference

Here's a complete list of all translation keys used in the module:

| Key | Purpose | Example (English) |
|-----|---------|-------------------|
| `LOADING` | Initial data loading message | "Loading fixture data..." |
| `ERROR` | Generic error message | "Error loading data" |
| `NO_FIXTURES` | No upcoming matches found | "No upcoming fixtures found" |
| `CALCULATING_ROUTES` | Route calculation in progress | "Calculating routes..." |
| `ROUTES_TO` | Section title for routes | "Routes to Match Stadium" |
| `FASTEST` | Fastest route label | "Fastest" |
| `SHORTEST` | Shortest route label | "Shortest" |
| `ALTERNATIVE` | Alternative route label | "Alternative" |
| `ROUTE` | Route number label | "Route" |
| `VIA` | Waypoint connector | "via" |
| `DELAY` | Traffic delay label | "delay" |
| `VENUE_TBC` | Venue to be confirmed | "Venue TBC" |
| `VS` | Versus separator | "vs" |
| `API_KEY_REQUIRED` | API key missing error | "TomTom API key is required..." |
| `HOME_COORDS_REQUIRED` | Coordinates missing error | "Home coordinates are required" |
| `STADIUM_COORDS_UNKNOWN` | Stadium location unknown | "Stadium Lat/Lon Unknown" |
| `ROUTE_SAVED` | Save success notification title | "Route Saved ✓" |
| `SAVED_AS` | Save success message prefix | "Saved as" |
| `SAVE_FAILED` | Save error notification title | "Save Failed" |
| `COULD_NOT_SAVE` | Save error message prefix | "Could not save route" |
| `ROUTES_UPDATED` | Footer update timestamp label | "Routes updated" |
| `JUST_NOW` | Recent update indicator | "Just now" |
| `FUEL` | Fuel cost label | "Fuel" |
| `CLICK_TO_SAVE` | Save button tooltip | "Click to save this route" |
| `FAILED_TO_LOAD` | Fixture loading error | "Failed to load fixture data" |
| `CURRENCY_SYMBOL` | Currency symbol for fuel costs | "£" |

## Notes

### Date and Time Formatting

Date and time formats are handled separately by the browser's `toLocaleDateString()` function and will automatically adapt to your locale setting in `config.js`.

### Currency Symbols

The fuel cost currency symbol (£, €, $, etc.) is automatically localized based on your selected language:

- **English (en):** £ (British Pound)
- **Spanish (es):** € (Euro)
- **French (fr):** € (Euro)
- **German (de):** € (Euro)
- **Italian (it):** € (Euro)
- **Dutch (nl):** € (Euro)
- **Portuguese (pt):** € (Euro)
- **Scottish Gaelic (gd):** £ (British Pound)
- **Irish Gaelic (ga):** € (Euro)

To customize the currency symbol for a language, edit the `CURRENCY_SYMBOL` key in the corresponding translation file (e.g., `translations/en.json`).

### Team Names and Venue Names

Team names, venue names, and competition names are **not translated** as they are proper nouns that come directly from TheSportsDB API.

### Fallback Behavior

If a translation key is missing from a language file, the module will fall back to the English translation automatically.

## Contributing Translations

If you'd like to contribute a translation for a new language or improve an existing one:

1. Fork the repository
2. Create/edit the translation file
3. Test thoroughly
4. Submit a pull request

**Translation Guidelines:**
- Keep translations concise (space is limited on the display)
- Maintain the same tone and formality as the English version
- Test with actual fixture data to ensure text fits properly
- Consider football/soccer terminology specific to your region

## Troubleshooting

### Module shows English despite language setting

**Solution:** Check that:
1. Your language code in `config.js` matches exactly (case-sensitive)
2. The translation file exists in the `translations` folder
3. The language is registered in `getTranslations()` function
4. You've restarted MagicMirror after making changes

### Some text is not translated

**Solution:** 
1. Check if the text is a proper noun (team/venue name) - these are not translated
2. Verify the translation key exists in your language file
3. Check browser console for any JavaScript errors

### Translation file not loading

**Solution:**
1. Verify JSON syntax is valid (use a JSON validator)
2. Check file encoding is UTF-8
3. Ensure file permissions allow reading
4. Check MagicMirror logs for file loading errors

## Language-Specific Notes

### Scottish Gaelic (gd)
Scottish Gaelic support is included as a tribute to Celtic FC fans! The translations use standard Scottish Gaelic orthography. Note that Gaelic has different word order and grammar structures, so some translations are adapted rather than literal.

### Irish Gaelic (ga)
Irish Gaelic (Gaeilge) support is included for Irish football fans! The translations use standard Irish orthography following the Caighdeán Oifigiúil (Official Standard). Irish has different grammatical structures from English, including initial mutations and the VSO (Verb-Subject-Object) word order, so some translations are adapted for clarity.

### Portuguese (pt)
The Portuguese translation uses European Portuguese conventions. Brazilian Portuguese speakers may prefer slightly different terminology for some football terms.

### Spanish (es)
The Spanish translation uses neutral Spanish that should be understood across all Spanish-speaking regions, though some football terminology may vary by country.

## Future Enhancements

Potential future additions:
- More languages (Norwegian, Swedish, Danish, Polish, etc.)
- Regional variants (en-US vs en-GB, pt-BR vs pt-PT)
- User-customizable translations via config
- Dynamic currency symbol based on locale
- RTL (right-to-left) language support (Arabic, Hebrew)

---

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Supported Languages:** 9  
**Module:** MMM-MyTeams-DriveToMatch