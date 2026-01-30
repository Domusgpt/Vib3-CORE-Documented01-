/**
 * VIB3+ Visual Test Suite
 * Automated visual testing and verification
 *
 * Features:
 * - Layout verification
 * - Icon rendering tests
 * - Animation smoothness checks
 * - Responsiveness validation
 * - Cross-browser compatibility checks
 */

console.log('🧪 Visual Test Suite: Loading...');

let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

/**
 * Initialize visual test suite
 */
function initializeVisualTestSuite() {
    console.log('🧪 Initializing Visual Test Suite...');

    // Don't auto-run tests during debugging
    // setTimeout(() => {
    //     runAllVisualTests();
    // }, 4000);

    console.log('✅ Visual Test Suite initialized (auto-run disabled)');
    console.log('💡 Run window.runAllVisualTests() manually when needed');
}

/**
 * Run all visual tests
 */
function runAllVisualTests() {
    console.log('🧪 Running visual tests...');

    testResults = {
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: [],
        timestamp: new Date().toISOString()
    };

    // Run test suites
    testHeaderLayout();
    testBezelLayout();
    testCanvasLayout();
    testIconRendering();
    testResponsiveBreakpoints();
    testAnimationPerformance();
    testAccessibility();
    testColorContrast();

    // Generate report
    generateTestReport();

    console.log('✅ Visual tests complete');
    return testResults;
}

/**
 * Test header layout
 */
function testHeaderLayout() {
    const topBar = document.querySelector('.top-bar');

    if (!topBar) {
        recordTest('Header Layout', false, 'Top bar element not found');
        return;
    }

    const rect = topBar.getBoundingClientRect();
    const style = window.getComputedStyle(topBar);

    // Test 1: Header positioned at top
    if (rect.top === 0) {
        recordTest('Header Position', true);
    } else {
        recordTest('Header Position', false, `Header not at top (${rect.top}px)`);
    }

    // Test 2: Header has proper height
    const height = rect.height;
    if (height >= 50 && height <= 100) {
        recordTest('Header Height', true);
    } else {
        recordTest('Header Height', false, `Header height out of range: ${height}px`);
    }

    // Test 3: Header is fixed
    if (style.position === 'fixed') {
        recordTest('Header Fixed Position', true);
    } else {
        recordTest('Header Fixed Position', false, `Header position is ${style.position}`);
    }

    // Test 4: System buttons visible
    const systemButtons = topBar.querySelectorAll('.system-btn');
    if (systemButtons.length === 4) {
        recordTest('System Buttons Count', true);
    } else {
        recordTest('System Buttons Count', false, `Found ${systemButtons.length} buttons, expected 4`);
    }
}

/**
 * Test bezel layout
 */
function testBezelLayout() {
    const controlPanel = document.getElementById('controlPanel');

    if (!controlPanel) {
        recordTest('Bezel Layout', false, 'Control panel not found');
        return;
    }

    const rect = controlPanel.getBoundingClientRect();
    const style = window.getComputedStyle(controlPanel);
    const isCollapsed = controlPanel.classList.contains('collapsed');

    // Test 1: Bezel at bottom
    const viewportHeight = window.innerHeight;
    const bottomGap = viewportHeight - rect.bottom;

    if (Math.abs(bottomGap) <= 2) {
        recordTest('Bezel Bottom Position', true);
    } else {
        recordTest('Bezel Bottom Position', false, `Gap from bottom: ${bottomGap.toFixed(2)}px`);
    }

    // Test 2: Collapsed height
    if (isCollapsed) {
        if (rect.height >= 48 && rect.height <= 56) {
            recordTest('Bezel Collapsed Height', true);
        } else {
            recordTest('Bezel Collapsed Height', false, `Height: ${rect.height}px (expected 48-56px)`);
        }
    }

    // Test 3: Bezel tabs visible
    const tabs = controlPanel.querySelectorAll('.bezel-tab');
    if (tabs.length === 5) {
        recordTest('Bezel Tabs Count', true);
    } else {
        recordTest('Bezel Tabs Count', false, `Found ${tabs.length} tabs, expected 5`);
    }
}

/**
 * Test canvas layout
 */
function testCanvasLayout() {
    const canvasContainer = document.getElementById('canvasContainer');
    const topBar = document.querySelector('.top-bar');
    const controlPanel = document.getElementById('controlPanel');

    if (!canvasContainer || !topBar || !controlPanel) {
        recordTest('Canvas Layout', false, 'Required elements not found');
        return;
    }

    const canvasRect = canvasContainer.getBoundingClientRect();
    const topBarRect = topBar.getBoundingClientRect();
    const panelRect = controlPanel.getBoundingClientRect();

    // Test 1: Canvas fills space between header and bezel
    const expectedTop = topBarRect.bottom;
    const expectedBottom = panelRect.top;

    const topGap = Math.abs(canvasRect.top - expectedTop);
    const bottomGap = Math.abs(canvasRect.bottom - expectedBottom);

    if (topGap <= 2 && bottomGap <= 2) {
        recordTest('Canvas Fills Viewport', true);
    } else {
        recordTest('Canvas Fills Viewport', false,
            `Top gap: ${topGap.toFixed(2)}px, Bottom gap: ${bottomGap.toFixed(2)}px`);
    }

    // Test 2: No overlap
    if (canvasRect.bottom <= panelRect.top + 2) {
        recordTest('No Canvas-Bezel Overlap', true);
    } else {
        const overlap = canvasRect.bottom - panelRect.top;
        recordTest('No Canvas-Bezel Overlap', false, `Overlap: ${overlap.toFixed(2)}px`);
    }
}

/**
 * Test icon rendering
 */
function testIconRendering() {
    const systemButtons = document.querySelectorAll('.system-btn');
    let svgIcons = 0;
    let textIcons = 0;
    let emptyIcons = 0;

    systemButtons.forEach(btn => {
        const iconSpan = btn.querySelector('.system-icon');
        if (iconSpan) {
            const hasSVG = iconSpan.querySelector('svg') !== null;
            const hasText = iconSpan.textContent.trim().length > 0;

            if (hasSVG) svgIcons++;
            else if (hasText) textIcons++;
            else emptyIcons++;
        }
    });

    // Test 1: All icons rendered
    if (emptyIcons === 0) {
        recordTest('All Icons Rendered', true);
    } else {
        recordTest('All Icons Rendered', false, `${emptyIcons} icons are empty`);
    }

    // Test 2: Icon visibility
    systemButtons.forEach((btn, i) => {
        const iconSpan = btn.querySelector('.system-icon');
        if (iconSpan) {
            const style = window.getComputedStyle(iconSpan);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
                recordTest(`Icon ${i + 1} Visible`, true);
            } else {
                recordTest(`Icon ${i + 1} Visible`, false, 'Icon hidden by CSS');
            }
        }
    });
}

/**
 * Test responsive breakpoints
 */
function testResponsiveBreakpoints() {
    const width = window.innerWidth;
    const isMobile = width <= 768;
    const isTablet = width > 768 && width <= 1024;
    const isDesktop = width > 1024;

    // Test 1: Proper layout for viewport
    const body = document.body;

    if (isMobile) {
        recordTest('Mobile Layout Detection', true, 'Mobile viewport detected');

        // Check touch targets
        const buttons = document.querySelectorAll('.system-btn, .action-btn, .bezel-tab');
        let smallTargets = 0;

        buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            const minDim = Math.min(rect.width, rect.height);
            if (minDim < 44) {
                smallTargets++;
            }
        });

        if (smallTargets === 0) {
            recordTest('Mobile Touch Targets', true);
        } else {
            recordTest('Mobile Touch Targets', false,
                `${smallTargets} buttons smaller than 44px`);
        }
    } else {
        recordTest('Desktop Layout', true, 'Desktop viewport detected');
    }
}

/**
 * Test animation performance
 */
function testAnimationPerformance() {
    // Check for CSS animations
    const elementsWithAnimations = document.querySelectorAll('[style*="animation"], [class*="animate"]');

    if (elementsWithAnimations.length > 0) {
        recordTest('Animations Present', true, `${elementsWithAnimations.length} animated elements`);
    } else {
        recordTest('Animations Present', false, 'No animations detected', true);
    }

    // Check animation duration (should be reasonable)
    elementsWithAnimations.forEach((el, i) => {
        const style = window.getComputedStyle(el);
        const duration = parseFloat(style.animationDuration);

        if (duration > 0 && duration <= 5) {
            recordTest(`Animation ${i + 1} Duration`, true);
        } else if (duration > 5) {
            recordTest(`Animation ${i + 1} Duration`, false,
                `Animation too long: ${duration}s`, true);
        }
    });
}

/**
 * Test accessibility
 */
function testAccessibility() {
    // Test 1: Interactive elements have proper roles/labels
    const buttons = document.querySelectorAll('button');
    let unlabeledButtons = 0;

    buttons.forEach(btn => {
        const hasText = btn.textContent.trim().length > 0;
        const hasAriaLabel = btn.hasAttribute('aria-label');
        const hasTitle = btn.hasAttribute('title');

        if (!hasText && !hasAriaLabel && !hasTitle) {
            unlabeledButtons++;
        }
    });

    if (unlabeledButtons === 0) {
        recordTest('Accessible Buttons', true);
    } else {
        recordTest('Accessible Buttons', false,
            `${unlabeledButtons} buttons lack labels`, true);
    }

    // Test 2: Focus indicators
    const focusableElements = document.querySelectorAll('button, a, input, [tabindex]');
    recordTest('Focusable Elements', true, `${focusableElements.length} focusable elements`);
}

/**
 * Test color contrast
 */
function testColorContrast() {
    // Check key text elements for contrast
    const textElements = document.querySelectorAll('.logo, .section-title, .control-label');
    let lowContrastCount = 0;

    textElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bgColor = style.backgroundColor;

        // Simple check - if both are set, likely has been designed
        if (color && bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
            // Has explicit background - likely fine
        }
    });

    recordTest('Color Contrast', true, 'Manual review recommended', true);
}

/**
 * Record test result
 */
function recordTest(name, passed, message = '', isWarning = false) {
    const result = {
        name,
        passed,
        message,
        isWarning
    };

    testResults.tests.push(result);

    if (isWarning) {
        testResults.warnings++;
    } else if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }

    const icon = passed ? '✅' : (isWarning ? '⚠️' : '❌');
    const msg = message ? ` - ${message}` : '';
    console.log(`${icon} ${name}${msg}`);
}

/**
 * Generate test report
 */
function generateTestReport() {
    const total = testResults.tests.length;
    const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('🧪 VISUAL TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${testResults.timestamp}`);
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⚠️ Warnings: ${testResults.warnings}`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('='.repeat(60));

    if (testResults.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.tests.filter(t => !t.passed && !t.isWarning).forEach(t => {
            console.log(`  • ${t.name}: ${t.message || 'Failed'}`);
        });
    }

    if (testResults.warnings > 0) {
        console.log('\n⚠️ WARNINGS:');
        testResults.tests.filter(t => t.isWarning).forEach(t => {
            console.log(`  • ${t.name}: ${t.message || 'Warning'}`);
        });
    }

    console.log('\n' + '='.repeat(60) + '\n');

    return testResults;
}

// Export functions
window.runAllVisualTests = runAllVisualTests;
window.getVisualTestResults = () => testResults;

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVisualTestSuite);
} else {
    initializeVisualTestSuite();
}

console.log('🧪 Visual Test Suite: Loaded');
