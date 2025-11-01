# Official Website Fallback Guide

## Overview

The **Official Website Fallback** feature allows you to specify a custom URL to your team's official fixture page. This is a fallback mechanism that activates when standard APIs (TheSportsDB, ESPN, BBC Sport) cannot provide fixture data.

This is particularly useful for:
- **Non-league teams** not covered by major sports data providers
- **Regional or lower-tier leagues** with limited API coverage
- **International teams** from countries with limited API support
- **Custom scenarios** where you need to scrape fixtures from your club's official website

---

## Configuration

### Basic Setup

Add these lines to your `config.js` in the MMM-MyTeams-DriveToMatch module configuration:

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    position: "top_center",
    config: {
        teamName: "Celtic",
        homeLatitude: 56.32091,
        homeLongitude: -3.01006,
        
        // Enable official website fallback
        useOfficialWebsiteFallback: true,
        officialWebsiteFixtureUrl: "https://www.celticfc.com/fixtures/",
        
        // ... other config options
    }
}
```

### Configuration Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `useOfficialWebsiteFallback` | Boolean | `false` | Enable/disable the official website fallback feature |
| `officialWebsiteFixtureUrl` | String | `""` | URL of your club's fixture page to scrape |

---

## How It Works

### Fixture Lookup Priority

When `useOfficialWebsiteFallback` is enabled, the module follows this priority order:

```
TIER 1: Neutral Venue Overrides
        ↓ (if match date found in overrides)
        Matches specified neutral venue
        ↓
        
TIER 2: Standard API (TheSportsDB)
        ↓ (if fixture found)
        Use TheSportsDB data
        ↓
        
TIER 3: Multi-API Providers (if enabled)
        ↓ (if useMultiAPIProvider: true)
        Try ESPN, BBC Sport per apiPriority
        ↓
        
TIER 4: Official Website Fallback
        ↓ (if useOfficialWebsiteFallback: true)
        Web scrape official fixture page
        ↓
        
ERROR: No fixture found
```

### Scraping Process

When the official website fallback is triggered:

1. **Fetch page** - The module fetches the HTML from your configured URL
2. **Parse content** - Extracts match information using CSS selectors
3. **Extract fixtures** - Identifies upcoming matches with:
   - Match date & time
   - Opponent name
   - Home/Away status
   - Competition (if available)
4. **Return next fixture** - Returns the next upcoming match to display

---

## Finding Your Club's Fixture URL

### Common Club Website Patterns

**UK/Scottish Clubs:**
- Celtic FC: `https://www.celticfc.com/fixtures/`
- Rangers FC: `https://www.rangers.co.uk/matches/`
- Hearts FC: `https://www.hearts.co.uk/fixtures/`
- Hibernian: `https://www.hibernianfc.com/fixtures/`

**General Pattern:** Most clubs follow `/fixtures/` or `/matches/` URLs

### How to Find Your Club's URL

1. **Visit your club's official website**
2. **Look for a "Fixtures", "Matches", or "Upcoming Games" section**
3. **Copy the page URL**
4. **Add to your config.js**

### Example Search:
- Visit: `https://www.yourclub.com`
- Navigate to: Fixtures/Matches/Schedule section
- Copy URL like: `https://www.yourclub.com/fixtures/`

---

## Supported Website Formats

The scraper can automatically detect fixtures from common HTML structures:

### Auto-Detected Patterns

The module looks for these common HTML patterns:

- **Structured Data** (JSON-LD) - Best case scenario
  ```html
  <script type="application/ld+json">
    {
      "@type": "SportsEvent",
      "startDate": "2025-11-15T15:00",
      "homeTeam": {...},
      "awayTeam": {...}
    }
  </script>
  ```

- **Table-based fixtures** - Common on club websites
  ```html
  <table>
    <tr>
      <td class="date">15 Nov 2025</td>
      <td class="opponent">Hearts</td>
      <td class="status">Home</td>
    </tr>
  </table>
  ```

- **List-based fixtures** - Also common
  ```html
  <ul class="fixtures">
    <li>15 Nov 2025 vs Hearts (Home)</li>
  </ul>
  ```

### Custom Selector Support (Advanced)

If your club's website uses a custom structure, you can configure custom CSS selectors:

```javascript
useOfficialWebsiteFallback: true,
officialWebsiteFixtureUrl: "https://www.yourclub.com/fixtures/",
fixtureSelectors: {
    container: ".match-item",      // Container for each match
    date: ".match-date",            // Date element
    opponent: ".opponent-name",     // Opponent element
    homeAway: ".match-type"         // Home/Away indicator
}
```

---

## Troubleshooting

### Issue: No fixtures returned from fallback

**Solution:**
1. Verify `useOfficialWebsiteFallback` is `true`
2. Check `officialWebsiteFixtureUrl` is correct
3. Enable debug mode to see scraping logs:
   ```javascript
   debug: true
   ```
4. Check browser console (F12) for error messages
5. Try visiting the URL directly to verify it contains fixture data

### Issue: Fixtures found but incorrect data

**Possible causes:**
- Website uses dynamic content (JavaScript-rendered) - Static HTML scraper can't parse
- Custom HTML structure not recognized by parser
- Date format not recognized by parser

**Solution:**
- Contact support with website URL and HTML structure details
- Consider requesting JSON API from club if available

### Issue: Scraping fails after website update

**When it happens:** Clubs often redesign their websites

**Solution:**
1. Verify URL still works
2. Check if HTML structure changed
3. May need to provide custom selectors or wait for module update
4. Temporarily disable fallback and use multi-API instead

---

## Performance Considerations

### Caching

When a fixture is successfully scraped from the official website:
- Result is **cached for 24 hours** to avoid excessive scraping
- Reduces load on club servers
- Faster subsequent lookups

### Request Limits

- Website scraping requests are **rate-limited**
- Default: **1 request per minute per URL**
- Respects website's `robots.txt` if present

### Best Practices

1. **Only enable when needed** - Use standard APIs when possible
2. **Disable when not needed** - Turn off if club data appears in standard APIs
3. **Monitor debug logs** - Watch for repeated scraping failures
4. **Inform your club** - Large-scale usage should notify the club

---

## Examples

### Example 1: Celtic FC (with fallback)

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    config: {
        teamName: "Celtic",
        teamId: "133647",
        homeLatitude: 55.3641,
        homeLongitude: -4.2732,
        
        useOfficialWebsiteFallback: true,
        officialWebsiteFixtureUrl: "https://www.celticfc.com/fixtures/",
        
        // Primary APIs still active
        useMultiAPIProvider: false,
        
        // Neutral venues for Hampden/Europa league
        neutralVenueOverrides: {
            enabled: true,
            matches: [
                { date: "2025-12-02", opponent: "Rangers", venue: "Hampden Park" }
            ]
        }
    }
}
```

### Example 2: Lower-tier team (multi-source)

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    config: {
        teamName: "Lowland FC",
        homeLatitude: 55.8642,
        homeLongitude: -3.0128,
        
        // Primary: Multi-API with fallback order
        useMultiAPIProvider: true,
        apiPriority: ["thesportsdb", "espn", "bbcsport"],
        
        // Secondary: Official website
        useOfficialWebsiteFallback: true,
        officialWebsiteFixtureUrl: "https://www.lowlandfc.com/fixtures/",
        
        debug: true  // Monitor scraping in logs
    }
}
```

### Example 3: International team (European fixtures)

```javascript
{
    module: "MMM-MyTeams-DriveToMatch",
    config: {
        teamName: "Feyenoord",
        homeLatitude: 51.8808,
        homeLongitude: 4.2793,
        
        // Official website for Dutch Eredivisie
        useOfficialWebsiteFallback: true,
        officialWebsiteFixtureUrl: "https://www.feyenoord.nl/wedstrijden/",
        
        // Still enable API providers as primary
        useMultiAPIProvider: true,
        apiPriority: ["thesportsdb", "espn"]
    }
}
```

---

## Advanced: Custom Implementations

### For Developers

If you need custom scraping logic for a specific club website:

1. **Create a custom parser** module
2. **Extend the official website fallback** with site-specific selectors
3. **Submit as PR** to share with community

Example of site-specific configuration:

```javascript
officialWebsiteConfig: {
    selectors: {
        matchContainer: ".match-card",
        date: ".match-date",
        time: ".match-time",
        opponent: ".opponent-name",
        homeAway: ".match-location"
    },
    dateFormat: "DD MMM YYYY",
    parsing: {
        ignorePastMatches: true,
        retryOnFail: true
    }
}
```

---

## See Also

- [API Priority Guide](./API_PRIORITY_GUIDE.md) - How multiple APIs are prioritized
- [Configuration Guide](./CONFIGURATION.md) - Full configuration reference
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - General troubleshooting

---

**Last Updated:** November 2025  
**Status:** Active  
**Compatibility:** MMM-MyTeams-DriveToMatch v1.0+