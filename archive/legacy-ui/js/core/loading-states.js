/**
 * VIB3+ Loading States & Visual Feedback Module
 * Provides visual feedback for system initialization and loading
 *
 * Features:
 * - Loading overlay with progress
 * - Module loading tracking
 * - Smooth transitions
 * - Error state display
 */

console.log('⏳ Loading States Module: Loading...');

let loadingProgress = 0;
let loadingSteps = [];
let loadingOverlay = null;
let loadingComplete = false;

/**
 * Initialize loading states system
 */
function initializeLoadingStates() {
    console.log('⏳ Initializing Loading States System...');

    // TEMPORARILY DISABLED - Focus on fixing core layout first
    // createLoadingOverlay();
    // trackLoadingProgress();

    // Mark as complete immediately
    loadingComplete = true;

    console.log('✅ Loading States System initialized (DISABLED FOR DEBUGGING)');
}

/**
 * Create loading overlay
 */
function createLoadingOverlay() {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'vib3-loading-overlay';
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #000000, #001020, #000510);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Orbitron', monospace;
        color: #00ffff;
        transition: opacity 0.5s ease-out;
    `;

    // Logo/Title
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 3rem;
        font-weight: 900;
        text-shadow: 0 0 30px rgba(0, 255, 255, 0.8);
        margin-bottom: 40px;
        letter-spacing: 4px;
        animation: pulse 2s ease-in-out infinite;
    `;
    title.textContent = 'VIB3+ ENGINE';
    loadingOverlay.appendChild(title);

    // Progress container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        width: 400px;
        max-width: 80vw;
        margin-bottom: 30px;
    `;

    // Progress bar background
    const progressBg = document.createElement('div');
    progressBg.style.cssText = `
        width: 100%;
        height: 6px;
        background: rgba(0, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
    `;

    // Progress bar fill
    const progressFill = document.createElement('div');
    progressFill.id = 'loading-progress-fill';
    progressFill.style.cssText = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #00ffff, #00ccff, #00ffff);
        background-size: 200% 100%;
        transition: width 0.3s ease-out;
        animation: shimmer 2s linear infinite;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
    `;
    progressBg.appendChild(progressFill);
    progressContainer.appendChild(progressBg);
    loadingOverlay.appendChild(progressContainer);

    // Loading text
    const loadingText = document.createElement('div');
    loadingText.id = 'loading-text';
    loadingText.style.cssText = `
        font-size: 0.9rem;
        color: rgba(0, 255, 255, 0.8);
        margin-top: 20px;
        min-height: 24px;
    `;
    loadingText.textContent = 'Initializing VIB3+ System...';
    loadingOverlay.appendChild(loadingText);

    // Steps container
    const stepsContainer = document.createElement('div');
    stepsContainer.id = 'loading-steps';
    stepsContainer.style.cssText = `
        margin-top: 30px;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        text-align: left;
        max-width: 400px;
    `;
    loadingOverlay.appendChild(stepsContainer);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        @keyframes shimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Add to DOM
    document.body.appendChild(loadingOverlay);
}

/**
 * Update loading progress
 */
function updateLoadingProgress(step, percentage) {
    const progressFill = document.getElementById('loading-progress-fill');
    const loadingText = document.getElementById('loading-text');

    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }

    if (loadingText) {
        loadingText.textContent = step;
    }

    // Add step to list
    const stepsContainer = document.getElementById('loading-steps');
    if (stepsContainer) {
        const stepEl = document.createElement('div');
        stepEl.style.cssText = `
            padding: 4px 0;
            animation: fadeIn 0.3s ease-out;
            color: rgba(0, 255, 0, 0.7);
        `;
        stepEl.innerHTML = `✓ ${step}`;
        stepsContainer.appendChild(stepEl);

        // Keep only last 5 steps visible
        const steps = stepsContainer.children;
        if (steps.length > 5) {
            stepsContainer.removeChild(steps[0]);
        }
    }

    loadingProgress = percentage;
    console.log(`⏳ Loading: ${percentage}% - ${step}`);
}

/**
 * Track loading progress
 */
function trackLoadingProgress() {
    let stepsDone = 0;
    const totalSteps = 10;

    // Step 1: DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            stepsDone++;
            updateLoadingProgress('DOM Ready', (stepsDone / totalSteps) * 100);
        });
    } else {
        stepsDone++;
        updateLoadingProgress('DOM Ready', (stepsDone / totalSteps) * 100);
    }

    // Step 2-10: Track module loading
    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Loading Core Modules...', (stepsDone / totalSteps) * 100);
    }, 100);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Loading Geometry System...', (stepsDone / totalSteps) * 100);
    }, 300);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Loading Icon System...', (stepsDone / totalSteps) * 100);
    }, 600);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Initializing Layout...', (stepsDone / totalSteps) * 100);
    }, 1000);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Loading Performance Monitor...', (stepsDone / totalSteps) * 100);
    }, 1300);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Setting Up State Management...', (stepsDone / totalSteps) * 100);
    }, 1600);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Initializing Visualizers...', (stepsDone / totalSteps) * 100);
    }, 2000);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Applying Fixes & Polish...', (stepsDone / totalSteps) * 100);
    }, 2400);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('Running Diagnostics...', (stepsDone / totalSteps) * 100);
    }, 2800);

    setTimeout(() => {
        stepsDone++;
        updateLoadingProgress('VIB3+ Ready!', 100);
        // Hide loading overlay
        setTimeout(hideLoadingOverlay, 500);
    }, 3200);
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    if (!loadingOverlay) return;

    loadingOverlay.style.opacity = '0';

    setTimeout(() => {
        if (loadingOverlay && loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
        loadingComplete = true;
        console.log('✅ Loading complete - overlay removed');

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('vib3-loaded'));
    }, 500);
}

/**
 * Show error state
 */
function showErrorState(error) {
    if (!loadingOverlay) return;

    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
        loadingText.textContent = 'Error: ' + error.message;
        loadingText.style.color = '#ff0000';
    }

    const progressFill = document.getElementById('loading-progress-fill');
    if (progressFill) {
        progressFill.style.background = 'linear-gradient(90deg, #ff0000, #cc0000, #ff0000)';
    }

    console.error('❌ Loading error:', error);
}

// Export functions
window.updateLoadingProgress = updateLoadingProgress;
window.hideLoadingOverlay = hideLoadingOverlay;
window.showErrorState = showErrorState;
window.isLoadingComplete = () => loadingComplete;

// Initialize immediately
initializeLoadingStates();

console.log('⏳ Loading States Module: Loaded');
