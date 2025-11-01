# Stadium Update Notification Guide

## Overview

The **Stadium Update Notification** feature allows you to keep your module's stadium database current with the latest venue information from multiple web sources. This is particularly important for:

- **New stadiums** - When teams move to new venues
- **Renamed stadiums** - When stadiums are renamed by sponsors or clubs
- **Updated coordinates** - When GPS coordinates need refinement
- **New venue details** - Postal codes, contact info, etc.
- **International coverage** - Adding new stadiums for new teams

---

## How It Works

### System Architecture

The stadium update system works through a multi-layer notification system:

```
┌─────────────────────────────────────────────────────────┐
│ MagicMirror Front-End Display                            │
│ (Shows stadium update notification button)               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ User clicks "Update Stadium Database"
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ MMM-MyTeams-DriveToMatch.js (Module)                    │
│ - Receives click event                                  │
│ - Sends UPDATE_STADIUM_DATABASE notification            │
│ - Displays progress alerts to user                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Socket Notification
                 │ "UPDATE_STADIUM_DATABASE"
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ node_helper.js (Backend)                                │
│ - Receives update request                               │
│ - Fetches stadium data from multiple sources:           │
│   • Football Stadiums API                               │
│   • TheSportsDB stadium endpoints                        │
│   • Wikipedia/web sources                               │
│ - Parses and validates data                             │
│ - Updates football_stadiums.csv                         │
│ - Rebuilds stadium-cache.json                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Progress notifications:
                 │ - STADIUM_UPDATE_PROGRESS (percent/status)
                 │ - STADIUM_UPDATE_COMPLETE (success summary)
                 │ - STADIUM_UPDATE_ERROR (failure details)
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Front-End Again (Notification Display)                  │
│ - Show progress: "Fetching stadium data... (45%)"      │
│ - Show success: "Updated 47 stadiums. Reloading..."    │
│ - Show error: "Stadium update failed: Network error"    │
│ - Auto-refresh fixtures after completion                │
└─────────────────────────────────────────────────────────┘
```

---

## Notification Cycle

### Detailed Flow

#### Phase 1: User Initiates Update

```
User Action: Clicks "Update Stadium Database" button
       ↓
Module detects click
       ↓
Sends notification to user: "Starting stadium database update..."
       ↓
Sends socket notification to node_helper: UPDATE_STADIUM_DATABASE
```

#### Phase 2: Backend Processing

```
node_helper receives: UPDATE_STADIUM_DATABASE
       ↓
Determines update sources
       ↓
For each source:
  ├─ Fetch data (API call or web scrape)
  ├─ Parse stadium information
  ├─ Validate coordinates and data
  └─ Send progress update (STADIUM_UPDATE_PROGRESS)
       ↓
Merge results from all sources
       ↓
Update CSV file: football_stadiums.csv
       ↓
Rebuild cache: stadium-cache.json
       ↓
Reload module to use new stadium data
```

#### Phase 3: User Feedback

```
Send: STADIUM_UPDATE_PROGRESS (every 10-15 stadiums)
       ↓
Front-end shows: "Processing stadium data... (25%)"
       ↓
Send: STADIUM_UPDATE_COMPLETE (after all processed)
       ↓
Front-end shows: "Updated 87 stadiums successfully!"
       ↓
Auto-reload fixtures (2-second delay)
       ↓
Fixtures now use latest stadium data
```

---

## Configuration

### Basic Configuration

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    config: {
        // Enable stadium update notifications
        enableStadiumUpdateNotification: true,  // default: true
        
        // ... other config options
    }
}
```

### What Happens When Enabled

| Setting | Effect |
|---------|--------|
| `enableStadiumUpdateNotification: true` | ✓ Shows update button in UI<br/>✓ Allows manual updates<br/>✓ Displays progress notifications |
| `enableStadiumUpdateNotification: false` | ✗ No update button shown<br/>✗ Cannot manually update<br/>✗ Stadium data is static |

---

## User Interaction

### Triggering an Update

#### Method 1: Click UI Button

1. **Look for** the stadium update button in the module display
2. **Click** "Update Stadium Database" button
3. **Watch** for progress notifications
4. **Wait** for completion (usually 30-60 seconds)

#### Method 2: Send Notification (Advanced)

If you have another module that needs to trigger updates:

```javascript
// From another module
this.sendNotification("UPDATE_STADIUM_DATABASE");
```

---

## Notification Details

### STADIUM_UPDATE_PROGRESS

**Sent by:** node_helper.js  
**Received by:** MMM-MyTeams-DriveToMatch.js  
**Frequency:** Every 10-20 stadiums processed

**Payload structure:**
```javascript
{
    message: "Processing stadium data from TheSportsDB...",
    progress: 25,  // Percentage (0-100)
    stadiumCount: 15,  // How many processed so far
    totalEstimate: 60  // Estimated total to process
}
```

**User sees:**
```
┌─────────────────────────────────┐
│ Stadium Database Update         │
│ Processing stadium data... (25%)│
└─────────────────────────────────┘
```

---

### STADIUM_UPDATE_COMPLETE

**Sent by:** node_helper.js (when finished)  
**Received by:** MMM-MyTeams-DriveToMatch.js  
**When:** After all sources processed and data saved

**Payload structure:**
```javascript
{
    stadiumCount: 87,  // Total stadiums updated
    newStadiums: 5,   // Newly added stadiums
    updatedStadiums: 12,  // Existing stadiums with changes
    sources: ["thesportsdb", "football-stadiums-api"],  // Sources used
    timestamp: "2025-11-15T14:32:10Z"
}
```

**User sees:**
```
┌─────────────────────────────────┐
│ Stadium Database Updated ✓      │
│ Successfully updated 87 stadiums│
│ Reloading fixtures...           │
└─────────────────────────────────┘
(Disappears after 5 seconds)
```

---

### STADIUM_UPDATE_ERROR

**Sent by:** node_helper.js (on failure)  
**Received by:** MMM-MyTeams-DriveToMatch.js  
**When:** Error occurs during update

**Payload structure:**
```javascript
{
    message: "Network timeout fetching from TheSportsDB",
    errorType: "TIMEOUT",  // TIMEOUT, PARSE_ERROR, FILE_ERROR, etc.
    failedSource: "thesportsdb",
    stadiumsProcessed: 23,
    timestamp: "2025-11-15T14:32:10Z"
}
```

**User sees:**
```
┌─────────────────────────────────┐
│ Stadium Update Failed ✗         │
│ Network timeout fetching from   │
│ TheSportsDB                     │
└─────────────────────────────────┘
(Stays for 8 seconds)
```

---

### STADIUM_CACHE_REFRESHED

**Sent by:** node_helper.js (after cache rebuild)  
**Received by:** MMM-MyTeams-DriveToMatch.js  
**When:** Cache file successfully updated

**Payload structure:**
```javascript
{
    success: true,
    stadiumCount: 87,  // Stadiums now in cache
    cacheFile: "stadium-cache.json",
    cacheSize: "2.3 MB",
    timestamp: "2025-11-15T14:32:15Z"
}
```

**Behavior:**
- Reloads all fixtures to use new stadium data
- Shows completion notification
- Module updates display with new venue information

---

## Data Updates & Sources

### What Gets Updated

When you trigger a stadium update, the system fetches and updates:

1. **Stadium Coordinates** (latitude, longitude)
2. **Stadium Names** (official and alternate names)
3. **Stadium Addresses**
4. **Postal Codes**
5. **Country Codes**
6. **Stadium Capacity**
7. **Surface Type**
8. **Opened/Founded Year**

### Data Sources

The module checks these sources in order:

1. **Football Stadiums API** (https://www.football-data.org/)
   - Coverage: ~500 stadiums
   - Quality: High accuracy
   - Update frequency: Monthly

2. **TheSportsDB Endpoints**
   - Coverage: ~2000+ stadiums
   - Quality: Good (community maintained)
   - Update frequency: Weekly

3. **Wikipedia (Fallback)**
   - Coverage: All major stadiums
   - Quality: Variable
   - Used when: Other sources incomplete

### Cached Results

- Updates are **cached for 7 days**
- Re-running update within 7 days uses cached data
- **No rate limiting** between cached requests
- Manual cache clear possible (see Advanced section)

---

## Typical Scenarios

### Scenario 1: Team Moves to New Stadium

**When:** Club announces move to new venue

**Action:**
1. Trigger stadium update
2. System fetches latest data from APIs
3. New stadium added to database
4. Routes now calculate to new venue
5. Old stadium data archived

**Example:**
```
Old: Celtic Park → 55.3641°N, 4.2732°W
Update triggers...
New: Celtic Paradise → 55.3645°N, 4.2740°W
```

---

### Scenario 2: Stadium Renamed

**When:** Stadium sponsor changes or official rename

**Action:**
1. Update triggered
2. Stadium entry renamed in database
3. Old name becomes alternate name
4. Display updates to show new name

**Example:**
```
Old: "Stadium of Light"
Update triggers...
New: "Stadium of Light" (alternate: "Sunderland Stadium")
```

---

### Scenario 3: Coordinates Need Correction

**When:** GPS accuracy improved or stadium expanded

**Action:**
1. Manual update triggered
2. Coordinates refined
3. Routes recalculated with new position
4. Fuel costs and times re-estimated

---

## Troubleshooting

### Issue: Update button not appearing

**Check:**
1. `enableStadiumUpdateNotification` is `true`
2. Module has fully loaded
3. No console errors (F12 to check)

**Solution:**
```javascript
// Verify in config.js
config: {
    enableStadiumUpdateNotification: true  // Must be true
}
```

---

### Issue: Update completes but changes don't appear

**Possible causes:**
- Fixture not in updated stadiums
- Cache needs clear
- Page reload needed

**Solution:**
```javascript
// Clear cache and reload:
1. Delete fixtures-cache.json
2. Delete stadium-cache.json
3. Restart MagicMirror
```

---

### Issue: Update fails with network error

**Cause:** API or network unreachable

**Solution:**
1. Check internet connection
2. Verify API status:
   - https://www.football-data.org/ (API status)
   - https://www.thesportsdb.com/ (API status)
3. Try again in a few minutes
4. Check firewall/proxy settings

---

### Issue: Update hangs or takes too long

**Typical time:** 30-90 seconds

**If longer:**
- Network latency
- Large dataset processing
- API rate limiting

**Solution:**
1. Wait longer (updates can take time)
2. Check network connection
3. Restart module if hung >3 minutes
4. Enable debug to see progress

---

## Advanced Configuration

### Custom Update Trigger

In your config.js, use a different module to trigger updates:

```javascript
// In MMM-Remote-Control or custom module:
notificationReceived: function(notification, payload) {
    if (notification === "MY_CUSTOM_TRIGGER") {
        this.sendNotification("UPDATE_STADIUM_DATABASE");
    }
}
```

### Monitoring Updates

Enable debug logging to see detailed update progress:

```javascript
config: {
    debug: true,  // Logs all operations including stadium updates
    enableStadiumUpdateNotification: true
}
```

**Console output will show:**
```
[MMM-MyTeams-DriveToMatch] Triggering stadium database update...
[MMM-MyTeams-DriveToMatch] Stadium update progress: Fetching from TheSportsDB...
[MMM-MyTeams-DriveToMatch] Stadium update progress: Processing: 45%
[MMM-MyTeams-DriveToMatch] Stadium update complete: 87 stadiums
```

### Scheduled Updates (via Cron)

To update stadiums on a schedule, add to another module that supports timers:

```javascript
// In a scheduler module
start: function() {
    // Update stadiums daily at 3 AM
    schedule.scheduleJob('0 3 * * *', () => {
        this.sendNotification("UPDATE_STADIUM_DATABASE");
    });
}
```

---

## Behind the Scenes

### File Structure

After an update, these files are affected:

```
MMM-MyTeams-DriveToMatch/
├── football_stadiums.csv          ← Updated with new stadiums
├── stadium-cache.json             ← Rebuilt with latest data
├── fixtures-cache.json            ← Cleared to force reload
└── node_helper.js                 ← Processes updates
```

### Stadium CSV Format

```csv
stadium_id,name,latitude,longitude,country,postal_code,city
1,Celtic Park,55.3641,-4.2732,Scotland,G40 3RE,Glasgow
2,Hampden Park,55.9415,-3.2388,Scotland,G42 9BA,Glasgow
```

---

## Performance Impact

### During Update

- **CPU:** Moderate increase (JSON parsing)
- **Memory:** Slight increase (loading datasets)
- **Network:** Active (API calls)
- **Module:** Responsive (non-blocking)

### After Update

- **Performance:** No change
- **Fixture lookup:** Potentially faster (more stadiums in cache)
- **Route calculation:** May be more accurate

---

## Statistics

### Database Coverage

**Current stadium database includes:**
- ~2,000+ professional stadiums
- ~26 countries represented
- ~161 teams covered
- ~47 different leagues

**After update:**
- Database grows as new stadiums added
- Coordinates refined
- Coverage expands to new teams

---

## FAQ

**Q: How often should I update?**  
A: Start of new season is recommended. Or when you notice missing stadiums.

**Q: Does updating clear my saved routes?**  
A: No. Saved routes are preserved. Only fixture cache is cleared to reload with new stadium data.

**Q: Can I revert an update?**  
A: Yes. Delete `stadium-cache.json` and restart.

**Q: What if my club's stadium isn't found?**  
A: Use `neutralVenueOverrides` to manually specify coordinates while requesting an update.

**Q: Can I add custom stadiums?**  
A: Yes. Edit `football_stadiums.csv` directly (advanced users only).

**Q: Does this work offline?**  
A: No. Updates require internet connection. Regular fixture lookups can use cached data.

---

## See Also

- [Configuration Guide](./CONFIGURATION.md)
- [Neutral Venue Overrides](./NEUTRAL_VENUE_OVERRIDES.md)
- [API Priority Guide](./API_PRIORITY_GUIDE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Last Updated:** November 2025  
**Status:** Active  
**Compatibility:** MMM-MyTeams-DriveToMatch v1.0+