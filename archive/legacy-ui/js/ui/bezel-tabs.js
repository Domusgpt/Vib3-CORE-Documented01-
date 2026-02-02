/**
 * VIB34D Bottom Bezel Tab System
 * Handles tab switching, collapse/expand, and content management
 */

// Initialize bezel system on load
let currentTab = 'controls';
let bezelCollapsed = false;

/**
 * Switch between bezel tabs
 */
window.switchBezelTab = function(tabName) {
    console.log(`🔄 Switching to tab: ${tabName}`);

    currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.bezel-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update content visibility
    document.querySelectorAll('.bezel-content').forEach(content => {
        if (content.id === `${tabName}-content`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // If collapsed, expand when switching tabs
    if (bezelCollapsed) {
        toggleBezelCollapse();
    }
};

/**
 * Toggle bezel collapse/expand
 */
window.toggleBezelCollapse = function() {
    const panel = document.getElementById('controlPanel');
    const btn = document.querySelector('.bezel-collapse-btn');

    if (!panel) return;

    bezelCollapsed = !bezelCollapsed;
    panel.classList.toggle('collapsed');

    // Update button icon
    if (btn) {
        btn.innerHTML = bezelCollapsed ? '▲' : '▼';
        btn.title = bezelCollapsed ? 'Expand Controls' : 'Collapse Controls';
    }

    console.log(`🎛️ Bezel ${bezelCollapsed ? 'collapsed' : 'expanded'}`);

    // Adjust canvas size
    adjustCanvasForBezel();
};

/**
 * Adjust canvas container for bezel state
 */
function adjustCanvasForBezel() {
    const canvas = document.getElementById('canvasContainer');
    if (!canvas) return;

    if (bezelCollapsed) {
        canvas.style.bottom = '52px';
    } else {
        canvas.style.bottom = '65vh';
    }
}

/**
 * Quick action buttons (when collapsed)
 */
window.quickRandomize = function() {
    if (window.randomizeAll) {
        window.randomizeAll();
    }
};

window.quickSave = function() {
    if (window.saveToGallery) {
        window.saveToGallery();
    }
};

window.quickGallery = function() {
    if (window.openGallery) {
        window.openGallery();
    }
};

/**
 * Keyboard shortcuts for bezel
 */
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + B: Toggle collapse
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleBezelCollapse();
    }

    // Ctrl/Cmd + 1-5: Switch tabs
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs = ['controls', 'color', 'geometry', 'reactivity', 'export'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
            switchBezelTab(tabs[tabIndex]);
        }
    }

    // Space bar: Toggle collapse (only if not typing)
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toggleBezelCollapse();
    }
});

/**
 * Auto-collapse on mobile after inactivity
 */
let inactivityTimer;
const INACTIVITY_TIMEOUT = 8000; // 8 seconds

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);

    // Only auto-collapse on mobile
    if (window.innerWidth <= 768 && !bezelCollapsed) {
        inactivityTimer = setTimeout(() => {
            console.log('📱 Auto-collapsing bezel due to inactivity');
            toggleBezelCollapse();
        }, INACTIVITY_TIMEOUT);
    }
}

// Track user activity
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('touchstart', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);

/**
 * Handle window resize
 */
window.addEventListener('resize', () => {
    adjustCanvasForBezel();
    resetInactivityTimer();
});

/**
 * Initialize bezel on load
 */
window.addEventListener('DOMContentLoaded', () => {
    // Start with controls tab active
    switchBezelTab('controls');

    // Start collapsed on mobile
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            toggleBezelCollapse();
        }, 2000); // Give user 2 seconds to see controls
    }

    console.log('🎛️ Bezel Tab System: Initialized');
    console.log('⌨️ Keyboard Shortcuts:');
    console.log('  - Ctrl/Cmd + B: Toggle collapse');
    console.log('  - Ctrl/Cmd + 1-5: Switch tabs');
    console.log('  - Space: Toggle collapse');
});

/**
 * Tab state persistence
 */
function saveTabState() {
    localStorage.setItem('vib34d-active-tab', currentTab);
    localStorage.setItem('vib34d-bezel-collapsed', bezelCollapsed);
}

function loadTabState() {
    const savedTab = localStorage.getItem('vib34d-active-tab');
    const savedCollapsed = localStorage.getItem('vib34d-bezel-collapsed');

    if (savedTab) {
        switchBezelTab(savedTab);
    }

    if (savedCollapsed === 'true' && !bezelCollapsed) {
        toggleBezelCollapse();
    }
}

// Save state on tab switch or collapse
window.addEventListener('beforeunload', saveTabState);

// Load state after DOM ready
setTimeout(loadTabState, 500);

console.log('🎛️ Bezel Tabs Module: Loaded');
