# Stadium Database Management

Guide to managing and updating the football stadium database.

## Database Overview

The module includes `football_teams_database.csv` with **161 professional teams** across **26 countries**:

### British Isles (97 teams)
- **Scotland**: 44 teams (SPFL Premiership, Championship, League One, League Two)
- **England**: 51 teams (Premier League, Championship)
- **Wales**: 2 teams (Swansea City, Cardiff City)

### Major European Leagues (64 teams)
- **Spain**: 7 teams (Real Madrid, Barcelona, Atletico Madrid, etc.)
- **Italy**: 7 teams (Inter Milan, AC Milan, Juventus, Atalanta, etc.)
- **Germany**: 7 teams (Bayern Munich, Borussia Dortmund, RB Leipzig, etc.)
- **France**: 7 teams (PSG, Monaco, Brest, Lille, etc.)
- **Portugal**: 4 teams (Benfica, Sporting CP, Porto, Braga)
- **Netherlands**: 6 teams (Feyenoord, PSV Eindhoven, Ajax, etc.)
- **Plus**: Belgium, Austria, Turkey, Greece, Ukraine, Serbia, Croatia, Sweden, Denmark, Norway, Romania, Czech Republic, Slovakia, Switzerland, Bulgaria, Azerbaijan, Hungary

## Data Structure

### CSV Format

```csv
Team,Stadium,Latitude,Longitude,Country,League,Location,Stadium_Capacity,Post_Code
Celtic FC,Celtic Park,55.8611,-4.2056,Scotland,SPFL Premiership,Glasgow,60411,G40 3RE
```

### Required Fields

| Field | Format | Example | Notes |
|-------|--------|---------|-------|
| Team | String | "Celtic FC" | Full team name |
| Stadium | String | "Celtic Park" | Stadium/ground name |
| Latitude | Decimal | 55.8611 | 4+ decimal places required |
| Longitude | Decimal | -4.2056 | 4+ decimal places required |
| Country | String | "Scotland" | Country name |
| League | String | "SPFL Premiership" | League/competition name |
| Location | String | "Glasgow" | City/town name |
| Stadium_Capacity | Number | 60411 | Seating capacity |
| Post_Code | String | "G40 3RE" | Postal/ZIP code |

## Adding New Teams

### Method 1: Manual Editing

1. Open `football_teams_database.csv` in a text editor or spreadsheet application
2. Add new row with all required fields
3. Ensure accurate GPS coordinates (4+ decimal places)
4. Save file
5. Restart MagicMirror to reload database

**Example new row:**
```csv
FC Barcelona,Camp Nou,41.3815,-2.1223,Spain,La Liga,Barcelona,99354,08028
```

### Method 2: Windows Batch File (Windows Only)

```powershell
Set-Location "$env:USERPROFILE\MagicMirror\modules\MMM-MyTeams-DriveToMatch"
.\update_football_stadiums.cmd
```

**Menu Options:**
1. Add teams from country's leagues
2. Add UEFA competition teams for future seasons
3. Add single team manually
4. View database statistics
5. Create backup

### Method 3: Programmatic Updates

Add teams via Python scripts (if provided ) 

```bash
python .gitignore/python_scripts/populate_stadium_data.py
```

## Finding Accurate GPS Coordinates

### Using Google Maps

1. Go to [Google Maps](https://maps.google.com)
2. Search for the stadium name
3. Right-click on the stadium location on the map
4. Click the coordinates that appear
5. Coordinates copied - format: `latitude, longitude`
6. Use with 4+ decimal places (e.g., `55.8611, -4.2056`)

### Using Dedicated Stadium Databases

- **Wikipedia Stadium Lists**: Usually include coordinates
- **Stadium Official Websites**: Often have location information
- **Google Earth**: Another way to get precise coordinates
- **OpenStreetMap**: Community-maintained location data

### Coordinate Validation

- **Latitude**: Must be between -90 and +90
- **Longitude**: Must be between -180 and +180
- **Decimal Places**: Use at least 4 (e.g., 55.8611)
- **Format**: Decimal degrees (not degrees/minutes/seconds)

## Backup & Recovery

### Automatic Backups

Backups created automatically when using batch file update method.

Location: `backups/` folder with timestamp:
```
backups/football_stadiums_20250126_143022.csv
```

### Manual Backup

Copy `football_teams_database.csv` before making changes:
```bash
Copy-Item football_stadiums.csv football_stadiums_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv
```

### Restore from Backup

1. Locate backup file in `backups/` folder
2. Copy backup file content
3. Replace main `football_stadiums.csv` with backup content
4. Restart MagicMirror

## Database Caching

### Stadium Cache System

Module creates `stadium-cache.json` for performance:
- **First load**: Parses CSV file (~200ms)
- **Subsequent loads**: Loads from cache (<10ms)
- **Auto-invalidation**: Rebuilds if CSV modified
- **20x faster** startup time

### Manual Cache Refresh

From another module or notification system:
```javascript
this.sendNotification("REFRESH_STADIUM_CACHE");
```

Module will:
1. Delete old cache
2. Re-parse CSV file
3. Create new cache
4. Reload fixtures with updated data

### Cache Files

| File | Purpose | Size | Auto-Recreates |
|------|---------|------|----------------|
| `stadium-cache.json` | Parsed database (517 teams) | ~100KB | Yes, on startup |

### Delete Cache

Safe to delete - automatically recreates on restart:
```bash
Remove-Item stadium-cache.json
```

Then restart MagicMirror.

## Database Maintenance

### Regular Updates

**Before each season:**
1. Add any new teams promoted to league
2. Remove relegated teams (optional)
3. Verify stadium information hasn't changed
4. Update coordinates if stadium moved

**Mid-season updates:**
1. For European fixtures, add any new opponents
2. Update stadium capacities if changed
3. Verify postal codes

### Duplicate Checking

Before adding teams, check for duplicates:
1. Search CSV for team name
2. Verify coordinates don't match existing entries
3. Batch file has built-in duplicate detection

### Data Validation

When adding teams, verify:
- ✅ Team name is correct and complete
- ✅ Stadium name matches official venue name
- ✅ Coordinates are accurate (test on Google Maps)
- ✅ Country and league are correct
- ✅ Location (city) is accurate
- ✅ Capacity is current (not historical)
- ✅ Postcode is valid for the country

## Troubleshooting

### Stadium Not Found

Module displays "Stadium Lat/Lon Unknown":
1. Verify team name in config matches CSV exactly
2. Check stadium is in database: search `football_stadiums.csv`
3. Add missing team using methods above
4. Delete cache and restart MagicMirror

### Routes Not Calculating

If routes show error for valid stadium:
1. Verify coordinates are not null/empty
2. Check coordinates are in correct decimal format
3. Test coordinates on Google Maps
4. Ensure longitude has minus sign if western hemisphere

### Cache Not Updating

If changes to CSV aren't reflected:
1. Delete `stadium-cache.json`
2. Restart MagicMirror completely
3. Monitor console for cache rebuild message

### Performance Issues

If startup is slow:
1. Check CSV file size (should be <500KB)
2. Remove very old entries not needed
3. Verify cache file exists and is recent
4. Clear all cache files and restart

## Advanced Topics

### Batch Adding Teams

For adding multiple teams at once:
1. Create temporary CSV file with new teams
2. Use Python script to merge with main database
3. Validate all entries
4. Back up original
5. Replace main file
6. Restart MagicMirror

Example Python approach:
```python
import csv

# Read existing database
existing_teams = []
with open('football_teams_database.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    existing_teams = list(reader)

# Add new teams (check for duplicates first)
new_teams = [...]

# Write combined database
with open('football_teams_database.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['Team', 'Stadium', 'Latitude', 'Longitude', 'Country', 'League', 'Location', 'Stadium_Capacity', 'Post_Code'])
    writer.writeheader()
    writer.writerows(existing_teams + new_teams)
```

### Database Synchronization

If using multiple MagicMirror instances:
1. Maintain single master database
2. Copy `football_teams_database.csv` to all instances
3. Clear cache on all instances after update
4. Restart all instances

## Best Practices

1. **Backup regularly**: Before major changes, create backup
2. **Validate GPS coordinates**: Always verify on Google Maps before adding
3. **Use standard formats**: Country names, league names should be consistent
4. **Document changes**: Note why teams were added/removed
5. **Test after updates**: Verify module still loads and displays routes
6. **Keep postcode accurate**: Important for UK routes
7. **Monitor performance**: Cache should keep startup fast even with 500+ teams

## Contact Support

If database issues persist:
1. Check console for specific error messages
2. Enable `debug: true` in config
3. Verify file encoding is UTF-8
4. Check file permissions allow reading
5. Try with backup database to isolate issue