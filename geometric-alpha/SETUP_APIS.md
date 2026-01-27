# API Setup Guide

This guide lists all the APIs and services needed for the Geometric Alpha betting system.

---

## Required APIs

### 1. Voyage AI (Embeddings)
**Purpose**: Semantic game similarity, player profile embeddings, feature enrichment

**Get your API key**: https://dash.voyageai.com/

**Pricing**:
- Free tier: 50M tokens/month
- voyage-3-lite: $0.02/1M tokens (recommended)
- voyage-3: $0.06/1M tokens (best quality)

**Setup**:
```bash
pip install voyageai

# Set environment variable
export VOYAGE_API_KEY="your-key-here"
```

**Usage in system**:
```python
from integrations.voyage_embeddings import VoyageEmbeddings

voyage = VoyageEmbeddings()  # Uses VOYAGE_API_KEY env var
```

---

### 2. The-Odds-API (Betting Odds)
**Purpose**: Historical and live betting odds for MLB

**Get your API key**: https://the-odds-api.com/

**Pricing**:
- Free tier: 500 requests/month
- Starter: $19/month for 10,000 requests
- Pro: $79/month for 100,000 requests

**Setup**:
```bash
# Set in config or environment
export ODDS_API_KEY="your-key-here"
```

**Or in config/settings.py**:
```python
@dataclass
class DataConfig:
    odds_api_key: str = "your-key-here"
```

---

## Optional APIs (Nice to Have)

### 3. Pinecone (Vector Database)
**Purpose**: Store and search game embeddings at scale

**Get started**: https://www.pinecone.io/

**When you need it**: When you have 10,000+ game embeddings

**Pricing**: Free tier includes 1 index with 100K vectors

---

### 4. Anthropic Claude (Analysis)
**Purpose**: Analyzing game contexts, generating insights

**Get your API key**: https://console.anthropic.com/

**When you need it**: For generating game narratives or analysis

---

## Data Sources (No API Key Needed)

### pybaseball (MLB Data)
**Purpose**: Statcast pitch tracking data

**Install**:
```bash
pip install pybaseball
```

**Usage**:
```python
import pybaseball as pb

# Fetch 2024 season data
data = pb.statcast(start_dt="2024-04-01", end_dt="2024-09-30")
```

---

## Quick Setup Script

Create a `.env` file in the project root:

```bash
# .env file
VOYAGE_API_KEY=your-voyage-key
ODDS_API_KEY=your-odds-api-key
```

Then load in Python:
```python
from dotenv import load_dotenv
load_dotenv()

# Now os.environ has your keys
```

**Install dotenv**:
```bash
pip install python-dotenv
```

---

## Complete Requirements

```bash
# Core ML
pip install numpy pandas scipy scikit-learn

# Models (pick one or both)
pip install xgboost
pip install lightgbm

# Optimization
pip install cvxpy

# Data
pip install pybaseball

# Embeddings
pip install voyageai

# Environment
pip install python-dotenv

# Optional: Vector DB
pip install pinecone-client
```

**Or install all at once**:
```bash
pip install -r requirements.txt
```

---

## Verify Setup

Run this script to verify all APIs are configured:

```python
#!/usr/bin/env python3
"""Verify API setup for Geometric Alpha."""

import os
from dotenv import load_dotenv

load_dotenv()

def check_api(name, env_var, test_func=None):
    key = os.environ.get(env_var)
    if key:
        print(f"✓ {name}: Configured")
        if test_func:
            try:
                test_func(key)
                print(f"  └─ Connection: OK")
            except Exception as e:
                print(f"  └─ Connection: FAILED ({e})")
    else:
        print(f"✗ {name}: NOT CONFIGURED (set {env_var})")

def test_voyage(key):
    import voyageai
    client = voyageai.Client(api_key=key)
    result = client.embed(["test"], model="voyage-3-lite")
    assert len(result.embeddings) == 1

def test_odds_api(key):
    import requests
    resp = requests.get(
        "https://api.the-odds-api.com/v4/sports",
        params={"apiKey": key}
    )
    assert resp.status_code == 200

print("=" * 50)
print("GEOMETRIC ALPHA - API VERIFICATION")
print("=" * 50)
print()

# Check Voyage AI
check_api("Voyage AI", "VOYAGE_API_KEY", test_voyage)

# Check Odds API
check_api("The-Odds-API", "ODDS_API_KEY", test_odds_api)

# Check pybaseball (no key needed)
try:
    import pybaseball
    print("✓ pybaseball: Installed")
except ImportError:
    print("✗ pybaseball: NOT INSTALLED (pip install pybaseball)")

# Check ML libraries
for lib in ["xgboost", "lightgbm", "cvxpy"]:
    try:
        __import__(lib)
        print(f"✓ {lib}: Installed")
    except ImportError:
        print(f"✗ {lib}: NOT INSTALLED (pip install {lib})")

print()
print("=" * 50)
```

Save as `verify_setup.py` and run:
```bash
python verify_setup.py
```

---

## What Each API Does in the System

| API | Module | Purpose |
|-----|--------|---------|
| **Voyage AI** | `integrations/voyage_embeddings.py` | Create game embeddings, find similar historical games |
| **The-Odds-API** | `data/odds.py` | Fetch betting lines, track CLV |
| **pybaseball** | `data/statcast.py` | Pitch tracking data for geometric features |

---

## Minimum Viable Setup

To run paper trading with basic features:

1. **Required**: pybaseball (free, no key)
2. **Recommended**: Voyage AI (free tier works)
3. **For live odds**: The-Odds-API (free tier works for testing)

```bash
# Minimum install
pip install pybaseball voyageai xgboost cvxpy pandas numpy scipy scikit-learn

# Set Voyage key
export VOYAGE_API_KEY="your-key"

# Run training
python -c "from training.enhanced_pipeline import train_with_current_data; train_with_current_data()"
```

---

## Getting Help

- **Voyage AI docs**: https://docs.voyageai.com/
- **The-Odds-API docs**: https://the-odds-api.com/liveapi/guides/v4/
- **pybaseball docs**: https://github.com/jldbc/pybaseball

---

## Cost Estimate (Monthly)

For active paper trading (~100 games/week):

| Service | Usage | Cost |
|---------|-------|------|
| Voyage AI | ~5M tokens | Free tier |
| The-Odds-API | ~1,000 requests | Free tier |
| **Total** | | **$0/month** |

For live trading at scale:

| Service | Usage | Cost |
|---------|-------|------|
| Voyage AI | ~50M tokens | $0-2 |
| The-Odds-API | ~50,000 requests | $79/month |
| **Total** | | **~$80/month** |
