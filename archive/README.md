# VIB3+ Archive

This folder contains old, experimental, and deprecated code that has been archived to keep the main codebase clean and focused on the 3 active visualization systems.

## Archive Structure

| Folder | Contents | Reason |
|--------|----------|--------|
| `polychora/` | Polychora visualization system | TBD/placeholder - not production ready |
| `physics/` | Polychora4DPhysics.js | Only used by Polychora system |
| `duplicate-engines/` | Old Engine.js, UnifiedEngine.js, etc. | Superseded by VIB3Engine.js |
| `duplicate-holographic/` | Old HolographicSystem variants | Superseded by RealHolographicSystem.js |
| `duplicate-export/` | "Exact" card generators | Superseded by standard generators |
| `experimental-core/` | SceneGraph, Visualizer, debug tools | Experimental/unused |
| `legacy-docs/` | Old development/tracking docs | Outdated documentation |
| `legacy-ui/` | Old js/ folder with UI components | Legacy UI layer |
| `sdk-old/` | Duplicate SDK directory | Outdated parallel implementation |
| `platforms/` | Flutter/WASM platform targets | Platform-specific code |
| `math-duplicates/` | projections.js, rotations.js | Use Projection.js and Rotor4D.js |
| `scripts-old/` | Old demo/generator scripts | Experimental scripts |
| `demos-old/` | Old demos, exports, outputs | Regenerate as needed |

## Active Systems (NOT in archive)

The following systems are the production-ready core:

1. **Quantum System** - `src/quantum/`
   - QuantumEngine.js
   - QuantumVisualizer.js

2. **Faceted System** - `src/faceted/`
   - FacetedSystem.js

3. **Holographic System** - `src/holograms/`
   - RealHolographicSystem.js
   - HolographicVisualizer.js

## Restoring Archived Files

If you need to restore any archived files:

```bash
# Example: Restore Polychora system
cp -r archive/polychora/* src/core/

# Example: Restore old SDK
cp -r archive/sdk-old/sdk ./
```

## Notes

- The archive preserves all git history
- Files can be permanently deleted after verification
- Some archived files may have import dependencies that need updating
- The Polychora system may be revived in the future once completed
