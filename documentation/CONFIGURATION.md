# Configuration Guide

Complete configuration options reference for MMM-MyTeams-DriveToMatch.

## 🚀 Minimum Configuration (Quick Start)

Add this to your `config/config.js` with only **required settings**:

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    position: "top_right",
    config: {
        // ===== REQUIRED =====
        apiTomTomKey: "YOUR_TOMTOM_API_KEY",    // Get from https://developer.tomtom.com
        homeLatitude: 57.35066,                  // Your home latitude (4+ decimals)
        homeLongitude: -3.59404,                 // Your home longitude (4+ decimals)
        
        // ===== REQUIRED TEAM =====
        teamName: "Celtic"                       // Your team name
    }
}
```

**That's it!** This gives you:
- ✅ Next fixture detection
- ✅ Real-time traffic routes (2 options)
- ✅ Automatic stadium lookup
- ✅ Bridge & ferry detection

---

## 📋 Full Configuration (All Options)

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    position: "top_right",
    config: {
        // ===== REQUIRED SETTINGS =====
        apiTomTomKey: "YOUR_TOMTOM_API_KEY",
        homeLatitude: 57.35066,
        homeLongitude: -3.59404,
        
        // ===== TEAM SETTINGS =====
        teamName: "Celtic",                                    // Your team name
        teamId: "133647",                                      // TheSportsDB team ID (auto-resolved if blank)
        
        // ===== FIXTURE DATA SOURCES (API SETTINGS) =====
        apiUrl: "https://www.thesportsdb.com/api/v1/json/3",  // Primary fixture source
        season: "auto",                                        // Auto-detect current season or "2024-2025"
        fallbackSeason: "2025-2026",                           // Fallback if auto-detection fails
        
        // League IDs for fixture filtering (TheSportsDB League IDs)
        // Scottish Leagues: Premier League (4330), Championship (4364), League One (4363), League Two (4888)
        leagueIds: ["4330", "4364", "4363", "4888"],
        
        // European/UEFA Competition IDs (Champions League, Europa League, Conference League)
        uefaLeagueIds: ["4480", "4481", "5071"],
        
        // ===== FIXTURE SOURCE OPTIONS =====
        useSearchEventsFallback: true,                         // Use search events as fallback fixture source
        strictLeagueFiltering: true,                           // Only show fixtures from specified league IDs
        useSharedFixturesCache: false,                         // Copy fixtures from MMM-MyTeams-Fixtures cache
        
        // Multi-API fixture provider settings
        useMultiAPIProvider: false,                            // Enable ESPN/BBC Sport as fallback
        apiPriority: ["thesportsdb", "espn", "bbcsport"],     // Order to try APIs
        mergeFixtures: false,                                  // Merge from all sources (true) or use first (false)
        
        // Official website fixture fallback (for teams not in major APIs)
        useOfficialWebsiteFallback: false,                    // Enable scraping official club website
        officialWebsiteFixtureUrl: "",                         // E.g., "https://www.celticfc.com/fixtures/"
        
        // ===== UPDATE INTERVALS =====
        fixtureUpdateInterval: 24 * 60 * 60 * 1000,           // Refresh fixtures every 24 hours (ms)
        routeUpdateInterval: 10 * 60 * 1000,                  // Refresh routes every 10 minutes (ms)
        
        // ===== DISPLAY OPTIONS =====
        showDelay: true,                                       // Show traffic delay in route summary
        showWaypoints: true,                                   // Show bridges, ferries, motorways
        maxRoutes: 2,                                          // 1 (fastest) or 2 (fastest + shortest)
        units: "imperial",                                     // "imperial" (miles) or "metric" (km)
        
        // ===== ROUTE FEATURES =====
        showEurotunnel: true,                                  // Detect Channel Tunnel (Eurotunnel)
        showFerryDetails: true,                                // Show ferry operator & crossing time
        avoidTolls: false,                                     // Plan routes avoiding tolls
        
        // ===== FUEL COST ESTIMATION =====
        showFuelCost: true,                                    // Show estimated fuel cost per route
        fuelEfficiency: 8.0,                                   // Litres per 100km (8.0 ≈ 35 MPG)
        fuelPricePerLitre: 1.45,                               // £1.45 (GBP) or €1.60 (EUR), etc.
        
        // ===== API REQUEST SETTINGS =====
        requestTimeout: 20000,                                 // API timeout in milliseconds (20s)
        maxRetries: 3,                                         // Retry failed API requests 3 times
        
        // ===== DEBUG & TESTING =====
        debug: false,                                          // Enable console logging
        dateOverride: null,                                    // Test fixture: "2025-11-27"
        
        // ===== STADIUM DATABASE UPDATES =====
        enableStadiumUpdateNotification: true,                 // Show update button for stadium database
        
        // ===== THEME CUSTOMIZATION =====
        darkMode: null,                                        // null=auto, true=force dark, false=force light
        fontColorOverride: null,                               // Override text color: "#FFFFFF", "#00FF41"
        borderColorOverride: null,                             // Override border color: "#FFD700"
        opacityOverride: null,                                 // Override opacity: 0.8 (0.0-1.0)
        
        // ===== NEUTRAL VENUE OVERRIDES =====
        // For special matches at neutral venues (cup finals, playoff deciders, etc.)
        neutralVenueOverrides: {
            enabled: false,
            matches: [
                // Venue in football_stadiums.csv - just use name (coordinates auto-resolved)
                // { date: "2025-11-02", opponent: "Rangers", venue: "Hampden Park" },

                // Venue NOT in CSV - provide hardcoded coordinates
                // Scottish neutral venue example
                // { 
                //     date: "2025-12-02", 
                //     opponent: "Hearts", 
                //     venue: "Murrayfield Stadium",
                //     latitude: 55.9415,
                //     longitude: -3.2388,
                //     team: "Edinburgh Rugby",
                //     postCode: "EH14 8XZ"
                // },

                // European neutral venue example
                // {
                //     date: "2025-05-15",
                //     opponent: "Feyenoord",
                //     venue: "De Kuip",
                //     latitude: 51.8808,
                //     longitude: 4.2793,
                //     team: "Feyenoord",
                //     postCode: "3077 GC"
                // }
            ]
        }
    }
}
```

---

## ⚙️ Configuration Options Reference

### 1️⃣ Required Settings

| Option | Type | Example | Description |
|--------|------|---------|-------------|
| **apiTomTomKey** | String | "YOUR_API_KEY" | TomTom routing API key ([Get here](https://developer.tomtom.com)) - Required for route calculation |
| **homeLatitude** | Number | 57.35066 | Your home latitude in decimal format (4+ decimal places for accuracy) |
| **homeLongitude** | Number | -3.59404 | Your home longitude in decimal format (4+ decimal places for accuracy) |

---

### 2️⃣ Team Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **teamName** | String | "Celtic" | Your team name (e.g., "Celtic", "Liverpool", "Eintracht Frankfurt", "PSV Eindhoven") |
| **teamId** | String | "133647" | TheSportsDB team ID - Auto-resolves if blank (only needed for duplicate names) |

---

### 3️⃣ Fixture Data Sources (API Settings)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **apiUrl** | String | "https://www.thesportsdb.com/api/v1/json/3" | Primary fixture source API endpoint - TheSportsDB |
| **season** | String | "auto" | Season format: "auto" (current) or "2024-2025" format |
| **fallbackSeason** | String | "2025-2026" | Used if auto-detection fails or current season not available |
| **leagueIds** | Array | ["4330","4364","4363","4888"] | TheSportsDB League IDs to fetch fixtures from (see `football_teams_database.csv` or check this web site "https://www.thesportsdb.com/sport/leagues" ) |
| **uefaLeagueIds** | Array | ["4480","4481","5071"] | UEFA competition IDs (Champions League, Europa League, Conference League) |
| **useSearchEventsFallback** | Boolean | true | Use "search events" API as fallback when primary API fails |
| **strictLeagueFiltering** | Boolean | true | Only show fixtures from leagueIds/uefaLeagueIds (false = show all fixtures) |
| **useSharedFixturesCache** | Boolean | false | Copy cached fixtures from MMM-MyTeams-Fixtures module if installed |

---

### 4️⃣ Multi-API Fixture Provider (Advanced)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **useMultiAPIProvider** | Boolean | false | Enable fallback to ESPN/BBC Sport if TheSportsDB fails - See [API_PRIORITY_GUIDE.md](API_PRIORITY_GUIDE.md) |
| **apiPriority** | Array | ["thesportsdb","espn","bbcsport"] | Order to try APIs: "thesportsdb", "espn", "bbcsport" |
| **mergeFixtures** | Boolean | false | Merge fixtures from all APIs (true) or use first successful API (false) |

---

### 5️⃣ Official Website Fallback (Non-Major Leagues)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **useOfficialWebsiteFallback** | Boolean | false | Enable web scraping of official club website for fixture data - [See Guide](OFFICIAL_WEBSITE_FALLBACK_GUIDE.md) |
| **officialWebsiteFixtureUrl** | String | "" | URL to club's fixture page (e.g., "https://www.celticfc.com/fixtures/") |

---

### 6️⃣ Update Intervals (Refresh Timing)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **fixtureUpdateInterval** | Number | 86400000 | Refresh fixtures every N milliseconds (86400000 = 24 hours) |
| **routeUpdateInterval** | Number | 600000 | Refresh traffic routes every N milliseconds (600000 = 10 minutes) |

---

### 7️⃣ Display Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **showDelay** | Boolean | true | Show traffic delay estimate in route summary (e.g., "+15 mins traffic") |
| **showWaypoints** | Boolean | true | Show bridges, ferries, motorways, and other waypoints |
| **maxRoutes** | Number | 2 | Number of routes to display: 1 (fastest only) or 2 (fastest + shortest) |
| **units** | String | "imperial" | Distance/fuel units: "imperial" (miles, gallons) or "metric" (km, litres) |

---

### 8️⃣ Route Features & Waypoints

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **showEurotunnel** | Boolean | true | Detect and highlight Channel Tunnel (Eurotunnel) crossing in route |
| **showFerryDetails** | Boolean | true | Show ferry operator name and estimated crossing time (e.g., "P&O, ~90 min") |
| **avoidTolls** | Boolean | false | Calculate routes avoiding toll roads (may increase time/distance) |

---

### 9️⃣ Fuel Cost Estimation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **showFuelCost** | Boolean | true | Show estimated fuel cost for each route |
| **fuelEfficiency** | Number | 8.0 | Vehicle fuel efficiency in L/100km (8.0 ≈ 35 MPG, 5.0 ≈ 50 MPG) |
| **fuelPricePerLitre** | Number | 1.45 | Current fuel price per litre in your local currency (£1.45 UK, €1.60 EU) |

---

### 🔟 API Request Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **requestTimeout** | Number | 20000 | API request timeout in milliseconds (20000 = 20 seconds) |
| **maxRetries** | Number | 3 | Maximum retry attempts for failed API requests |

---

### 1️⃣1️⃣ Debug & Testing

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **debug** | Boolean | false | Enable console logging showing API calls, cache hits, fixture lookups (check browser F12 console) |
| **dateOverride** | String | null | Test specific fixtures by date format "YYYY-MM-DD" (e.g., "2025-11-27" for Feyenoord vs Celtic) |

---

### 1️⃣2️⃣ Stadium Database Updates

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **enableStadiumUpdateNotification** | Boolean | true | Show "Update Stadium Database" button in UI - [See Guide](STADIUM_UPDATE_NOTIFICATION_GUIDE.md) |

---

### 1️⃣3️⃣ Theme Customization

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **darkMode** | Boolean/null | null | null=auto-detect (MagicMirror theme), true=force dark theme, false=force light theme |
| **fontColorOverride** | String/null | null | Override text color with hex code (e.g., "#FFFFFF" white, "#00FF41" neon green) |
| **borderColorOverride** | String/null | null | Override border color with hex code (e.g., "#FFD700" gold, "#FF0000" red) |
| **opacityOverride** | Number/null | null | Override background opacity: 0.0 (transparent) to 1.0 (opaque) |

---

### 1️⃣4️⃣ Neutral Venue Overrides (Special Matches)

For special matches at neutral venues (cup finals, playoff deciders, etc.), manually override the venue:

```javascript
neutralVenueOverrides: {
    enabled: true,  // Enable neutral venue overrides
    matches: [
        // Example 1: Venue in football_stadiums.csv (coordinates auto-resolved)
        {
            date: "2025-11-02",
            opponent: "Rangers",
            venue: "Hampden Park"
        },
        
        // Example 2: Venue NOT in database (hardcode coordinates)
        {
            date: "2025-12-02",
            opponent: "Hearts",
            venue: "Murrayfield Stadium",
            latitude: 55.9415,
            longitude: -3.2388,
            team: "Edinburgh Rugby",
            postCode: "EH14 8XZ"
        },
        
        // Example 3: European neutral venue
        {
            date: "2025-05-15",
            opponent: "Feyenoord",
            venue: "De Kuip",
            latitude: 51.8808,
            longitude: 4.2793,
            team: "Feyenoord",
            postCode: "3077 GC"
        }
    ]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **neutralVenueOverrides.enabled** | Boolean | false | Enable/disable neutral venue overrides |
| **neutralVenueOverrides.matches** | Array | [] | Array of override match objects with date, opponent, venue, (optional) coordinates |

## Getting Your Coordinates

1. Go to [Google Maps](https://maps.google.com)
2. Right-click on your home location
3. Click the coordinates that appear
4. Copy latitude and longitude values to config

## Configuration Examples

### Scottish Team (Celtic)
```javascript
config: {
    teamName: "Celtic",
    teamId: "133647",
    leagueIds: ["4330", "4364", "4363", "4888"],
    uefaLeagueIds: ["4480", "4481", "5071"]
}
```

### Testing Specific Fixture
```javascript
config: {
    dateOverride: "2025-11-27",  // Feyenoord vs Celtic
    debug: true
}
```

### Performance Optimization
```javascript
config: {
    fixturesCacheTTL: 60 * 60 * 1000,  // 1 hour
    routeUpdateInterval: 30 * 60 * 1000,  // 30 minutes
    useSharedFixturesCache: true  // Share with other MMM-MyTeams modules
}
```

### Custom Styling
```javascript
config: {
    darkMode: true,
    fontColorOverride: "#00FF41",  // Green text
    borderColorOverride: "#FFD700",  // Gold borders
    opacityOverride: 0.95
}

```


