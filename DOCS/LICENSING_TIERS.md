# Licensing tiers (draft)

This document outlines the proposed licensing tiers for the VIB3+ SDK and agentic tooling. It is intended as a working draft for Phase 5.

## Proposed tiers
| Tier | Price | Revenue Limit | Key Features |
| --- | --- | --- | --- |
| Community | Free (MIT) | Non-commercial | Runtime access, watermark on exports |
| Indie | $29/mo | <$100K | Commercial use, standard formats |
| Studio | $99/mo/seat | <$500K | Priority support, all formats |
| Pro | $249/mo/seat | <$2M | Source access, custom shaders |
| Enterprise | Custom | $2M+ | Indemnification, dedicated support |
| OEM/White-Label | Custom annual | Any | Rebranding/redistribution rights |

## Activation workflow (draft)
1. User activates a license key via CLI or UI.
2. System stores a signed token locally for offline validation.
3. Periodic heartbeat validates subscription status.
4. Grace period allows temporary offline usage before revalidation.
