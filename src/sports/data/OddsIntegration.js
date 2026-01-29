/**
 * OddsIntegration - Interface for The-Odds-API
 *
 * Handles fetching and synchronizing betting odds data.
 * Implements merge_asof logic for historical backtesting.
 *
 * API Usage:
 * ```javascript
 * const odds = new OddsIntegration({ apiKey: 'your-key' });
 * const mlbOdds = await odds.fetchLiveOdds('baseball_mlb');
 * ```
 *
 * @class OddsIntegration
 */

export class OddsIntegration {
    constructor(config = {}) {
        this.config = {
            apiKey: config.apiKey || null,
            baseUrl: 'https://api.the-odds-api.com/v4',

            // Default markets to fetch
            markets: ['h2h', 'totals', 'spreads'],

            // Default bookmakers
            bookmakers: ['fanduel', 'draftkings', 'betmgm', 'caesars'],

            // Rate limiting
            requestsPerMinute: 30,

            ...config
        };

        // Request tracking
        this.requestCount = 0;
        this.lastRequestTime = 0;

        // Odds cache
        this.oddsCache = new Map();
    }

    /**
     * Fetch live odds for a sport
     * @param {string} sport - Sport key (e.g., 'baseball_mlb')
     * @returns {Array} Odds data for all games
     */
    async fetchLiveOdds(sport = 'baseball_mlb') {
        await this.rateLimit();

        const url = `${this.config.baseUrl}/sports/${sport}/odds`;
        const params = new URLSearchParams({
            apiKey: this.config.apiKey,
            regions: 'us',
            markets: this.config.markets.join(','),
            bookmakers: this.config.bookmakers.join(','),
            oddsFormat: 'american'
        });

        try {
            const response = await fetch(`${url}?${params}`);

            // CRITICAL FIX: Check response status before parsing
            if (!response.ok) {
                const errorMsg = `Odds API returned status ${response.status}: ${response.statusText}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            const data = await response.json();

            // CRITICAL FIX: Validate response structure
            if (!Array.isArray(data)) {
                const errorMsg = 'Odds API returned invalid response format (expected array)';
                console.error(errorMsg, data);
                throw new Error(errorMsg);
            }

            // Parse and normalize
            return this.parseOddsResponse(data);
        } catch (error) {
            // CRITICAL FIX: Throw instead of silent return - let caller handle
            console.error('Error fetching odds:', error);
            throw new Error(`Failed to fetch live odds: ${error.message}`);
        }
    }

    /**
     * Fetch historical odds for backtesting
     * Note: Requires historical data subscription
     */
    async fetchHistoricalOdds(sport, date) {
        await this.rateLimit();

        const url = `${this.config.baseUrl}/historical/sports/${sport}/odds`;
        const params = new URLSearchParams({
            apiKey: this.config.apiKey,
            date: date.toISOString(),
            regions: 'us',
            markets: this.config.markets.join(',')
        });

        try {
            const response = await fetch(`${url}?${params}`);

            // CRITICAL FIX: Check response status
            if (!response.ok) {
                const errorMsg = `Historical odds API returned status ${response.status}: ${response.statusText}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            const data = await response.json();

            // CRITICAL FIX: Validate response structure
            if (!data || typeof data !== 'object') {
                throw new Error('Historical odds API returned invalid response format');
            }

            return this.parseOddsResponse(data.data || []);
        } catch (error) {
            // CRITICAL FIX: Throw instead of silent return
            console.error('Error fetching historical odds:', error);
            throw new Error(`Failed to fetch historical odds: ${error.message}`);
        }
    }

    /**
     * Parse odds API response
     */
    parseOddsResponse(games) {
        const parsed = [];

        for (const game of games) {
            const gameOdds = {
                gameId: game.id,
                sportKey: game.sport_key,
                commenceTime: game.commence_time,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                bookmakers: {}
            };

            // Parse each bookmaker's odds
            for (const bookmaker of (game.bookmakers || [])) {
                const bookOdds = {
                    name: bookmaker.key,
                    lastUpdate: bookmaker.last_update,
                    markets: {}
                };

                for (const market of (bookmaker.markets || [])) {
                    bookOdds.markets[market.key] = this.parseMarket(
                        market,
                        game.home_team,
                        game.away_team
                    );
                }

                gameOdds.bookmakers[bookmaker.key] = bookOdds;
            }

            // Compute consensus odds
            gameOdds.consensus = this.computeConsensusOdds(gameOdds);

            parsed.push(gameOdds);
        }

        return parsed;
    }

    /**
     * Parse a market's outcomes
     */
    parseMarket(market, homeTeam, awayTeam) {
        const result = {
            key: market.key,
            outcomes: {}
        };

        for (const outcome of (market.outcomes || [])) {
            const key = this.normalizeOutcomeKey(
                outcome.name,
                outcome.point,
                homeTeam,
                awayTeam
            );

            result.outcomes[key] = {
                name: outcome.name,
                price: outcome.price,
                point: outcome.point
            };
        }

        return result;
    }

    /**
     * Normalize outcome key (home, away, over, under)
     */
    normalizeOutcomeKey(name, point, homeTeam, awayTeam) {
        if (name === homeTeam) return 'home';
        if (name === awayTeam) return 'away';
        if (name.toLowerCase() === 'over') return 'over';
        if (name.toLowerCase() === 'under') return 'under';
        return name.toLowerCase().replace(/\s+/g, '_');
    }

    /**
     * Compute consensus odds across bookmakers
     */
    computeConsensusOdds(gameOdds) {
        const consensus = {
            h2h: { homeOdds: null, awayOdds: null },
            totals: { line: null, overOdds: null, underOdds: null },
            spreads: { line: null, homeOdds: null, awayOdds: null }
        };

        const bookmakers = Object.values(gameOdds.bookmakers);
        if (bookmakers.length === 0) return consensus;

        // Average h2h odds
        const h2hOdds = bookmakers
            .map(b => b.markets.h2h)
            .filter(m => m);

        if (h2hOdds.length > 0) {
            consensus.h2h.homeOdds = this.averageOdds(
                h2hOdds.map(m => m.outcomes.home?.price).filter(p => p)
            );
            consensus.h2h.awayOdds = this.averageOdds(
                h2hOdds.map(m => m.outcomes.away?.price).filter(p => p)
            );
        }

        // Average totals
        const totalOdds = bookmakers
            .map(b => b.markets.totals)
            .filter(m => m);

        if (totalOdds.length > 0) {
            // Most common line
            const lines = totalOdds
                .map(m => m.outcomes.over?.point)
                .filter(p => p);
            consensus.totals.line = this.mode(lines);

            consensus.totals.overOdds = this.averageOdds(
                totalOdds.map(m => m.outcomes.over?.price).filter(p => p)
            );
            consensus.totals.underOdds = this.averageOdds(
                totalOdds.map(m => m.outcomes.under?.price).filter(p => p)
            );
        }

        // Average spreads
        const spreadOdds = bookmakers
            .map(b => b.markets.spreads)
            .filter(m => m);

        if (spreadOdds.length > 0) {
            const lines = spreadOdds
                .map(m => m.outcomes.home?.point)
                .filter(p => p !== undefined);
            consensus.spreads.line = this.mode(lines);

            consensus.spreads.homeOdds = this.averageOdds(
                spreadOdds.map(m => m.outcomes.home?.price).filter(p => p)
            );
            consensus.spreads.awayOdds = this.averageOdds(
                spreadOdds.map(m => m.outcomes.away?.price).filter(p => p)
            );
        }

        return consensus;
    }

    /**
     * Convert American odds to implied probability
     */
    americanToProb(odds) {
        if (odds > 0) {
            return 100 / (odds + 100);
        } else {
            return Math.abs(odds) / (Math.abs(odds) + 100);
        }
    }

    /**
     * Convert implied probability to American odds
     */
    probToAmerican(prob) {
        if (prob >= 0.5) {
            return Math.round(-100 * prob / (1 - prob));
        } else {
            return Math.round(100 * (1 - prob) / prob);
        }
    }

    /**
     * Compute vig (juice) from a market
     */
    computeVig(oddsArray) {
        const probs = oddsArray.map(o => this.americanToProb(o));
        const total = probs.reduce((s, p) => s + p, 0);
        return total - 1;
    }

    /**
     * Average American odds (convert to prob, average, convert back)
     */
    averageOdds(oddsArray) {
        if (oddsArray.length === 0) return null;
        const avgProb = oddsArray
            .map(o => this.americanToProb(o))
            .reduce((s, p) => s + p, 0) / oddsArray.length;
        return this.probToAmerican(avgProb);
    }

    /**
     * Find mode (most common value)
     */
    mode(values) {
        if (values.length === 0) return null;
        const counts = new Map();
        for (const v of values) {
            counts.set(v, (counts.get(v) || 0) + 1);
        }
        let maxCount = 0;
        let modeVal = values[0];
        for (const [v, c] of counts) {
            if (c > maxCount) {
                maxCount = c;
                modeVal = v;
            }
        }
        return modeVal;
    }

    /**
     * Rate limiting
     */
    async rateLimit() {
        const now = Date.now();
        const minInterval = 60000 / this.config.requestsPerMinute;

        if (now - this.lastRequestTime < minInterval) {
            await new Promise(resolve =>
                setTimeout(resolve, minInterval - (now - this.lastRequestTime))
            );
        }

        this.lastRequestTime = Date.now();
        this.requestCount++;
    }

    /**
     * Format odds for model input
     * @param {Object} gameOdds - Parsed game odds
     * @returns {Object} Formatted odds for GeometricAlphaEngine
     */
    formatForModel(gameOdds) {
        const cons = gameOdds.consensus;

        return {
            gameId: gameOdds.gameId,
            homeTeam: gameOdds.homeTeam,
            awayTeam: gameOdds.awayTeam,
            timestamp: gameOdds.commenceTime,

            // Moneyline
            homeOdds: cons.h2h.homeOdds,
            awayOdds: cons.h2h.awayOdds,
            homeImpliedProb: cons.h2h.homeOdds ?
                this.americanToProb(cons.h2h.homeOdds) : 0.5,
            awayImpliedProb: cons.h2h.awayOdds ?
                this.americanToProb(cons.h2h.awayOdds) : 0.5,

            // Totals
            totalLine: cons.totals.line,
            overOdds: cons.totals.overOdds,
            underOdds: cons.totals.underOdds,

            // Spreads
            spreadLine: cons.spreads.line,
            homeSpreadOdds: cons.spreads.homeOdds,
            awaySpreadOdds: cons.spreads.awayOdds,

            // Vig
            h2hVig: cons.h2h.homeOdds && cons.h2h.awayOdds ?
                this.computeVig([cons.h2h.homeOdds, cons.h2h.awayOdds]) : null
        };
    }
}
