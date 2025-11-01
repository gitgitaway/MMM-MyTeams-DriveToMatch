# Neutral Venue Overrides Feature

## Overview

The `neutralVenueOverrides` feature allows you to manually configure venues for fixtures when the automatic neutral venue (Hampden Park) detection fails or when you need to override the detected venue for a specific match if for whatever reason it is to be played at a neutral venue.

This is useful for:
- ✅ Fixtures at neutral venues not automatically detected
- ✅ Reassigning a fixture to a different neutral venue
- ✅ Cup fixtures that don't trigger an automatic Hampden detection
- ✅ Special events played at alternative venues

---

## Configuration

Add this to your `config.js` in the `MMM-MyTeams-DriveToMatch` module section:

```javascript
neutralVenueOverrides: {
    enabled: true,  // Set to true to enable overrides
    matches: [
        // Example 1: Venue exists in `football-teams-database.csv` - just use the name
        { 
            date: "2025-11-02", 
            opponent: "Rangers", 
            venue: "Hampden Park" 
        },
        
        // Example 2: Neutral venue not in CSV - provide hardcoded coordinates
        {
            date: "2025-12-20",
            opponent: "Hearts",
            venue: "Murrayfield Stadium",
            latitude: 55.9415,
            longitude: -3.2388,
            team: "Edinburgh Rugby",
            postCode: "EH14 8XZ"
        },
        
        // Example 3: European neutral venues - hardcoded coordinates
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

---

## How It Works

### Priority Order

The module checks venues in this order:

1. **TIER 0: Neutral Venue Overrides** ⭐ (Highest Priority - if enabled and matching)
2. **TIER 1-3: Hampden Park Detection** (Cup semi-finals/finals)
3. **Default: Team Stadiums** (Home or Away team ground)

If a neutral venue override matches the fixture date AND opponent, it will be used instead of Hampden detection.

---

## Configuration Options

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Set to `true` to enable the feature |
| `matches` | array | Array of override definitions |

### Per-Match Override Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | ✅ Yes | Match date in `YYYY-MM-DD` format |
| `opponent` | string | ✅ Yes | Opponent team name (case-insensitive, partial match works) |
| `venue` | string | ✅ Yes | Venue name (will be looked up in CSV or use hardcoded coords) |
| `latitude` | number | ❌ Optional | Latitude if venue not in CSV (e.g., `55.9415`) |
| `longitude` | number | ❌ Optional | Longitude if venue not in CSV (e.g., `-3.2388`) |
| `team` | string | ❌ Optional | Team name for display purposes |
| `postCode` | string | ❌ Optional | Postal code for display purposes |

---

## Venue Resolution Strategy

### Step 1: Check CSV Database
If the venue name exists in `football_stadiums.csv`, coordinates are automatically loaded from there.

**Stadiums in CSV include:**
- Celtic Park
- Ibrox Stadium
- Hampden Park
- Tynecastle Park
- Easter Road
- And 30+ other Scottish stadiums as well as some 450+ stadiums world wide

### Step 2: Use Hardcoded Coordinates
If the venue is not in CSV, the module looks for `latitude` and `longitude` in the override definition.
You can find the lat lon (decimal coordinates) from various online tools like Google Maps or GPS-Coordinates.org.
Format as: `latitude: XX.XXXX, longitude: -X.XXXX`

### Step 3: Warning
If venue name is provided but not found anywhere and no coordinates given, a warning is logged with instructions to add hardcoded coordinates.

---

## Examples

### Example 1: Override Hampden Detection for a Specific Date

```javascript
{
    date: "2025-11-02",
    opponent: "Rangers",
    venue: "Hampden Park"  // Found in CSV automatically
}
```

**Logs:**
```
[neutralVenueOverride] Found match for 2025-11-02 vs Rangers: "Hampden Park"
[neutralVenueOverride] Resolved from CSV: Hampden Park (55.8258, -4.2519)
⭐ MMM-MyTeams-DriveToMatch: Using neutral venue override "Hampden Park" for 2025-11-02 vs Rangers
```

---

### Example 2: Add a Neutral Venue NOT in CSV (Scotland)

If Celtic plays Hearts at Murrayfield (neutral venue), add:

```javascript
{
    date: "2025-12-20",
    opponent: "Hearts",
    venue: "Murrayfield Stadium",
    latitude: 55.9415,      // Scottish Rugby headquarters
    longitude: -3.2388,
    team: "Edinburgh Rugby",
    postCode: "EH14 8XZ"
}
```

**Logs:**
```
[neutralVenueOverride] Found match for 2025-12-20 vs Hearts: "Murrayfield Stadium"
[neutralVenueOverride] Using hardcoded coordinates for Murrayfield Stadium: (55.9415, -3.2388)
⭐ MMM-MyTeams-DriveToMatch: Using neutral venue override "Murrayfield Stadium" for 2025-12-20 vs Hearts
```

---

### Example 3: European Neutral Venue (Estádio Nacional Portugal)

```javascript
{
    date: "2025-05-15",
    opponent: "Inter Milan",
    venue: "Estádio Nacional",
    latitude: 38.7167,
    longitude: -9.1333,
    team: "Portugal",
    postCode: "1495-751"
}
```

---

## Finding Coordinates

### Using Google Maps
1. Search for the venue on Google Maps
2. Right-click on the location
3. Copy the latitude/longitude shown
4. Format as: `latitude: XX.XXXX, longitude: -X.XXXX`

### Using Online Tools
- [LatLong.net](https://www.latlong.net/)
- [GPS-Coordinates.org](https://www.gps-coordinates.org/)

### Example Coordinates for Common Venues

| Venue | Latitude | Longitude | Notes |
|-------|----------|-----------|-------|
| Hampden Park | 55.8256 | -4.2519 | Glasgow, Scotland |
| Murrayfield Stadium | 55.9415 | -3.2388 | Edinburgh, Scotland |
| Celtic Park | 55.8496 | -4.2056 | Glasgow, Scotland |
| De Kuip | 51.8808 | 4.2793 | Rotterdam, Netherlands |
| Ibrox Stadium | 55.853 | -4.3091 | Glasgow, Scotland |

---

## Matching Rules

### Date Matching
- Must be **exact match** in `YYYY-MM-DD` format
- Example: `"2025-11-02"` matches fixture dated 2025-11-02

### Opponent Matching
- **Case-insensitive** (Rangers = rangers = RANGERS)
- **Partial matching supported** (Rangers matches Ranger, etc.)
- Checking both directions:
  - `opponent.includes(configName)` 
  - `configName.includes(opponent)`

Examples:
- `"Range"` will match opponent `"Rangers"` ✅
- `"Rangers"` will match opponent `"Rangers"` ✅
- `"Rangers United"` will NOT match opponent `"Rangers"` ✅ (one direction matches)
- `"SEVCO"` will not match opponent `"Rangers"` ( except in the minds of the Scottish mainstream media )

---

## Debugging

Enable debug logging in config to see override processing:

```javascript
debug: true,  // Enable debug logging

neutralVenueOverrides: {
    enabled: true,
    matches: [ ... ]
}
```

**Watch for these log messages:**

```
✅ [neutralVenueOverride] Found match for 2025-11-02 vs Rangers
✅ [neutralVenueOverride] Resolved from CSV
✅ [neutralVenueOverride] Using hardcoded coordinates
⭐ MMM-MyTeams-DriveToMatch: Using neutral venue override "..."

❌ [neutralVenueOverride] Not found in CSV
⚠️  [neutralVenueOverride] Venue "..." not found in CSV and no hardcoded coordinates provided
```

---

## Precedence Rules

If a fixture matches multiple detection methods, **Neutral Venue Overrides** always wins:

```
Neutral Override Match 🏆
    ↓ (if not matched)
Hampden Park Detection
    ↓ (if not matched)
Normal Team Stadium
```

---

## Tips & Tricks

### Disable for Testing
```javascript
neutralVenueOverrides: {
    enabled: false,  // Temporarily disable
    matches: [ ... ]
}
```

### Batch Testing Multiple Venues
```javascript
matches: [
    { date: "2025-11-02", opponent: "Rangers", venue: "Hampden Park" },
    { date: "2025-11-15", opponent: "Hearts", venue: "Hampden Park" },
    { date: "2025-12-01", opponent: "Aberdeen", venue: "Hampden Park" }
]
```

### Check Stadium CSV
If a venue should be in the CSV, check `football_stadiums.csv` to see if it's listed:

---

## Troubleshooting

### Override not activating
1. ✅ Check `enabled: true`
2. ✅ Check date format: `YYYY-MM-DD`
3. ✅ Check opponent name matches
4. ✅ Enable debug logging to see matching
5. ✅ Check for typos in date or opponent

### "Venue not found in CSV" warning
- Add full details to the `football_teams_database.csv` file
or
- Add `latitude` and `longitude` to the override definition
- Use Google Maps or GPS-Coordinates.org to find exact coordinates

### Routes still not calculating
- Verify venue coordinates are correct
- Check if it's an away match (opponent's stadium may be used instead)
- Review debug logs for exact issue

---

## Critical Bug Fix (Recently Resolved)

### Issue: Wrong Coordinates Being Used

**What Was Happening:**
In earlier versions, a critical bug could cause neutral venue overrides to use incorrect coordinates:
- Configured venue: "Murrayfield Stadium" (55.9415, -3.2388)
- Actual coordinates used: 40.5992, 19.7339 (Albanian stadium "Bylis Ballsh")

**Root Cause:**
The venue lookup system was falling through to partial CSV matching instead of properly matching hardcoded neutral venues, sometimes returning the first alphabetical entry in the database.

**How It's Fixed:**
- ✅ Neutral venues now use fallback partial word-matching before falling back to CSV
- ✅ Full venue names (e.g., "Murrayfield Stadium") correctly match short keys (e.g., "murrayfield")
- ✅ Cache files now store correct coordinates

**Action Required:**
If you're upgrading, **clear cache files** to remove stale coordinates:
```powershell
Remove-Item "c:\path\to\MMM-MyTeams-DriveToMatch\stadium-cache.json"
Remove-Item "c:\path\to\MMM-MyTeams-DriveToMatch\fixtures-cache.json"
```

Then restart MagicMirror to regenerate caches with correct data.

---

## Version History

- **v1.1** (Current): 🐛 Fixed critical neutral venue coordinate lookup bug
  - Enhanced venue name matching with fallback partial word-matching
  - Improved debug logging to track venue source
  - Safe cache regeneration with correct coordinates
  
- **v1.0** (2025-11-01): Initial implementation with CSV and hardcoded coordinate support
  - Tier 0 priority in venue detection
  - Partial opponent name matching
  - Comprehensive debug logging
  - Helpful error messages with fix suggestions
