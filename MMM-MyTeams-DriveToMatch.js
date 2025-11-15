/* MMM-MyTeams-DriveToMatch.js
 * 
 * MagicMirror² Module: MMM-MyTeams-DriveToMatch
 * 
 * Shows two driving routes to your team's next fixture using TomTom API
 * Combines fixture data from TheSportsDB with real-time traffic routing
 * 
 * Author "gitgitaway" with AI assistance
 * MIT Licensed
 */

Module.register("MMM-MyTeams-DriveToMatch", {
   // Default module config
    defaults: {
        // Required settings
        apiTomTomKey: "", // Your TomTom API key
        homeLatitude: 54.8676, // Your home latitude - eg default Cairnryan
        homeLongitude: -4.6399, // Your home longitude - - eg default Cairnryan

        // Team settings
        teamName: "Celtic", // Team name to search for
        teamId: "133647", // TheSportsDB team ID (Celtic FC) - will auto-resolve to 133647 if lect blank
        
        // API settings (matching MMM-MyTeams-Fixtures)
        apiUrl: "https://www.thesportsdb.com/api/v1/json/3",
        season: "auto",
        fallbackSeason: "2025-2026",
        leagueIds: ["4330", "4364", "4363", "4888"],
        uefaLeagueIds: ["4480", "4481", "5071"],
        useSearchEventsFallback: true,
        strictLeagueFiltering: true,
        
        // Shared cache settings
        useSharedFixturesCache: false, // If true, copy fixtures from MMM-MyTeams-Fixtures cache
        
        // Stadium database update settings        // Update intervals
        fixtureUpdateInterval: 24 * 60 * 60 * 1000, // 1 day for fixtures
        routeUpdateInterval: 10 * 60 * 1000, // 10 minutes for routes (reduced from 5 to prevent conflicts)
        
        // Display options
        showDelay: true, // Show traffic delays
        showWaypoints: true, // Show major waypoints
        maxRoutes: 2, // Number of routes to show
        units: "imperial", // "metric" or "imperial"
        
        // Enhanced route features (user-configurable)
        showEurotunnel: true, // Detect and display Eurotunnel crossings
        showFerryDetails: true, // Show ferry operator and crossing time (e.g., "P&O, ~90 min")
        avoidTolls: false, // Avoid toll roads in route calculation
        showFuelCost: true, // Show estimated fuel cost for each route
        fuelEfficiency: 8.0, // Litres per 100km (L/100km) for fuel cost calculation (8.0 L/100km ≈ 35 MPG)
        fuelPricePerLitre: 1.45, // Price per litre in local currency (£1.45 for UK)
        
        // API settings
        requestTimeout: 20000, // Request timeout in ms
        maxRetries: 3, // Max API retries
        
        // Debug
        debug: false,
        dateOverride: null, // Format: "YYYY-MM-DD" to test specific fixture dates (e.g., "2025-10-05")
        
        // Multi-API fixture settings
        useMultiAPIProvider: false, // Enable multi-API fixture fetching (ESPN, BBC Sport, TheSportsDB)
        apiPriority: ["thesportsdb", "espn", "bbcsport"], // API priority order for fallback
        mergeFixtures: false, // Merge fixtures from all sources (true) or use first successful (false)
        
        // Official website fallback settings (for clubs not covered by standard APIs)
        useOfficialWebsiteFallback: false, // Enable fallback to official club website for fixtures
        officialWebsiteFixtureUrl: "", // URL of official club fixture page (e.g., "https://www.celticfc.com/fixtures/")
        
        // Stadium database update settings
        enableStadiumUpdateNotification: true, // Show notification button to trigger stadium updates
        
        // Theme overrides
        darkMode: null,              // null=auto, true=force dark, false=force light
        fontColorOverride: null,     // e.g., "#FFFFFF" to force white text
        borderColorOverride: null,   // e.g., "#FFFFFF" to force white borders
        opacityOverride: null,       // e.g., 1.0 to force full opacity

        // POI Display Options
        hideAirportIfNearby: false,  // Hide airport icon if home location is less than 300 miles from venue
        airportProximityMiles: 300,  // Threshold distance in miles for hiding airport icon

        // ===== NEUTRAL VENUE OVERRIDE =====
        neutralVenueOverrides: {
            enabled: false,
            matches: [
        // Venue in CSV - just use name (coordinates auto-resolved from football_stadiums.csv)
        // { date: "2025-11-02", opponent: "Rangers", venue: "Hampden Park" },

        // Venue NOT in CSV - provide hardcoded coordinates
        
        // Scottish neutral venue example
        /*     { date: "2025-12-02", 
            opponent: "Hearts", 
            venue: "Murrayfield Stadium",
            latitude: 55.9415,
            longitude: -3.2388,
            team: "Edinburgh Rugby",
            postCode: "EH14 8XZ"
            },
        */
      
        // European neutral venue example
       /*     {
            date: "2025-05-15",
            opponent: "Feyenoord",
            venue: "De Kuip",
            latitude: 51.8808,
            longitude: 4.2793,
            team: "Feyenoord",
            postCode: "3077 GC"
            },
         */
        ]
      }
    },

    // Required version
    requiresVersion: "2.1.0",

    // Module variables
    nextFixture: null,
    routes: [],
    loading: true,
    error: null,
    fixtureTimer: null,
    routeTimer: null,
    fixtureLoadTimeout: null,
    retryCount: 0,
    lastRouteUpdate: null,
    instanceId: null,
    routeError: null,

    // Start the module
    start: function() {
        Log.info("Starting module: " + this.name);
        
        // Generate unique instance ID to filter notifications
        this.instanceId = this.identifier + "_" + Date.now();
        
        // SECURITY PATCH: Validate and securely send API key
        if (!this.config.apiTomTomKey || this.config.apiTomTomKey === "YOUR_TOMTOM_API_KEY") {
            Log.warn(this.name + ": ⚠️  API key not configured in module config");
            Log.warn(this.name + ": ℹ️  TomTom API key should be set via TOMTOM_API_KEY environment variable for security");
            Log.warn(this.name + ": ℹ️  Or configure 'apiTomTomKey' in module config (less secure)");
            // Don't error out immediately - may be using environment variable
        } else {
            // SECURITY PATCH: Send API key once at startup via SET_API_KEY notification
            // This prevents API key from being sent with every GET_ROUTES request
            this.sendSocketNotification("SET_API_KEY", {
                apiKey: this.config.apiTomTomKey
            });
            if (this.config.debug) {
                Log.info(this.name + ": API key sent to node helper via SET_API_KEY notification");
            }
        }
        
        if (!this.config.homeLatitude || !this.config.homeLongitude) {
            this.error = this.translate("HOME_COORDS_REQUIRED");
            this.updateDom();
            return;
        }
        
        // Add random delay (0-5 seconds) to stagger initial requests from multiple modules
        const initialDelay = Math.floor(Math.random() * 5000);
        if (this.config.debug) {
            Log.info(this.name + ": Delaying initial fetch by " + initialDelay + "ms to avoid conflicts");
        }
        
        setTimeout(() => {
            this.fetchNextFixture();
            this.scheduleUpdates();
            
            // Add timeout for initial fixture fetch - show error if not received within 30 seconds
            this.fixtureLoadTimeout = setTimeout(() => {
                if (this.loading && !this.nextFixture) {
                    this.error = "Unable to load fixture data - please check configuration";
                    this.loading = false;
                    Log.error(this.name + ": Fixture fetch timeout after 30 seconds");
                    this.updateDom();
                }
            }, 30000);
        }, initialDelay);
    },

    // Schedule periodic updates
    scheduleUpdates: function() {
        // Schedule fixture updates
        if (this.fixtureTimer) {
            clearInterval(this.fixtureTimer);
        }
        this.fixtureTimer = setInterval(() => {
            if (this.config.debug) {
                Log.info(this.name + ": Fixture update timer triggered");
            }
            this.fetchNextFixture();
        }, this.config.fixtureUpdateInterval);

        // Schedule route updates (only if we have a fixture)
        if (this.routeTimer) {
            clearInterval(this.routeTimer);
        }
        this.routeTimer = setInterval(() => {
            if (this.config.debug) {
                Log.info(this.name + ": Route update timer triggered (interval: " + this.config.routeUpdateInterval + "ms)");
            }
            if (this.nextFixture) {
                if (this.config.debug) {
                    Log.info(this.name + ": Fetching updated routes for " + this.nextFixture.opponent);
                }
                this.fetchRoutes();
            } else {
                if (this.config.debug) {
                    Log.warn(this.name + ": Route update skipped - no fixture data available");
                }
            }
        }, this.config.routeUpdateInterval);
        
        if (this.config.debug) {
            Log.info(this.name + ": Scheduled updates - Fixtures every " + (this.config.fixtureUpdateInterval / 1000 / 60) + " minutes, Routes every " + (this.config.routeUpdateInterval / 1000 / 60) + " minutes");
        }
    },

    // Fetch next fixture
    fetchNextFixture: function() {
        if (this.config.debug) {
            Log.info(this.name + ": Fetching next fixture for " + this.config.teamName);
        }
        
        // Use multi-API provider if enabled
        if (this.config.useMultiAPIProvider) {
            this.sendSocketNotification("FETCH_FIXTURES_MULTI_API", {
                instanceId: this.instanceId,
                teamName: this.config.teamName,
                teamId: this.config.teamId,
                dateOverride: this.config.dateOverride,
                debug: this.config.debug,
                apiPriority: this.config.apiPriority,
                mergeFixtures: this.config.mergeFixtures,
                requestTimeout: this.config.requestTimeout,
                // Official website fallback settings
                useOfficialWebsiteFallback: this.config.useOfficialWebsiteFallback,
                officialWebsiteFixtureUrl: this.config.officialWebsiteFixtureUrl,
                // Neutral venue overrides (TIER 0 - highest priority)
                neutralVenueOverrides: this.config.neutralVenueOverrides
            });
        } else {
            // Use standard TheSportsDB API
            this.sendSocketNotification("GET_NEXT_FIXTURE", {
                instanceId: this.instanceId, // Add instance ID for response filtering
                teamName: this.config.teamName,
                teamId: this.config.teamId,
                dateOverride: this.config.dateOverride,
                debug: this.config.debug,
                // Include all API-related config parameters
                apiUrl: this.config.apiUrl,
                season: this.config.season,
                fallbackSeason: this.config.fallbackSeason,
                leagueIds: this.config.leagueIds,
                uefaLeagueIds: this.config.uefaLeagueIds,
                useSearchEventsFallback: this.config.useSearchEventsFallback,
                strictLeagueFiltering: this.config.strictLeagueFiltering,
                requestTimeout: this.config.requestTimeout,
                // Shared cache option
                useSharedFixturesCache: this.config.useSharedFixturesCache,
                // Official website fallback settings
                useOfficialWebsiteFallback: this.config.useOfficialWebsiteFallback,
                officialWebsiteFixtureUrl: this.config.officialWebsiteFixtureUrl,
                // Neutral venue overrides (TIER 0 - highest priority)
                neutralVenueOverrides: this.config.neutralVenueOverrides
            });
        }
    },

    // Fetch routes to venue
    fetchRoutes: function() {
        if (!this.nextFixture || !this.nextFixture.venue) {
            if (this.config.debug) {
                Log.warn(this.name + ": No fixture or venue data for route calculation");
            }
            return;
        }

        // Detect if this is a European fixture
        const competition = this.nextFixture.competition || "";
        const isEuropeanFixture = /uefa|champions|europa|conference/i.test(competition);
        
        // Determine if this is an away match (not at home)
        const isAwayMatch = !this.nextFixture.isHome;

        // Check if venue coordinates are available
        const hasVenueCoordinates = this.nextFixture.venue && 
                                   this.nextFixture.venue.latitude !== null && 
                                   this.nextFixture.venue.longitude !== null;

        if (this.config.debug) {
            Log.info(this.name + ": Fetching routes to " + this.nextFixture.venue.stadiumName);
            Log.info(this.name + ": Route calculation details:", {
                from: "Home (" + this.config.homeLatitude + ", " + this.config.homeLongitude + ")",
                to: this.nextFixture.venue.stadiumName + " (" + this.nextFixture.venue.latitude + ", " + this.nextFixture.venue.longitude + ")",
                fixture: this.nextFixture.homeTeam + " vs " + this.nextFixture.awayTeam,
                isHome: this.nextFixture.isHome,
                isAway: isAwayMatch,
                competition: competition,
                isEuropean: isEuropeanFixture,
                isEuropeanAway: isEuropeanFixture && isAwayMatch,
                hasVenueCoordinates: hasVenueCoordinates
            });
        }

        // Skip route calculation if venue coordinates are not available (e.g., European away games)
        if (!hasVenueCoordinates) {
            if (this.config.debug) {
                Log.warn(this.name + ": Venue coordinates not available for " + this.nextFixture.venue.stadiumName + " - skipping route calculation");
            }
            // Show fixture without routes
            this.routes = null;
            this.routeError = "Venue coordinates not available for " + this.nextFixture.venue.stadiumName;
            this.updateDom(this.config.animationSpeed);
            return;
        }

        const routeData = {
            instanceId: this.instanceId, // Add instance ID for response filtering
            // SECURITY PATCH: API key is no longer included in GET_ROUTES
            // It is configured separately via SET_API_KEY notification
            startLat: this.config.homeLatitude,
            startLng: this.config.homeLongitude,
            endLat: this.nextFixture.venue.latitude,
            endLng: this.nextFixture.venue.longitude,
            maxRoutes: this.config.maxRoutes,
            timeout: this.config.requestTimeout,
            debug: this.config.debug,
            isEuropeanFixture: isEuropeanFixture,
            isAwayMatch: isAwayMatch,  // Pass away match flag to node_helper
            // Enhanced route features
            showEurotunnel: this.config.showEurotunnel,
            showFerryDetails: this.config.showFerryDetails,
            avoidTolls: this.config.avoidTolls,
            showFuelCost: this.config.showFuelCost,
            fuelEfficiency: this.config.fuelEfficiency,
            fuelPricePerLitre: this.config.fuelPricePerLitre,
            units: this.config.units
        };

        this.sendSocketNotification("GET_ROUTES", routeData);
    },

    // Handle socket notifications
    socketNotificationReceived: function(notification, payload) {
        // Filter notifications by instance ID to prevent cross-module interference
        if (payload && payload.instanceId && payload.instanceId !== this.instanceId) {
            // This notification is for a different module instance, ignore it
            return;
        }
        
        if (this.config.debug) {
            Log.info(this.name + ": Received notification: " + notification + " for instance: " + this.instanceId);
        }

        switch (notification) {
            case "FIXTURE_DATA":
                this.handleFixtureData(payload);
                break;
            case "FIXTURE_ERROR":
                this.handleFixtureError(payload);
                break;
            case "ROUTES_DATA":
                this.handleRoutesData(payload);
                break;
            case "ROUTES_ERROR":
                this.handleRoutesError(payload);
                break;
            case "ROUTE_SAVED":
                this.handleRouteSaved(payload);
                break;
            case "ROUTE_SAVE_ERROR":
                this.handleRouteSaveError(payload);
                break;
            case "PARKING_INFO":
                this.handleParkingInfo(payload);
                break;
            case "PARKING_SHEET_SAVED":
                this.handleParkingSheetSaved(payload);
                break;
            case "PARKING_INFO_ERROR":
                this.handleParkingInfoError(payload);
                break;
            case "CHARGING_INFO":
                this.handleChargingInfo(payload);
                break;
            case "CHARGING_SHEET_SAVED":
                this.handleChargingSheetSaved(payload);
                break;
            case "CHARGING_INFO_ERROR":
                this.handleChargingInfoError(payload);
                break;
            case "AIRPORTS_INFO":
                this.handleAirportsInfo(payload);
                break;
            case "AIRPORTS_SHEET_SAVED":
                this.handleAirportsSheetSaved(payload);
                break;
            case "AIRPORTS_INFO_ERROR":
                this.handleAirportsInfoError(payload);
                break;
            case "STADIUM_UPDATE_PROGRESS":
                this.handleStadiumUpdateProgress(payload);
                break;
            case "STADIUM_UPDATE_COMPLETE":
                this.handleStadiumUpdateComplete(payload);
                break;
            case "STADIUM_UPDATE_ERROR":
                this.handleStadiumUpdateError(payload);
                break;
            case "STADIUM_CACHE_REFRESHED":
                this.handleStadiumCacheRefreshed(payload);
                break;
        }
    },

    // Handle fixture data
    handleFixtureData: function(data) {
        if (this.config.debug) {
            Log.info(this.name + ": Received fixture data", data);
        }

        // Clear initial load timeout since we got data
        if (this.fixtureLoadTimeout) {
            clearTimeout(this.fixtureLoadTimeout);
            this.fixtureLoadTimeout = null;
        }

        this.nextFixture = data;
        this.error = null;
        this.retryCount = 0;
        this.loading = false;

        // Fetch routes if we have venue data
        if (data && data.venue) {
            this.fetchRoutes();
        }

        this.updateDom(1000);
    },

    // Handle fixture error
    handleFixtureError: function(payload) {
        const error = payload.message || payload;
        Log.error(this.name + ": Fixture error: " + error);
        
        // Clear initial load timeout since we got an error
        if (this.fixtureLoadTimeout) {
            clearTimeout(this.fixtureLoadTimeout);
            this.fixtureLoadTimeout = null;
        }
        
        this.error = this.translate("FAILED_TO_LOAD") + ": " + error;
        this.loading = false;
        this.updateDom();
    },

    // Handle routes data
    handleRoutesData: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Received routes data", payload);
        }

        // Extract routes array from payload
        this.routes = payload.routes || payload || [];
        this.retryCount = 0;
        this.lastRouteUpdate = new Date(); // Record timestamp of route update
        this.updateDom(500);
    },

    // Handle routes error
    handleRoutesError: function(payload) {
        const error = payload.message || payload;
        Log.error(this.name + ": Routes error: " + error);
        
        // Don't show route errors as prominently as fixture errors
        if (this.config.debug) {
            this.error = "Route calculation failed: " + error;
            this.updateDom();
        }
    },

    // Handle route saved confirmation
    handleRouteSaved: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Route saved successfully to " + payload.filename);
        }
        
        // Optional: Show success notification
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: this.translate("ROUTE_SAVED"),
            message: `${this.translate("SAVED_AS")} ${payload.filename}`,
            timer: 3000
        });
    },

    // Handle route save error
    handleRouteSaveError: function(payload) {
        const error = payload.message || payload;
        Log.error(this.name + ": Failed to save route: " + error);
        
        // Show error notification
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: this.translate("SAVE_FAILED"),
            message: this.translate("COULD_NOT_SAVE") + ": " + error,
            timer: 5000
        });
    },

    // Generate DOM content
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-MyTeams-DriveToMatch";
        
        // Apply theme overrides
        this._applyThemeOverrides();

        // Show loading state
        if (this.loading) {
            wrapper.innerHTML = `
                <div class="loading">
                    <i class="fa fa-spinner fa-spin"></i>
                    <span>${this.translate("LOADING")}</span>
                </div>
            `;
            return wrapper;
        }

        // Show error state
        if (this.error) {
            wrapper.innerHTML = `
                <div class="error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <span>${this.error}</span>
                </div>
            `;
            return wrapper;
        }

        // Show no fixture state
        if (!this.nextFixture) {
            wrapper.innerHTML = `
                <div class="no-fixture">
                    <i class="fa fa-calendar-times"></i>
                    <span>${this.translate("NO_FIXTURES")}</span>
                </div>
            `;
            return wrapper;
        }

        // Create fixture header
        const header = this.createFixtureHeader();
        wrapper.appendChild(header);

        // Create routes section
        if (this.routes && this.routes.length > 0) {
            const routesSection = this.createRoutesSection();
            wrapper.appendChild(routesSection);
            
            // Add footer with last update timestamp
            const footer = this.createFooter();
            wrapper.appendChild(footer);
        } else if (this.routeError) {
            // Show error message for missing coordinates
            const errorMessage = document.createElement("div");
            errorMessage.className = "routes-error";
            errorMessage.innerHTML = `
                <i class="fa fa-exclamation-circle"></i>
                <span>${this.translate("STADIUM_COORDS_UNKNOWN")}</span>
            `;
            wrapper.appendChild(errorMessage);
        } else if (this.nextFixture.venue) {
            // Show loading routes
            const loadingRoutes = document.createElement("div");
            loadingRoutes.className = "routes-loading";
            loadingRoutes.innerHTML = `
                <i class="fa fa-route fa-spin"></i>
                <span>${this.translate("CALCULATING_ROUTES")}</span>
            `;
            wrapper.appendChild(loadingRoutes);
        }

        return wrapper;
    },

    // Create fixture header
    createFixtureHeader: function() {
        const header = document.createElement("div");
        header.className = "fixture-header";

        const date = new Date(this.nextFixture.date);
        const isHome = this.nextFixture.isHome;
        const opponent = this.nextFixture.opponent;
        const venue = this.nextFixture.venue;

        // For away games, show "Opponent vs Team" with Team highlighted
        // For home games, show "Team vs Opponent" with Team highlighted
        const homeTeamDisplay = isHome ? this.config.teamName : opponent;
        const awayTeamDisplay = isHome ? opponent : this.config.teamName;
        const homeTeamHighlight = isHome ? 'highlight' : '';
        const awayTeamHighlight = !isHome ? 'highlight' : '';
        
        header.innerHTML = `
            <div class="fixture-info">
                <div class="teams">
                    <span class="team home ${homeTeamHighlight}">${homeTeamDisplay}</span>
                    <span class="vs">${this.translate("VS")}</span>
                    <span class="team away ${awayTeamHighlight}">${awayTeamDisplay}</span>
                </div>
                <div class="match-details">
                    <div class="date">${this.formatDate(date)}</div>
                    <div class="venue">
                        <i class="fa fa-map-marker-alt"></i>
                        ${venue ? venue.stadiumName : this.translate("VENUE_TBC")}${venue && venue.postCode ? ' - ' + venue.postCode : ''}
                    </div>
                    ${this.nextFixture.competition ? `<div class="competition">${this.nextFixture.competition}</div>` : ''}
                </div>
                <div class="action-buttons-container">
                    <button class="action-button parking-button" title="Parking Information" data-venue-lat="${venue ? venue.latitude : ''}" data-venue-lng="${venue ? venue.longitude : ''}" data-venue-name="${venue ? venue.stadiumName : ''}"><img src="modules/MMM-MyTeams-DriveToMatch/images/parking.png" alt="Parking"></button>
                    <button class="action-button charging-button" title="Charging Stations" data-venue-lat="${venue ? venue.latitude : ''}" data-venue-lng="${venue ? venue.longitude : ''}" data-venue-name="${venue ? venue.stadiumName : ''}"><img src="modules/MMM-MyTeams-DriveToMatch/images/charging.png" alt="Charging"></button>
                    ${this.shouldShowAirportButton(venue) ? `<button class="action-button airports-button" title="Nearby Airports" data-venue-lat="${venue ? venue.latitude : ''}" data-venue-lng="${venue ? venue.longitude : ''}" data-venue-name="${venue ? venue.stadiumName : ''}"><img src="modules/MMM-MyTeams-DriveToMatch/images/airport.png" alt="Airports"></button>` : ''}
                </div>
            </div>
        `;

        // Helper function to add button click handler
        const addButtonHandler = (buttonClass, callback) => {
            const btn = header.querySelector(`.${buttonClass}`);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (venue && venue.latitude && venue.longitude) {
                        callback(venue);
                    } else {
                        Log.warn(this.name + ": Venue coordinates not available");
                        this.sendNotification("SHOW_ALERT", {
                            type: "notification",
                            title: "Location Information",
                            message: "Venue coordinates not available",
                            timer: 3000
                        });
                    }
                });
            }
        };

        // Add click handlers for all buttons
        addButtonHandler.call(this, 'parking-button', this.requestParkingInfo.bind(this));
        addButtonHandler.call(this, 'charging-button', this.requestChargingInfo.bind(this));
        addButtonHandler.call(this, 'airports-button', this.requestAirportsInfo.bind(this));

        return header;
    },

    // Calculate distance between two coordinates in miles
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 3959;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    // Determine if airport button should be shown based on distance
    shouldShowAirportButton: function(venue) {
        if (!this.config.hideAirportIfNearby || !venue) {
            return true;
        }
        
        const distanceToVenue = this.calculateDistance(
            this.config.homeLatitude,
            this.config.homeLongitude,
            venue.latitude,
            venue.longitude
        );
        
        return distanceToVenue > this.config.airportProximityMiles;
    },

    // Request parking information from node helper
    requestParkingInfo: function(venue) {
        if (this.config.debug) {
            Log.info(this.name + ": Requesting parking info for " + venue.stadiumName);
        }
        
        this.sendSocketNotification("GET_PARKING_INFO", {
            instanceId: this.instanceId,
            venue: {
                name: venue.stadiumName,
                latitude: venue.latitude,
                longitude: venue.longitude,
                postCode: venue.postCode || ""
            },
            opponent: this.nextFixture.opponent,
            date: this.nextFixture.date,
            debug: this.config.debug
        });
    },

    // Handle parking info data received from node helper
    handleParkingInfo: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Received parking info with " + (payload.parkingSpots ? payload.parkingSpots.length : 0) + " spots");
        }
        
        try {
            // Generate parking sheet HTML
            const parkingHtml = this.generateParkingSheet(payload);
            
            if (this.config.debug) {
                Log.info(this.name + ": Generated parking HTML (" + parkingHtml.length + " bytes)");
            }
            
            // Save to file via node helper
            this.sendSocketNotification("SAVE_PARKING_SHEET", {
                instanceId: this.instanceId,
                html: parkingHtml,
                venueName: payload.venue.name,
                opponent: payload.opponent,
                date: payload.date
            });
            
            if (this.config.debug) {
                Log.info(this.name + ": Sent SAVE_PARKING_SHEET notification");
            }
        } catch (error) {
            Log.error(this.name + ": Error generating parking sheet: " + error.message);
            console.error(error);
            this.sendNotification("SHOW_ALERT", {
                type: "notification",
                title: "Parking Information",
                message: "Failed to generate parking information: " + error.message,
                timer: 5000
            });
        }
    },

    // Generate parking info sheet as HTML
    generateParkingSheet: function(parkingData) {
        const venue = parkingData.venue;
        const parkingSpots = parkingData.parkingSpots || [];
        const opponent = parkingData.opponent;
        const matchDate = new Date(parkingData.date);
        const tomTomApiKey = this.config.apiTomTomKey || '';
        
        // Sort parking spots by distance
        const sortedSpots = parkingSpots.slice(0, 10).sort((a, b) => a.distance - b.distance);
        
        // Generate parking table rows
        let tableRows = sortedSpots.map((spot, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this._escapeHtml(spot.name)}</td>
                <td>${this._escapeHtml(spot.street || spot.address || 'N/A')}</td>
                <td>${this._escapeHtml(spot.postcode || 'N/A')}</td>
                <td>${spot.distance.toFixed(2)} mi</td>
                <td>${this._escapeHtml(spot.parkingType || 'Parking')}</td>
                <td>${this._escapeHtml(spot.phone || 'Contact venue')}</td>
            </tr>
        `).join('');
        
        // Generate HTML document
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parking Information - ${this._escapeHtml(opponent)}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Roboto', Arial, sans-serif; 
            background: #f5f5f5; 
            color: #333;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header {
            background: linear-gradient(135deg, #018749, #FFD700);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .header h1 { margin-bottom: 5px; font-size: 28px; }
        .header p { font-size: 16px; opacity: 0.95; }
        .content { padding: 20px; }
        #map { width: 100%; height: 400px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #018749; }
        .leaflet-popup-content { font-size: 13px !important; }
        .leaflet-popup-content div { margin: 3px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
        .info-card { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #018749; }
        .info-card h3 { color: #018749; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }
        .info-card p { font-size: 16px; font-weight: bold; color: #333; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th {
            background: #018749;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 14px;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
        }
        tr:hover { background: #f5f5f5; }
        tr:last-child td { border-bottom: none; }
        .free { color: #4CAF50; font-weight: bold; }
        .paid { color: #ff9800; font-weight: bold; }
        .toolbar { padding: 15px 20px; background: #f9f9f9; border-bottom: 1px solid #ddd; display: flex; justify-content: flex-end; gap: 10px; }
        .print-btn { background: #018749; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; transition: background 0.3s; }
        .print-btn:hover { background: #005a33; }
        .footer { 
            background: #f0f0f0; 
            padding: 15px; 
            text-align: center; 
            color: #666; 
            font-size: 12px;
            border-radius: 0 0 8px 8px;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .toolbar { display: none; }
        }
        @media (max-width: 768px) {
            .info-grid { grid-template-columns: 1fr; }
            table { font-size: 12px; }
            td, th { padding: 8px; }
            .toolbar { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🅿️ Parking Information</h1>
            <p>${this._escapeHtml(opponent)} - ${venue.name}</p>
            <p>${matchDate.toLocaleDateString('en-GB', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
        </div>
        
        <div class="toolbar">
            <button class="print-btn" onclick="window.print()">🖨️ Print</button>
        </div>
        
        <div class="content">
            <div id="map"></div>
            
            <div class="info-grid">
                <div class="info-card">
                    <h3>📍 Venue</h3>
                    <p>${this._escapeHtml(venue.name)}</p>
                </div>
                <div class="info-card">
                    <h3>🏟️ Match</h3>
                    <p>${this._escapeHtml(opponent)}</p>
                </div>
                <div class="info-card">
                    <h3>🅿️ Parking Found</h3>
                    <p>${sortedSpots.length} car parks</p>
                </div>
            </div>
            
            <h2 style="margin-bottom: 15px; color: #018749;">📋 Nearest Car Parks (10 closest)</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Car Park Name</th>
                        <th>Street Address</th>
                        <th>Post Code</th>
                        <th>Distance to Venue</th>
                        <th>Parking Type</th>
                        <th>Cost Info</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Generated automatically for ${this._escapeHtml(opponent)} match at ${this._escapeHtml(venue.name)}</p>
            <p>Parking data sourced from OpenStreetMap | Map by Leaflet</p>
            <p>Please verify opening hours and pricing directly with car park operators before visiting</p>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
    <script>
        // Initialize Leaflet map
        function initializeMap() {
            try {
                // Create map centered on venue
                const map = L.map('map').setView([${venue.latitude}, ${venue.longitude}], 14);
                
                // Add OpenStreetMap tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19
                }).addTo(map);
                
                // Custom marker HTML with emoji
                function createMarkerIcon(emoji, color) {
                    return L.divIcon({
                        html: \`<div style="background: \${color}; width: 40px; height: 40px; border-radius: 50%; border: 3px solid #FFD700; display: flex; align-items: center; justify-content: center; font-size: 20px;">\${emoji}</div>\`,
                        iconSize: [40, 40],
                        className: 'custom-marker'
                    });
                }
                
                // Add venue marker
                L.marker([${venue.latitude}, ${venue.longitude}], {
                    icon: createMarkerIcon('🏟️', '#018749')
                }).addTo(map)
                    .bindPopup('<div style="font-weight: bold; font-size: 14px;">${this._escapeHtml(venue.name).replace(/'/g, "\\'")} </div><div>Match Venue</div>');
                
                // Add parking markers
                ${sortedSpots.map((spot, idx) => `
                L.marker([${spot.latitude}, ${spot.longitude}], {
                    icon: createMarkerIcon('🅿️', '#FF9800')
                }).addTo(map)
                    .bindPopup('<div style="font-weight: bold; font-size: 14px;">${spot.name.replace(/'/g, "\\'")} (${idx + 1})</div><div>Type: ${(spot.parkingType || 'Parking').replace(/'/g, "\\'")}</div><div>Distance: ${spot.distance.toFixed(2)} mi</div><div>Phone: ${(spot.phone || 'Contact venue').replace(/'/g, "\\'")}</div>');
                `).join('')}
                
                // Fit bounds to show all markers
                ${sortedSpots.length > 0 ? `
                const group = new L.featureGroup();
                L.marker([${venue.latitude}, ${venue.longitude}]).addTo(group);
                ${sortedSpots.map(spot => `L.marker([${spot.latitude}, ${spot.longitude}]).addTo(group);`).join('')}
                map.fitBounds(group.getBounds(), { padding: [50, 50] });
                ` : `map.setZoom(14);`}
                
            } catch (error) {
                console.error('Map initialization error:', error);
                document.getElementById('map').innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f0f0f0; color: #999; font-size: 14px;">⚠️ Map error: ' + error.message.substring(0, 50) + '...</div>';
            }
        }
        
        // Start map initialization when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeMap);
        } else {
            setTimeout(initializeMap, 100);
        }
    </script>
</body>
</html>
        `;
        
        return html;
    },

    // Helper to escape HTML special characters
    _escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Handle parking sheet saved confirmation
    handleParkingSheetSaved: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Parking sheet saved to " + payload.filename);
        }
        
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "🅿️ Parking Information",
            message: `Parking sheet saved as ${payload.filename}`,
            timer: 4000
        });
    },

    // Handle parking info error
    handleParkingInfoError: function(payload) {
        const error = payload.message || payload;
        Log.error(this.name + ": Parking info error: " + error);
        
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "Parking Information Error",
            message: error,
            timer: 5000
        });
    },

    // ===== CHARGING STATIONS =====

    // Request charging station information from node helper
    requestChargingInfo: function(venue) {
        if (this.config.debug) {
            Log.info(this.name + ": Requesting charging info for " + venue.stadiumName);
        }
        
        this.sendSocketNotification("GET_CHARGING_INFO", {
            instanceId: this.instanceId,
            venue: {
                name: venue.stadiumName,
                latitude: venue.latitude,
                longitude: venue.longitude,
                postCode: venue.postCode || ""
            },
            opponent: this.nextFixture.opponent,
            date: this.nextFixture.date,
            debug: this.config.debug
        });
    },

    // Handle charging info data received from node helper
    handleChargingInfo: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Received charging info with " + (payload.chargingStations ? payload.chargingStations.length : 0) + " stations");
        }
        
        try {
            // Generate charging sheet HTML
            const chargingHtml = this.generateChargingSheet(payload);
            
            if (this.config.debug) {
                Log.info(this.name + ": Generated charging HTML (" + chargingHtml.length + " bytes)");
            }
            
            // Save to file via node helper
            this.sendSocketNotification("SAVE_CHARGING_SHEET", {
                instanceId: this.instanceId,
                html: chargingHtml,
                venueName: payload.venue.name,
                opponent: payload.opponent,
                date: payload.date
            });
            
            if (this.config.debug) {
                Log.info(this.name + ": Sent SAVE_CHARGING_SHEET notification");
            }
        } catch (error) {
            Log.error(this.name + ": Error generating charging sheet: " + error.message);
            console.error(error);
            this.sendNotification("SHOW_ALERT", {
                type: "notification",
                title: "Charging Information",
                message: "Failed to generate charging information: " + error.message,
                timer: 5000
            });
        }
    },

    // Generate charging info sheet as HTML
    generateChargingSheet: function(chargingData) {
        const venue = chargingData.venue;
        const chargingStations = chargingData.chargingStations || [];
        const opponent = chargingData.opponent;
        const matchDate = new Date(chargingData.date);
        const tomTomApiKey = this.config.apiTomTomKey || '';
        
        // Sort charging stations by distance
        const sortedStations = chargingStations.slice(0, 10).sort((a, b) => a.distance - b.distance);
        
        // Generate charging table rows
        let tableRows = sortedStations.map((station, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this._escapeHtml(station.name)}</td>
                <td>${this._escapeHtml(station.address || 'N/A')}</td>
                <td>${station.distance.toFixed(2)} mi</td>
                <td>${this._escapeHtml(station.connectorTypes || 'Various')}</td>
                <td>${this._escapeHtml(station.operator || 'N/A')}</td>
            </tr>
        `).join('');
        
        // Generate HTML document with Leaflet map
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Charging Stations - ${this._escapeHtml(opponent)}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Roboto', Arial, sans-serif; 
            background: #f5f5f5; 
            color: #333;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header {
            background: linear-gradient(135deg, #4CAF50, #8BC34A);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .header h1 { margin-bottom: 5px; font-size: 28px; }
        .header p { font-size: 16px; opacity: 0.95; }
        .content { padding: 20px; }
        #map { width: 100%; height: 400px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #4CAF50; }
        .leaflet-popup-content { font-size: 13px !important; }
        .leaflet-popup-content div { margin: 3px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
        .info-card { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #4CAF50; }
        .info-card h3 { color: #4CAF50; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }
        .info-card p { font-size: 16px; font-weight: bold; color: #333; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th {
            background: #4CAF50;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 14px;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
        }
        tr:hover { background: #f5f5f5; }
        tr:last-child td { border-bottom: none; }
        .toolbar { padding: 15px 20px; background: #f9f9f9; border-bottom: 1px solid #ddd; display: flex; justify-content: flex-end; gap: 10px; }
        .print-btn { background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; transition: background 0.3s; }
        .print-btn:hover { background: #2e7d32; }
        .footer { 
            background: #f0f0f0; 
            padding: 15px; 
            text-align: center; 
            color: #666; 
            font-size: 12px;
            border-radius: 0 0 8px 8px;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .toolbar { display: none; }
        }
        @media (max-width: 768px) {
            .info-grid { grid-template-columns: 1fr; }
            table { font-size: 12px; }
            td, th { padding: 8px; }
            .toolbar { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Charging Stations</h1>
            <p>${this._escapeHtml(opponent)} - ${venue.name}</p>
            <p>${matchDate.toLocaleDateString('en-GB', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
        </div>
        
        <div class="toolbar">
            <button class="print-btn" onclick="window.print()">🖨️ Print</button>
        </div>
        
        <div class="content">
            <div id="map"></div>
            
            <div class="info-grid">
                <div class="info-card">
                    <h3>📍 Venue</h3>
                    <p>${this._escapeHtml(venue.name)}</p>
                </div>
                <div class="info-card">
                    <h3>🏟️ Match</h3>
                    <p>${this._escapeHtml(opponent)}</p>
                </div>
                <div class="info-card">
                    <h3>⚡ Stations Found</h3>
                    <p>${sortedStations.length} charging points</p>
                </div>
            </div>
            
            <h2 style="margin-bottom: 15px; color: #4CAF50;">📋 Nearest Charging Stations (10 closest)</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Station Name</th>
                        <th>Address</th>
                        <th>Distance to Venue</th>
                        <th>Connector Types</th>
                        <th>Operator</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Generated automatically for ${this._escapeHtml(opponent)} match at ${this._escapeHtml(venue.name)}</p>
            <p>Charging station data sourced from TomTom | Map by Leaflet</p>
            <p>Please verify availability and connector compatibility before visiting</p>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
    <script>
        // Initialize Leaflet map
        function initializeMap() {
            try {
                // Create map centered on venue
                const map = L.map('map').setView([${venue.latitude}, ${venue.longitude}], 14);
                
                // Add OpenStreetMap tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19
                }).addTo(map);
                
                // Custom marker HTML with emoji
                function createMarkerIcon(emoji, color) {
                    return L.divIcon({
                        html: \`<div style="background: \${color}; width: 40px; height: 40px; border-radius: 50%; border: 3px solid #FFD700; display: flex; align-items: center; justify-content: center; font-size: 20px;">\${emoji}</div>\`,
                        iconSize: [40, 40],
                        className: 'custom-marker'
                    });
                }
                
                // Add venue marker
                L.marker([${venue.latitude}, ${venue.longitude}], {
                    icon: createMarkerIcon('🏟️', '#4CAF50')
                }).addTo(map)
                    .bindPopup('<div style="font-weight: bold; font-size: 14px;">${this._escapeHtml(venue.name).replace(/'/g, "\\'")} </div><div>Match Venue</div>');
                
                // Add charging station markers
                ${sortedStations.map((station, idx) => `
                L.marker([${station.latitude}, ${station.longitude}], {
                    icon: createMarkerIcon('⚡', '#4CAF50')
                }).addTo(map)
                    .bindPopup('<div style="font-weight: bold; font-size: 14px;">${station.name.replace(/'/g, "\\'")} (${idx + 1})</div><div>Operator: ${(station.operator || 'N/A').replace(/'/g, "\\'")}</div><div>Distance: ${station.distance.toFixed(2)} mi</div><div>Connectors: ${(station.connectorTypes || 'Various').replace(/'/g, "\\'")}</div>');
                `).join('')}
                
                // Fit bounds to show all markers
                ${sortedStations.length > 0 ? `
                const group = new L.featureGroup();
                L.marker([${venue.latitude}, ${venue.longitude}]).addTo(group);
                ${sortedStations.map(station => `L.marker([${station.latitude}, ${station.longitude}]).addTo(group);`).join('')}
                map.fitBounds(group.getBounds(), { padding: [50, 50] });
                ` : `map.setZoom(14);`}
                
            } catch (error) {
                console.error('Map initialization error:', error);
                document.getElementById('map').innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f0f0f0; color: #999; font-size: 14px;">⚠️ Map error: ' + error.message.substring(0, 50) + '...</div>';
            }
        }
        
        // Start map initialization when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeMap);
        } else {
            setTimeout(initializeMap, 100);
        }
    </script>
</body>
</html>
        `;
        
        return html;
    },

    // Handle charging sheet saved confirmation
    handleChargingSheetSaved: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Charging sheet saved to " + payload.filename);
        }
        
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "⚡ Charging Stations",
            message: `Charging sheet saved as ${payload.filename}`,
            timer: 4000
        });
    },

    // Handle charging info error
    handleChargingInfoError: function(payload) {
        const error = payload.message || payload;
        Log.error(this.name + ": Charging info error: " + error);
        
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "Charging Information Error",
            message: error,
            timer: 5000
        });
    },

    // ===== AIRPORTS =====

    // Request airport information from node helper
    requestAirportsInfo: function(venue) {
        if (this.config.debug) {
            Log.info(this.name + ": Requesting airports info for " + venue.stadiumName);
        }
        
        this.sendSocketNotification("GET_AIRPORTS_INFO", {
            instanceId: this.instanceId,
            venue: {
                name: venue.stadiumName,
                latitude: venue.latitude,
                longitude: venue.longitude,
                postCode: venue.postCode || ""
            },
            opponent: this.nextFixture.opponent,
            date: this.nextFixture.date,
            debug: this.config.debug
        });
    },

    // Handle airports info data received from node helper
    handleAirportsInfo: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Received airports info with " + (payload.airports ? payload.airports.length : 0) + " airports");
        }
        
        try {
            // Generate airports sheet HTML
            const airportsHtml = this.generateAirportsSheet(payload);
            
            if (this.config.debug) {
                Log.info(this.name + ": Generated airports HTML (" + airportsHtml.length + " bytes)");
            }
            
            // Save to file via node helper
            this.sendSocketNotification("SAVE_AIRPORTS_SHEET", {
                instanceId: this.instanceId,
                html: airportsHtml,
                venueName: payload.venue.name,
                opponent: payload.opponent,
                date: payload.date
            });
            
            if (this.config.debug) {
                Log.info(this.name + ": Sent SAVE_AIRPORTS_SHEET notification");
            }
        } catch (error) {
            Log.error(this.name + ": Error generating airports sheet: " + error.message);
            console.error(error);
            this.sendNotification("SHOW_ALERT", {
                type: "notification",
                title: "Airports Information",
                message: "Failed to generate airports information: " + error.message,
                timer: 5000
            });
        }
    },

    // Generate airports info sheet as HTML (table format only)
    generateAirportsSheet: function(airportsData) {
        console.log(`[DEBUG] Airport generation starting with ${(airportsData.airports || []).length} airports`);
        const venue = airportsData.venue;
        const airports = airportsData.airports || [];
        console.log(`[DEBUG] Airports array length: ${airports.length}`);
        const opponent = airportsData.opponent;
        const matchDate = new Date(airportsData.date);
        
        // Sort airports by distance
        const sortedAirports = airports.slice(0, 10).sort((a, b) => a.distance - b.distance);
        
        // Generate airports table rows
        let tableRows = sortedAirports.map((airport, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this._escapeHtml(airport.name)}</td>
                <td>${this._escapeHtml(airport.iataCode || 'N/A')}</td>
                <td>${this._escapeHtml(airport.city || 'N/A')}</td>
                <td>${this._escapeHtml(airport.country || 'N/A')}</td>
                <td>${airport.distance.toFixed(2)} mi</td>
            </tr>
        `).join('');
        
        // Generate HTML document (table only, no map)
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>International Airports - ${this._escapeHtml(opponent)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Roboto', Arial, sans-serif; 
            background: #f5f5f5; 
            color: #333;
            padding: 20px;
        }
        .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header {
            background: linear-gradient(135deg, #008B8B, #20B2AA);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .header h1 { margin-bottom: 5px; font-size: 28px; }
        .header p { font-size: 16px; opacity: 0.95; }
        .toolbar { padding: 15px 20px; background: #f9f9f9; border-bottom: 1px solid #ddd; display: flex; justify-content: flex-end; gap: 10px; }
        .print-btn { background: #008B8B; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; transition: background 0.3s; }
        .print-btn:hover { background: #006666; }
        .content { padding: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
        .info-card { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #008B8B; }
        .info-card h3 { color: #008B8B; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }
        .info-card p { font-size: 16px; font-weight: bold; color: #333; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th {
            background: #008B8B;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 14px;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
        }
        tr:hover { background: #f5f5f5; }
        tr:last-child td { border-bottom: none; }
        .footer { 
            background: #f0f0f0; 
            padding: 15px; 
            text-align: center; 
            color: #666; 
            font-size: 12px;
            border-radius: 0 0 8px 8px;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .toolbar { display: none; }
        }
        @media (max-width: 768px) {
            .info-grid { grid-template-columns: 1fr; }
            table { font-size: 12px; }
            td, th { padding: 8px; }
            .toolbar { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✈️ International Airports</h1>
            <p>${this._escapeHtml(opponent)} - ${venue.name}</p>
            <p>${matchDate.toLocaleDateString('en-GB', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
        </div>
        
        <div class="toolbar">
            <button class="print-btn" onclick="window.print()">🖨️ Print</button>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-card">
                    <h3>📍 Venue</h3>
                    <p>${this._escapeHtml(venue.name)}</p>
                </div>
                <div class="info-card">
                    <h3>🏟️ Match</h3>
                    <p>${this._escapeHtml(opponent)}</p>
                </div>
                <div class="info-card">
                    <h3>✈️ Airports Found</h3>
                    <p>${sortedAirports.length} international airports</p>
                </div>
            </div>
            
            <h2 style="margin-bottom: 15px; color: #008B8B;">📋 Nearest International Airports (10 closest)</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Airport Name</th>
                        <th>IATA Code</th>
                        <th>City</th>
                        <th>Country</th>
                        <th>Distance to Venue</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Generated automatically for ${this._escapeHtml(opponent)} match at ${this._escapeHtml(venue.name)}</p>
            <p>Airport data sourced from TomTom</p>
            <p>Please confirm airport operations and flight availability directly with airlines</p>
        </div>
    </div>
</body>
</html>
        `;
        
        return html;
    },

    // Handle airports sheet saved confirmation
    handleAirportsSheetSaved: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Airports sheet saved to " + payload.filename);
        }
        
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "✈️ Airports",
            message: `Airports sheet saved as ${payload.filename}`,
            timer: 4000
        });
    },

    // Handle airports info error
    handleAirportsInfoError: function(payload) {
        const error = payload.message || payload;
        Log.error(this.name + ": Airports info error: " + error);
        
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "Airports Information Error",
            message: error,
            timer: 5000
        });
    },

    // Create routes section
    createRoutesSection: function() {
        const section = document.createElement("div");
        section.className = "routes-section";

        const title = document.createElement("div");
        title.className = "routes-title";
        title.innerHTML = `<i class="fa fa-route"></i> ${this.translate("ROUTES_TO")}`;
        section.appendChild(title);

        // Create flexbox container for side-by-side routes
        const routesContainer = document.createElement("div");
        routesContainer.className = "routes-container";
        
        this.routes.forEach((route, index) => {
            const routeDiv = this.createRouteDiv(route, index);
            routesContainer.appendChild(routeDiv);
        });
        
        section.appendChild(routesContainer);

        return section;
    },

    // Create individual route div
    createRouteDiv: function(route, index) {
        const routeDiv = document.createElement("div");
        routeDiv.className = `route route-${index + 1}`;

        const distance = this.formatDistance(route.summary.lengthInMeters);
        const duration = this.formatDuration(route.summary.travelTimeInSeconds);
        const delay = route.summary.trafficDelayInSeconds || 0;
        const delayText = delay > 0 ? this.formatDuration(delay) : null;

        let waypointsHtml = '';
        if (this.config.showWaypoints && route.waypoints && route.waypoints.length > 0) {
            waypointsHtml = `
                <div class="waypoints">
                    <i class="fa fa-road"></i>
                    <span>${this.translate("VIA")} ${route.waypoints.join(', ')}</span>
                </div>
            `;
        }

        // Determine route type label
        let routeTypeLabel = '';
        let routeTypeClass = '';
        if (route.routeType === 'fastest') {
            routeTypeLabel = '⚡ ' + this.translate("FASTEST");
            routeTypeClass = 'fastest';
        } else if (route.routeType === 'shortest') {
            routeTypeLabel = '📏 ' + this.translate("SHORTEST");
            routeTypeClass = 'alternative';
        } else {
            routeTypeLabel = index === 0 ? this.translate("FASTEST") : this.translate("ALTERNATIVE");
            routeTypeClass = index === 0 ? 'fastest' : 'alternative';
        }

        routeDiv.innerHTML = `
            <div class="route-header">
                <span class="route-label">${this.translate("ROUTE")} ${index + 1}</span>
                <span class="${routeTypeClass} clickable-badge" data-route-index="${index}" title="${this.translate("CLICK_TO_SAVE")}">
                    ${routeTypeLabel}
                </span>
            </div>
            <div class="route-details">
                <div class="time-distance">
                    <span class="duration">${duration}</span>
                    <span class="distance">${distance}</span>
                </div>
                ${waypointsHtml}
                <div class="delay-fuel-row">
                    ${this.config.showDelay && delayText ? `<span class="delay">+${delayText} ${this.translate("DELAY")}</span>` : ''}
                    ${this.config.showFuelCost && route.fuelCost !== null && route.fuelCost !== undefined ? `<div class="fuel-cost"><i class="fa fa-gas-pump"></i><span>${this.translate("FUEL")}: ${this.translate("CURRENCY_SYMBOL")}${route.fuelCost.toFixed(2)}</span></div>` : ''}
                </div>
            </div>
        `;

        // Add click handler for route type badge
        const badge = routeDiv.querySelector('.clickable-badge');
        if (badge) {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveRoute(route, index);
            });
        }

        return routeDiv;
    },

    // Create footer with last update timestamp
    createFooter: function() {
        const footer = document.createElement("div");
        footer.className = "route-footer";
        
        if (this.lastRouteUpdate) {
            const updateTime = this.formatUpdateTime(this.lastRouteUpdate);
            footer.innerHTML = `
                <i class="fa fa-clock"></i>
                <span>${this.translate("ROUTES_UPDATED")}: ${updateTime}</span>
            `;
        } else {
            footer.innerHTML = `
                <i class="fa fa-clock"></i>
                <span>${this.translate("ROUTES_UPDATED")}: ${this.translate("JUST_NOW")}</span>
            `;
        }
        
        return footer;
    },

    // Format update timestamp for footer display
    formatUpdateTime: function(date) {
        const options = {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        return date.toLocaleDateString('en-GB', options);
    },

    // Format date
    formatDate: function(date) {
        const options = {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-GB', options);
    },

    // Format distance
    formatDistance: function(meters) {
        if (this.config.units === "imperial") {
            const miles = meters * 0.000621371;
            return miles.toFixed(1) + " mi";
        } else {
            const km = meters / 1000;
            return km.toFixed(1) + " km";
        }
    },

    // Format duration
    formatDuration: function(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    },

    // Get CSS files
    getStyles: function() {
        return ["MMM-MyTeams-DriveToMatch.css"];
    },

    // Get translations
    getTranslations: function() {
        return {
            en: "translations/en.json",
            es: "translations/es.json",
            fr: "translations/fr.json",
            de: "translations/de.json",
            it: "translations/it.json",
            nl: "translations/nl.json",
            pt: "translations/pt.json",
            gd: "translations/gd.json",
            ga: "translations/ga.json"
        };
    },

    // Save route to file
    saveRoute: function(route, index) {
        if (!route || !this.nextFixture) {
            Log.warn(this.name + ": Cannot save route - missing route or fixture data");
            return;
        }

        // Determine opponent name (the team we're NOT supporting)
        const isHome = this.nextFixture.isHome;
        const opponent = this.nextFixture.opponent;
        const venueName = this.nextFixture.venue ? this.nextFixture.venue.stadiumName : 'Unknown';

        // Prepare route data for saving
        const routeData = {
            savedAt: new Date().toISOString(),
            fixture: {
                homeTeam: this.nextFixture.homeTeam,
                awayTeam: this.nextFixture.awayTeam,
                opponent: opponent,
                isHome: isHome,
                date: this.nextFixture.date,
                venue: venueName,
                postCode: this.nextFixture.venue ? this.nextFixture.venue.postCode : null,
                competition: this.nextFixture.competition || 'Unknown'
            },
            route: {
                routeNumber: index + 1,
                routeType: route.routeType || (index === 0 ? 'fastest' : 'alternative'),
                distance: this.formatDistance(route.summary.lengthInMeters),
                distanceMeters: route.summary.lengthInMeters,
                duration: this.formatDuration(route.summary.travelTimeInSeconds),
                durationSeconds: route.summary.travelTimeInSeconds,
                trafficDelay: route.summary.trafficDelayInSeconds || 0,
                trafficDelayFormatted: route.summary.trafficDelayInSeconds > 0 ? 
                    this.formatDuration(route.summary.trafficDelayInSeconds) : 'None',
                waypoints: route.waypoints || [],
                turnByTurnDirections: route.turnByTurnDirections || [],
                fuelCost: route.fuelCost ? `£${route.fuelCost.toFixed(2)}` : null,
                eurotunnel: route.eurotunnel || null,
                ferry: route.ferry || null
            },
            coordinates: {
                start: {
                    latitude: this.config.homeLatitude,
                    longitude: this.config.homeLongitude
                },
                end: {
                    latitude: this.nextFixture.venue ? this.nextFixture.venue.latitude : null,
                    longitude: this.nextFixture.venue ? this.nextFixture.venue.longitude : null
                }
            }
        };

        // Send to node_helper to save
        this.sendSocketNotification("SAVE_ROUTE", {
            instanceId: this.instanceId,
            routeData: routeData
        });

        // Visual feedback
        if (this.config.debug) {
            Log.info(this.name + ": Saving route " + (index + 1) + " for " + 
                this.nextFixture.homeTeam + " vs " + this.nextFixture.awayTeam);
        }
        
        // Show brief notification (optional - you can customize this)
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "Route Saved",
            message: `Route ${index + 1} saved to mySavedRoutes folder`,
            timer: 3000
        });
    },

    // Module cleanup
    stop: function() {
        if (this.fixtureTimer) {
            clearInterval(this.fixtureTimer);
        }
        if (this.routeTimer) {
            clearInterval(this.routeTimer);
        }
    },

    /**
     * Apply theme overrides via dynamic CSS injection
     * Handles darkMode, fontColorOverride, and opacityOverride config options
     */
    _applyThemeOverrides: function() {
        const styleId = "mmm-myteams-drivetomatch-theme-override";
        let styleEl = document.getElementById(styleId);

        // Remove existing style element if present
        if (styleEl) {
            styleEl.remove();
            styleEl = null;
        }

        // Build CSS rules based on config
        const rules = [];
        
        // Dark/Light mode override
        if (this.config.darkMode === true) {
            rules.push(`.MMM-MyTeams-DriveToMatch { background-color: #111 !important; }`);
        } else if (this.config.darkMode === false) {
            rules.push(`.MMM-MyTeams-DriveToMatch { background-color: #f5f5f5 !important; color: #000 !important; }`);
        }

        // Font color override
        if (this.config.fontColorOverride) {
            rules.push(`.MMM-MyTeams-DriveToMatch * { color: ${this.config.fontColorOverride} !important; }`);
        }

        // Border color override
        if (this.config.borderColorOverride) {
            rules.push(`.MMM-MyTeams-DriveToMatch * { border-color: ${this.config.borderColorOverride} !important; }`);
        }

        // Opacity override
        if (this.config.opacityOverride !== null && this.config.opacityOverride !== undefined) {
            const opacity = parseFloat(this.config.opacityOverride);
            if (!isNaN(opacity)) {
                rules.push(`.MMM-MyTeams-DriveToMatch * { opacity: ${opacity} !important; }`);
            }
        }

        // Inject style element if we have rules
        if (rules.length > 0) {
            try {
                styleEl = document.createElement("style");
                styleEl.id = styleId;
                styleEl.textContent = rules.join("\n");
                document.head.appendChild(styleEl);
            } catch (err) {
                console.error("[MMM-MyTeams-DriveToMatch] Failed to apply theme overrides:", err);
            }
        }
    },

    /**
     * Handle stadium update progress notifications
     */
    handleStadiumUpdateProgress: function(payload) {
        if (this.config.debug) {
            Log.info(this.name + ": Stadium update progress: " + payload.message);
        }
        
        // Send notification to MagicMirror notification system
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "Stadium Database Update",
            message: payload.message + (payload.progress ? ` (${payload.progress}%)` : "")
        });
    },

    /**
     * Handle stadium update completion
     */
    handleStadiumUpdateComplete: function(payload) {
        Log.info(this.name + ": Stadium update complete: " + payload.stadiumCount + " stadiums");
        
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "Stadium Database Updated",
            message: `Successfully updated ${payload.stadiumCount} stadiums. Reloading fixtures...`,
            timer: 5000 
        });

        // Reload fixtures with new stadium data
        setTimeout(() => {
            this.fetchFixture();
        }, 2000);
    },

    /**
     * Handle stadium update errors
     */
    handleStadiumUpdateError: function(payload) {
        Log.error(this.name + ": Stadium update error: " + payload.message);
        
        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "Stadium Update Failed",
            message: payload.message,
            timer: 8000
        });
    },

    /**
     * Handle stadium cache refresh completion
     */
    handleStadiumCacheRefreshed: function(payload) {
        if (payload.success) {
            Log.info(this.name + ": Stadium cache refreshed: " + payload.stadiumCount + " stadiums");
            
            this.sendNotification("SHOW_ALERT", {
                type: "notification",
                title: "Stadium Cache Refreshed",
                message: `Successfully refreshed ${payload.stadiumCount} stadium entries. Reloading fixtures...`,
                timer: 5000
            });

            // Reload fixtures with refreshed stadium data
            setTimeout(() => {
                this.fetchFixture();
            }, 2000);
        } else {
            Log.error(this.name + ": Stadium cache refresh failed: " + payload.error);
            
            this.sendNotification("SHOW_ALERT", {
                type: "notification",
                title: "Cache Refresh Failed",
                message: payload.error || "Unknown error",
                timer: 8000
            });
        }
    },

    /**
     * Trigger stadium database update
     * Called via notification or manual trigger
     */
    triggerStadiumUpdate: function() {
        if (this.config.debug) {
            Log.info(this.name + ": Triggering stadium database update...");
        }

        this.sendNotification("SHOW_ALERT", {
            type: "notification",
            title: "Stadium Database Update",
            message: "Starting stadium database update from web sources...",
            timer: 3000
        });

        this.sendSocketNotification("UPDATE_STADIUM_DATABASE", {
            instanceId: this.instanceId,
            debug: this.config.debug
        });
    },

    /**
     * Override getNotificationReceived to handle external notifications
     */
    notificationReceived: function(notification, payload, sender) {
        if (notification === "UPDATE_STADIUM_DATABASE") {
            this.triggerStadiumUpdate();
        }
    }
});
