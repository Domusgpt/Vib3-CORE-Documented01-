/**
 * ModelTrainer - Training Pipeline Orchestrator
 *
 * Manages the end-to-end model training workflow:
 * - Data preparation
 * - Feature engineering
 * - Cross-validation
 * - Hyperparameter tuning
 * - Model selection
 *
 * @class ModelTrainer
 */

import { GeometricPredictor } from './GeometricPredictor.js';
import { GeometricFeatureEngine } from '../features/GeometricFeatureEngine.js';

export class ModelTrainer {
    constructor(config = {}) {
        this.config = {
            // Cross-validation settings
            cvFolds: 5,

            // Hyperparameter search space
            hyperparameterSpace: {
                numTrees: [50, 100, 200],
                maxDepth: [4, 6, 8],
                learningRate: [0.05, 0.1, 0.2],
                subsampleRate: [0.7, 0.8, 0.9]
            },

            // Search strategy
            searchStrategy: 'grid', // 'grid' or 'random'
            maxTrials: 50,

            // Metrics
            primaryMetric: 'directionAccuracy',

            ...config
        };

        this.featureEngine = new GeometricFeatureEngine();
        this.bestModel = null;
        this.trainingHistory = [];
    }

    /**
     * Run full training pipeline
     * @param {Object} dataLake - Data source
     * @param {Array} trainYears - Years for training
     * @param {number} testYear - Year for testing
     */
    async runPipeline(dataLake, trainYears, testYear) {
        console.log('\n=== Starting Training Pipeline ===');
        console.log(`Training years: ${trainYears.join(', ')}`);
        console.log(`Test year: ${testYear}`);

        // Step 1: Prepare features
        console.log('\n[1/4] Preparing features...');
        const trainFeatures = await this.prepareFeatures(dataLake, trainYears);
        const testFeatures = await this.prepareFeatures(dataLake, [testYear]);

        console.log(`Training samples: ${trainFeatures.length}`);
        console.log(`Test samples: ${testFeatures.length}`);

        // Step 2: Hyperparameter search
        console.log('\n[2/4] Searching hyperparameters...');
        const bestParams = await this.searchHyperparameters(trainFeatures);
        console.log('Best parameters:', bestParams);

        // Step 3: Train final model
        console.log('\n[3/4] Training final model...');
        const predictor = new GeometricPredictor(bestParams);
        const trainStats = await predictor.train(trainFeatures);

        // Step 4: Evaluate on test set
        console.log('\n[4/4] Evaluating on test set...');
        const testMetrics = await predictor.validate(testFeatures);

        this.bestModel = predictor;

        const results = {
            bestParams,
            trainStats,
            testMetrics,
            featureImportance: predictor.featureImportance
        };

        console.log('\n=== Pipeline Complete ===');
        console.log('Test Results:', testMetrics);

        return results;
    }

    /**
     * Prepare features from data
     */
    async prepareFeatures(dataLake, years) {
        const features = [];

        for (const year of years) {
            const games = dataLake.getGames(year);

            for (const game of games) {
                try {
                    const gameFeatures = await this.featureEngine.computeGameFeatures(
                        game,
                        dataLake
                    );

                    if (gameFeatures && game.result) {
                        features.push({
                            ...gameFeatures,
                            gameId: game.gameId,
                            year,
                            actualResult: {
                                runDifferential: (game.result.homeScore || 0) -
                                    (game.result.awayScore || 0),
                                homeWon: (game.result.homeScore || 0) > (game.result.awayScore || 0),
                                totalRuns: (game.result.homeScore || 0) + (game.result.awayScore || 0)
                            }
                        });
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        return features;
    }

    /**
     * Search for best hyperparameters
     */
    async searchHyperparameters(trainFeatures) {
        if (this.config.searchStrategy === 'grid') {
            return this.gridSearch(trainFeatures);
        } else {
            return this.randomSearch(trainFeatures);
        }
    }

    /**
     * Grid search over hyperparameter space
     */
    async gridSearch(trainFeatures) {
        const space = this.config.hyperparameterSpace;
        const combinations = this.generateCombinations(space);

        console.log(`Testing ${combinations.length} parameter combinations...`);

        let bestScore = -Infinity;
        let bestParams = null;

        for (let i = 0; i < combinations.length; i++) {
            const params = combinations[i];
            const score = await this.crossValidate(trainFeatures, params);

            this.trainingHistory.push({ params, score });

            if (score > bestScore) {
                bestScore = score;
                bestParams = params;
            }

            if ((i + 1) % 10 === 0) {
                console.log(`Progress: ${i + 1}/${combinations.length}, Best score: ${bestScore.toFixed(4)}`);
            }
        }

        return bestParams;
    }

    /**
     * Random search over hyperparameter space
     */
    async randomSearch(trainFeatures) {
        const space = this.config.hyperparameterSpace;

        let bestScore = -Infinity;
        let bestParams = null;

        for (let i = 0; i < this.config.maxTrials; i++) {
            // Sample random parameters
            const params = {};
            for (const [key, values] of Object.entries(space)) {
                params[key] = values[Math.floor(Math.random() * values.length)];
            }

            const score = await this.crossValidate(trainFeatures, params);

            this.trainingHistory.push({ params, score });

            if (score > bestScore) {
                bestScore = score;
                bestParams = params;
                console.log(`New best at trial ${i + 1}: score=${bestScore.toFixed(4)}`);
            }
        }

        return bestParams;
    }

    /**
     * Cross-validate a parameter configuration
     */
    async crossValidate(data, params) {
        const folds = this.createFolds(data, this.config.cvFolds);
        const scores = [];

        for (let i = 0; i < this.config.cvFolds; i++) {
            // Create train/val split
            const valData = folds[i];
            const trainData = folds.filter((_, idx) => idx !== i).flat();

            // Train model
            const predictor = new GeometricPredictor(params);
            await predictor.train(trainData, { silent: true });

            // Evaluate
            const metrics = await predictor.validate(valData);
            scores.push(metrics[this.config.primaryMetric]);
        }

        // Return mean score
        return scores.reduce((s, v) => s + v, 0) / scores.length;
    }

    /**
     * Create stratified folds
     */
    createFolds(data, numFolds) {
        // Shuffle data
        const shuffled = [...data].sort(() => Math.random() - 0.5);

        // Split into folds
        const folds = Array.from({ length: numFolds }, () => []);
        shuffled.forEach((item, idx) => {
            folds[idx % numFolds].push(item);
        });

        return folds;
    }

    /**
     * Generate all combinations of hyperparameters
     */
    generateCombinations(space) {
        const keys = Object.keys(space);
        const combinations = [];

        const generate = (current, depth) => {
            if (depth === keys.length) {
                combinations.push({ ...current });
                return;
            }

            const key = keys[depth];
            for (const value of space[key]) {
                current[key] = value;
                generate(current, depth + 1);
            }
        };

        generate({}, 0);
        return combinations;
    }

    /**
     * Feature selection using importance
     */
    selectFeatures(trainFeatures, importanceThreshold = 0.01) {
        // Train a preliminary model
        const predictor = new GeometricPredictor();
        predictor.train(trainFeatures);

        // Get feature importance
        const importance = predictor.featureImportance;

        // Select features above threshold
        const selectedFeatures = Object.entries(importance)
            .filter(([_, imp]) => imp >= importanceThreshold)
            .map(([name]) => name);

        console.log(`Selected ${selectedFeatures.length} features from ${Object.keys(importance).length}`);
        console.log('Top features:', selectedFeatures.slice(0, 10));

        return selectedFeatures;
    }

    /**
     * Export trained model
     */
    exportModel(path) {
        if (!this.bestModel) {
            throw new Error('No model trained yet');
        }

        const modelData = this.bestModel.exportModel();

        return {
            model: modelData,
            trainingHistory: this.trainingHistory,
            config: this.config
        };
    }

    /**
     * Load a trained model
     */
    loadModel(modelData) {
        this.bestModel = new GeometricPredictor();
        this.bestModel.importModel(modelData.model);
        this.trainingHistory = modelData.trainingHistory || [];
        return this.bestModel;
    }
}
