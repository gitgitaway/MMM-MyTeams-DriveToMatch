# API Priority Guide

## Overview

MMM-MyTeams-DriveToMatch uses a **multi-tier fixture lookup system** that prioritizes data sources in a specific order. This ensures reliable fixture data regardless of which APIs are available or which team you're tracking.

This guide explains:
- **How API priority works**
- **Which data sources are tried first**
- **When fallbacks activate**
- **How to configure API behavior**

---

## System Architecture

### Complete Fixture Lookup Flow

```
START: Need next fixture
  │
  ├─→ TIER 0: Neutral Venue Overrides
  │   ├─ Is override enabled? → YES
  │   │  └─ Match date found in overrides? 
  │   │     ├─ YES → Use override venue coordinates
  │   │     │        Return fixture with neutral venue ✓
  │   │     └─ NO  → Continue to next tier
  │   └─ Override disabled → Continue to next tier
  │
  ├─→ TIER 1: Cache Check (24-hour TTL)
  │   ├─ Fixture in cache? → YES
  │   │  ├─ Cache valid? (not expired)
  │   │  │  ├─ YES → Return cached fixture ✓
  │   │  │  └─ NO  → Continue to refresh
  │   │  └─ Cache expired → Continue to fetch
  │   └─ No cache → Continue to fetch
  │
  ├─→ TIER 2: Standard TheSportsDB API (Default)
  │   ├─ Use config.apiUrl
  │   ├─ Team ID resolution (if needed)
  │   ├─ Query for upcoming fixtures
  │   │  ├─ Success? → Cache result
  │   │  │            Return fixture ✓
  │   │  └─ Failure? → Continue to next tier
  │
  ├─→ TIER 3: Multi-API Providers (if enabled)
  │   ├─ useMultiAPIProvider: true?
  │   │  ├─ YES → Process per apiPriority order:
  │   │  │
  │   │  │   [1st Priority API]
  │   │  │   ├─ Attempt fetch
  │   │  │   ├─ Success? → Cache result
  │   │  │   │            Return fixture ✓
  │   │  │   └─ Fail → Try next
  │   │  │
  │   │  │   [2nd Priority API]
  │   │  │   ├─ Attempt fetch
  │   │  │   ├─ Success? → Cache result
  │   │  │   │            Return fixture ✓
  │   │  │   └─ Fail → Try next
  │   │  │
  │   │  │   [3rd Priority API]
  │   │  │   ├─ Attempt fetch
  │   │  │   ├─ Success? → Cache result
  │   │  │   │            Return fixture ✓
  │   │  │   └─ Fail → Continue
  │   │  │
  │   │  └─ mergeFixtures: true?
  │   │     ├─ YES → Combine from all APIs
  │   │     │        Return merged fixtures ✓
  │   │     └─ NO  → Already returned first success
  │   │
  │   └─ NO → Skip to next tier
  │
  ├─→ TIER 4: Official Website Fallback (if enabled)
  │   ├─ useOfficialWebsiteFallback: true?
  │   │  ├─ YES → Scrape officialWebsiteFixtureUrl
  │   │  │        ├─ Parsing success?
  │   │  │        │  ├─ YES → Cache result
  │   │  │        │  │        Return fixture ✓
  │   │  │        │  └─ NO  → Continue to error
  │   │  │        └─ URL empty or invalid → Continue to error
  │   │  └─ NO → Continue to error
  │
  └─→ ERROR: No Fixture Found
      ├─ Display error message
      ├─ Retry on next scheduled interval
      └─ Show last known fixture if available
```

---

## Configuration Options

### API Priority Configuration

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    config: {
        // Single API (default - fastest, requires coverage)
        useMultiAPIProvider: false,
        
        // OR Multiple APIs (more reliable, slightly slower)
        useMultiAPIProvider: true,
        apiPriority: ["thesportsdb", "espn", "bbcsport"],
        mergeFixtures: false,  // true = combine all sources, false = stop at first success
        
        // Fallback to official website
        useOfficialWebsiteFallback: false,
        officialWebsiteFixtureUrl: "" // enter your teams offical site for fixtures
    }
}
```

---

## API Details

### Tier 0: Neutral Venue Overrides

**Purpose:** Manual override for specific matches at neutral venues

**When it activates:**
- `neutralVenueOverrides.enabled: true`
- Match date matches an override entry

**Advantages:**
- Most accurate (manually configured)
- Guaranteed coordinates
- Handles special cases (cup finals, European matches)

**Configuration:**
```javascript
neutralVenueOverrides: {
    enabled: true,
    matches: [
        {
            date: "2025-12-02",
            opponent: "Rangers",
            venue: "Hampden Park",
            // Venue in CSV auto-resolves coordinates
            // OR provide manually:
            latitude: 55.9415,
            longitude: -3.2388
        }
    ]
}
```

**See:** [NEUTRAL_VENUE_OVERRIDES.md](./NEUTRAL_VENUE_OVERRIDES.md)

---

### Tier 1: Cache

**Purpose:** Avoid repeated API calls for same fixture

**Cache behavior:**
- **TTL:** 24 hours (configurable: `fixturesCacheTTL`)
- **Storage:** Local JSON file (`fixtures-cache.json`)
- **Shared mode:** Can use MMM-MyTeams-Fixtures cache if enabled

**Configuration:**
```javascript
fixturesCacheTTL: 5 * 60 * 1000,  // 5 minutes for testing
useSharedFixturesCache: false,    // Use MMM-MyTeams-Fixtures cache?
```

**Benefits:**
- Reduces API requests
- Faster module loading
- Survives brief API outages

---

### Tier 2: TheSportsDB API (Default)

**API Provider:** [TheSportsDB.com](https://www.thesportsdb.com/)

**Coverage:**
- ✅ All Major European leagues (Premier League, La Liga, Serie A,Bundesliga, etc.)
- ✅ Most Major international leagues (Austraila, Japan, Canadm USA, Brazil, Argentina etc)
- ✅ UEFA Champions Ieague
- ✅ Scottish Premier League , Scottish Championship, League One, League Two
- ✅ Major international cups (Champions League, Europa League, etc.)
- ⚠️ Some international league coverage
- ⚠️ Limited lower-tier league coverage
- ❌ Some regional/non-league teams

**Limitations:**
- Free tier rate-limited (1 request per second)
- Requires `apiTomTomKey` setup
- May have data lags during busy periods

**Configuration:**
```javascript
apiUrl: "https://www.thesportsdb.com/api/v1/json/3",
season: "auto",              // Automatically detect current season
leagueIds: ["4330", "4364", "4888"], // Scottish leagues - confirgarable for your teams competitions
uefaLeagueIds: ["4480"],     // European competitions
useSearchEventsFallback: true // Try search if direct lookup fails
```

**Example Response:**
```json
{
    "idEvent": "645382",
    "dateEvent": "2025-11-15",
    "strTime": "15:00",
    "strHomeTeam": "Celtic",
    "strAwayTeam": "Hearts",
    "strLeague": "Scottish Premiership"
}
```

---

### Tier 3: Multi-API Providers

**Enabled when:** `useMultiAPIProvider: true`

**Available APIs:**
1. **ESPN**
   - Coverage: Global sports
   - Strength: US/International leagues
   - Weakness: May not cover lower tiers

2. **BBC Sport**
   - Coverage: UK/European focus with some International coverage
   - Strength: Scottish league data
   - Weakness: Page scraping (not ideal)

3. **TheSportsDB** (again, as fallback in chain)

**API Priority Order:**

```javascript
apiPriority: [
    "thesportsdb",   // [1] Try TheSportsDB first
    "espn",          // [2] Try ESPN if TheSportsDB fails
    "bbcsport"       // [3] Try BBC as last resort
]
```

**Merge Behavior:**

```javascript
mergeFixtures: false  // Stop at first success
// vs
mergeFixtures: true   // Combine all successful APIs for more complete data
```

**When to use multi-API:**
- Your team is in multiple leagues
- You want most reliable data
- Team coverage is unpredictable
- You don't mind slightly slower response

**Performance impact:**
- Single API: ~1-2 seconds
- Multi-API (first success): ~2-4 seconds
- Multi-API (merge): ~4-8 seconds

---

### Tier 4: Official Website Fallback

**Purpose:** Scrape fixtures directly from club website

**When to use:**
- Non-league teams
- Regional/lower-tier leagues
- International teams not in major APIs
- Highly specific requirements

**Activation:**
```javascript
useOfficialWebsiteFallback: true,
officialWebsiteFixtureUrl: "https://www.celticfc.com/fixtures/"
```

**Supported formats:**
- HTML tables
- HTML lists
- JSON-LD structured data
- Custom CSS selectors

**Limitations:**
- Slower than API queries (1-3 seconds)
- Fragile to website changes
- May need manual configuration
- Subject to website's rate limiting

**See:** [OFFICIAL_WEBSITE_FALLBACK_GUIDE.md](./OFFICIAL_WEBSITE_FALLBACK_GUIDE.md)

---

## Configuration Scenarios

### Scenario 1: Single Well-Supported Team (Default)

**Use case:** Celtic FC, Liverpool, etc. - major teams in well-covered leagues, may not automaticaly adjust for neutral venues

```javascript
config: {
    teamName: "Celtic",
    teamId: "133647",
    useMultiAPIProvider: false,
    useOfficialWebsiteFallback: false,
    fixturesCacheTTL: 60 * 60 * 1000  // 1 hour cache
}
```

**Result:** Fast, reliable, single API call

---

### Scenario 2: Regional Team with Fallback

**Use case:** Lower-tier Scottish team, may not have API coverage

```javascript
config: {
    teamName: "Lowland FC",
    useMultiAPIProvider: true,
    apiPriority: ["thesportsdb", "espn", "bbcsport"],
    mergeFixtures: false,  // Stop at first success
    useOfficialWebsiteFallback: true,
    officialWebsiteFixtureUrl: "https://lowlandfc.com/fixtures/"
}
```

**Result:** Try multiple APIs, fall back to website if needed

---

### Scenario 3: Multi-League Team

**Use case:** Team plays domestic + European competitions, want all data

```javascript
config: {
    teamName: "Celtic",
    useMultiAPIProvider: true,
    apiPriority: ["thesportsdb", "espn", "bbcsport"],
    mergeFixtures: true,  // Combine from all APIs
    useOfficialWebsiteFallback: true,
    officialWebsiteFixtureUrl: "https://www.celticfc.com/fixtures/",
    neutralVenueOverrides: {
        enabled: true,
        matches: [
            { date: "2025-12-02", opponent: "Rangers", venue: "Hampden Park" }
        ]
    }
}
```

**Result:** Most comprehensive fixture data (slowest but most reliable)

---

### Scenario 4: International Team (Limited Coverage)

**Use case:** Team from country with limited English-language API coverage

```javascript
config: {
    teamName: "Feyenoord",
    homeLatitude: 51.8808,
    homeLongitude: 4.2793,
    useMultiAPIProvider: true,
    apiPriority: ["thesportsdb", "espn"],
    useOfficialWebsiteFallback: true,
    officialWebsiteFixtureUrl: "https://www.feyenoord.nl/wedstrijden/",
    debug: true  // Monitor what works
}
```

**Result:** APIs + website for Dutch Eredivisie coverage

---

## Performance Tuning

### Fastest Configuration (Trade-off: Less reliable)

```javascript
useMultiAPIProvider: false,           // Single API only
useOfficialWebsiteFallback: false,    // No website fallback
fixturesCacheTTL: 24 * 60 * 60 * 1000 // 24-hour cache
```

**Speed:** ~500ms  
**Reliability:** Depends on API coverage

---

### Most Reliable Configuration (Trade-off: Slower)

```javascript
useMultiAPIProvider: true,
apiPriority: ["thesportsdb", "espn", "bbcsport"],
mergeFixtures: true,  // Combine all
useOfficialWebsiteFallback: true,
officialWebsiteFixtureUrl: "https://yourclub.com/fixtures/"
```

**Speed:** ~5-8 seconds  
**Reliability:** Extremely high - will find fixture if it exists anywhere

---

### Balanced Configuration (Recommended)

```javascript
useMultiAPIProvider: false,           // Single API (TheSportsDB)
useOfficialWebsiteFallback: true,     // Enable website fallback only
officialWebsiteFixtureUrl: "https://yourclub.com/fixtures/",
fixturesCacheTTL: 5 * 60 * 1000       // 5-minute cache
```

**Speed:** ~1-2 seconds  
**Reliability:** Very high - most teams covered by APIs + fallback

---

## Troubleshooting

### Problem: "No fixture found"

**Diagnostic flow:**

1. **Check Tier 0 (Neutral Overrides)**
   ```javascript
   // Enable to debug
   neutralVenueOverrides: { enabled: true, matches: [] }
   ```

2. **Check Tier 2 (TheSportsDB)**
   - Verify `teamName` and `teamId` are correct
   - Check at https://www.thesportsdb.com/api/eventslast.php?id=133647 (Celtic example)

3. **Check Tier 3 (Multi-API)**
   ```javascript
   useMultiAPIProvider: true,
   debug: true  // See which APIs are tried
   ```

4. **Check Tier 4 (Website Fallback)**
   - Verify `officialWebsiteFixtureUrl` is correct
   - Visit URL directly to confirm it has fixture data
   - Enable debug to see scraping errors

---

### Problem: Slow fixture loading (>5 seconds)

**Likely cause:** Multi-API or website scraping

**Solution:**
- Disable `useMultiAPIProvider` if you have good API coverage
- Disable website fallback if not needed
- Increase `fixturesCacheTTL` to reduce updates

---

### Problem: Incorrect fixture returned

**Likely cause:** Multiple matches on same day or team ID mismatch

**Solution:**
- Verify team ID using TheSportsDB search
- Add neutral venue override if specific match needs correction
- Check `debug: true` logs for which API provided data

---

## API Status Dashboard

Check API availability:

- **TheSportsDB:** https://www.thesportsdb.com/
- **ESPN:** https://www.espn.com/
- **BBC Sport:** https://www.bbc.com/sport/

---

## See Also

- [Configuration Guide](./CONFIGURATION.md)
- [Official Website Fallback Guide](./OFFICIAL_WEBSITE_FALLBACK_GUIDE.md)
- [Neutral Venue Overrides](./NEUTRAL_VENUE_OVERRIDES.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**Last Updated:** November 2025  
**Status:** Active  
**Compatibility:** MMM-MyTeams-DriveToMatch v1.0+