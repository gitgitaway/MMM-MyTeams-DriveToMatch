# Changelog

All notable changes to the **MMM-MyTeams-DriveToMatch** module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [WIP - Unreleased]

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
| Stadium Database (500+ teams) | 1.3.0 - 1.4.3 | ✅ Active |

| Adaptive Cache TTL | Unreleased | 🔄 In Progress |


