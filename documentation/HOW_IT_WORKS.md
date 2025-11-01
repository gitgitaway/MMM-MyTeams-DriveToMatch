# MMM-MyTeams-DriveToMatch
# Author: gitgitaway

A MagicMirror² module that automatically detects your team`s next fixture and shows the quickest and shortest driving routes to the match venue using real-time traffic data from the TomTom API (Free API Key required) and data from thesportsdb.com (Free API) with backup from FootballWebPages.com scrapper.  The module works for all football teams and all leagues (All domestic and European competitions)


## Shared Request Manager

This module includes a **Shared Request Manager** (`shared-request-manager.js`) that coordinates HTTP requests across multiple MagicMirror modules to prevent API conflicts, timeouts, and rate limiting issues.

### Why It's Needed

When multiple modules make simultaneous API requests, they can:
- Overwhelm APIs causing rate limiting (429 errors)
- Create network congestion leading to timeouts
- Interfere with each other's data loading
- Cause slow or failed module loading

### How It Works

The Shared Request Manager is a **global singleton** that:
- ✅ Queues all HTTP requests from all modules
- ✅ Processes requests sequentially (no simultaneous requests)
- ✅ Implements configurable throttling between requests (default: 1200ms)
- ✅ Provides per-domain rate limiting
- ✅ Deduplicates identical simultaneous requests
- ✅ Automatically retries failed requests with exponential backoff
- ✅ Supports priority levels for urgent requests
- ✅ Includes comprehensive debug logging

### Integration with Other Modules

If you use my other MMM-MyTeams modules, they allready use the same `shared-request-manager.js` file:
- MMM-MyTeams-Fixtures
- MMM-MyTeams-LeagueTable
- MMM-MyTeams-Honours
- MMM-Celtic-OnThisDay

**To integrate other modules which use API calling :** Copy `shared-request-manager.js` from this module to each of the other modules' directories. This ensures all modules coordinate their API requests through the same global queue. See seperate user guid for more details

### Configuration

The request manager is pre-configured with sensible defaults:
- **Throttle delay**: 1200ms between requests
- **Max retries**: 3 attempts with exponential backoff
- **Timeout**: 15000ms per request
- **Priority levels**: 0 (highest) to 2 (lowest)

No additional configuration is required unless you need to customize these values in the `shared-request-manager.js` file.

## Multi-Language Support

MMM-MyTeams-DriveToMatch supports **9 languages** out of the box! The module automatically detects your MagicMirror's configured language.

### Database Format

The `football_teams_database.csv` file uses the following format:
```csv
Team,Stadium,Latitude,Longitude,Country,League,Location,Stadium_Capacity,Post_Code
Celtic FC,Celtic Park,55.8611,-4.2056,Scotland,SPFL Premiership,Glasgow,60411,G40 3RE
```

### Backup Files

Backups are automatically created in the `backups` folder with timestamps:
```
backups/football_stadiums_20250126_143022.csv
```

You can restore a backup by copying it over the main `football_teams_database.csv` file.

## API Limits
TheSportsDB: Free tier allows reasonable usage for personal projects
TomTom: Free tier includes 2,500 requests per day

## Using Date Override for Testing

The `dateOverride` config option allows you to display a specific fixture by date instead of the next upcoming fixture. This is useful for:
- Testing European fixtures (e.g., Feyenoord, Midtjylland)
- Planning routes for future matches
- Verifying waypopint detection on specific routes

### Example: Display Feyenoord Fixture
```javascript
config: {
    dateOverride: "2025-11-27",  // Feyenoord vs Celtic (UEFA Europa League)
    debug: true                   // Enable logging to see fixture selection
}
```

### Example: Display Midtjylland Fixture
```javascript
config: {
    dateOverride: "2025-11-06",  // Midtjylland vs Celtic (UEFA Europa League)
    debug: true
}
```

### Example: Next Upcoming Fixture (Default)
```javascript
config: {
    dateOverride: null,  // Show next chronological fixture
    debug: true
}
```

**Important Notes:**
- Date format must be `"YYYY-MM-DD"` (with quotes)
- If no fixture exists on the specified date, module falls back to next fixture
- Each date has its own cache entry (5-minute TTL)
- Changing `dateOverride` invalidates cache and triggers fresh API fetch

---

## Saving Routes with Turn-by-Turn Directions

The module allows you to save any displayed route with complete turn-by-turn navigation instructions for offline reference or trip planning.

### How to Save a Route

1. **Display the routes** for your desired fixture (the module shows 2 route options by default)
2. **Click the route type badge** to save that specific route:
   - Click "⚡ Fastest" to save the fastest route
   - Click "📏 Shortest" to save the shortest route
3. **Visual feedback**: The badge scales and glows when you hover over it
4. **Confirmation**: A notification appears showing the saved filename

### Saved File Format

Routes are saved as JSON files in the `mySavedRoutes` folder with the filename format:
```
OpponentName - StadiumName.json
```

**Examples:**
- `Rangers - Ibrox Stadium.json`
- `Dundee - Dens Park.json`
- `Feyenoord - De Kuip.json`

### What's Included in Saved Routes

Each saved route file contains comprehensive navigation data:

#### 1. Match Details
- Opponent name and match type (Home/Away)
- Teams, date, venue, post code
- Competition name

#### 2. Route Details
- Route type (FASTEST or SHORTEST)
- Total distance and duration
- Traffic delay information
- Estimated fuel cost

#### 3. Turn-by-Turn Directions
Complete step-by-step navigation instructions with:
- Numbered steps (1, 2, 3...)
- Instruction text (e.g., "Turn right onto M8")
- Distance from start point for each step
- Road numbers when available


### File Overwriting Behavior

**Important:** Saving a route to the same opponent's stadium will overwrite the previous file. This ensures you always have the latest route data.

If you want to preserve multiple routes to the same venue:
1. Manually rename the saved file before saving a new route
2. Or add a suffix like "(Fastest)" or "(Shortest)" to distinguish them



### Use Cases

- **Trip Planning**: Save routes in advance and review turn-by-turn directions before match day
- **Offline Navigation**: Print or save routes for areas with poor mobile signal
- **Route Comparison**: Save both fastest and shortest routes to compare options
- **Historical Reference**: Keep a record of routes taken to different stadiums
- **Sharing**: Share route files with fellow supporters traveling to away matches

---

## GPS Bridge Detection

The module uses GPS-based bridge detection to identify when your route crosses major Scottish bridges. This works even when TomTom's turn-by-turn instructions don't mention the bridge name. You can add GPS coordinates for your countries major enroute waypoints

### How It Works
1. TomTom API returns route coordinates (latitude/longitude points)
2. Module calculates distance from each route point to all includedbridge coordinates
3. If distance ≤ bridge detection radius (0.2-0.5km), bridge is detected
4. Uses Haversine formula for accurate great-circle distance calculation
5. Detected bridges appear in waypoints list

### Supported Bridges (20 Total) - you can add your major waypoint landnmarks in the ,js
- **Major Crossings**: Queensferry Crossing, Forth Road Bridge, Forth Bridge, Erskine Bridge
- **Glasgow Bridges**: Kingston Bridge, Clyde Arc, Squinty Bridge, Clyde Bridge, and 5 more
- **Highland Bridges**: Skye Bridge, Connel Bridge, Ballachulish Bridge
- **East Coast**: Tay Road Bridge, Kincardine Bridge, Clackmannanshire Bridge
- **North**: Cromarty Bridge, Dornoch Firth Bridge, Friarton Bridge

### Detection Accuracy
- **Large bridges** (0.5km radius): Very reliable (Queensferry, Erskine, Tay)
- **Medium bridges** (0.3km radius): Reliable (Connel, Ballachulish)
- **Small bridges** (0.2km radius): May miss if route doesn't pass close (Glasgow city bridges)

### Console Output Example
```
[LOG] MMM-MyTeams-DriveToMatch: GPS detected bridge: Queensferry Crossing (distance: 0.12km)
[LOG] MMM-MyTeams-DriveToMatch: GPS detected bridge: Forth Road Bridge (distance: 0.08km)
[LOG] MMM-MyTeams-DriveToMatch: GPS bridge detection found 3 bridges
```

---

## European Fixtures

The module fully supports European fixtures (UEFA Champions League, Europa League, Conference League) with special features:

### Automatic Ferry Detection
For European fixtures, the module automatically adds **Ferry)** to the waypoints list. This helps plan ferry crossings for continental away matches.

### Waypoint Priority
Waypoints are displayed in priority order:
1. **Ferry** (for European fixtures)
2. **Bridges** (GPS-detected bridges)
3. **Motorways** (M8, M90, M9, etc.)
4. **A-roads** (A92, A90, A1, etc.)

Up to 5 waypoints are shown per route.

### Example Console Output (European Fixture)
```
[LOG] MMM-MyTeams-DriveToMatch: Selected fixture - Feyenoord (UEFA Europa League) [european] on 2025-11-27
[LOG] MMM-MyTeams-DriveToMatch: Added Amsterdam Ferry for European fixture
[LOG] MMM-MyTeams-DriveToMatch: GPS detected bridge: Queensferry Crossing (distance: 0.12km)
[LOG] MMM-MyTeams-DriveToMatch: Route 1: waypoints: ['Amsterdam Ferry (DFDS)', 'Queensferry Crossing', 'M90', 'M9', 'M8']
```

---

### Debug Mode
Enable debug mode in config to see detailed logging:
```javascript
config: {
    debug: true
}
```

This will show:
- Fixture search and selection process
- Cache key and cache hit/miss status
- GPS bridge detection with distances
- Route calculation and waypoint extraction
- API calls and responses

## Credits

TheSportsDB: Fixture data API
FotballWebPages: Fixture data API
TomTom: Routing and traffic data API
MagicMirror²: The amazing smart mirror platform





See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

