# Waypoints & Bridge Detection

Guide to GPS-based waypoint detection including bridges, motorways, ferries, and special crossings.

## Overview

The module automatically detects and displays major waypoints on your route including:
- **Bridges** (110+ major bridges across UK and Europe)
- **Motorways & A-roads** (major highways like M8, M90, A90)
- **Ferry Crossings** (Scottish-English ferry routes, European ferries)
- **Eurotunnel** (France-UK crossing)

Waypoints are displayed in priority order with up to 5 shown per route.

## GPS Bridge Detection

### How It Works

1. TomTom API returns route coordinates (latitude/longitude waypoints)
2. Module calculates distance from each route point to all bridge coordinates
3. If distance ≤ detection radius (0.2-2.0km), bridge is detected
4. Uses Haversine formula for accurate great-circle distance calculation
5. Detected bridges appear in waypoints list with distance calculated

### Supported Bridges (110+ Total)

**Scottish Bridges (20)**
- Major crossings: Queensferry Crossing, Forth Road Bridge, Forth Bridge, Erskine Bridge
- Glasgow bridges: Kingston Bridge, Clyde Arc, Squinty Bridge, Clyde Bridge
- Highland bridges: Skye Bridge, Connel Bridge, Ballachulish Bridge
- East Coast: Tay Road Bridge, Kincardine Bridge, Clackmannanshire Bridge
- North: Cromarty Bridge, Dornoch Firth Bridge, Friarton Bridge

**UK Bridges (15 England, 4 Wales, 4 Northern Ireland, 4 Ireland)**
- England: Dartford Crossing, Humber Bridge, Severn Bridge, Tower Bridge, London Bridge
- Wales: Britannia Bridge, Menai Suspension Bridge
- International: Øresund Bridge (Denmark-Sweden), Svinesund Bridge (Norway-Sweden)

**European Bridges (60+)**
- France (8): Millau Viaduct, Pont de Normandie, Pont de Saint-Nazaire
- Spain/Portugal (7): Vasco da Gama Bridge, 25 de Abril Bridge
- Italy (6): Ponte Vecchio, Rialto Bridge, Ponte della Libertà
- Nordic Region (16): Great Belt Bridge, Öland Bridge, Limfjord Bridge
- Plus bridges in Germany, Austria, Netherlands, Belgium, Poland, Greece, Croatia, Turkey, Switzerland

### Detection Accuracy

| Bridge Size | Radius | Reliability | Examples |
|------------|--------|-------------|----------|
| Large/Major | 0.5-2.0 km | Very reliable | Queensferry, Erskine, Millau Viaduct |
| Medium | 0.3-0.5 km | Reliable | Connel, Ballachulish, Great Belt Bridge |
| Small/City | 0.2-0.3 km | May miss | Tower Bridge, Rialto Bridge, Clyde Arc |

**Note:** Radius varies based on bridge size and importance for accurate detection.

### Console Output Example

```
[LOG] MMM-MyTeams-DriveToMatch: GPS detected bridge: Queensferry Crossing (distance: 0.12km)
[LOG] MMM-MyTeams-DriveToMatch: GPS detected bridge: Forth Road Bridge (distance: 0.08km)
[LOG] MMM-MyTeams-DriveToMatch: GPS bridge detection found 3 bridges
```

### Debug Bridge Detection

Enable in config:
```javascript
config: {
    debug: true,
    showWaypoints: true
}
```

Check console for:
```
GPS detected bridge: [Bridge Name] (distance: X.XXkm)
```

If no bridges detected:
- Route may not pass close enough to any bridges
- Check GPS coordinates are accurate (4+ decimal places)
- Some smaller bridges may be missed if route passes > 0.3km away

## Motorways & Major Roads

### Scottish Motorways
M8, M90, M9, M80, M77, M74

### A-Roads
A92, A90, A1, A82, and others

### European Roads
Routes detect highway usage across all supported countries.

### Detection

Automatically detected when route crosses these major roads. Shown in waypoints list with priority after ferries and bridges.

## Ferry Detection

### Scottish Ferry Routes

Module detects 10+ major ferry crossings for Scottish-English fixtures:
- Firth of Forth crossings
- Firth of Clyde crossings
- Solway Firth crossings

Shows ferry operator names and estimated crossing times when available.

### European Ferry Routes

For European fixtures (UEFA competitions), module automatically adds ferry detection:
- **Amsterdam Ferry** (for Netherlands/German/Belgium matches)
- **Cherbourg/Roscoff** (for France matches)
- **Europort** (for other French/Spanish matches)

### Ferry Configuration

Enable/disable ferry detection:
```javascript
config: {
    showFerryDetails: true  // Show operator and crossing time
}
```

Console output:
```
[LOG] MMM-MyTeams-DriveToMatch: Added Amsterdam Ferry for European fixture
```

## Eurotunnel Detection

### Features

- Automatically detects Eurotunnel usage on France routes
- Shows "Eurotunnel" in waypoints list
- Includes crossing details when available

### Configuration

```javascript
config: {
    showEurotunnel: true
}
```

### Console Output

```
[LOG] MMM-MyTeams-DriveToMatch: Eurotunnel detected on route
```

## Waypoint Priority & Display

### Display Priority Order

1. **Ferry** (highest - European fixture indicator)
2. **Bridges** (GPS-detected major crossings)
3. **Motorways** (M-roads like M8, M90)
4. **A-Roads** (A92, A90, A1, etc.)
5. **Other Features** (toll information, special landmarks)

### Maximum Waypoints

By default, up to **5 waypoints** displayed per route.

Configure with:
```javascript
config: {
    showWaypoints: true,
    maxRoutes: 2
}
```

### Example Display

```
Route 1: FASTEST (12.5 miles, 25 min)
Waypoints: Amsterdam Ferry, Queensferry Crossing, M90, M9, M8

Route 2: SHORTEST (14.2 miles, 28 min)
Waypoints: Queensferry Crossing, Kingston Bridge, M8, A814
```

## European Fixture Example

### Feyenoord (Rotterdam, Netherlands) - UEFA Europa League

Console output:
```
[LOG] MMM-MyTeams-DriveToMatch: Selected fixture - Feyenoord (UEFA Europa League) [european] on 2025-11-27
[LOG] MMM-MyTeams-DriveToMatch: Added Amsterdam Ferry for European fixture
[LOG] MMM-MyTeams-DriveToMatch: GPS detected bridge: Queensferry Crossing (distance: 0.12km)
[LOG] MMM-MyTeams-DriveToMatch: Route 1: waypoints: ['Amsterdam Ferry (DFDS)', 'Queensferry Crossing', 'M90', 'M9', 'M8']
```

## Troubleshooting

### Bridges Not Appearing
1. Enable `debug: true` to see detection logs
2. Check console for: `GPS detected bridge: [Bridge Name] (distance: X.XXkm)`
3. If nothing appears, route may not pass close to any bridges
4. Verify bridge detection is enabled: `showWaypoints: true`

### Ferry Not Showing on European Fixture
1. Verify it's classified as European fixture (UEFA competition)
2. Check console for: `Added [Location] Ferry for European fixture`
3. Ensure `showFerryDetails: true` in config

### Eurotunnel Not Detected
1. Check route actually uses Eurotunnel (France-UK crossing)
2. Ensure `showEurotunnel: true` in config
3. Enable `debug: true` to see detection details

### GPS Coordinates Issue
- Ensure home coordinates have 4+ decimal places
- Verify stadium coordinates in database are accurate
- Small coordinate errors can cause waypoints to be missed

## Advanced Configuration

### Disable Specific Features
```javascript
config: {
    showWaypoints: false,      // Hide all waypoints
    showFerryDetails: false,   // Hide ferry information
    showEurotunnel: false,     // Hide Eurotunnel crossings
    avoidTolls: true           // Plan routes avoiding tolls (affects bridges/ferries)
}
```

### Enable Debug Mode
```javascript
config: {
    debug: true,
    showWaypoints: true
}
```

This shows detailed logging:
- Bridge detection with distances
- Ferry crossing detection
- Waypoint selection and priority
- Route waypoint ordering

## Performance Impact

- Bridge detection: <5ms additional processing per route
- Ferry detection: <2ms per route
- No API overhead (all calculations local)
- Total impact on route calculation: negligible (<10ms)