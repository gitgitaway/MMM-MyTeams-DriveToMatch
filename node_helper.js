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
const SharedRequestManager = require("./shared-request-manager.js");

// Initialize shared request manager
const requestManager = SharedRequestManager.getInstance();

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
    // Determine which cache file to use
    if (useSharedCache) {
      console.log("[MMM-MyTeams-DriveToMatch] useSharedFixturesCache enabled - attempting to copy from MMM-MyTeams-Fixtures");
      copySharedCache();
      activeCacheFile = SHARED_CACHE_LOCAL; // Use sharedFixtures-cache.json as primary
      console.log("[MMM-MyTeams-DriveToMatch] Using sharedFixtures-cache.json as primary cache");
    } else {
      activeCacheFile = CACHE_FILE; // Use fixtures-cache.json as backup
      console.log("[MMM-MyTeams-DriveToMatch] Using fixtures-cache.json as primary cache");
    }
    
    // Load from the active cache file
    if (fs.existsSync(activeCacheFile)) {
      const raw = fs.readFileSync(activeCacheFile, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data) {
        cache = {
          ts: Number(parsed.ts) || 0,
          ttl: Number(parsed.ttl) || 0,
          source: parsed.source || null,
          key: parsed.key || null,
          data: parsed.data
        };
        console.log(`[MMM-MyTeams-DriveToMatch] ✓ Loaded ${Array.isArray(parsed.data) ? parsed.data.length : 1} fixture(s) from ${path.basename(activeCacheFile)}`);
      }
    } else {
      console.warn(`[MMM-MyTeams-DriveToMatch] Cache file not found: ${path.basename(activeCacheFile)}`);
    }
  } catch (e) {
    console.warn("[MMM-MyTeams-DriveToMatch] Cache load failed:", e.message);
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
      
      // Only save to fixtures-cache.json when NOT using shared cache
      // This prevents overwriting the shared cache data
      if (activeCacheFile === CACHE_FILE) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), "utf8");
        console.log(`[MMM-MyTeams-DriveToMatch] ✓ Wrote fixture to fixtures-cache.json`);
      } else {
        console.log(`[MMM-MyTeams-DriveToMatch] Using shared cache - skipping save to prevent overwrite`);
      }
    }
  } catch (e) {
    console.warn("[MMM-MyTeams-DriveToMatch] Cache save failed:", e.message);
  }
}

// Generic fetch with timeout and headers - NOW USES SHARED REQUEST MANAGER
async function doFetch(url, options = {}, timeoutMs = 15000, priority = 1) {
  if (!_fetchImpl) throw new Error(`Fetch not available (${_fetchType})`);

  const fetchOptions = {
    ...options,
    headers: {
      "User-Agent": "MMM-MyTeams-DriveToMatch (+MagicMirror)",
      "Accept": "application/json, text/html;q=0.9",
      "Cache-Control": "no-cache",
      ...(options.headers || {})
    }
  };

  try {
    // Use shared request manager to coordinate with other modules
    const result = await requestManager.queueRequest({
      url: url,
      options: fetchOptions,
      timeout: timeoutMs,
      priority: priority,
      moduleId: 'MMM-MyTeams-DriveToMatch',
      deduplicate: true
    });

    if (!result.success) {
      throw new Error(`HTTP ${result.status}: Request failed`);
    }

    // Return a response-like object for compatibility
    return {
      ok: true,
      status: result.status,
      json: async () => typeof result.data === 'string' ? JSON.parse(result.data) : result.data,
      text: async () => typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
    };
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`Request timeout after ${timeoutMs}ms`);
    throw err;
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
    scottishGrounds: new Map(),
    neutralVenues: new Map(),  // Hardcoded neutral venues (always loaded first)
    requestQueue: [], // Queue for API requests to prevent conflicts
    isProcessingQueue: false, // Flag to track queue processing
    lastRequestTime: 0, // Track last request time for throttling
    MIN_REQUEST_INTERVAL: 2000, // Minimum 2 seconds between requests to avoid conflicts
    apiTomTomKey: null, // Store the TomTom API key from SET_API_KEY notification

    // Start the helper
    start: function() {
        console.log("Starting node helper for: MMM-MyTeams-DriveToMatch");
        this.loadNeutralVenues();  // Load neutral venues first (highest priority)
        this.loadScottishGrounds();
        loadCacheFromDisk(false);
        
        // Start queue processor (legacy - now using SharedRequestManager)
        this.startQueueProcessor();
        
        // Configure shared request manager
        requestManager.updateConfig({
            minRequestInterval: 2000,      // 2 seconds between any requests
            minDomainInterval: 1000,       // 1 second between requests to same domain
            maxRetries: 3,
            requestTimeout: 15000
        });
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
            } else if (request.type === "airports") {
                await this.getAirportsInfo(request.config);
            } else if (request.type === "parking") {
                await this.getParkingInfo(request.config);
            } else if (request.type === "charging") {
                await this.getChargingInfo(request.config);
            }
        } catch (error) {
            console.error("MMM-MyTeams-DriveToMatch: Error processing queued request:", error);
        } finally {
            this.isProcessingQueue = false;
        }
    },

    // Load hardcoded neutral venues (ALWAYS available, highest priority)
    // These are used for Scottish cup finals, semi-finals, and other neutral ground fixtures
    loadNeutralVenues: function() {
        const neutralVenuesData = {
            // Scottish National Stadium
            "hampden park": { 
                name: "Hampden Park", 
                latitude: 55.8548, 
                longitude: -4.2519, 
                team: "Hampden Park", 
                postCode: "G42 9BA",
                country: "Scotland"
            },
            // Other potential neutral venues
            "murrayfield": { 
                name: "Murrayfield Stadium", 
                latitude: 55.9415, 
                longitude: -3.2388, 
                team: "Murrayfield", 
                postCode: "EH14 8XZ",
                country: "Scotland"
            },
            "celtic park": { 
                name: "Celtic Park", 
                latitude: 55.8496, 
                longitude: -4.2056, 
                team: "Celtic Park", 
                postCode: "G40 3RE",
                country: "Scotland"
            },
            "ibrox": { 
                name: "Ibrox Stadium", 
                latitude: 55.8530, 
                longitude: -4.3091, 
                team: "Ibrox", 
                postCode: "G51 2XF",
                country: "Scotland"
            }
        };

        for (const [key, value] of Object.entries(neutralVenuesData)) {
            this.neutralVenues.set(key, value);
        }
        console.log("[MMM-MyTeams-DriveToMatch] ✓ Loaded " + this.neutralVenues.size + " neutral venues");
    },

    // Load football stadiums database from football_teams_database.csv
    loadScottishGrounds: function() {
        try {
            // Load from the updated football_teams_database.csv
            const csvPath = path.join(__dirname, "football_teams_database.csv");
            if (fs.existsSync(csvPath)) {
                const csvData = fs.readFileSync(csvPath, "utf8");
                this.parseGroundsCSV(csvData);
                console.log("MMM-MyTeams-DriveToMatch: Loaded venues from football_teams_database.csv");
            } else {
                // Fallback to hardcoded data
                this.loadHardcodedGrounds();
                console.log("MMM-MyTeams-DriveToMatch: Using hardcoded stadium data (CSV not found)");
            }
        } catch (error) {
            console.error("MMM-MyTeams-DriveToMatch: Error loading stadiums data:", error);
            this.loadHardcodedGrounds();
        }
    },

    // Parse CSV grounds data from football_teams_database.csv
    // Column order: Country(0), Team(1), TeamID(2), Location(3), Stadium_Name(4), Stadium_Capacity(5), Post_Code(6), Latitude(7), Longitude(8), League(9), LeagueID(10), National_Cup_ID(11), League_Cup_Name(12), League_Cup_ID(13), crestImage(14)
    parseGroundsCSV: function(csvData) {
        const lines = csvData.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            const values = line.split(',');
            // Need at least Country, Team, Location, Stadium_Name, Post_Code, Latitude, Longitude
            if (values.length >= 9) {
                const country = values[0].trim();
                const team = values[1].trim();
                const location = values[3].trim();
                const stadiumName = values[4].trim();
                const capacity = values[5].trim();
                const postCode = values[6].trim();
                const lat = parseFloat(values[7]);
                const lng = parseFloat(values[8]);
                
                // Optional columns
                const league = values.length > 9 ? values[9].trim() : '';
                
                if (!isNaN(lat) && !isNaN(lng) && stadiumName) {
                    this.scottishGrounds.set(team.toLowerCase(), {
                        name: stadiumName,
                        latitude: lat,
                        longitude: lng,
                        team: team,
                        country: country,
                        league: league,
                        location: location,
                        capacity: capacity,
                        postCode: postCode
                    });
                }
            }
        }
    },

    // Hardcoded Scottish grounds as fallback
    loadHardcodedGrounds: function() {
        const grounds = {
            // SPFL Premiership
            "celtic": { name: "Celtic Park", latitude: 55.8496, longitude: -4.2056, team: "Celtic" },
            "rangers": { name: "Ibrox Stadium", latitude: 55.8530, longitude: -4.3091, team: "Rangers" },
            "aberdeen": { name: "Pittodrie Stadium", latitude: 57.1592, longitude: -2.0880, team: "Aberdeen" },
            "hearts": { name: "Tynecastle Park", latitude: 55.9384, longitude: -3.2320, team: "Hearts" },
            "heart of midlothian": { name: "Tynecastle Park", latitude: 55.9384, longitude: -3.2320, team: "Hearts" },
            "hibernian": { name: "Easter Road", latitude: 55.9615, longitude: -3.1656, team: "Hibernian" },
            "kilmarnock": { name: "Rugby Park", latitude: 55.5947, longitude: -4.5017, team: "Kilmarnock" },
            "motherwell": { name: "Fir Park", latitude: 55.7814, longitude: -3.9820, team: "Motherwell" },
            "st mirren": { name: "SMiSA Stadium", latitude: 55.8342, longitude: -4.4331, team: "St Mirren" },
            "dundee": { name: "Dens Park", latitude: 56.4746, longitude: -2.9707, team: "Dundee" },
            "dundee united": { name: "Tannadice Park", latitude: 56.4751, longitude: -2.9693, team: "Dundee United" },
            "livingston": { name: "Tony Macaroni Arena", latitude: 55.9000, longitude: -3.5167, team: "Livingston" },
            "falkirk": { name: "Falkirk Stadium", latitude: 56.0011, longitude: -3.7836, team: "Falkirk" },
            "partick thistle": { name: "Firhill Stadium", latitude: 55.8750, longitude: -4.2792, team: "Partick Thistle" },
            "st johnstone": { name: "McDiarmid Park", latitude: 56.3784, longitude: -3.4775, team: "St Johnstone" },
            "ross county": { name: "Global Energy Stadium", latitude: 57.5943, longitude: -4.4267, team: "Ross County" },
            // Neutral venues
            "hampden park": { name: "Hampden Park", latitude: 55.8548, longitude: -4.2519, team: "Hampden Park", postCode: "G42 9BA" }
        };

        for (const [key, value] of Object.entries(grounds)) {
            this.scottishGrounds.set(key, value);
        }
    },

    // Handle socket notifications
    socketNotificationReceived: function(notification, payload) {
        // Enable debug mode in SharedRequestManager if any module instance has debug enabled
        if (payload && payload.debug) {
            requestManager.enableDebug();
        }
        
        switch (notification) {
            case "SET_API_KEY":
                // Receive and store the TomTom API key sent from the frontend
                if (payload && payload.apiKey) {
                    this.apiTomTomKey = payload.apiKey;
                    console.log("MMM-MyTeams-DriveToMatch: TomTom API key received and stored");
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
                // Add to queue instead of processing immediately
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
            case "GET_AIRPORTS_INFO":
                // Add to queue for airport info request
                this.requestQueue.push({
                    type: "airports",
                    config: payload,
                    timestamp: Date.now()
                });
                if (payload.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Queued airports request (queue size: ${this.requestQueue.length})`);
                }
                break;
            case "SAVE_AIRPORTS_SHEET":
                // Handle airports sheet save request immediately
                this.saveAirportsSheet(payload);
                break;
            case "GET_PARKING_INFO":
                // Add to queue for parking info request
                this.requestQueue.push({
                    type: "parking",
                    config: payload,
                    timestamp: Date.now()
                });
                if (payload.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Queued parking request (queue size: ${this.requestQueue.length})`);
                }
                break;
            case "SAVE_PARKING_SHEET":
                // Handle parking sheet save request immediately
                this.saveParkingSheet(payload);
                break;
            case "GET_CHARGING_INFO":
                // Add to queue for charging info request
                this.requestQueue.push({
                    type: "charging",
                    config: payload,
                    timestamp: Date.now()
                });
                if (payload.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Queued charging request (queue size: ${this.requestQueue.length})`);
                }
                break;
            case "SAVE_CHARGING_SHEET":
                // Handle charging sheet save request immediately
                this.saveChargingSheet(payload);
                break;
        }
    },

    // Get next fixture for team using comprehensive methodology from MMM-MyTeams-Fixtures
    getNextFixture: async function(config) {
        try {
            // Debug: Log the config to see if useSharedFixturesCache is present
            if (config.debug) {
                console.log("[MMM-MyTeams-DriveToMatch] getNextFixture called with config.useSharedFixturesCache =", config.useSharedFixturesCache);
                console.log("[MMM-MyTeams-DriveToMatch] Config received - neutralVenueOverrides:", config.neutralVenueOverrides ? "✓ PRESENT" : "✗ MISSING");
                if (config.neutralVenueOverrides) {
                    console.log("[MMM-MyTeams-DriveToMatch]   neutralVenueOverrides.enabled =", config.neutralVenueOverrides.enabled);
                    console.log("[MMM-MyTeams-DriveToMatch]   neutralVenueOverrides.matches =", config.neutralVenueOverrides.matches ? `${config.neutralVenueOverrides.matches.length} match(es)` : "MISSING");
                }
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

            // Update disk cache
            cache = {
                ts: Date.now(),
                ttl: 1 * 60 * 1000,
                source: usedSource,
                key: cacheKey,
                data: fixture
            };
            saveCacheToDisk(1 * 60 * 1000);

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
        
        if (config.debug) {
            console.log(`MMM-MyTeams-DriveToMatch: Processing fixture - ${config.teamName} vs ${opponent}`);
            console.log(`MMM-MyTeams-DriveToMatch: Fixture homeAway field: "${fixture.homeAway}" (isHome: ${isHome})`);
        }
        
        // TIER 0: Check for neutral venue overrides (highest priority)
        let neutralVenueOverride = null;
        if (config.neutralVenueOverrides && config.neutralVenueOverrides.enabled) {
            if (config.debug) {
                console.log(`🔍 TIER 0: Checking neutral venue overrides for ${fixture.date} vs ${opponent}...`);
            }
            neutralVenueOverride = await this.checkNeutralVenueOverride(fixture, opponent, config);
            if (config.debug && !neutralVenueOverride) {
                console.log(`🔍 TIER 0: No neutral venue override found for this fixture`);
            }
        } else if (config.debug) {
            console.log(`🔍 TIER 0: Neutral venue overrides disabled or not configured (skipping)`);
        }
        
        let venue;
        if (neutralVenueOverride) {
            // Use the configured neutral venue override
            venue = neutralVenueOverride;
            if (config.debug) {
                console.log(`⭐ MMM-MyTeams-DriveToMatch: Using neutral venue override "${venue.name}" for ${fixture.date} vs ${opponent}`);
            }
        } else {
            // Check if this is a cup semi-final or final at Hampden Park
            const isHampdenFixture = await this.isHampdenParkFixture(competition, fixture);
            
            if (isHampdenFixture) {
                // Use Hampden Park coordinates for cup semi-finals and finals
                // Call getVenueCoordinates with "Hampden Park" as venueName so it checks neutral venues first (PRIORITY 0)
                venue = await this.getVenueCoordinates("Hampden Park", "Hampden Park");
                if (config.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Using Hampden Park for ${competition} fixture vs ${opponent}`);
                }
            } else {
                // Get venue coordinates based on home team
                // If isHome is true, venue is Celtic's home ground (Celtic Park)
                // If isHome is false (away match), venue is the opponent's ground
                const venueTeam = isHome ? config.teamName : opponent;
                if (config.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Looking up venue for team: ${venueTeam} (isHome: ${isHome}, so venue should be ${isHome ? config.teamName + "'s ground" : opponent + "'s ground"})`);
                }
                venue = await this.getVenueCoordinates(venueTeam, null);
                if (config.debug && venue) {
                    console.log(`MMM-MyTeams-DriveToMatch: Venue resolved:`, {
                        name: venue.name,
                        latitude: venue.latitude,
                        longitude: venue.longitude,
                        team: venue.team
                    });
                } else if (!venue) {
                    console.warn(`MMM-MyTeams-DriveToMatch: Failed to resolve venue for ${venueTeam}`);
                }
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
                venue: processedFixture.venue ? processedFixture.venue.name : 'Unknown',
                venueCoords: processedFixture.venue ? `${processedFixture.venue.latitude}, ${processedFixture.venue.longitude}` : 'Unknown',
                competition: processedFixture.competition
            });
        }
        
        return processedFixture;
    },

    // Check if fixture has a neutral venue override configured
    checkNeutralVenueOverride: async function(fixture, opponent, config) {
        try {
            if (!config.neutralVenueOverrides || !config.neutralVenueOverrides.enabled || !config.neutralVenueOverrides.matches) {
                return null;
            }

            const fixtureDate = fixture.date; // Format: "YYYY-MM-DD"
            const overrides = config.neutralVenueOverrides.matches;

            if (config.debug) {
                console.log(`[TIER 0] Scanning ${overrides.length} override(s) for match to ${fixture.date} vs ${opponent}...`);
            }

            // Find a matching override by date and opponent
            for (const override of overrides) {
                const dateMatch = override.date === fixtureDate;
                const opponentMatch = opponent.toLowerCase().includes(override.opponent.toLowerCase()) ||
                                     override.opponent.toLowerCase().includes(opponent.toLowerCase());

                if (config.debug) {
                    console.log(`[TIER 0]   Checking: ${override.date} vs ${override.opponent} → dateMatch: ${dateMatch}, opponentMatch: ${opponentMatch}`);
                }

                if (dateMatch && opponentMatch) {
                    if (config.debug) {
                        console.log(`✅ [TIER 0] Found match for ${fixtureDate} vs ${opponent}: "${override.venue}"`);
                    }

                    // Try to resolve venue (checks neutral venues first, then CSV/hardcoded)
                    // Pass override.venue as both search term AND display name
                    try {
                        const venueFromCsv = await this.getVenueCoordinates(override.venue, override.venue);
                        if (venueFromCsv && venueFromCsv.latitude && venueFromCsv.longitude) {
                            if (config.debug) {
                                // Check if venue came from neutral venues (try both exact and partial match)
                                let fromNeutral = this.neutralVenues.has(override.venue.toLowerCase());
                                if (!fromNeutral) {
                                    // Check partial matches
                                    const searchWords = override.venue.toLowerCase().split(/\s+/);
                                    for (const key of this.neutralVenues.keys()) {
                                        if (searchWords.some(word => key.includes(word) || word.includes(key))) {
                                            fromNeutral = true;
                                            break;
                                        }
                                    }
                                }
                                const source = fromNeutral ? "Neutral Venues" : "CSV/Hardcoded";
                                console.log(`[neutralVenueOverride] ✓ Resolved from ${source}: "${venueFromCsv.stadiumName}" (${venueFromCsv.latitude}, ${venueFromCsv.longitude}), Postcode: ${venueFromCsv.postCode}`);
                            }
                            return venueFromCsv;
                        } else if (venueFromCsv) {
                            if (config.debug) {
                                console.log(`[neutralVenueOverride] Warning: Venue data found but missing coordinates. Data:`, venueFromCsv);
                            }
                        }
                    } catch (e) {
                        if (config.debug) {
                            console.log(`[neutralVenueOverride] Not found in CSV, checking hardcoded coordinates: ${e.message}`);
                        }
                    }

                    // If not in CSV, check if hardcoded coordinates are provided
                    if (override.latitude !== undefined && override.longitude !== undefined) {
                        if (config.debug) {
                            console.log(`[neutralVenueOverride] Using hardcoded coordinates for ${override.venue}: (${override.latitude}, ${override.longitude})`);
                        }
                        return {
                            name: override.venue,
                            latitude: override.latitude,
                            longitude: override.longitude,
                            team: override.team || "N/A",
                            postCode: override.postCode || "N/A"
                        };
                    }

                    // Venue name provided but not found anywhere - use generic coordinates or log warning
                    console.warn(`[neutralVenueOverride] ⚠️  Venue "${override.venue}" not found in CSV and no hardcoded coordinates provided`);
                    console.warn(`[neutralVenueOverride] To fix, add hardcoded coordinates to config: { date: "${fixtureDate}", opponent: "${opponent}", venue: "${override.venue}", latitude: XX.XXX, longitude: -X.XXX }`);
                    return null;
                }
            }

            // No matching override found
            return null;
        } catch (err) {
            console.warn(`[neutralVenueOverride] Error checking overrides:`, err.message);
            return null;
        }
    },

    // Check if fixture should be played at Hampden Park
    isHampdenParkFixture: async function(competition, fixture) {
        try {
            const comp = competition.toLowerCase();
            
            // Scottish Cup and League Cup semi-finals and finals are at Hampden
            const isCupCompetition = comp.includes('scottish cup') || 
                                    comp.includes('scottish fa cup') || 
                                    comp.includes('league cup') || 
                                    comp.includes('scottish league cup');
            
            if (!isCupCompetition) {
                return false;
            }
            
            // ===== TIER 1: Check round information from fixture data =====
            const round = (fixture.round || "").toLowerCase();
            const fixtureText = (fixture.opponent || "").toLowerCase();
            const competitionText = comp;
            
            const isSemiFinal = round.includes('semi-final') || 
                               round.includes('semi') ||
                               competitionText.includes('semi') || 
                               fixtureText.includes('semi');
                               
            const isFinal = (round.includes('final') && !round.includes('semi')) ||
                           (competitionText.includes('final') && !competitionText.includes('semi'));
            
            if (isSemiFinal || isFinal) {
                console.log('🎯 [Hampden] TIER 1 SUCCESS: Round field confirmed semi-final/final');
                return true;
            }
            
            // ===== TIER 2: Cup Schedule Analysis =====
            console.log('🔍 [Hampden] TIER 1 FAILED: Checking Tier 2 (Cup Schedule Analysis)...');
            
            // Determine which cup and which months to check
            const isLeagueCup = comp.includes('league cup');
            const isFACup = comp.includes('scottish fa cup') || (comp.includes('scottish cup') && !isLeagueCup);
            
            if (isLeagueCup || isFACup) {
                const leagueId = isLeagueCup ? '4888' : '4723'; // League Cup or FA Cup
                const checkMonths = isLeagueCup ? [11, 12] : [4, 5]; // Nov-Dec or Apr-May
                const monthNames = isLeagueCup ? 'Nov-Dec' : 'Apr-May';
                
                try {
                    const url = `https://www.thesportsdb.com/league/${leagueId}-${isLeagueCup ? 'scottish-league-cup' : 'scottish-fa-cup'}`;
                    const response = await doFetch(url, {}, 10000);
                    
                    if (!response.ok) {
                        console.log(`⚠️  [Hampden] Tier 2: API returned status ${response.status}`);
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const html = await response.text();
                    const cheerio = require('cheerio');
                    const $ = cheerio.load(html);
                    
                    // Count unique teams scheduled in critical months
                    const teamsInPeriod = new Set();
                    
                    // Look for match information in the page
                    $('tr').each((i, row) => {
                        const rowText = $(row).text();
                        const cells = $(row).find('td');
                        
                        if (cells.length > 0) {
                            // Try to find date in this row
                            let cellDate = '';
                            cells.each((j, cell) => {
                                const text = $(cell).text().trim();
                                if (text.match(/\d{1,2}\s(Nov|Dec|Apr|May)/) || text.match(/\d{4}-\d{2}-\d{2}/)) {
                                    cellDate = text;
                                }
                            });
                            
                            // Check if date matches our target months
                            if (cellDate) {
                                const monthMatch = cellDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
                                if (monthMatch) {
                                    const monthNum = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                                        .indexOf(monthMatch[1].substring(0,3)) + 1;
                                    
                                    if (checkMonths.includes(monthNum)) {
                                        // Extract team names from this row
                                        const teamNames = $(row).find('a').map((k, el) => $(el).text().trim()).get();
                                        teamNames.forEach(team => {
                                            if (team && team.length > 2) teamsInPeriod.add(team);
                                        });
                                    }
                                }
                            }
                        }
                    });
                    
                    console.log(`🔍 [Hampden] Tier 2: Found ${teamsInPeriod.size} unique teams scheduled in ${monthNames}`);
                    
                    // If fewer than 5 teams, it's semi-final/final stage
                    if (teamsInPeriod.size < 5 && teamsInPeriod.size > 0) {
                        console.log('✅ [Hampden] TIER 2 SUCCESS: Only ' + teamsInPeriod.size + ' teams in ' + monthNames + ' - indicates semi-final/final stage');
                        return true;
                    }
                } catch (e) {
                    console.log(`⚠️  [Hampden] Tier 2 failed: ${e.message}`);
                }
            }
            
            // ===== TIER 3: Hampden Events Page Scraping =====
            console.log('🔍 [Hampden] TIER 2 FAILED: Checking Tier 3 (Hampden Events Page)...');
            
            try {
                const hampdenUrl = 'https://www.hampdenpark.co.uk/whats-on/upcoming/';
                const response = await doFetch(hampdenUrl, {}, 10000);
                
                if (!response.ok) {
                    console.log(`⚠️  [Hampden] Tier 3: API returned status ${response.status}`);
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const html = await response.text();
                const cheerio = require('cheerio');
                const $ = cheerio.load(html);
                
                // Generate date variations for the fixture (±1 day)
                const fixtureDate = fixture.date; // Format: YYYY-MM-DD
                const dateParts = fixtureDate.split('-');
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]);
                const day = parseInt(dateParts[2]);
                
                const dateVariations = [];
                const baseDate = new Date(year, month - 1, day);
                for (let offset = -1; offset <= 1; offset++) {
                    const d = new Date(baseDate);
                    d.setDate(d.getDate() + offset);
                    dateVariations.push(
                        `${d.getDate()}${d.getMonth() + 1 < 10 ? '0' : ''}${d.getMonth() + 1}`,  // DDMM
                        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,  // YYYY-MM-DD
                        d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) // D MMM
                    );
                }
                
                // Look for Celtic events on Hampden
                const eventTexts = [];
                $('[class*="event"], [class*="match"], [class*="fixture"]').each((i, elem) => {
                    const text = $(elem).text().toLowerCase();
                    eventTexts.push(text);
                });
                
                // Check for Celtic + Hampden or Celtic fixture
                const foundCeltic = eventTexts.some(t => t.includes('celtic'));
                const hampdenText = $('body').text().toLowerCase();
                
                if (foundCeltic && (hampdenText.includes('hampden') || hampdenText.includes('celtic'))) {
                    // Try to match dates
                    const dateMatch = dateVariations.some(dateVar => hampdenText.includes(dateVar.toLowerCase()));
                    
                    if (dateMatch) {
                        console.log('✅ [Hampden] TIER 3 SUCCESS: Found Celtic fixture at Hampden in upcoming events');
                        return true;
                    }
                }
                
                console.log('⚠️  [Hampden] Tier 3: Celtic not found in upcoming Hampden events');
            } catch (e) {
                console.log(`⚠️  [Hampden] Tier 3 failed: ${e.message}`);
            }
            
            // All tiers failed - not a Hampden fixture
            console.log('❌ [Hampden] All tiers failed - fixture is NOT at Hampden Park');
            return false;
            
        } catch (error) {
            console.error('[Hampden] Unexpected error in three-tier check:', error.message);
            // Fail gracefully - return false if anything goes wrong
            return false;
        }
    },

    // Get venue coordinates - search by team name OR stadium name (for neutral venue overrides)
    getVenueCoordinates: async function(teamName, venueName) {
        try {
            const cacheKey = `${teamName}_${venueName || ''}`.toLowerCase();
            const cached = this.venueCache.get(cacheKey);
            
            if (cached) {
                return cached;
            }

            let venue = null;

            // PRIORITY 0: Check neutral venues first (e.g., Hampden Park, Murrayfield)
            // These are ALWAYS available and have highest priority
            if (venueName) {
                const neutralKey = venueName.toLowerCase();
                venue = this.neutralVenues.get(neutralKey);
                
                // If not found by exact key, try partial matching (e.g., "Murrayfield Stadium" → "murrayfield")
                if (!venue) {
                    const searchWords = neutralKey.split(/\s+/);
                    for (const [key, value] of this.neutralVenues.entries()) {
                        // Check if any search word matches the key
                        if (searchWords.some(word => key.includes(word) || word.includes(key))) {
                            venue = value;
                            break;
                        }
                    }
                }
            }
            
            if (venue) {
                const result = {
                    stadiumName: venueName || venue.name,
                    name: venueName || venue.name,
                    latitude: venue.latitude,
                    longitude: venue.longitude,
                    team: venue.team,
                    postCode: venue.postCode || null
                };
                this.venueCache.set(cacheKey, result);
                return result;
            }

            // First, try exact team name match in scottishGrounds
            const teamKey = teamName.toLowerCase();
            venue = this.scottishGrounds.get(teamKey);
            
            // If not found by team name, try alternative team name matching
            if (!venue) {
                for (const [key, value] of this.scottishGrounds.entries()) {
                    if (teamName.toLowerCase().includes(key) || key.includes(teamName.toLowerCase())) {
                        venue = value;
                        break;
                    }
                }
            }

            // If still not found, try matching by stadium name (for neutral venue overrides)
            // Split search term into words and look for partial matches
            if (!venue) {
                const searchTerm = teamName.toLowerCase();
                const searchWords = searchTerm.split(/\s+/); // Split into individual words
                
                for (const [key, value] of this.scottishGrounds.entries()) {
                    if (value.name) {
                        const stadiumNameLower = value.name.toLowerCase();
                        // Check if ANY search word is contained in the stadium name
                        // e.g., searching "Hampden Park" will match "Lesser Hampden" via "hampden"
                        const hasMatch = searchWords.some(word => 
                            word.length > 2 && stadiumNameLower.includes(word)
                        );
                        if (hasMatch) {
                            venue = value;
                            break;
                        }
                    }
                }
            }

            if (venue) {
                const result = {
                    stadiumName: venueName || venue.name,
                    name: venueName || venue.name,
                    latitude: venue.latitude,
                    longitude: venue.longitude,
                    team: venue.team,
                    postCode: venue.postCode || null  // Include postcode from CSV database
                };
                
                this.venueCache.set(cacheKey, result);
                return result;
            }

            // If not found, return null (will show venue name but no routes)
            console.warn(`MMM-MyTeams-DriveToMatch: Venue coordinates not found for ${teamName} at ${venueName || 'unknown venue'}`);
            return {
                stadiumName: venueName || `${teamName} Ground`,
                name: venueName || `${teamName} Ground`,
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
    getRoutes: async function(config) {
        try {
            const timestamp = new Date().toLocaleTimeString('en-GB');
            if (config.debug) {
                console.log(`MMM-MyTeams-DriveToMatch: [${timestamp}] Calculating routes`, {
                    from: `${config.startLat},${config.startLng}`,
                    to: `${config.endLat},${config.endLng}`,
                    maxRoutes: config.maxRoutes,
                    isEuropeanFixture: config.isEuropeanFixture,
                    isAwayMatch: config.isAwayMatch
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
                
                // Build URL with specific routeType
                // Use stored API key from SET_API_KEY notification
                let url = `${baseUrl}/${locations}/json?key=${this.apiTomTomKey}`;
                url += `&routeType=${routeType}`;
                url += `&traffic=true`;
                url += `&instructionsType=text&language=en-GB`;
                
                // Add toll avoidance if configured
                if (config.avoidTolls) {
                    url += `&avoid=tollRoads`;
                    if (config.debug) {
                        console.log(`MMM-MyTeams-DriveToMatch: Toll avoidance enabled`);
                    }
                }
                
                if (config.debug) {
                    console.log(`MMM-MyTeams-DriveToMatch: Fetching ${routeType} route`);
                    console.log("MMM-MyTeams-DriveToMatch: TomTom API URL:", url.replace(this.apiTomTomKey, 'API_KEY_HIDDEN'));
                }
                
                try {
                    const response = await doFetch(url, {}, config.timeout || 15000);
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
        const bridges = [
            { name: 'Queensferry Crossing', lat: 56.0009, lng: -3.4047, radius: 0.5 },
            { name: 'Forth Road Bridge', lat: 56.0020, lng: -3.4080, radius: 0.5 },
            { name: 'Forth Bridge', lat: 56.0000, lng: -3.3886, radius: 0.5 },
            { name: 'Erskine Bridge', lat: 55.9247, lng: -4.4503, radius: 0.5 },
            { name: 'Kingston Bridge', lat: 55.8575, lng: -4.2789, radius: 0.3 },
            { name: 'Kincardine Bridge', lat: 56.0608, lng: -3.7258, radius: 0.5 },
            { name: 'Clackmannanshire Bridge', lat: 56.0847, lng: -3.7147, radius: 0.5 },
            { name: 'Tay Road Bridge', lat: 56.4500, lng: -2.9667, radius: 0.5 },
            { name: 'Clyde Arc', lat: 55.8597, lng: -4.2894, radius: 0.2 },
            { name: 'Squinty Bridge', lat: 55.8597, lng: -4.2894, radius: 0.2 },
            { name: 'Clyde Bridge', lat: 55.8444, lng: -4.2506, radius: 0.2 },
            { name: 'Dalmarnock Bridge', lat: 55.8444, lng: -4.2000, radius: 0.2 },
            { name: 'Rutherglen Bridge', lat: 55.8333, lng: -4.2167, radius: 0.2 },
            { name: 'King George V Bridge', lat: 55.8500, lng: -4.2500, radius: 0.2 },
            { name: 'Skye Bridge', lat: 57.2733, lng: -5.7311, radius: 0.5 },
            { name: 'Connel Bridge', lat: 56.4500, lng: -5.3833, radius: 0.3 },
            { name: 'Ballachulish Bridge', lat: 56.6833, lng: -5.1833, radius: 0.3 },
            { name: 'Cromarty Bridge', lat: 57.6833, lng: -4.0333, radius: 0.5 },
            { name: 'Dornoch Firth Bridge', lat: 57.8833, lng: -4.0333, radius: 0.5 },
            { name: 'Friarton Bridge', lat: 56.3833, lng: -3.4000, radius: 0.3 }
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
                    { keywords: ['dover', 'calais'], name: 'Dover-Calais Ferry', operator: 'P&O/DFDS', duration: 90 },
                    { keywords: ['dover', 'dunkirk', 'dunkerque'], name: 'Dover-Dunkirk Ferry', operator: 'DFDS', duration: 120 },
                    { keywords: ['harwich', 'hook of holland', 'hoek van holland'], name: 'Harwich-Hook of Holland Ferry', operator: 'Stena Line', duration: 390 },
                    { keywords: ['hull', 'rotterdam'], name: 'Hull-Rotterdam Ferry', operator: 'P&O', duration: 660 },
                    { keywords: ['hull', 'zeebrugge'], name: 'Hull-Zeebrugge Ferry', operator: 'P&O', duration: 780 },
                    { keywords: ['newcastle', 'amsterdam', 'ijmuiden'], name: 'Newcastle-Amsterdam Ferry', operator: 'DFDS', duration: 960 },
                    { keywords: ['portsmouth', 'caen', 'ouistreham'], name: 'Portsmouth-Caen Ferry', operator: 'Brittany Ferries', duration: 360 },
                    { keywords: ['portsmouth', 'cherbourg'], name: 'Portsmouth-Cherbourg Ferry', operator: 'Brittany Ferries', duration: 180 },
                    { keywords: ['portsmouth', 'st malo', 'saint malo'], name: 'Portsmouth-St Malo Ferry', operator: 'Brittany Ferries', duration: 540 },
                    { keywords: ['portsmouth', 'le havre'], name: 'Portsmouth-Le Havre Ferry', operator: 'Brittany Ferries', duration: 330 },
                    { keywords: ['portsmouth', 'bilbao'], name: 'Portsmouth-Bilbao Ferry', operator: 'Brittany Ferries', duration: 1440 },
                    { keywords: ['portsmouth', 'santander'], name: 'Portsmouth-Santander Ferry', operator: 'Brittany Ferries', duration: 1440 },
                    { keywords: ['newhaven', 'dieppe'], name: 'Newhaven-Dieppe Ferry', operator: 'DFDS', duration: 240 },
                    { keywords: ['plymouth', 'roscoff'], name: 'Plymouth-Roscoff Ferry', operator: 'Brittany Ferries', duration: 360 },
                    { keywords: ['plymouth', 'santander'], name: 'Plymouth-Santander Ferry', operator: 'Brittany Ferries', duration: 1200 },
                    { keywords: ['poole', 'cherbourg'], name: 'Poole-Cherbourg Ferry', operator: 'Brittany Ferries', duration: 270 },
                    { keywords: ['fishguard', 'rosslare'], name: 'Fishguard-Rosslare Ferry', operator: 'Stena Line', duration: 210 },
                    { keywords: ['holyhead', 'dublin'], name: 'Holyhead-Dublin Ferry', operator: 'Irish Ferries/Stena', duration: 195 },
                    { keywords: ['cairnryan', 'larne'], name: 'Cairnryan-Larne Ferry', operator: 'P&O', duration: 120 },
                    { keywords: ['cairnryan', 'belfast'], name: 'Cairnryan-Belfast Ferry', operator: 'Stena Line', duration: 135 }
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
    },

    // Extract IATA/ICAO code from airport name
    // Looks for 3-4 letter codes typically found in airport names like "Copenhagen CPH" or "Airport (ABC)"
    _extractIATACode: function(airportName) {
        if (!airportName) return 'N/A';
        // Try to find 3-4 letter uppercase code in parentheses: "Name (ABC)"
        let match = airportName.match(/\(([A-Z]{3,4})\)/);
        if (match) return match[1];
        // Try to find 3-4 letter uppercase code at end of string after space: "Name ABC"
        match = airportName.match(/\s([A-Z]{3,4})$/);
        if (match) return match[1];
        // Try to find 3-4 letter uppercase code after dash: "Name - ABC"
        match = airportName.match(/[-–]\s*([A-Z]{3,4})\s*$/);
        if (match) return match[1];
        return 'N/A';
    },

    // Fetch airports within 200-mile radius of stadium (Large + Medium only)
    _majorAirports: [
   
        //--------- UNITED KINGDOM -----------------------//
        { name: "London Heathrow", iataCode: "LHR", lat: 51.4700, lon: -0.4543, country: "United Kingdom", city: "London", postCode: "TW6 2GA" },
        { name: "London Gatwick", iataCode: "LGW", lat: 51.1537, lon: -0.1821, country: "United Kingdom", city: "Gatwick", postCode: "RH6 0NP" },
        { name: "London Stansted", iataCode: "STN", lat: 51.8860, lon: 0.2375, country: "United Kingdom", city: "Stansted", postCode: "CM24 1QW" },
        { name: "London Luton", iataCode: "LTN", lat: 51.8745, lon: -0.3658, country: "United Kingdom", city: "Luton", postCode: "LU2 9LY" },
        { name: "London City Airport", iataCode: "LCY", lat: 51.5048, lon: -0.0555, country: "United Kingdom", city: "London", postCode: "E16 1AR" },
        { name: "London Southend", iataCode: "SEN", lat: 51.5720, lon: 0.6947, country: "United Kingdom", city: "Southend-on-Sea", postCode: "SS7 1AP" },
        { name: "Manchester Airport", iataCode: "MAN", lat: 53.3635, lon: -2.2743, country: "United Kingdom", city: "Manchester", postCode: "M90 1QX" },
        { name: "Birmingham Airport", iataCode: "BHX", lat: 52.4539, lon: -1.7476, country: "United Kingdom", city: "Birmingham", postCode: "B26 3QJ" },
        { name: "Glasgow Airport", iataCode: "GLA", lat: 55.8642, lon: -4.4330, country: "United Kingdom", city: "Glasgow", postCode: "PA3 2ST" },
        { name: "Edinburgh Airport", iataCode: "EDI", lat: 55.9500, lon: -3.3724, country: "United Kingdom", city: "Edinburgh", postCode: "EH12 9DN" },
        { name: "Liverpool Airport", iataCode: "LPL", lat: 53.3874, lon: -2.8408, country: "United Kingdom", city: "Liverpool", postCode: "L24 1YD" },
        { name: "Leeds Bradford", iataCode: "LBA", lat: 53.8675, lon: -1.6604, country: "United Kingdom", city: "Leeds", postCode: "LS19 7TU" },
        { name: "Newcastle Airport", iataCode: "NCL", lat: 55.0375, lon: -1.6919, country: "United Kingdom", city: "Newcastle", postCode: "NE13 8BT" },
        { name: "Bristol Airport", iataCode: "BRS", lat: 51.3857, lon: -2.7185, country: "United Kingdom", city: "Bristol", postCode: "BS48 3DY" },
        { name: "Southampton Airport", iataCode: "SOU", lat: 50.9502, lon: -1.3572, country: "United Kingdom", city: "Southampton", postCode: "SO18 2NL" },
        { name: "Belfast International", iataCode: "BFS", lat: 54.6575, lon: -6.2159, country: "United Kingdom", city: "Belfast", postCode: "BT29 4AB" },
        { name: "Belfast City Airport", iataCode: "BHD", lat: 54.6181, lon: -5.8725, country: "United Kingdom", city: "Belfast", postCode: "BT3 9JH" },
        { name: "East Midlands Airport", iataCode: "EMA", lat: 52.8236, lon: -1.3281, country: "United Kingdom", city: "Nottingham", postCode: "DE74 2SA" },
        { name: "Prestwick Airport", iataCode: "PIK", lat: 55.5086, lon: -4.5869, country: "United Kingdom", city: "Ayrshire", postCode: "KA9 2PG" },
        { name: "Aberdeen Airport", iataCode: "ABZ", lat: 57.2019, lon: -2.1979, country: "United Kingdom", city: "Aberdeen", postCode: "AB21 7DU" },
        
        //--------- IRELAND -----------------------//
        { name: "Dublin Airport", iataCode: "DUB", lat: 53.4264, lon: -6.2499, country: "Ireland", city: "Dublin", postCode: "D17 C47W" },
        { name: "Cork Airport", iataCode: "ORK", lat: 51.8413, lon: -8.4931, country: "Ireland", city: "Cork", postCode: "T12 X2C2" },
        { name: "Shannon Airport", iataCode: "SNN", lat: 52.7022, lon: -8.9244, country: "Ireland", city: "Limerick", postCode: "V94 6PW" },
        
        //--------- FRANCE -----------------------//
        { name: "Paris Charles de Gaulle", iataCode: "CDG", lat: 49.0097, lon: 2.5479, country: "France", city: "Paris", postCode: "95700" },
        { name: "Paris Orly", iataCode: "ORY", lat: 48.7233, lon: 2.3792, country: "France", city: "Paris", postCode: "94390" },
        { name: "Paris Beauvais", iataCode: "BVA", lat: 49.4544, lon: 2.5829, country: "France", city: "Beauvais", postCode: "60000" },
        { name: "Lyon-Saint Exupéry", iataCode: "LYS", lat: 45.7261, lon: 5.0914, country: "France", city: "Lyon", postCode: "69125" },
        { name: "Marseille", iataCode: "MRS", lat: 43.4394, lon: 5.2147, country: "France", city: "Marseille", postCode: "13700" },
        { name: "Nice Côte d'Azur", iataCode: "NCE", lat: 43.6584, lon: 7.2158, country: "France", city: "Nice", postCode: "06206" },
        { name: "Toulouse", iataCode: "TLS", lat: 43.6294, lon: 1.3633, country: "France", city: "Toulouse", postCode: "31000" },
        { name: "Nantes", iataCode: "NTE", lat: 47.1585, lon: -1.6040, country: "France", city: "Nantes", postCode: "44340" },
        { name: "Bordeaux", iataCode: "BOD", lat: 44.8283, lon: -0.6155, country: "France", city: "Bordeaux", postCode: "33700" },
        { name: "Strasbourg Airport", iataCode: "SXB", lat: 48.5384, lon: 7.6279, country: "France", city: "Strasbourg", postCode: "67960" },
        { name: "Montpellier Airport", iataCode: "MPL", lat: 43.5761, lon: 3.9629, country: "France", city: "Montpellier", postCode: "34130" },
        { name: "Grenoble Airport", iataCode: "GNB", lat: 45.3589, lon: 5.3342, country: "France", city: "Grenoble", postCode: "38700" },
        { name: "Biarritz Airport", iataCode: "BIQ", lat: 43.4534, lon: -1.5298, country: "France", city: "Biarritz", postCode: "64200" },
        
        //--------- NETHERLANDS -----------------------//
        { name: "Amsterdam Schiphol", iataCode: "AMS", lat: 52.3086, lon: 4.7639, country: "Netherlands", city: "Amsterdam", postCode: "1118" },
        { name: "Rotterdam Airport", iataCode: "RTM", lat: 51.9562, lon: 4.4432, country: "Netherlands", city: "Rotterdam", postCode: "3045" },
        { name: "Eindhoven Airport", iataCode: "EIN", lat: 51.4504, lon: 5.3754, country: "Netherlands", city: "Eindhoven", postCode: "5657" },
        { name: "Groningen Airport", iataCode: "GRQ", lat: 53.1196, lon: 6.5797, country: "Netherlands", city: "Groningen", postCode: "9730" },
        
        //--------- GERMANY -----------------------//
        { name: "Frankfurt am Main", iataCode: "FRA", lat: 50.0379, lon: 8.5622, country: "Germany", city: "Frankfurt", postCode: "60547" },
        { name: "Munich Franz Josef Strauss", iataCode: "MUC", lat: 48.3538, lon: 11.7861, country: "Germany", city: "Munich", postCode: "85356" },
        { name: "Berlin Brandenburg", iataCode: "BER", lat: 52.3667, lon: 13.5019, country: "Germany", city: "Berlin", postCode: "12521" },
        { name: "Hamburg Airport", iataCode: "HAM", lat: 53.6304, lon: 9.9914, country: "Germany", city: "Hamburg", postCode: "22335" },
        { name: "Düsseldorf", iataCode: "DUS", lat: 51.2895, lon: 6.7671, country: "Germany", city: "Düsseldorf", postCode: "40474" },
        { name: "Cologne/Bonn", iataCode: "CGN", lat: 50.8659, lon: 6.8744, country: "Germany", city: "Cologne", postCode: "51147" },
        { name: "Stuttgart Airport", iataCode: "STR", lat: 48.6891, lon: 9.2210, country: "Germany", city: "Stuttgart", postCode: "70629" },
        { name: "Hanover Airport", iataCode: "HAJ", lat: 52.4614, lon: 9.6900, country: "Germany", city: "Hanover", postCode: "30855" },
        { name: "Nuremberg", iataCode: "NUE", lat: 49.4992, lon: 11.0748, country: "Germany", city: "Nuremberg", postCode: "90411" },
        { name: "Dortmund Airport", iataCode: "DTM", lat: 51.5136, lon: 7.6161, country: "Germany", city: "Dortmund", postCode: "44319" },
        { name: "Düsseldorf Weeze", iataCode: "NRN", lat: 51.4025, lon: 6.0819, country: "Germany", city: "Weeze", postCode: "47652" },
        { name: "Memmingen Airport", iataCode: "MEM", lat: 47.9855, lon: 10.2289, country: "Germany", city: "Memmingen", postCode: "87766" },
        { name: "Friedrichshafen Airport", iataCode: "FKB", lat: 47.6686, lon: 9.5145, country: "Germany", city: "Friedrichshafen", postCode: "88046" },
        { name: "Leipzig/Halle Airport", iataCode: "LEJ", lat: 51.4186, lon: 12.2217, country: "Germany", city: "Leipzig", postCode: "04435" },
        { name: "Dresden Airport", iataCode: "DRS", lat: 51.1310, lon: 13.7870, country: "Germany", city: "Dresden", postCode: "01109" },
        
        //--------- SPAIN -----------------------//
        { name: "Madrid-Barajas", iataCode: "MAD", lat: 40.4719, lon: -3.6309, country: "Spain", city: "Madrid", postCode: "28042" },
        { name: "Barcelona El Prat", iataCode: "BCN", lat: 41.2974, lon: 2.0833, country: "Spain", city: "Barcelona", postCode: "08820" },
        { name: "Málaga-Costa del Sol", iataCode: "AGP", lat: 36.6749, lon: -3.7584, country: "Spain", city: "Málaga", postCode: "29130" },
        { name: "Valencia", iataCode: "VLC", lat: 39.4897, lon: -0.4814, country: "Spain", city: "Valencia", postCode: "46940" },
        { name: "Bilbao Airport", iataCode: "BIO", lat: 43.3006, lon: -2.9106, country: "Spain", city: "Bilbao", postCode: "48500" },
        { name: "Seville Airport", iataCode: "SVQ", lat: 37.4180, lon: -5.8896, country: "Spain", city: "Seville", postCode: "41020" },
        { name: "Alicante", iataCode: "ALC", lat: 38.2822, lon: -0.5544, country: "Spain", city: "Alicante", postCode: "03540" },
        { name: "Palma de Mallorca", iataCode: "PMI", lat: 39.5517, lon: 2.7397, country: "Spain", city: "Palma", postCode: "07610" },
        { name: "Ibiza Airport", iataCode: "IBZ", lat: 38.8728, lon: 1.3730, country: "Spain", city: "Ibiza", postCode: "07800" },
        { name: "Zaragoza Airport", iataCode: "ZAZ", lat: 41.6663, lon: -1.0420, country: "Spain", city: "Zaragoza", postCode: "50012" },
        { name: "Reus Airport", iataCode: "REU", lat: 41.1524, lon: 1.1704, country: "Spain", city: "Reus", postCode: "43204" },
        
        //--------- ITALY -----------------------//
        { name: "Rome Fiumicino", iataCode: "FCO", lat: 41.8002, lon: 12.2388, country: "Italy", city: "Rome", postCode: "00054" },
        { name: "Milan Malpensa", iataCode: "MXP", lat: 45.6306, lon: 8.7281, country: "Italy", city: "Milan", postCode: "21010" },
        { name: "Rome Ciampino", iataCode: "CIA", lat: 41.7994, lon: 12.5949, country: "Italy", city: "Rome", postCode: "00040" },
        { name: "Milan Linate", iataCode: "LIN", lat: 45.4627, lon: 9.2711, country: "Italy", city: "Milan", postCode: "20090" },
        { name: "Venice Marco Polo", iataCode: "VCE", lat: 45.5050, lon: 12.3519, country: "Italy", city: "Venice", postCode: "30192" },
        { name: "Bergamo Orio al Serio", iataCode: "BGY", lat: 45.6730, lon: 9.7007, country: "Italy", city: "Bergamo", postCode: "24050" },
        { name: "Florence", iataCode: "FLR", lat: 43.8093, lon: 11.2050, country: "Italy", city: "Florence", postCode: "50012" },
        { name: "Naples", iataCode: "NAP", lat: 40.8861, lon: 14.2910, country: "Italy", city: "Naples", postCode: "80144" },
        { name: "Palermo Airport", iataCode: "PMO", lat: 38.1759, lon: 13.0913, country: "Italy", city: "Palermo", postCode: "90100" },
        { name: "Catania Airport", iataCode: "CTA", lat: 37.4667, lon: 15.0694, country: "Italy", city: "Catania", postCode: "95100" },
        { name: "Pisa Airport", iataCode: "PSA", lat: 43.6839, lon: 10.3927, country: "Italy", city: "Pisa", postCode: "56121" },
        { name: "Bologna Airport", iataCode: "BLQ", lat: 44.5347, lon: 11.2889, country: "Italy", city: "Bologna", postCode: "40132" },
        { name: "Venice Treviso Airport", iataCode: "TSF", lat: 45.6481, lon: 12.1964, country: "Italy", city: "Treviso", postCode: "31100" },
        { name: "Verona Airport", iataCode: "VRN", lat: 45.3955, lon: 10.8886, country: "Italy", city: "Verona", postCode: "37014" },
        { name: "Genova Airport", iataCode: "GOA", lat: 44.4128, lon: 8.8340, country: "Italy", city: "Genoa", postCode: "16154" },
        
        //--------- AUSTRIA -----------------------//
        { name: "Vienna International", iataCode: "VIE", lat: 48.1202, lon: 16.5833, country: "Austria", city: "Vienna", postCode: "1300" },
        
        //--------- BELGIUM -----------------------//
        { name: "Brussels-Zaventem", iataCode: "BRU", lat: 50.9013, lon: 4.4844, country: "Belgium", city: "Brussels", postCode: "1930" },
        { name: "Brussels Charleroi", iataCode: "CRL", lat: 50.4517, lon: 4.4541, country: "Belgium", city: "Charleroi", postCode: "6001" },
        
        //--------- SWITZERLAND -----------------------//
        { name: "Zurich Airport", iataCode: "ZRH", lat: 47.4582, lon: 8.5495, country: "Switzerland", city: "Zurich", postCode: "8058" },
        { name: "Geneva Airport", iataCode: "GVA", lat: 46.2381, lon: 6.1093, country: "Switzerland", city: "Geneva", postCode: "1200" },
        { name: "Basel/Mulhouse", iataCode: "BSL", lat: 47.5956, lon: 7.5296, country: "Switzerland", city: "Basel", postCode: "4056" },
        
        //--------- CZECH REPUBLIC -----------------------//
        { name: "Prague Václav Havel", iataCode: "PRG", lat: 50.0008, lon: 14.2678, country: "Czech Republic", city: "Prague", postCode: "160 00" },
        { name: "Brno Airport", iataCode: "BRQ", lat: 49.1500, lon: 16.6885, country: "Czech Republic", city: "Brno", postCode: "62000" },
        
        //--------- HUNGARY -----------------------//
        { name: "Budapest Ferenc Liszt", iataCode: "BUD", lat: 47.4367, lon: 19.2458, country: "Hungary", city: "Budapest", postCode: "1675" },
        
        //--------- POLAND -----------------------//
        { name: "Warsaw Chopin", iataCode: "WAW", lat: 52.1656, lon: 21.0214, country: "Poland", city: "Warsaw", postCode: "00-906" },
        { name: "Krakow John Paul II", iataCode: "KRK", lat: 50.0794, lon: 19.7794, country: "Poland", city: "Kraków", postCode: "32-083" },
        { name: "Wroclaw Airport", iataCode: "WRO", lat: 51.1011, lon: 16.8855, country: "Poland", city: "Wroclaw", postCode: "54254" },
        { name: "Gdansk Lech Walesa", iataCode: "GDN", lat: 54.3755, lon: 18.4467, country: "Poland", city: "Gdansk", postCode: "80299" },
        { name: "Katowice Airport", iataCode: "KTW", lat: 50.2747, lon: 19.0800, country: "Poland", city: "Katowice", postCode: "40150" },
        
        //--------- SLOVAKIA -----------------------//
        { name: "Bratislava Airport", iataCode: "BTS", lat: 48.1694, lon: 17.2072, country: "Slovakia", city: "Bratislava", postCode: "02100" },
        
        //--------- ROMANIA -----------------------//
        { name: "Bucharest Otopeni", iataCode: "OTP", lat: 44.5715, lon: 26.0840, country: "Romania", city: "Bucharest", postCode: "077106" },
        
        //--------- BULGARIA -----------------------//
        { name: "Sofia Airport", iataCode: "SOF", lat: 42.6977, lon: 23.4117, country: "Bulgaria", city: "Sofia", postCode: "1540" },
        { name: "Burgas Airport", iataCode: "BOJ", lat: 42.5047, lon: 27.5144, country: "Bulgaria", city: "Burgas", postCode: "8000" },
        
        //--------- PORTUGAL -----------------------//
        { name: "Lisbon Portela", iataCode: "LIS", lat: 38.7813, lon: -9.1359, country: "Portugal", city: "Lisbon", postCode: "1700" },
        { name: "Porto Airport", iataCode: "OPO", lat: 41.2409, lon: -8.6716, country: "Portugal", city: "Porto", postCode: "4470" },
        { name: "Faro Airport", iataCode: "FAO", lat: 37.0144, lon: -7.9743, country: "Portugal", city: "Faro", postCode: "8005" },
        
        //--------- GREECE -----------------------//
        { name: "Athens International", iataCode: "ATH", lat: 37.9364, lon: 23.9445, country: "Greece", city: "Athens", postCode: "19019" },
        { name: "Thessaloniki", iataCode: "SKG", lat: 40.5191, lon: 22.9708, country: "Greece", city: "Thessaloniki", postCode: "55103" },
        
        //--------- DENMARK -----------------------//
        { name: "Copenhagen Airport", iataCode: "CPH", lat: 55.6181, lon: 12.6561, country: "Denmark", city: "Copenhagen", postCode: "2770" },
        { name: "Billund Airport", iataCode: "BLL", lat: 55.7403, lon: 9.1519, country: "Denmark", city: "Billund", postCode: "7190" },
        { name: "Aalborg Airport", iataCode: "AAL", lat: 57.0922, lon: 9.8521, country: "Denmark", city: "Aalborg", postCode: "9400" },
        { name: "Aarhus Airport", iataCode: "AAR", lat: 56.3001, lon: 10.6186, country: "Denmark", city: "Aarhus", postCode: "8260" },
        
        //--------- SWEDEN -----------------------//
        { name: "Stockholm Arlanda", iataCode: "ARN", lat: 59.6519, lon: 17.9289, country: "Sweden", city: "Stockholm", postCode: "19045" },
        { name: "Gothenburg Landvetter", iataCode: "GOT", lat: 57.6627, lon: 12.2799, country: "Sweden", city: "Gothenburg", postCode: "43800" },
        { name: "Malmö Airport", iataCode: "MMX", lat: 55.5289, lon: 13.3698, country: "Sweden", city: "Malmö", postCode: "23145" },
        
        //--------- NORWAY -----------------------//
        { name: "Oslo Airport", iataCode: "OSL", lat: 60.1939, lon: 11.1004, country: "Norway", city: "Oslo", postCode: "2061" },
        { name: "Bergen Airport", iataCode: "BGO", lat: 60.2934, lon: 5.2181, country: "Norway", city: "Bergen", postCode: "5217" },
        { name: "Stavanger Airport", iataCode: "SVG", lat: 58.8853, lon: 5.6378, country: "Norway", city: "Stavanger", postCode: "4055" },
        { name: "Trondheim Airport", iataCode: "TRD", lat: 63.4569, lon: 10.9247, country: "Norway", city: "Trondheim", postCode: "7521" },
        
        //--------- FINLAND -----------------------//
        { name: "Helsinki-Vantaa", iataCode: "HEL", lat: 60.3172, lon: 25.0482, country: "Finland", city: "Helsinki", postCode: "1300" },
        { name: "Turku Airport", iataCode: "TKU", lat: 60.5141, lon: 22.2627, country: "Finland", city: "Turku", postCode: "20100" },
        { name: "Tampere Airport", iataCode: "TMP", lat: 61.4142, lon: 23.6053, country: "Finland", city: "Tampere", postCode: "33100" },
        
        //--------- LATVIA -----------------------//
        { name: "Riga International", iataCode: "RIX", lat: 56.9239, lon: 23.9711, country: "Latvia", city: "Riga", postCode: "1053" },
        
        //--------- LITHUANIA -----------------------//
        { name: "Vilnius Airport", iataCode: "VNO", lat: 54.6341, lon: 25.2867, country: "Lithuania", city: "Vilnius", postCode: "02100" },
        
        //--------- ESTONIA -----------------------//
        { name: "Tallinn Airport", iataCode: "TLL", lat: 59.4133, lon: 24.8328, country: "Estonia", city: "Tallinn", postCode: "12101" },
        
        //--------- CROATIA -----------------------//
        { name: "Split Airport", iataCode: "SPU", lat: 43.2406, lon: 16.4409, country: "Croatia", city: "Split", postCode: "21217" },
        { name: "Rijeka Airport", iataCode: "RJK", lat: 45.2185, lon: 14.5753, country: "Croatia", city: "Rijeka", postCode: "51000" },
        { name: "Dubrovnik Airport", iataCode: "DBV", lat: 42.5623, lon: 18.2684, country: "Croatia", city: "Dubrovnik", postCode: "20000" },
        
        //--------- BOSNIA AND HERZEGOVINA -----------------------//
        { name: "Sarajevo Airport", iataCode: "SJJ", lat: 43.8163, lon: 18.3911, country: "Bosnia and Herzegovina", city: "Sarajevo", postCode: "71000" },
        { name: "Mostar Airport", iataCode: "OMO", lat: 43.2039, lon: 17.8228, country: "Bosnia and Herzegovina", city: "Mostar", postCode: "88000" },
        
        //--------- SERBIA -----------------------//
        { name: "Belgrade Nikola Tesla", iataCode: "BEG", lat: 44.8184, lon: 20.2781, country: "Serbia", city: "Belgrade", postCode: "11000" },
        { name: "Niš Constantine Great", iataCode: "NIS", lat: 43.3437, lon: 21.8458, country: "Serbia", city: "Niš", postCode: "18000" },
        
        //--------- MONTENEGRO -----------------------//
        { name: "Podgorica Airport", iataCode: "TGD", lat: 42.0606, lon: 19.2611, country: "Montenegro", city: "Podgorica", postCode: "81000" },
        { name: "Tivat Airport", iataCode: "TIV", lat: 42.3916, lon: 18.3478, country: "Montenegro", city: "Tivat", postCode: "85320" },
        
        //--------- KOSOVO -----------------------//
        { name: "Pristina Airport", iataCode: "PRN", lat: 42.5722, lon: 21.0279, country: "Kosovo", city: "Pristina", postCode: "10000" },
        
        //--------- NORTH MACEDONIA -----------------------//
        { name: "Skopje Airport", iataCode: "SKP", lat: 41.9156, lon: 21.6283, country: "North Macedonia", city: "Skopje", postCode: "1000" },
        
        //--------- ALBANIA -----------------------//
        { name: "Tirana Nënë Tereza", iataCode: "TIA", lat: 41.4176, lon: 19.7203, country: "Albania", city: "Tirana", postCode: "1000" },
        
        //--------- TURKEY -----------------------//
        { name: "Istanbul Airport", iataCode: "IST", lat: 41.2619, lon: 28.7298, country: "Turkey", city: "Istanbul", postCode: "34830" },
        
        //--------- ISRAEL -----------------------//
        { name: "Tel Aviv Ben Gurion", iataCode: "TLV", lat: 32.0053, lon: 34.7677, country: "Israel", city: "Tel Aviv", postCode: "7015001" },
        
        //--------- UNITED ARAB EMIRATES -----------------------//
        { name: "Dubai International", iataCode: "DXB", lat: 25.2528, lon: 55.3644, country: "United Arab Emirates", city: "Dubai", postCode: "NA" },
        
        //--------- HONG KONG -----------------------//
        { name: "Hong Kong International", iataCode: "HKG", lat: 22.3080, lon: 113.9185, country: "Hong Kong", city: "Hong Kong", postCode: "999077" },
        
        //--------- SINGAPORE -----------------------//
        { name: "Singapore Changi", iataCode: "SIN", lat: 1.3644, lon: 103.9915, country: "Singapore", city: "Singapore", postCode: "18140" },
        
        //--------- JAPAN -----------------------//
        { name: "Tokyo Haneda", iataCode: "HND", lat: 35.5494, lon: 139.7798, country: "Japan", city: "Tokyo", postCode: "144-0041" },
        
        //--------- AUSTRALIA -----------------------//
        { name: "Sydney Kingsford Smith", iataCode: "SYD", lat: -33.9461, lon: 151.1772, country: "Australia", city: "Sydney", postCode: "2020" },
        { name: "Melbourne Airport", iataCode: "MEL", lat: -37.6733, lon: 144.8433, country: "Australia", city: "Melbourne", postCode: "3045" },
        
        //--------- CANADA -----------------------//
        { name: "Toronto Pearson", iataCode: "YYZ", lat: 43.6777, lon: -79.6248, country: "Canada", city: "Toronto", postCode: "M1P 2V6" },
        
        //--------- UNITED STATES -----------------------//
        { name: "New York JFK", iataCode: "JFK", lat: 40.6413, lon: -73.7781, country: "United States", city: "New York", postCode: "11430" },
        { name: "Los Angeles International", iataCode: "LAX", lat: 33.9425, lon: -118.4081, country: "United States", city: "Los Angeles", postCode: "90045" },
        { name: "San Francisco International", iataCode: "SFO", lat: 37.6213, lon: -122.3790, country: "United States", city: "San Francisco", postCode: "94128" },
        
        //--------- MEXICO -----------------------//
        { name: "Mexico City International", iataCode: "MEX", lat: 19.4326, lon: -99.0730, country: "Mexico", city: "Mexico City", postCode: "15620" },
        
        //--------- BRAZIL -----------------------//
        { name: "São Paulo Guarulhos", iataCode: "GIG", lat: -22.8129, lon: -43.2431, country: "Brazil", city: "Rio de Janeiro", postCode: "20000" },
        
        //--------- ARGENTINA -----------------------//
        { name: "Buenos Aires Ezeiza", iataCode: "EZE", lat: -34.8222, lon: -58.5358, country: "Argentina", city: "Buenos Aires", postCode: "1802" },
        
        //--------- EGYPT -----------------------//
        { name: "Cairo International", iataCode: "CAI", lat: 30.1219, lon: 31.4056, country: "Egypt", city: "Cairo", postCode: "11518" },
        
        //--------- SOUTH AFRICA -----------------------//
        { name: "Johannesburg OR Tambo", iataCode: "JNB", lat: -26.1367, lon: 28.2411, country: "South Africa", city: "Johannesburg", postCode: "1627" }

    ],

    _calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 3959;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    getAirportsInfo: async function(config) {
        try {
            console.log(`[MMM-MyTeams-DriveToMatch] *** getAirportsInfo called with config:`, config);

            // Extract venue coordinates from config.venue (sent by frontend)
            if (!config.venue || typeof config.venue.latitude !== 'number' || typeof config.venue.longitude !== 'number') {
                throw new Error("Stadium coordinates required");
            }

            const { latitude, longitude } = config.venue;
            const airportSearchRadiusMeters = config.airportSearchRadiusMeters ?? 322000;
            const maxRadiusMiles = airportSearchRadiusMeters / 1609.344;
            
            console.log(`[MMM-MyTeams-DriveToMatch] Searching major airports within ${airportSearchRadiusMeters}m (${maxRadiusMiles.toFixed(2)} miles) of ${config.venue.name} (${latitude}, ${longitude})`);


            const airports = this._majorAirports
                .map(airport => ({
                    name: airport.name,
                    iataCode: airport.iataCode,
                    latitude: airport.lat,
                    longitude: airport.lon,
                    country: airport.country || "Unknown",
                    city: airport.city || "Unknown",
                    postCode: airport.postCode || "N/A",
                    distance: this._calculateDistance(latitude, longitude, airport.lat, airport.lon)
                }))
                .filter(airport => airport.distance <= maxRadiusMiles)
                .sort((a, b) => {
                    if (a.country !== b.country) return a.country.localeCompare(b.country);
                    return a.distance - b.distance;
                });

                console.log(`[MMM-MyTeams-DriveToMatch] ✓ Found ${airports.length} major airports within ${airportSearchRadiusMeters}m (${maxRadiusMiles.toFixed(2)} miles)`);

            if (airports.length > 0) {
                airports.slice(0, 5).forEach((a, idx) => {
                    console.log(`  ${idx + 1}. ${a.name} (${a.iataCode}) - ${a.distance.toFixed(1)} miles away`);
                });
            }

            console.log(`[MMM-MyTeams-DriveToMatch] Sending AIRPORTS_INFO notification with ${airports.length} airports`);
            
            // Send back to frontend with AIRPORTS_INFO notification (matches frontend expectation)
            this.sendSocketNotification("AIRPORTS_INFO", {
                instanceId: config.instanceId,
                airports: airports,
                venue: config.venue,
                opponent: config.opponent,
                date: config.date,
                fetchedAt: new Date().toISOString()
            });
            
            console.log(`[MMM-MyTeams-DriveToMatch] AIRPORTS_INFO notification sent`);
            
            if (airports.length > 0) {
                const html = this._generateAirportsHTML({
                    airports: airports,
                    venue: config.venue,
                    opponent: config.opponent,
                    date: config.date,
                    airportSearchRadiusMeters: airportSearchRadiusMeters
                });
                
                this.sendSocketNotification("SAVE_AIRPORTS_SHEET", {
                    instanceId: config.instanceId,
                    html: html,
                    venueName: config.venue.name,
                    opponent: config.opponent,
                    date: config.date
                });
            }

        } catch (error) {
            console.error("[MMM-MyTeams-DriveToMatch] Error fetching airports:", error.message);
            this.sendSocketNotification("AIRPORTS_INFO_ERROR", {
                instanceId: config.instanceId,
                message: error.message
            });
        }
    },

    _generateAirportsHTML: function(data) {
        const { airports, venue, opponent, date } = data;
        const maxRadius = 200;
        
        let airportsTable = "<tbody>";
        let currentCountry = "";
        let rowNum = 1;
        
        for (const airport of airports) {
            if (airport.distance > maxRadius) continue;
            
            if (airport.country !== currentCountry) {
                if (currentCountry !== "") {
                    airportsTable += "</tbody></table>";
                }
                currentCountry = airport.country;
                airportsTable += `<h3 style="margin-top: 25px; margin-bottom: 10px; color: #008B8B; border-bottom: 2px solid #008B8B; padding-bottom: 5px;">🌍 ${currentCountry}</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #20B2AA; color: white;">
                        <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">#</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Airport</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">IATA</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">City</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Postal Code</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Distance</th>
                    </tr>
                </thead>
                <tbody>`;
                rowNum = 1;
            }
            
            airportsTable += `<tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px; font-size: 14px;">${rowNum}</td>
                <td style="padding: 12px; font-size: 14px;">${airport.name}</td>
                <td style="padding: 12px; font-size: 14px;"><strong>${airport.iataCode}</strong></td>
                <td style="padding: 12px; font-size: 14px;">${airport.city || "N/A"}</td>
                <td style="padding: 12px; font-size: 14px;">${airport.postCode || "N/A"}</td>
                <td style="padding: 12px; font-size: 14px;">${airport.distance.toFixed(1)} mi</td>
            </tr>`;
            rowNum++;
        }
        
        if (currentCountry !== "") {
            airportsTable += "</tbody></table>";
        }
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>International Airports - ${opponent}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Roboto', Arial, sans-serif; background: #f5f5f5; color: #333; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #008B8B, #20B2AA); color: white; padding: 25px; text-align: center; }
        .header h1 { margin-bottom: 10px; font-size: 32px; }
        .header p { font-size: 16px; opacity: 0.95; margin: 3px 0; }
        .toolbar { padding: 15px 25px; background: #f9f9f9; border-bottom: 1px solid #ddd; display: flex; justify-content: flex-end; gap: 10px; }
        .print-btn { background: #008B8B; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; transition: background 0.3s; }
        .print-btn:hover { background: #006666; }
        @media print { .toolbar { display: none; } body { padding: 0; background: white; } .container { box-shadow: none; } }
        .content { padding: 25px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
        .info-card { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #008B8B; }
        .info-card h3 { color: #008B8B; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }
        .info-card p { font-size: 16px; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: #008B8B; color: white; padding: 12px; text-align: left; font-weight: bold; font-size: 14px; }
        td { padding: 12px; border-bottom: 1px solid #ddd; font-size: 14px; }
        tr:hover { background: #f5f5f5; }
        h2 { margin: 25px 0 15px 0; color: #008B8B; }
        .footer { background: #f0f0f0; padding: 15px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; }
        @media (max-width: 768px) { .info-grid { grid-template-columns: 1fr; } .toolbar { flex-direction: column; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✈️ International Airports</h1>
            <p>${opponent} vs ${venue.name}</p>
            <p>${date || 'Match Date'}</p>
        </div>
        
        <div class="toolbar">
            <button class="print-btn" onclick="window.print()">🖨️ Print</button>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-card">
                    <h3>📍 Venue</h3>
                    <p>${venue.name}</p>
                </div>
                <div class="info-card">
                    <h3>🏟️ Opponent</h3>
                    <p>${opponent}</p>
                </div>
                <div class="info-card">
                    <h3>✈️ Airports Found</h3>
                    <p>${airports.filter(a => a.distance <= maxRadius).length} within 200 miles</p>
                </div>
            </div>
            
            <h2>📋 Airports by Country (within 200 miles)</h2>
            ${airportsTable}
        </div>
        
        <div class="footer">
            <p>Generated automatically - Please confirm airport operations and flight availability directly with airlines</p>
            <p>Airport data includes major international and regional airports served by budget and full-service carriers</p>
        </div>
    </div>
</body>
</html>`;
        
        return html;
    },

    // Save airports information to HTML report
    saveAirportsSheet: function(payload) {
        try {
            const { instanceId, html, venueName, opponent, date } = payload;
            
            if (!html) {
                throw new Error("No HTML content provided");
            }

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const sanitizedVenue = (venueName || 'airports').replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `airports_${sanitizedVenue}_${timestamp}.html`;
            const filepath = path.join(__dirname, "mySavedRoutes", filename);
            
            // Ensure mySavedRoutes directory exists
            const dirPath = path.join(__dirname, "mySavedRoutes");
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`[MMM-MyTeams-DriveToMatch] Created mySavedRoutes directory`);
            }

            fs.writeFileSync(filepath, html, 'utf8');
            
            console.log(`[MMM-MyTeams-DriveToMatch] ✓ Airports report saved: ${filename}`);
            
            this.sendSocketNotification("AIRPORTS_SHEET_SAVED", {
                instanceId: instanceId,
                filename: filename,
                filepath: filepath
            });

        } catch (error) {
            console.error("[MMM-MyTeams-DriveToMatch] Error saving airports report:", error.message);
            this.sendSocketNotification("AIRPORTS_SHEET_ERROR", {
                instanceId: payload.instanceId,
                message: error.message
            });
        }
    },

    // Fetch parking info within 50km of stadium
    getParkingInfo: async function(config) {
        try {
            console.log(`[MMM-MyTeams-DriveToMatch] *** getParkingInfo called with config:`, config);
            
            if (!this.apiTomTomKey) {
                throw new Error("TomTom API key not configured");
            }

            if (!config.venue || typeof config.venue.latitude !== 'number' || typeof config.venue.longitude !== 'number') {
                throw new Error("Stadium coordinates required");
            }

            const { latitude, longitude } = config.venue;
            
            console.log(`[MMM-MyTeams-DriveToMatch] Fetching parking within 3.2km of ${config.venue.name} (${latitude}, ${longitude})`);

            // Use TomTom Search API to find parking facilities within 2 miles (3.2 km)
            // categorySet: 7313=parking garage, 7369=open parking area
            const url = `https://api.tomtom.com/search/2/nearbySearch/.json` +
                `?key=${encodeURIComponent(this.apiTomTomKey)}` +
                `&lat=${latitude}` +
                `&lon=${longitude}` +
                `&radius=3200` +
                `&categorySet=7313,7369` +
                `&limit=20`;

            console.log(`[MMM-MyTeams-DriveToMatch] Parking API URL: ${url.replace(this.apiTomTomKey, 'REDACTED')}`);

            const response = await doFetch(url, {}, 15000, 2);
            const data = await response.json();
            
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error("Invalid API response structure");
            }
            
            const parking = data.results.map(result => {
                const distanceMeters = result.dist || 0;
                const distanceMiles = distanceMeters * 0.000621371;
                
                return {
                    name: result.poi?.name || result.address?.freeformAddress || "Parking",
                    distance: distanceMiles,
                    latitude: result.position?.lat,
                    longitude: result.position?.lon,
                    address: result.address?.freeformAddress || "",
                    postcode: result.address?.postalCode || "",
                    phone: result.poi?.phone || "",
                    parkingType: result.poi?.classifications?.[0]?.names?.[0]?.nameLocale || "Parking"
                };
            });

            parking.sort((a, b) => a.distance - b.distance);

            console.log(`[MMM-MyTeams-DriveToMatch] ✓ Found ${parking.length} parking locations within 3.2km`);
            
            this.sendSocketNotification("PARKING_INFO", {
                instanceId: config.instanceId,
                parkingSpots: parking,
                opponent: config.opponent || "",
                date: config.date || "",
                matchDate: config.date || "",
                venue: config.venue,
                fetchedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error("[MMM-MyTeams-DriveToMatch] Error fetching parking:", error.message);
            this.sendSocketNotification("PARKING_INFO_ERROR", {
                instanceId: config.instanceId,
                message: error.message
            });
        }
    },

    saveParkingSheet: async function(payload) {
        try {
            const { instanceId, html, venueName } = payload;
            
            if (!html) {
                throw new Error("No HTML content provided");
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const sanitizedVenue = (venueName || 'parking').replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `parking_${sanitizedVenue}_${timestamp}.html`;
            const filepath = path.join(__dirname, "mySavedRoutes", filename);
            
            const dirPath = path.join(__dirname, "mySavedRoutes");
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            fs.writeFileSync(filepath, html, 'utf8');
            
            console.log(`[MMM-MyTeams-DriveToMatch] ✓ Parking report saved: ${filename}`);
            
            this.sendSocketNotification("PARKING_SHEET_SAVED", {
                instanceId: instanceId,
                filename: filename,
                filepath: filepath
            });

        } catch (error) {
            console.error("[MMM-MyTeams-DriveToMatch] Error saving parking report:", error.message);
            this.sendSocketNotification("PARKING_SHEET_ERROR", {
                instanceId: payload.instanceId,
                message: error.message
            });
        }
    },

    // Fetch charging station info within 50km of stadium
    getChargingInfo: async function(config) {
        try {
            console.log(`[MMM-MyTeams-DriveToMatch] *** getChargingInfo called with config:`, config);
            
            if (!this.apiTomTomKey) {
                throw new Error("TomTom API key not configured");
            }

            if (!config.venue || typeof config.venue.latitude !== 'number' || typeof config.venue.longitude !== 'number') {
                throw new Error("Stadium coordinates required");
            }

            const { latitude, longitude } = config.venue;
            
            console.log(`[MMM-MyTeams-DriveToMatch] Fetching EV charging stations within 5km of ${config.venue.name} (${latitude}, ${longitude})`);

            // Use TomTom category 7309 (Electric Vehicle Charging Station) for accurate results
            const url = `https://api.tomtom.com/search/2/nearbySearch/.json` +
                `?key=${encodeURIComponent(this.apiTomTomKey)}` +
                `&lat=${latitude}` +
                `&lon=${longitude}` +
                `&radius=5000` +
                `&categorySet=7309` +
                `&limit=30`;

            console.log(`[MMM-MyTeams-DriveToMatch] Charging API URL: ${url.replace(this.apiTomTomKey, 'REDACTED')}`);

            const response = await doFetch(url, {}, 15000, 2);
            const data = await response.json();
            
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error("Invalid API response structure");
            }
            
            const charging = data.results.map(result => {
                const distanceMeters = result.dist || 0;
                const distanceMiles = distanceMeters * 0.000621371;
                
                return {
                    name: result.poi?.name || result.address?.freeformAddress || "EV Charging Station",
                    distance: distanceMiles,
                    latitude: result.position?.lat,
                    longitude: result.position?.lon,
                    address: result.address?.freeformAddress || "",
                    postcode: result.address?.postalCode || "",
                    phone: result.poi?.phone || "",
                    connectorTypes: result.poi?.classifications?.[0]?.names?.[0]?.nameLocale || "Various",
                    operator: result.poi?.brandName || result.poi?.name?.split(' ').slice(0, 2).join(' ') || "Unknown"
                };
            });

            charging.sort((a, b) => a.distance - b.distance);

            console.log(`[MMM-MyTeams-DriveToMatch] ✓ Found ${charging.length} EV charging stations within 3.2km`);
            
            this.sendSocketNotification("CHARGING_INFO", {
                instanceId: config.instanceId,
                chargingStations: charging,
                opponent: config.opponent || "",
                date: config.date || "",
                venue: config.venue,
                fetchedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error("[MMM-MyTeams-DriveToMatch] Error fetching charging info:", error.message);
            this.sendSocketNotification("CHARGING_INFO_ERROR", {
                instanceId: config.instanceId,
                message: error.message
            });
        }
    },

    saveChargingSheet: async function(payload) {
        try {
            const { instanceId, html, venueName } = payload;
            
            if (!html) {
                throw new Error("No HTML content provided");
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const sanitizedVenue = (venueName || 'charging').replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `charging_${sanitizedVenue}_${timestamp}.html`;
            const filepath = path.join(__dirname, "mySavedRoutes", filename);
            
            const dirPath = path.join(__dirname, "mySavedRoutes");
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            fs.writeFileSync(filepath, html, 'utf8');
            
            console.log(`[MMM-MyTeams-DriveToMatch] ✓ Charging report saved: ${filename}`);
            
            this.sendSocketNotification("CHARGING_SHEET_SAVED", {
                instanceId: instanceId,
                filename: filename,
                filepath: filepath
            });

        } catch (error) {
            console.error("[MMM-MyTeams-DriveToMatch] Error saving charging report:", error.message);
            this.sendSocketNotification("CHARGING_SHEET_ERROR", {
                instanceId: payload.instanceId,
                message: error.message
            });
        }
    },


});
