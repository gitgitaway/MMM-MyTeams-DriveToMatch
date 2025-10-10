# MMM-MyTeams-DriveToMatch
# Author: gitgitaway

A MagicMirror² module that automatically detects your team`s next fixture and shows the quickest and shortest driving routes to the match venue using real-time traffic data from the TomTom API (Free API Key required) and data from thesportsdb.com (Free API) with backup from FootballWebPages.com scrapper.  The module works for all football teams and all leagues (All domestic and European competitions)

## Features

- **Automatic Fixture Detection**: 
- **Real-time Traffic Routes**: 
- **Multi-Language Support**: 9 languages supported (English, Spanish, French, German, Italian, Dutch, Portuguese, Scottish Gaelic, Irish Gaelic )
- **Comprehensive European Football Stadiums Database**: 161 stadia in current version
- **GPS-Based Bridge Detection**: Highlights key waypoints on routes
- **Bridge Detection**: Highlights bridges along routes
- **European Fixture Support**: UEFA Champions League, Europa League, Conference League
- **Major Waypoints**: Displays route via major roads and landmarks  
- **Date Override Testing**: Test specific fixtures by date
- **Save Routes with Turn-by-Turn Directions**:  Fastest/Shortest route
- **Customisable team-themed Styling and overide**: 
- **Responsive Design**: Works on different screen sizes


## Screenshots
*Examples shown with routes to away venues but module also show routes to your home teams stadium - route based on user configarable Home lat/Lon*
- 1: ![Arsenal v Bayern Munich ](./screenshots/screenshotRoute1.png)
- 2: ![Eintract Frankfurt v Liverpool](./screenshots/screenshotRoute2.png)
- 3: ![Feyenoord v Celtic ](./screenshots/screenshotRoute3.png)
- 4: ![Roma v Inter Milan ](./screenshots/screenshotRoute4.png)

## Installation

1. Navigate to your MagicMirror's modules folder:
```bash
cd ~/MagicMirror/modules

```

2. Clone the repositry into your MagicMirror's modules folder:
```bash
git clone https://github.com/gitgitaway/MMM-MyTeams-DriveToMatch

```

3. Install dependancies:
```bash
cd MMM-MyTeams-DriveToMatch
npm install

```

4. Get a TomTom API key:

- Go to TomTom Developer Portal
- Create a free account
- Create a new app and get your API key
- Add the module to your config/config.js file (see Configuration section below)

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

If you use other MMM-MyTeams modules, they should all use the same `shared-request-manager.js` file:
- MMM-MyTeams-Fixtures
- MMM-MyTeams-LeagueTable
- MMM-MyTeams-Honours
- MMM-Celtic-OnThisDay

**To integrate:** Copy `shared-request-manager.js` from this module to each of the other modules' directories. This ensures all modules coordinate their API requests through the same global queue. See user guid for more details

### Configuration

The request manager is pre-configured with sensible defaults:
- **Throttle delay**: 1200ms between requests
- **Max retries**: 3 attempts with exponential backoff
- **Timeout**: 15000ms per request
- **Priority levels**: 0 (highest) to 2 (lowest)

No additional configuration is required unless you need to customize these values in the `shared-request-manager.js` file.

## Multi-Language Support

MMM-MyTeams-DriveToMatch supports **9 languages** out of the box! The module automatically detects your MagicMirror's configured language.

### Supported Languages
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

### How to Change Language

Edit your `config/config.js` file:

```javascript
let config = {
    language: "en",  // Change to your preferred language code
    locale: "en-UK",
    // ... rest of config
}
```

**Examples:**
- For Spanish: `language: "es"`
- For French: `language: "fr"`
- For German: `language: "de"`
- For Scottish Gaelic: `language: "gd"`

Then restart MagicMirror. All module text (loading messages, route labels, buttons, etc.) will display in your chosen language!

📖 **For detailed translation information, see:** [`translations/README.md`](translations/README.md)

## Configuration
Add this to your config/config.js file:
```bash
{
    module: "MMM-MyTeams-DriveToMatch",
    position: "top_right", // Or choose your preferred position
    config: {
        // Required settings
        apiTomTomKey: "YOUR_TOMTOM_API_KEY", // Get from TomTom Developer Portal
        homeLatitude: 58.6373368,  // Your home latitude, minimum of 4 decimal places
        homeLongitude: -3.0688997, // Your home longitude, minimum of 4 decimal places
        
        // Optional settings
        teamName: "Celtic",     // Use your Team name to search for
        teamId: "133647",       // Optional- Use TheSportsDB team ID - Celtic FC = "133647",
        
        // Update intervals
        fixtureUpdateInterval: 60 * 60 * 1000, // 1 hour for fixtures
        routeUpdateInterval: 5 * 60 * 1000,    // 5 minutes for routes
        
        // Display options
        showDelay: true,        // Show traffic delays
        showWaypoints: true,    // Show major waypoints
        maxRoutes: 2,           // Number of routes to show
        units: "metric",        // "metric" or "imperial"
        
        // Debug & Testing
        debug: false,                // Enable debug logging
        dateOverride: null,          // Override to show specific fixture date (format: "YYYY-MM-DD")
                                     // Example: "2025-11-27" for Feyenoord v Celtic fixture
                                     // Set to null for next upcoming fixture
        
        // Theme overrides
        darkMode: null,              // null=auto, true=force dark, false=force light
        fontColorOverride: null,     // e.g., "#FFFFFF" to force white text
        borderColorOverride: null,   // e.g., "#FFFFFF" to force white borders
        opacityOverride: null        // e.g., 1.0 to force full opacity
    }
}

```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **apiTomTomKey** | String | Required | Your TomTom API key from TomTom Developer Portal |
| **homeLatitude** | Number | Required | Your home latitude coordinate (minimum 4 decimal places) |
| **homeLongitude** | Number | Required | Your home longitude coordinate (minimum 4 decimal places) |
| **teamName** | String | "Celtic" | Team name to search for fixtures |
| **teamId** | String | "133647" | TheSportsDB team ID (auto-resolves if blank) |
| **apiUrl** | String | "https://www.thesportsdb.com/api/v1/json/3" | TheSportsDB API endpoint |
| **season** | String | "auto" | Season format (auto-detects current season) |
| **fallbackSeason** | String | "2025-2026" | Fallback season if auto-detection fails |
| **leagueIds** | Array | ["4330", "4364", "4363", "4888"] | League IDs to fetch fixtures from |
| **uefaLeagueIds** | Array | ["4480", "4481", "5071"] | UEFA competition IDs (Champions League, Europa League, Conference League) |
| **useSearchEventsFallback** | Boolean | true | Use search events API as fallback |
| **strictLeagueFiltering** | Boolean | true | Strictly filter fixtures by league IDs |
| **useSharedFixturesCache** | Boolean | false | Copy fixtures from MMM-MyTeams-Fixtures cache |
| **fixtureUpdateInterval** | Number | 86400000 | How often to check for new fixtures (ms) - Default: 24 hours |
| **routeUpdateInterval** | Number | 600000 | How often to update routes (ms) - Default: 10 minutes |
| **showDelay** | Boolean | true | Show traffic delay information |
| **showWaypoints** | Boolean | true | Show major waypoints on routes |
| **maxRoutes** | Number | 2 | Maximum number of routes to display (1-2) |
| **units** | String | "imperial" | Distance units: "metric" (km) or "imperial" (miles) |
| **showEurotunnel** | Boolean | true | Detect and display Eurotunnel crossings |
| **showFerryDetails** | Boolean | true | Show ferry operator and crossing time |
| **avoidTolls** | Boolean | false | Avoid toll roads in route calculation |
| **showFuelCost** | Boolean | true | Show estimated fuel cost for each route |
| **fuelEfficiency** | Number | 8.0 | Fuel efficiency in litres per 100km (8.0 L/100km ≈ 35 MPG) |
| **fuelPricePerLitre** | Number | 1.45 | Fuel price per litre in local currency (e.g., £1.45 for UK) |
| **requestTimeout** | Number | 20000 | API request timeout (ms) |
| **maxRetries** | Number | 3 | Maximum API retry attempts |
| **debug** | Boolean | false | Enable debug logging to console |
| **dateOverride** | String | null | Override date for testing specific fixtures (format: "YYYY-MM-DD") |
| **darkMode** | Boolean | null | Force dark/light mode: null=auto, true=dark, false=light |
| **fontColorOverride** | String | null | Override font color (e.g., "#FFFFFF" for white) |
| **borderColorOverride** | String | null | Override border color (e.g., "#FFFFFF" for white) |
| **opacityOverride** | Number | null | Override opacity (e.g., 1.0 for full opacity)

## Getting Your Coordinates

To find your home coordinates:

- Go to Google Maps
- Right-click on your home location
- Click on the coordinates that appear
- Use the latitude and longitude values in your config

## Supported Teams

The module includes a comprehensive database (`football_stadiums.csv`) with 161 professional teams across 26 countries:

### British Isles
- **Scotland**: 44 teams (SPFL Premiership, Championship, League One, League Two)
- **England**: 51 teams (Premier League + Championship)
- **Wales**: 2 teams (Swansea City, Cardiff City)

### Major European Leagues
- **Spain**: 7 teams (Real Madrid, Barcelona, Atletico Madrid, etc.)
- **Italy**: 7 teams (Inter Milan, AC Milan, Juventus, Atalanta, etc.)
- **Germany**: 7 teams (Bayern Munich, Borussia Dortmund, RB Leipzig, etc.)
- **France**: 7 teams (PSG, Monaco, Brest, Lille, etc.)
- **Portugal**: 4 teams (Benfica, Sporting CP, Porto, Braga)
- **Netherlands**: 6 teams (Feyenoord, PSV Eindhoven, Ajax, etc.)

### Other European Countries
- Turkey, Belgium, Austria, Sweden, Denmark, Czech Republic, Greece, Ukraine, Serbia, Croatia, Norway, Romania, Slovakia, Switzerland, Bulgaria, Azerbaijan, Hungary

For teams not in the database, the module will display "Stadium Lat/Lon Unknown" and show fixture information without route calculation. You can add new teams to `football_stadiums.csv` or use the provided batch file to generate updated databases.

## Updating the Football Stadiums Database

The module includes a Windows batch file (`update_football_stadiums.cmd`) to help you add new teams to the database. This tool provides an interactive menu-driven interface for:

### Features
- **Add League Teams**: Add teams from any country's top two professional leagues
- **Add UEFA Competition Teams**: Add teams competing in Champions League, Europa League, or Conference League for future seasons (e.g., 2025-26, 2026-27)
- **Add Single Team**: Manually add individual teams
- **Automatic Backups**: Creates timestamped backups before making changes
- **Duplicate Detection**: Warns you if a team already exists in the database
- **Data Validation**: Validates GPS coordinates, capacity, and other fields

### How to Use

1. **Run the batch file**:
   ```cmd
   cd c:\Users\[YourUsername]\MagicMirror\modules\MMM-MyTeams-DriveToMatch
   update_football_stadiums.cmd
   ```

2. **Select an option** from the menu:
   - Option 1: Add teams from a country's leagues (e.g., La Liga and Segunda Division)
   - Option 2: Add UEFA competition teams for a specific season
   - Option 3: Add a single team manually
   - Option 4: View current database statistics
   - Option 5: Create a backup of the current database

3. **Enter team information** when prompted:
   - Team Name (e.g., "Real Madrid")
   - Stadium Name (e.g., "Santiago Bernabéu")
   - Latitude (decimal format, e.g., 40.4530)
   - Longitude (decimal format, e.g., -3.6883)
   - Location (City/Town, e.g., "Madrid")
   - Stadium Capacity (e.g., 81044)
   - Post Code (e.g., "28036")

4. **Finding GPS Coordinates**:
   - Go to [Google Maps](https://maps.google.com)
   - Search for the stadium
   - Right-click on the stadium location
   - Click on the coordinates that appear
   - Copy the latitude and longitude values

5. **Restart MagicMirror** to load the updated database

### Database Format

The `football_stadiums.csv` file uses the following format:
```csv
Team,Stadium,Latitude,Longitude,Country,League,Location,Stadium_Capacity,Post_Code
Celtic FC,Celtic Park,55.8611,-4.2056,Scotland,SPFL Premiership,Glasgow,60411,G40 3RE
```

### Backup Files

Backups are automatically created in the `backups` folder with timestamps:
```
backups/football_stadiums_20250126_143022.csv
```

You can restore a backup by copying it over the main `football_stadiums.csv` file.

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

**Example:**
```
1. Head west on London Road - 0.0 km from start
2. Turn right onto M8 - 1.2 km from start
3. At junction 19, take the M8 exit towards Glasgow - 3.5 km from start
4. Continue on M8 for 8.5 miles - 5.8 km from start
5. Take exit 25 towards Govan - 15.2 km from start
```

#### 4. Major Waypoints
Summary of major roads and landmarks:
- Motorways (M8, M90, M9, etc.)
- Major A-roads (A90, A92, etc.)
- Scottish bridges (Queensferry Crossing, Erskine Bridge, etc.)
- Ferry crossings (for European fixtures)

#### 5. Special Features
- Eurotunnel usage (if applicable)
- Ferry crossings (if applicable)

#### 6. GPS Coordinates
- Start location (your home) with latitude/longitude
- Destination (stadium) with latitude/longitude

#### 7. Technical Data
- Raw distance in meters
- Raw duration in seconds
- Traffic delay in seconds
- Timestamp of when route was saved

### File Overwriting Behavior

**Important:** Saving a route to the same opponent's stadium will overwrite the previous file. This ensures you always have the latest route data.

If you want to preserve multiple routes to the same venue:
1. Manually rename the saved file before saving a new route
2. Or add a suffix like "(Fastest)" or "(Shortest)" to distinguish them

### Example Saved File

```json
{
    "=== MATCH DETAILS ===": {
        "Opponent": "Rangers",
        "Home Team": "Rangers",
        "Away Team": "Celtic FC",
        "Match Type": "Away Match",
        "Date": "Saturday, 10 May 2025, 15:00",
        "Venue": "Ibrox Stadium",
        "Post Code": "G51 2XD",
        "Competition": "Scottish Premiership"
    },
    "=== ROUTE DETAILS ===": {
        "Route Type": "FASTEST",
        "Distance": "12.5 miles",
        "Duration": "25 min",
        "Traffic Delay": "5 min",
        "Estimated Fuel Cost": "£2.50"
    },
    "=== TURN-BY-TURN DIRECTIONS ===": [
        "1. Head west on London Road - 0.0 km from start",
        "2. Turn right onto M8 - 1.2 km from start",
        "3. At junction 19, take the M8 exit towards Glasgow - 3.5 km from start",
        "4. Continue on M8 for 8.5 miles - 5.8 km from start",
        "5. Take exit 25 towards Govan - 15.2 km from start",
        "6. Turn left onto A814 - 16.1 km from start",
        "7. Continue on Paisley Road West - 17.3 km from start",
        "8. Turn right onto Edmiston Drive - 19.2 km from start",
        "9. Arrive at Ibrox Stadium on your right - 20.1 km from start"
    ],
    "=== MAJOR WAYPOINTS ===": ["M8", "A814"],
    "=== SPECIAL FEATURES ===": {
        "Eurotunnel": "Not on this route",
        "Ferry Crossing": "Not on this route"
    },
    "=== GPS COORDINATES ===": {
        "Start Location (Your Home)": {
            "Latitude": 55.8642,
            "Longitude": -4.2518
        },
        "Destination (Stadium)": {
            "Latitude": 55.8531,
            "Longitude": -4.3094
        }
    },
    "=== TECHNICAL DATA ===": {
        "Distance (meters)": 20116,
        "Duration (seconds)": 1500,
        "Traffic Delay (seconds)": 300,
        "Saved At": "2025-05-03T14:30:00.000Z"
    }
}
```

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
2. Module calculates distance from each route point to all 20 bridge coordinates
3. If distance ≤ bridge detection radius (0.2-0.5km), bridge is detected
4. Uses Haversine formula for accurate great-circle distance calculation
5. Detected bridges appear in waypoints list

### Supported Bridges (20 Total)
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
2. **Bridges** (GPS-detected Scottish bridges)
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

## Troubleshooting

### No Routes Showing
- Check your TomTom API key is valid
- Verify your home coordinates are correct
- Ensure the venue is in the football-stadiums.csv database (or has coordinates)
- Check console for API errors

### Fixture Not Found
- Check the team name matches exactly (e.g., "Celtic" not "Celtic FC")
- Verify the team ID is correct for TheSportsDB (Celtic: "133647")
- Check if there are upcoming fixtures scheduled
- Enable `debug: true` to see fixture search process

### European Fixtures Not Showing
- This was fixed in v1.1.0 - ensure you have the latest version
- Check console for: `Found X total fixtures (domestic and European)`
- If you see `Found X domestic fixtures`, the fix wasn't applied

### Bridges Not Appearing in Waypoints
- This was fixed in v1.1.0 with GPS-based detection
- Enable `debug: true` to see bridge detection logs
- Check console for: `GPS detected bridge: [Bridge Name] (distance: X.XXkm)`
- If no bridges detected, route may not pass close enough to any bridges

### dateOverride Not Working
- This was fixed in v1.1.0 - cache key now includes dateOverride
- Ensure date format is `"YYYY-MM-DD"` (with quotes)
- Check console for: `(cache key: Celtic_133647_2025-11-27)`
- If cache key doesn't include date, fix wasn't applied
- Try deleting `fixtures-cache.json` and restarting

### API Errors
- Check your internet connection
- Verify API keys are valid and not expired
- Check API usage limits haven't been exceeded (TomTom: 2,500 requests/day)
- Enable `debug: true` for detailed error messages

### Cache Issues
- Delete `fixtures-cache.json` in module directory
- Restart MagicMirror completely (not just refresh)
- Cache TTL is 5 minutes - wait for expiration or restart

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

## Changelog

### v1.2.0 (Latest - 2025-10-05)
- **Added**: Shared Request Manager for coordinating HTTP requests across multiple modules
- **Fixed**: Promise chain bug in queueRequest() that prevented requests from resolving
- **Fixed**: Missing processQueue() method causing "TypeError: this.processQueue is not a function"
- **Enhanced**: Dual processing strategy (immediate + interval-based queue processing)
- **Enhanced**: Request deduplication and automatic retry with exponential backoff
- **Enhanced**: Comprehensive debug logging for troubleshooting
- **Updated**: README.md with Shared Request Manager documentation
- **Added**: .gitignore/INVENTORY.txt - Complete inventory of troubleshooting documentation

### v1.1.0 (2025-10-03)
- **Fixed**: European fixtures now display correctly (removed domestic-only filter)
- **Fixed**: GPS-based bridge detection (20 Scottish bridges with Haversine distance calculation)
- **Fixed**: dateOverride now works correctly (cache key includes date)
- **Enhanced**: Amsterdam Ferry automatically added for European fixtures
- **Enhanced**: Improved debug logging with cache keys and GPS distances

### v1.0.0
- Initial release
- Celtic FC fixture integration
- TomTom routing with traffic
- Scottish grounds database
- Real-time route updates


See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

