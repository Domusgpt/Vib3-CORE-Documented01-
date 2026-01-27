"""
Voyage AI Integration for Geometric Alpha

Uses Voyage embeddings to enhance the betting system with:
1. Game similarity search (find historical games like today's)
2. Pitcher/batter profile embeddings
3. Situational embeddings for context-aware predictions
4. Feature enrichment for XGBoost models

Voyage AI provides high-quality embeddings that can capture
semantic relationships traditional features miss.

Setup:
    pip install voyageai

Usage:
    from integrations.voyage_embeddings import VoyageEmbeddings

    voyage = VoyageEmbeddings(api_key="your-key")

    # Embed a game context
    game_text = "Yankees vs Red Sox, Cole pitching, day game at Fenway"
    embedding = voyage.embed_game_context(game_text)

    # Find similar historical games
    similar_games = voyage.find_similar_games(game_text, historical_games)
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
import logging
import json
import os

try:
    import voyageai
    VOYAGE_AVAILABLE = True
except ImportError:
    VOYAGE_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class EmbeddingConfig:
    """Configuration for Voyage embeddings."""
    # Model selection
    # voyage-3 (best quality) or voyage-3-lite (faster/cheaper)
    model: str = "voyage-3-lite"

    # Embedding dimensions
    # voyage-3: 1024 dims, voyage-3-lite: 512 dims
    dimensions: int = 512

    # Batch settings
    batch_size: int = 128

    # Cache settings
    cache_embeddings: bool = True
    cache_dir: Path = Path("./data_lake/embeddings")


@dataclass
class GameEmbedding:
    """Embedded game context."""
    game_id: str
    embedding: np.ndarray
    context_text: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class VoyageEmbeddings:
    """
    Voyage AI integration for semantic game analysis.

    Key capabilities:
    1. embed_game_context(): Create embedding for game description
    2. embed_pitcher_profile(): Create embedding for pitcher style
    3. find_similar_games(): Find historically similar matchups
    4. enrich_features(): Add embedding features to XGBoost
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        config: EmbeddingConfig = None
    ):
        """
        Initialize Voyage AI client.

        Args:
            api_key: Voyage API key (or set VOYAGE_API_KEY env var)
            config: Embedding configuration
        """
        self.config = config or EmbeddingConfig()

        if not VOYAGE_AVAILABLE:
            raise ImportError(
                "voyageai not installed. Run: pip install voyageai"
            )

        # Get API key
        self.api_key = api_key or os.environ.get("VOYAGE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Voyage API key required. Pass api_key or set VOYAGE_API_KEY env var.\n"
                "Get your key at: https://dash.voyageai.com/"
            )

        # Initialize client
        self.client = voyageai.Client(api_key=self.api_key)

        # Cache setup
        if self.config.cache_embeddings:
            self.config.cache_dir.mkdir(parents=True, exist_ok=True)

        # In-memory cache
        self._embedding_cache: Dict[str, np.ndarray] = {}

        logger.info(f"Voyage AI initialized with model: {self.config.model}")

    def embed_text(self, text: str) -> np.ndarray:
        """
        Embed a single text string.

        Args:
            text: Text to embed

        Returns:
            Numpy array of embedding
        """
        # Check cache
        cache_key = hash(text)
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        # Call Voyage API
        result = self.client.embed(
            texts=[text],
            model=self.config.model,
            input_type="document"
        )

        embedding = np.array(result.embeddings[0])

        # Cache
        self._embedding_cache[cache_key] = embedding

        return embedding

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        Embed multiple texts efficiently.

        Args:
            texts: List of texts to embed

        Returns:
            Numpy array of shape (n_texts, embedding_dim)
        """
        all_embeddings = []

        # Process in batches
        for i in range(0, len(texts), self.config.batch_size):
            batch = texts[i:i + self.config.batch_size]

            result = self.client.embed(
                texts=batch,
                model=self.config.model,
                input_type="document"
            )

            all_embeddings.extend(result.embeddings)

        return np.array(all_embeddings)

    def embed_game_context(
        self,
        game_id: str,
        home_team: str,
        away_team: str,
        home_pitcher: str = None,
        away_pitcher: str = None,
        venue: str = None,
        time_of_day: str = None,
        weather: str = None,
        additional_context: str = None
    ) -> GameEmbedding:
        """
        Create rich embedding for a game context.

        This captures the semantic "feel" of a game that
        numerical features miss.

        Args:
            game_id: Unique game identifier
            home_team: Home team name
            away_team: Away team name
            home_pitcher: Starting pitcher for home
            away_pitcher: Starting pitcher for away
            venue: Stadium name
            time_of_day: "day" or "night"
            weather: Weather description
            additional_context: Any extra context

        Returns:
            GameEmbedding with vector and metadata
        """
        # Build context text
        parts = [
            f"{away_team} at {home_team}",
        ]

        if home_pitcher:
            parts.append(f"{home_pitcher} pitching for {home_team}")
        if away_pitcher:
            parts.append(f"{away_pitcher} pitching for {away_team}")
        if venue:
            parts.append(f"at {venue}")
        if time_of_day:
            parts.append(f"{time_of_day} game")
        if weather:
            parts.append(f"weather: {weather}")
        if additional_context:
            parts.append(additional_context)

        context_text = ", ".join(parts)

        embedding = self.embed_text(context_text)

        return GameEmbedding(
            game_id=game_id,
            embedding=embedding,
            context_text=context_text,
            metadata={
                'home_team': home_team,
                'away_team': away_team,
                'home_pitcher': home_pitcher,
                'away_pitcher': away_pitcher,
                'venue': venue,
            }
        )

    def embed_pitcher_profile(
        self,
        pitcher_name: str,
        pitch_types: List[str],
        avg_velocity: float,
        strikeout_rate: float,
        walk_rate: float,
        era: float,
        handedness: str = "R",
        style_description: str = None
    ) -> np.ndarray:
        """
        Create embedding for a pitcher's profile.

        Captures the "style" of a pitcher in semantic space.

        Args:
            pitcher_name: Pitcher's name
            pitch_types: List of pitch types thrown (FF, SL, CH, etc.)
            avg_velocity: Average fastball velocity
            strikeout_rate: K/9 rate
            walk_rate: BB/9 rate
            era: Earned run average
            handedness: L or R
            style_description: Optional text description

        Returns:
            Embedding vector
        """
        # Build profile text
        hand = "left-handed" if handedness == "L" else "right-handed"
        pitches = ", ".join(pitch_types)

        profile_parts = [
            f"{pitcher_name} is a {hand} pitcher",
            f"throws {pitches}",
            f"averages {avg_velocity:.1f} mph on fastball",
            f"{strikeout_rate:.1f} strikeouts per 9 innings",
            f"{walk_rate:.1f} walks per 9 innings",
            f"{era:.2f} ERA",
        ]

        if style_description:
            profile_parts.append(style_description)

        profile_text = ", ".join(profile_parts)

        return self.embed_text(profile_text)

    def find_similar_games(
        self,
        query_game: GameEmbedding,
        historical_games: List[GameEmbedding],
        top_k: int = 10
    ) -> List[Tuple[GameEmbedding, float]]:
        """
        Find historically similar games using embedding similarity.

        This is KEY for betting: finding past situations similar
        to today's game to estimate outcomes.

        Args:
            query_game: The game to find matches for
            historical_games: List of historical game embeddings
            top_k: Number of similar games to return

        Returns:
            List of (game, similarity_score) tuples, sorted by similarity
        """
        if not historical_games:
            return []

        # Stack historical embeddings
        hist_embeddings = np.array([g.embedding for g in historical_games])

        # Compute cosine similarity
        query_norm = query_game.embedding / np.linalg.norm(query_game.embedding)
        hist_norms = hist_embeddings / np.linalg.norm(hist_embeddings, axis=1, keepdims=True)

        similarities = np.dot(hist_norms, query_norm)

        # Get top-k
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = [
            (historical_games[i], float(similarities[i]))
            for i in top_indices
        ]

        return results

    def similarity_based_prediction(
        self,
        query_game: GameEmbedding,
        historical_games: List[GameEmbedding],
        historical_outcomes: Dict[str, bool],  # game_id -> home_won
        top_k: int = 20,
        similarity_threshold: float = 0.7
    ) -> Dict[str, Any]:
        """
        Predict game outcome based on similar historical games.

        This provides a "sanity check" against the XGBoost model.
        If embedding similarity says 70% home win but XGBoost says 30%,
        that's a red flag.

        Args:
            query_game: Game to predict
            historical_games: Historical game embeddings
            historical_outcomes: Outcomes for historical games
            top_k: Number of similar games to consider
            similarity_threshold: Minimum similarity to include

        Returns:
            Dict with prediction and confidence
        """
        similar = self.find_similar_games(query_game, historical_games, top_k)

        # Filter by threshold
        relevant = [(g, s) for g, s in similar if s >= similarity_threshold]

        if not relevant:
            return {
                'prediction': None,
                'confidence': 0.0,
                'n_similar_games': 0,
                'warning': f"No similar games above threshold {similarity_threshold}"
            }

        # Weighted vote based on similarity
        home_win_weight = 0.0
        total_weight = 0.0

        for game, sim in relevant:
            outcome = historical_outcomes.get(game.game_id)
            if outcome is not None:
                weight = sim ** 2  # Square similarity for stronger weighting
                total_weight += weight
                if outcome:
                    home_win_weight += weight

        if total_weight == 0:
            return {
                'prediction': None,
                'confidence': 0.0,
                'n_similar_games': len(relevant),
                'warning': "No outcome data for similar games"
            }

        home_win_prob = home_win_weight / total_weight

        return {
            'home_win_prob': float(home_win_prob),
            'away_win_prob': float(1 - home_win_prob),
            'confidence': float(np.mean([s for _, s in relevant])),
            'n_similar_games': len(relevant),
            'similar_games': [(g.game_id, s) for g, s in relevant[:5]]  # Top 5 for reference
        }

    def enrich_features(
        self,
        features_df: pd.DataFrame,
        game_contexts: Dict[str, GameEmbedding],
        prefix: str = "emb_"
    ) -> pd.DataFrame:
        """
        Add embedding features to feature DataFrame for XGBoost.

        Reduces embedding dimensions using PCA and adds as features.

        Args:
            features_df: Feature DataFrame with game_id column
            game_contexts: Dict of game_id -> GameEmbedding
            prefix: Prefix for embedding feature columns

        Returns:
            DataFrame with added embedding features
        """
        from sklearn.decomposition import PCA

        # Get embeddings for games in DataFrame
        game_ids = features_df['game_id'].tolist()

        embeddings = []
        valid_mask = []

        for gid in game_ids:
            if gid in game_contexts:
                embeddings.append(game_contexts[gid].embedding)
                valid_mask.append(True)
            else:
                embeddings.append(np.zeros(self.config.dimensions))
                valid_mask.append(False)

        embeddings = np.array(embeddings)

        # Reduce dimensions for XGBoost (full embedding too large)
        n_components = min(32, len(embeddings), self.config.dimensions)
        pca = PCA(n_components=n_components)

        # Fit only on valid embeddings
        valid_embeddings = embeddings[valid_mask]
        if len(valid_embeddings) > n_components:
            pca.fit(valid_embeddings)
            reduced = pca.transform(embeddings)
        else:
            reduced = embeddings[:, :n_components]

        # Add to DataFrame
        result = features_df.copy()
        for i in range(reduced.shape[1]):
            result[f"{prefix}{i}"] = reduced[:, i]

        logger.info(f"Added {reduced.shape[1]} embedding features to DataFrame")

        return result

    def save_embeddings(self, embeddings: List[GameEmbedding], path: str):
        """Save embeddings to disk for reuse."""
        save_path = Path(path)
        save_path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            'embeddings': [
                {
                    'game_id': e.game_id,
                    'embedding': e.embedding.tolist(),
                    'context_text': e.context_text,
                    'metadata': e.metadata
                }
                for e in embeddings
            ]
        }

        with open(save_path, 'w') as f:
            json.dump(data, f)

        logger.info(f"Saved {len(embeddings)} embeddings to {save_path}")

    def load_embeddings(self, path: str) -> List[GameEmbedding]:
        """Load embeddings from disk."""
        with open(path, 'r') as f:
            data = json.load(f)

        embeddings = [
            GameEmbedding(
                game_id=e['game_id'],
                embedding=np.array(e['embedding']),
                context_text=e['context_text'],
                metadata=e['metadata']
            )
            for e in data['embeddings']
        ]

        logger.info(f"Loaded {len(embeddings)} embeddings from {path}")
        return embeddings


# =============================================================================
# INTEGRATION WITH TRAINING PIPELINE
# =============================================================================

def create_game_embeddings_from_statcast(
    voyage: VoyageEmbeddings,
    games_df: pd.DataFrame
) -> Dict[str, GameEmbedding]:
    """
    Create embeddings for all games in a Statcast-derived DataFrame.

    Args:
        voyage: VoyageEmbeddings instance
        games_df: DataFrame with game info (home_team, away_team, etc.)

    Returns:
        Dict mapping game_id to GameEmbedding
    """
    embeddings = {}

    for _, row in games_df.iterrows():
        game_id = str(row.get('game_pk', row.name))

        emb = voyage.embed_game_context(
            game_id=game_id,
            home_team=row.get('home_team', 'Home'),
            away_team=row.get('away_team', 'Away'),
            home_pitcher=row.get('home_pitcher', None),
            away_pitcher=row.get('away_pitcher', None),
            venue=row.get('venue', None),
        )

        embeddings[game_id] = emb

    logger.info(f"Created {len(embeddings)} game embeddings")
    return embeddings


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

def example_usage():
    """
    Example of how to use Voyage embeddings with the betting system.
    """
    # Initialize (requires API key)
    voyage = VoyageEmbeddings(api_key=os.environ.get("VOYAGE_API_KEY"))

    # Create embedding for today's game
    todays_game = voyage.embed_game_context(
        game_id="NYY_BOS_20240715",
        home_team="Boston Red Sox",
        away_team="New York Yankees",
        home_pitcher="Chris Sale",
        away_pitcher="Gerrit Cole",
        venue="Fenway Park",
        time_of_day="night",
        weather="clear, 72F"
    )

    print(f"Game embedding shape: {todays_game.embedding.shape}")
    print(f"Context: {todays_game.context_text}")

    # In real usage, you'd:
    # 1. Load historical game embeddings
    # 2. Find similar games
    # 3. Use for prediction sanity check


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    example_usage()
