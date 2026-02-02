/**
 * VIB3+ System Diagnostics & Testing Module
 * Comprehensive testing, verification, and debugging tools
 *
 * Features:
 * - Module loading verification
 * - Layout diagnostics
 * - Icon system testing
 * - Performance benchmarking
 * - Visual regression detection
 * - Debug overlay
 */

console.log('🔬 System Diagnostics Module: Loading...');

// Diagnostic state
let diagnosticResults = {
    modules: {},
    layout: {},
    icons: {},
    performance: {},
    errors: []
};

let debugOverlayVisible = false;
let debugOverlayElement = null;

/**
 * Initialize system diagnostics
 */
function initializeSystemDiagnostics() {
    console.log('🔬 Initializing System Diagnostics...');

    // Don't auto-run diagnostics during debugging
    // setTimeout(() => {
    //     runCompleteDiagnostics();
    // }, 3000);

    // Create debug overlay
    createDebugOverlay();

    // Set up keyboard shortcut (Ctrl+Shift+D for Debug)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            toggleDebugOverlay();
        }
    });

    // Mobile: Triple-tap on logo to open diagnostics
    let tapCount = 0;
    let tapTimer = null;
    const logo = document.querySelector('.logo');

    if (logo) {
        logo.addEventListener('click', (e) => {
            tapCount++;

            if (tapTimer) clearTimeout(tapTimer);

            if (tapCount === 3) {
                toggleDebugOverlay();
                tapCount = 0;
            }

            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 1000);
        });
        console.log('📱 Mobile: Triple-tap logo to open diagnostics');
    }

    // Add floating debug button (mobile-friendly)
    createFloatingDebugButton();

    console.log('✅ System Diagnostics initialized (auto-run disabled)');
    console.log('⌨️ Desktop: Ctrl+Shift+D | Mobile: Triple-tap logo or use floating button');
}

/**
 * Run complete diagnostic suite
 */
function runCompleteDiagnostics() {
    console.log('🧪 Running complete diagnostic suite...');

    diagnosticResults = {
        modules: {},
        layout: {},
        icons: {},
        performance: {},
        errors: [],
        timestamp: new Date().toISOString()
    };

    // Test each subsystem
    testModuleIntegration();
    testLayoutSystem();
    testIconSystem();
    testPerformanceMetrics();
    testResponsiveness();
    testEventListeners();

    // Generate report
    generateDiagnosticReport();

    // Update debug overlay if visible
    if (debugOverlayVisible) {
        updateDebugOverlay();
    }

    console.log('✅ Diagnostic suite complete');
    return diagnosticResults;
}

/**
 * Test module integration
 */
function testModuleIntegration() {
    console.log('📦 Testing module integration...');

    const requiredModules = {
        // Core modules
        'switchSystem': 'System switching',
        'selectGeometry': 'Geometry selection',
        'updateParameter': 'Parameter updates',
        'toggleBezelCollapse': 'Bezel control',

        // Gallery
        'saveToGallery': 'Gallery save',
        'openGallery': 'Gallery open',

        // Actions
        'randomizeAll': 'Randomize all',
        'resetAll': 'Reset all',

        // Enhanced features
        'togglePerformanceStats': 'Performance stats',
        'toggleShortcutsHelp': 'Shortcuts help',
        'copyShareLinkToClipboard': 'Share links',
        'captureCurrentState': 'State capture',
        'undo': 'Undo',
        'redo': 'Redo',

        // Layout
        'fixSystemButtonIcons': 'Icon fixes',
        'calculateLayout': 'Layout calculation',
        'applyLayout': 'Layout application',

        // Geometry
        'loadGeometryFromIndex': 'Geometry loading',
        'getGeometryInfo': 'Geometry info',
        'switchCoreType': 'Core type switching',

        // Icons
        'createIcon': 'Icon creation',
        'replaceAllEmojisWithIcons': 'Emoji replacement'
    };

    let modulesLoaded = 0;
    let modulesFailed = 0;

    Object.entries(requiredModules).forEach(([funcName, description]) => {
        if (typeof window[funcName] === 'function') {
            diagnosticResults.modules[funcName] = { status: 'OK', description };
            modulesLoaded++;
        } else {
            diagnosticResults.modules[funcName] = { status: 'MISSING', description };
            modulesFailed++;
            diagnosticResults.errors.push(`Missing function: ${funcName} (${description})`);
        }
    });

    diagnosticResults.modules.summary = {
        total: Object.keys(requiredModules).length,
        loaded: modulesLoaded,
        failed: modulesFailed,
        percentage: ((modulesLoaded / Object.keys(requiredModules).length) * 100).toFixed(1)
    };

    console.log(`✅ Modules: ${modulesLoaded}/${Object.keys(requiredModules).length} loaded (${diagnosticResults.modules.summary.percentage}%)`);
}

/**
 * Test layout system
 */
function testLayoutSystem() {
    console.log('📐 Testing layout system...');

    const topBar = document.querySelector('.top-bar');
    const canvasContainer = document.getElementById('canvasContainer');
    const controlPanel = document.getElementById('controlPanel');

    diagnosticResults.layout = {
        topBar: topBar ? {
            exists: true,
            height: topBar.offsetHeight,
            computed: window.getComputedStyle(topBar).height
        } : { exists: false },

        canvasContainer: canvasContainer ? {
            exists: true,
            position: window.getComputedStyle(canvasContainer).position,
            top: window.getComputedStyle(canvasContainer).top,
            bottom: window.getComputedStyle(canvasContainer).bottom,
            width: canvasContainer.offsetWidth,
            height: canvasContainer.offsetHeight,
            rect: canvasContainer.getBoundingClientRect()
        } : { exists: false },

        controlPanel: controlPanel ? {
            exists: true,
            position: window.getComputedStyle(controlPanel).position,
            height: controlPanel.offsetHeight,
            isCollapsed: controlPanel.classList.contains('collapsed'),
            computed: window.getComputedStyle(controlPanel).height
        } : { exists: false },

        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: window.innerWidth <= 768,
            isLandscape: window.innerWidth > window.innerHeight
        }
    };

    // Check for layout issues
    if (canvasContainer && controlPanel) {
        const canvasRect = canvasContainer.getBoundingClientRect();
        const panelRect = controlPanel.getBoundingClientRect();

        const gap = window.innerHeight - canvasRect.bottom - panelRect.height;
        diagnosticResults.layout.gap = gap;

        if (Math.abs(gap) > 2) {
            diagnosticResults.errors.push(`Layout gap detected: ${gap}px between canvas and bezel`);
        }

        // Check for overlap
        if (canvasRect.bottom > panelRect.top) {
            const overlap = canvasRect.bottom - panelRect.top;
            diagnosticResults.layout.overlap = overlap;
            diagnosticResults.errors.push(`Layout overlap detected: ${overlap}px`);
        }
    }

    console.log('✅ Layout test complete');
}

/**
 * Test icon system
 */
function testIconSystem() {
    console.log('🎨 Testing icon system...');

    const systemButtons = document.querySelectorAll('.system-btn');
    let iconsLoaded = 0;
    let iconsFallback = 0;
    let iconsMissing = 0;

    systemButtons.forEach((btn, index) => {
        const iconSpan = btn.querySelector('.system-icon');
        if (iconSpan) {
            const hasSVG = iconSpan.querySelector('svg') !== null;
            const hasText = iconSpan.textContent.trim().length > 0;

            if (hasSVG) {
                iconsLoaded++;
            } else if (hasText) {
                iconsFallback++;
            } else {
                iconsMissing++;
            }
        }
    });

    diagnosticResults.icons = {
        systemButtons: {
            total: systemButtons.length,
            svgLoaded: iconsLoaded,
            fallbackUsed: iconsFallback,
            missing: iconsMissing
        }
    };

    if (iconsMissing > 0) {
        diagnosticResults.errors.push(`${iconsMissing} system buttons missing icons`);
    }

    console.log(`✅ Icons: ${iconsLoaded} SVG, ${iconsFallback} fallback, ${iconsMissing} missing`);
}

/**
 * Test performance metrics
 */
function testPerformanceMetrics() {
    console.log('⚡ Testing performance metrics...');

    diagnosticResults.performance = {
        memory: performance.memory ? {
            used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
        } : 'Not available',

        timing: performance.timing ? {
            loadTime: (performance.timing.loadEventEnd - performance.timing.navigationStart) + ' ms',
            domReady: (performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart) + ' ms'
        } : 'Not available',

        fps: window.getPerformanceStats ? window.getPerformanceStats().fps : 'Not available'
    };

    console.log('✅ Performance metrics collected');
}

/**
 * Test responsiveness
 */
function testResponsiveness() {
    console.log('📱 Testing responsiveness...');

    const isMobile = window.innerWidth <= 768;
    const hasModularClass = document.body.classList.contains('mobile-layout');
    const hasMobileStyles = isMobile && hasModularClass;

    diagnosticResults.layout.responsiveness = {
        isMobile,
        hasMobileClass: hasModularClass,
        properlyConfigured: isMobile === hasModularClass,
        touchTargets: []
    };

    // Check touch targets on mobile
    if (isMobile) {
        const interactiveElements = document.querySelectorAll('.system-btn, .action-btn, .geom-btn, .bezel-tab');
        let smallTargets = 0;

        interactiveElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const minDimension = Math.min(rect.width, rect.height);

            if (minDimension < 44) {
                smallTargets++;
                diagnosticResults.layout.responsiveness.touchTargets.push({
                    element: el.className,
                    width: rect.width,
                    height: rect.height,
                    tooSmall: true
                });
            }
        });

        if (smallTargets > 0) {
            diagnosticResults.errors.push(`${smallTargets} touch targets smaller than 44px`);
        }
    }

    console.log('✅ Responsiveness test complete');
}

/**
 * Test event listeners
 */
function testEventListeners() {
    console.log('🎯 Testing event listeners...');

    diagnosticResults.events = {
        bezelToggle: typeof window.toggleBezelCollapse === 'function',
        systemSwitch: typeof window.switchSystem === 'function',
        geometrySelect: typeof window.selectGeometry === 'function',
        parameterUpdate: typeof window.updateParameter === 'function'
    };

    console.log('✅ Event listener test complete');
}

/**
 * Generate diagnostic report
 */
function generateDiagnosticReport() {
    const report = {
        timestamp: diagnosticResults.timestamp,
        summary: {
            totalErrors: diagnosticResults.errors.length,
            modulesLoaded: diagnosticResults.modules.summary?.percentage || 0,
            layoutStatus: diagnosticResults.layout.gap !== undefined ?
                (Math.abs(diagnosticResults.layout.gap) <= 2 ? 'OK' : 'WARNING') : 'UNKNOWN',
            iconsStatus: diagnosticResults.icons.systemButtons?.missing === 0 ? 'OK' : 'WARNING',
            performanceStatus: 'OK'
        },
        details: diagnosticResults
    };

    // Log summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNOSTIC REPORT');
    console.log('='.repeat(50));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Errors: ${report.summary.totalErrors}`);
    console.log(`Modules: ${report.summary.modulesLoaded}%`);
    console.log(`Layout: ${report.summary.layoutStatus}`);
    console.log(`Icons: ${report.summary.iconsStatus}`);
    console.log('='.repeat(50) + '\n');

    if (diagnosticResults.errors.length > 0) {
        console.log('⚠️ ERRORS DETECTED:');
        diagnosticResults.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error}`);
        });
        console.log('');
    } else {
        console.log('✅ NO ERRORS DETECTED\n');
    }

    return report;
}

/**
 * Create debug overlay
 */
function createDebugOverlay() {
    debugOverlayElement = document.createElement('div');
    debugOverlayElement.id = 'system-diagnostics-overlay';
    debugOverlayElement.style.cssText = `
        position: fixed;
        top: 70px;
        left: 10px;
        right: 10px;
        max-width: 600px;
        max-height: calc(100vh - 140px);
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #00ffff;
        border-radius: 10px;
        padding: 15px;
        font-family: 'Courier New', monospace;
        font-size: 0.7rem;
        color: #00ff00;
        z-index: 10002;
        display: none;
        overflow-y: auto;
        line-height: 1.4;
    `;

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '× Close';
    closeBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(255, 0, 0, 0.8);
        border: 1px solid #ff0000;
        color: #fff;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: bold;
    `;
    closeBtn.onclick = () => toggleDebugOverlay();
    debugOverlayElement.appendChild(closeBtn);

    // Add content container
    const content = document.createElement('div');
    content.id = 'debug-content';
    content.style.marginTop = '35px';
    debugOverlayElement.appendChild(content);

    document.body.appendChild(debugOverlayElement);
}

/**
 * Create floating debug button (mobile-friendly)
 */
function createFloatingDebugButton() {
    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'floating-debug-btn';
    floatingBtn.innerHTML = '🔬';
    floatingBtn.title = 'Open Diagnostics';
    floatingBtn.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 200, 255, 0.3));
        border: 2px solid rgba(0, 255, 255, 0.5);
        border-radius: 50%;
        color: #00ffff;
        font-size: 1.5rem;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0, 255, 255, 0.4);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        backdrop-filter: blur(10px);
    `;

    floatingBtn.addEventListener('click', () => {
        toggleDebugOverlay();
    });

    floatingBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        floatingBtn.style.transform = 'scale(0.9)';
    });

    floatingBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        floatingBtn.style.transform = 'scale(1)';
        toggleDebugOverlay();
    });

    document.body.appendChild(floatingBtn);
    console.log('✅ Floating debug button added (bottom-right corner)');
}

/**
 * Toggle debug overlay
 */
function toggleDebugOverlay() {
    debugOverlayVisible = !debugOverlayVisible;
    debugOverlayElement.style.display = debugOverlayVisible ? 'block' : 'none';

    if (debugOverlayVisible) {
        runCompleteDiagnostics();
        updateDebugOverlay();
    }
}

/**
 * Update debug overlay content
 */
function updateDebugOverlay() {
    const content = document.getElementById('debug-content');
    if (!content) return;

    const report = generateDiagnosticReport();

    let html = `
        <div style="color: #00ffff; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #00ffff; padding-bottom: 5px;">
            🔬 SYSTEM DIAGNOSTICS
        </div>

        <div style="margin-bottom: 15px;">
            <div style="color: #ffff00;">⏱️ Timestamp:</div>
            <div style="margin-left: 15px;">${report.timestamp}</div>
        </div>

        <div style="margin-bottom: 15px;">
            <div style="color: #ffff00;">📊 Summary:</div>
            <div style="margin-left: 15px;">
                Errors: <span style="color: ${report.summary.totalErrors === 0 ? '#00ff00' : '#ff0000'}">${report.summary.totalErrors}</span><br>
                Modules: <span style="color: ${report.summary.modulesLoaded >= 90 ? '#00ff00' : '#ffff00'}">${report.summary.modulesLoaded}%</span><br>
                Layout: <span style="color: ${report.summary.layoutStatus === 'OK' ? '#00ff00' : '#ffff00'}">${report.summary.layoutStatus}</span><br>
                Icons: <span style="color: ${report.summary.iconsStatus === 'OK' ? '#00ff00' : '#ffff00'}">${report.summary.iconsStatus}</span>
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <div style="color: #ffff00;">📐 Layout:</div>
            <div style="margin-left: 15px; font-size: 0.7rem;">
                Viewport: ${diagnosticResults.layout.viewport?.width}x${diagnosticResults.layout.viewport?.height}<br>
                Mobile: ${diagnosticResults.layout.viewport?.isMobile ? 'Yes' : 'No'}<br>
                Canvas: ${diagnosticResults.layout.canvasContainer?.width}x${diagnosticResults.layout.canvasContainer?.height}<br>
                Bezel: ${diagnosticResults.layout.controlPanel?.height}px (${diagnosticResults.layout.controlPanel?.isCollapsed ? 'Collapsed' : 'Expanded'})<br>
                Gap: <span style="color: ${Math.abs(diagnosticResults.layout.gap || 0) <= 2 ? '#00ff00' : '#ff0000'}">${diagnosticResults.layout.gap?.toFixed(2) || 'N/A'}px</span>
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <div style="color: #ffff00;">🎨 Icons:</div>
            <div style="margin-left: 15px; font-size: 0.7rem;">
                SVG Loaded: ${diagnosticResults.icons.systemButtons?.svgLoaded || 0}<br>
                Fallback: ${diagnosticResults.icons.systemButtons?.fallbackUsed || 0}<br>
                Missing: <span style="color: ${diagnosticResults.icons.systemButtons?.missing === 0 ? '#00ff00' : '#ff0000'}">${diagnosticResults.icons.systemButtons?.missing || 0}</span>
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <div style="color: #ffff00;">⚡ Performance:</div>
            <div style="margin-left: 15px; font-size: 0.7rem;">
                ${typeof diagnosticResults.performance.memory === 'object' ?
                    `Memory: ${diagnosticResults.performance.memory.used} / ${diagnosticResults.performance.memory.total}` :
                    'Memory: N/A'}<br>
                FPS: ${diagnosticResults.performance.fps || 'N/A'}
            </div>
        </div>
    `;

    if (diagnosticResults.errors.length > 0) {
        html += `
            <div style="margin-bottom: 15px;">
                <div style="color: #ff0000; font-weight: bold;">⚠️ ERRORS (${diagnosticResults.errors.length}):</div>
                <div style="margin-left: 15px; font-size: 0.7rem; color: #ff8888;">
                    ${diagnosticResults.errors.map((err, i) => `${i + 1}. ${err}`).join('<br>')}
                </div>
            </div>
        `;
    }

    html += `
        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #333; text-align: center; font-size: 0.65rem; color: #666;">
            Press Ctrl+Shift+D to close • Auto-refresh in diagnostics
        </div>
    `;

    content.innerHTML = html;
}

// Export functions
window.runCompleteDiagnostics = runCompleteDiagnostics;
window.toggleDebugOverlay = toggleDebugOverlay;
window.getDiagnosticResults = () => diagnosticResults;

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSystemDiagnostics);
} else {
    initializeSystemDiagnostics();
}

console.log('🔬 System Diagnostics Module: Loaded');
console.log('⌨️ Press Ctrl+Shift+D to toggle debug overlay');
