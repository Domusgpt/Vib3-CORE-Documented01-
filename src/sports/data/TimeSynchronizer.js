/**
 * TimeSynchronizer - Implements merge_asof for Odds/Performance Data
 *
 * Critical for backtesting: ensures we only use odds that were actually
 * available before the game started. Prevents look-ahead bias.
 *
 * The merge_asof Algorithm:
 * - Sort both datasets by timestamp
 * - For each performance event, find the most recent odds update
 * - Ensure strict causality (odds timestamp < game timestamp)
 *
 * @class TimeSynchronizer
 */

export class TimeSynchronizer {
    constructor(config = {}) {
        this.config = {
            // Maximum time delta for matching (ms)
            maxDelta: 24 * 60 * 60 * 1000, // 24 hours

            // Default time before game to use for "closing line"
            closingLineWindow: 5 * 60 * 1000, // 5 minutes before

            // Time zone handling
            timezone: 'America/New_York',

            ...config
        };
    }

    /**
     * Merge game data with odds using merge_asof logic
     * @param {Array} games - Game events with timestamps
     * @param {Array} odds - Odds history with timestamps
     * @returns {Array} Games with synchronized odds
     */
    mergeAsof(games, odds) {
        // Sort both by timestamp
        const sortedGames = [...games].sort((a, b) =>
            new Date(a.gameTime || a.timestamp) - new Date(b.gameTime || b.timestamp)
        );

        const sortedOdds = [...odds].sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Index odds by game ID for efficient lookup
        const oddsByGame = new Map();
        for (const odd of sortedOdds) {
            if (!oddsByGame.has(odd.gameId)) {
                oddsByGame.set(odd.gameId, []);
            }
            oddsByGame.get(odd.gameId).push(odd);
        }

        // Merge
        const merged = [];

        for (const game of sortedGames) {
            const gameTime = new Date(game.gameTime || game.timestamp);
            const gameOdds = oddsByGame.get(game.gameId) || [];

            // Find most recent odds before game time
            const validOdds = gameOdds.filter(o => {
                const oddsTime = new Date(o.timestamp);
                const delta = gameTime - oddsTime;
                return delta > 0 && delta < this.config.maxDelta;
            });

            // Sort by timestamp descending (most recent first)
            validOdds.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            // Take the most recent (closing line)
            const closingOdds = validOdds[0] || null;

            // Also get opening line (earliest odds)
            const openingOdds = validOdds[validOdds.length - 1] || null;

            merged.push({
                ...game,
                closingOdds,
                openingOdds,
                oddsHistory: validOdds,
                lineMovement: this.computeLineMovement(openingOdds, closingOdds)
            });
        }

        return merged;
    }

    /**
     * Get the closing line for a specific game
     * @param {string} gameId - Game identifier
     * @param {Date} gameTime - Game start time
     * @param {Array} oddsHistory - All odds updates
     */
    getClosingLine(gameId, gameTime, oddsHistory) {
        const gameOdds = oddsHistory.filter(o => o.gameId === gameId);

        // Find odds within closing window
        const closingWindow = new Date(gameTime.getTime() - this.config.closingLineWindow);

        const closingOdds = gameOdds
            .filter(o => {
                const oddsTime = new Date(o.timestamp);
                return oddsTime < gameTime && oddsTime >= closingWindow;
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        // If no odds in closing window, get most recent before game
        if (!closingOdds) {
            return gameOdds
                .filter(o => new Date(o.timestamp) < gameTime)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        }

        return closingOdds;
    }

    /**
     * Compute line movement between opening and closing
     */
    computeLineMovement(opening, closing) {
        if (!opening || !closing) return null;

        const movement = {
            moneyline: {},
            total: {},
            spread: {}
        };

        // Moneyline movement
        if (opening.homeOdds && closing.homeOdds) {
            movement.moneyline = {
                homeOpen: opening.homeOdds,
                homeClose: closing.homeOdds,
                homeDelta: closing.homeOdds - opening.homeOdds,
                awayOpen: opening.awayOdds,
                awayClose: closing.awayOdds,
                awayDelta: closing.awayOdds - opening.awayOdds,
                direction: this.getMovementDirection(
                    opening.homeOdds,
                    closing.homeOdds
                )
            };
        }

        // Total movement
        if (opening.totalLine !== undefined && closing.totalLine !== undefined) {
            movement.total = {
                lineOpen: opening.totalLine,
                lineClose: closing.totalLine,
                lineDelta: closing.totalLine - opening.totalLine,
                direction: closing.totalLine > opening.totalLine ? 'up' :
                    closing.totalLine < opening.totalLine ? 'down' : 'stable'
            };
        }

        // Spread movement
        if (opening.spreadLine !== undefined && closing.spreadLine !== undefined) {
            movement.spread = {
                lineOpen: opening.spreadLine,
                lineClose: closing.spreadLine,
                lineDelta: closing.spreadLine - opening.spreadLine,
                direction: closing.spreadLine > opening.spreadLine ? 'bigger' :
                    closing.spreadLine < opening.spreadLine ? 'smaller' : 'stable'
            };
        }

        return movement;
    }

    /**
     * Determine direction of line movement
     */
    getMovementDirection(openOdds, closeOdds) {
        // For American odds, more negative (or less positive) = more favored
        const openImplied = this.americanToProb(openOdds);
        const closeImplied = this.americanToProb(closeOdds);

        const delta = closeImplied - openImplied;

        if (Math.abs(delta) < 0.01) return 'stable';
        return delta > 0 ? 'steamed' : 'faded';
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
     * Compute Closing Line Value (CLV)
     * The key metric for betting system validation
     */
    computeCLV(betOdds, closingOdds) {
        if (!betOdds || !closingOdds) return null;

        const betImplied = this.americanToProb(betOdds);
        const closingImplied = this.americanToProb(closingOdds);

        // CLV = closing implied - bet implied
        // Positive CLV = we got better odds than closing
        return closingImplied - betImplied;
    }

    /**
     * Synchronize a day's slate with real-time odds
     * Used for live operation
     */
    synchronizeSlate(slate, currentOdds) {
        const now = new Date();

        return slate.map(game => {
            const gameOdds = currentOdds.find(o =>
                o.homeTeam === game.homeTeam &&
                o.awayTeam === game.awayTeam
            );

            return {
                ...game,
                currentOdds: gameOdds ? {
                    ...gameOdds,
                    fetchedAt: now.toISOString()
                } : null,
                isSynchronized: !!gameOdds
            };
        });
    }

    /**
     * Build a timeline of odds for analysis
     */
    buildOddsTimeline(gameId, oddsHistory) {
        const gameOdds = oddsHistory
            .filter(o => o.gameId === gameId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const timeline = [];
        let previous = null;

        for (const odds of gameOdds) {
            const entry = {
                timestamp: odds.timestamp,
                homeOdds: odds.homeOdds,
                awayOdds: odds.awayOdds,
                totalLine: odds.totalLine,
                spreadLine: odds.spreadLine,
                delta: previous ? {
                    homeOdds: odds.homeOdds - previous.homeOdds,
                    awayOdds: odds.awayOdds - previous.awayOdds,
                    totalLine: odds.totalLine - (previous.totalLine || odds.totalLine),
                    timeSincePrevious: new Date(odds.timestamp) - new Date(previous.timestamp)
                } : null
            };

            timeline.push(entry);
            previous = odds;
        }

        return {
            gameId,
            timeline,
            totalUpdates: timeline.length,
            averageUpdateInterval: this.computeAverageInterval(timeline)
        };
    }

    /**
     * Compute average interval between odds updates
     */
    computeAverageInterval(timeline) {
        if (timeline.length < 2) return null;

        let totalInterval = 0;
        let count = 0;

        for (let i = 1; i < timeline.length; i++) {
            if (timeline[i].delta?.timeSincePrevious) {
                totalInterval += timeline[i].delta.timeSincePrevious;
                count++;
            }
        }

        return count > 0 ? totalInterval / count : null;
    }
}
