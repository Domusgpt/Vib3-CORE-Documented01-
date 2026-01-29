/**
 * Visual Computation System for Betting Bots
 *
 * This module provides a visual computation system where:
 * - Geometry IS computation (not just visualization)
 * - Betting signals map to 6D rotation planes
 * - Attractor states define executable configurations
 * - Bots read geometric state, not numbers
 *
 * Philosophy (from Kirigami HHC):
 * "Data is not merely displayed - the geometry itself IS the computation.
 * Deformation, rotation, and folding constitute the computational process."
 *
 * For betting, this means:
 * - Each opportunity exists in 4D "edge space"
 * - 6 betting signals → 6 rotation planes
 * - Geometry crystallizes → execute signal
 * - Geometry chaotic → wait signal
 *
 * @module sports/visual
 * @version 1.0.0
 */

// Core engine that maps opportunities to 4D geometry
export {
    BettingGeometryEngine,
    BETTING_CHANNELS,
    BETTING_PLANE_EFFECTS,
    ATTRACTOR_STATES
} from './BettingGeometryEngine.js';

// Market topology analysis (TDA for betting)
export {
    MarketTopology,
    PersistencePoint,
    MarketSnapshot
} from './MarketTopology.js';

// Primary bot interface
export {
    BotDecisionInterface,
    DECISION_TYPE,
    SIGNAL_STRENGTH,
    createBotInterface,
    createLiveBettingBot,
    createPreGameBot
} from './BotDecisionInterface.js';

// Re-export for convenience
import { BotDecisionInterface } from './BotDecisionInterface.js';
import { BettingGeometryEngine } from './BettingGeometryEngine.js';
import { MarketTopology } from './MarketTopology.js';

/**
 * Create and start a complete visual computation system
 *
 * @param {Object} config - Configuration
 * @returns {Object} Complete system with all components
 *
 * @example
 * const system = createVisualBettingSystem({ bankroll: 10000 });
 *
 * // Update with opportunities
 * const decision = system.update(opportunities);
 *
 * if (decision.execute) {
 *     for (const alloc of decision.allocations) {
 *         placeBet(alloc.gameId, alloc.amount);
 *     }
 * }
 */
export function createVisualBettingSystem(config = {}) {
    const bot = new BotDecisionInterface(config);

    return {
        // Primary interface
        bot,

        // Direct access to components
        geometry: bot.geometryEngine,
        topology: bot.topology,

        // Convenience methods
        update: (opportunities, context) => bot.update(opportunities, context),
        getDecision: () => bot.getDecision(),
        shouldExecute: () => bot.shouldExecute(),
        getAllocations: () => bot.getExecutableAllocations(),
        getState: () => bot.getFullState(),

        // Configuration
        setBankroll: (bankroll) => bot.setBankroll(bankroll),
        clear: () => bot.clear()
    };
}

/**
 * Quick start for common use cases
 */
export const QuickStart = {
    /**
     * Create a simple betting bot
     */
    simple: (bankroll = 10000) => createVisualBettingSystem({ bankroll }),

    /**
     * Create a conservative bot
     */
    conservative: (bankroll = 10000) => createVisualBettingSystem({
        bankroll,
        minSignalStrength: 0.75,
        minCrystallization: 0.65,
        maxTotalExposure: 0.10
    }),

    /**
     * Create an aggressive bot
     */
    aggressive: (bankroll = 10000) => createVisualBettingSystem({
        bankroll,
        minSignalStrength: 0.55,
        minCrystallization: 0.40,
        maxTotalExposure: 0.20
    }),

    /**
     * Create a live betting bot (faster updates, tighter thresholds)
     */
    live: (bankroll = 10000) => createVisualBettingSystem({
        bankroll,
        updateRate: 10,
        minSignalStrength: 0.70,
        minCrystallization: 0.60,
        maxTotalExposure: 0.08
    })
};

// Default export
export default {
    BettingGeometryEngine,
    MarketTopology,
    BotDecisionInterface,
    createVisualBettingSystem,
    QuickStart
};
