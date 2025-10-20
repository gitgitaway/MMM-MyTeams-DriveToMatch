# Configuration Guide

Complete configuration options reference for MMM-MyTeams-DriveToMatch.

## Minimum Configuration (Quick Start)

Add this to your `config/config.js` with only required settings:

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    position: "top_right",
    config: {
        apiTomTomKey: "YOUR_TOMTOM_API_KEY",
        homeLatitude: 57.35066,
        homeLongitude: -3.59404,
        teamName: "Celtic"
    }
}
```

## Full Configuration (All Options)

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    position: "top_right",
    config: {
        // ===== REQUIRED =====
        apiTomTomKey: "YOUR_TOMTOM_API_KEY",
        homeLatitude: 57.35066,
        homeLongitude: -3.59404,
        
        // ===== TEAM SETTINGS =====
        teamName: "Celtic",
        teamId: "133647",
        
        // ===== API SETTINGS =====
        apiUrl: "https://www.thesportsdb.com/api/v1/json/3",
        season: "auto",
        fallbackSeason: "2025-2026",
        leagueIds: ["4330", "4364", "4363", "4888"],
        uefaLeagueIds: ["4480", "4481", "5071"],
        useSearchEventsFallback: true,
        strictLeagueFiltering: true,
        useSharedFixturesCache: false,
        
        // ===== UPDATE INTERVALS =====
        fixtureUpdateInterval: 86400000,
        routeUpdateInterval: 600000,
        
        // ===== DISPLAY OPTIONS =====
        showDelay: true,
        showWaypoints: true,
        maxRoutes: 2,
        units: "metric",
        
        // ===== ROUTE FEATURES =====
        showEurotunnel: true,
        showFerryDetails: true,
        avoidTolls: false,
        
        // ===== FUEL COST =====
        showFuelCost: true,
        fuelEfficiency: 8.0,
        fuelPricePerLitre: 1.45,
        
        // ===== API SETTINGS =====
        requestTimeout: 20000,
        maxRetries: 3,
        
        // ===== DEBUG & TESTING =====
        debug: false,
        dateOverride: null,
        
        // ===== THEME OVERRIDES =====
        darkMode: null,
        fontColorOverride: null,
        borderColorOverride: null,
        opacityOverride: null
    }
}
```

## Configuration Options Reference

### Required Settings

| Option | Type | Example | Description |
|--------|------|---------|-------------|
| **apiTomTomKey** | String | "YOUR_KEY" | TomTom API key (get from TomTom Developer Portal) |
| **homeLatitude** | Number | 57.35066 | Your home latitude (4+ decimal places) |
| **homeLongitude** | Number | -3.59404 | Your home longitude (4+ decimal places) |

### Team Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **teamName** | String | - | Your team name (e.g., "Celtic", "Liverpool"),"Eintracht Frankfurt" |
| **teamId** | String | auto | TheSportsDB team ID (auto-resolves if not provided) |

### API Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **apiUrl** | String | thesportsdb | TheSportsDB API endpoint |
| **season** | String | "auto" | Season format (auto-detects current season) |
| **fallbackSeason** | String | "2025-2026" | Fallback season if auto-detection fails |
| **leagueIds** | Array | Scottish leagues | League IDs to fetch fixtures from |
| **uefaLeagueIds** | Array | UEFA competitions | UEFA competition IDs |
| **useSearchEventsFallback** | Boolean | true | Use search events API as fallback |
| **strictLeagueFiltering** | Boolean | true | Strictly filter fixtures by league IDs |
| **useSharedFixturesCache** | Boolean | false | Copy fixtures from MMM-MyTeams-Fixtures cache |

### Update Intervals

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **fixtureUpdateInterval** | Number | 86400000 | Fixture update interval (ms) - 24 hours |
| **routeUpdateInterval** | Number | 600000 | Route update interval (ms) - 10 minutes |
| **fixturesCacheTTL** | Number | 5*60*1000 | Fixtures cache time-to-live (ms) - 5 minutes |

### Display Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **showDelay** | Boolean | true | Show traffic delay in route summary |
| **showWaypoints** | Boolean | true | Show waypoints (bridges, motorways, ferries) |
| **maxRoutes** | Number | 2 | Number of routes to display (1 or 2) |
| **units** | String | "metric" | Distance units: "metric" (km) or "imperial" (miles) |

### Route Features

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **showEurotunnel** | Boolean | true | Detect and display Eurotunnel crossings |
| **showFerryDetails** | Boolean | true | Show ferry operator and crossing time |
| **avoidTolls** | Boolean | false | Avoid toll roads in route calculation |

### Fuel Cost Calculation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **showFuelCost** | Boolean | true | Show estimated fuel cost per route |
| **fuelEfficiency** | Number | 8.0 | Fuel efficiency in L/100km (8.0 ≈ 35 MPG) |
| **fuelPricePerLitre** | Number | 1.45 | Fuel price per litre (e.g., £1.45, €1.60) |

### API Request Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **requestTimeout** | Number | 20000 | API request timeout (ms) - 20 seconds |
| **maxRetries** | Number | 3 | Maximum retry attempts for failed requests |

### Debug & Testing

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **debug** | Boolean | false | Enable detailed debug logging to console |
| **dateOverride** | String | null | Test specific fixtures (format: "YYYY-MM-DD") |

### Theme Overrides

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **darkMode** | Boolean | null | Force dark/light: null=auto, true=dark, false=light |
| **fontColorOverride** | String | null | Override font color (e.g., "#FFFFFF") |
| **borderColorOverride** | String | null | Override border color (e.g., "#FFFFFF") |
| **opacityOverride** | Number | null | Override opacity (0.0-1.0) |

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
