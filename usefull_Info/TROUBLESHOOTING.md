# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### ❌ Module Not Displaying

**Symptom:** Module appears blank or shows loading spinner indefinitely

**Solutions:**
1. **Check API Keys**
   ```javascript
   // In config/config.js
   apiTomTomKey: "YOUR_KEY_HERE", // Must be a valid key from https://developer.tomtom.com/
   teamId: "133647" // Must be valid TheSportsDB ID
   ```

2. **Verify Coordinates**
   - Latitude must be between -90 and 90
   - Longitude must be between -180 and 180
   - Example: Celtic FC location
     ```javascript
     homeLatitude: 55.864,
     homeLongitude: -4.2670
     ```

3. **Check MagicMirror Logs**
   ```bash
   # In MagicMirror directory
   npm start 2>&1 | grep "MMM-MyTeams-DriveToMatch"
   ```

4. **Verify Team Name/ID Match**
   - Team name and ID must correspond to the same team
   - If unsure, use `teamId` only and leave `teamName` empty for auto-resolution

---

### ⏱️ "Loading" Displayed Too Long

**Symptom:** Module shows "Loading..." for more than 30 seconds

**Causes & Fixes:**
| Issue | Cause | Fix |
|-------|-------|-----|
| **Slow API Response** | TomTom/TheSportsDB rate limit | Wait 5-10 mins, increase `requestTimeout` to 30000ms |
| **Network Issue** | Poor connection | Check MagicMirror network: `ping 8.8.8.8` |
| **API Key Invalid** | Wrong TomTom key | Generate new key from TomTom Portal |
| **Fixture Not Found** | Team has no upcoming match | Check team schedule on TheSportsDB |
| **Route Calculation Fail** | Invalid coordinates | Use GPS tool to verify home location |

**Quick Debug:**
```javascript
// Add to config to enable verbose logging
debug: true,
dateOverride: "2025-11-26" // Force test specific date of known fixture
```

---

### 🚫 "Error: API Rate Limit Exceeded"

**Why This Happens:**
- TomTom free tier: 2,500 calls/day, 10 calls/minute
- TheSportsDB: 4 calls/second limit
- Routes are cached but fixture updates consume quota

**Solutions:**

**Option 1: Increase Update Intervals** (Recommended)
```javascript
// Default: Updates routes every 10 minutes
routeUpdateInterval: 30 * 60 * 1000,  // Change to 30 minutes

// Default: Updates fixtures every 24 hours  
fixtureUpdateInterval: 48 * 60 * 60 * 1000, // Change to 48 hours
```

**Option 2: Upgrade TomTom Plan**
- Free: $0/month (2,500 calls/day)
- Pay-as-you-go: Starting $0.50 per 100 calls
- Pro: Various tiers available

**Option 3: Use Shared Cache** (If you have MMM-MyTeams-Fixtures installed)
```javascript
// Reuse fixture data from another module
useSharedFixturesCache: true
```

---

### 🌍 "No Route Found / Invalid Coordinates"

**Symptoms:**
- "Error: TomTom API returned no routes"
- Routes show `NaN` or `undefined`

**Causes:**
| Cause | Fix |
|-------|-----|
| Home coordinates invalid | Use Google Maps to get exact coordinates |
| Stadium not in TomTom database | Try nearest major city coordinates |
| Route calculation timeout | Increase `requestTimeout` to 25000ms |
| Stadium coordinate error in CSV | Check `stadium-cache.json` for stadium location |

**Validate Your Coordinates:**
```javascript
// Check if coordinates are valid
// Use: https://www.gps-coordinates.net/

homeLatitude: 55.864,    // ✓ Celtic Park, Glasgow
homeLongitude: -4.2670,
```

---

### 💾 "Cache File Corruption"

**Symptoms:**
- Same stale route data
- "SyntaxError: Unexpected token in JSON"

**How to Clear Cache:**
```bash
# Navigate to your MMM-MyTeams-DriveToMatch directory & Delete all cache files
rm fixtures-cache.json sharedFixtures-cache.json stadium-cache.json

# Navigate to your MagicMirror directory  are restart - it will recreate them on next start
npm start  # or yor normal start cmd 
```

**Permanent Fix:**
- Add to config (auto-clears old cache on startup):
```javascript
// Module will auto-validate cache and regenerate if needed
fixtureUpdateInterval: 24 * 60 * 60 * 1000
```

---

### 🛣️ "Route Shows Incorrect Path"

**Symptoms:**
- Route takes long detour
- Shows non-existent roads
- Route avoids obvious shortcuts

**Solutions:**

1. **Check Toll Roads Setting**
   ```javascript
   avoidTolls: false,  // Allow toll roads for optimal routing
   avoidTolls: true,   // Avoid tolls (may add time/distance)
   ```

2. **Check TomTom Route Type**
   - Routes are calculated for: Fastest OR Shortest
   - Module shows both options
   - Choose based on your preference

3. **Report to TomTom**
   - Provide exact coordinates and route details
   - TomTom maps update quarterly

---

### 🌉 "Ferry/Eurotunnel Not Showing"

**Symptoms:**
- Route doesn't show ferry costs
- Eurotunnel crossing not detected

**Causes & Fixes:**
| Issue | Fix |
|-------|-----|
| Feature disabled | Set `showFerryDetails: true, showEurotunnel: true` |
| Coordinates too far from ferry | Verify home/stadium coordinates |
| Ferry not in TomTom database | Contact TomTom support |

**Enable Ferry/Eurotunnel Detection:**
```javascript
showEurotunnel: true,      // Show Eurotunnel crossings (£68-180)
showFerryDetails: true,    // Show ferry operator & crossing time
showFuelCost: true,        // Show estimated fuel cost
fuelPricePerLitre: 1.45    // Update to your local fuel price
```

---

### 📊 "Fuel Cost Calculation Wrong"

**Example:** Route is 200km, but fuel cost doesn't match

**How Calculation Works:**
```
Cost = (Distance in km ÷ 100) × Fuel Efficiency × Fuel Price
Cost = (200 ÷ 100) × 8.0 L/100km × £1.45/L = £23.20
```

**Adjust for Your Vehicle:**
```javascript
fuelEfficiency: 8.0,        // Litres per 100km (your car's consumption)
// Conversions:
// 30 MPG UK = 9.4 L/100km
// 35 MPG UK = 8.0 L/100km
// 40 MPG UK = 7.1 L/100km

fuelPricePerLitre: 1.45,   // Current UK petrol price
// Update this regularly with fuel prices
```

---

### 🗣️ "Text Not in My Language"

**Symptoms:**
- Module shows English text despite language config
- Translations missing or incorrect

**Supported Languages:**
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Dutch (nl)
- Portuguese (pt)
- Scottish Gaelic (gd)
- Irish Gaelic (ga)

**How to Add/Fix Language:**
1. Check `translations/` folder
2. Edit relevant `.json` file
3. Restart MagicMirror

**Example - Add Missing Translation:**
```json
// translations/en.json
{
  "LEAGUE": "League",
  "COMPETITION": "Competition",
  "YOUR_TRANSLATION_HERE": "Your Translation"
}
```

---

### 🔐 "SSL Certificate Error"

**Error Message:** `SSL_CERTIFICATE_PROBLEM`

**Solutions:**

**Option 1: Use Node 18+ (Recommended)**
- Bundled with better certificate support
- No additional setup needed

**Option 2: Disable SSL Verification (Not Recommended)**
```bash
# ONE TIME ONLY - Not recommended for production
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
```

**Option 3: Install Certificates**
```bash
# On Windows
npm config set cafile C:\path\to\certificate.pem
```

---

### 📱 "Module Responsive Design Issues"

**Symptoms:**
- Routes overlap on small screens
- Text too large/small
- Layout broken

**CSS Override in config.js:**
```javascript
// Add to module config
customCss: `
  .MMM-MyTeams-DriveToMatch .route {
    font-size: 14px;
  }
`
```

---

### 🔄 "Fixtures Not Updating"

**Symptoms:**
- Always shows same fixture
- Past matches still displayed

**Causes:**

| Issue | Fix |
|-------|-----|
| **Cache too aggressive** | Reduce `fixtureUpdateInterval` to 12 hours |
| **Team has no future matches** | Check team schedule on TheSportsDB |
| **Config error** | Verify `teamId` is correct and unique |
| **API down** | Check TheSportsDB status page |
| **Date override** | Remove `dateOverride` setting |

**Force Update:**
```javascript
// Add to module config (temporary)
dateOverride: "2025-01-20", // Will search for fixture on this date
```

---

### 🌗 "Dark Mode Not Working"

**Symptoms:**
- Module doesn't respect system dark mode
- Colors wrong on dark backgrounds

**Solutions:**

```javascript
// Auto-detect system theme
darkMode: null,                 // Auto-detect (recommended)

// OR force specific theme
darkMode: true,                 // Force dark theme
darkMode: false,                // Force light theme

// Override colors manually
fontColorOverride: "#FFFFFF",   // Force white text
borderColorOverride: "#CCCCCC", // Force light borders
opacityOverride: 0.9            // Adjust transparency
```

---

### ⚙️ "Performance Issues / Slow Load"

**Symptoms:**
- MagicMirror sluggish when module loads
- CPU spike during updates
- Network lag

**Optimization Tips:**

| Change | Expected Improvement |
|--------|---------------------|
| Increase `fixtureUpdateInterval` to 48 hours | 50% fewer API calls |
| Increase `routeUpdateInterval` to 30 mins | 70% fewer API calls |
| Enable `useSharedFixturesCache` | 100-300x faster startup |
| Reduce `maxRoutes` from 2 to 1 | 50% fewer route calculations |
| Use `strictLeagueFiltering: true` | Faster fixture search |

**Recommended Performance Config:**
```javascript
fixtureUpdateInterval: 48 * 60 * 60 * 1000,  // 48 hours
routeUpdateInterval: 30 * 60 * 1000,          // 30 minutes  
maxRoutes: 2,                                  // Limit to 2
useSharedFixturesCache: true,                  // If available
strictLeagueFiltering: true                    // Faster filtering
```

---

## 🐛 Getting Help

**Before Opening Issue:**
1. Check this guide for your specific error
2. Enable debug logging: `debug: true`
3. Check MagicMirror logs for stack trace
4. Verify all required fields in config

**If Issue Persists:**
1. Open GitHub issue with:
   - Error message (from console)
   - Module config (sanitize API keys!)
   - Team name & league
   - Expected vs actual output

2. Attach logs

## 📞 Support Resources

- **TomTom API Issues:** https://developer.tomtom.com/
- **TheSportsDB Issues:** https://www.thesportsdb.com/
- **MagicMirror Forum:** https://github.com/MagicMirrorOrg/MagicMirror/discussions
- **Module GitHub:** https://github.com/gitgitaway/MMM-MyTeams-DriveToMatch

---

## ✅ Verification Checklist

Use this checklist if module doesn't work:

- [ ] TomTom API key is valid and active
- [ ] Team name matches team ID on TheSportsDB
- [ ] Home coordinates are between -90 to 90 (lat) and -180 to 180 (lon)
- [ ] Module appears in MagicMirror config.js
- [ ] Module dependencies installed: `npm install`
- [ ] MagicMirror restarted after config changes
- [ ] No other modules have critical errors
- [ ] Internet connection is stable
- [ ] Firewall allows external API calls

---

**Last Updated:** October 2025  
**Module Version:** 1.4.3  
**Maintainer:** gitgitaway