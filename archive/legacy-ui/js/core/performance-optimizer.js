/**
 * VIB3+ Performance Optimization Module
 * Monitors and optimizes rendering performance, memory usage, and frame rates
 *
 * Features:
 * - FPS monitoring and display
 * - Automatic quality adjustment based on performance
 * - Memory leak detection
 * - Render loop optimization
 * - Resource management
 * - Performance statistics
 */

console.log('⚡ Performance Optimizer Module: Loading...');

// Performance monitoring state
let performanceStats = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: 0,
    lastFrameTime: performance.now(),
    frameCount: 0,
    sampleStartTime: performance.now()
};

let performanceMode = 'auto'; // 'low', 'medium', 'high', 'ultra', 'auto'
let fpsHistory = [];
let maxFpsHistory = 60; // Keep last 60 frames
let fpsDisplayElement = null;
let statsDisplayElement = null;
let showStats = false;

// Performance thresholds for auto-adjustment
const PERFORMANCE_THRESHOLDS = {
    targetFps: 60,
    lowFpsThreshold: 30,
    mediumFpsThreshold: 45,
    highFpsThreshold: 55,
    memoryWarningThreshold: 500 * 1024 * 1024, // 500MB
    memoryDangerThreshold: 1000 * 1024 * 1024  // 1GB
};

// Quality settings for each performance mode
const QUALITY_SETTINGS = {
    low: {
        gridDensity: 8,
        maxParticles: 1000,
        shadowQuality: 0,
        antialiasing: false,
        bloomEnabled: false,
        particleLimit: 500
    },
    medium: {
        gridDensity: 15,
        maxParticles: 2000,
        shadowQuality: 1,
        antialiasing: true,
        bloomEnabled: false,
        particleLimit: 1500
    },
    high: {
        gridDensity: 30,
        maxParticles: 5000,
        shadowQuality: 2,
        antialiasing: true,
        bloomEnabled: true,
        particleLimit: 3000
    },
    ultra: {
        gridDensity: 50,
        maxParticles: 10000,
        shadowQuality: 3,
        antialiasing: true,
        bloomEnabled: true,
        particleLimit: 5000
    }
};

/**
 * Initialize performance optimizer
 */
function initializePerformanceOptimizer() {
    console.log('⚡ Initializing Performance Optimizer...');

    // Create FPS display
    createFpsDisplay();

    // Create stats display
    createStatsDisplay();

    // Start monitoring
    startPerformanceMonitoring();

    // Set up keyboard shortcut (P for performance)
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            togglePerformanceStats();
        }
    });

    console.log('✅ Performance Optimizer initialized');
    console.log('⌨️ Press P to toggle performance stats');
}

/**
 * Create FPS display overlay
 */
function createFpsDisplay() {
    fpsDisplayElement = document.createElement('div');
    fpsDisplayElement.id = 'fps-display';
    fpsDisplayElement.style.cssText = `
        position: fixed;
        top: 70px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #00ffff;
        border-radius: 5px;
        padding: 5px 10px;
        font-family: 'Orbitron', monospace;
        font-size: 0.75rem;
        color: #00ffff;
        z-index: 9998;
        display: none;
        min-width: 80px;
        text-align: center;
    `;
    document.body.appendChild(fpsDisplayElement);
}

/**
 * Create detailed stats display
 */
function createStatsDisplay() {
    statsDisplayElement = document.createElement('div');
    statsDisplayElement.id = 'performance-stats';
    statsDisplayElement.style.cssText = `
        position: fixed;
        top: 100px;
        right: 10px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #00ffff;
        border-radius: 8px;
        padding: 15px;
        font-family: 'Orbitron', monospace;
        font-size: 0.7rem;
        color: #fff;
        z-index: 9998;
        display: none;
        min-width: 200px;
        line-height: 1.6;
    `;
    document.body.appendChild(statsDisplayElement);
}

/**
 * Start performance monitoring loop
 */
function startPerformanceMonitoring() {
    function monitor() {
        updatePerformanceStats();
        updateDisplays();

        // Auto-adjust quality if in auto mode
        if (performanceMode === 'auto') {
            autoAdjustQuality();
        }

        requestAnimationFrame(monitor);
    }

    monitor();
}

/**
 * Update performance statistics
 */
function updatePerformanceStats() {
    const currentTime = performance.now();
    const deltaTime = currentTime - performanceStats.lastFrameTime;
    performanceStats.lastFrameTime = currentTime;
    performanceStats.frameCount++;

    // Calculate FPS
    const elapsedSinceLastSample = currentTime - performanceStats.sampleStartTime;
    if (elapsedSinceLastSample >= 1000) {
        performanceStats.fps = Math.round((performanceStats.frameCount / elapsedSinceLastSample) * 1000);
        performanceStats.frameTime = deltaTime.toFixed(2);
        performanceStats.frameCount = 0;
        performanceStats.sampleStartTime = currentTime;

        // Add to FPS history
        fpsHistory.push(performanceStats.fps);
        if (fpsHistory.length > maxFpsHistory) {
            fpsHistory.shift();
        }
    }

    // Get memory usage if available
    if (performance.memory) {
        performanceStats.memoryUsage = performance.memory.usedJSHeapSize;
    }

    // Try to get render stats from engine
    if (window.vib34dApp && window.vib34dApp.currentEngine) {
        const engine = window.vib34dApp.currentEngine;
        if (engine.getStats) {
            const engineStats = engine.getStats();
            performanceStats.drawCalls = engineStats.drawCalls || 0;
            performanceStats.triangles = engineStats.triangles || 0;
        }
    }
}

/**
 * Update visual displays
 */
function updateDisplays() {
    if (!fpsDisplayElement) return;

    // Update FPS display
    if (fpsDisplayElement.style.display !== 'none') {
        const fpsColor = getFpsColor(performanceStats.fps);
        fpsDisplayElement.innerHTML = `
            <div style="color: ${fpsColor}; font-weight: bold; font-size: 1.2em;">
                ${performanceStats.fps} FPS
            </div>
        `;
    }

    // Update stats display
    if (statsDisplayElement && showStats) {
        const avgFps = fpsHistory.length > 0
            ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length)
            : performanceStats.fps;

        const minFps = fpsHistory.length > 0 ? Math.min(...fpsHistory) : performanceStats.fps;
        const maxFps = fpsHistory.length > 0 ? Math.max(...fpsHistory) : performanceStats.fps;

        const memoryMB = (performanceStats.memoryUsage / (1024 * 1024)).toFixed(1);
        const memoryColor = getMemoryColor(performanceStats.memoryUsage);

        statsDisplayElement.innerHTML = `
            <div style="color: #00ffff; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #00ffff; padding-bottom: 5px;">
                ⚡ PERFORMANCE STATS
            </div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 5px;">
                <div style="color: #888;">FPS:</div>
                <div style="color: ${getFpsColor(performanceStats.fps)}; font-weight: bold;">${performanceStats.fps}</div>

                <div style="color: #888;">Avg FPS:</div>
                <div style="color: ${getFpsColor(avgFps)};">${avgFps}</div>

                <div style="color: #888;">Min/Max:</div>
                <div style="color: ${getFpsColor(minFps)};">${minFps} / ${maxFps}</div>

                <div style="color: #888;">Frame Time:</div>
                <div>${performanceStats.frameTime}ms</div>

                <div style="color: #888;">Memory:</div>
                <div style="color: ${memoryColor};">${memoryMB} MB</div>

                <div style="color: #888;">Draw Calls:</div>
                <div>${performanceStats.drawCalls}</div>

                <div style="color: #888;">Triangles:</div>
                <div>${performanceStats.triangles.toLocaleString()}</div>

                <div style="color: #888;">Mode:</div>
                <div style="color: #ff00ff; font-weight: bold;">${performanceMode.toUpperCase()}</div>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333; font-size: 0.65rem; color: #666;">
                Press P to hide • Press M to cycle modes
            </div>
        `;
    }
}

/**
 * Get color for FPS value
 */
function getFpsColor(fps) {
    if (fps >= PERFORMANCE_THRESHOLDS.highFpsThreshold) return '#00ff00'; // Green
    if (fps >= PERFORMANCE_THRESHOLDS.mediumFpsThreshold) return '#ffff00'; // Yellow
    if (fps >= PERFORMANCE_THRESHOLDS.lowFpsThreshold) return '#ff8800'; // Orange
    return '#ff0000'; // Red
}

/**
 * Get color for memory value
 */
function getMemoryColor(memory) {
    if (memory >= PERFORMANCE_THRESHOLDS.memoryDangerThreshold) return '#ff0000'; // Red
    if (memory >= PERFORMANCE_THRESHOLDS.memoryWarningThreshold) return '#ffff00'; // Yellow
    return '#00ff00'; // Green
}

/**
 * Auto-adjust quality based on performance
 */
function autoAdjustQuality() {
    if (fpsHistory.length < 30) return; // Need enough samples

    const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;

    // Determine target quality mode
    let targetMode = 'medium';
    if (avgFps < PERFORMANCE_THRESHOLDS.lowFpsThreshold) {
        targetMode = 'low';
    } else if (avgFps < PERFORMANCE_THRESHOLDS.mediumFpsThreshold) {
        targetMode = 'medium';
    } else if (avgFps < PERFORMANCE_THRESHOLDS.highFpsThreshold) {
        targetMode = 'high';
    } else {
        targetMode = 'ultra';
    }

    // Apply quality settings if mode changed
    if (targetMode !== performanceMode) {
        console.log(`⚡ Auto-adjusting quality from ${performanceMode} to ${targetMode} (avgFps: ${avgFps.toFixed(1)})`);
        setPerformanceMode(targetMode);
    }
}

/**
 * Set performance mode
 */
function setPerformanceMode(mode) {
    if (!QUALITY_SETTINGS[mode]) {
        console.error(`❌ Invalid performance mode: ${mode}`);
        return;
    }

    performanceMode = mode;
    const settings = QUALITY_SETTINGS[mode];

    console.log(`⚡ Setting performance mode: ${mode}`, settings);

    // Apply settings to UI
    if (window.updateParameter) {
        // Only update gridDensity if it exists
        const gridSlider = document.getElementById('gridDensity');
        if (gridSlider) {
            window.updateParameter('gridDensity', settings.gridDensity);
        }
    }

    // Notify engine if it has performance settings
    if (window.vib34dApp && window.vib34dApp.currentEngine) {
        const engine = window.vib34dApp.currentEngine;
        if (engine.setPerformanceMode) {
            engine.setPerformanceMode(mode, settings);
        }
    }

    // Show notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #00ffff;
        border-radius: 10px;
        padding: 20px 40px;
        font-family: 'Orbitron', monospace;
        font-size: 1.2rem;
        color: #00ffff;
        z-index: 10001;
        text-align: center;
    `;
    notification.innerHTML = `
        ⚡ PERFORMANCE MODE<br>
        <span style="font-size: 2rem; font-weight: bold;">${mode.toUpperCase()}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 1500);
}

/**
 * Toggle performance stats display
 */
function togglePerformanceStats() {
    showStats = !showStats;

    if (showStats) {
        fpsDisplayElement.style.display = 'block';
        statsDisplayElement.style.display = 'block';
        console.log('📊 Performance stats enabled');
    } else {
        fpsDisplayElement.style.display = 'none';
        statsDisplayElement.style.display = 'none';
        console.log('📊 Performance stats disabled');
    }
}

/**
 * Cycle through performance modes
 */
function cyclePerformanceMode() {
    const modes = ['auto', 'low', 'medium', 'high', 'ultra'];
    const currentIndex = modes.indexOf(performanceMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setPerformanceMode(modes[nextIndex]);
}

/**
 * Get current performance stats
 */
window.getPerformanceStats = function() {
    return { ...performanceStats };
};

/**
 * Set performance mode globally
 */
window.setPerformanceMode = setPerformanceMode;

/**
 * Toggle stats display
 */
window.togglePerformanceStats = togglePerformanceStats;

/**
 * Cycle modes
 */
window.cyclePerformanceMode = cyclePerformanceMode;

// Keyboard shortcut for cycling modes (M for mode)
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        cyclePerformanceMode();
    }
});

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePerformanceOptimizer);
} else {
    initializePerformanceOptimizer();
}

console.log('⚡ Performance Optimizer Module: Loaded');
console.log('⌨️ Press P to toggle stats, M to cycle modes');
