# Parking, Charging & Airports Features

## Overview

Clickable icons for **Parking**, **Charging Stations**, and **Airports** have been added to the **MMM-MyTeams-DriveToMatch** module's fixture header. When clicked, they generate comprehensive information sheets:

- **Parking Sheet**: Interactive map + 10 nearest car parks within 2-mile radius with parking details
- **Charging Sheet**: Interactive map + 10 nearest EV charging stations with connector types and operators
- **Airports Sheet**: 10 nearest international airports within 200-mile radius (table format)

## Features

### 1. **Information Buttons**
- Three clickable icons in the fixture header:
  - **Parking Button** (`parking.png`) - Professional icon with hover brightness effect
  - **Charging Button** (`charging.png`) - Professional icon for EV charging
  - **Airports Button** (`airport.png`) - Professional icon for flight information (conditionally displayed)
- Each button generates a dedicated information sheet
- Compact 15×15px icons for minimal vertical footprint
- Optional smart hide feature: Airport button can be hidden if venue is within configured distance from home

### 2. **Print Functionality**
- **Print Button** 🖨️ appears on all three sheets (Parking, Charging, Airports)
- Located in toolbar area above the content
- Browser-friendly print formatting
- Toolbar automatically hidden when printing
- Responsive layout for all screen sizes

### 3. **Data Sources**
- **Parking**: TomTom API & Overpass API - real-time parking facilities within 2-mile radius
- **Charging**: TomTom API - EV charging stations within 3-mile radius
- **Airports**: TomTom API - international airports within 200-mile radius

### 4. **Generated Information Sheets**

#### Parking Sheet (`{Opponent}-Parking.html`)
- **Interactive map** with venue and parking location markers
- **Info grid** with venue, match, and count of car parks
- **Detailed table**: Car Park Name, Street Address, Post Code, Distance, Type, Cost Info
- **Print button** 🖨️ for convenient printing
- **Map markers**: Stadium icon for venue, parking icon for facilities

#### Charging Sheet (`{Opponent}-Charging.html`)
- **Interactive map** with venue and EV charging station markers
- **Info grid** with venue, match, and count of charging points
- **Detailed table**: Station Name, Address, Distance, Connector Types, Operator
- **Print button** 🖨️ for convenient printing
- **Map markers**: Stadium icon for venue, charging icon for facilities

#### Airports Sheet (`{Opponent}-Airports.html`)
- **Data table only** (no map) for quick reference
- **Info grid** with venue, match opponent, and airport count
- **Detailed table**: Airport Name, IATA Code, City, Country, Distance (up to 200 miles)
- **Print button** 🖨️ for convenient printing
- **Organized by country** for easy scanning
- **Conditional Display**: Airport button may be hidden based on `hideAirportIfNearby` configuration

#### All Sheets Include
- **Professional header** with match details
- **Print button** 🖨️ toolbar above content
- **Footer** with data attribution and disclaimers
- **Responsive design** for mobile/tablet viewing

## File Structure

### Modified Files

1. **MMM-MyTeams-DriveToMatch.js**
   - Added `createFixtureHeader()` modifications for parking button
   - New `requestParkingInfo()` - sends request to backend
   - New `handleParkingInfo()` - receives and processes parking data
   - New `generateParkingSheet()` - creates HTML parking sheet
   - New `_escapeHtml()` - sanitizes HTML special characters
   - New `handleParkingSheetSaved()` - handles save confirmation
   - New `handleParkingInfoError()` - handles errors
   - Updated `socketNotificationReceived()` to handle parking notifications

2. **node_helper.js**
   - New `getParkingInfo()` - async function querying Overpass API
   - New `_calculateDistance()` - Haversine formula for distance calculation
   - New `saveParkingSheet()` - saves HTML to file system
   - Updated socket notification handler for parking requests

3. **MMM-MyTeams-DriveToMatch.css**
   - New `.fixture-info` and `.fixture-top-row` flexbox styling
   - New `.parking-button` styles with hover/active effects
   - Responsive design for mobile devices

4. **translations/en.json**
   - New `"PARKING_INFO"` translation string

### Output Files

- Parking sheets saved as: `mySavedRoutes/{Opponent}-Parking.html`
- Example: `Feyenoord-Parking.html`

## How It Works

### User Flow
1. User clicks 🅿️ **parking icon** in fixture header
2. Frontend checks venue coordinates availability
3. Socket notification sent to Node helper with venue data
4. Backend queries **Overpass API** for parking within 2-mile radius
5. Backend calculates distances using **Haversine formula** (accurate to ~100 meters)
6. Backend returns 10 nearest parking locations sorted by distance
7. Frontend generates **interactive HTML parking sheet**
8. Frontend sends HTML to backend for file saving
9. **HTML file saved** to `mySavedRoutes/` directory
10. User notification shown with filename

### Technical Implementation

#### Distance Calculation
- Uses **Haversine formula** for accurate great-circle distances
- Converts 2-mile radius to ~0.029 degrees for Overpass API query
- Returns distances in miles for display

#### Data Processing
- Filters Overpass API results to remove incomplete entries
- Extracts: name, address, postcode, coordinates, fee status
- Detects free parking: `fee=no` or `parking=free` tags
- Sorts by distance and returns top 10

#### Error Handling
- Validates venue coordinates before API call
- Gracefully handles API timeouts (15-second limit)
- Shows user alerts for errors
- Logs all errors for debugging

## Browser Compatibility

The generated parking sheet uses:
- **Leaflet.js** (CDN) - all modern browsers
- **HTML5 & CSS3** - print-friendly
- Responsive design - desktop, tablet, mobile

## Performance Notes

- **Overpass API** query: ~2-5 seconds typically
- HTML generation: <1 second
- File save: Instant
- Map loads in browser: <2 seconds

## Usage Tips

1. **Generate Sheets**: Click the icon buttons in fixture header (Parking, Charging, and Airports if visible)
2. **Airport Button Visibility**: 
   - Visible by default for all fixtures
   - Can be hidden for nearby venues by enabling `hideAirportIfNearby: true` in config
   - Default threshold is 300 miles - customize with `airportProximityMiles` option
3. **Print Sheet**: Click the 🖨️ Print button in the generated sheet's toolbar
4. **Open Files**: Find HTML files in `mySavedRoutes/` folder and open in browser
5. **Share**: Email/share the HTML files with friends or download for offline use
6. **Mobile**: Fully responsive - works on phones and tablets in portrait and landscape
7. **Verify Info**: Always verify parking hours, charging availability, and flight times directly

## Troubleshooting

### No Results Found
- Venue may be in remote area with limited facilities
- Check match location is correctly set in configuration
- Try increasing search radius in config if available

### Incorrect Distances
- TomTom provides straight-line distances as approximation
- Use map (for Parking/Charging) for detailed route planning
- Road distances may vary from displayed values

### Map Not Loading (Parking/Charging only)
- Check internet connection (Leaflet CDN required)
- Browser console shows network errors if present
- Try in different browser or clear cache
- Map not centered on stadium - check stadiun cordinates in  `football-teams_database.csv` and `stadium-cache.js` are accurate, they may be correct by a few km  and pointing to center of the Town/City.
- Maps not applicable to Airports sheet

### Print Issues
- Ensure print stylesheets are applied (modern browsers should work)
- Try different print settings (landscape/portrait)
- Test print to PDF first before printing to paper

## Data Sources

- **Parking Data**: TomTom Maps API & Overpass API 
- **Charging Data**: TomTom Maps API  
- **Airport Data**: TomTom Maps API
- **Maps**: OpenStreetMap tiles via Leaflet.js
- **Map Engine**: Leaflet.js (open source)

## Future Enhancements

- Add real-time parking availability where available
- Parking pricing information from TomTom/Google APIs
- Walking distance/time to stadium entrance from parking/charging locations
- Email delivery of generated sheets

## Performance Optimizations

Suggested improvements for future versions:

1. **Cache facility data** - reuse results for same venue across multiple fixtures
2. **Rate limiting** - track API calls to avoid hitting TomTom limits
3. **Progressive loading** - show tables while maps load asynchronously
4. **Marker clustering** - group nearby facilities on zoomed-out maps
5. **Offline capability** - store facility history locally for previously visited venues
6. **Batch processing** - generate multiple sheets at once for season fixtures

---

**Module Version**: 1.5.1+Icons  
**Features**: Parking, Charging Stations, Airports  
**Latest Update**: 2025-11-07  
**Status**: Production Ready  

## Recent Changes

**Current - Icon & Layout Optimization (2025-11-07)**
- ✅ Replaced emoji icons with professional PNG images (parking.png, charging.png, airport.png)
- ✅ Reduced icon size from 25px × 25px to **15px × 15px** for compact display
- ✅ Minimized overall module height (20-25% reduction)
- ✅ Added `hideAirportIfNearby` config option for smart airport button visibility
- ✅ Added `airportProximityMiles` config option (default: 300 miles threshold)
- ✅ Improved button styling with transparent backgrounds and hover effects
- ✅ Reduced "Routes To Match Stadium" header size (16px → 12px)

**v1.5.1 - Print Button Addition & Airport Simplification (2025-11-07)**
- ✅ Added 🖨️ Print button to all three information sheets
- ✅ Removed airport map visualization (table format only for quick reference)
- ✅ Improved toolbar styling for consistency across all sheets
- ✅ Added print media queries for better formatting
- ✅ Updated documentation for all three features