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
        homeLatitude: 54.8676, // Your home latitude - eg Cairnryan
        homeLongitude: -4.6399, // Your home longitude - - eg Cairnryan
        
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
        
        // Update intervals
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
        
        // Theme overrides
        darkMode: null,              // null=auto, true=force dark, false=force light
        fontColorOverride: null,     // e.g., "#FFFFFF" to force white text
        borderColorOverride: null,   // e.g., "#FFFFFF" to force white borders
        opacityOverride: null        // e.g., 1.0 to force full opacity
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
    retryCount: 0,
    lastRouteUpdate: null, // Timestamp of last route update
    instanceId: null, // Unique identifier for this module instance

    // Start the module
    start: function() {
        Log.info("Starting module: " + this.name);
        
        // Generate unique instance ID to filter notifications
        this.instanceId = this.identifier + "_" + Date.now();
        
        // Validate required config
        if (!this.config.apiTomTomKey || this.config.apiTomTomKey === "YOUR_TOMTOM_API_KEY") {
            this.error = this.translate("API_KEY_REQUIRED");
            this.updateDom();
            return;
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
        
        // Send complete config to node_helper with instance ID for filtering
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
            useSharedFixturesCache: this.config.useSharedFixturesCache
        });
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
            Log.info(this.name + ": Fetching routes to " + this.nextFixture.venue.name);
            Log.info(this.name + ": Route calculation details:", {
                from: "Home (" + this.config.homeLatitude + ", " + this.config.homeLongitude + ")",
                to: this.nextFixture.venue.name + " (" + this.nextFixture.venue.latitude + ", " + this.nextFixture.venue.longitude + ")",
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
                Log.warn(this.name + ": Venue coordinates not available for " + this.nextFixture.venue.name + " - skipping route calculation");
            }
            // Show fixture without routes
            this.routes = null;
            this.routeError = "Venue coordinates not available for " + this.nextFixture.venue.name;
            this.updateDom(this.config.animationSpeed);
            return;
        }

        const routeData = {
            instanceId: this.instanceId, // Add instance ID for response filtering
            apiKey: this.config.apiTomTomKey,
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
        }
    },

    // Handle fixture data
    handleFixtureData: function(data) {
        if (this.config.debug) {
            Log.info(this.name + ": Received fixture data", data);
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
                        ${venue ? venue.name : this.translate("VENUE_TBC")}${venue && venue.postCode ? ' - ' + venue.postCode : ''}
                    </div>
                    ${this.nextFixture.competition ? `<div class="competition">${this.nextFixture.competition}</div>` : ''}
                </div>
            </div>
        `;

        return header;
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

        // Add fuel cost if available
        let fuelCostHtml = '';
        if (this.config.showFuelCost && route.fuelCost !== null && route.fuelCost !== undefined) {
            const currencySymbol = this.translate("CURRENCY_SYMBOL");
            fuelCostHtml = `
                <div class="fuel-cost">
                    <i class="fa fa-gas-pump"></i>
                    <span>${this.translate("FUEL")}: ${currencySymbol}${route.fuelCost.toFixed(2)}</span>
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
                    ${this.config.showDelay && delayText ? `<span class="delay">+${delayText} ${this.translate("DELAY")}</span>` : ''}
                </div>
                ${waypointsHtml}
                ${fuelCostHtml}
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
        const venueName = this.nextFixture.venue ? this.nextFixture.venue.name : 'Unknown';

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
    }
});
