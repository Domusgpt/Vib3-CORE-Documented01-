/**
 * VIB34D UI Fixes Module
 * Addresses 6 critical UI/UX issues:
 * 1. Canvas resize fix (black area on bezel expand)
 * 2. Geometry persistence across system switches
 * 3. Geometry button highlighting fix
 * 4. Enhanced 4D tilt mechanics
 * 5. Randomize buttons in each tab
 * 6. Better canvas/bezel coordination
 */

// Global state
let persistentGeometryIndex = 0;
let lastCanvasBottom = '52px';

/**
 * FIX 1: Canvas Resize on Bezel State Change
 * Properly resize all canvases when bezel expands/collapses
 */
function fixCanvasResize() {
    console.log('🔧 Installing canvas resize fix...');

    // Override toggleBezelCollapse to include canvas resize
    const originalToggleBezelCollapse = window.toggleBezelCollapse;

    window.toggleBezelCollapse = function() {
        // Call original function
        if (originalToggleBezelCollapse) {
            originalToggleBezelCollapse();
        }

        // Force canvas resize after state change
        setTimeout(() => {
            resizeAllCanvases();
        }, 100); // Small delay to let CSS transition start
    };

    // Also trigger resize on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeAllCanvases, 150);
    });

    console.log('✅ Canvas resize fix installed');
}

/**
 * Resize all active canvases to match container
 */
function resizeAllCanvases() {
    const canvasContainer = document.getElementById('canvasContainer');
    if (!canvasContainer) return;

    const containerRect = canvasContainer.getBoundingClientRect();
    const newWidth = containerRect.width;
    const newHeight = containerRect.height;

    console.log(`📐 Resizing canvases to ${newWidth}x${newHeight}px`);

    // Find all canvas elements
    const canvases = canvasContainer.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        if (canvas.style.display !== 'none') {
            canvas.width = newWidth;
            canvas.height = newHeight;
            canvas.style.width = `${newWidth}px`;
            canvas.style.height = `${newHeight}px`;
        }
    });

    // Trigger render update on active system
    if (window.vib34dApp && window.vib34dApp.currentEngine) {
        // Some engines have resize handlers
        if (window.vib34dApp.currentEngine.handleResize) {
            window.vib34dApp.currentEngine.handleResize(newWidth, newHeight);
        }
        // Force a render frame
        if (window.vib34dApp.currentEngine.render) {
            window.vib34dApp.currentEngine.render();
        }
    }
}

/**
 * FIX 2 & 3: Geometry Persistence Across Systems
 * Store geometry selection and apply it when switching systems
 */
function fixGeometryPersistence() {
    console.log('🔧 Installing geometry persistence fix...');

    // Intercept selectGeometry to store selection
    const originalSelectGeometry = window.selectGeometry;

    window.selectGeometry = function(geometryIndex) {
        // Store the selection globally
        persistentGeometryIndex = geometryIndex;
        console.log(`💾 Stored geometry selection: ${geometryIndex}`);

        // Update button highlighting for current system
        updateGeometryButtonHighlight(geometryIndex);

        // Call original function
        if (originalSelectGeometry) {
            return originalSelectGeometry(geometryIndex);
        }
    };

    // Intercept switchSystem to apply persistent geometry
    const originalSwitchSystem = window.switchSystem;

    window.switchSystem = async function(systemName) {
        console.log(`🔄 Switching to ${systemName}, will apply geometry ${persistentGeometryIndex}`);

        // Call original switch
        const result = await originalSwitchSystem(systemName);

        // Apply the persistent geometry to new system
        setTimeout(() => {
            console.log(`📐 Applying persistent geometry ${persistentGeometryIndex} to ${systemName}`);

            // Load geometry through the geometry tabs system
            if (window.loadGeometryFromIndex) {
                window.loadGeometryFromIndex(persistentGeometryIndex);
            } else if (window.selectGeometry) {
                window.selectGeometry(persistentGeometryIndex);
            }

            // Force button highlight update
            updateGeometryButtonHighlight(persistentGeometryIndex);
        }, 300); // Wait for system to fully initialize

        return result;
    };

    console.log('✅ Geometry persistence fix installed');
}

/**
 * Update geometry button highlighting
 */
function updateGeometryButtonHighlight(geometryIndex) {
    // Decode geometry index to core and base
    const coreIndex = Math.floor(geometryIndex / 8);
    const baseIndex = geometryIndex % 8;

    console.log(`🎨 Highlighting button: core=${coreIndex}, base=${baseIndex}`);

    // Update core tab active state
    document.querySelectorAll('.core-tab').forEach(tab => {
        const tabCore = tab.dataset.core;
        const tabCoreIndex = { 'base': 0, 'hypersphere': 1, 'hypertetra': 2 }[tabCore];

        if (tabCoreIndex === coreIndex) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update base geometry button active state
    document.querySelectorAll('.geom-btn').forEach(btn => {
        const btnBaseIndex = parseInt(btn.dataset.baseIndex);

        if (btnBaseIndex === baseIndex) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update geometry container data attribute
    const geometryContainer = document.querySelector('.geometry-container');
    if (geometryContainer) {
        const coreKey = ['base', 'hypersphere', 'hypertetra'][coreIndex];
        geometryContainer.dataset.activeCore = coreKey;
    }
}

/**
 * FIX 4: Enhanced 4D Tilt Mechanics
 * Make tilt more dramatic and responsive
 */
function enhanceTiltMechanics() {
    console.log('🔧 Enhancing 4D tilt mechanics...');

    if (!window.deviceTiltHandler) {
        console.warn('⚠️ Device tilt handler not available');
        return;
    }

    // Increase sensitivity significantly
    window.deviceTiltHandler.setSensitivity(2.5); // 2.5x more sensitive

    // Reduce smoothing for more responsive feel
    window.deviceTiltHandler.setSmoothing(0.15); // Faster response

    // Enable dramatic mode by default when tilt is enabled
    const originalEnable = window.deviceTiltHandler.enable.bind(window.deviceTiltHandler);

    window.deviceTiltHandler.enable = async function() {
        const result = await originalEnable();

        if (result) {
            // Auto-enable dramatic mode for better effect
            setTimeout(() => {
                this.setDramaticMode(true);
                console.log('🚀 Auto-enabled DRAMATIC tilting mode for better effect');
            }, 100);
        }

        return result;
    };

    // Update the mapping to be even more dramatic
    if (window.deviceTiltHandler.mapping && window.deviceTiltHandler.mapping.dramatic) {
        const dramatic = window.deviceTiltHandler.mapping.dramatic;

        // Increase all scale factors by 1.5x
        dramatic.alphaGammaToXY.scale *= 1.5;
        dramatic.alphaBetaToXZ.scale *= 1.5;
        dramatic.betaGammaToYZ.scale *= 1.5;
        dramatic.betaToXW.scale *= 1.5;
        dramatic.gammaToYW.scale *= 1.5;
        dramatic.alphaToZW.scale *= 1.5;

        console.log('🚀 Tilt mapping scales increased by 1.5x for more dramatic effect');
    }

    console.log('✅ Tilt mechanics enhanced: 2.5x sensitivity, 0.15 smoothing, dramatic mode auto-enabled');
}

/**
 * FIX 5: Add Randomize Buttons to Each Tab
 * Two buttons per tab: Randomize All & Randomize Tab
 */
function addRandomizeButtons() {
    console.log('🔧 Adding randomize buttons to tabs...');

    // Find all tab content sections
    const tabContents = document.querySelectorAll('.bezel-content');

    tabContents.forEach((tabContent, index) => {
        const tabId = tabContent.id;

        // Skip if already has randomize buttons
        if (tabContent.querySelector('.tab-randomize-buttons')) {
            return;
        }

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'tab-randomize-buttons';
        buttonContainer.style.cssText = `
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            gap: 8px;
            padding: 10px 0;
            margin-bottom: 15px;
            background: rgba(0, 0, 0, 0.8);
            border-bottom: 1px solid rgba(0, 255, 255, 0.15);
            z-index: 10;
            backdrop-filter: blur(10px);
        `;

        // Randomize All button
        const randomizeAllBtn = document.createElement('button');
        randomizeAllBtn.className = 'tab-random-btn randomize-all';
        randomizeAllBtn.innerHTML = '🎲 Randomize All';
        randomizeAllBtn.style.cssText = `
            flex: 1;
            padding: 8px 12px;
            background: linear-gradient(135deg, rgba(255, 0, 255, 0.15), rgba(200, 0, 255, 0.15));
            border: 1px solid rgba(255, 0, 255, 0.3);
            border-radius: 6px;
            color: #ff00ff;
            font-family: 'Orbitron', monospace;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        randomizeAllBtn.onclick = () => {
            if (window.randomizeEverything) {
                window.randomizeEverything();
            }
        };

        // Randomize Tab button
        const randomizeTabBtn = document.createElement('button');
        randomizeTabBtn.className = 'tab-random-btn randomize-tab';
        randomizeTabBtn.innerHTML = '🎯 Random Tab';
        randomizeTabBtn.style.cssText = `
            flex: 1;
            padding: 8px 12px;
            background: linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 200, 255, 0.15));
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 6px;
            color: #00ffff;
            font-family: 'Orbitron', monospace;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        randomizeTabBtn.onclick = () => {
            randomizeCurrentTab(tabId);
        };

        // Add hover effects
        const addHoverEffects = (btn, hoverColor) => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = `0 0 15px ${hoverColor}`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });
        };

        addHoverEffects(randomizeAllBtn, 'rgba(255, 0, 255, 0.4)');
        addHoverEffects(randomizeTabBtn, 'rgba(0, 255, 255, 0.4)');

        // Add buttons to container
        buttonContainer.appendChild(randomizeAllBtn);
        buttonContainer.appendChild(randomizeTabBtn);

        // Insert at the top of tab content
        const gridContainer = tabContent.querySelector('.tab-content-grid');
        if (gridContainer) {
            tabContent.insertBefore(buttonContainer, gridContainer);
        } else {
            tabContent.insertBefore(buttonContainer, tabContent.firstChild);
        }
    });

    console.log('✅ Randomize buttons added to all tabs');
}

/**
 * Randomize only the current tab's parameters
 */
function randomizeCurrentTab(tabId) {
    console.log(`🎯 Randomizing tab: ${tabId}`);

    const random = (min, max) => min + Math.random() * (max - min);

    switch (tabId) {
        case 'controls-content':
            // Randomize rotation and visual parameters
            window.updateParameter('rot4dXY', random(-6.28, 6.28));
            window.updateParameter('rot4dXZ', random(-6.28, 6.28));
            window.updateParameter('rot4dYZ', random(-6.28, 6.28));
            window.updateParameter('rot4dXW', random(-6.28, 6.28));
            window.updateParameter('rot4dYW', random(-6.28, 6.28));
            window.updateParameter('rot4dZW', random(-6.28, 6.28));
            window.updateParameter('gridDensity', Math.floor(random(5, 100)));
            window.updateParameter('morphFactor', random(0, 2));
            window.updateParameter('chaos', random(0, 1));
            window.updateParameter('speed', random(0.1, 3));
            console.log('✅ Randomized rotation & visual parameters');
            break;

        case 'color-content':
            // Randomize color parameters
            window.updateParameter('hue', Math.floor(random(0, 360)));
            window.updateParameter('saturation', random(0, 1));
            window.updateParameter('intensity', random(0, 1));
            console.log('✅ Randomized color parameters');
            break;

        case 'geometry-content':
            // Randomize geometry selection
            const randomGeometry = Math.floor(random(0, 24));
            if (window.loadGeometryFromIndex) {
                window.loadGeometryFromIndex(randomGeometry);
            } else if (window.selectGeometry) {
                window.selectGeometry(randomGeometry);
            }
            console.log(`✅ Randomized geometry to #${randomGeometry}`);
            break;

        case 'reactivity-content':
            // Randomize reactivity settings
            const systems = ['faceted', 'quantum', 'holographic'];
            const interactions = ['mouse', 'click', 'scroll'];

            systems.forEach(system => {
                interactions.forEach(interaction => {
                    const checkbox = document.getElementById(`${system}${interaction.charAt(0).toUpperCase() + interaction.slice(1)}`);
                    if (checkbox) {
                        checkbox.checked = Math.random() > 0.5;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
            });
            console.log('✅ Randomized reactivity settings');
            break;

        default:
            console.log('⚠️ No randomization defined for this tab');
            break;
    }
}

/**
 * Initialize all fixes
 */
function initializeUIFixes() {
    console.log('🚀 Initializing UI Fixes Module...');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyAllFixes();
        });
    } else {
        applyAllFixes();
    }
}

function applyAllFixes() {
    // Apply fixes in order
    setTimeout(() => fixCanvasResize(), 100);
    setTimeout(() => fixGeometryPersistence(), 200);
    setTimeout(() => enhanceTiltMechanics(), 300);
    setTimeout(() => addRandomizeButtons(), 500);

    console.log('✅ All UI fixes initialized successfully');
}

// Initialize on load
initializeUIFixes();

// Export functions for external use
if (typeof window !== 'undefined') {
    window.resizeAllCanvases = resizeAllCanvases;
    window.updateGeometryButtonHighlight = updateGeometryButtonHighlight;
    window.randomizeCurrentTab = randomizeCurrentTab;
}

console.log('🔧 UI Fixes Module: Loaded');
