/**
 * GeometricPredictor - ML Model for Geometric Alpha Predictions
 *
 * Implements a gradient boosting-style model optimized for geometric features.
 * In production, this would interface with XGBoost/LightGBM via WASM or Python.
 *
 * For pure JavaScript, we implement:
 * - Decision tree ensemble
 * - Feature importance tracking
 * - Cross-validation utilities
 *
 * @class GeometricPredictor
 */

import { DeltaRunExpectancy } from './DeltaRunExpectancy.js';

export class GeometricPredictor {
    constructor(config = {}) {
        this.config = {
            // Model hyperparameters
            numTrees: 100,
            maxDepth: 6,
            learningRate: 0.1,
            subsampleRate: 0.8,
            featureSubsampleRate: 0.8,
            minSamplesLeaf: 10,

            // Training settings
            earlyStoppingRounds: 10,
            validationSplit: 0.2,

            ...config
        };

        this.version = '1.0.0';
        this.trees = [];
        this.featureImportance = {};
        this.trainingStats = null;
        this.deltaRE = new DeltaRunExpectancy();

        // CRITICAL FIX: Seeded random number generator for reproducibility
        // This ensures identical results across backtest runs with same data
        this._randomSeed = config.randomSeed || 42;
        this._randomState = this._randomSeed;

        // Feature names for tracking
        this.featureNames = [
            'home_arsenal_volume', 'home_arsenal_spread', 'home_cluster_separation',
            'home_stability', 'home_avg_tunnel', 'home_max_tunnel', 'home_tunnel_pairs',
            'away_arsenal_volume', 'away_arsenal_spread', 'away_cluster_separation',
            'away_stability', 'away_avg_tunnel', 'away_max_tunnel', 'away_tunnel_pairs',
            'umpire_zone_expansion', 'umpire_centroid_x', 'umpire_centroid_z',
            'umpire_asymmetry', 'air_density_factor', 'wind_effect', 'park_factor',
            'fly_ball_mult', 'home_run_mult'
        ];
    }

    /**
     * Train the model on geometric features
     * @param {Array} trainingData - Array of {features, target}
     * @param {Object} options - Training options
     */
    async train(trainingData, options = {}) {
        console.log(`Training on ${trainingData.length} samples...`);

        // Split into train/validation
        const shuffled = this.shuffle([...trainingData]);
        const splitIdx = Math.floor(shuffled.length * (1 - this.config.validationSplit));
        const trainSet = shuffled.slice(0, splitIdx);
        const valSet = shuffled.slice(splitIdx);

        // Extract features and targets
        const X_train = trainSet.map(d => this.featuresToVector(d));
        const y_train = trainSet.map(d => d.actualResult?.runDifferential || 0);

        const X_val = valSet.map(d => this.featuresToVector(d));
        const y_val = valSet.map(d => d.actualResult?.runDifferential || 0);

        // Initialize predictions
        let trainPreds = new Array(X_train.length).fill(0);
        let valPreds = new Array(X_val.length).fill(0);

        // Training loop
        let bestValLoss = Infinity;
        let roundsWithoutImprovement = 0;

        for (let i = 0; i < this.config.numTrees; i++) {
            // Compute residuals
            const residuals = y_train.map((y, idx) => y - trainPreds[idx]);

            // Sample for this tree
            const { sampledX, sampledResiduals, sampledIndices } = this.subsample(
                X_train,
                residuals
            );

            // Train a tree on residuals
            const tree = this.trainTree(sampledX, sampledResiduals, 0);
            this.trees.push(tree);

            // Update predictions
            trainPreds = trainPreds.map((p, idx) =>
                p + this.config.learningRate * this.predictTree(tree, X_train[idx])
            );

            valPreds = valPreds.map((p, idx) =>
                p + this.config.learningRate * this.predictTree(tree, X_val[idx])
            );

            // Compute losses
            const trainLoss = this.computeMSE(trainPreds, y_train);
            const valLoss = this.computeMSE(valPreds, y_val);

            // Early stopping check
            if (valLoss < bestValLoss) {
                bestValLoss = valLoss;
                roundsWithoutImprovement = 0;
            } else {
                roundsWithoutImprovement++;
            }

            if (roundsWithoutImprovement >= this.config.earlyStoppingRounds) {
                console.log(`Early stopping at round ${i + 1}`);
                break;
            }

            if ((i + 1) % 10 === 0) {
                console.log(`Round ${i + 1}: train_loss=${trainLoss.toFixed(4)}, val_loss=${valLoss.toFixed(4)}`);
            }
        }

        // Compute feature importance
        this.computeFeatureImportance();

        this.trainingStats = {
            numTrees: this.trees.length,
            finalTrainLoss: this.computeMSE(trainPreds, y_train),
            finalValLoss: bestValLoss,
            trainSize: X_train.length,
            valSize: X_val.length
        };

        console.log('Training complete:', this.trainingStats);
        return this.trainingStats;
    }

    /**
     * Train a single decision tree
     */
    trainTree(X, y, depth) {
        // Base cases
        if (depth >= this.config.maxDepth || X.length < this.config.minSamplesLeaf * 2) {
            return { isLeaf: true, value: this.mean(y) };
        }

        // Find best split
        const { featureIdx, threshold, gain } = this.findBestSplit(X, y);

        if (gain <= 0) {
            return { isLeaf: true, value: this.mean(y) };
        }

        // Split data
        const leftIndices = [];
        const rightIndices = [];

        for (let i = 0; i < X.length; i++) {
            if (X[i][featureIdx] <= threshold) {
                leftIndices.push(i);
            } else {
                rightIndices.push(i);
            }
        }

        if (leftIndices.length < this.config.minSamplesLeaf ||
            rightIndices.length < this.config.minSamplesLeaf) {
            return { isLeaf: true, value: this.mean(y) };
        }

        // Recurse
        const leftX = leftIndices.map(i => X[i]);
        const leftY = leftIndices.map(i => y[i]);
        const rightX = rightIndices.map(i => X[i]);
        const rightY = rightIndices.map(i => y[i]);

        return {
            isLeaf: false,
            featureIdx,
            threshold,
            gain,
            left: this.trainTree(leftX, leftY, depth + 1),
            right: this.trainTree(rightX, rightY, depth + 1)
        };
    }

    /**
     * Find the best split for a node
     */
    findBestSplit(X, y) {
        const numFeatures = X[0].length;
        let bestGain = -Infinity;
        let bestFeature = 0;
        let bestThreshold = 0;

        // Sample features
        const featureIndices = this.sampleFeatures(numFeatures);

        const currentVariance = this.variance(y);

        for (const featureIdx of featureIndices) {
            // Get unique values for this feature
            const values = X.map(x => x[featureIdx]).filter(v => !isNaN(v));
            const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

            // Try splits at midpoints
            for (let i = 0; i < uniqueValues.length - 1; i++) {
                const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

                const leftY = [];
                const rightY = [];

                for (let j = 0; j < X.length; j++) {
                    if (X[j][featureIdx] <= threshold) {
                        leftY.push(y[j]);
                    } else {
                        rightY.push(y[j]);
                    }
                }

                if (leftY.length < this.config.minSamplesLeaf ||
                    rightY.length < this.config.minSamplesLeaf) {
                    continue;
                }

                // Compute gain (variance reduction)
                const leftWeight = leftY.length / y.length;
                const rightWeight = rightY.length / y.length;
                const gain = currentVariance -
                    leftWeight * this.variance(leftY) -
                    rightWeight * this.variance(rightY);

                if (gain > bestGain) {
                    bestGain = gain;
                    bestFeature = featureIdx;
                    bestThreshold = threshold;
                }
            }
        }

        return { featureIdx: bestFeature, threshold: bestThreshold, gain: bestGain };
    }

    /**
     * Make prediction with a single tree
     */
    predictTree(tree, x) {
        if (tree.isLeaf) {
            return tree.value;
        }

        if (x[tree.featureIdx] <= tree.threshold) {
            return this.predictTree(tree.left, x);
        } else {
            return this.predictTree(tree.right, x);
        }
    }

    /**
     * Make prediction with the full ensemble
     */
    predict(features) {
        const x = this.featuresToVector(features);

        let prediction = 0;
        for (const tree of this.trees) {
            prediction += this.config.learningRate * this.predictTree(tree, x);
        }

        return prediction;
    }

    /**
     * Predict delta run expectancy for a matchup
     */
    predictDeltaRE(homeFeatures, awayFeatures, context = {}) {
        // Combine features for prediction
        const combinedFeatures = {
            ...homeFeatures,
            ...Object.fromEntries(
                Object.entries(awayFeatures).map(([k, v]) => [`away_${k}`, v])
            )
        };

        const runDiff = this.predict(combinedFeatures);

        // Use base run expectancy adjusted by prediction
        const baseRuns = 4.5; // League average runs per team per game

        return {
            home: baseRuns + runDiff / 2,
            away: baseRuns - runDiff / 2,
            differential: runDiff
        };
    }

    /**
     * Predict over/under probability
     */
    predictOverProb(projectedTotal, line) {
        // Use logistic function centered on the line
        const diff = projectedTotal - line;
        const sigma = 1.5; // Standard deviation of total runs error

        return 1 / (1 + Math.exp(-diff / sigma));
    }

    /**
     * Validate model on test data
     */
    async validate(testData) {
        const predictions = testData.map(d => this.predict(d));
        const actuals = testData.map(d => d.actualResult?.runDifferential || 0);

        const mse = this.computeMSE(predictions, actuals);
        const mae = this.computeMAE(predictions, actuals);
        const r2 = this.computeR2(predictions, actuals);

        // Direction accuracy (predicting correct winner)
        let correctDirection = 0;
        for (let i = 0; i < predictions.length; i++) {
            if ((predictions[i] > 0 && actuals[i] > 0) ||
                (predictions[i] < 0 && actuals[i] < 0) ||
                (predictions[i] === 0 && actuals[i] === 0)) {
                correctDirection++;
            }
        }

        return {
            mse,
            rmse: Math.sqrt(mse),
            mae,
            r2,
            directionAccuracy: correctDirection / predictions.length,
            numSamples: testData.length
        };
    }

    /**
     * Compute feature importance
     */
    computeFeatureImportance() {
        const importance = {};

        for (const name of this.featureNames) {
            importance[name] = 0;
        }

        const countSplits = (tree, depth = 0) => {
            if (tree.isLeaf) return;

            const featureName = this.featureNames[tree.featureIdx];
            if (featureName) {
                // Weight by gain and depth
                importance[featureName] += tree.gain / (depth + 1);
            }

            countSplits(tree.left, depth + 1);
            countSplits(tree.right, depth + 1);
        };

        for (const tree of this.trees) {
            countSplits(tree);
        }

        // Normalize
        const total = Object.values(importance).reduce((s, v) => s + v, 0) || 1;
        for (const key of Object.keys(importance)) {
            importance[key] /= total;
        }

        this.featureImportance = importance;
        return importance;
    }

    /**
     * Convert features object to vector
     * @param {Object} features - Feature object
     * @returns {Array} Feature vector with NaN handling and warnings
     */
    featuresToVector(features) {
        // CRITICAL FIX: Warn about missing features (silent 0 replacement was hiding data issues)
        let missingCount = 0;

        const vector = this.featureNames.map(name => {
            const value = features[name];
            if (value === undefined || value === null || isNaN(value)) {
                missingCount++;
                return 0; // Still return 0, but track it
            }
            return value;
        });

        // Log warning if too many features are missing (indicates data problem)
        if (missingCount > this.featureNames.length * 0.3) {
            console.warn(`featuresToVector: ${missingCount}/${this.featureNames.length} features missing - check data pipeline`);
        }

        return vector;
    }

    // === Utility Methods ===

    /**
     * Seeded pseudo-random number generator (Linear Congruential Generator)
     * CRITICAL FIX: Replaces Math.random() for reproducible results
     * @returns {number} Random number in [0, 1)
     */
    _seededRandom() {
        // LCG parameters (same as glibc)
        const a = 1103515245;
        const c = 12345;
        const m = 2147483648; // 2^31

        this._randomState = (a * this._randomState + c) % m;
        return this._randomState / m;
    }

    /**
     * Reset random seed (call before training for reproducibility)
     * @param {number} seed - New seed value
     */
    setSeed(seed) {
        this._randomSeed = seed;
        this._randomState = seed;
    }

    /**
     * Shuffle array using seeded RNG
     * CRITICAL FIX: Uses seeded random for reproducible shuffles
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this._seededRandom() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Subsample data using seeded RNG
     * CRITICAL FIX: Uses seeded random for reproducible subsampling
     */
    subsample(X, y) {
        const n = Math.floor(X.length * this.config.subsampleRate);
        const indices = [];

        for (let i = 0; i < n; i++) {
            indices.push(Math.floor(this._seededRandom() * X.length));
        }

        return {
            sampledX: indices.map(i => X[i]),
            sampledResiduals: indices.map(i => y[i]),
            sampledIndices: indices
        };
    }

    /**
     * Sample features using seeded RNG
     * CRITICAL FIX: Uses seeded random for reproducible feature selection
     */
    sampleFeatures(numFeatures) {
        const n = Math.floor(numFeatures * this.config.featureSubsampleRate);
        const indices = [];
        const available = Array.from({ length: numFeatures }, (_, i) => i);

        for (let i = 0; i < n; i++) {
            const idx = Math.floor(this._seededRandom() * available.length);
            indices.push(available[idx]);
            available.splice(idx, 1);
        }

        return indices;
    }

    mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((s, v) => s + v, 0) / arr.length;
    }

    variance(arr) {
        if (arr.length === 0) return 0;
        const m = this.mean(arr);
        return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
    }

    computeMSE(predictions, actuals) {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            sum += (predictions[i] - actuals[i]) ** 2;
        }
        return sum / predictions.length;
    }

    computeMAE(predictions, actuals) {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            sum += Math.abs(predictions[i] - actuals[i]);
        }
        return sum / predictions.length;
    }

    computeR2(predictions, actuals) {
        const meanActual = this.mean(actuals);
        let ssRes = 0;
        let ssTot = 0;

        for (let i = 0; i < predictions.length; i++) {
            ssRes += (actuals[i] - predictions[i]) ** 2;
            ssTot += (actuals[i] - meanActual) ** 2;
        }

        return 1 - (ssRes / (ssTot || 1));
    }

    /**
     * Export model for serialization
     * @returns {Object} Serializable model data
     */
    exportModel() {
        // CRITICAL FIX: Validate model is trained before export
        if (this.trees.length === 0) {
            console.warn('exportModel called on untrained model');
        }

        return {
            version: this.version,
            config: this.config,
            trees: this.trees,
            featureImportance: this.featureImportance,
            featureNames: this.featureNames,
            trainingStats: this.trainingStats || {
                numTrees: 0,
                finalTrainLoss: null,
                finalValLoss: null,
                trainSize: 0,
                valSize: 0,
                warning: 'Model not yet trained'
            },
            randomSeed: this._randomSeed
        };
    }

    /**
     * Import model from serialization
     */
    importModel(data) {
        this.version = data.version;
        this.config = { ...this.config, ...data.config };
        this.trees = data.trees;
        this.featureImportance = data.featureImportance;
        this.featureNames = data.featureNames;
        this.trainingStats = data.trainingStats;
    }
}
