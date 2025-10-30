/* node_helper.js
 * 
 * Node Helper for MMM-MyTeams-DriveToMatch
 * 
 * Handles API calls to TheSportsDB and TomTom APIs
 * Manages football stadiums database (161 teams across 26 countries)
 * Uses same fixture methodology as MMM-MyTeams-Fixtures
 * 
 * By: "gitgitaway' with AI debug assistance
 * MIT Licensed
 */

const NodeHelper = require("node_helper");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// Prefer native fetch (Node 18+), fallback to node-fetch v2
let _fetchImpl = null;
let _fetchType = "unknown";
function initializeFetch() {
  try {
    if (typeof globalThis.fetch === "function") {
      _fetchImpl = globalThis.fetch.bind(globalThis);
      _fetchType = "native";
      return true;
    }
  } catch (_) {}
  try {
    // npm install node-fetch@2
    const nodeFetch = require("node-fetch");
    if (typeof nodeFetch === "function") {
      _fetchImpl = nodeFetch;
      _fetchType = "node-fetch-v2";
      return true;
    }
  } catch (_) {}

  console.error("[MMM-MyTeams-DriveToMatch] ERROR: No fetch implementation available. Install node-fetch@2 or use Node.js 18+");
  _fetchImpl = null;
  _fetchType = "none";
  return false;
}
const fetchInitialized = initializeFetch();

const CACHE_FILE = path.join(__dirname, "fixtures-cache.json");
const SHARED_CACHE_FILE = path.join(__dirname, "..", "MMM-MyTeams-Fixtures", "fixtures-cache.json");
const SHARED_CACHE_LOCAL = path.join(__dirname, "sharedFixtures-cache.json"); // Local copy of shared cache
const STADIUM_CACHE_FILE = path.join(__dirname, "stadium-cache.json"); // Cache for parsed stadium data

let cache = {
  ts: 0,
  ttl: 0,
  source: null,
  key: null,
  data: null
};

// Track which cache file we're using
let activeCacheFile = CACHE_FILE;

// Copy fixtures from MMM-MyTeams-Fixtures cache if enabled
function copySharedCache() {
  try {
    if (fs.existsSync(SHARED_CACHE_FILE)) {
      const sharedRaw = fs.readFileSync(SHARED_CACHE_FILE, "utf8");
      const sharedParsed = JSON.parse(sharedRaw);
      
      if (sharedParsed && sharedParsed.data && Array.isArray(sharedParsed.data)) {
        // Copy to sharedFixtures-cache.json (separate from fixtures-cache.json)
        fs.writeFileSync(SHARED_CACHE_LOCAL, sharedRaw, "utf8");
        console.log(`[MMM-MyTeams-DriveToMatch] ✓ Copied ${sharedParsed.data.length} fixtures from MMM-MyTeams-Fixtures to sharedFixtures-cache.json`);
        return true;
      } else {
        console.warn("[MMM-MyTeams-DriveToMatch] Shared cache exists but has no valid data");
        return false;
      }
    } else {
      console.warn("[MMM-MyTeams-DriveToMatch] Shared cache file not found at:", SHARED_CACHE_FILE);
      return false;
    }
  } catch (e) {
    console.error("[MMM-MyTeams-DriveToMatch] Failed to copy shared cache:", e.message);
    return false;
  }
}

// Load any existing cache from disk at startup
function loadCacheFromDisk(useSharedCache = false) {
  try {
    // DUAL-CACHE STRATEGY:
    // 1. Try local cache first (fixtures-cache.json) - contains next fixture + routes
    // 2. Fall back to shared cache (sharedFixtures-cache.json) - contains all fixtures
    
    let localCacheLoaded = false;
    
    // Try loading local cache first (always check this for next fixture + routes)
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      
      // Check if cache is still valid
      const now = Date.now();
      const age = now - (parsed.ts || 0);
      const ttl = parsed.ttl || 300000;
      
      if (parsed && parsed.data && age < ttl) {
        cache = {
          ts: Number(parsed.ts) || 0,
          ttl: Number(parsed.ttl) || 0,
          source: parsed.source || null,
          key: parsed.key || null,
          data: parsed.data
        };
        console.log(`[MMM-MyTeams-DriveToMatch] ✓ Loaded next fixture from fixtures-cache.json (age: ${Math.round(age / 60000)}min, TTL: ${Math.round(ttl / 60000)}min)`);
        localCacheLoaded = true;
        activeCacheFile = CACHE_FILE;
      } else {
        console.log(`[MMM-MyTeams-DriveToMatch] Local cache expired (age: ${Math.round(age / 60000)}min > TTL: ${Math.round(ttl / 60000)}min)`);
      }
    }
    
    // If local cache not loaded and shared cache is enabled, try shared cache
    if (!localCacheLoaded && useSharedCache) {
      console.log("[MMM-MyTeams-DriveToMatch] useSharedFixturesCache enabled - attempting to copy from MMM-MyTeams-Fixtures");
      if (copySharedCache()) {
        activeCacheFile = SHARED_CACHE_LOCAL;
        
        // Load shared cache
        if (fs.existsSync(SHARED_CACHE_LOCAL)) {
          const raw = fs.readFileSync(SHARED_CACHE_LOCAL, "utf8");
          const parsed = JSON.parse(raw);
          if (parsed && parsed.data) {
            cache = {
              ts: Number(parsed.ts) || 0,
              ttl: Number(parsed.ttl) || 0,
              source: parsed.source || null,
              key: parsed.key || null,
              data: parsed.data
            };
            console.log(`[MMM-MyTeams-DriveToMatch] ✓ Loaded ${Array.isArray(parsed.data) ? parsed.data.length : 1} fixture(s) from sharedFixtures-cache.json`);
          }
        }
      } else {
        console.warn("[MMM-MyTeams-DriveToMatch] Failed to load shared cache, will fetch from API");
        activeCacheFile = CACHE_FILE;
      }
    } else if (!localCacheLoaded) {
      console.log("[MMM-MyTeams-DriveToMatch] No valid cache found, will fetch from API");
      activeCacheFile = CACHE_FILE;
    }
  } catch (e) {
    console.warn("[MMM-MyTeams-DriveToMatch] Cache load failed:", e.message);
    activeCacheFile = CACHE_FILE;
  }
}

function saveCacheToDisk(ttl) {
  try {
    if (cache.data) {
      const payload = {
        ts: cache.ts,
        ttl: ttl || cache.ttl || 300000,
        source: cache.source,
        key: cache.key || null,
        data: cache.data
      };
      
      // DUAL-CACHE STRATEGY:
      // Always save to fixtures-cache.json for local caching (next fixture + routes)
      // This minimizes API calls on restart and caches expensive route calculations
      fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), "utf8");
      console.log(`[MMM-MyTeams-DriveToMatch] ✓ Saved next fixture to fixtures-cache.json (TTL: ${Math.round((ttl || 300000) / 60000)}min)`);
      
      // Note: sharedFixtures-cache.json remains separate and is only updated by copySharedCache()
    }
  } catch (e) {
    console.warn("[MMM-MyTeams-DriveToMatch] Cache save failed:", e.message);
  }
}

// Calculate adaptive cache TTL based on days until fixture
// Closer to match date = shorter TTL to capture traffic updates
// Further from match = longer TTL since fixture unlikely to change
function calculateAdaptiveCacheTTL(fixtureDate) {
  try {
    if (!fixtureDate) {
      // Default fallback
      return 1 * 60 * 1000; // 1 minute
    }
    
    // Parse fixture date (format: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS")
    const fixtureDateOnly = fixtureDate.split('T')[0];
    const fixtureTime = new Date(fixtureDateOnly + "T15:00:00Z"); // Assume 3 PM UTC
    const now = new Date();
    
    // Calculate days until fixture
    const msUntilFixture = fixtureTime.getTime() - now.getTime();
    const daysUntilFixture = msUntilFixture / (1000 * 60 * 60 * 24);
    
    let ttl;
    
    if (daysUntilFixture < 0) {
      // Match already happened
      ttl = 6 * 60 * 60 * 1000; // 6 hours (won't update anyway)
    } else if (daysUntilFixture < 1) {
      // Match today - update every 10 minutes for latest traffic
      ttl = 10 * 60 * 1000; // 10 minutes
    } else if (daysUntilFixture < 3) {
      // 1-3 days until match - update every 30 minutes
      ttl = 30 * 60 * 1000; // 30 minutes
    } else if (daysUntilFixture < 7) {
      // 3-7 days until match - update every 2 hours
      ttl = 2 * 60 * 60 * 1000; // 2 hours
    } else if (daysUntilFixture < 15) {
      // 1-2 weeks until match - update every 6 hours
      ttl = 6 * 60 * 60 * 1000; // 6 hours
    } else if (daysUntilFixture < 30) {
      // 2-4 weeks until match - update every 12 hours
      ttl = 12 * 60 * 60 * 1000; // 12 hours
    } else {
      // More than 30 days away - update once a day
      ttl = 24 * 60 * 60 * 1000; // 24 hours
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[MMM-MyTeams-DriveToMatch] Adaptive Cache TTL: ${Math.round(ttl / 60000)}min for fixture ${Math.round(daysUntilFixture * 10) / 10} days away`);
    }
    
    return ttl;
  } catch (e) {
    console.warn("[MMM-MyTeams-DriveToMatch] Error calculating adaptive TTL:", e.message);
    return 1 * 60 * 1000; // Fallback to 1 minute
  }
}

// Save stadium data cache to disk
function saveStadiumCache(stadiumMap, csvPath) {
  try {
    const csvStats = fs.statSync(csvPath);
    const stadiumArray = Array.from(stadiumMap.entries()).map(([key, value]) => ({
      key: key,
      data: value
    }));
    
    const payload = {
      ts: Date.now(),
      csvModified: csvStats.mtimeMs,
      csvPath: csvPath,
      count: stadiumArray.length,
      data: stadiumArray
    };
    
    fs.writeFileSync(STADIUM_CACHE_FILE, JSON.stringify(payload, null, 2), "utf8");
    console.log(`[MMM-MyTeams-DriveToMatch] ✓ Cached ${stadiumArray.length} stadium entries to ${path.basename(STADIUM_CACHE_FILE)}`);
    return true;
  } catch (e) {
    console.warn("[MMM-MyTeams-DriveToMatch] Stadium cache save failed:", e.message);
    return false;
  }
}

// Load stadium data cache from disk
function loadStadiumCache(csvPath) {
  try {
    if (!fs.existsSync(STADIUM_CACHE_FILE)) {
      console.log("[MMM-MyTeams-DriveToMatch] No stadium cache file found");
      return null;
    }
    
    if (!fs.existsSync(csvPath)) {
      console.log("[MMM-MyTeams-DriveToMatch] CSV file not found, cache invalid");
      return null;
    }
    
    const cacheRaw = fs.readFileSync(STADIUM_CACHE_FILE, "utf8");
    const cacheData = JSON.parse(cacheRaw);
    
    // Check if CSV has been modified since cache was created
    const csvStats = fs.statSync(csvPath);
    if (csvStats.mtimeMs !== cacheData.csvModified) {
      console.log("[MMM-MyTeams-DriveToMatch] CSV file modified since cache created, invalidating cache");
      return null;
    }
    
    // Reconstruct Map from cached array
    const stadiumMap = new Map();
    if (Array.isArray(cacheData.data)) {
      cacheData.data.forEach(item => {
        stadiumMap.set(item.key, item.data);
      });
    }
    
    console.log(`[MMM-MyTeams-DriveToMatch] ✓ Loaded ${stadiumMap.size} stadium entries from cache (created ${new Date(cacheData.ts).toLocaleString()})`);
    return stadiumMap;
  } catch (e) {
    console.warn("[MMM-MyTeams-DriveToMatch] Stadium cache load failed:", e.message);
    return null;
  }
}

// Generic fetch with timeout and headers
async function doFetch(url, options = {}, timeoutMs = 15000) {
  if (!_fetchImpl) throw new Error(`Fetch not available (${_fetchType})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions = {
    ...options,
    signal: controller.signal,
    headers: {
      "User-Agent": "MMM-MyTeams-DriveToMatch (+MagicMirror)",
      "Accept": "application/json, text/html;q=0.9",
      "Cache-Control": "no-cache",
      ...(options.headers || {})
    }
  };

  try {
    const response = await _fetchImpl(url, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") throw new Error(`Request timeout after ${timeoutMs}ms`);
    throw err;
  }
}

// Sanitize URLs for logging (remove sensitive parameters)
function sanitizeUrlForLogging(url) {
  try {
    const urlObj = new URL(url);
    // Remove sensitive query parameters
    const sensitiveParams = ['key', 'apikey', 'api_key', 'token', 'auth', 'secret'];
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '***API_KEY_HIDDEN***');
      }
    });
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, return a generic message
    return '[URL - contains API key - not logged for security]';
  }
}

// Helpers: throttle and retry for TheSportsDB free tier
// NOTE: Rate limiting is now handled by SharedRequestManager, but keeping these for compatibility
const MIN_API_INTERVAL_MS = 1200;
let lastApiAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rateLimitWait() {
  // No-op: SharedRequestManager handles rate limiting
  return;
}
async function apiFetchWithRetry(url, options = {}, timeoutMs = 20000, retries = 2, priority = 1) {
  // SharedRequestManager handles retries, but keeping this for additional retry logic if needed
  try {
    return await doFetch(url, options, timeoutMs, priority);
  } catch (err) {
    const msg = String(err.message || "");
    console.warn(`[MMM-MyTeams-DriveToMatch] API request failed: ${msg}`);
    throw err;
  }
}

// Auto-detect season like "2025-2026"
function resolveSeasonAuto(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 7) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

// Resolve team ID via /searchteams.php if needed (prefers Scotland-based Celtic)
async function resolveTeamIdIfNeeded(apiUrl, teamName, providedTeamId, timeoutMs, debug = false) {
  const safeId = String(providedTeamId || "").trim();
  if (safeId) return safeId;
  if (!teamName) throw new Error("No teamName or teamId provided");

  const url = `${apiUrl}/searchteams.php?t=${encodeURIComponent(teamName)}`;
  const res = await apiFetchWithRetry(url, {}, timeoutMs);
  const data = await res.json();
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  if (!teams.length) throw new Error("Team ID resolution failed (no candidates)");

  // Score candidates
  const lname = teamName.toLowerCase();
  const scored = teams.map(t => {
    const name = (t?.strTeam || "").toLowerCase();
    const alt = (t?.strAlternate || "").toLowerCase();
    const country = (t?.strCountry || "").toLowerCase();
    const city = (t?.strStadiumLocation || "").toLowerCase();
    const id = String(t?.idTeam || "");
    let score = 0;
    if (name === lname) score += 100;
    if (name.includes("celtic") && lname.includes("celtic")) score += 20;
    if (alt.includes("celtic fc") || alt.includes("glasgow celtic")) score += 20;
    if (country === "scotland") score += 50;
    if (city.includes("glasgow")) score += 15;
    if (id === "133647") score += 200; // prefered known Celtic FC id
    return { t, score };
  }).sort((a,b) => b.score - a.score);

  const best = scored[0]?.t;
  if (debug) {
    const dbg = scored.slice(0,5).map(s => ({ id: s.t?.idTeam, name: s.t?.strTeam, country: s.t?.strCountry, alt: s.t?.strAlternate, score: s.score }));
    console.log("[MMM-MyTeams-DriveToMatch] Team candidates:", dbg);
  }
  if (!best?.idTeam) throw new Error("Team ID resolution failed (no best)");
  return String(best.idTeam);
}

// Competition classification to support client filtering/styling
function classifyCompetition(name) {
  if (!name) return "domestic";
  const n = name.toLowerCase();
  const euroTokens = [
    "uefa", "champions league", "ucl",
    "europa league", "uel",
    "conference league", "uecl",
    "europe", "european"
  ];
  if (euroTokens.some(tok => n.includes(tok))) return "european";
  if (n.includes("friendly") || n.includes("pre-season")) return "friendly";
  // Scottish domestic markers (helps when idLeague is missing)
  if (/(scottish|spfl|premiership|league cup|viaplay|premier sports)/i.test(n)) return "domestic";
  return "domestic";
}

// Convert TheSportsDB event into front-end fixture shape
function toFixtureFromEvent(e, celticName = "Celtic") {
  const home = e?.strHomeTeam || "";
  const away = e?.strAwayTeam || "";
  const league = e?.strLeague || "";
  const tv = e?.strTVStation || "";

  let opponent = "";
  let homeAway = null;
  if (home.toLowerCase().includes(celticName.toLowerCase())) {
    opponent = away || "TBD";
    homeAway = "H";
  } else if (away.toLowerCase().includes(celticName.toLowerCase())) {
    opponent = home || "TBD";
    homeAway = "A";
  } else {
    opponent = home && away ? `${home} / ${away}` : (home || away || "TBD");
    homeAway = null;
  }

  const dateISO = e?.dateEvent || null; // "YYYY-MM-DD"
  // Normalize time to HH:MM (strip seconds if present)
  let timeText = e?.strTime || (e?.strTimestamp ? new Date(e.strTimestamp).toTimeString().slice(0,5) : "");
  if (timeText && /^\d{1,2}:\d{2}:\d{2}$/.test(timeText)) {
    timeText = timeText.slice(0,5);
  }

  return {
    date: dateISO,
    dateText: dateISO || "",
    timeText: timeText || "",
    opponent,
    homeAway,
    homeTeam: home,  // Include for validation
    awayTeam: away,  // Include for validation
    competition: league || "",
    competitionType: classifyCompetition(league),
    tv: tv || ""
  };
}

// Fetch next events; if empty, fall back to season fixtures
async function getFixturesFromAPI({
  apiUrl,
  teamId,
  teamName,
  season,
  fallbackSeason,
  requestTimeoutMs = 20000,
  maxFixtures = 24,
  debug = false
}) {
  if (!apiUrl) throw new Error("apiUrl not provided");
  const resolvedTeamId = await resolveTeamIdIfNeeded(apiUrl, teamName, teamId, requestTimeoutMs, debug);
  if (debug) console.log(`[MMM-MyTeams-DriveToMatch] API: resolvedTeamId=${resolvedTeamId}, teamName=${teamName}`);

  // Step 1: /eventsnext.php
  const nextUrl = `${apiUrl}/eventsnext.php?id=${encodeURIComponent(resolvedTeamId)}`;
  if (debug) console.log("[MMM-MyTeams-DriveToMatch] API GET", nextUrl);
  try {
    const res = await apiFetchWithRetry(nextUrl, {}, requestTimeoutMs);
    const data = await res.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    if (events.length > 0) {
      if (debug) console.log(`[MMM-MyTeams-DriveToMatch] API: eventsnext returned ${events.length} events`);
      return events.map(e => toFixtureFromEvent(e, teamName)).slice(0, maxFixtures);
    }
  } catch (err) {
    if (debug) console.warn("[MMM-MyTeams-DriveToMatch] eventsnext failed:", err.message);
  }

  // Step 2: Season fixtures fallback
  const resolvedSeason = (season === "auto") ? resolveSeasonAuto() : (season || fallbackSeason || resolveSeasonAuto());
  const seasonUrl = `${apiUrl}/eventsseason.php?id=${encodeURIComponent(resolvedTeamId)}&s=${encodeURIComponent(resolvedSeason)}`;
  if (debug) console.log("[MMM-MyTeams-DriveToMatch] API GET", seasonUrl);
  
  try {
    const res = await apiFetchWithRetry(seasonUrl, {}, requestTimeoutMs);
    const data = await res.json();
    let events = Array.isArray(data?.events) ? data.events : [];
    
    // Filter future events
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    events = events.filter(e => {
      const eventDate = e?.dateEvent;
      return eventDate && eventDate >= today;
    });

    if (debug) console.log(`[MMM-MyTeams-DriveToMatch] API: eventsseason returned ${events.length} future events`);
    return events.map(e => toFixtureFromEvent(e, teamName)).slice(0, maxFixtures);
  } catch (err) {
    if (debug) console.warn("[MMM-MyTeams-DriveToMatch] eventsseason failed:", err.message);
    throw new Error("Both eventsnext and eventsseason failed");
  }
}

// EXACT COPY of MMM-MyTeams-Fixtures comprehensive search methodology
async function getFixturesFromAPIComprehensive({
  apiUrl,
  teamId,
  teamName,
  season,
  fallbackSeason,
  requestTimeoutMs = 20000,
  maxFixtures = 24,
  scottishLeagueIds = [],
  uefaLeagueIds = [],
  useSearchEventsFallback = true,
  strictLeagueFiltering = false,
  debug = false
}) {
  if (!apiUrl) throw new Error("apiUrl not provided");
  const resolvedTeamId = await resolveTeamIdIfNeeded(apiUrl, teamName, teamId, requestTimeoutMs, debug);
  if (debug) console.log(`[MMM-MyTeams-DriveToMatch] API: resolvedTeamId=${resolvedTeamId}, teamName=${teamName}`);

  // Step 1: /eventsnext.php with comprehensive filtering
  const nextUrl = `${apiUrl}/eventsnext.php?id=${encodeURIComponent(resolvedTeamId)}`;
  if (debug) console.log("[MMM-MyTeams-DriveToMatch] API GET", nextUrl);
  
  // Define fetchSeason helper function BEFORE try block so it's available for supplementing
  const seasonStr = season === "auto" ? resolveSeasonAuto() : (season || resolveSeasonAuto());
  const fallbackStr = fallbackSeason || resolveSeasonAuto();
  
  async function fetchSeason(s) {
    const url = `${apiUrl}/eventsseason.php?id=${encodeURIComponent(resolvedTeamId)}&s=${encodeURIComponent(s)}`;
    if (debug) console.log("[MMM-MyTeams-DriveToMatch] API GET", url);
    const res = await apiFetchWithRetry(url, {}, requestTimeoutMs);
    const data = await res.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    const todayISO = new Date().toISOString().slice(0,10);

    if (debug) {
      const total = events.length;
      const h = events.filter(e => String(e?.idHomeTeam||"") === String(resolvedTeamId)).length;
      const a = events.filter(e => String(e?.idAwayTeam||"") === String(resolvedTeamId)).length;
      console.log(`[MMM-MyTeams-DriveToMatch] Season-events(${s}): total=${total}, home=${h}, away=${a}`);
    }

    // Keep only matches for the resolved team and in desired leagues (if idLeague present)
    let desired = events.filter(e => {
      const idHome = String(e?.idHomeTeam || "");
      const idAway = String(e?.idAwayTeam || "");
      const leagueId = String(e?.idLeague || "");
      const leagueName = (e?.strLeague || "").toLowerCase();
      const isHome = idHome === String(resolvedTeamId);
      const isAway = idAway === String(resolvedTeamId);
      const isTeamMatch = isHome || isAway;
      const knownScottish = /(scottish|spfl|premiership|league cup|viaplay|premier sports)/i.test(leagueName);
      const knownUEFA = /(uefa|champions|europa|conference)/i.test(leagueName);
      const leagueOk = strictLeagueFiltering
        ? (scottishLeagueIds.includes(leagueId) || uefaLeagueIds.includes(leagueId) || knownScottish || knownUEFA)
        : (!leagueId || scottishLeagueIds.includes(leagueId) || uefaLeagueIds.includes(leagueId) || knownScottish || knownUEFA);
      const keep = isTeamMatch && (leagueOk || (isAway && (!leagueId && !leagueName)));
      return keep && (e?.dateEvent || "") >= todayISO;
    });
    if (desired.length === 0 && !strictLeagueFiltering) {
      desired = events.filter(e => {
        const idHome = String(e?.idHomeTeam || "");
        const idAway = String(e?.idAwayTeam || "");
        return (idHome === String(resolvedTeamId) || idAway === String(resolvedTeamId)) && (e?.dateEvent || "") >= todayISO;
      });
    }

    // Sort by date/time ascending
    desired.sort((a,b) => {
      const ta = Date.parse(a?.strTimestamp || `${a?.dateEvent || '9999-12-31'}T${(a?.strTime || '23:59')}:00`);
      const tb = Date.parse(b?.strTimestamp || `${b?.dateEvent || '9999-12-31'}T${(b?.strTime || '23:59')}:00`);
      return (isNaN(ta) ? Infinity : ta) - (isNaN(tb) ? Infinity : tb);
    });

    return desired.map(e => toFixtureFromEvent(e, teamName)).slice(0, maxFixtures);
  }
  
  try {
    const res = await apiFetchWithRetry(nextUrl, {}, requestTimeoutMs);
    const data = await res.json();
    const events = Array.isArray(data?.events) ? data.events : [];

    if (debug) {
      const total = events.length;
      const h = events.filter(e => String(e?.idHomeTeam||"") === String(resolvedTeamId)).length;
      const a = events.filter(e => String(e?.idAwayTeam||"") === String(resolvedTeamId)).length;
      console.log(`[MMM-MyTeams-DriveToMatch] Next-events: total=${total}, home=${h}, away=${a}`);
      // Show sample of what we got to debug team ID mismatch
      console.log(`[MMM-MyTeams-DriveToMatch] Sample events (first 3):`, events.slice(0, 3).map(e => ({
        event: e?.strEvent,
        idHomeTeam: e?.idHomeTeam,
        idAwayTeam: e?.idAwayTeam,
        strHomeTeam: e?.strHomeTeam,
        strAwayTeam: e?.strAwayTeam,
        idLeague: e?.idLeague,
        strLeague: e?.strLeague
      })));
      console.log(`[MMM-MyTeams-DriveToMatch] Looking for teamId: ${resolvedTeamId}`);
    }

    // Filter by teamId and league IDs with optional strict mode
    let filteredEvents = events.filter(e => {
      const idHome = String(e?.idHomeTeam || "");
      const idAway = String(e?.idAwayTeam || "");
      const leagueId = String(e?.idLeague || "");
      const leagueName = (e?.strLeague || "").toLowerCase();
      const isHome = idHome === String(resolvedTeamId);
      const isAway = idAway === String(resolvedTeamId);
      const isTeamMatch = isHome || isAway;
      const knownScottish = /(scottish|spfl|premiership|league cup|viaplay|premier sports)/i.test(leagueName);
      const knownUEFA = /(uefa|champions|europa|conference)/i.test(leagueName);
      const leagueOk = strictLeagueFiltering
        ? (scottishLeagueIds.includes(leagueId) || uefaLeagueIds.includes(leagueId) || knownScottish || knownUEFA)
        : (!leagueId || scottishLeagueIds.includes(leagueId) || uefaLeagueIds.includes(leagueId) || knownScottish || knownUEFA);
      // Always keep clear away matches; apply league filter more leniently for away if metadata is weak
      const keep = isTeamMatch && (leagueOk || (isAway && (!leagueId && !leagueName)));
      return keep;
    });
    if (filteredEvents.length === 0 && !strictLeagueFiltering) {
      filteredEvents = events.filter(e => String(e?.idHomeTeam || "") === String(resolvedTeamId) || String(e?.idAwayTeam || "") === String(resolvedTeamId));
    }

    if (debug) {
      const total = filteredEvents.length;
      const h = filteredEvents.filter(e => String(e?.idHomeTeam||"") === String(resolvedTeamId)).length;
      const a = filteredEvents.filter(e => String(e?.idAwayTeam||"") === String(resolvedTeamId)).length;
      const sampleAway = filteredEvents.filter(e => String(e?.idAwayTeam||"") === String(resolvedTeamId)).slice(0,2).map(e => ({
        ev: e?.strEvent,
        idLeague: e?.idLeague,
        strLeague: e?.strLeague
      }));
      console.log(`[MMM-MyTeams-DriveToMatch] Next-events (after filter): total=${total}, home=${h}, away=${a}`, sampleAway);
    }

    // Sort by date/time ascending
    filteredEvents.sort((a,b) => {
      const ta = Date.parse(a?.strTimestamp || `${a?.dateEvent || '9999-12-31'}T${(a?.strTime || '23:59')}:00`);
      const tb = Date.parse(b?.strTimestamp || `${b?.dateEvent || '9999-12-31'}T${(b?.strTime || '23:59')}:00`);
      return (isNaN(ta) ? Infinity : ta) - (isNaN(tb) ? Infinity : tb);
    });

    let collected = filteredEvents.map(e => toFixtureFromEvent(e, teamName));
    // If we don't have enough from "next", supplement from season lists
    if (collected.length < maxFixtures) {
      try {
        const more1 = await fetchSeason(seasonStr);
        if (Array.isArray(more1) && more1.length) collected.push(...more1);
        if (collected.length < maxFixtures) {
          const more2 = await fetchSeason(fallbackStr);
          if (Array.isArray(more2) && more2.length) collected.push(...more2);
        }
      } catch (_) { /* ignore supplement errors */ }
      // Dedupe by composite key
      const seen = new Set();
      collected = collected.filter(f => {
        const key = `${f.date}|${f.timeText}|${f.opponent}|${f.homeAway}|${f.competition}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    collected.sort((a,b) => {
      const ta = Date.parse(`${a.date || '9999-12-31'}T${(a.timeText || '23:59')}:00`);
      const tb = Date.parse(`${b.date || '9999-12-31'}T${(b.timeText || '23:59')}:00`);
      return (isNaN(ta) ? Infinity : ta) - (isNaN(tb) ? Infinity : tb);
    });
    if (collected.length > 0) return collected.slice(0, maxFixtures);
  } catch (e) {
    console.warn("[MMM-MyTeams-DriveToMatch] Next-events fetch failed:", e.message);
  }

  // Step 2: /eventsseason.php (auto season or fallback)
  try {
    const seasonFixtures = await fetchSeason(seasonStr);
    if (seasonFixtures.length > 0) return seasonFixtures;
  } catch (e) {
    console.warn(`[MMM-MyTeams-DriveToMatch] Season (${seasonStr}) fetch failed:`, e.message);
  }

  try {
    const fbFixtures = await fetchSeason(fallbackStr);
    if (fbFixtures.length > 0) return fbFixtures;
  } catch (e) {
    console.warn(`[MMM-MyTeams-DriveToMatch] Fallback season (${fallbackStr}) fetch failed:`, e.message);
  }

  // Step 3: Search events by name pattern for season (TEAM_vs_* and *_vs_TEAM)
  if (teamName && useSearchEventsFallback) {
    try {
      const nameVariants = [teamName, `${teamName} FC`, `Glasgow ${teamName}`];
      const patterns = [];
      for (const n of nameVariants) {
        patterns.push(`${n}_vs_`);
        patterns.push(`_vs_${n}`);
      }
      if (debug) console.log(`[MMM-MyTeams-DriveToMatch] Search patterns generated: ${patterns.length} patterns`, patterns);
      let searchEvents = [];
      for (const pat of patterns) {
        const url = `${apiUrl}/searchevents.php?e=${encodeURIComponent(pat)}&s=${encodeURIComponent(seasonStr)}`;
        if (debug) console.log("[MMM-MyTeams-DriveToMatch] API GET", url);
        const res = await apiFetchWithRetry(url, {}, requestTimeoutMs);
        const data = await res.json();
        const ev = Array.isArray(data?.event) ? data.event : [];
        if (debug) console.log(`[MMM-MyTeams-DriveToMatch] Pattern "${pat}" returned ${ev.length} events`);
        searchEvents.push(...ev);
      }
      // Dedupe by idEvent (or fallback composite key)
      const seen = new Set();
      const merged = searchEvents.filter(e => {
        const id = String(e?.idEvent || `${e?.strEvent}-${e?.dateEvent}-${e?.strTime}`);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      const todayISO = new Date().toISOString().slice(0,10);
      if (debug) {
        const total = merged.length;
        const h = merged.filter(e => String(e?.idHomeTeam||"") === String(resolvedTeamId) || (e?.strHomeTeam||"").toLowerCase().includes(teamName.toLowerCase())).length;
        const a = merged.filter(e => String(e?.idAwayTeam||"") === String(resolvedTeamId) || (e?.strAwayTeam||"").toLowerCase().includes(teamName.toLowerCase())).length;
        console.log(`[MMM-MyTeams-DriveToMatch] Search-events: total=${total}, home~=${h}, away~=${a}`);
        // Show sample events to debug team name format
        if (merged.length > 0) {
          console.log(`[MMM-MyTeams-DriveToMatch] Sample events (first 3):`);
          merged.slice(0, 3).forEach((e, idx) => {
            console.log(`  ${idx + 1}. ${e?.strEvent} | Home: "${e?.strHomeTeam}" | Away: "${e?.strAwayTeam}" | Date: ${e?.dateEvent}`);
          });
        }
      }
      let desired = merged.filter(e => {
        const home = (e?.strHomeTeam || "").toLowerCase();
        const away = (e?.strAwayTeam || "").toLowerCase();
        const t = teamName.toLowerCase();
        const involved = home.includes(t) || away.includes(t);
        const isAway = away.includes(t);
        const leagueId = String(e?.idLeague || "");
        const leagueName = (e?.strLeague || "").toLowerCase();
        const knownScottish = /(scottish|spfl|premiership|league cup|viaplay|premier sports)/i.test(leagueName);
        const knownUEFA = /(uefa|champions|europa|conference)/i.test(leagueName);
        const keepLeague = strictLeagueFiltering
          ? (scottishLeagueIds.includes(leagueId) || uefaLeagueIds.includes(leagueId) || knownScottish || knownUEFA)
          : (!leagueId || scottishLeagueIds.includes(leagueId) || uefaLeagueIds.includes(leagueId) || knownScottish || knownUEFA);
        return involved && (keepLeague || (isAway && (!leagueId && !leagueName))) && (e?.dateEvent || "") >= todayISO;
      });
      if (desired.length === 0 && !strictLeagueFiltering) {
        desired = merged.filter(e => {
          const involved = (e?.strHomeTeam || "").toLowerCase().includes(teamName.toLowerCase()) ||
                           (e?.strAwayTeam || "").toLowerCase().includes(teamName.toLowerCase());
          return involved && (e?.dateEvent || "") >= todayISO;
        });
      }
      desired.sort((a,b) => {
        const ta = Date.parse(a?.strTimestamp || `${a?.dateEvent || '9999-12-31'}T${(a?.strTime || '23:59')}:00`);
        const tb = Date.parse(b?.strTimestamp || `${b?.dateEvent || '9999-12-31'}T${(b?.strTime || '23:59')}:00`);
        return (isNaN(ta) ? Infinity : ta) - (isNaN(tb) ? Infinity : tb);
      });
      const fx = desired.map(e => toFixtureFromEvent(e, teamName)).slice(0, maxFixtures);
      if (fx.length > 0) return fx;
    } catch (e) {
      console.warn("[MMM-MyTeams-DriveToMatch] searchevents fallback failed:", e.message);
    }
  }

  // Step 4: Last resort: re-resolve team ID by name and retry once (guards against wrong teamId in config)
  if (teamName) {
    try {
      const altId = await resolveTeamIdByName(apiUrl, teamName, requestTimeoutMs);
      if (altId && String(altId) !== String(resolvedTeamId)) {
        if (debug) console.log(`[MMM-MyTeams-DriveToMatch] Retrying with altTeamId=${altId} (resolved by name)`);

        // Step A: /eventsnext.php for altId
        try {
          const nextUrl2 = `${apiUrl}/eventsnext.php?id=${encodeURIComponent(altId)}`;
          if (debug) console.log("[MMM-MyTeams-DriveToMatch] API GET", nextUrl2);
          const res2 = await apiFetchWithRetry(nextUrl2, {}, requestTimeoutMs);
          const data2 = await res2.json();
          const events2 = Array.isArray(data2?.events) ? data2.events : [];
          let filtered2 = events2.filter(e => String(e?.idHomeTeam||"") === String(altId) || String(e?.idAwayTeam||"") === String(altId));
          filtered2.sort((a,b) => {
            const ta = Date.parse(a?.strTimestamp || `${a?.dateEvent || '9999-12-31'}T${(a?.strTime || '23:59')}:00`);
            const tb = Date.parse(b?.strTimestamp || `${b?.dateEvent || '9999-12-31'}T${(b?.strTime || '23:59')}:00`);
            return (isNaN(ta) ? Infinity : ta) - (isNaN(tb) ? Infinity : tb);
          });
          const fx2 = filtered2.map(e => toFixtureFromEvent(e, teamName)).slice(0, maxFixtures);
          if (fx2.length > 0) return fx2;
        } catch (e) {
          console.warn("[MMM-MyTeams-DriveToMatch] Next-events altId fetch failed:", e.message);
        }

        // Step B: /eventsseason.php for altId
        async function fetchSeasonAlt(s) {
          const url = `${apiUrl}/eventsseason.php?id=${encodeURIComponent(altId)}&s=${encodeURIComponent(s)}`;
          if (debug) console.log("[MMM-MyTeams-DriveToMatch] API GET", url);
          const res = await apiFetchWithRetry(url, {}, requestTimeoutMs);
          const data = await res.json();
          const events = Array.isArray(data?.events) ? data.events : [];
          const todayISO = new Date().toISOString().slice(0,10);
          let desired = events.filter(e => {
            const idHome = String(e?.idHomeTeam || "");
            const idAway = String(e?.idAwayTeam || "");
            return (idHome === String(altId) || idAway === String(altId)) && (e?.dateEvent || "") >= todayISO;
          });
          desired.sort((a,b) => {
            const ta = Date.parse(a?.strTimestamp || `${a?.dateEvent || '9999-12-31'}T${(a?.strTime || '23:59')}:00`);
            const tb = Date.parse(b?.strTimestamp || `${b?.dateEvent || '9999-12-31'}T${(b?.strTime || '23:59')}:00`);
            return (isNaN(ta) ? Infinity : ta) - (isNaN(tb) ? Infinity : tb);
          });
          return desired.map(e => toFixtureFromEvent(e, teamName)).slice(0, maxFixtures);
        }

        try {
          const sfx = await fetchSeasonAlt(seasonStr);
          if (sfx.length > 0) return sfx;
        } catch (e) {
          console.warn(`[MMM-MyTeams-DriveToMatch] Season (alt, ${seasonStr}) fetch failed:`, e.message);
        }
        try {
          const sfx2 = await fetchSeasonAlt(fallbackStr);
          if (sfx2.length > 0) return sfx2;
        } catch (e) {
          console.warn(`[MMM-MyTeams-DriveToMatch] Fallback season (alt, ${fallbackStr}) fetch failed:`, e.message);
        }
      }
    } catch (e) {
      console.warn("[MMM-MyTeams-DriveToMatch] Alt team ID retry failed:", e.message);
    }
  }

  throw new Error("All API endpoints failed");
}

// Always resolve team ID from name (ignores providedTeamId) - EXACT COPY FROM MMM-MyTeams-Fixtures
async function resolveTeamIdByName(apiUrl, teamName, timeoutMs) {
  if (!teamName) throw new Error("No teamName provided");
  const url = `${apiUrl}/searchteams.php?t=${encodeURIComponent(teamName)}`;
  const res = await apiFetchWithRetry(url, {}, timeoutMs);
  const data = await res.json();
  const team = Array.isArray(data?.teams) ? data.teams.find(t => (t?.strTeam || "").toLowerCase() === teamName.toLowerCase()) : null;
  return team?.idTeam ? String(team.idTeam) : null;
}

// FWP scraper (fallback)
async function scrapeFixturesFromFWP(teamName, maxFixtures = 10, timeoutMs = 15000, debug = false) {
  try {
    const teamSlug = (teamName || "celtic").toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://www.footballwebpages.co.uk/${teamSlug}/fixtures-results`;
    if (debug) console.log("[MMM-MyTeams-DriveToMatch] FWP scraping:", url);
    
    const res = await doFetch(url, {}, timeoutMs);
    const html = await res.text();
    
    // DEBUG: Log HTML length and sample
    if (debug) {
      console.log(`[MMM-MyTeams-DriveToMatch] FWP HTML length: ${html.length} chars`);
      console.log(`[MMM-MyTeams-DriveToMatch] FWP HTML sample:`, html.substring(0, 500));
    }
    
    const $ = cheerio.load(html);
    
    // DEBUG: Log table count
    const tableCount = $('table').length;
    if (debug) console.log(`[MMM-MyTeams-DriveToMatch] FWP found ${tableCount} tables`);
    
    // DEBUG: Log first table structure
    if (tableCount > 0 && debug) {
      const firstTable = $('table').first();
      const rowCount = firstTable.find('tr').length;
      console.log(`[MMM-MyTeams-DriveToMatch] First table has ${rowCount} rows`);
      
      // Log first 3 rows
      firstTable.find('tr').slice(0, 3).each((i, row) => {
        const cells = $(row).find('td');
        console.log(`[MMM-MyTeams-DriveToMatch] Row ${i}: ${cells.length} cells`, 
          cells.map((_, cell) => $(cell).text().trim()).get());
      });
    }
    
    const fixtures = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    $('table tr').each((i, row) => {
      if (fixtures.length >= maxFixtures) return false;
      
      const cells = $(row).find('td');
      if (cells.length < 4) {
        if (debug && i < 5) console.log(`[MMM-MyTeams-DriveToMatch] Row ${i} skipped: only ${cells.length} cells`);
        return;
      }
      
      const dateText = $(cells[0]).text().trim();
      const timeText = $(cells[1]).text().trim();
      const opponentText = $(cells[2]).text().trim();
      const venueText = $(cells[3]).text().trim();
      
      if (debug && i < 5) {
        console.log(`[MMM-MyTeams-DriveToMatch] Row ${i}: date="${dateText}", time="${timeText}", opponent="${opponentText}", venue="${venueText}"`);
      }
      
      if (!dateText || !opponentText) return;
      
      // Parse date (assuming DD/MM/YYYY format)
      const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!dateMatch) {
        if (debug && i < 5) console.log(`[MMM-MyTeams-DriveToMatch] Row ${i} skipped: date format not matched`);
        return;
      }
      
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      const dateISO = `${year}-${month}-${day}`;
      
      // Only include future fixtures
      if (dateISO < today) {
        if (debug && i < 5) console.log(`[MMM-MyTeams-DriveToMatch] Row ${i} skipped: past date ${dateISO}`);
        return;
      }
      
       const teamLower = (teamName || "").toLowerCase();
       const venueLower = venueText.toLowerCase();
       const isHome = venueLower.includes('home') || (teamLower && venueLower.includes(teamLower));

      fixtures.push({
        date: dateISO,
        dateText: dateText,
        timeText: timeText,
        opponent: opponentText,
        homeAway: isHome ? "H" : "A",
        homeTeam: isHome ? teamName : opponentText,  // Include for validation
        awayTeam: isHome ? opponentText : teamName,  // Include for validation
        competition: ""
      });
      
      if (debug) console.log(`[MMM-MyTeams-DriveToMatch] Row ${i} ADDED: ${dateISO} ${isHome ? 'HOME' : 'AWAY'} vs ${opponentText}`);
    });
    
    if (debug) console.log(`[MMM-MyTeams-DriveToMatch] FWP scraped ${fixtures.length} fixtures`);
    return fixtures;
  } catch (err) {
    if (debug) console.warn("[MMM-MyTeams-DriveToMatch] FWP scraping failed:", err.message);
    throw err;
  }
}

module.exports = NodeHelper.create({

    // Module variables
    fixtureCache: new Map(),
    venueCache: new Map(),
    scottishStadiums: new Map(),
    requestQueue: [], // Queue for API requests to prevent conflicts
    isProcessingQueue: false, // Flag to track queue processing
    lastRequestTime: 0, // Track last request time for throttling
    MIN_REQUEST_INTERVAL: 2000, // Minimum 2 seconds between requests to avoid conflicts
    
    // SECURITY PATCH: Store API key securely (never pass through socket notifications)
    tomtomApiKey: null, // Set via SET_API_KEY notification or environment variable

    // Start the helper
    start: function() {
        console.log("Starting node helper for: MMM-MyTeams-DriveToMatch");
        
        // SECURITY PATCH: Check for environment variable first
        if (process.env.TOMTOM_API_KEY) {
            this.tomtomApiKey = process.env.TOMTOM_API_KEY;
            console.log("[MMM-MyTeams-DriveToMatch] ✓ TomTom API key loaded from environment variable TOMTOM_API_KEY");
        } else {
            console.warn("[MMM-MyTeams-DriveToMatch] ⚠️  TomTom API key not set via environment variable TOMTOM_API_KEY");
            console.warn("[MMM-MyTeams-DriveToMatch] ⚠️  Will attempt to use key from SET_API_KEY notification");
        }
        
        this.loadscottishStadiums();
        loadCacheFromDisk();
        
        // Start queue processor
        this.startQueueProcessor();
    },
    
    // Queue processor to handle requests sequentially with throttling
    startQueueProcessor: function() {
        setInterval(() => {
            if (!this.isProcessingQueue && this.requestQueue.length > 0) {
                const now = Date.now();
                const timeSinceLastRequest = now - this.lastRequestTime;
                
                // Only process if enough time has passed since last request
                if (timeSinceLastRequest >= this.MIN_REQUEST_INTERVAL) {
                    this.processNextRequest();
                }
            }
        }, 500); // Check queue every 500ms
    },
    
    // Process next request in queue
    processNextRequest: async function() {
        if (this.requestQueue.length === 0 || this.isProcessingQueue) {
            return;
        }
        
        this.isProcessingQueue = true;
        this.lastRequestTime = Date.now();
        
        const request = this.requestQueue.shift();
        
        try {
            if (request.type === "fixture") {
                await this.getNextFixture(request.config);
            } else if (request.type === "routes") {
                await this.getRoutes(request.config);
            }
        } catch (error) {
            console.error("MMM-MyTeams-DriveToMatch: Error processing queued request:", error);
        } finally {
            this.isProcessingQueue = false;
        }
    },

    // Load football stadiums database
    loadscottishStadiums: function() {
        try {
            const csvPath = path.join(__dirname, "football_teams_database.csv");
            
            // Try to load from cache first
            const cachedStadiums = loadStadiumCache(csvPath);
            if (cachedStadiums && cachedStadiums.size > 0) {
                this.scottishStadiums = cachedStadiums;
                console.log(`MMM-MyTeams-DriveToMatch: Loaded ${cachedStadiums.size} teams from cache`);
                return;
            }
            
            // Cache miss or invalid - parse CSV
            if (fs.existsSync(csvPath)) {
                const csvData = fs.readFileSync(csvPath, "utf8");
                this.parseGroundsCSV(csvData);
                console.log("MMM-MyTeams-DriveToMatch: Loaded football teams database from CSV");
                
                // Save to cache for next time
                saveStadiumCache(this.scottishStadiums, csvPath);
            } else {
                // Fallback to hardcoded data
                this.loadHardcodedGrounds();
                console.log("MMM-MyTeams-DriveToMatch: Using hardcoded football stadiums data");
            }
        } catch (error) {
            console.error("MMM-MyTeams-DriveToMatch: Error loading stadiums data:", error);
            this.loadHardcodedGrounds();
        }
    },

    // Parse CSV grounds data
    parseGroundsCSV: function(csvData) {
        const lines = csvData.split('\n');
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            const values = line.split(',');
            // CSV format: Country,Team,TeamID,Location,Stadium_Name,Stadium_Capacity,Post_Code,Latitude,Longitude,League,LeagueID,National_Cup_ID,League_Cup_Name,League_Cup_ID
            // New format includes TeamID, LeagueID, and Cup competition IDs
            if (values.length >= 9) { // Need at least 9 columns for lat/lng (indices 7-8)
                const country = values[0].trim();
                const team = values[1].trim();
                const teamId = values.length > 2 ? values[2].trim() : ''; // TeamID at index 2
                const location = values.length > 3 ? values[3].trim() : ''; // Location at index 3
                const stadiumName = values.length > 4 ? values[4].trim() : ''; // Stadium_Name at index 4
                const capacity = values.length > 5 ? values[5].trim() : ''; // Stadium_Capacity at index 5
                const postCode = values.length > 6 ? values[6].trim() : ''; // Post_Code at index 6
                const lat = parseFloat(values[7]); // Latitude at index 7
                const lng = parseFloat(values[8]); // Longitude at index 8
                const league = values.length > 9 ? values[9].trim() : ''; // League at index 9
                const leagueId = values.length > 10 ? values[10].trim() : ''; // LeagueID at index 10
                const nationalCupId = values.length > 11 ? values[11].trim() : ''; // National_Cup_ID at index 11
                const leagueCupName = values.length > 12 ? values[12].trim() : ''; // League_Cup_Name at index 12
                const leagueCupId = values.length > 13 ? values[13].trim() : ''; // League_Cup_ID at index 13
                
                // Validate coordinates are valid numbers
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    this.scottishStadiums.set(team.toLowerCase(), {
                        stadiumName: stadiumName,
                        latitude: lat,
                        longitude: lng,
                        team: team,
                        teamId: teamId,
                        country: country,
                        league: league,
                        leagueId: leagueId,
                        location: location,
                        capacity: capacity,
                        postCode: postCode,
                        nationalCupId: nationalCupId,
                        leagueCupName: leagueCupName,
                        leagueCupId: leagueCupId
                    });
                    successCount++;
                } else {
                    console.warn(`MMM-MyTeams-DriveToMatch: Invalid coordinates for ${team}: lat=${values[7]}, lng=${values[8]}`);
                    errorCount++;
                }
            } else {
                console.warn(`MMM-MyTeams-DriveToMatch: Insufficient columns (${values.length}) at line ${i+1}: ${line.substring(0, 50)}...`);
                errorCount++;
            }
        }
        
        console.log(`MMM-MyTeams-DriveToMatch: Parsed ${successCount} teams successfully, ${errorCount} errors`);
    },

    // Hardcoded Scottish grounds as fallback
    loadHardcodedGrounds: function() {
        const grounds = {
            // SPFL Premiership - Updated to match new CSV structure
            "celtic": { 
                stadiumName: "Celtic Park", 
                latitude: 55.8496, 
                longitude: -4.2056, 
                team: "Celtic",
                teamId: "133647",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Glasgow",
                capacity: "60411",
                postCode: "G40 3RE",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "rangers": { 
                stadiumName: "Ibrox Stadium", 
                latitude: 55.8530, 
                longitude: -4.3091, 
                team: "Rangers",
                teamId: "133602",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Glasgow",
                capacity: "50817",
                postCode: "G51 2XD",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "aberdeen": { 
                stadiumName: "Pittodrie Stadium", 
                latitude: 57.1592, 
                longitude: -2.0880, 
                team: "Aberdeen",
                teamId: "133604",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Aberdeen",
                capacity: "20866",
                postCode: "AB24 5QH",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "hearts": { 
                stadiumName: "Tynecastle Park", 
                latitude: 55.9384, 
                longitude: -3.2320, 
                team: "Hearts",
                teamId: "133653",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Edinburgh",
                capacity: "20099",
                postCode: "EH11 2NL",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "heart of midlothian": { 
                stadiumName: "Tynecastle Park", 
                latitude: 55.9384, 
                longitude: -3.2320, 
                team: "Hearts",
                teamId: "133653",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Edinburgh",
                capacity: "20099",
                postCode: "EH11 2NL",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "hibernian": { 
                stadiumName: "Easter Road", 
                latitude: 55.9615, 
                longitude: -3.1656, 
                team: "Hibernian",
                teamId: "133597",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Edinburgh",
                capacity: "20421",
                postCode: "EH7 5QG",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "kilmarnock": { 
                stadiumName: "Rugby Park", 
                latitude: 55.5947, 
                longitude: -4.5017, 
                team: "Kilmarnock",
                teamId: "133710",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Kilmarnock",
                capacity: "15003",
                postCode: "KA1 2DP",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "motherwell": { 
                stadiumName: "Fir Park", 
                latitude: 55.7814, 
                longitude: -3.9820, 
                team: "Motherwell",
                teamId: "133595",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Motherwell",
                capacity: "13677",
                postCode: "ML1 2QN",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "st mirren": { 
                stadiumName: "SMiSA Stadium", 
                latitude: 55.8342, 
                longitude: -4.4331, 
                team: "St Mirren",
                teamId: "133654",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Paisley",
                capacity: "8023",
                postCode: "PA3 2EJ",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "dundee": { 
                stadiumName: "Dens Park", 
                latitude: 56.4746, 
                longitude: -2.9707, 
                team: "Dundee",
                teamId: "133652",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Dundee",
                capacity: "11506",
                postCode: "DD3 7JW",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "dundee united": { 
                stadiumName: "Tannadice Park", 
                latitude: 56.4751, 
                longitude: -2.9693, 
                team: "Dundee United",
                teamId: "133715",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Dundee",
                capacity: "14223",
                postCode: "DD3 7JW",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "livingston": { 
                stadiumName: "Tony Macaroni Arena", 
                latitude: 55.9000, 
                longitude: -3.5167, 
                team: "Livingston",
                teamId: "134777",
                country: "Scotland",
                league: "Scottish Championship",
                leagueId: "4329",
                location: "Livingston",
                capacity: "9713",
                postCode: "EH54 7DN",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "falkirk": { 
                stadiumName: "Falkirk Stadium", 
                latitude: 56.0011, 
                longitude: -3.7836, 
                team: "Falkirk",
                teamId: "133651",
                country: "Scotland",
                league: "Scottish Championship",
                leagueId: "4329",
                location: "Falkirk",
                capacity: "8750",
                postCode: "FK2 9DX",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "partick thistle": { 
                stadiumName: "Firhill Stadium", 
                latitude: 55.8750, 
                longitude: -4.2792, 
                team: "Partick Thistle",
                teamId: "133650",
                country: "Scotland",
                league: "Scottish Championship",
                leagueId: "4329",
                location: "Glasgow",
                capacity: "10102",
                postCode: "G20 7AL",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "st johnstone": { 
                stadiumName: "McDiarmid Park", 
                latitude: 56.3784, 
                longitude: -3.4775, 
                team: "St Johnstone",
                teamId: "133603",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Perth",
                capacity: "10696",
                postCode: "PH1 2SJ",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            },
            "ross county": { 
                stadiumName: "Global Energy Stadium", 
                latitude: 57.5943, 
                longitude: -4.4267, 
                team: "Ross County",
                teamId: "133714",
                country: "Scotland",
                league: "Scottish Premiership",
                leagueId: "4328",
                location: "Dingwall",
                capacity: "6541",
                postCode: "IV15 9QZ",
                nationalCupId: "4324",
                leagueCupName: "",
                leagueCupId: ""
            }
        };

        for (const [key, value] of Object.entries(grounds)) {
            this.scottishStadiums.set(key, value);
        }
    },

    // Handle socket notifications
    socketNotificationReceived: function(notification, payload) {
        switch (notification) {
            case "SET_API_KEY":
                // SECURITY PATCH: Securely receive and store API key (only at startup)
                if (payload && payload.apiKey) {
                    this.tomtomApiKey = payload.apiKey;
                    console.log("[MMM-MyTeams-DriveToMatch] ✓ TomTom API key configured via SET_API_KEY notification");
                } else {
                    console.warn("[MMM-MyTeams-DriveToMatch] ⚠️  SET_API_KEY notification received without valid API key");
                }
                break;
                
            case "GET_NEXT_FIXTURE":
                // Add to queue instead of processing immediately
                this.requestQueue.push({
                    type: "fixture",
                    config: payload,
                    timestamp: Date.now()
                });
                if (payload.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Queued fixture request (queue size: ${this.requestQueue.length})`);
                }
                break;
                
            case "GET_ROUTES":
                // SECURITY PATCH: API key is no longer expected in GET_ROUTES payload
                // It will be retrieved from environment or stored configuration
                this.requestQueue.push({
                    type: "routes",
                    config: payload,
                    timestamp: Date.now()
                });
                if (payload.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Queued routes request (queue size: ${this.requestQueue.length})`);
                }
                break;
                
            case "SAVE_ROUTE":
                // Handle route save request immediately (not queued)
                this.saveRouteToFile(payload);
                break;
                
            case "REFRESH_STADIUM_CACHE":
                // Force refresh of stadium database cache
                this.refreshStadiumCache();
                break;
        }
    },
    
    // Refresh stadium cache by re-parsing CSV
    refreshStadiumCache: function() {
        try {
            const csvPath = path.join(__dirname, "football_teams_database.csv");
            
            // Delete existing cache
            if (fs.existsSync(STADIUM_CACHE_FILE)) {
                fs.unlinkSync(STADIUM_CACHE_FILE);
                console.log("[MMM-MyTeams-DriveToMatch] Deleted old stadium cache");
            }
            
            // Clear current stadium data
            this.scottishStadiums.clear();
            
            // Reload from CSV
            if (fs.existsSync(csvPath)) {
                const csvData = fs.readFileSync(csvPath, "utf8");
                this.parseGroundsCSV(csvData);
                console.log("[MMM-MyTeams-DriveToMatch] Reloaded football teams database from CSV");
                
                // Save new cache
                saveStadiumCache(this.scottishStadiums, csvPath);
                
                // Notify front-end of successful refresh
                this.sendSocketNotification("STADIUM_CACHE_REFRESHED", {
                    success: true,
                    stadiumCount: this.scottishStadiums.size
                });
            } else {
                console.error("[MMM-MyTeams-DriveToMatch] CSV file not found during cache refresh");
                this.sendSocketNotification("STADIUM_CACHE_REFRESHED", {
                    success: false,
                    error: "CSV file not found"
                });
            }
        } catch (error) {
            console.error("[MMM-MyTeams-DriveToMatch] Error refreshing stadium cache:", error);
            this.sendSocketNotification("STADIUM_CACHE_REFRESHED", {
                success: false,
                error: error.message
            });
        }
    },

    // Get next fixture for team using comprehensive methodology from MMM-MyTeams-Fixtures
    getNextFixture: async function(config) {
        try {
            // Debug: Log the config to see if useSharedFixturesCache is present
            if (config.debug) {
                console.log("[MMM-MyTeams-DriveToMatch] getNextFixture called with config.useSharedFixturesCache =", config.useSharedFixturesCache);
            }
            
            // If useSharedFixturesCache is enabled, copy fixtures from MMM-MyTeams-Fixtures
            if (config.useSharedFixturesCache) {
                if (config.debug) {
                    console.log("[MMM-MyTeams-DriveToMatch] useSharedFixturesCache enabled - copying from MMM-MyTeams-Fixtures");
                }
                const copied = copySharedCache();
                if (copied) {
                    // Set active cache file to sharedFixtures-cache.json
                    activeCacheFile = SHARED_CACHE_LOCAL;
                    // Reload cache from sharedFixtures-cache.json
                    if (fs.existsSync(SHARED_CACHE_LOCAL)) {
                        const raw = fs.readFileSync(SHARED_CACHE_LOCAL, "utf8");
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed.data) {
                            cache = {
                                ts: Number(parsed.ts) || 0,
                                ttl: Number(parsed.ttl) || 0,
                                source: parsed.source || null,
                                key: parsed.key || null,
                                data: parsed.data
                            };
                            if (config.debug) {
                                console.log(`[MMM-MyTeams-DriveToMatch] ✓ Reloaded ${Array.isArray(parsed.data) ? parsed.data.length : 1} fixture(s) from sharedFixtures-cache.json`);
                            }
                        }
                    }
                }
            }
            
            // Include dateOverride in cache key so changing the date invalidates cache
            const cacheKey = `${config.teamName}_${config.teamId}_${config.dateOverride || 'next'}`;
            const cached = this.fixtureCache.get(cacheKey);
            
            // Check cache (5 minute TTL, or 30 seconds in debug mode for easier testing)
            const cacheTTL = config.debug ? 30 * 1000 : 5 * 60 * 1000;
            if (cached && (Date.now() - cached.timestamp) < cacheTTL) {
                if (config.debug) {
                    const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000);
                    console.log(`MMM-MyTeams-DriveToMatch: Using cached fixture data (age: ${cacheAge}s, dateOverride: ${config.dateOverride || 'none'}, instance: ${config.instanceId})`);
                }
                // Send cached data with instance ID
                this.sendSocketNotification("FIXTURE_DATA", {
                    instanceId: config.instanceId,
                    ...cached.data
                });
                return;
            }

            if (config.debug) {
                console.log(`MMM-MyTeams-DriveToMatch: Fetching fixture data for ${config.teamName} (cache key: ${cacheKey}, instance: ${config.instanceId})`);
            }

            let fixtures = [];
            let usedSource = null;

            // If useSharedFixturesCache is enabled and we have fixtures in disk cache, use them directly
            if (config.useSharedFixturesCache && cache.data && Array.isArray(cache.data) && cache.data.length > 0) {
                // When using shared cache, always use it regardless of TTL
                // The shared cache is managed by MMM-MyTeams-Fixtures, so we trust it
                fixtures = cache.data;
                usedSource = "shared-cache";
                if (config.debug) {
                    const cacheAge = Date.now() - (cache.ts || 0);
                    console.log(`[MMM-MyTeams-DriveToMatch] Using ${fixtures.length} fixtures from shared cache (age: ${Math.round(cacheAge/1000)}s, managed by MMM-MyTeams-Fixtures)`);
                }
            }

            // If we don't have fixtures from shared cache, fetch from API
            if (fixtures.length === 0) {
                // Use comprehensive fixture methodology with domestic filtering (same as MMM-MyTeams-Fixtures)
                try {
                    fixtures = await getFixturesFromAPIComprehensive({
                    apiUrl: config.apiUrl || "https://www.thesportsdb.com/api/v1/json/3",
                    teamId: config.teamId,
                    teamName: config.teamName,
                    season: config.season || "auto",
                    fallbackSeason: config.fallbackSeason || "2025-2026",
                    requestTimeoutMs: config.requestTimeout || 15000,
                    maxFixtures: 24,
                    scottishLeagueIds: config.scottishLeagueIds || ["4330", "4364", "4363", "4888"],
                    uefaLeagueIds: config.uefaLeagueIds || ["4480", "4481", "5071"],
                    useSearchEventsFallback: config.useSearchEventsFallback !== false, // Default true
                    strictLeagueFiltering: config.strictLeagueFiltering !== false, // Default true
                    debug: config.debug
                });
                
                // Validate that fixtures are for the correct team (TheSportsDB API sometimes returns wrong team's fixtures)
                if (fixtures && fixtures.length > 0) {
                    const teamNameLower = config.teamName.toLowerCase();
                    const validFixtures = fixtures.filter(f => {
                        const opponent = (f.opponent || "").toLowerCase();
                        const homeTeam = (f.homeTeam || "").toLowerCase();
                        const awayTeam = (f.awayTeam || "").toLowerCase();
                        // Check if our team name appears in homeTeam or awayTeam, but NOT in opponent
                        // (opponent should be the OTHER team, not our team)
                        const isValidFixture = (homeTeam.includes(teamNameLower) || awayTeam.includes(teamNameLower)) 
                                            && !opponent.includes(teamNameLower);
                        return isValidFixture;
                    });
                    
                    if (validFixtures.length === 0) {
                        if (config.debug) {
                            console.warn(`MMM-MyTeams-DriveToMatch: API returned ${fixtures.length} fixtures but none are for ${config.teamName}`);
                            if (fixtures.length > 0) {
                                console.log("MMM-MyTeams-DriveToMatch: Sample invalid fixture:", {
                                    opponent: fixtures[0].opponent,
                                    homeTeam: fixtures[0].homeTeam,
                                    awayTeam: fixtures[0].awayTeam
                                });
                            }
                        }
                        throw new Error(`API returned fixtures for wrong team (expected ${config.teamName})`);
                    }
                    
                    fixtures = validFixtures;
                }
                
                usedSource = "api";
                if (config.debug) console.log("MMM-MyTeams-DriveToMatch: API returned", fixtures.length, "valid fixtures");
                
                // Check if we have any away fixtures from the API
                const awayFixtures = fixtures.filter(f => f.homeAway === 'A');
                if (config.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: API returned ${awayFixtures.length} away fixtures out of ${fixtures.length} total`);
                }
                
                // If no away fixtures from API, supplement with FWP scraper
                if (awayFixtures.length === 0) {
                    if (config.debug) console.log("MMM-MyTeams-DriveToMatch: No away fixtures from API, supplementing with FWP scraper");
                    try {
                        const fwpFixtures = await scrapeFixturesFromFWP(config.teamName, 10, 15000, config.debug);
                        if (config.debug) console.log("MMM-MyTeams-DriveToMatch: FWP returned", fwpFixtures.length, "fixtures");
                        
                        // Merge FWP fixtures with API fixtures, avoiding duplicates
                        const mergedFixtures = [...fixtures];
                        for (const fwpFix of fwpFixtures) {
                            // Check if this fixture already exists (by date and opponent)
                            const exists = fixtures.some(apiFix => {
                                const apiDate = apiFix.date ? apiFix.date.split('T')[0] : apiFix.date;
                                const fwpDate = fwpFix.date ? fwpFix.date.split('T')[0] : fwpFix.date;
                                return apiDate === fwpDate && 
                                       apiFix.opponent.toLowerCase() === fwpFix.opponent.toLowerCase();
                            });
                            if (!exists) {
                                mergedFixtures.push(fwpFix);
                            }
                        }
                        
                        // Sort merged fixtures by date
                        mergedFixtures.sort((a, b) => {
                            const dateA = a.date ? a.date.split('T')[0] : a.date;
                            const dateB = b.date ? b.date.split('T')[0] : b.date;
                            return dateA.localeCompare(dateB);
                        });
                        
                        fixtures = mergedFixtures;
                        usedSource = "api+fwp";
                        if (config.debug) console.log("MMM-MyTeams-DriveToMatch: Merged fixtures:", fixtures.length, "total");
                    } catch (fwpError) {
                        if (config.debug) console.warn("MMM-MyTeams-DriveToMatch: FWP supplement failed:", fwpError.message);
                        // Continue with API fixtures only
                    }
                }
                } catch (apiError) {
                    if (config.debug) console.warn("MMM-MyTeams-DriveToMatch: API failed:", apiError.message);
                    
                    // Fallback to FWP scraper
                    try {
                        fixtures = await scrapeFixturesFromFWP(config.teamName, 10, 15000, config.debug);
                        usedSource = "fwp";
                        if (config.debug) console.log("MMM-MyTeams-DriveToMatch: FWP returned", fixtures.length, "fixtures");
                    } catch (fwpError) {
                        if (config.debug) console.warn("MMM-MyTeams-DriveToMatch: FWP failed:", fwpError.message);
                        throw new Error("Both API and FWP scraper failed");
                    }
                }
            }

            if (!fixtures || fixtures.length === 0) {
                throw new Error("No upcoming fixtures found");
            }

            if (config.debug) {
                console.log(`MMM-MyTeams-DriveToMatch: Found ${fixtures.length} total fixtures (domestic and European)`);
                if (fixtures.length > 0) {
                    console.log("MMM-MyTeams-DriveToMatch: All fixtures with home/away status:");
                    fixtures.slice(0, 10).forEach((f, idx) => {
                        console.log(`  ${idx + 1}. ${f.date} - ${f.homeAway === 'H' ? 'HOME' : f.homeAway === 'A' ? 'AWAY' : 'UNKNOWN'} vs ${f.opponent} (${f.competition})`);
                    });
                }
            }

            // Use next fixture (domestic or European)
            let nextFixture = fixtures[0];
            
            // If dateOverride is set, find the fixture for that specific date
            if (config.dateOverride) {
                const overrideDate = config.dateOverride; // Format: "YYYY-MM-DD"
                // Extract date portion from fixture.date (which may include time like "2025-10-05T14:00")
                const matchingFixture = fixtures.find(f => {
                    const fixtureDate = f.date ? f.date.split('T')[0] : f.date;
                    return fixtureDate === overrideDate;
                });
                if (matchingFixture) {
                    nextFixture = matchingFixture;
                    if (config.debug) {
                        console.log(`MMM-MyTeams-DriveToMatch: Using dateOverride ${overrideDate} - found fixture: ${nextFixture.opponent} (${nextFixture.competition}) [homeAway: ${nextFixture.homeAway}]`);
                    }
                } else {
                    if (config.debug) {
                        console.warn(`MMM-MyTeams-DriveToMatch: No fixture found for dateOverride ${overrideDate}, using next fixture instead`);
                        console.log("MMM-MyTeams-DriveToMatch: Available dates:", fixtures.map(f => f.date ? f.date.split('T')[0] : f.date));
                    }
                }
            }
            
            if (config.debug) {
                console.log(`MMM-MyTeams-DriveToMatch: Selected fixture - ${nextFixture.opponent} (${nextFixture.competition}) [${nextFixture.competitionType}] on ${nextFixture.date} [homeAway: ${nextFixture.homeAway}]`);
            }
            const fixture = await this.processFixture(nextFixture, config);

            // Cache the result
            this.fixtureCache.set(cacheKey, {
                data: fixture,
                timestamp: Date.now()
            });

            // Calculate adaptive cache TTL based on days until fixture
            const adaptiveTTL = calculateAdaptiveCacheTTL(nextFixture.date);

            // Update disk cache
            cache = {
                ts: Date.now(),
                ttl: adaptiveTTL,
                source: usedSource,
                key: cacheKey,
                data: fixture
            };
            saveCacheToDisk(adaptiveTTL);

            // Send response with instance ID for filtering
            this.sendSocketNotification("FIXTURE_DATA", {
                instanceId: config.instanceId,
                ...fixture
            });

        } catch (error) {
            console.error("MMM-MyTeams-DriveToMatch: Error fetching fixture:", error);
            // Send error with instance ID for filtering
            this.sendSocketNotification("FIXTURE_ERROR", {
                instanceId: config.instanceId,
                message: error.message
            });
        }
    },

    // Check if competition is domestic (Scottish)
    isDomesticCompetition: function(competition) {
        const comp = competition.toLowerCase();
        const domesticCompetitions = [
            'scottish premier league', 'scottish premiership','spfl','scottish championship', 'scottish league one', 'scottish league two',
            'scottish cup', 'league cup', 'challenge cup', 'scottish premiership',
            'william hill scottish cup', 'premier sports cup', 'cinch premiership'
        ];
        
        return domesticCompetitions.some(domestic => comp.includes(domestic));
    },

    // Process fixture data
    processFixture: async function(fixture, config) {
        const isHome = fixture.homeAway === "H";
        const opponent = fixture.opponent;
        const competition = (fixture.competition || "").toLowerCase();
        
        // ALWAYS log when processing fixtures to help debug venue coordinate issues
        console.log(`[MMM-MyTeams-DriveToMatch] ========== PROCESSING FIXTURE ==========`);
        console.log(`[MMM-MyTeams-DriveToMatch] Fixture details:`, {
            opponent: opponent,
            homeAway: fixture.homeAway,
            isHome: isHome,
            competition: fixture.competition,
            date: fixture.date,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam
        });
        
        // Check if this is a cup semi-final or final at Hampden Park
        const isHampdenFixture = this.isHampdenParkFixture(competition, fixture);
        
        let venue;
        if (isHampdenFixture) {
            // Use Hampden Park coordinates for cup semi-finals and finals
            venue = {
                stadiumName: "Hampden Park",
                latitude: 55.8256,
                longitude: -4.2519,
                team: "Queen's Park",
                postCode: "G42 9BA"  // Hampden Park postcode from CSV database
            };
            console.log(`[MMM-MyTeams-DriveToMatch] Using Hampden Park for ${competition} fixture vs ${opponent}`);
        } else {
            // Get venue coordinates based on home team
            // If isHome is true, venue is Celtic's home ground (Celtic Park)
            // If isHome is false (away match), venue is the opponent's ground
            const venueTeam = isHome ? config.teamName : opponent;
            console.log(`[MMM-MyTeams-DriveToMatch] Looking up venue for team: "${venueTeam}" (isHome: ${isHome})`);
            console.log(`[MMM-MyTeams-DriveToMatch] Venue should be: ${isHome ? config.teamName + "'s ground (Celtic Park)" : opponent + "'s ground"}`);
            
            venue = await this.getVenueCoordinates(venueTeam, null);
            
            console.log(`[MMM-MyTeams-DriveToMatch] Venue lookup result:`, {
                stadiumName: venue.stadiumName,
                latitude: venue.latitude,
                longitude: venue.longitude,
                team: venue.team,
                postCode: venue.postCode
            });
            
            // Check if coordinates are null
            if (venue.latitude === null || venue.longitude === null) {
                console.warn(`[MMM-MyTeams-DriveToMatch] ⚠️  WARNING: Venue coordinates are NULL!`);
                console.warn(`[MMM-MyTeams-DriveToMatch] ⚠️  Team searched: "${venueTeam}"`);
                console.warn(`[MMM-MyTeams-DriveToMatch] ⚠️  This team may not be in the stadium database`);
            }
        }

        const processedFixture = {
            date: fixture.date + "T" + (fixture.timeText || "15:00:00"),
            opponent: opponent,
            isHome: isHome,
            venue: venue,
            competition: fixture.competition,
            homeTeam: isHome ? config.teamName : opponent,
            awayTeam: isHome ? opponent : config.teamName
        };
        
        if (config.debug) {
            console.log(`MMM-MyTeams-DriveToMatch: Processed fixture summary:`, {
                matchup: `${processedFixture.homeTeam} vs ${processedFixture.awayTeam}`,
                isHome: processedFixture.isHome,
                venue: processedFixture.venue.stadiumName,
                venueCoords: `${processedFixture.venue.latitude}, ${processedFixture.venue.longitude}`,
                competition: processedFixture.competition
            });
        }
        
        return processedFixture;
    },

    // Check if fixture should be played at Hampden Park
    isHampdenParkFixture: function(competition, fixture) {
        const comp = competition.toLowerCase();
        
        // Scottish Cup and League Cup semi-finals and finals are at Hampden
        const isCupCompetition = comp.includes('scottish cup') || 
                                comp.includes('scottish fa cup') || 
                                comp.includes('league cup') || 
                                comp.includes('scottish league cup');
        
        if (!isCupCompetition) {
            return false;
        }
        
        // Check round information from fixture data
        const round = (fixture.round || "").toLowerCase();
        const fixtureText = (fixture.opponent || "").toLowerCase();
        const competitionText = comp;
        
        // Check for semi-finals and finals only (not quarter-finals)
        const isSemiFinal = round.includes('semi-final') || 
                           round.includes('semi') ||
                           competitionText.includes('semi') || 
                           fixtureText.includes('semi');
                           
        const isFinal = (round.includes('final') && !round.includes('semi')) ||
                       (competitionText.includes('final') && !competitionText.includes('semi'));
        
        return isSemiFinal || isFinal;
    },

    // Get venue coordinates
    getVenueCoordinates: async function(teamName, venueName) {
        try {
            console.log(`[MMM-MyTeams-DriveToMatch] getVenueCoordinates called with teamName: "${teamName}", venueName: "${venueName || 'null'}"`);
            
            const cacheKey = `${teamName}_${venueName || ''}`.toLowerCase();
            const cached = this.venueCache.get(cacheKey);
            
            if (cached) {
                console.log(`[MMM-MyTeams-DriveToMatch] Found in venue cache:`, cached);
                return cached;
            }

            // Try to find in Scottish grounds database
            const teamKey = teamName.toLowerCase();
            console.log(`[MMM-MyTeams-DriveToMatch] Searching stadium database for: "${teamKey}"`);
            
            let venue = this.scottishStadiums.get(teamKey);
            
            if (!venue) {
                console.log(`[MMM-MyTeams-DriveToMatch] No exact match found, trying fuzzy matching...`);
                // Try alternative team name matching
                for (const [key, value] of this.scottishStadiums.entries()) {
                    if (teamName.toLowerCase().includes(key) || key.includes(teamName.toLowerCase())) {
                        console.log(`[MMM-MyTeams-DriveToMatch] Fuzzy match found! Database key: "${key}" matched team: "${teamName}"`);
                        venue = value;
                        break;
                    }
                }
            } else {
                console.log(`[MMM-MyTeams-DriveToMatch] Exact match found in database!`);
            }

            if (venue) {
                const result = {
                    stadiumName: venueName || venue.stadiumName,
                    latitude: venue.latitude,
                    longitude: venue.longitude,
                    team: venue.team,
                    postCode: venue.postCode || null  // Include postcode from CSV database
                };
                
                console.log(`[MMM-MyTeams-DriveToMatch] ✓ Venue found:`, result);
                this.venueCache.set(cacheKey, result);
                return result;
            }

            // If not found, return null (will show venue name but no routes)
            console.warn(`[MMM-MyTeams-DriveToMatch] ⚠️  Venue NOT found in database for team: "${teamName}"`);
            console.warn(`[MMM-MyTeams-DriveToMatch] ⚠️  Available teams in database (first 10):`, Array.from(this.scottishStadiums.keys()).slice(0, 10));
            
            return {
                stadiumName: venueName || `${teamName} Ground`,
                latitude: null,
                longitude: null,
                team: teamName,
                postCode: null  // No postcode available for unknown venues
            };

        } catch (error) {
            console.error("MMM-MyTeams-DriveToMatch: Error getting venue coordinates:", error);
            return null;
        }
    },

    // Get routes using TomTom API - EXACT METHODOLOGY FROM MMM-TomTomCalculateRouteTraffic
    // SECURITY PATCH: API key is now passed via secure configuration, NOT through socket notifications
    getRoutes: async function(config) {
        try {
            // SECURITY: Retrieve API key from environment or stored config, NOT from socket payload
            const apiKey = process.env.TOMTOM_API_KEY || this.tomtomApiKey;
            
            if (!apiKey) {
                throw new Error("TomTom API key not configured. Set TOMTOM_API_KEY environment variable or configure apiTomTomKey in module config.");
            }
            
            const timestamp = new Date().toLocaleTimeString('en-GB');
            if (config.debug) {
                console.log(`MMM-MyTeams-DriveToMatch: [${timestamp}] Calculating routes`, {
                    from: `${config.startLat},${config.startLng}`,
                    to: `${config.endLat},${config.endLng}`,
                    maxRoutes: config.maxRoutes,
                    isEuropeanFixture: config.isEuropeanFixture,
                    isAwayMatch: config.isAwayMatch,
                    apiKeySource: process.env.TOMTOM_API_KEY ? 'environment' : 'config'
                });
            }

            // Make two separate API calls:
            // Route 1: Fastest time (routeType=fastest)
            // Route 2: Shortest distance (routeType=shortest)
            const baseUrl = "https://api.tomtom.com/routing/1/calculateRoute";
            const locations = `${config.startLat},${config.startLng}:${config.endLat},${config.endLng}`;
            
            const routes = [];
            const routeTypes = ['fastest', 'shortest'];
            const maxRoutesToFetch = Math.min(config.maxRoutes || 2, 2); // Limit to 2 routes
            
            for (let routeTypeIndex = 0; routeTypeIndex < maxRoutesToFetch; routeTypeIndex++) {
                const routeType = routeTypes[routeTypeIndex];
                
                // SECURITY PATCH: Build URL WITHOUT API key (will be in Authorization header instead)
                let url = `${baseUrl}/${locations}/json`;
                url += `?routeType=${routeType}`;
                url += `&traffic=true`;
                url += `&instructionsType=text&language=en-GB`;
                
                // Add toll avoidance if configured
                if (config.avoidTolls) {
                    url += `&avoid=tollRoads`;
                    if (config.debug) {
                        console.log(`MMM-MyTeams-DriveToMatch: Toll avoidance enabled`);
                    }
                }
                
                // SECURITY PATCH: Log sanitized URL (without API key)
                if (config.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Fetching ${routeType} route`);
                    console.log("MMM-MyTeams-DriveToMatch: TomTom API URL (sanitized):", sanitizeUrlForLogging(url));
                }
                
                try {
                    // SECURITY PATCH: Pass API key via Authorization header instead of URL parameter
                    const requestOptions = {
                        headers: {
                            "X-API-Key": apiKey,
                            "Authorization": `Bearer ${apiKey}`
                        }
                    };
                    const response = await doFetch(url, requestOptions, config.timeout || 15000);
                    const data = await response.json();
                    
                    if (config.debug) {
                        console.log(`MMM-MyTeams-DriveToMatch: TomTom API response for ${routeType}:`, {
                            routesCount: data.routes?.length || 0,
                            hasRoutes: !!data.routes
                        });
                    }
                    
                    if (!data.routes || data.routes.length === 0) {
                        console.warn(`MMM-MyTeams-DriveToMatch: No ${routeType} route found`);
                        continue;
                    }
                    
                    // Use the first route from the response
                    const route = data.routes[0];
                    
                    // Extract waypoints from instructions if available
                    let waypoints = [];
                    try {
                        // Only consider it a European away fixture if BOTH conditions are true:
                        // 1. It's a European competition (UEFA/Champions/Europa)
                        // 2. It's an AWAY match (not at home)
                        const isEuropeanAwayFixture = (config.isEuropeanFixture || false) && (config.isAwayMatch || false);
                        
                        // TomTom API uses route.guidance.instructions for turn-by-turn directions
                        // Also pass route legs for GPS-based bridge detection
                        if (route.guidance && route.guidance.instructions) {
                            waypoints = this.extractWaypoints(route.guidance.instructions, isEuropeanAwayFixture, config.debug, route.legs, config);
                            if (config.debug) {
                                console.log(`MMM-MyTeams-DriveToMatch: Extracted ${waypoints.length} waypoints from ${route.guidance.instructions.length} instructions (European Away: ${isEuropeanAwayFixture})`);
                            }
                        } else if (route.legs && route.legs[0] && route.legs[0].points) {
                            // Fallback to legs.points if guidance is not available
                            waypoints = this.extractWaypoints(route.legs[0].points, isEuropeanAwayFixture, config.debug, route.legs, config);
                            if (config.debug) {
                                console.log(`MMM-MyTeams-DriveToMatch: Extracted ${waypoints.length} waypoints from legs.points (European Away: ${isEuropeanAwayFixture})`);
                            }
                        } else {
                            if (config.debug) {
                                console.warn("MMM-MyTeams-DriveToMatch: No guidance.instructions or legs.points found in route");
                            }
                        }
                    } catch (err) {
                        if (config.debug) {
                            console.warn("MMM-MyTeams-DriveToMatch: Could not extract waypoints:", err.message);
                        }
                    }

                    // Calculate fuel cost if enabled
                    let fuelCost = null;
                    if (config.showFuelCost && config.fuelEfficiency && config.fuelPricePerLitre) {
                        const distanceInMeters = route.summary.lengthInMeters;
                        const distanceInKm = distanceInMeters / 1000; // Convert meters to kilometers
                        
                        // Calculate fuel cost: (distance in km / 100) * L/100km * price per litre
                        // fuelEfficiency is in L/100km (e.g., 8.0 L/100km)
                        const litresUsed = (distanceInKm / 100) * config.fuelEfficiency;
                        fuelCost = litresUsed * config.fuelPricePerLitre;
                        
                        if (config.debug) {
                            console.log(`MMM-MyTeams-DriveToMatch: Fuel cost calculation:`, {
                                distanceInKm: distanceInKm.toFixed(2),
                                fuelEfficiency: config.fuelEfficiency + ' L/100km',
                                litresUsed: litresUsed.toFixed(2),
                                pricePerLitre: config.fuelPricePerLitre,
                                totalCost: fuelCost.toFixed(2)
                            });
                        }
                    }

                    // Extract turn-by-turn directions from guidance instructions
                    let turnByTurnDirections = [];
                    if (route.guidance && route.guidance.instructions) {
                        turnByTurnDirections = route.guidance.instructions.map((instruction, idx) => {
                            return {
                                step: idx + 1,
                                instruction: instruction.message || instruction.instructionType || 'Continue',
                                distance: instruction.routeOffsetInMeters || 0,
                                roadNumbers: instruction.roadNumbers || []
                            };
                        });
                    }

                    routes.push({
                        summary: route.summary,
                        waypoints: waypoints,
                        turnByTurnDirections: turnByTurnDirections,
                        routeIndex: routeTypeIndex,
                        routeType: routeType,
                        fuelCost: fuelCost
                    });
                    
                    if (config.debug) {
                        console.log(`MMM-MyTeams-DriveToMatch: Route ${routeTypeIndex + 1} (${routeType}):`, {
                            lengthInMeters: route.summary.lengthInMeters,
                            travelTimeInSeconds: route.summary.travelTimeInSeconds,
                            trafficDelayInSeconds: route.summary.trafficDelayInSeconds,
                            waypoints: waypoints,
                            fuelCost: fuelCost ? `£${fuelCost.toFixed(2)}` : 'N/A'
                        });
                    }
                } catch (error) {
                    console.error(`MMM-MyTeams-DriveToMatch: Error fetching ${routeType} route:`, error.message);
                    // Continue to next route type
                }
            }
            
            if (routes.length === 0) {
                throw new Error("No routes found from TomTom API");
            }

            if (config.debug) {
                const timestamp = new Date().toLocaleTimeString('en-GB');
                console.log(`MMM-MyTeams-DriveToMatch: [${timestamp}] Sending ${routes.length} routes to frontend`);
            }
            
            // Send response with instance ID for filtering
            this.sendSocketNotification("ROUTES_DATA", {
                instanceId: config.instanceId,
                routes: routes
            });

        } catch (error) {
            console.error("MMM-MyTeams-DriveToMatch: Error calculating routes:", error);
            // Send error with instance ID for filtering
            this.sendSocketNotification("ROUTES_ERROR", {
                instanceId: config.instanceId,
                message: error.message
            });
        }
    },

    // Extract major waypoints from route instructions
    // TomTom API uses route.guidance.instructions array with 'message' field
    // Also uses GPS coordinates from route.legs for bridge detection
    // isEuropeanAwayFixture should only be true for AWAY European matches (not home European matches)
    extractWaypoints: function(instructions, isEuropeanAwayFixture = false, debug = false, routeLegs = null, config = {}) {
        const waypoints = [];
        const majorRoads = ['M8', 'M90', 'M9', 'M80', 'M77', 'M74', 'A92', 'A90', 'A1', 'A82'];
        
        // Comprehensive list of all major bridge crossings in Scotland with GPS coordinates
        // Format: { name, lat, lng, radius (in km for detection) }
               // Comprehensive list of all major bridge crossings in UK and mainland Europe with GPS coordinates
        // Format: { name, lat, lng, radius (in km for detection), region }
        const bridges = [
            // Scotland
            { name: 'Queensferry Crossing', lat: 56.0009, lng: -3.4047, radius: 0.5, region: 'Scotland' },
            { name: 'Forth Road Bridge', lat: 56.0020, lng: -3.4080, radius: 0.5, region: 'Scotland' },
            { name: 'Forth Bridge', lat: 56.0000, lng: -3.3886, radius: 0.5, region: 'Scotland' },
            { name: 'Erskine Bridge', lat: 55.9247, lng: -4.4503, radius: 0.5, region: 'Scotland' },
            { name: 'Kingston Bridge', lat: 55.8575, lng: -4.2789, radius: 0.3, region: 'Scotland' },
            { name: 'Kincardine Bridge', lat: 56.0608, lng: -3.7258, radius: 0.5, region: 'Scotland' },
            { name: 'Clackmannanshire Bridge', lat: 56.0847, lng: -3.7147, radius: 0.5, region: 'Scotland' },
            { name: 'Tay Road Bridge', lat: 56.4500, lng: -2.9667, radius: 0.5, region: 'Scotland' },
            { name: 'Clyde Arc', lat: 55.8597, lng: -4.2894, radius: 0.2, region: 'Scotland' },
            { name: 'Squinty Bridge', lat: 55.8597, lng: -4.2894, radius: 0.2, region: 'Scotland' },
            { name: 'Clyde Bridge', lat: 55.8444, lng: -4.2506, radius: 0.2, region: 'Scotland' },
            { name: 'Dalmarnock Bridge', lat: 55.8444, lng: -4.2000, radius: 0.2, region: 'Scotland' },
            { name: 'Rutherglen Bridge', lat: 55.8333, lng: -4.2167, radius: 0.2, region: 'Scotland' },
            { name: 'King George V Bridge', lat: 55.8500, lng: -4.2500, radius: 0.2, region: 'Scotland' },
            { name: 'Skye Bridge', lat: 57.2733, lng: -5.7311, radius: 0.5, region: 'Scotland' },
            { name: 'Connel Bridge', lat: 56.4500, lng: -5.3833, radius: 0.3, region: 'Scotland' },
            { name: 'Ballachulish Bridge', lat: 56.6833, lng: -5.1833, radius: 0.3, region: 'Scotland' },
            { name: 'Cromarty Bridge', lat: 57.6833, lng: -4.0333, radius: 0.5, region: 'Scotland' },
            { name: 'Dornoch Firth Bridge', lat: 57.8833, lng: -4.0333, radius: 0.5, region: 'Scotland' },
            { name: 'Friarton Bridge', lat: 56.3833, lng: -3.4000, radius: 0.3, region: 'Scotland' },
            
            // England
            { name: 'Dartford Crossing', lat: 51.4833, lng: 0.2667, radius: 0.8, region: 'England' },
            { name: 'Queen Elizabeth II Bridge', lat: 51.4833, lng: 0.2667, radius: 0.8, region: 'England' },
            { name: 'Humber Bridge', lat: 53.7056, lng: -0.4500, radius: 1.0, region: 'England' },
            { name: 'Severn Bridge', lat: 51.6089, lng: -2.6336, radius: 0.8, region: 'England-Wales' },
            { name: 'Second Severn Crossing', lat: 51.5833, lng: -2.6500, radius: 0.8, region: 'England-Wales' },
            { name: 'Tyne Bridge', lat: 54.9689, lng: -1.6025, radius: 0.3, region: 'England' },
            { name: 'Tyne Tunnel', lat: 54.9833, lng: -1.4667, radius: 0.5, region: 'England' },
            { name: 'Tamar Bridge', lat: 50.4089, lng: -4.2167, radius: 0.5, region: 'England' },
            { name: 'Clifton Suspension Bridge', lat: 51.4553, lng: -2.6274, radius: 0.3, region: 'England' },
            { name: 'Tower Bridge', lat: 51.5055, lng: -0.0754, radius: 0.2, region: 'England' },
            { name: 'London Bridge', lat: 51.5078, lng: -0.0877, radius: 0.2, region: 'England' },
            { name: 'Millennium Bridge', lat: 51.5097, lng: -0.0984, radius: 0.2, region: 'England' },
            { name: 'Tees Transporter Bridge', lat: 54.5833, lng: -1.2333, radius: 0.3, region: 'England' },
            { name: 'Orwell Bridge', lat: 52.0167, lng: 1.2167, radius: 0.5, region: 'England' },
            { name: 'Itchen Bridge', lat: 50.9000, lng: -1.3833, radius: 0.3, region: 'England' },
            
            // Wales
            { name: 'Britannia Bridge', lat: 53.2167, lng: -4.2500, radius: 0.5, region: 'Wales' },
            { name: 'Menai Suspension Bridge', lat: 53.2236, lng: -4.1653, radius: 0.5, region: 'Wales' },
            { name: 'Newport Transporter Bridge', lat: 51.5667, lng: -2.9833, radius: 0.3, region: 'Wales' },
            { name: 'Cleddau Bridge', lat: 51.7000, lng: -4.9667, radius: 0.5, region: 'Wales' },
            
            // Northern Ireland
            { name: 'Foyle Bridge', lat: 55.0167, lng: -7.2833, radius: 0.5, region: 'Northern Ireland' },
            { name: 'Craigavon Bridge', lat: 55.0000, lng: -7.3167, radius: 0.3, region: 'Northern Ireland' },
            { name: 'Peace Bridge', lat: 55.0000, lng: -7.3167, radius: 0.2, region: 'Northern Ireland' },
            { name: 'Queen Elizabeth Bridge Belfast', lat: 54.5833, lng: -5.9167, radius: 0.3, region: 'Northern Ireland' },
            
            // Ireland
            { name: 'Samuel Beckett Bridge', lat: 53.3486, lng: -6.2397, radius: 0.3, region: 'Ireland' },
            { name: 'East Link Bridge', lat: 53.3472, lng: -6.2292, radius: 0.3, region: 'Ireland' },
            { name: 'River Suir Bridge', lat: 52.2500, lng: -7.1167, radius: 0.5, region: 'Ireland' },
            { name: 'Rose Fitzgerald Kennedy Bridge', lat: 52.3833, lng: -6.9167, radius: 0.8, region: 'Ireland' },
            
            // France
            { name: 'Millau Viaduct', lat: 44.0797, lng: 3.0219, radius: 1.5, region: 'France' },
            { name: 'Pont de Normandie', lat: 49.4333, lng: 0.2667, radius: 1.0, region: 'France' },
            { name: 'Pont de Tancarville', lat: 49.4833, lng: 0.4667, radius: 0.8, region: 'France' },
            { name: 'Viaduc de la Souleuvre', lat: 48.9167, lng: -0.8333, radius: 0.5, region: 'France' },
            { name: 'Pont de Saint-Nazaire', lat: 47.2667, lng: -2.2000, radius: 1.0, region: 'France' },
            { name: 'Pont d\'Aquitaine', lat: 44.8833, lng: -0.5333, radius: 0.8, region: 'France' },
            { name: 'Pont de Cheviré', lat: 47.2167, lng: -1.6000, radius: 0.5, region: 'France' },
            { name: 'Viaduc de Garabit', lat: 44.9667, lng: 3.1833, radius: 0.5, region: 'France' },
            
            // Spain & Portugal
            { name: 'Vasco da Gama Bridge', lat: 38.7667, lng: -9.0833, radius: 1.5, region: 'Portugal' },
            { name: '25 de Abril Bridge', lat: 38.6892, lng: -9.1778, radius: 1.0, region: 'Portugal' },
            { name: 'Viaducto de Almonte', lat: 39.8167, lng: -6.1833, radius: 0.8, region: 'Spain' },
            { name: 'Puente de Rande', lat: 42.2833, lng: -8.6500, radius: 0.8, region: 'Spain' },
            { name: 'Puente Colgante', lat: 43.3233, lng: -3.0178, radius: 0.3, region: 'Spain' },
            { name: 'Puente de la Constitución de 1812', lat: 36.5167, lng: -6.2667, radius: 1.0, region: 'Spain' },
            { name: 'Puente del Alamillo', lat: 37.4167, lng: -6.0000, radius: 0.5, region: 'Spain' },
            
            // Italy
            { name: 'Ponte Vecchio', lat: 43.7681, lng: 11.2531, radius: 0.2, region: 'Italy' },
            { name: 'Rialto Bridge', lat: 45.4381, lng: 12.3358, radius: 0.2, region: 'Italy' },
            { name: 'Ponte della Libertà', lat: 45.4500, lng: 12.2833, radius: 0.8, region: 'Italy' },
            { name: 'Ponte Morandi (Genoa)', lat: 44.4333, lng: 8.8833, radius: 0.5, region: 'Italy' },
            { name: 'Viadotto Italia', lat: 38.1167, lng: 15.6500, radius: 1.0, region: 'Italy' },
            { name: 'Ponte Vasco da Gama', lat: 45.4167, lng: 12.3333, radius: 0.5, region: 'Italy' },

        ];
        
        // Ferry route detection for European AWAY fixtures
        // Note: Ferry routes are now detected from TomTom routing instructions
        // TomTom will automatically select the optimal ferry route based on total journey time
        if (isEuropeanAwayFixture && debug) {
            console.log('MMM-MyTeams-DriveToMatch: European AWAY fixture - ferry route will be detected from routing instructions');
        }
        
        // GPS-based bridge detection using route coordinates
        if (routeLegs && Array.isArray(routeLegs)) {
            const detectedBridges = new Set();
            
            routeLegs.forEach(leg => {
                if (leg.points && Array.isArray(leg.points)) {
                    leg.points.forEach(point => {
                        const pointLat = point.latitude;
                        const pointLng = point.longitude;
                        
                        if (pointLat && pointLng) {
                            // Check if this point is near any bridge
                            bridges.forEach(bridge => {
                                const distance = this.calculateDistance(pointLat, pointLng, bridge.lat, bridge.lng);
                                if (distance <= bridge.radius && !detectedBridges.has(bridge.name)) {
                                    detectedBridges.add(bridge.name);
                                    if (!waypoints.includes(bridge.name)) {
                                        waypoints.push(bridge.name);
                                        if (debug) {
                                            console.log(`MMM-MyTeams-DriveToMatch: GPS detected bridge: ${bridge.name} (distance: ${distance.toFixed(2)}km)`);
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            });
            
            if (debug) {
                console.log(`MMM-MyTeams-DriveToMatch: GPS bridge detection found ${detectedBridges.size} bridges`);
            }
        }
        
        if (!instructions || !Array.isArray(instructions)) {
            return waypoints.slice(0, 5);
        }
        
        // Debug: Log first 10 instructions to see what TomTom is returning
        if (debug) {
            console.log('MMM-MyTeams-DriveToMatch: Sample instructions (first 10):');
            instructions.slice(0, 10).forEach((inst, idx) => {
                const text = inst.message || inst.instruction || '';
                console.log(`  [${idx}] ${text}`);
            });
        }
        
        instructions.forEach(instruction => {
            // TomTom API uses 'message' field for instruction text
            const text = instruction.message || instruction.instruction || '';
            
            if (!text) return;
            
            // Check for major roads
            majorRoads.forEach(road => {
                if (text.includes(road) && !waypoints.includes(road)) {
                    waypoints.push(road);
                }
            });
            
            // Check for bridge names in instruction text (backup method)
            bridges.forEach(bridge => {
                if (text.toLowerCase().includes(bridge.name.toLowerCase()) && !waypoints.includes(bridge.name)) {
                    waypoints.push(bridge.name);
                }
            });
            
            // Detect ferry routes from routing instructions
            // TomTom includes ferry information in routing instructions when ferries are part of the route
            const textLower = text.toLowerCase();
            
            // Check for Eurotunnel if enabled
            if (config.showEurotunnel && (textLower.includes('eurotunnel') || textLower.includes('channel tunnel') || 
                (textLower.includes('folkestone') && textLower.includes('calais')))) {
                const tunnelName = '🚂 Eurotunnel (Folkestone-Calais, ~35 min)';
                if (!waypoints.some(wp => wp.toLowerCase().includes('eurotunnel') || wp.toLowerCase().includes('channel tunnel'))) {
                    waypoints.push(tunnelName);
                    if (debug) {
                        console.log(`MMM-MyTeams-DriveToMatch: Detected Eurotunnel from instruction: "${text}"`);
                    }
                }
            }
            
            // Check if this instruction mentions a ferry
            if (textLower.includes('ferry')) {
                // Try to extract ferry route information from the instruction text
                let ferryName = null;
                
                // Common UK-Europe ferry routes with operator and crossing time information
                                const ferryRoutes = [
                    // UK to Continental Europe
                    { keywords: ['dover', 'calais'], name: 'Dover-Calais Ferry', operator: 'P&O/DFDS', duration: 90, region: 'UK-France' },
                    { keywords: ['dover', 'dunkirk', 'dunkerque'], name: 'Dover-Dunkirk Ferry', operator: 'DFDS', duration: 120, region: 'UK-France' },
                    { keywords: ['harwich', 'hook of holland', 'hoek van holland'], name: 'Harwich-Hook of Holland Ferry', operator: 'Stena Line', duration: 390, region: 'UK-Netherlands' },
                    { keywords: ['hull', 'rotterdam'], name: 'Hull-Rotterdam Ferry', operator: 'P&O', duration: 660, region: 'UK-Netherlands' },
                    { keywords: ['hull', 'zeebrugge'], name: 'Hull-Zeebrugge Ferry', operator: 'P&O', duration: 780, region: 'UK-Belgium' },
                    { keywords: ['newcastle', 'amsterdam', 'ijmuiden'], name: 'Newcastle-Amsterdam Ferry', operator: 'DFDS', duration: 960, region: 'UK-Netherlands' },
                    { keywords: ['portsmouth', 'caen', 'ouistreham'], name: 'Portsmouth-Caen Ferry', operator: 'Brittany Ferries', duration: 360, region: 'UK-France' },
                    { keywords: ['portsmouth', 'cherbourg'], name: 'Portsmouth-Cherbourg Ferry', operator: 'Brittany Ferries', duration: 180, region: 'UK-France' },
                    { keywords: ['portsmouth', 'st malo', 'saint malo'], name: 'Portsmouth-St Malo Ferry', operator: 'Brittany Ferries', duration: 540, region: 'UK-France' },
                    { keywords: ['portsmouth', 'le havre'], name: 'Portsmouth-Le Havre Ferry', operator: 'Brittany Ferries', duration: 330, region: 'UK-France' },
                    { keywords: ['portsmouth', 'bilbao'], name: 'Portsmouth-Bilbao Ferry', operator: 'Brittany Ferries', duration: 1440, region: 'UK-Spain' },
                    { keywords: ['portsmouth', 'santander'], name: 'Portsmouth-Santander Ferry', operator: 'Brittany Ferries', duration: 1440, region: 'UK-Spain' },
                    { keywords: ['newhaven', 'dieppe'], name: 'Newhaven-Dieppe Ferry', operator: 'DFDS', duration: 240, region: 'UK-France' },
                    { keywords: ['plymouth', 'roscoff'], name: 'Plymouth-Roscoff Ferry', operator: 'Brittany Ferries', duration: 360, region: 'UK-France' },
                    { keywords: ['plymouth', 'santander'], name: 'Plymouth-Santander Ferry', operator: 'Brittany Ferries', duration: 1200, region: 'UK-Spain' },
                    { keywords: ['poole', 'cherbourg'], name: 'Poole-Cherbourg Ferry', operator: 'Brittany Ferries', duration: 270, region: 'UK-France' },
                    { keywords: ['fishguard', 'rosslare'], name: 'Fishguard-Rosslare Ferry', operator: 'Stena Line', duration: 210, region: 'UK-Ireland' },
                    { keywords: ['holyhead', 'dublin'], name: 'Holyhead-Dublin Ferry', operator: 'Irish Ferries/Stena', duration: 195, region: 'UK-Ireland' },
                    { keywords: ['cairnryan', 'larne'], name: 'Cairnryan-Larne Ferry', operator: 'P&O', duration: 120, region: 'UK-Ireland' },
                    { keywords: ['cairnryan', 'belfast'], name: 'Cairnryan-Belfast Ferry', operator: 'Stena Line', duration: 135, region: 'UK-Ireland' },
                    { keywords: ['liverpool', 'dublin'], name: 'Liverpool-Dublin Ferry', operator: 'P&O', duration: 480, region: 'UK-Ireland' },
                    { keywords: ['pembroke', 'rosslare'], name: 'Pembroke-Rosslare Ferry', operator: 'Irish Ferries', duration: 240, region: 'UK-Ireland' },
                    
                    // France to Ireland
                    { keywords: ['cherbourg', 'rosslare'], name: 'Cherbourg-Rosslare Ferry', operator: 'Stena Line', duration: 1080, region: 'France-Ireland' },
                    { keywords: ['cherbourg', 'dublin'], name: 'Cherbourg-Dublin Ferry', operator: 'Irish Ferries', duration: 1140, region: 'France-Ireland' },
                    { keywords: ['roscoff', 'cork'], name: 'Roscoff-Cork Ferry', operator: 'Brittany Ferries', duration: 840, region: 'France-Ireland' },
                    
                    // France to Spain
                    { keywords: ['sete', 'tangier'], name: 'Sète-Tangier Ferry', operator: 'Grandi Navi Veloci', duration: 2160, region: 'France-Morocco' },
                    { keywords: ['marseille', 'algiers'], name: 'Marseille-Algiers Ferry', operator: 'Algerie Ferries', duration: 1260, region: 'France-Algeria' },
                    
                    // Spain to Morocco
                    { keywords: ['algeciras', 'tangier'], name: 'Algeciras-Tangier Ferry', operator: 'FRS/Balearia', duration: 90, region: 'Spain-Morocco' },
                    { keywords: ['tarifa', 'tangier'], name: 'Tarifa-Tangier Ferry', operator: 'FRS', duration: 60, region: 'Spain-Morocco' },
                    { keywords: ['almeria', 'nador'], name: 'Almeria-Nador Ferry', operator: 'Balearia', duration: 420, region: 'Spain-Morocco' },
                    
                    // Spain to Balearic Islands
                    { keywords: ['barcelona', 'palma', 'mallorca'], name: 'Barcelona-Palma Ferry', operator: 'Balearia/Trasmed', duration: 420, region: 'Spain-Balearics' },
                    { keywords: ['barcelona', 'ibiza'], name: 'Barcelona-Ibiza Ferry', operator: 'Balearia', duration: 480, region: 'Spain-Balearics' },
                    { keywords: ['barcelona', 'mahon', 'menorca'], name: 'Barcelona-Mahon Ferry', operator: 'Balearia', duration: 540, region: 'Spain-Balearics' },
                    { keywords: ['valencia', 'palma', 'mallorca'], name: 'Valencia-Palma Ferry', operator: 'Balearia/Trasmed', duration: 420, region: 'Spain-Balearics' },
                    { keywords: ['valencia', 'ibiza'], name: 'Valencia-Ibiza Ferry', operator: 'Balearia', duration: 180, region: 'Spain-Balearics' },
                    { keywords: ['denia', 'ibiza'], name: 'Denia-Ibiza Ferry', operator: 'Balearia', duration: 120, region: 'Spain-Balearics' },
                    { keywords: ['denia', 'palma', 'mallorca'], name: 'Denia-Palma Ferry', operator: 'Balearia', duration: 240, region: 'Spain-Balearics' },
                    
                    // Italy to Spain
                    { keywords: ['genoa', 'barcelona'], name: 'Genoa-Barcelona Ferry', operator: 'Grandi Navi Veloci', duration: 1200, region: 'Italy-Spain' },
                    { keywords: ['civitavecchia', 'barcelona'], name: 'Civitavecchia-Barcelona Ferry', operator: 'Grimaldi Lines', duration: 1200, region: 'Italy-Spain' },
                    
                    // Italy to Sardinia
                    { keywords: ['genoa', 'olbia'], name: 'Genoa-Olbia Ferry', operator: 'Moby/Tirrenia', duration: 660, region: 'Italy-Sardinia' },
                    { keywords: ['genoa', 'porto torres'], name: 'Genoa-Porto Torres Ferry', operator: 'Tirrenia', duration: 720, region: 'Italy-Sardinia' },
                    { keywords: ['livorno', 'olbia'], name: 'Livorno-Olbia Ferry', operator: 'Moby/Grimaldi', duration: 480, region: 'Italy-Sardinia' },
                    { keywords: ['civitavecchia', 'olbia'], name: 'Civitavecchia-Olbia Ferry', operator: 'Moby/Tirrenia', duration: 420, region: 'Italy-Sardinia' },
                    { keywords: ['civitavecchia', 'cagliari'], name: 'Civitavecchia-Cagliari Ferry', operator: 'Tirrenia', duration: 840, region: 'Italy-Sardinia' },
                    { keywords: ['civitavecchia', 'arbatax'], name: 'Civitavecchia-Arbatax Ferry', operator: 'Tirrenia', duration: 600, region: 'Italy-Sardinia' },
                    { keywords: ['piombino', 'olbia'], name: 'Piombino-Olbia Ferry', operator: 'Moby', duration: 360, region: 'Italy-Sardinia' },
                    { keywords: ['naples', 'cagliari'], name: 'Naples-Cagliari Ferry', operator: 'Tirrenia', duration: 780, region: 'Italy-Sardinia' },
                    
                    // Italy to Sicily
                    { keywords: ['genoa', 'palermo'], name: 'Genoa-Palermo Ferry', operator: 'Grandi Navi Veloci', duration: 1200, region: 'Italy-Sicily' },
                    { keywords: ['livorno', 'palermo'], name: 'Livorno-Palermo Ferry', operator: 'Grimaldi Lines', duration: 1080, region: 'Italy-Sicily' },
                    { keywords: ['civitavecchia', 'palermo'], name: 'Civitavecchia-Palermo Ferry', operator: 'Grandi Navi Veloci', duration: 840, region: 'Italy-Sicily' },
                    { keywords: ['naples', 'palermo'], name: 'Naples-Palermo Ferry', operator: 'Tirrenia/Grandi Navi', duration: 660, region: 'Italy-Sicily' },
                    { keywords: ['salerno', 'palermo'], name: 'Salerno-Palermo Ferry', operator: 'Grimaldi Lines', duration: 600, region: 'Italy-Sicily' },
                    { keywords: ['villa san giovanni', 'messina'], name: 'Villa San Giovanni-Messina Ferry', operator: 'Caronte/Bluferries', duration: 20, region: 'Italy-Sicily' },
                    { keywords: ['reggio calabria', 'messina'], name: 'Reggio Calabria-Messina Ferry', operator: 'Bluvia', duration: 25, region: 'Italy-Sicily' },
                    
                    // Italy to Corsica
                    { keywords: ['livorno', 'bastia'], name: 'Livorno-Bastia Ferry', operator: 'Corsica Ferries/Moby', duration: 240, region: 'Italy-Corsica' },
                    { keywords: ['piombino', 'bastia'], name: 'Piombino-Bastia Ferry', operator: 'Corsica Ferries', duration: 150, region: 'Italy-Corsica' },
                    { keywords: ['savona', 'bastia'], name: 'Savona-Bastia Ferry', operator: 'Corsica Ferries', duration: 360, region: 'Italy-Corsica' },
                    
                    // France to Corsica
                    { keywords: ['marseille', 'ajaccio'], name: 'Marseille-Ajaccio Ferry', operator: 'Corsica Linea', duration: 720, region: 'France-Corsica' },
                    { keywords: ['marseille', 'bastia'], name: 'Marseille-Bastia Ferry', operator: 'Corsica Linea', duration: 660, region: 'France-Corsica' },
                    { keywords: ['nice', 'ajaccio'], name: 'Nice-Ajaccio Ferry', operator: 'Corsica Ferries', duration: 360, region: 'France-Corsica' },
                    { keywords: ['nice', 'bastia'], name: 'Nice-Bastia Ferry', operator: 'Corsica Ferries', duration: 330, region: 'France-Corsica' }

                ];
                
                // Try to match ferry route from instruction text
                for (const route of ferryRoutes) {
                    // Check if instruction contains keywords for this route
                    const matchCount = route.keywords.filter(keyword => textLower.includes(keyword)).length;
                    if (matchCount >= 1) {
                        // Format ferry name with operator and duration if showFerryDetails is enabled
                        if (config.showFerryDetails) {
                            const hours = Math.floor(route.duration / 60);
                            const mins = route.duration % 60;
                            const durationStr = hours > 0 ? 
                                (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`) : 
                                `${mins}min`;
                            ferryName = `🚢 ${route.name} (${route.operator}, ~${durationStr})`;
                        } else {
                            ferryName = `🚢 ${route.name}`;
                        }
                        break;
                    }
                }
                
                // If we couldn't identify a specific route, use generic "Ferry Crossing"
                if (!ferryName) {
                    ferryName = '🚢 Ferry Crossing';
                }
                
                // Add ferry to waypoints if not already present
                if (!waypoints.some(wp => wp.toLowerCase().includes('ferry'))) {
                    waypoints.push(ferryName);
                    if (debug) {
                        console.log(`MMM-MyTeams-DriveToMatch: Detected ferry route: ${ferryName} from instruction: "${text}"`);
                    }
                }
            }
        });
        
        // Move ferry crossings to the first position if present
        const ferryIndex = waypoints.findIndex(wp => wp.toLowerCase().includes('ferry'));
        if (ferryIndex > 0) {
            const ferryWaypoint = waypoints.splice(ferryIndex, 1)[0];
            waypoints.unshift(ferryWaypoint);
            if (debug) {
                console.log(`MMM-MyTeams-DriveToMatch: Moved ferry waypoint to first position: ${ferryWaypoint}`);
            }
        }
        
        return waypoints.slice(0, 5); // Increased limit to 5 waypoints for longer European routes
    },
    
    // Calculate distance between two GPS coordinates using Haversine formula
    // Returns distance in kilometers
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    },
    
    // Convert degrees to radians
    toRadians: function(degrees) {
        return degrees * (Math.PI / 180);
    },

    // Save route to file in mySavedRoutes directory
    saveRouteToFile: function(payload) {
        try {
            const { instanceId, routeData } = payload;
            
            if (!routeData) {
                console.error("[MMM-MyTeams-DriveToMatch] No route data provided for saving");
                this.sendSocketNotification("ROUTE_SAVE_ERROR", {
                    instanceId: instanceId,
                    message: "No route data provided"
                });
                return;
            }

            // Create filename based on opponent and venue
            const fixture = routeData.fixture;
            const route = routeData.route;
            
            // Format filename based on home/away match
            let filename;
            if (fixture.isHome) {
                // Home match: "Celtic Park - Fastest Route" or "Celtic Park - Shortest Route"
                const venueName = fixture.venue.replace(/[^a-zA-Z0-9\s]/g, ''); // Remove special chars but keep spaces
                const routeTypeCapitalized = route.routeType.charAt(0).toUpperCase() + route.routeType.slice(1);
                filename = `${venueName} - ${routeTypeCapitalized} Route.json`;
            } else {
                // Away match: "Opponent - Stadium"
                const opponent = (fixture.opponent || fixture.awayTeam).replace(/[^a-zA-Z0-9\s]/g, ''); // Remove special chars but keep spaces
                const venueName = fixture.venue.replace(/[^a-zA-Z0-9\s]/g, ''); // Remove special chars but keep spaces
                filename = `${opponent} - ${venueName}.json`;
            }
            
            const filepath = path.join(__dirname, "mySavedRoutes", filename);

            // Format turn-by-turn directions for easy reading
            let formattedDirections = [];
            if (route.turnByTurnDirections && route.turnByTurnDirections.length > 0) {
                formattedDirections = route.turnByTurnDirections.map(dir => {
                    const distanceKm = (dir.distance / 1000).toFixed(1);
                    const roadInfo = dir.roadNumbers && dir.roadNumbers.length > 0 ? ` (${dir.roadNumbers.join(', ')})` : '';
                    return `${dir.step}. ${dir.instruction}${roadInfo} - ${distanceKm} km from start`;
                });
            } else {
                formattedDirections = ["Turn-by-turn directions not available"];
            }

            // Format the data in an easy-to-read structure
            const formattedData = {
                "=== MATCH DETAILS ===": {
                    "Opponent": fixture.opponent || fixture.awayTeam,
                    "Home Team": fixture.homeTeam,
                    "Away Team": fixture.awayTeam,
                    "Match Type": fixture.isHome ? "Home Match" : "Away Match",
                    "Date": new Date(fixture.date).toLocaleString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    "Venue": fixture.venue,
                    "Post Code": fixture.postCode || "N/A",
                    "Competition": fixture.competition
                },
                "=== ROUTE DETAILS ===": {
                    "Route Type": route.routeType.toUpperCase(),
                    "Distance": route.distance,
                    "Duration": route.duration,
                    "Traffic Delay": route.trafficDelayFormatted,
                    "Estimated Fuel Cost": route.fuelCost || "N/A"
                },
                "=== TURN-BY-TURN DIRECTIONS ===": formattedDirections,
                "=== MAJOR WAYPOINTS ===": route.waypoints.length > 0 ? route.waypoints : ["Direct route - no major waypoints"],
                "=== SPECIAL FEATURES ===": {
                    "Eurotunnel": route.eurotunnel || "Not on this route",
                    "Ferry Crossing": route.ferry ? `${route.ferry.operator} - ${route.ferry.crossing} (~${route.ferry.duration} min)` : "Not on this route"
                },
                "=== GPS COORDINATES ===": {
                    "Start Location (Your Home)": {
                        "Latitude": routeData.coordinates.start.latitude,
                        "Longitude": routeData.coordinates.start.longitude
                    },
                    "Destination (Stadium)": {
                        "Latitude": routeData.coordinates.end.latitude,
                        "Longitude": routeData.coordinates.end.longitude
                    }
                },
                "=== TECHNICAL DATA ===": {
                    "Distance (meters)": route.distanceMeters,
                    "Duration (seconds)": route.durationSeconds,
                    "Traffic Delay (seconds)": route.trafficDelay,
                    "Saved At": routeData.savedAt
                }
            };

            // Write to file with pretty formatting
            fs.writeFileSync(filepath, JSON.stringify(formattedData, null, 4), 'utf8');
            
            console.log(`[MMM-MyTeams-DriveToMatch] ✓ Route saved successfully: ${filename}`);
            
            // Send success notification back to module
            this.sendSocketNotification("ROUTE_SAVED", {
                instanceId: instanceId,
                filename: filename,
                filepath: filepath
            });

        } catch (error) {
            console.error("[MMM-MyTeams-DriveToMatch] Error saving route:", error);
            this.sendSocketNotification("ROUTE_SAVE_ERROR", {
                instanceId: payload.instanceId,
                message: error.message
            });
        }
    }
});
