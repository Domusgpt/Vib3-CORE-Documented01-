/**
 * DataLakeManager - Unified Data Storage and Retrieval
 *
 * Manages the local data lake for Statcast telemetry, odds data,
 * and environmental information. Supports efficient caching and
 * incremental updates.
 *
 * Storage Strategy:
 * - Pitch data: Partitioned Parquet-like structure (JSON for portability)
 * - Odds data: SQL-style relational structure
 * - Environmental: Static configuration files
 *
 * @class DataLakeManager
 */

export class DataLakeManager {
    constructor(dataPath = './data/statcast/') {
        this.dataPath = dataPath;

        // In-memory indices
        this.seasonData = new Map(); // year -> pitch data
        this.playerIndex = new Map(); // playerId -> player info
        this.gameIndex = new Map();   // gameId -> game info
        this.umpireIndex = new Map(); // umpireId -> umpire data
        this.oddsData = new Map();    // gameId -> odds history

        // Statistics
        this.stats = {
            totalPitches: 0,
            totalGames: 0,
            loadedSeasons: []
        };
    }

    /**
     * Load a season of data
     * @param {number} year - Season year
     * @param {Object} options - Loading options
     */
    async loadSeason(year, options = {}) {
        // In a real implementation, this would load from Parquet files
        // For now, we create the structure for the API patterns

        if (!this.seasonData.has(year)) {
            this.seasonData.set(year, {
                pitches: [],
                games: [],
                loaded: false,
                year
            });
        }

        const seasonStore = this.seasonData.get(year);

        if (options.pitches) {
            this.loadPitches(year, options.pitches);
        }

        if (options.games) {
            this.loadGames(year, options.games);
        }

        seasonStore.loaded = true;
        this.stats.loadedSeasons.push(year);

        return seasonStore;
    }

    /**
     * Load pitch data for a season
     * @param {number} year - Season year
     * @param {Array} pitches - Pitch data array
     */
    loadPitches(year, pitches) {
        const seasonStore = this.seasonData.get(year) || {
            pitches: [],
            games: [],
            year
        };

        // Index pitches
        for (const pitch of pitches) {
            // Add to season store
            seasonStore.pitches.push(pitch);

            // Index by player
            this.indexByPlayer(pitch);

            // Index by game
            if (pitch.game_pk) {
                if (!this.gameIndex.has(pitch.game_pk)) {
                    this.gameIndex.set(pitch.game_pk, {
                        gameId: pitch.game_pk,
                        pitches: [],
                        date: pitch.game_date
                    });
                }
                this.gameIndex.get(pitch.game_pk).pitches.push(pitch);
            }

            // Index by umpire
            if (pitch.umpire) {
                if (!this.umpireIndex.has(pitch.umpire)) {
                    this.umpireIndex.set(pitch.umpire, {
                        umpireId: pitch.umpire,
                        calledStrikes: [],
                        calledBalls: []
                    });
                }
                const umpData = this.umpireIndex.get(pitch.umpire);
                if (pitch.description === 'called_strike') {
                    umpData.calledStrikes.push({
                        plate_x: pitch.plate_x,
                        plate_z: pitch.plate_z,
                        sz_top: pitch.sz_top,
                        sz_bot: pitch.sz_bot,
                        p_throws: pitch.p_throws,
                        stand: pitch.stand
                    });
                } else if (pitch.description === 'ball') {
                    umpData.calledBalls.push({
                        plate_x: pitch.plate_x,
                        plate_z: pitch.plate_z
                    });
                }
            }
        }

        this.seasonData.set(year, seasonStore);
        this.stats.totalPitches += pitches.length;
    }

    /**
     * Load game data
     */
    loadGames(year, games) {
        const seasonStore = this.seasonData.get(year);
        if (seasonStore) {
            seasonStore.games = games;
            this.stats.totalGames += games.length;

            for (const game of games) {
                this.gameIndex.set(game.gameId, {
                    ...this.gameIndex.get(game.gameId) || {},
                    ...game
                });
            }
        }
    }

    /**
     * Index pitch by player
     */
    indexByPlayer(pitch) {
        // Index by pitcher
        if (pitch.pitcher) {
            if (!this.playerIndex.has(pitch.pitcher)) {
                this.playerIndex.set(pitch.pitcher, {
                    playerId: pitch.pitcher,
                    name: pitch.pitcher_name || `Player ${pitch.pitcher}`,
                    pitches: [],
                    battedBalls: []
                });
            }
            this.playerIndex.get(pitch.pitcher).pitches.push(pitch);
        }

        // Index by batter (for batted balls)
        if (pitch.batter && pitch.type === 'X') {
            if (!this.playerIndex.has(pitch.batter)) {
                this.playerIndex.set(pitch.batter, {
                    playerId: pitch.batter,
                    name: pitch.batter_name || `Player ${pitch.batter}`,
                    pitches: [],
                    battedBalls: []
                });
            }
            this.playerIndex.get(pitch.batter).battedBalls.push(pitch);
        }
    }

    // === Query Methods ===

    /**
     * Get all games in a date range
     */
    getGamesInRange(startDate, endDate) {
        const games = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (const [gameId, game] of this.gameIndex) {
            const gameDate = new Date(game.date || game.gameDate);
            if (gameDate >= start && gameDate <= end) {
                games.push(game);
            }
        }

        return games.sort((a, b) =>
            new Date(a.date || a.gameDate) - new Date(b.date || b.gameDate)
        );
    }

    /**
     * Get games for a season
     */
    getGames(year) {
        const seasonStore = this.seasonData.get(year);
        return seasonStore?.games || [];
    }

    /**
     * Get pitch count for a season
     */
    getPitchCount(year) {
        const seasonStore = this.seasonData.get(year);
        return seasonStore?.pitches?.length || 0;
    }

    /**
     * Get all pitchers for a season
     */
    getPitchers(year) {
        const seasonStore = this.seasonData.get(year);
        if (!seasonStore) return [];

        const pitchers = new Map();

        for (const pitch of seasonStore.pitches) {
            if (pitch.pitcher && !pitchers.has(pitch.pitcher)) {
                const playerData = this.playerIndex.get(pitch.pitcher);
                pitchers.set(pitch.pitcher, {
                    pitcherId: pitch.pitcher,
                    pitches: playerData?.pitches || []
                });
            }
        }

        return Array.from(pitchers.values());
    }

    /**
     * Get pitcher's pitch data
     */
    getPitcherData(pitcherId) {
        const player = this.playerIndex.get(pitcherId);
        return player?.pitches || [];
    }

    /**
     * Get batter's batted ball data
     */
    getBatterData(batterId) {
        const player = this.playerIndex.get(batterId);
        return player?.battedBalls || [];
    }

    /**
     * Get umpire data
     */
    getUmpireData(umpireId) {
        const umpire = this.umpireIndex.get(umpireId);
        return umpire?.calledStrikes || [];
    }

    /**
     * Get fielder data
     */
    getFielderData(fielderIds) {
        const data = {};
        for (const id of fielderIds) {
            const player = this.playerIndex.get(id);
            if (player) {
                data[id] = {
                    playerId: id,
                    sprintSpeed: player.sprintSpeed || 27, // Default average
                    name: player.name
                };
            }
        }
        return data;
    }

    /**
     * Get game results
     */
    getGameResults(gameIds) {
        const results = [];
        for (const gameId of gameIds) {
            const game = this.gameIndex.get(gameId);
            if (game?.result) {
                results.push({
                    gameId,
                    result: game.result,
                    homeScore: game.homeScore,
                    awayScore: game.awayScore,
                    totalRuns: (game.homeScore || 0) + (game.awayScore || 0)
                });
            }
        }
        return results;
    }

    /**
     * Get historical odds (placeholder - would connect to actual odds data)
     */
    async getHistoricalOdds(startDate, endDate) {
        // Return cached odds data
        const odds = [];

        for (const [gameId, gameOdds] of this.oddsData) {
            const game = this.gameIndex.get(gameId);
            if (game) {
                const gameDate = new Date(game.date || game.gameDate);
                if (gameDate >= new Date(startDate) && gameDate <= new Date(endDate)) {
                    odds.push(...gameOdds);
                }
            }
        }

        return odds;
    }

    /**
     * Load odds data
     */
    loadOddsData(oddsArray) {
        for (const odds of oddsArray) {
            if (!this.oddsData.has(odds.gameId)) {
                this.oddsData.set(odds.gameId, []);
            }
            this.oddsData.get(odds.gameId).push(odds);
        }
    }

    /**
     * Get data lake statistics
     */
    getStats() {
        return {
            ...this.stats,
            playersIndexed: this.playerIndex.size,
            gamesIndexed: this.gameIndex.size,
            umpiresIndexed: this.umpireIndex.size
        };
    }

    /**
     * Clear all data
     */
    clear() {
        this.seasonData.clear();
        this.playerIndex.clear();
        this.gameIndex.clear();
        this.umpireIndex.clear();
        this.oddsData.clear();
        this.stats = {
            totalPitches: 0,
            totalGames: 0,
            loadedSeasons: []
        };
    }
}
