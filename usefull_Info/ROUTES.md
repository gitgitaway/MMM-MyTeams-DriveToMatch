# Saving Routes with Turn-by-Turn Directions

Complete guide to saving routes with detailed navigation instructions.

## Quick Start

1. Display routes for your desired fixture
2. Click the route type badge (⚡ Fastest or 📏 Shortest)
3. Route saves to `mySavedRoutes` folder with turn-by-turn directions

## How to Save a Route

### Interactive Method
1. **Display the routes** for your desired fixture (module shows 2 options by default)
2. **Click the route type badge** to save:
   - Click "⚡ Fastest" to save the fastest route
   - Click "📏 Shortest" to save the shortest route
3. **Visual feedback**: Badge scales and glows on hover
4. **Confirmation**: Notification shows saved filename

### Filename Format

Routes save as:
```
OpponentName - StadiumName.json
```

**Examples:**
- `Rangers - Ibrox Stadium.json`
- `Dundee - Dens Park.json`
- `Feyenoord - De Kuip.json`

## Saved File Contents

Each route file includes 7 comprehensive data sections:

### 1. Match Details
- Opponent name and match type (Home/Away)
- Both teams, fixture date, venue, postcode
- Competition name

### 2. Route Details
- Route type (FASTEST or SHORTEST)
- Total distance and duration
- Traffic delay information
- Estimated fuel cost

### 3. Turn-by-Turn Directions
Numbered step-by-step navigation:
```
1. Head west on London Road - 0.0 km from start
2. Turn right onto M8 - 1.2 km from start
3. At junction 19, take M8 exit towards Glasgow - 3.5 km from start
4. Continue on M8 for 8.5 miles - 5.8 km from start
5. Take exit 25 towards Govan - 15.2 km from start
```

### 4. Major Waypoints
Summary of major routes:
- Motorways (M8, M90, M9, etc.)
- Major A-roads (A90, A92, etc.)
- Scottish bridges and European ferries

### 5. Special Features
- Eurotunnel usage (if applicable)
- Ferry crossings (if applicable)

### 6. GPS Coordinates
- Start location (your home) latitude/longitude
- Destination (stadium) latitude/longitude

### 7. Technical Data
- Raw distance (meters)
- Raw duration (seconds)
- Traffic delay (seconds)
- Timestamp when route was saved

## Example Saved File

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

## Important Notes

### File Overwriting
Saving to the same opponent's stadium **overwrites** the previous file. This keeps latest route data fresh.

To preserve multiple routes:
1. Manually rename the saved file after saving (e.g., add date or "Fastest" suffix)
2. Or add a suffix before saving another route to the same venue

### Folder Structure
```
mySavedRoutes/
├── Rangers - Ibrox Stadium.json
├── Dundee - Dens Park.json
├── Feyenoord - De Kuip.json
└── Roma - Stadio Olimpico.json
```

## Use Cases

- **Trip Planning**: Save routes in advance to review turn-by-turn directions
- **Offline Navigation**: Print or save routes for areas with poor signal
- **Route Comparison**: Save both fastest and shortest routes to compare
- **Historical Reference**: Keep record of routes taken to different stadiums
- **Sharing**: Share route files with fellow supporters for away matches

## Troubleshooting

**Route not saving?**
- Check `mySavedRoutes` folder exists (creates automatically on first save)
- Verify write permissions for module directory
- Check browser console for error messages

**Missing turn-by-turn directions?**
- Some routes may have limited guidance data from TomTom
- Enable `debug: true` in config to see what data is available
- Try saving again - may be temporary API issue

**File overwritten unintentionally?**
- Backups exist in `backups/` folder with dates if available
- Consider renaming files before saving new routes to same venue
- Enable file versioning in your version control system