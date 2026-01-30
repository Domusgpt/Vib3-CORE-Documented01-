/**
 * VIB3+ Simple Layout & Icon Fix
 * Simplified approach: Canvas is full-screen, UI overlays on top
 *
 * No complex resize logic needed!
 */

console.log('🎨 Layout Polish Module: Loading...');

/**
 * Initialize layout system
 */
function initializeLayoutPolish() {
    console.log('🎨 Initializing Simple Layout System...');

    // Fix icon display
    fixIconDisplay();

    // Set up canvas to be full-screen
    setupFullScreenCanvas();

    // Add landscape projection mode
    setupLandscapeProjectionMode();

    console.log('✅ Simple Layout System initialized');
}

/**
 * Fix icon display - Angular RGB-split style for ALL icons
 */
function fixIconDisplay() {
    console.log('🔧 Setting up angular RGB-split icons...');

    // Wait for DOM to be ready
    setTimeout(() => {
        // System buttons - Angular geometric shapes
        const systemButtons = document.querySelectorAll('.system-btn');
        systemButtons.forEach((btn) => {
            const iconSpan = btn.querySelector('.system-icon');
            const systemName = btn.dataset.system;

            if (iconSpan) {
                // Better angular geometric shapes for each system
                const angularIcons = {
                    'faceted': '◆',    // Diamond - faceted crystal structure
                    'quantum': '◉',    // Double ring - quantum orbital/wave
                    'holographic': '⬡', // Bold hexagon - holographic cell
                    'polychora': '■'   // Square - 4D polytope projection
                };

                const icon = angularIcons[systemName] || '◆';
                iconSpan.textContent = icon;
                iconSpan.setAttribute('data-icon', icon);
                iconSpan.setAttribute('data-system', systemName);
                iconSpan.style.display = 'inline-flex';
                iconSpan.style.position = 'relative';
                iconSpan.style.zIndex = '10001';
            }

            // Add click convergence effect
            btn.addEventListener('click', () => {
                btn.classList.add('glitching');
                setTimeout(() => btn.classList.remove('glitching'), 400);
            });
        });

        // Bezel collapse button
        const collapseBtn = document.querySelector('.bezel-collapse-btn');
        if (collapseBtn) {
            const updateCollapseIcon = () => {
                const isCollapsed = document.getElementById('controlPanel')?.classList.contains('collapsed');
                const icon = isCollapsed ? '▲' : '▼';
                collapseBtn.textContent = icon;
                collapseBtn.setAttribute('data-icon', icon);
            };
            updateCollapseIcon();
            collapseBtn.addEventListener('click', () => {
                setTimeout(updateCollapseIcon, 100);
            });
        }

        // Action buttons
        const actionIcons = {
            'save-btn': '💾',
            'gallery': '▦',   // Grid
            'audio': '♪',     // Note
            'tilt': '⟲',      // Rotate
            'ai': '◉',        // Neural
            'interactivity': '⚡' // Lightning
        };

        document.querySelectorAll('.action-btn').forEach(btn => {
            const title = btn.getAttribute('title')?.toLowerCase() || '';
            let icon = '●';

            if (title.includes('gallery')) icon = '▦';
            else if (title.includes('audio')) icon = '♪';
            else if (title.includes('tilt')) icon = '⟲';
            else if (title.includes('ai')) icon = '◉';
            else if (title.includes('interactivity')) icon = '⚡';

            btn.textContent = icon;
            btn.setAttribute('data-icon', icon);
        });

        // Save button
        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.setAttribute('data-icon', '💾');
        }

        // Tab icons
        const tabIcons = {
            'controls': '⚙',
            'color': '◐',
            'geometry': '▲',
            'reactivity': '⚡',
            'export': '💾'
        };

        document.querySelectorAll('.bezel-tab').forEach(tab => {
            const tabName = tab.dataset.tab;
            const iconSpan = tab.querySelector('.tab-icon');
            if (iconSpan && tabIcons[tabName]) {
                iconSpan.textContent = tabIcons[tabName];
                iconSpan.setAttribute('data-icon', tabIcons[tabName]);
            }
        });

        console.log('✅ All RGB-split icons initialized');
    }, 500);
}

/**
 * Setup full-screen canvas (simple!)
 */
function setupFullScreenCanvas() {
    const canvasContainer = document.getElementById('canvasContainer');

    if (!canvasContainer) {
        console.warn('⚠️ Canvas container not found');
        return;
    }

    // Ensure canvas is full-screen
    canvasContainer.style.position = 'fixed';
    canvasContainer.style.top = '0';
    canvasContainer.style.left = '0';
    canvasContainer.style.right = '0';
    canvasContainer.style.bottom = '0';
    canvasContainer.style.width = '100vw';
    canvasContainer.style.height = '100vh';
    canvasContainer.style.zIndex = '1';

    // Resize all canvases to match
    const allCanvases = canvasContainer.querySelectorAll('canvas');
    const width = window.innerWidth;
    const height = window.innerHeight;

    allCanvases.forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    });

    // Trigger engine resize
    if (window.vib34dApp && window.vib34dApp.currentEngine) {
        setTimeout(() => {
            if (window.vib34dApp.currentEngine.handleResize) {
                window.vib34dApp.currentEngine.handleResize(width, height);
            }
            if (window.vib34dApp.currentEngine.render) {
                window.vib34dApp.currentEngine.render();
            }
        }, 100);
    }

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;

            allCanvases.forEach(canvas => {
                canvas.width = newWidth;
                canvas.height = newHeight;
                canvas.style.width = `${newWidth}px`;
                canvas.style.height = `${newHeight}px`;
            });

            if (window.vib34dApp && window.vib34dApp.currentEngine) {
                if (window.vib34dApp.currentEngine.handleResize) {
                    window.vib34dApp.currentEngine.handleResize(newWidth, newHeight);
                }
                if (window.vib34dApp.currentEngine.render) {
                    window.vib34dApp.currentEngine.render();
                }
            }
        }, 150);
    });

    console.log(`🖼️ Canvas set to full-screen: ${width}x${height}px`);
}

/**
 * Setup landscape projection mode
 */
function setupLandscapeProjectionMode() {
    // Monitor orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            checkLandscapeMode();
        }, 300);
    });

    window.addEventListener('resize', () => {
        checkLandscapeMode();
    });

    // Initial check
    setTimeout(() => {
        checkLandscapeMode();
    }, 500);
}

/**
 * Check if in landscape projection mode
 */
function checkLandscapeMode() {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isShortScreen = window.innerHeight < 500;

    if (isLandscape && isShortScreen) {
        // Projection mode - hide UI
        document.body.classList.add('projection-mode');
        console.log('📽️ Projection mode: ON (landscape + short screen)');
    } else {
        document.body.classList.remove('projection-mode');
    }
}

// Initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLayoutPolish);
} else {
    initializeLayoutPolish();
}

// Export functions
window.fixIconDisplay = fixIconDisplay;
window.setupFullScreenCanvas = setupFullScreenCanvas;

console.log('🎨 Layout Polish Module: Loaded (SIMPLIFIED)');
console.log('✅ Canvas is full-screen, UI overlays on top');
console.log('📽️ Landscape mode auto-hides UI for projection');
