/**
 * VIB34D Geometric SVG Icon System
 * Replaces emojis with procedurally generated geometric icons
 * Icons follow system color rules and mathematical patterns
 */

console.log('🎨 Geometric Icons Module: Loading...');

// Icon generation rules based on system
const SYSTEM_COLORS = {
    faceted: '#00ffff',      // Cyan
    quantum: '#ff00ff',      // Magenta
    holographic: '#ff64ff',  // Pink
    polychora: '#ffff00',    // Yellow
    base: '#00ffff',         // Base/default
    hypersphere: '#ff00ff',  // Hypersphere core
    hypertetra: '#ff8800'    // Hypertetrahedron core
};

// SVG icon templates
const ICONS = {
    // System icons
    faceted: (color = SYSTEM_COLORS.faceted) => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2 L22 8 L22 16 L12 22 L2 16 L2 8 Z"
                  stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>
            <path d="M12 2 L12 22 M2 8 L22 16 M22 8 L2 16"
                  stroke="${color}" stroke-width="1" opacity="0.4"/>
        </svg>
    `,

    quantum: (color = SYSTEM_COLORS.quantum) => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" stroke="${color}" stroke-width="2" opacity="0.3"/>
            <circle cx="12" cy="12" r="5" stroke="${color}" stroke-width="2" opacity="0.5"/>
            <circle cx="12" cy="12" r="2" fill="${color}" opacity="0.8"/>
            <path d="M12 4 L12 20 M4 12 L20 12" stroke="${color}" stroke-width="1" opacity="0.4"/>
            <circle cx="12" cy="4" r="1.5" fill="${color}"/>
            <circle cx="20" cy="12" r="1.5" fill="${color}"/>
            <circle cx="12" cy="20" r="1.5" fill="${color}"/>
            <circle cx="4" cy="12" r="1.5" fill="${color}"/>
        </svg>
    `,

    holographic: (color = SYSTEM_COLORS.holographic) => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12 Q7 6, 12 12 T21 12" stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>
            <path d="M3 10 Q7 4, 12 10 T21 10" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.4"/>
            <path d="M3 14 Q7 8, 12 14 T21 14" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.4"/>
            <circle cx="12" cy="12" r="3" stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>
            <circle cx="12" cy="12" r="1" fill="${color}" opacity="1"/>
        </svg>
    `,

    polychora: (color = SYSTEM_COLORS.polychora) => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z"
                  stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>
            <path d="M8 9 L16 9 L16 15 L8 15 Z"
                  stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>
            <path d="M12 2 L12 9 M12 15 L12 22 M4 7 L8 9 M20 7 L16 9 M4 17 L8 15 M20 17 L16 15"
                  stroke="${color}" stroke-width="1" opacity="0.4"/>
        </svg>
    `,

    // Action icons
    save: (color = '#00ff00') => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                  stroke="${color}" stroke-width="2"/>
            <path d="M17 21v-8H7v8M7 3v5h8" stroke="${color}" stroke-width="2"/>
            <circle cx="12" cy="14" r="2" fill="${color}" opacity="0.8"/>
        </svg>
    `,

    gallery: (color = '#ff00ff') => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7" height="7" stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>
            <rect x="14" y="3" width="7" height="7" stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>
            <rect x="3" y="14" width="7" height="7" stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>
            <rect x="14" y="14" width="7" height="7" stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>
            <circle cx="6.5" cy="6.5" r="1.5" fill="${color}"/>
            <circle cx="17.5" cy="6.5" r="1.5" fill="${color}"/>
            <circle cx="6.5" cy="17.5" r="1.5" fill="${color}"/>
            <circle cx="17.5" cy="17.5" r="1.5" fill="${color}"/>
        </svg>
    `,

    audio: (color = '#ffff00') => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 9v6l-3 2v-10l3 2z" fill="${color}" opacity="0.8"/>
            <path d="M15 5 Q18 8, 15 11" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
            <path d="M15 9 Q19 12, 15 15" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
            <path d="M15 13 Q21 12, 15 19" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        </svg>
    `,

    tilt: (color = '#00ffff') => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="8" width="12" height="8" stroke="${color}" stroke-width="2" fill="none" opacity="0.6" transform="rotate(-15 12 12)"/>
            <circle cx="12" cy="12" r="2" fill="${color}" opacity="0.8"/>
            <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12"
                  stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        </svg>
    `,

    ai: (color = '#ff64ff') => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2" fill="none" opacity="0.4"/>
            <circle cx="8" cy="10" r="1.5" fill="${color}"/>
            <circle cx="16" cy="10" r="1.5" fill="${color}"/>
            <path d="M8 15 Q12 17, 16 15" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M4 6 L8 4 M20 6 L16 4 M4 18 L8 20 M20 18 L16 20"
                  stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
        </svg>
    `,

    interactivity: (color = '#00ffff') => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" stroke="${color}" stroke-width="2" fill="none" opacity="0.4"/>
            <text x="12" y="16" font-family="Orbitron" font-size="12" font-weight="bold"
                  fill="${color}" text-anchor="middle">I</text>
        </svg>
    `,

    // Geometry core type icons
    base: (color = SYSTEM_COLORS.base) => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>
            <circle cx="12" cy="12" r="2" fill="${color}" opacity="0.8"/>
        </svg>
    `,

    hypersphere: (color = SYSTEM_COLORS.hypersphere) => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2" fill="none" opacity="0.3"/>
            <ellipse cx="12" cy="12" rx="9" ry="4" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.5"/>
            <ellipse cx="12" cy="12" rx="4" ry="9" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.5"/>
            <circle cx="12" cy="12" r="3" fill="${color}" opacity="0.8"/>
        </svg>
    `,

    hypertetra: (color = SYSTEM_COLORS.hypertetra) => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3 L21 15 L12 21 L3 15 Z"
                  stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>
            <path d="M12 3 L12 21 M3 15 L21 15"
                  stroke="${color}" stroke-width="1" opacity="0.4"/>
            <circle cx="12" cy="12" r="2" fill="${color}" opacity="0.8"/>
        </svg>
    `,

    // Randomize icons
    randomizeAll: (color = '#ff00ff') => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="5" height="5" fill="${color}" opacity="0.8" transform="rotate(15 7.5 7.5)"/>
            <rect x="14" y="5" width="5" height="5" fill="${color}" opacity="0.6" transform="rotate(-15 16.5 7.5)"/>
            <rect x="5" y="14" width="5" height="5" fill="${color}" opacity="0.6" transform="rotate(-15 7.5 16.5)"/>
            <rect x="14" y="14" width="5" height="5" fill="${color}" opacity="0.8" transform="rotate(15 16.5 16.5)"/>
            <circle cx="12" cy="12" r="2" fill="${color}"/>
        </svg>
    `,

    randomizeTab: (color = '#00ffff') => `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3 L19 7 L19 17 L12 21 L5 17 L5 7 Z"
                  stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>
            <path d="M8 10 L16 10 M8 12 L16 12 M8 14 L16 14"
                  stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
            <circle cx="12" cy="12" r="1" fill="${color}"/>
        </svg>
    `
};

/**
 * Create an SVG icon element
 */
function createIcon(iconName, size = 24, customColor = null) {
    const iconFunction = ICONS[iconName];
    if (!iconFunction) {
        console.warn(`⚠️ Icon '${iconName}' not found`);
        return null;
    }

    const svgString = iconFunction(customColor);
    const container = document.createElement('span');
    container.className = `vib-icon vib-icon-${iconName}`;
    container.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
    `;
    container.innerHTML = svgString;

    return container;
}

/**
 * Replace emoji with SVG icon in element
 */
function replaceEmojiWithIcon(element, emojiMap) {
    const text = element.textContent.trim();

    for (const [emoji, iconName] of Object.entries(emojiMap)) {
        if (text.includes(emoji)) {
            const iconSize = element.classList.contains('system-icon') ? 24 :
                           element.classList.contains('tab-icon') ? 20 : 18;

            const icon = createIcon(iconName, iconSize);
            if (icon) {
                element.innerHTML = '';
                element.appendChild(icon);

                // Preserve text if there was additional text
                const remainingText = text.replace(emoji, '').trim();
                if (remainingText) {
                    const textSpan = document.createElement('span');
                    textSpan.textContent = remainingText;
                    element.appendChild(textSpan);
                }
            }
            break;
        }
    }
}

/**
 * Replace all emojis in the UI with SVG icons
 */
function replaceAllEmojisWithIcons() {
    console.log('🔄 Replacing all emojis with geometric SVG icons...');

    const emojiMap = {
        // System icons
        '🔷': 'faceted',
        '🌌': 'quantum',
        '✨': 'holographic',
        '🔮': 'polychora',

        // Action icons
        '💾': 'save',
        '🖼️': 'gallery',
        '🎵': 'audio',
        '📱': 'tilt',
        '🤖': 'ai',
        'I': 'interactivity',

        // Core type icons
        '🌀': 'hypersphere',
        '🔺': 'hypertetra',

        // Randomize icons
        '🎲': 'randomizeAll',
        '🎯': 'randomizeTab'
    };

    // Replace in system buttons
    document.querySelectorAll('.system-icon').forEach(el => {
        replaceEmojiWithIcon(el, emojiMap);
    });

    // Replace in action buttons
    document.querySelectorAll('.action-btn').forEach(el => {
        // Check if it's text-only button
        if (el.textContent.trim().length <= 2) {
            replaceEmojiWithIcon(el, emojiMap);
        }
    });

    // Replace in save button
    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) {
        const emoji = saveBtn.textContent.trim().split(' ')[0];
        if (emojiMap[emoji]) {
            const icon = createIcon(emojiMap[emoji], 20, '#00ff00');
            if (icon) {
                saveBtn.innerHTML = '';
                saveBtn.appendChild(icon);
                const textSpan = document.createElement('span');
                textSpan.textContent = ' SAVE';
                saveBtn.appendChild(textSpan);
            }
        }
    }

    // Replace in tab icons
    document.querySelectorAll('.tab-icon').forEach(el => {
        replaceEmojiWithIcon(el, emojiMap);
    });

    // Replace in core tabs
    document.querySelectorAll('.core-tab-icon').forEach(el => {
        replaceEmojiWithIcon(el, emojiMap);
    });

    // Replace in randomize buttons
    document.querySelectorAll('.tab-random-btn').forEach(el => {
        const text = el.textContent;
        if (text.includes('🎲')) {
            const icon = createIcon('randomizeAll', 16, '#ff00ff');
            if (icon) {
                el.innerHTML = '';
                el.appendChild(icon);
                const textSpan = document.createElement('span');
                textSpan.textContent = ' Randomize All';
                textSpan.style.marginLeft = '6px';
                el.appendChild(textSpan);
            }
        } else if (text.includes('🎯')) {
            const icon = createIcon('randomizeTab', 16, '#00ffff');
            if (icon) {
                el.innerHTML = '';
                el.appendChild(icon);
                const textSpan = document.createElement('span');
                textSpan.textContent = ' Random Tab';
                textSpan.style.marginLeft = '6px';
                el.appendChild(textSpan);
            }
        }
    });

    console.log('✅ All emojis replaced with geometric SVG icons');
}

/**
 * Initialize icon system
 */
function initializeIconSystem() {
    // Wait for DOM and other modules
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(replaceAllEmojisWithIcons, 1000);
        });
    } else {
        setTimeout(replaceAllEmojisWithIcons, 1000);
    }

    // Re-apply when randomize buttons are added
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.classList && node.classList.contains('tab-randomize-buttons')) {
                    setTimeout(() => {
                        replaceAllEmojisWithIcons();
                    }, 100);
                }
            });
        });
    });

    // Observe document body for additions
    setTimeout(() => {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }, 500);
}

// Initialize
initializeIconSystem();

// Export
if (typeof window !== 'undefined') {
    window.createIcon = createIcon;
    window.replaceAllEmojisWithIcons = replaceAllEmojisWithIcons;
    window.GEOMETRIC_ICONS = ICONS;
}

console.log('🎨 Geometric Icons Module: Loaded');
