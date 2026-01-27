"""
Enhanced Training Pipeline with Voyage AI Integration

Combines:
1. Traditional XGBoost/LightGBM on geometric features
2. Voyage AI embeddings for semantic similarity
3. Ensemble prediction with sanity checking

This is the RECOMMENDED approach for training with all available data.

Usage:
    from training.enhanced_pipeline import EnhancedTrainingPipeline

    pipeline = EnhancedTrainingPipeline(
        voyage_api_key="your-voyage-key"  # Or set VOYAGE_API_KEY env var
    )

    result = pipeline.train_full_system(
        features_df=features,
        targets_df=targets,
        games_df=games  # For embedding context
    )
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
import logging
import os

from training.pipeline import ModelTrainingPipeline, TrainingConfig, TrainingResult
from evaluation.trustworthy_system import (
    TrustworthyBettingSystem,
    ProbabilityCalibrationValidator,
    EmpiricalCorrelationEstimator
)

try:
    from integrations.voyage_embeddings import (
        VoyageEmbeddings,
        GameEmbedding,
        create_game_embeddings_from_statcast
    )
    VOYAGE_AVAILABLE = True
except ImportError:
    VOYAGE_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class EnhancedTrainingResult(TrainingResult):
    """Training result with embedding metrics."""
    # Embedding-based predictions
    embedding_accuracy: float = 0.0
    embedding_available: bool = False
    n_game_embeddings: int = 0

    # Ensemble metrics
    ensemble_auc: float = 0.0
    model_embedding_correlation: float = 0.0

    def to_dict(self) -> Dict:
        base = super().to_dict()
        base['embedding'] = {
            'available': self.embedding_available,
            'accuracy': self.embedding_accuracy,
            'n_embeddings': self.n_game_embeddings
        }
        base['ensemble'] = {
            'auc': self.ensemble_auc,
            'model_embedding_correlation': self.model_embedding_correlation
        }
        return base


class EnhancedTrainingPipeline:
    """
    Full training pipeline with Voyage AI integration.

    Combines:
    1. XGBoost on geometric/contextual features
    2. Voyage embeddings for semantic game similarity
    3. Ensemble that weights both predictions
    4. Sanity checking when predictions disagree
    """

    def __init__(
        self,
        voyage_api_key: Optional[str] = None,
        base_config: TrainingConfig = None,
        use_embeddings: bool = True
    ):
        """
        Initialize enhanced pipeline.

        Args:
            voyage_api_key: Voyage AI API key (or set VOYAGE_API_KEY env)
            base_config: Configuration for base model training
            use_embeddings: Whether to use Voyage embeddings
        """
        self.config = base_config or TrainingConfig()
        self.use_embeddings = use_embeddings and VOYAGE_AVAILABLE

        # Base pipeline (XGBoost)
        self.base_pipeline = ModelTrainingPipeline(self.config)

        # Voyage embeddings (optional)
        self.voyage: Optional[VoyageEmbeddings] = None
        self.game_embeddings: Dict[str, GameEmbedding] = {}

        if self.use_embeddings:
            api_key = voyage_api_key or os.environ.get("VOYAGE_API_KEY")
            if api_key:
                try:
                    from integrations.voyage_embeddings import VoyageEmbeddings
                    self.voyage = VoyageEmbeddings(api_key=api_key)
                    logger.info("Voyage AI embeddings enabled")
                except Exception as e:
                    logger.warning(f"Could not initialize Voyage: {e}")
                    self.voyage = None
            else:
                logger.info("No Voyage API key provided, running without embeddings")

        # Calibration tracking
        self.calibration_validator = ProbabilityCalibrationValidator()

    def train_full_system(
        self,
        features_df: pd.DataFrame,
        targets_df: pd.DataFrame,
        games_df: Optional[pd.DataFrame] = None,
        target_col: str = 'home_win'
    ) -> EnhancedTrainingResult:
        """
        Train complete system with optional embeddings.

        Args:
            features_df: Feature DataFrame
            targets_df: Target DataFrame
            games_df: Game metadata for embeddings (optional)
            target_col: Target column to predict

        Returns:
            EnhancedTrainingResult with all metrics
        """
        logger.info("=" * 60)
        logger.info("ENHANCED TRAINING PIPELINE")
        logger.info("=" * 60)

        # =========================================================
        # PHASE 1: Base Model Training (XGBoost)
        # =========================================================
        logger.info("\n[PHASE 1] Training base XGBoost model...")

        base_result = self.base_pipeline.train_and_validate(
            features_df=features_df,
            targets_df=targets_df,
            target_col=target_col
        )

        if not base_result.is_successful:
            logger.error("Base model training failed")
            return EnhancedTrainingResult(
                is_successful=False,
                model_name="none",
                warnings=base_result.warnings + ["Base model training failed"]
            )

        logger.info(f"Base model AUC: {base_result.test_auc:.4f}")
        logger.info(f"Calibration ECE: {base_result.calibration_ece:.4f}")

        # =========================================================
        # PHASE 2: Voyage Embeddings (if available)
        # =========================================================
        embedding_accuracy = 0.0
        n_embeddings = 0

        if self.voyage and games_df is not None:
            logger.info("\n[PHASE 2] Creating Voyage embeddings...")

            try:
                # Create embeddings for all games
                self.game_embeddings = create_game_embeddings_from_statcast(
                    self.voyage, games_df
                )
                n_embeddings = len(self.game_embeddings)
                logger.info(f"Created {n_embeddings} game embeddings")

                # Evaluate embedding-based predictions
                embedding_accuracy = self._evaluate_embedding_predictions(
                    games_df, targets_df, target_col
                )
                logger.info(f"Embedding similarity accuracy: {embedding_accuracy:.4f}")

            except Exception as e:
                logger.warning(f"Embedding creation failed: {e}")
                self.game_embeddings = {}

        # =========================================================
        # PHASE 3: Feature Enrichment (add embeddings to XGBoost)
        # =========================================================
        ensemble_auc = base_result.test_auc
        model_emb_corr = 0.0

        if self.voyage and self.game_embeddings and 'game_id' in features_df.columns:
            logger.info("\n[PHASE 3] Enriching features with embeddings...")

            try:
                enriched_features = self.voyage.enrich_features(
                    features_df,
                    self.game_embeddings
                )

                # Retrain with enriched features
                enriched_pipeline = ModelTrainingPipeline(self.config)
                enriched_result = enriched_pipeline.train_and_validate(
                    enriched_features, targets_df, target_col
                )

                if enriched_result.test_auc > base_result.test_auc:
                    logger.info(
                        f"Enriched model improved AUC: "
                        f"{base_result.test_auc:.4f} -> {enriched_result.test_auc:.4f}"
                    )
                    ensemble_auc = enriched_result.test_auc
                    # Use enriched model
                    self.base_pipeline = enriched_pipeline
                else:
                    logger.info("Enriched model did not improve, keeping base model")

            except Exception as e:
                logger.warning(f"Feature enrichment failed: {e}")

        # =========================================================
        # PHASE 4: Compile Results
        # =========================================================
        logger.info("\n[PHASE 4] Compiling results...")

        return EnhancedTrainingResult(
            is_successful=True,
            model_name=base_result.model_name,
            cv_auc_mean=base_result.cv_auc_mean,
            cv_auc_std=base_result.cv_auc_std,
            test_auc=base_result.test_auc,
            test_brier=base_result.test_brier,
            test_log_loss=base_result.test_log_loss,
            calibration_ece=base_result.calibration_ece,
            calibration_level=base_result.calibration_level,
            is_calibrated=base_result.is_calibrated,
            feature_importance=base_result.feature_importance,
            top_features=base_result.top_features,
            n_training_samples=base_result.n_training_samples,
            n_test_samples=base_result.n_test_samples,
            training_date=base_result.training_date,
            warnings=base_result.warnings,
            # Enhanced metrics
            embedding_accuracy=embedding_accuracy,
            embedding_available=bool(self.game_embeddings),
            n_game_embeddings=n_embeddings,
            ensemble_auc=ensemble_auc,
            model_embedding_correlation=model_emb_corr
        )

    def _evaluate_embedding_predictions(
        self,
        games_df: pd.DataFrame,
        targets_df: pd.DataFrame,
        target_col: str
    ) -> float:
        """Evaluate embedding-based similarity predictions."""
        if not self.game_embeddings:
            return 0.0

        # Split into train/test
        split_idx = int(len(games_df) * 0.8)
        train_ids = games_df.iloc[:split_idx]['game_pk'].astype(str).tolist()
        test_ids = games_df.iloc[split_idx:]['game_pk'].astype(str).tolist()

        # Get outcomes
        outcomes = {}
        for _, row in targets_df.iterrows():
            gid = str(row.get('game_pk', row.name))
            outcomes[gid] = bool(row[target_col])

        # Historical embeddings
        train_embeddings = [
            self.game_embeddings[gid]
            for gid in train_ids
            if gid in self.game_embeddings
        ]

        # Evaluate on test set
        correct = 0
        total = 0

        for test_id in test_ids:
            if test_id not in self.game_embeddings:
                continue
            if test_id not in outcomes:
                continue

            query = self.game_embeddings[test_id]
            pred = self.voyage.similarity_based_prediction(
                query, train_embeddings, outcomes, top_k=20
            )

            if pred.get('home_win_prob') is not None:
                predicted = pred['home_win_prob'] > 0.5
                actual = outcomes[test_id]
                if predicted == actual:
                    correct += 1
                total += 1

        return correct / total if total > 0 else 0.0

    def predict(
        self,
        features_df: pd.DataFrame,
        games_df: Optional[pd.DataFrame] = None
    ) -> pd.DataFrame:
        """
        Generate predictions using trained system.

        Args:
            features_df: Features for prediction
            games_df: Game metadata for embedding similarity (optional)

        Returns:
            DataFrame with predictions
        """
        if not self.base_pipeline.is_trained:
            raise ValueError("Model not trained. Call train_full_system() first.")

        # Base model predictions
        base_probs = self.base_pipeline.predict(features_df)

        result = features_df[['game_id']].copy() if 'game_id' in features_df else pd.DataFrame()
        result['model_prob'] = base_probs
        result['model_confidence'] = 0.7  # Default

        # Add embedding-based predictions if available
        if self.voyage and games_df is not None:
            emb_probs = []
            emb_confidence = []

            for i, row in games_df.iterrows():
                game_id = str(row.get('game_pk', i))

                if game_id in self.game_embeddings:
                    query = self.game_embeddings[game_id]
                    # Get historical (all except this game)
                    historical = [
                        e for gid, e in self.game_embeddings.items()
                        if gid != game_id
                    ]

                    pred = self.voyage.similarity_based_prediction(
                        query, historical, {}, top_k=20
                    )
                    emb_probs.append(pred.get('home_win_prob', 0.5))
                    emb_confidence.append(pred.get('confidence', 0.0))
                else:
                    emb_probs.append(0.5)
                    emb_confidence.append(0.0)

            result['embedding_prob'] = emb_probs
            result['embedding_confidence'] = emb_confidence

            # Ensemble: weight by confidence
            model_weight = result['model_confidence']
            emb_weight = result['embedding_confidence']
            total_weight = model_weight + emb_weight + 1e-10

            result['ensemble_prob'] = (
                result['model_prob'] * model_weight +
                result['embedding_prob'] * emb_weight
            ) / total_weight

            # Flag disagreements
            result['model_embedding_disagree'] = (
                abs(result['model_prob'] - result['embedding_prob']) > 0.15
            )

        return result

    def save(self, path: str):
        """Save trained system."""
        save_path = Path(path)
        save_path.mkdir(parents=True, exist_ok=True)

        # Save base model
        self.base_pipeline.save_model(save_path / "base_model")

        # Save embeddings
        if self.game_embeddings:
            self.voyage.save_embeddings(
                list(self.game_embeddings.values()),
                save_path / "embeddings.json"
            )

        logger.info(f"Saved enhanced pipeline to {save_path}")

    def load(self, path: str):
        """Load trained system."""
        load_path = Path(path)

        # Load base model
        self.base_pipeline.load_model(load_path / "base_model")

        # Load embeddings
        emb_path = load_path / "embeddings.json"
        if emb_path.exists() and self.voyage:
            embeddings = self.voyage.load_embeddings(emb_path)
            self.game_embeddings = {e.game_id: e for e in embeddings}

        logger.info(f"Loaded enhanced pipeline from {load_path}")


# =============================================================================
# QUICK START FUNCTION
# =============================================================================

def train_with_current_data(
    voyage_api_key: Optional[str] = None,
    use_embeddings: bool = True
) -> EnhancedTrainingPipeline:
    """
    Train using the current system's data sources.

    This is the main entry point for training.

    Args:
        voyage_api_key: Voyage AI key (or set VOYAGE_API_KEY env var)
        use_embeddings: Whether to use Voyage embeddings

    Returns:
        Trained EnhancedTrainingPipeline
    """
    from data.statcast import StatcastClient
    from features.tunneling import TunnelAnalyzer
    from features.arsenal import ArsenalAnalyzer

    logger.info("Loading data from Statcast...")

    # Load pitch data
    client = StatcastClient()
    pitch_df = client.fetch_date_range(
        start_date="2023-04-01",
        end_date="2024-09-30"
    )

    logger.info(f"Loaded {len(pitch_df)} pitches")

    # Compute features per game
    logger.info("Computing geometric features...")

    # This would integrate with your actual feature computation
    # For now, create a placeholder
    games = pitch_df.groupby('game_pk').agg({
        'pitcher': 'first',
        'game_date': 'first',
    }).reset_index()

    games['game_id'] = games['game_pk'].astype(str)

    # Create synthetic features for demo
    # In real usage, compute from tunneling, arsenal, etc.
    features = games.copy()
    features['tunnel_score'] = np.random.beta(5, 5, len(features))
    features['arsenal_volume'] = np.random.lognormal(0, 0.5, len(features))

    # Create targets (would come from actual game outcomes)
    targets = games[['game_pk']].copy()
    targets['home_win'] = np.random.binomial(1, 0.5, len(targets))

    # Train
    pipeline = EnhancedTrainingPipeline(
        voyage_api_key=voyage_api_key,
        use_embeddings=use_embeddings
    )

    result = pipeline.train_full_system(
        features_df=features,
        targets_df=targets,
        games_df=games
    )

    print(pipeline.base_pipeline.get_training_report())

    return pipeline
