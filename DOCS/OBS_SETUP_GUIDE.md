# VIB3+ OBS Setup Guide

Use VIB3+ as a live visualization overlay in OBS Studio.

---

## What You Get

VIB3+ OBS Mode renders visualizations with a transparent background, perfect for:
- Stream overlays
- VJ performances
- Live music visualization backgrounds
- Webcam overlay effects

---

## Setup Steps

### Step 1: Start VIB3+ in OBS Mode

```javascript
import { OBSMode } from '@vib3code/sdk/integrations/obs';

const obs = new OBSMode({
    system: 'quantum',      // or 'faceted' or 'holographic'
    geometry: 10,
    transparent: true,       // transparent background
    fps: 30,                 // match your stream FPS
    resolution: [1920, 1080]
});

obs.start();
```

Or use the hosted version: open `docs/webgpu-live.html` in a browser.

### Step 2: Add Browser Source in OBS

1. Open OBS Studio
2. In your Scene, click **+** under Sources
3. Select **Browser**
4. Name it "VIB3+ Overlay"
5. Set the URL to your VIB3+ page (local: `http://localhost:5173/docs/webgpu-live.html`)
6. Set **Width** to 1920, **Height** to 1080
7. Check **"Shutdown source when not visible"** to save GPU
8. Click OK

### Step 3: Enable Transparency

1. Right-click the VIB3+ source in OBS
2. Select **Properties**
3. Scroll down and find **Custom CSS**
4. Add:
```css
body { background-color: rgba(0, 0, 0, 0) !important; }
```
5. Click OK

### Step 4: Position the Overlay

1. Drag the VIB3+ source to resize/position it
2. Right-click → **Transform** → **Fit to Screen** for fullscreen
3. Move it below your webcam source for a background effect
4. Move it above your webcam for an overlay effect

### Step 5: Control Parameters

From the browser source's page, use keyboard shortcuts:
- **1/2/3** — Switch systems (Faceted/Quantum/Holographic)
- **A** — Toggle audio reactivity
- **F** — Toggle fullscreen
- **Alt+1/2/3** — Switch core type (Base/Hypersphere/Hypertetra)

Or control programmatically via the MCP server or URL parameters:
```
http://localhost:5173/docs/webgpu-live.html?system=quantum&geometry=10&hue=180
```

---

## Tips

- **Performance**: Use 30 FPS for the browser source to reduce GPU load
- **Audio reactivity**: Enable OBS audio monitoring so VIB3+ can access the audio stream
- **Multiple sources**: Add separate VIB3+ sources with different systems for layered effects
- **Chroma key**: If transparency CSS doesn't work, use a solid color background and OBS Chroma Key filter

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Black screen | Check that the URL is correct and the dev server is running |
| No transparency | Add the Custom CSS shown in Step 3 |
| Laggy | Reduce resolution to 1280x720 or lower FPS to 24 |
| No audio reactivity | Enable "Control Audio via OBS" in browser source Advanced settings |
| WebGL error | Some OBS versions have limited WebGL support; update OBS to latest |
