"""
External integrations for Geometric Alpha.

Available integrations:
- voyage_embeddings: Voyage AI for semantic game similarity
"""

try:
    from .voyage_embeddings import (
        VoyageEmbeddings,
        EmbeddingConfig,
        GameEmbedding,
        create_game_embeddings_from_statcast,
    )
    VOYAGE_AVAILABLE = True
except ImportError:
    VOYAGE_AVAILABLE = False

__all__ = [
    'VoyageEmbeddings',
    'EmbeddingConfig',
    'GameEmbedding',
    'create_game_embeddings_from_statcast',
    'VOYAGE_AVAILABLE',
]
