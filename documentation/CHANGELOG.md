# Changelog

All notable changes to the **MMM-MyTeams-DriveToMatch** module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Current] - 2025-11-07

### 🏟️ Stadium Coordinate Verification & Correction Tool - Comprehensive Country Customization

#### New Features
- **Advanced Stadium Verification Script**: New generalized `tools/verify_stadium_coordinates_by_country.py` script for systematic stadium coordinate verification
  - **Full Database Support**: Verify all 514 stadiums across all countries in database
  - **Country-Specific Verification**: Verify stadiums for any specific country with single command
  - **Customizable Distance Thresholds**: Adjust sensitivity from 0.5km (strict) to 5km+ (lenient)
  - **Configurable API Rate Limiting**: Control delays between OpenStreetMap API calls (0.2-2.0 seconds)
  - **Preview Mode**: Generate reports without modifying CSV (`--no-update` flag)
  
- **Organized Output Files**:
  - Reports saved to: `documentation/verification_report/`
  - Backups saved to: `backups/`
  - Logs saved to: `documentation/verification_report/`

- **Comprehensive Documentation**:
  - `STADIUM_VERIFICATION_USER_GUIDE.md` - Full guide with examples, troubleshooting, customization
  - `QUICK_REFERENCE.md` - Quick command reference and cheat sheet
  - Located in root module directory for easy access

#### CLI Usage Examples
```bash
# Navigate to tools directory
cd tools

# List all countries in database
python verify_stadium_coordinates_by_country.py --list-countries

# Verify specific country
python verify_stadium_coordinates_by_country.py --country "Scotland"

# Verify all stadiums
python verify_stadium_coordinates_by_country.py --all

# Custom thresholds and rate limits
python verify_stadium_coordinates_by_country.py --country "England" --threshold 1.5 --rate-limit 0.4

# Preview mode (no CSV update)
python verify_stadium_coordinates_by_country.py --country "France" --no-update
```

#### Features
- **OpenStreetMap Integration**: Uses Nominatim geocoder for accurate stadium coordinate lookup
- **Distance-Based Categorization**: Reports organize corrections into Minor (≤2km), Moderate (2-5km), and Major (>5km) categories
- **Haversine Distance Calculation**: Precise geographic distance measurement between stored and geo-searched coordinates
- **Automatic CSV Backups**: Every update creates timestamped backup in `backups/` folder
- **Comprehensive Logging**: Detailed logs saved for debugging and audit trails
- **Windows/Linux/Mac Compatible**: Cross-platform support with UTF-8 encoding handling

#### Processing Performance
- Single small country (10-20 stadiums): 2-5 minutes
- Single large country (50+ stadiums): 10-20 minutes
- All stadiums (514): 25-40 minutes
- Configurable rate limiting for reliable operation on various network conditions

#### Files Added/Modified
- **New Script**: `tools/verify_stadium_coordinates_by_country.py` (21.09 KB) - Main verification script
- **New Guides**: `STADIUM_VERIFICATION_USER_GUIDE.md` (13.66 KB) - Comprehensive user guide
- **New Reference**: `QUICK_REFERENCE.md` (2.29 KB) - Quick command reference
- **Updated**: `README.md` - Added Data Quality Tools section
- **Updated**: `CHANGELOG.md` - This entry

#### How It Works
1. Script reads all stadiums from `football_teams_database.csv`
2. Filters by selected country (or uses all if `--all` specified)
3. Performs OpenStreetMap geo search for each stadium
4. Calculates Haversine distance between stored and found coordinates
5. Flags mismatches exceeding configured threshold
6. Generates detailed report with categorized corrections
7. Optionally updates CSV with corrected coordinates and creates backup
8. Saves report and logs to organized folder structure

#### Benefits
- **Data Quality Assurance**: Systematic verification of stadium coordinates across entire database
- **Flexible Customization**: Distance thresholds and rate limits adjust to different needs
- **Organized Output**: Reports and backups organized in logical folders
- **User-Friendly**: Comprehensive documentation with examples and troubleshooting
- **Audit Trail**: Complete logging for tracking changes and debugging
- **Production-Ready**: Error handling, rate limiting, cross-platform compatibility

---

### 🎨 UI/UX Improvements: Icon Visibility & Layout Optimization

#### New Features
- **Professional PNG Icons**: Replaced emoji icons (🅿️, ⚡, ✈️) with high-quality PNG images from `/images` folder
  - `parking.png` - Parking information icon
  - `charging.png` - EV charging stations icon
  - `airport.png` - Airports information icon
  - Consistent professional appearance across all themes
  
- **Smart Airport Icon Display**: New configuration option to intelligently hide airport icon for nearby venues
  - `hideAirportIfNearby` - Enable/disable feature (default: false)
  - `airportProximityMiles` - Customizable threshold distance in miles (default: 300)
  - Uses Haversine formula for accurate distance calculation
  - Example: Hide airport icon if match venue is less than 300 miles from home

#### Enhancements
- **Compact Icon Size**: Reduced from 25px × 25px → **15px × 15px** for better space efficiency
- **Button Container Optimization**: Reduced from 33px → **23px** to minimize vertical footprint
- **Routes Header Refinements**:
  - Font size: 16px → **12px** (25% reduction)
  - Margins: 8px → **4px** (50% reduction)
  - Padding: 5px → **3px** (40% reduction)
- **Overall Height Reduction**:
  - Fixture header: 8px → 6px padding
  - Fixture info gap: 8px → 4px
  - Routes section: 8px → 6px padding
  - Match details: 14px → 12px font
  - Teams display: 18px → 16px font

#### Technical Details
- **Icon Styling**: Images use `object-fit: contain` for responsive scaling
- **Hover Effects**: Brightness filter (1.3x) on hover for visual feedback
- **Path Configuration**: Icons referenced from `modules/MMM-MyTeams-DriveToMatch/images/`
- **CSS Updates**: Removed colored circular backgrounds; added transparent button styling

#### Files Modified
- `MMM-MyTeams-DriveToMatch.js`:
  - Updated button HTML to use `<img>` tags instead of emoji
  - Added `calculateDistance()` method for Haversine distance calculation
  - Added `shouldShowAirportButton()` method for conditional rendering
  - Added new config options to defaults
  
- `MMM-MyTeams-DriveToMatch.css`:
  - Updated `.action-button` styling (width, height, background)
  - Updated `.action-button img` sizing (15px × 15px)
  - Updated `.routes-title` styling (font-size, margins, padding)
  - Updated `.routes-section` padding
  - Updated `.fixture-header` and `.fixture-info` spacing
  - Added hover effects for images
  
- `README.md`:
  - Added new feature in features list
  - Added Example 8 for smart airport display configuration
  - Added new POI display options to full configuration

#### Benefits
- **Cleaner Design**: Smaller, professional PNG icons improve visual hierarchy
- **Space Efficiency**: Reduced overall module height by 20-25%
- **Smart Features**: Users can configure airport icon visibility based on distance
- **Responsive**: Better display on various screen sizes and resolutions
- **Accessibility**: Higher contrast professional icons vs emoji

---

## [1.5.1] - 2025-11-07

### 🖨️ Print Functionality & Airport Simplification

#### New Features
- **Print Button on All Sheets**: Added 🖨️ Print button to Parking, Charging, and Airports information sheets
  - Located in toolbar above content for easy access
  - Toolbar automatically hidden when printing
  - Professional print styling with proper formatting

#### Enhancements
- **Airport Information Sheet Simplified**: 
  - Removed interactive Leaflet map visualization from airports sheet
  - Retained comprehensive data table format for quick reference
  - Airports still display all relevant information (Name, IATA Code, City, Country, Distance)
  - Organized by country for better scanning and readability

- **Improved HTML/CSS Styling**:
  - Consistent toolbar design across all three sheets (Parking, Charging, Airports)
  - Color-coded print buttons matching each sheet's theme:
    - Parking: Green (#018749)
    - Charging: Green (#4CAF50)
    - Airports: Teal/Cyan (#008B8B)
  - Media queries for print-friendly formatting

#### Documentation Updates
- Updated `Parking_Chargins_Airports_Feature_README.md` with comprehensive feature documentation
- Added print functionality explanation and troubleshooting section
- Updated README.md with new features list highlighting print capability
- All three sheets now documented in main README

#### Files Modified
- `MMM-MyTeams-DriveToMatch.js`: 
  - Updated `generateAirportsSheet()` - removed map code, added print button
  - Updated `generateParkingSheet()` - added print button and toolbar
  - Updated `generateChargingSheet()` - added print button and toolbar
- `Parking_Chargins_Airports_Feature_README.md` - Comprehensive feature guide
- `README.md` - Updated features and documentation links

---

## [[1.5.03] - 2025-11-01 Current]

### 🐛 Critical Bug Fix: Neutral Venue Coordinate Lookup

- **Fixed**: Neutral venue coordinates lookup bug where partial name matching was incorrectly returning data from unrelated stadiums
  - **Issue**: When venue name (e.g., "Murrayfield Stadium") couldn't find exact match in neutral venues map, it would fall through to CSV partial matching and return wrong coordinates (e.g., 40.5992, 19.7339 from Albanian "Bylis Ballsh")
  - **Root Cause**: Neutral venues map stored entries with short keys (e.g., "murrayfield"), but lookups were using full venue names ("Murrayfield Stadium")
  - **Solution**: Implemented fallback partial word-matching that splits venue names into search words and checks for key matches before falling through to CSV lookups
  - **Action Required**: Users should clear cache files after updating (`stadium-cache.json`, `fixtures-cache.json`) to ensure correct coordinates are used
- **Enhanced**: Debug logging in neutral venue resolution to better track whether venues came from hardcoded neutral venues vs CSV database
- **Files Modified**: `node_helper.js` (lines 1706-1719, 1469-1482)

### 🚀 Performance & Troubleshooting Enhancements

- **Comprehensive Troubleshooting Guide**: New `TROUBLESHOOTING.md` with 20+ common issues and solutions
- **Adaptive Cache TTL System**: Dynamic cache times based on fixture proximity (40-60% reduction in API calls)
  - 30+ days: 24h TTL | 15-30 days: 12h TTL | 7-15 days: 6h TTL | 3-7 days: 2h TTL | 1-3 days: 30m TTL | Match day: 10m TTL

---

## [1.4.3] - 2025-10-19 (Initial release)

### 🏟️ Stadium Database Expansion

- **Stadium Database**: Expanded from ~100 to **500+ professional teams** across **26 countries**
  - **British Isles**: 97 teams (44 Scotland, 51 England, 2 Wales)
  - **Major European Leagues**: 64 teams (Spain, Italy, Germany, France, Portugal, Netherlands, Belgium, Turkey, Austria, and others)
- **Data Quality**: All stadiums verified with GPS coordinates (4+ decimal precision), capacity data, postcodes, and team name aliases
- **Files Updated**: `football_teams_database.csv`, `README.md`, `package.json` (v1.4.3)

---

## [1.4.2] - 2025-10-10

### 🌉 Bridge Detection Database Expansion

- **Bridge Detection**: Expanded from 20 Scottish bridges to **110+ bridges** across 18 regions (UK and mainland Europe)
- **Regional Coverage**: Scotland (20), England (15), France (8), Spain/Portugal (7), Italy (6), Germany/Austria (5), Nordic region (10), plus bridges in Poland, Greece, Croatia, Turkey, Switzerland, and more
- **Regional Categorization**: Added `region` property to bridge objects for future filtering capabilities
- **Detection Optimization**: Calibrated detection radius zones (0.2-2.0km) based on bridge size and importance
- **Cross-Border Support**: Includes international crossings (Øresund, Svinesund, Severn bridges)
- **New File**: `major_bridges.csv` - Comprehensive bridge database with metadata
- **Files Modified**: `node_helper.js`, `README.md`

---

## [1.4.1] - 2025-10-07

### 📚 Documentation & Fixes

- **Fixed**: Screenshot display issue in README (filename typo: `screenshotRoute2l.png` → `screenshotRoute2.png`)
- **Enhanced**: Configuration options table expanded from 14 to 35 complete options with descriptions
- **Fixed**: Translation guide flag emojis (Scottish Gaelic, Irish Gaelic) and language codes
- **Files Updated**: `README.md`, `translations/QUICK_START.md`

---

## [1.4.0] - 2025-10-05

### 🚀 Route Saving & Navigation

- **Clickable Route Badge**: Made route type badge (⚡ Fastest/📏 Shortest) clickable to save routes; removed separate button
- **Turn-by-Turn Directions**: Saved routes now include detailed step-by-step navigation instructions from TomTom API
- **Filename Format Change**: New format `OpponentName - StadiumName.json` (replaces date-based format `YYYY-MM-DD_HomeTeam-vs-AwayTeam_RouteN.json`)
- **Saved File Enhancements**: 
  - Added "Opponent" and "Match Type" fields
  - Added "=== TURN-BY-TURN DIRECTIONS ===" section with numbered steps and distances
  - Renamed "=== WAYPOINTS ===" to "=== MAJOR WAYPOINTS ==="
  - Enhanced GPS coordinate labels
- **UI Improvements**: Hover effects (1.1x scale with glow), active state feedback, smooth transitions
- **Files Modified**: `MMM-MyTeams-DriveToMatch.js`, `MMM-MyTeams-DriveToMatch.css`, `node_helper.js`

---

## [1.3.0] - 2025-10-02

### 🏟️ Venue Database & Route Error Handling

- **Football Stadiums Database**: Renamed `scottish_grounds.csv` to `football_stadiums.csv` with **161 teams** across 26 countries
  - 44 Scottish teams (all professional leagues), 51 English teams (Premier League + Championship), 66 European teams
- **New Data Fields**: Country, League, Location, Stadium Capacity, Postal Code
- **Missing Coordinates Handling**: 
  - Added frontend validation to check for venue coordinates before route calculation
  - Displays "Stadium Lat/Lon Unknown" warning when coordinates unavailable
  - Prevents TomTom API errors
- **CSV Parser Enhancement**: Updated to parse 9 columns while maintaining backward compatibility
- **Files Modified**: `node_helper.js`

---

## [1.2.0] - 2025-10-01

### 🎯 Ferry Detection & Styling

- **Ferry Route Detection**: Added detection of 10 major Scottish-English ferry routes
  - Detects routes crossing water bodies (Firth of Forth, Firth of Clyde, Solway Firth, etc.)
  - Shows ferry operator names and estimated crossing times
- **Eurotunnel Support**: Added Eurotunnel crossing detection for France routes
- **UI Styling**:
  - Celtic green theme with gold accents
  - Highway/route shields styling for major roads
  - Improved waypoints display with emoji icons
  - Enhanced border and background styling
- **Configuration Options**: Added `showFerryDetails`, `showEurotunnel` toggles
- **Files Added/Modified**: Ferry detection database, `MMM-MyTeams-DriveToMatch.css`

---

## [1.1.0] - 2025-08-29

### 🛣️ Waypoint Detection & Highways

- **Major Highways Detection**: Added detection of 12 major Scottish motorways and A-roads
  - M8, M90, M9, M80, M77, M74, A92, A90, A1, A82, and more
  - Displays waypoints on routes that cross these major roads
- **GPS-Based Waypoint Extraction**: Implemented algorithm to identify waypoint coordinates where route crosses highways
- **Bridge Detection**: Added initial support for detecting crossing of 20 Scottish bridges (Queensferry Crossing, Forth bridges, Erskine Bridge, etc.)
- **Waypoints Display**: Shows waypoints in route summary with icons and descriptions
- **Files Modified**: `node_helper.js` (GPS coordinate calculation and detection logic)

---

## [1.0.0] - 2025-09-26

### 🎉 Initial Version

- **Core Features**:
  - Real-time fixture fetching from TheSportsDB API
  - Route calculation to upcoming away fixtures using TomTom API
  - Display routes with distance, duration, and traffic delays
  - Fuel cost estimation based on efficiency and fuel price
  - Multi-language support (English, Spanish, French, German, Italian, Dutch, Portuguese, Irish, Scottish Gaelic)
- **Route Options**: Display of both fastest and shortest routes
- **Customizable Configuration**: 25+ configuration options for flexibility
- **GPS-Based Route Calculation**: Calculates routes from user's home location to match venues
- **Cache System**: Implements caching for API responses to reduce quota usage
- **Responsive Design**: Module adapts to different screen sizes
- **Initial Stadium Database**: Support for 100+ football stadiums across European leagues
- **CSS Styling**: Custom styling with configurable colors and themes
- **Files**: Initial module structure with `MMM-MyTeams-DriveToMatch.js`, `node_helper.js`, `MMM-MyTeams-DriveToMatch.css`, configuration documentation

---

## Key Features Summary

| Feature | Version | Status |
|---------|---------|--------|
| Real-time Fixture Fetching | 1.0.0 | ✅ Archived |
| Route Calculation & Display | 1.0.0 | ✅ Archived |
| Fuel Cost Estimation | 1.0.0 | ✅ Archived  |
| Multi-Language Support | 1.0.0 | ✅ Archived  |
| Waypoint Detection (Highways) | 1.1.0 | ✅ Archived  |
| Bridge Detection (110+ bridges) | 1.1.0 - 1.4.2 | ✅ Archived  |
| Ferry Detection (10 routes) | 1.2.0 | ✅ Archived  |
| Eurotunnel Detection | 1.2.0 | ✅ Archived |
| Bug Fix & Typo Fix | 1.3.0 | ✅ Archived  |
| Turn-by-Turn Directions | 1.4.0 | ✅  Archived   |
| Route Saving | 1.4.0 | ✅ Archived  |
| Stadium Database (500+ teams) | 1.3.0 - 1.4.3 | ✅  Archived   |
| Adaptive Cache TTL | 1.4.3  |  ✅  Archived   |
| Critical bug fix for neturak venue issues | 1.5.0  | ✅ Active |


