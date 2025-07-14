// Global variables to store app state
let elements = {};
let state = {
    currentTab: 'html',
    currentOrientation: 'portrait',
    updateTimeout: null,
};

// Initialize the application
function initializeApp() {
    initializeElements();
    setupEventListeners();
    setupResizablePanels();
    setupShareFeature();
    setupResponsiveDrag(); // Add this line
    loadDefaultCode();
    updatePreview();
    loadCodeFromURL();
}

function initializeElements() {
    // Editor elements
    elements.htmlEditor = document.getElementById('htmlCode');
    elements.cssEditor = document.getElementById('cssCode');
    elements.jsEditor = document.getElementById('jsCode');
    elements.previewFrame = document.getElementById('previewFrame');

    // Tab elements
    elements.tabButtons = document.querySelectorAll('.tab-btn');
    elements.editorWrappers = document.querySelectorAll('.editor-wrapper');

    // Button elements
    elements.runBtn = document.getElementById('runBtn');
    elements.resetBtn = document.getElementById('resetBtn');
    elements.downloadBtn = document.getElementById('downloadBtn');
    elements.refreshBtn = document.getElementById('refreshBtn');
    elements.fullscreenBtn = document.getElementById('fullscreenBtn');
    elements.deviceSelect = document.getElementById('deviceSelect');
    elements.orientationBtn = document.getElementById('orientationBtn');
    elements.deviceFrame = document.getElementById('deviceFrame');
    elements.previewInfo = document.getElementById('previewInfo');

    // Status elements
    elements.lastUpdate = document.getElementById('lastUpdate');
    elements.customSizeControls = document.getElementById('customSizeControls');
    elements.customWidth = document.getElementById('customWidth');
    elements.customHeight = document.getElementById('customHeight');
}

function setupEventListeners() {
    // Tab switching
    elements.tabButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Code editors
    elements.htmlEditor.addEventListener('input', () => debounceUpdate());
    elements.cssEditor.addEventListener('input', () => debounceUpdate());
    elements.jsEditor.addEventListener('input', () => debounceUpdate());

    // Buttons
    elements.runBtn.addEventListener('click', () => updatePreview());
    elements.resetBtn.addEventListener('click', () => resetCode());
    elements.downloadBtn.addEventListener('click', () => downloadCode());
    elements.refreshBtn.addEventListener('click', () => updatePreview());
    elements.fullscreenBtn.addEventListener('click', () => toggleFullscreen());
    elements.deviceSelect.addEventListener('change', () => changeDevice());
    elements.orientationBtn.addEventListener('click', () => toggleOrientation());

    // Add event listeners for custom size inputs
    if (elements.customWidth && elements.customHeight) {
        elements.customWidth.addEventListener('input', () => applyCustomSize());
        elements.customHeight.addEventListener('input', () => applyCustomSize());
    }

    // Auto-resize textareas
    [elements.htmlEditor, elements.cssEditor, elements.jsEditor].forEach(
        (editor) => {
            editor.addEventListener('input', () => autoResize(editor));
        }
    );

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    updatePreview();
                    break;
                case 'r':
                    e.preventDefault();
                    resetCode();
                    break;
                case 's':
                    e.preventDefault();
                    downloadCode();
                    break;
                case 'd':
                    e.preventDefault();
                    toggleDevice();
                    break;
            }
        }
    });
}

function setupResizablePanels() {
    const divider = document.getElementById('verticalDivider');
    const editorsPanel = document.querySelector('.editors-panel');
    const previewPanel = document.querySelector('.preview-panel');
    if (!divider || !editorsPanel || !previewPanel) return;

    let isDragging = false;
    let startX = 0;
    let startEditorsWidth = 0;
    let startPreviewWidth = 0;

    divider.addEventListener('mousedown', (e) => {
        if (window.innerWidth < 1024) return;
        isDragging = true;
        startX = e.clientX;
        startEditorsWidth = editorsPanel.offsetWidth;
        startPreviewWidth = previewPanel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const containerWidth = editorsPanel.parentNode.offsetWidth;
        let newEditorsWidth = startEditorsWidth + dx;
        let newPreviewWidth = startPreviewWidth - dx;
        // Set min/max widths
        const minWidth = 300;
        if (newEditorsWidth < minWidth || newPreviewWidth < minWidth) return;
        editorsPanel.style.flex = 'none';
        previewPanel.style.flex = 'none';
        editorsPanel.style.width = newEditorsWidth + 'px';
        previewPanel.style.width = newPreviewWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    // Reset panel widths on window resize or device switch
    window.addEventListener('resize', () => {
        if (window.innerWidth < 1024) {
            editorsPanel.style.width = '';
            previewPanel.style.width = '';
            editorsPanel.style.flex = '';
            previewPanel.style.flex = '';
        }
    });
}

function setupShareFeature() {
    const shareBtn = document.getElementById('shareBtn');
    const shareModal = document.getElementById('shareModal');
    const shareLinkInput = document.getElementById('shareLink');
    const copyBtn = document.getElementById('copyShareLinkBtn');
    const closeBtn = document.getElementById('closeShareModalBtn');

    if (!shareBtn || !shareModal || !shareLinkInput || !copyBtn || !closeBtn)
        return;

    shareBtn.addEventListener('click', () => {
        const html = elements.htmlEditor.value;
        const css = elements.cssEditor.value;
        const js = elements.jsEditor.value;
        // Encode code as base64 JSON
        const codeObj = { html, css, js };
        const codeStr = JSON.stringify(codeObj);
        const encoded = btoa(unescape(encodeURIComponent(codeStr)));
        // Generate shareable link
        const url = `${window.location.origin}${window.location.pathname}#code=${encoded}`;
        shareLinkInput.value = url;
        shareModal.style.display = 'flex';
        shareLinkInput.select();
    });

    copyBtn.addEventListener('click', () => {
        shareLinkInput.select();
        document.execCommand('copy');
        showStatus('Share link copied!', 'success');
    });

    closeBtn.addEventListener('click', () => {
        shareModal.style.display = 'none';
    });

    // Close modal on overlay click
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.style.display = 'none';
        }
    });
}

function loadCodeFromURL() {
    if (window.location.hash.startsWith('#code=')) {
        try {
            const encoded = window.location.hash.replace('#code=', '');
            const codeStr = decodeURIComponent(escape(atob(encoded)));
            const codeObj = JSON.parse(codeStr);
            if (codeObj.html !== undefined)
                elements.htmlEditor.value = codeObj.html;
            if (codeObj.css !== undefined)
                elements.cssEditor.value = codeObj.css;
            if (codeObj.js !== undefined) elements.jsEditor.value = codeObj.js;
            // Auto-resize after loading
            [
                elements.htmlEditor,
                elements.cssEditor,
                elements.jsEditor,
            ].forEach((editor) => autoResize(editor));
            updatePreview();
            showStatus('Loaded shared code!', 'success');
        } catch (e) {
            showStatus('Failed to load shared code.', 'error');
        }
    }
}

function switchTab(tabName) {
    if (!tabName) return;

    state.currentTab = tabName;

    // Update tab buttons
    elements.tabButtons.forEach((btn) => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update editor wrappers
    elements.editorWrappers.forEach((wrapper) => {
        wrapper.classList.remove('active');
        if (wrapper.id === `${tabName}-editor`) {
            wrapper.classList.add('active');
        }
    });

    // Focus the active editor
    setTimeout(() => {
        const activeEditor = document.querySelector(`#${tabName}Code`);
        if (activeEditor) {
            activeEditor.focus();
        }
    }, 100);
}

function changeDevice() {
    const selectedDevice = elements.deviceSelect.value;

    // Toggle custom size controls visibility
    if (elements.customSizeControls) {
        elements.customSizeControls.style.display =
            selectedDevice === 'custom' ? 'flex' : 'none';
    }

    // Remove all device classes
    elements.deviceFrame.className = 'device-frame';

    // Clear any custom inline styles when switching to a different device
    if (selectedDevice !== 'custom') {
        elements.deviceFrame.style.width = '';
        elements.deviceFrame.style.height = '';
    }

    // Add selected device class
    if (selectedDevice !== 'responsive' && selectedDevice !== 'custom') {
        elements.deviceFrame.classList.add(selectedDevice);

        // Apply orientation if not responsive
        if (
            state.currentOrientation === 'landscape' &&
            selectedDevice !== 'laptop' &&
            selectedDevice !== 'laptop-l' &&
            selectedDevice !== 'desktop'
        ) {
            elements.deviceFrame.classList.add('landscape');
        }
    } else if (selectedDevice === 'responsive') {
        elements.deviceFrame.classList.add('responsive');
    } else if (selectedDevice === 'custom') {
        // Apply custom size if values exist
        applyCustomSize();
    }

    updatePreviewInfo();
    showStatus(`Switched to ${getDeviceDisplayName(selectedDevice)}`, 'info');
}

function applyCustomSize() {
    if (!elements.customWidth || !elements.customHeight) return;

    const width = elements.customWidth.value || 800;
    const height = elements.customHeight.value || 600;

    // Apply custom size to device frame
    elements.deviceFrame.style.width = `${width}px`;
    elements.deviceFrame.style.height = `${height}px`;
    elements.deviceFrame.classList.add('custom-size');

    updatePreviewInfo();
}

function getDeviceDisplayName(device) {
    const deviceNames = {
        responsive: 'Responsive',
        custom: 'Custom Size',
        'mobile-s': 'Mobile S (320px)',
        'mobile-m': 'Mobile M (375px)',
        'mobile-l': 'Mobile L (425px)',
        tablet: 'Tablet (768px)',
        laptop: 'Laptop (1024px)',
        'laptop-l': 'Laptop L (1440px)',
        desktop: 'Desktop (2560px)',
    };
    return deviceNames[device] || device;
}

function updatePreviewInfo() {
    const selectedDevice = elements.deviceSelect.value;
    const deviceName = getDeviceDisplayName(selectedDevice);
    let sizeInfo = '';

    if (
        selectedDevice === 'custom' &&
        elements.customWidth &&
        elements.customHeight
    ) {
        const width = elements.customWidth.value || 800;
        const height = elements.customHeight.value || 600;
        sizeInfo = ` (${width}×${height})`;
    }

    const orientationText =
        selectedDevice !== 'responsive' &&
        selectedDevice !== 'custom' &&
        selectedDevice !== 'laptop' &&
        selectedDevice !== 'laptop-l' &&
        selectedDevice !== 'desktop' ?
        ` - ${state.currentOrientation}` :
        '';

    elements.previewInfo.querySelector(
        '.current-size'
    ).textContent = `${deviceName}${sizeInfo}${orientationText}`;
}

function toggleOrientation() {
    const selectedDevice = elements.deviceSelect.value;

    // Only allow orientation toggle for mobile and tablet devices
    if (
        selectedDevice === 'responsive' ||
        selectedDevice === 'laptop' ||
        selectedDevice === 'laptop-l' ||
        selectedDevice === 'desktop'
    ) {
        showStatus('Orientation toggle not available for this device', 'info');
        return;
    }

    state.currentOrientation =
        state.currentOrientation === 'portrait' ? 'landscape' : 'portrait';

    // Update button appearance
    if (state.currentOrientation === 'landscape') {
        elements.orientationBtn.classList.add('landscape');
        elements.orientationBtn.title = 'Switch to Portrait';
    } else {
        elements.orientationBtn.classList.remove('landscape');
        elements.orientationBtn.title = 'Switch to Landscape';
    }

    // Apply orientation to device frame
    elements.deviceFrame.classList.toggle(
        'landscape',
        state.currentOrientation === 'landscape'
    );

    updatePreviewInfo();
    showStatus(`Switched to ${state.currentOrientation} orientation`, 'info');
}

function toggleDevice() {
    const devices = [
        'responsive',
        'mobile-s',
        'mobile-m',
        'mobile-l',
        'tablet',
        'laptop',
        'laptop-l',
        'desktop',
    ];
    const currentIndex = devices.indexOf(elements.deviceSelect.value);
    const nextIndex = (currentIndex + 1) % devices.length;

    elements.deviceSelect.value = devices[nextIndex];
    changeDevice();
}

function getDeviceDisplayName(device) {
    const deviceNames = {
        responsive: 'Responsive',
        'mobile-s': 'Mobile S (320px)',
        'mobile-m': 'Mobile M (375px)',
        'mobile-l': 'Mobile L (425px)',
        tablet: 'Tablet (768px)',
        laptop: 'Laptop (1024px)',
        'laptop-l': 'Laptop L (1440px)',
        desktop: 'Desktop (2560px)',
    };
    return deviceNames[device] || device;
}

function updatePreviewInfo() {
    const selectedDevice = elements.deviceSelect.value;
    const deviceName = getDeviceDisplayName(selectedDevice);
    const orientationText =
        selectedDevice !== 'responsive' &&
        selectedDevice !== 'laptop' &&
        selectedDevice !== 'laptop-l' &&
        selectedDevice !== 'desktop' ?
        ` - ${state.currentOrientation}` :
        '';

    elements.previewInfo.querySelector(
        '.current-size'
    ).textContent = `${deviceName}${orientationText}`;
}

function loadDefaultCode() {
    elements.htmlEditor.value = `<div class="welcome-container">
    <h1 class="title">Welcome to CodePreview Studio</h1>
    <p class="subtitle">Create amazing web experiences with HTML, CSS, and JavaScript</p>
    <div class="features">
        <div class="feature">
            <div class="feature-icon">🚀</div>
            <h3>Live Preview</h3>
            <p>See your changes instantly</p>
        </div>
        <div class="feature">
            <div class="feature-icon">⚡</div>
            <h3>Fast & Responsive</h3>
            <p>Built for speed and performance</p>
        </div>
        <div class="feature">
            <div class="feature-icon">🎨</div>
            <h3>Beautiful Design</h3>
            <p>Professional and modern interface</p>
        </div>
    </div>
    <button class="cta-button" onclick="animateButton(this)">Get Started</button>
</div>`;

    elements.cssEditor.value = `body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.welcome-container {
    background: white;
    padding: 3rem;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 800px;
    width: 100%;
}

.title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.subtitle {
    font-size: 1.1rem;
    color: #64748b;
    margin-bottom: 3rem;
    line-height: 1.6;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
}

.feature {
    padding: 1.5rem;
    border-radius: 12px;
    background: #f8fafc;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.feature-icon {
    font-size: 2rem;
    margin-bottom: 1rem;
}

.feature h3 {
    color: #1e293b;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.feature p {
    color: #64748b;
    font-size: 0.9rem;
}

.cta-button {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.cta-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
}

.cta-button:active {
    transform: translateY(0);
}

@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
    100% {
        transform: scale(1);
    }
}

.pulse {
    animation: pulse 0.3s ease;
}

@media (max-width: 768px) {
    .welcome-container {
        padding: 2rem;
        margin: 1rem;
    }
    
    .title {
        font-size: 2rem;
    }
    
    .features {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
}`;

    elements.jsEditor.value = `function animateButton(button) {
    // Add pulse animation
    button.classList.add('pulse');
    
    // Remove animation class after animation completes
    setTimeout(() => {
        button.classList.remove('pulse');
    }, 300);
    
    // Show a fun message
    const messages = [
        "Welcome to the world of web development! 🌟",
        "Keep coding and creating amazing things! 💻",
        "You're doing great! Keep it up! 🚀",
        "The future is bright with your skills! ✨",
        "Code, create, inspire! 💡"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Create a temporary message element
    const messageEl = document.createElement('div');
    messageEl.textContent = randomMessage;
    messageEl.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    \`;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = \`
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    \`;
    
    document.head.appendChild(style);
    document.body.appendChild(messageEl);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 300);
    }, 3000);
}

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling for any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});`;

    // Auto-resize all textareas
    [elements.htmlEditor, elements.cssEditor, elements.jsEditor].forEach(
        (editor) => {
            autoResize(editor);
        }
    );

    // Initialize device frame
    changeDevice();
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function debounceUpdate() {
    clearTimeout(state.updateTimeout);
    state.updateTimeout = setTimeout(() => {
        updatePreview();
    }, 500);
}

function updatePreview() {
    const html = elements.htmlEditor.value;
    const css = elements.cssEditor.value;
    const js = elements.jsEditor.value;

    const previewContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>
                ${css}
            </style>
        </head>
        <body>
            ${html}
            <script>
                try {
                    ${js}
                } catch (error) {
                    console.error('JavaScript Error:', error);
                }
            </script>
        </body>
        </html>
    `;

    elements.previewFrame.srcdoc = previewContent;
    updateLastModified();
    showStatus('Code updated successfully!', 'success');
}

function resetCode() {
    if (confirm('Are you sure you want to reset all code? This action cannot be undone.')) {
        // Clear all fields
        elements.htmlEditor.value = '';
        elements.cssEditor.value = '';
        elements.jsEditor.value = '';

        // Resize editors and update preview
        [elements.htmlEditor, elements.cssEditor, elements.jsEditor].forEach(editor => autoResize(editor));
        updatePreview();
        showStatus('All code cleared!', 'success');
    }
}

function downloadCode() {
    const html = elements.htmlEditor.value;
    const css = elements.cssEditor.value;
    const js = elements.jsEditor.value;

    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodePreview Export</title>
    <style>
        ${css}
    </style>
</head>
<body>
    ${html}
    <script>
        ${js}
    </script>
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codepreview-export.html';
    a.click();
    URL.revokeObjectURL(url);

    showStatus('Code exported successfully!', 'success');
}

function toggleFullscreen() {
    const previewPanel = document.querySelector('.preview-panel');
    const editorsPanel = document.querySelector('.editors-panel');
    const deviceFrame = elements.deviceFrame;

    if (previewPanel.classList.contains('fullscreen')) {
        previewPanel.classList.remove('fullscreen');
        editorsPanel.style.display = 'flex';
        elements.fullscreenBtn.innerHTML = '<span class="icon">⛶</span>';
        // Restore device frame constraints
        changeDevice();
    } else {
        previewPanel.classList.add('fullscreen');
        editorsPanel.style.display = 'none';
        elements.fullscreenBtn.innerHTML = '<span class="icon">⛷</span>';

        // In fullscreen, make responsive if not already
        if (elements.deviceSelect.value !== 'responsive') {
            deviceFrame.classList.add('fullscreen-override');
            deviceFrame.style.width = '100%';
            deviceFrame.style.height = '100%';
            deviceFrame.style.maxWidth = 'none';
            deviceFrame.style.maxHeight = 'none';

            // Update preview info for fullscreen mode
            const previewInfo = document.querySelector('.preview-info');
            if (previewInfo) {
                previewInfo.textContent = `Fullscreen (${Math.round(window.innerWidth)}px)`;
            }
        }
    }
}

function updateLastModified() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    elements.lastUpdate.textContent = `Last updated: ${timeString}`;
}

function showStatus(message, type = 'info') {
    // Create status notification
    const notification = document.createElement('div');
    notification.className = `status-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInUp 0.3s ease;
    `;

    if (type === 'success') {
        notification.style.background = '#10b981';
    } else if (type === 'error') {
        notification.style.background = '#ef4444';
    } else {
        notification.style.background = '#6366f1';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Add animation styles
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideInUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100%);
            opacity: 0;
        }
    }
    
    .fullscreen {
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999;
        background: white;
    }
`;

document.head.appendChild(animationStyles);


function setupResponsiveDrag() {
    const deviceFrame = elements.deviceFrame;
    let isResizing = false;
    let startX;
    let startWidth;

    // Function to handle mouse down on the resize handle
    function startResize(e) {
        // Only apply to responsive mode or fullscreen mode
        if (!deviceFrame.classList.contains('responsive') &&
            !deviceFrame.classList.contains('fullscreen-override')) return;

        // Check if we're on the resize handle (right 12px of the frame)
        const rect = deviceFrame.getBoundingClientRect();
        if (e.clientX < rect.right - 12) return;

        isResizing = true;
        startX = e.clientX;
        startWidth = deviceFrame.offsetWidth;

        // Add resize-active class to body for cursor indication
        document.body.classList.add('resize-active');

        // Prevent text selection during drag
        e.preventDefault();
    }

    // Function to handle mouse move during resize
    function doResize(e) {
        if (!isResizing) return;

        // Calculate new width based on mouse movement
        // Moving right increases width, moving left decreases width
        const width = startWidth + (e.clientX - startX);

        // Set min and max width constraints
        const minWidth = 320; // Mobile small size
        let maxWidth;

        if (deviceFrame.classList.contains('fullscreen-override')) {
            // In fullscreen, use window width as max
            maxWidth = window.innerWidth - 20; // Leave a small margin
        } else {
            // In normal view, use container width
            const container = document.querySelector('.preview-container');
            maxWidth = container ? container.offsetWidth - 20 : window.innerWidth - 20;
        }

        const newWidth = Math.max(minWidth, Math.min(width, maxWidth));
        deviceFrame.style.width = `${newWidth}px`;

        // Update the preview info to show current width
        const previewInfo = document.querySelector('.preview-info');
        if (previewInfo) {
            const mode = deviceFrame.classList.contains('fullscreen-override') ?
                'Fullscreen' : 'Responsive';
            previewInfo.textContent = `${mode} (${newWidth}px)`;
        }
    }

    // Function to handle mouse up to end resize
    function stopResize() {
        if (isResizing) {
            isResizing = false;
            document.body.classList.remove('resize-active');
        }
    }

    // Add event listeners
    deviceFrame.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);

    // Handle edge cases: mouse leaving window and touch events
    document.addEventListener('mouseleave', stopResize);

    // Add touch support for mobile devices
    deviceFrame.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const rect = deviceFrame.getBoundingClientRect();
        if (touch.clientX < rect.right - 12) return;

        isResizing = true;
        startX = touch.clientX;
        startWidth = deviceFrame.offsetWidth;
        document.body.classList.add('resize-active');
        e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        const touch = e.touches[0];

        const width = startWidth + (touch.clientX - startX);
        const minWidth = 320;
        let maxWidth = deviceFrame.classList.contains('fullscreen-override') ?
            window.innerWidth - 20 :
            document.querySelector('.preview-container').offsetWidth - 20;

        const newWidth = Math.max(minWidth, Math.min(width, maxWidth));
        deviceFrame.style.width = `${newWidth}px`;

        const previewInfo = document.querySelector('.preview-info');
        if (previewInfo) {
            const mode = deviceFrame.classList.contains('fullscreen-override') ?
                'Fullscreen' : 'Responsive';
            previewInfo.textContent = `${mode} (${newWidth}px)`;
        }

        e.preventDefault();
    });

    document.addEventListener('touchend', stopResize);
    document.addEventListener('touchcancel', stopResize);
}