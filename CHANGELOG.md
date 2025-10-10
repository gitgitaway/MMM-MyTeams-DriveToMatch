# Changelog

All notable changes to the **MMM-MyTeams-DriveToMatch** module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.1] - 2025-01-XX

### 📚 Documentation Fixes

#### **Fixed: README.md Screenshot Display Issue**
- **Screenshot File Renamed**: Fixed broken screenshot reference on line 24
  - Renamed `screenshotRoute2l.png` to `screenshotRoute2.png` to match README reference
  - All 4 screenshots now display correctly in README
  - Issue: Filename typo in screenshot file prevented image #2 from rendering

#### **Enhanced: Configuration Options Table**
- **Fully Populated Config Table**: Expanded configuration options table from 14 to 35 complete options
  - Added all missing configuration options with proper formatting
  - Converted single-line table to properly formatted multi-line markdown table
  - Added detailed descriptions for each option
  - Organized by category: Required, API Settings, Update Intervals, Display Options, Route Features, Fuel Cost, Debug, Theme Overrides
- **New Options Documented**:
  - `apiUrl` - TheSportsDB API endpoint
  - `season` - Season format (auto-detects current season)
  - `fallbackSeason` - Fallback season if auto-detection fails
  - `leagueIds` - League IDs to fetch fixtures from
  - `uefaLeagueIds` - UEFA competition IDs
  - `useSearchEventsFallback` - Use search events API as fallback
  - `strictLeagueFiltering` - Strictly filter fixtures by league IDs
  - `useSharedFixturesCache` - Copy fixtures from MMM-MyTeams-Fixtures cache
  - `showEurotunnel` - Detect and display Eurotunnel crossings
  - `showFerryDetails` - Show ferry operator and crossing time
  - `avoidTolls` - Avoid toll roads in route calculation
  - `showFuelCost` - Show estimated fuel cost for each route
  - `fuelEfficiency` - Fuel efficiency in litres per 100km
  - `fuelPricePerLitre` - Fuel price per litre in local currency
  - `dateOverride` - Override date for testing specific fixtures
  - `darkMode` - Force dark/light mode
  - `fontColorOverride` - Override font color
  - `borderColorOverride` - Override border color
  - `opacityOverride` - Override opacity
- **Enhanced Descriptions**: Added units, examples, and clarifications for all options
- **Files Modified**:
  - `README.md` (lines 24, 178-214) - Fixed screenshot link and expanded config table

#### **Fixed: Translation Quick Start Guide**
- **Flag Emojis Corrected**: Fixed incorrect flag emojis in language table (lines 34-35)
  - Changed Scottish Gaelic flag from `🇬A` to `🏴󠁧󠁢󠁳󠁣󠁴󠁿` (Scotland flag)
  - Changed Irish Gaelic flag from `🇬D` to `🇮🇪` (Ireland flag)
- **Language Code Fixed**: Corrected Irish Gaelic example from `language: "gd"` to `language: "ga"`
  - Issue: Irish Gaelic was showing Scottish Gaelic code (`gd`) instead of correct code (`ga`)
- **Files Modified**:
  - `translations/QUICK_START.md` (lines 34-35) - Fixed flag emojis and language code

---

## [1.4.0] - 2025-01-XX

### 🚀 Major Enhancement: Save Routes with Turn-by-Turn Directions

#### **Added: Clickable Route Badge for Saving Routes**
- **Removed Separate Save Button**: Eliminated the standalone save button icon to save space
- **Clickable Route Type Badge**: Made the route type badge itself clickable to save routes
  - Click "⚡ Fastest" badge to save the fastest route
  - Click "📏 Shortest" badge to save the shortest route
  - Badge serves dual purpose: information display and action trigger
- **Enhanced Visual Feedback**:
  - Hover effect: Badge scales up (1.1x) with golden glow shadow
  - Active state: Badge scales down (0.95x) for click feedback
  - Cursor changes to pointer on hover
  - Smooth transitions for all interactions
- **Tooltip**: Added "Click to save this route" tooltip text to badge
- **Files Modified**:
  - `MMM-MyTeams-DriveToMatch.js` (lines 538-583, 664-714) - Removed save button HTML, made badge clickable
  - `MMM-MyTeams-DriveToMatch.css` (lines 227-252) - Removed save button styles, added clickable badge styles

#### **Added: Turn-by-Turn Navigation Directions**
- **Complete Step-by-Step Instructions**: Saved routes now include detailed turn-by-turn directions
  - Extracted from TomTom API's `route.guidance.instructions` array
  - Each step includes: step number, instruction text, distance from start, road numbers
  - Example: "5. Take exit 25 towards Govan - 15.2 km from start"
- **Distance Tracking**: Shows distance in kilometers from starting point for each step
- **Road Information**: Includes road numbers when available (e.g., "M8 (A8)")
- **Structured Format**: Turn-by-turn directions appear as numbered list in saved file
- **New File Section**: Added "=== TURN-BY-TURN DIRECTIONS ===" section to saved files
- **Fallback Handling**: Shows "Turn-by-turn directions not available" if guidance data missing
- **Files Modified**:
  - `node_helper.js` (lines 1558-1578, 1854-1929) - Extract and format turn-by-turn directions
  - `MMM-MyTeams-DriveToMatch.js` (lines 664-714) - Include turn-by-turn data in save request

#### **Changed: Filename Format**
- **New Format**: `OpponentName - StadiumName.json` (simplified, opponent-focused)
  - Example: `Rangers - Ibrox Stadium.json`
  - Example: `Dundee - Dens Park.json`
  - Example: `Feyenoord - De Kuip.json`
- **Old Format**: `YYYY-MM-DD_HomeTeam-vs-AwayTeam_RouteN.json` (date-based, verbose)
- **Rationale**: 
  - More intuitive and easier to identify routes by opponent
  - Shorter filenames for better readability
  - Opponent name always represents the team you're playing against
- **Special Character Handling**: Strips special characters but preserves spaces
- **Overwrite Behavior**: Saving to same opponent/stadium overwrites previous file (keeps latest data)
- **Files Modified**:
  - `node_helper.js` (lines 1854-1929) - Changed filename generation logic

#### **Enhanced: Saved File Structure**
- **Added Match Details Fields**:
  - `Opponent` - The team you're playing against (not your team)
  - `Match Type` - "Home Match" or "Away Match"
- **Renamed Section**: "=== WAYPOINTS ===" → "=== MAJOR WAYPOINTS ==="
  - Clarifies distinction between major waypoints and turn-by-turn directions
- **Enhanced GPS Labels**:
  - "Start Location" → "Start Location (Your Home)"
  - "Destination" → "Destination (Stadium)"
- **Removed Field**: "Route Number" (no longer needed with new filename format)
- **Seven Data Sections** (in order):
  1. Match Details (opponent, teams, date, venue, competition, match type)
  2. Route Details (type, distance, duration, delay, fuel cost)
  3. Turn-by-Turn Directions (numbered steps with instructions and distances)
  4. Major Waypoints (motorways and major roads summary)
  5. Special Features (Eurotunnel, ferry crossings)
  6. GPS Coordinates (start and destination with descriptive labels)
  7. Technical Data (raw metrics and timestamp)
- **Files Modified**:
  - `node_helper.js` (lines 1854-1929) - Restructured saved file format

#### **Enhanced: Data Flow**
- **Frontend to Backend**: Frontend now sends opponent name, venue name, and isHome flag
- **TomTom API Integration**: Backend extracts turn-by-turn directions from `route.guidance.instructions`
- **Route Object Enhancement**: Added `turnByTurnDirections` array to route data structure
- **Opponent Detection**: Uses existing `fixture.opponent` field (team you're NOT supporting)
- **Files Modified**:
  - `MMM-MyTeams-DriveToMatch.js` (lines 664-714) - Enhanced saveRoute() function
  - `node_helper.js` (lines 1558-1578, 1854-1929) - Extract and format turn-by-turn data

### 📚 Documentation Updates

#### **Updated: README.md**
- Added "Save Routes with Turn-by-Turn Directions" to Features section
- Added comprehensive "Saving Routes with Turn-by-Turn Directions" section with:
  - How to save a route (click badge instructions)
  - Saved file format and naming convention
  - What's included in saved routes (7 sections detailed)
  - Example turn-by-turn directions
  - File overwriting behavior
  - Complete example saved file (JSON format)
  - Use cases (trip planning, offline navigation, route comparison, etc.)

#### **Updated: CHANGELOG.md**
- Added v1.4.0 release notes
- Documented clickable route badge implementation
- Documented turn-by-turn directions feature
- Documented filename format change
- Documented saved file structure enhancements

#### **Updated: EXAMPLE_SavedRoute.json**
- Updated example file to reflect new format
- Added "Opponent" and "Match Type" fields
- Added "=== TURN-BY-TURN DIRECTIONS ===" section with 9 example steps
- Renamed "=== WAYPOINTS ===" to "=== MAJOR WAYPOINTS ==="
- Enhanced GPS coordinate labels
- Removed "Route Number" field

### 🛠️ Technical Improvements

#### **Enhanced: User Interface**
- **Cleaner UI**: Removed separate button reduces visual clutter
- **Progressive Disclosure**: Badge serves dual purpose (info + action)
- **Better Affordance**: Hover effects clearly indicate clickability
- **Consistent Styling**: Badge maintains Celtic green background with gold text
- **Accessibility**: Visual feedback for hover and active states

#### **Enhanced: Data Quality**
- **Richer Navigation Data**: Turn-by-turn directions provide detailed step-by-step guidance
- **Distance Context**: Each step shows distance from start for progress tracking
- **Road Identification**: Includes road numbers for better navigation
- **Comprehensive Coverage**: Both detailed directions and high-level waypoints included

#### **Enhanced: File Management**
- **Intuitive Naming**: Opponent-stadium format easier to identify than date-based
- **Automatic Overwrite**: Latest route data always available for each opponent/stadium
- **Backward Compatibility**: Old date-based files remain in folder (not deleted)
- **Minimal File Size Impact**: Turn-by-turn data adds only 3-5KB per file

### 🔍 Performance Impact

- **Negligible Processing Time**: Extracting turn-by-turn directions adds <10ms
- **Slightly Larger Files**: 3-5KB instead of 1-2KB (no performance impact)
- **Simplified DOM**: Removal of separate button slightly reduces DOM complexity
- **No API Changes**: Uses existing TomTom guidance data (no additional API calls)

### 💡 Important Notes

#### **Filename Collisions**
- Saving routes to the same opponent's stadium overwrites previous files
- Intentional design to keep latest route data
- Users can manually rename files to preserve multiple routes
- Consider adding route type suffix if needed (e.g., "Dundee - Dens Park (Fastest).json")

#### **Turn-by-Turn Data Availability**
- Quality depends on TomTom API's guidance data
- Some routes may have more detailed instructions than others
- Fallback message handles cases where guidance data is missing

#### **Distance Units**
- Turn-by-turn directions currently show distances in kilometers
- Consider adding support for miles based on `config.units` setting in future

#### **Backward Compatibility**
- Old saved files with date-based naming remain in `mySavedRoutes` folder
- New format only applies to newly saved routes
- No migration script provided (not needed)

---

## [1.3.0] - 2025-01-XX

### 🚀 Major Enhancement: Expanded Venue Database

#### **Added: Comprehensive Football Stadiums Database**
- **Database Expansion**: Renamed `scottish_grounds.csv` to `football_stadiums.csv` with 161 teams across 26 countries
  - **44 Scottish teams** (all professional leagues: Premiership, Championship, League One, League Two)
  - **51 English teams** (Premier League: 20 teams, Championship: 24 teams, plus additional teams)
  - **66 European teams** from 24 countries participating in UEFA competitions
- **New Data Columns Added**:
  - `Country` - Team's country (e.g., Scotland, England, Spain, Italy, Germany)
  - `League` - Competition/league name (e.g., Scottish Premiership, Premier League, La Liga, Serie A)
  - `Location` - City or town name
  - `Stadium_Capacity` - Seating capacity as a number
  - `Post_Code` - Postal/ZIP code for each stadium
- **European Coverage**: All Celtic European opponents included:
  - Feyenoord (De Kuip, Rotterdam, Netherlands)
  - Bologna (Stadio Renato Dall'Ara, Bologna, Italy)
  - FC Midtjylland (MCH Arena, Herning, Denmark)
  - Plus all other UEFA Champions League, Europa League, and Conference League participants
- **Major European Leagues Covered**:
  - Spain (La Liga): Real Madrid, Barcelona, Atletico Madrid, Athletic Bilbao, Real Sociedad, Girona
  - Italy (Serie A): Inter Milan, AC Milan, Juventus, Atalanta, Roma, Lazio, Bologna
  - Germany (Bundesliga): Bayern Munich, Borussia Dortmund, RB Leipzig, Bayer Leverkusen, Stuttgart, Eintracht Frankfurt, Hoffenheim
  - France (Ligue 1): PSG, Monaco, Brest, Lille, Lyon, Nice
  - Netherlands (Eredivisie): Feyenoord, PSV Eindhoven, Ajax, Twente, AZ Alkmaar
  - Portugal (Primeira Liga): Benfica, Sporting CP, Porto, Braga
  - Plus teams from Turkey, Belgium, Austria, Sweden, Denmark, Czech Republic, Greece, and 10 other countries

#### **Enhanced: Missing Coordinates Handling**
- **Frontend Validation**: Added coordinate validation before route calculation
  - Checks if venue coordinates are available (not null/undefined)
  - Skips route calculation if coordinates missing
  - Sets `routeError` flag for graceful error display
- **User-Friendly Error Message**: Displays "Stadium Lat/Lon Unknown" when coordinates unavailable
  - Yellow/amber warning color scheme (#ffc107)
  - Semi-transparent background with border
  - Centered layout with icon and bold text
  - Prevents 400 Bad Request errors from TomTom API
  - Shows fixture information even without routes
- **CSS Styling**: Added `.routes-error` class for error message styling
  - Consistent with existing error/warning design patterns
  - Clear visual indication of missing data

#### **Enhanced: CSV Parser**
- **Updated `parseGroundsCSV()` Function**: Now parses all 9 columns from CSV file
  - Handles empty lines gracefully
  - Stores additional fields (country, league, location, capacity, postCode) in venue object
  - Maintains backward compatibility with original 4-column format
- **Files Modified**: 
  - `node_helper.js` (lines 905-940) - CSV parser update
  - `MMM-MyTeams-DriveToMatch.js` (lines 188-218, 371-379) - Coordinate validation and error display
  - `MMM-MyTeams-DriveToMatch.css` (lines 150-169) - Error message styling

#### **Added: Database Management Tools**
- **New Batch File**: `update_football_stadiums.cmd` - Windows batch file for database updates
  - Generate updated databases for any country's top two professional leagues
  - Add new teams competing in UEFA competitions (Champions League, Europa League, Conference League)
  - Support for future seasons (2025-26, 2026-27, etc.)
  - Interactive menu-driven interface
  - Automatic backup of existing database before updates
  - Validation and error checking

### 📚 Documentation Updates

#### **Updated: README.md**
- Updated "Features" section to reflect expanded database (161 teams, 26 countries)
- Added "Supported Teams" section with breakdown by country and league
- Updated references from `scottish_grounds.csv` to `football_stadiums.csv`
- Added information about database management tools
- Enhanced troubleshooting guidance for missing coordinates

#### **Updated: CHANGELOG.md**
- Added v1.3.0 release notes
- Documented database expansion and new data columns
- Documented missing coordinates handling improvements
- Documented database management tools

#### **Updated: VENUE_DATABASE_INFO.md**
- Updated all references from `scottish_grounds.csv` to `football_stadiums.csv`
- Added information about database management tools

### 🛠️ Technical Improvements

#### **Enhanced: Data Extensibility**
- Additional venue data fields ready for future features:
  - Display stadium capacity on fixture cards
  - Show travel distance by country/league
  - Use postal codes for alternative routing services
  - Filter or group fixtures by competition type
  - Add stadium information tooltips

#### **Enhanced: Error Handling**
- Graceful handling of missing venue coordinates
- User-friendly error messages instead of API errors
- Prevents module crashes from null coordinates
- Maintains fixture display even when routes unavailable

---

## [1.2.0] - 2025-10-05

### 🚀 Major Enhancement: Shared Request Manager

#### **Added: Global Request Coordination System**
- **New File**: `shared-request-manager.js` - Global singleton for coordinating HTTP requests across multiple modules
- **Problem Solved**: Multiple MagicMirror modules making simultaneous API requests caused:
  - API rate limiting (429 errors)
  - Network timeouts and congestion
  - Module loading conflicts
  - Slow or failed data loading
- **Solution Features**:
  - Global request queue with priority levels (0-2)
  - Sequential request processing (no simultaneous requests)
  - Configurable throttling between requests (default: 1200ms)
  - Per-domain rate limiting
  - Request deduplication (prevents duplicate simultaneous requests)
  - Automatic retry with exponential backoff (max 3 retries)
  - Comprehensive debug logging
  - Support for both native fetch (Node.js 18+) and node-fetch v2 fallback
- **Integration**: Works seamlessly with other MMM-MyTeams modules:
  - MMM-MyTeams-Fixtures
  - MMM-MyTeams-LeagueTable
  - MMM-MyTeams-Honours
  - MMM-Celtic-OnThisDay
- **Files Modified**: 
  - `node_helper.js` - Integrated SharedRequestManager for all API calls
  - Added `shared-request-manager.js` (new file, 350+ lines)

### 🔧 Critical Bug Fixes

#### **Fixed: Promise Chain Broken in queueRequest()**
- **Issue**: Modules stuck at "Loading..." - requests never resolved
- **Root Cause #1**: Promise chain bug in `shared-request-manager.js` `queueRequest()` method
  - Used `return` inside Promise constructor (line 132)
  - Created nested promise that overwrote resolve/reject callbacks (lines 145-149)
- **Root Cause #2**: Missing `processQueue()` method
  - `queueRequest()` called `this.processQueue()` on line 153
  - Method didn't exist, causing `TypeError: this.processQueue is not a function`
- **Solution**:
  - Restructured Promise chain to properly resolve/reject
  - Added `processQueue()` method to trigger immediate queue processing
  - Used `setImmediate()` for non-blocking execution
- **Impact**: All modules now load successfully and display data
- **Files Modified**: `shared-request-manager.js` (lines 117-161, 196-203)

#### **Fixed: Module Loading Failures Across All MMM-MyTeams Modules**
- **Issue**: After Promise chain fix, all modules failed with explicit error messages
- **Root Cause**: `processQueue()` method was called but didn't exist in SharedRequestManager class
- **Solution**: Implemented missing `processQueue()` method with:
  - Guard conditions to prevent redundant processing
  - Non-blocking execution using `setImmediate()`
  - Complementary to existing interval-based `startQueueProcessor()`
- **Impact**: All 5 modules now load and display data correctly:
  - MMM-MyTeams-Honours ✅
  - MMM-Celtic-OnThisDay ✅
  - MMM-MyTeams-LeagueTable ✅
  - MMM-MyTeams-Fixtures ✅
  - MMM-MyTeams-DriveToMatch ✅
- **Files Modified**: `shared-request-manager.js` in all 5 modules

### 📚 Documentation Updates

#### **Updated: README.md**
- Added "Shared Request Manager" section explaining:
  - Why it's needed (API conflicts, timeouts, rate limiting)
  - How it works (global singleton, sequential processing, throttling)
  - Integration with other modules
  - Configuration defaults
- Enhanced installation instructions
- Added troubleshooting guidance for request manager issues

#### **Updated: CHANGELOG.md**
- Added v1.2.0 release notes
- Documented Shared Request Manager implementation
- Documented Promise chain and processQueue() bug fixes
- Added detailed root cause analysis for both bugs

#### **Added: .gitignore/INVENTORY.txt**
- Comprehensive tabulated inventory of all .gitignore directory contents
- 41 files organized by category:
  - Tests (10 files)
  - Scripts (5 files)
  - Fix Documentation (23 files)
  - Guides (7 files)
  - Root Docs (1 file)
- Includes file name, folder path, and purpose for each file

### 🛠️ Technical Improvements

#### **Enhanced: Request Processing Architecture**
- Dual processing strategy:
  - Immediate processing via `processQueue()` when requests are queued
  - Interval-based processing via `startQueueProcessor()` (500ms intervals)
- Non-blocking queue processing using `setImmediate()`
- Proper Promise chain management
- Improved error handling and logging

#### **Enhanced: Module Reliability**
- Eliminated silent failures
- Clear error messages for debugging
- Consistent implementation across all MMM-MyTeams modules
- Proper async/await flow

### 🔍 Debugging & Troubleshooting

#### **Enhanced: Debug Logging**
- Request queue status logging
- Promise resolution/rejection tracking
- Method existence verification
- Detailed error messages with stack traces

#### **Added: Verification Scripts**
- PowerShell scripts for verifying fixes across modules
- Integration testing scripts
- SSL/TLS verification scripts

---

## [1.1.0] - 2025-10-03

### 🔧 Bug Fixes & Enhancements

#### **Fixed: European Fixtures Not Displaying**
- **Issue**: Module was filtering to show only domestic Scottish fixtures, excluding UEFA Europa League matches
- **Root Cause**: Hardcoded domestic-only filter in `node_helper.js` (lines 851-872)
- **Solution**: Removed domestic-only filtering logic to show ALL fixtures (domestic + European)
- **Impact**: Feyenoord, Midtjylland, and other European fixtures now display correctly
- **Files Modified**: `node_helper.js` (lines 851-859)

#### **Fixed: Bridge Detection Not Working**
- **Issue**: Bridges were not appearing in waypoints despite being on the route
- **Root Cause**: TomTom API turn-by-turn instructions don't mention bridge names (only motorways like "M90")
- **Solution**: Implemented GPS-based bridge detection using Haversine distance formula
- **Features**:
  - Added GPS coordinates for 20 major Scottish bridges
  - Calculates distance between route points and bridge coordinates
  - Detects bridge if route passes within 0.2-0.5km (varies by bridge size)
  - Uses Set data structure to prevent duplicate detections
  - Preserves text-based detection as fallback
- **Bridges Included**:
  - Queensferry Crossing, Forth Road Bridge, 
  - Erskine Bridge, Kingston Bridge, Clyde Arc, Squinty Bridge
  - Kincardine Bridge, Clackmannanshire Bridge, Tay Road Bridge
  - Skye Bridge, Connel Bridge, Ballachulish Bridge
  - Cromarty Bridge, Dornoch Firth Bridge, Friarton Bridge
  - And 5 more Glasgow city bridges
- **Files Modified**: 
  - `node_helper.js` (lines 1175, 1181-1244, 1293-1311)
  - Added `calculateDistance()` and `toRadians()` helper functions

#### **Fixed: dateOverride Not Working**
- **Issue**: Changing `dateOverride` in config.js didn't update the displayed fixture
- **Root Cause**: Cache key was `${teamName}_${teamId}` without including `dateOverride`, so changing the date didn't invalidate the cache
- **Solution**: Include `dateOverride` in cache key: `${teamName}_${teamId}_${dateOverride || 'next'}`
- **Impact**: 
  - Each date override now has its own cache entry
  - Changing `dateOverride` invalidates cache and triggers fresh API fetch
  - Module correctly finds and displays the fixture for the specified date
- **Files Modified**: `node_helper.js` (lines 797, 803, 810)

#### **Enhanced: Debug Logging**
- Added cache key to fetch logging
- Added dateOverride value to cache hit logging
- Added GPS bridge detection logging with distance measurements
- Shows number of bridges detected per route

#### **Enhanced: Ferry waypoint notification for European Fixtures**
- Automatically adds Ferry to waypoints requiring sea crossing for European fixtures
- Ferry appears first in waypoint list (priority: Ferry > Bridges > Motorways)
- Helps plan ferry crossings for continental away matches

---

## [1.0.0] - 2025-01-XX

### Initial Release

The **MMM-MyTeams-DriveToMatch** module displays driving routes to your team's next fixture using real-time traffic data from TomTom API. Perfect for football fans who want to plan their journey to away matches!

---

## 🎯 Features

### **Automatic Fixture Detection**
- **TheSportsDB Integration**: Fetches your team's upcoming fixtures automatically( free API only fetchs home matchs) 
- **Comprehensive Fixture Search**: Uses same methodology as MMM-MyTeams-Fixtures with multiple fallback strategies
  - Primary: `/eventsnext.php` endpoint for next 5 fixtures
  - Fallback 1: Season fixtures via `/eventsseason.php` with auto-season detection
  - Fallback 2: Fallback season support (configurable)
  - Fallback 3: Search events by team name patterns (`TEAM_vs_*` and `*_vs_TEAM`)
  - Fallback 4: Alternative team ID resolution by name
  - Fallback 5: Football Web Pages (FWP) scraper as last resort
- **Domestic Fixture Filtering**: Prioritizes Scottish domestic fixtures (SPFL, Scottish Cup, League Cup)
- **Smart Season Detection**: Auto-detects current season (e.g., "2025-2026") based on current date
- **Team ID Resolution**: Automatically resolves team ID from team name with intelligent scoring
  - Prefers Scotland-based teams (Celtic FC ID: 133647)
  - Matches exact names, alternates, country, and city
- **Fixture Caching**: 5-minute in-memory cache to reduce API calls
- **Disk Cache Persistence**: Saves fixture data to disk for faster startup

### **Real-time Traffic Routes**
- **TomTom Routing API**: Calculates multiple driving routes with live traffic data
- **Multiple Route Options**: Shows fastest and alternative routes (configurable 1-3 routes)
- **Traffic Delay Highlighting**: Displays additional journey time due to current traffic conditions
- **Route Types**: Supports "fastest" and "shortest" route calculations
- **Dynamic Route Updates**: Refreshes routes every 5 minutes (configurable) for up-to-date traffic info
- **Travel Time Display**: Shows journey duration in hours and minutes format
- **Distance Display**: Shows route distance in kilometers or miles (configurable units)

### **Football Stadiums Database**
- **Comprehensive Venue Coordinates**: 161 professional football stadiums with GPS coordinates across 26 countries
- **British Coverage**: Scotland (44 teams), England (51 teams), Wales (2 teams)
- **European Coverage**: Major leagues and UEFA competition participants
- **CSV Database**: Easily extensible `football_stadiums.csv` file with 9 data columns
- **Database Update Tool**: Windows batch file (`update_football_stadiums.cmd`) for adding new teams
- **Hardcoded Fallback**: Built-in coordinates if CSV file is missing
- **Venue Caching**: In-memory cache for venue lookups
- **Alternative Name Matching**: Handles team name variations (e.g., "Hearts" vs "Heart of Midlothian")
- **Hampden Park Detection**: Automatically uses Hampden Park for Scottish Cup and League Cup semi-finals and finals

### **Major Waypoints Display**
- **Route Landmarks**: Extracts and displays major roads and landmarks from route instructions
- **Major Roads**: M8, M90, M9, M80, M77, M74, A92, A90, A1, A82
- **Scottish Landmarks**: Forth Road Bridge, Queensferry Crossing, Erskine Bridge, Clyde Tunnel, Kingston Bridge, Kincardine Bridge, Tay Bridge
- **Waypoint Limiting**: Shows up to 3 most significant waypoints per route
- **Toggle Display**: Can be hidden via `showWaypoints: false` config option

### **Celtic-themed Styling**
- **Green White & Gold Colour Scheme**: Celtic FC colours (Green: #018749, White: #FFFFFF & Gold: #FFD700)
- **Gradient Backgrounds**: Subtle Celtic-themed gradients for next fixture header
- **Route Color Coding**: Route 1 (green border), Route 2 (gold border)
- **Responsive Design**: Adapts to different screen sizes and positions
- **Hover Effects**: Interactive hover states for routes
- **Loading Animations**: Smooth fade-in animations for routes
- **Update Highlights**: Visual feedback when routes update
- **Icon Integration**: Font Awesome icons for visual clarity

### **Theme Customization**
- **Dark/Light Mode Override**: Force dark or light theme independent of MagicMirror settings
  - `darkMode: null` - Auto-detect from MagicMirror (default)
  - `darkMode: true` - Force dark theme
  - `darkMode: false` - Force light theme
- **Font Color Override**: Custom text color via `fontColorOverride` (e.g., "#FFFFFF")
- **Opacity Override**: Custom opacity via `opacityOverride` (0.0 to 1.0)
- **Dynamic CSS Injection**: Theme overrides applied via runtime CSS injection without file modification

### **Display States**
- **Loading State**: Shows spinner and "Loading fixture data..." message
- **Error State**: Displays error icon and descriptive error message
- **No Fixture State**: Shows "No upcoming fixtures found" when no matches scheduled
- **Routes Loading**: Shows "Calculating routes..." while fetching route data
- **Fixture Header**: Displays teams, date/time, venue, and competition
- **Routes Section**: Shows multiple routes with duration, distance, delay, and waypoints

### **API Integration**
- **TheSportsDB API**: Free tier fixture data (reasonable usage for personal projects)
- **TomTom Routing API**: Free tier includes 2,500 requests per day
- **Rate Limiting**: 1.2-second minimum interval between TheSportsDB API calls
- **Retry Logic**: Automatic retry with exponential backoff for failed API calls
- **Timeout Handling**: 15-second default timeout for API requests (configurable)
- **User-Agent Header**: Identifies as "MMM-MyTeams-DriveToMatch (+MagicMirror)"
- **Fetch Implementation**: Supports native fetch (Node.js 18+) and node-fetch v2 fallback

### **Configuration Options**
- **Required Settings**:
  - `apiTomTomKey`: Your TomTom API key (required)
  - `homeLatitude`: Your home GPS latitude (required)
  - `homeLongitude`: Your home GPS longitude (required)
- **Team Settings**:
  - `teamName`: Team name to search for (default: "Celtic")
  - `teamId`: TheSportsDB team ID (default: "133647" for Celtic FC)
- **API Settings**:
  - `apiUrl`: TheSportsDB API base URL
  - `season`: Season string or "auto" for auto-detection
  - `fallbackSeason`: Fallback season if primary fails
  - `scottishLeagueIds`: Array of Scottish league IDs for filtering
  - `uefaLeagueIds`: Array of UEFA competition IDs
  - `useSearchEventsFallback`: Enable search events fallback (default: true)
  - `strictLeagueFiltering`: Enable strict league filtering (default: true)
- **Update Intervals**:
  - `fixtureUpdateInterval`: How often to check for new fixtures (default: 1 hour)
  - `routeUpdateInterval`: How often to update routes (default: 5 minutes)
- **Display Options**:
  - `showDelay`: Show traffic delay information (default: true)
  - `showWaypoints`: Show major waypoints on routes (default: true)
  - `maxRoutes`: Number of routes to display (default: 2, max: 3)
  - `units`: Distance units - "metric" or "imperial" (default: "metric")
- **API Settings**:
  - `requestTimeout`: API request timeout in milliseconds (default: 15000)
  - `maxRetries`: Maximum API retry attempts (default: 3)
- **Debug**:
  - `debug`: Enable detailed console logging (default: false)
- **Theme Overrides**:
  - `darkMode`: Force dark/light mode (null/true/false)
  - `fontColorOverride`: Custom font color (e.g., "#FFFFFF")
  - `opacityOverride`: Custom opacity (0.0 to 1.0)

### **Module Lifecycle Management**
- **Start Method**: Validates required config and initiates data fetching
- **Stop Method**: Cleans up timers to prevent memory leaks
- **Schedule Updates**: Separate timers for fixture and route updates
- **Socket Notifications**: Bidirectional communication between frontend and node_helper
  - `GET_NEXT_FIXTURE` → `FIXTURE_DATA` / `FIXTURE_ERROR`
  - `GET_ROUTES` → `ROUTES_DATA` / `ROUTES_ERROR`
- **DOM Updates**: Smooth animations with configurable animation speed
- **Error Handling**: Graceful degradation with user-friendly error messages

### **Data Processing**
- **Fixture Processing**:
  - Determines home/away status
  - Resolves opponent team name
  - Identifies competition type (domestic vs European)
  - Detects Hampden Park fixtures (cup semi-finals and finals)
  - Resolves venue coordinates from Scottish grounds database
- **Route Processing**:
  - Calculates multiple route options
  - Extracts travel time, distance, and traffic delay
  - Parses route instructions for major waypoints
  - Formats duration (hours and minutes)
  - Formats distance (km or miles based on units setting)

### **Scraping & Parsing**
- **Cheerio HTML Parser**: Used for Football Web Pages fallback scraper
- **FWP Scraper Features**:
  - Parses fixture table from https://www.footballwebpages.co.uk/celtic/fixtures
  - Extracts date, time, opponent, and venue
  - Filters for future fixtures only
  - Determines home/away status from venue text
  - Converts DD/MM/YYYY dates to ISO format (YYYY-MM-DD)

### **Caching Strategy**
- **Fixture Cache**:
  - In-memory Map cache with 5-minute TTL
  - Disk cache persistence to `fixtures-cache.json`
  - Cache key: `${teamName}_${teamId}`
  - Includes timestamp, TTL, source, and data
- **Venue Cache**:
  - In-memory Map cache for venue coordinates
  - Cache key: `${teamName}_${venueName}`.toLowerCase()
  - Permanent cache (no expiration)
-**sharedFixture-cache**:
  - Robust fallback if API cache fails - only works when MMM-MyTeams-Fixtures module is also present

### **Error Handling**
- **Config Validation**: Checks for required API keys and coordinates at startup
- **API Error Handling**: Graceful fallback through multiple data sources
- **Timeout Protection**: Prevents hanging requests with configurable timeouts
- **Retry Logic**: Exponential backoff for transient failures (429, timeout, connection errors)
- **Missing Venue Handling**: Shows venue name but no routes if coordinates not found
- **User-Friendly Messages**: Clear error messages for common issues

---

## 📦 Dependencies

- **node-fetch** (^2.6.7): HTTP client for API requests (fallback for Node.js < 18)
- **cheerio** (implicit): HTML parser for FWP scraper fallback
- **Node.js**: >= 14 (native fetch available in Node.js >= 18)

---

## 🎨 Styling & CSS

### **CSS Classes**
- `.MMM-MyTeams-DriveToMatch`: Main wrapper
- `.loading`, `.error`, `.no-fixture`: State containers
- `.fixture-header`: Fixture information container
- `.teams`: Team names display
- `.team.highlight`: Highlighted team (your team)
- `.vs`: Versus separator
- `.match-details`: Date, venue, competition container
- `.date`: Match date display
- `.venue`: Venue name with icon
- `.competition`: Competition name
- `.routes-section`: Routes container
- `.routes-title`: Routes section title
- `.routes-loading`: Loading routes state
- `.route`: Individual route container
- `.route-1`, `.route-2`: Route-specific styling
- `.route-header`: Route label and badge
- `.route-label`: "Route 1", "Route 2" text
- `.fastest`, `.alternative`: Route type badges
- `.route-details`: Route information container
- `.time-distance`: Duration and distance display
- `.duration`: Travel time display
- `.distance`: Route distance display
- `.delay`: Traffic delay display
- `.waypoints`: Major waypoints display

### **Color Scheme**
- **Celtic Green**: #018749 (primary brand color)
- **Celtic Gold**: #FFD700 (secondary brand color)
- **Error Red**: #dc3545 (error states)
- **Traffic Delay Orange**: #ff6b35 (traffic delay indicator)
- **Text White**: #ffffff (primary text)
- **Text Gray**: #cccccc (secondary text)
- **Text Dark Gray**: #999999 (tertiary text)
- can be configured for your team

### **Animations**
- **Spin**: Loading spinner rotation (1s linear infinite)
- **Fade In**: Route appearance animation (0.5s ease-in)
- **Highlight**: Route update flash animation (1s ease-in-out)

### **Responsive Design**
- **Max Width**: 400px on desktop
- **Mobile Breakpoint**: 600px
- **Mobile Adjustments**:
  - Full width layout
  - Vertical team name stacking
  - Vertical time/distance stacking
  - Smaller font sizes

---

## 🏟️ Football Stadiums Database

The module includes a comprehensive database of professional football grounds accross Europe:

---

### **Special Venues**
- **Hampden Park**: Automatically used for Scottish Cup and League Cup semi-finals and finals

---

## 🔧 Configuration Examples

### **Minimal Configuration**
```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    position: "top_right",
    config: {
        apiTomTomKey: "YOUR_TOMTOM_API_KEY",
        homeLatitude: 55.8642,
        homeLongitude: -4.2518,

        // Team settings
        teamName: "Celtic",
        teamId: "133647",
    }
}
```

### **Full Configuration**
```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    position: "top_right",
    config: {
        // Required settings
        apiTomTomKey: "YOUR_TOMTOM_API_KEY",
        homeLatitude: 55.8642,
        homeLongitude: -4.2518,
        
        // Team settings
        teamName: "Celtic",
        teamId: "133647",
        
        // API settings
        apiUrl: "https://www.thesportsdb.com/api/v1/json/3",
        season: "auto",
        fallbackSeason: "2025-2026",
        scottishLeagueIds: ["4330", "4364", "4363", "4888"],
        uefaLeagueIds: ["4480", "4481", "5071"],
        useSearchEventsFallback: true,
        strictLeagueFiltering: true,
        
        // Update intervals
        fixtureUpdateInterval: 60 * 60 * 1000, // 1 hour
        routeUpdateInterval: 5 * 60 * 1000,    // 5 minutes
        
        // Display options
        showDelay: true,
        showWaypoints: true,
        maxRoutes: 2,
        units: "metric",
        
        // API settings
        requestTimeout: 15000,
        maxRetries: 3,
        
        // Debug
        debug: false,
        
        // Theme overrides
        darkMode: null,
        fontColorOverride: null,
        opacityOverride: null
    }
}
```

---

## 📊 Configuration Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiTomTomKey` | String | **Required** | Your TomTom API key from developer.tomtom.com |
| `homeLatitude` | Number | **Required** | Your home GPS latitude coordinate |
| `homeLongitude` | Number | **Required** | Your home GPS longitude coordinate |
| `teamName` | String | `"Celtic"` | Team name to search for fixtures |
| `teamId` | String | `"133647"` | TheSportsDB team ID (Celtic FC) |
| `apiUrl` | String | `"https://www.thesportsdb.com/api/v1/json/3"` | TheSportsDB API base URL |
| `season` | String | `"auto"` | Season string (e.g., "2025-2026") or "auto" for auto-detection |
| `fallbackSeason` | String | `"2025-2026"` | Fallback season if primary season fails |
| `scottishLeagueIds` | Array | `["4330", "4364", "4363", "4888"]` | Scottish league IDs for filtering |
| `uefaLeagueIds` | Array | `["4480", "4481", "5071"]` | UEFA competition IDs |
| `useSearchEventsFallback` | Boolean | `true` | Enable search events fallback strategy |
| `strictLeagueFiltering` | Boolean | `true` | Enable strict league filtering |
| `fixtureUpdateInterval` | Number | `3600000` | Fixture update interval in milliseconds (1 hour) |
| `routeUpdateInterval` | Number | `300000` | Route update interval in milliseconds (5 minutes) |
| `showDelay` | Boolean | `true` | Show traffic delay information |
| `showWaypoints` | Boolean | `true` | Show major waypoints on routes |
| `maxRoutes` | Number | `2` | Maximum number of routes to display (1-3) |
| `units` | String | `"metric"` | Distance units: "metric" (km) or "imperial" (miles) |
| `requestTimeout` | Number | `15000` | API request timeout in milliseconds |
| `maxRetries` | Number | `3` | Maximum API retry attempts |
| `debug` | Boolean | `false` | Enable detailed console logging |
| `darkMode` | Boolean/null | `null` | Force dark (true), light (false), or auto (null) |
| `fontColorOverride` | String/null | `null` | Custom font color (e.g., "#FFFFFF") |
| `opacityOverride` | Number/null | `null` | Custom opacity (0.0 to 1.0) |

---

## 🚀 Getting Started

### **1. Get Your Coordinates**
- Go to [Google Maps](https://maps.google.com)
- Right-click on your home location
- Click on the coordinates that appear
- Use the latitude and longitude values in your config

### **2. Get TomTom API Key**
- Go to [TomTom Developer Portal](https://developer.tomtom.com)
- Create a free account
- Create a new app
- Copy your API key
- Free tier includes 2,500 requests per day

### **3. Find Your Team ID**
- Visit [TheSportsDB](https://www.thesportsdb.com)
- Search for your team
- The team ID is in the URL (e.g., Celtic FC: 133647)
- Or leave blank and the module will auto-resolve from team name

---

## 🐛 Troubleshooting

### **No Routes Showing**
- ✅ Check your TomTom API key is valid
- ✅ Verify your home coordinates are correct
- ✅ Ensure the venue is in the Scottish grounds database
- ✅ Check browser console for error messages
- ✅ Enable `debug: true` in config for detailed logging

### **Fixture Not Found**
- ✅ Check the team name matches exactly (e.g., "Celtic" not "Celtic FC")
- ✅ Verify the team ID is correct for TheSportsDB
- ✅ Check if there are upcoming fixtures scheduled
- ✅ Try leaving `teamId` blank to auto-resolve from name
- ✅ Enable `debug: true` to see fixture search attempts

### **API Errors**
- ✅ Check your internet connection
- ✅ Verify API keys are valid and not expired
- ✅ Check API usage limits haven't been exceeded

### **Expected API Call Usage**

- ✅ TheSportsDB free tier has rate limits (1.2s between calls)
     - Free tier: Unlimited for non-commercial use
     - Patreon tier: Higher rate limits + additional features
     - Your usage: 1-14 calls/day (negligible)
    
- ✅ TomTom free tier: 2,500 requests/day
     - Limit: 2,500 requests/day
     - Your usage: 288 calls/day (11.5% of limit)
     - Headroom: 2,212 calls remaining

- Additional Notes
     - Caching Strategy: Module uses aggressive caching to minimize API calls
     - Fixture data cached for 24 hours
     - Venue coordinates cached in memory
     - Shared Request Manager prevents duplicate calls
     - Manual Route Saves: Clicking badges to save routes does NOT make additional API calls (uses already-fetched data)
     - Module Startup: Initial load makes 1 fixture call + 2 route calls = 3 calls
     - Error Retries: Failed API calls retry up to 3 times (configured via maxRetries: 3)
     - Multiple Instances: If running multiple instances of this module, multiply all numbers by instance count

### **Wrong Venue Coordinates**
- ✅ Check if team name matches entry in `football_stadiums.csv`
- ✅ Add custom venue to CSV file if missing
- ✅ Check for team name variations (e.g., "Hearts" vs "Heart of Midlothian")
- ✅ Enable `debug: true` to see venue resolution attempts

### **Module Not Displaying**
- ✅ Check MagicMirror logs for errors
- ✅ Verify module is in correct directory: `modules/MMM-MyTeams-DriveToMatch/`
- ✅ Run `npm install` in module directory
- ✅ Check config.js syntax is correct
- ✅ Restart MagicMirror after config changes

---

## 🔍 Technical Implementation

### **Data Flow**
1. **Frontend** (`MMM-MyTeams-DriveToMatch.js`):
   - Validates config on start
   - Sends `GET_NEXT_FIXTURE` notification to node_helper
   - Receives fixture data and sends `GET_ROUTES` notification
   - Receives route data and updates DOM
   - Schedules periodic updates

2. **Backend** (`node_helper.js`):
   - Receives `GET_NEXT_FIXTURE` notification
   - Checks fixture cache (5-minute TTL)
   - Fetches fixtures from TheSportsDB API (multiple strategies)
   - Falls back to FWP scraper if API fails
   - Filters for domestic fixtures
   - Resolves venue coordinates from Scottish grounds database
   - Sends `FIXTURE_DATA` notification to frontend
   - Receives `GET_ROUTES` notification
   - Calls TomTom Routing API for multiple routes
   - Extracts waypoints from route instructions
   - Sends `ROUTES_DATA` notification to frontend

### **Fixture Search Strategy**
1. **eventsnext.php**: Next 5 fixtures for team
2. **eventsseason.php**: All fixtures for current season
3. **eventsseason.php**: All fixtures for fallback season
4. **searchevents.php**: Search by team name patterns
5. **Alternative Team ID**: Re-resolve team ID by name and retry
6. **FWP Scraper**: Scrape Football Web Pages as last resort

### **Domestic Fixture Detection**
- Checks `competitionType` field for "domestic"
- Matches competition name against known Scottish competitions:
  - Scottish Premier League, Scottish Premiership, SPFL
  - Scottish Championship, Scottish League One, Scottish League Two
  - Scottish Cup, League Cup, Challenge Cup
  - William Hill Scottish Cup, Premier Sports Cup, Cinch Premiership

### **Hampden Park Detection**
- Checks if competition is Scottish Cup or League Cup
- Checks if round is "semi-final" or "final" (not quarter-final)
- Automatically uses Hampden Park coordinates (55.8256, -4.2519)

### **Route Calculation**
- Calls TomTom Routing API with start/end coordinates
- Requests traffic data and travel time for all conditions
- Calculates fastest route (primary) and shortest route (alternative)
- Extracts major waypoints from turn-by-turn instructions
- Formats duration, distance, and traffic delay

### **Waypoint Extraction**
- Parses route instructions for major roads and landmarks
- Filters for significant waypoints only
- Limits to 3 waypoints per route for clean display

---

## 🎨 Customization

### **Adding Custom Venues**
Edit `football_stadiums.csv` and add a new line:
```csv
Team Name,Ground Name,Latitude,Longitude
My Team,My Stadium,55.1234,-4.5678
```

### **Changing Colors**
Edit `MMM-MyTeams-DriveToMatch.css`:
```css
/* Change Celtic green to your team color */
.MMM-MyTeams-DriveToMatch .route-1 {
    border-left: 3px solid #YOUR_COLOR;
}
```

### **Custom Team Support**
The module works with any team in TheSportsDB:
```javascript
config: {
    teamName: "Elgin City,
    teamId: "134302",
    // ... other config
}
```

---

## 🌟 Future Enhancements

Potential features for future versions:

- **Public Transport Routes**: Integration with public transport APIs
- **Match Day Reminders**: Notifications before matches
- **Weather Integration**: Weather forecast for match day
- **Parking Information**: Nearby parking locations and availability
- **Stadium Information**: Capacity, facilities, contact details
- **Alternative Destinations**: Routes to pubs, fan zones, your secret parking place etc.
- **Multi-Language Support**: Translations for international users
- **Social Sharing**: Share routes with friends
- **Offline Mode**: Cached routes when internet unavailable

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Credits & Acknowledgments

- **Micael Paquier "teemoo7"**: for his excellent [MMM-TomTomCalculatrRoute module](https://github.com/teemoo7/MMM-TomTomCalculatorRoute)
- **TheSportsDB**: Free sports data API for fixture information
- **FootballWebPages**: Free sports data API for fixture information
- **MagicMirror²**: The amazing smart mirror platform by [Michael Teeuw](https://github.com/MichMich)
- **Zencoder (AI assistant)**: for getting me out of so many rat holes!
- **Celtic FC**: for brining me both joy and pain in equal neasure - especialy on European away trips 😞.

---

## 🔗 Related Modules

- **[MMM-MyTeams-Fixtures](https://github.com/CelticModules/MMM-MyTeams-Fixtures)**: Display upcoming fixtures for your team
- **[MMM-MyTeams-Clock**](https://github.com/CelticModules/MMM-MyTeams-Clock)**: Football crest themed analogue clock 
- **[MMM-MyTeams-LeagueTable](https://github.com/CelticModules/MMM-MyTeams-LeagueTable)**: Display league table standings
- **[MMM-MyTeams-Honours**](https://github.com/CelticModules/MMM-MyTeams-Honours)**: Display team trophies and honours
- **[MMM-MyTeams-MatchPredictions**](https://github.com/CelticModules/MMM-MyTeams-MatchPredictions)**: AI-powered match predictions
- **[MMM-Celtic-OnThisDay**](https://github.com/CelticModules/MMM-Celtic-OnThisDay)**: Celtic FC historical events ticker

---

## 📞 Support

- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Ask questions on GitHub Discussions
- **MagicMirror Forum**: Get help from the community

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### **Development Best Practices**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Test your changes thoroughly
4. Commit with clear messages (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### **Code Style**
- Use consistent indentation (4 spaces)
- Follow existing code patterns
- Add comments for complex logic
- Update documentation for new features

### **Testing**
- Test with different team configurations
- Test with missing venue coordinates
- Test API failure scenarios
- Test on different screen sizes

### **Adding New Venues**
1. Find GPS coordinates (Google Maps) or see example batch file in usefullInfo folder
2. Add to `football_stadiumsrounds.csv` or create @yourcountries_grounds.csv'
3. Test venue resolution
4. Submit PR with venue addition

### **Bug Reports**
Please include:
- MagicMirror version
- Node.js version
- Module version
- Config (remove API keys)
- Error messages from console
- Steps to reproduce

---

## 📚 Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-01-XX | Initial release with fixture detection, TomTom routing, Scottish grounds database, and Celtic-themed styling |

---

## 🔗 Links

- **Repository**: https://github.com/gitgitaway/MMM-MyTeams-DriveToMatch
- **TheSportsDB**: https://www.thesportsdb.com
- **TomTom Developer Portal**: https://developer.tomtom.com
- **MagicMirror²**: https://magicmirror.builders
- **Football Web Pages**: https://www.footballwebpages.co.uk

---

**🍀 Hail Hail & Enjoy planning your journey to the match! 🚗⚽**