// Global variables to store app state
let elements = {};
let state = {
    currentTab: 'html',
    currentOrientation: 'portrait',
    updateTimeout: null
};

// Initialize the application
function initializeApp() {
    initializeElements();
    setupEventListeners();
    loadDefaultCode();
    updatePreview();
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
}

function setupEventListeners() {
    // Tab switching
    elements.tabButtons.forEach(button => {
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

    // Auto-resize textareas
    [elements.htmlEditor, elements.cssEditor, elements.jsEditor].forEach(editor => {
        editor.addEventListener('input', () => autoResize(editor));
    });

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

function switchTab(tabName) {
    if (!tabName) return;
    
    state.currentTab = tabName;
    
    // Update tab buttons
    elements.tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update editor wrappers
    elements.editorWrappers.forEach(wrapper => {
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
    
    // Remove all device classes
    elements.deviceFrame.className = 'device-frame';
    
    // Add selected device class
    if (selectedDevice !== 'responsive') {
        elements.deviceFrame.classList.add(selectedDevice);
        
        // Apply orientation if not responsive
        if (state.currentOrientation === 'landscape' && selectedDevice !== 'laptop' && selectedDevice !== 'laptop-l' && selectedDevice !== 'desktop') {
            elements.deviceFrame.classList.add('landscape');
        }
    } else {
        elements.deviceFrame.classList.add('responsive');
    }
    
    updatePreviewInfo();
    showStatus(`Switched to ${getDeviceDisplayName(selectedDevice)}`, 'info');
}

function toggleOrientation() {
    const selectedDevice = elements.deviceSelect.value;
    
    // Only allow orientation toggle for mobile and tablet devices
    if (selectedDevice === 'responsive' || selectedDevice === 'laptop' || selectedDevice === 'laptop-l' || selectedDevice === 'desktop') {
        showStatus('Orientation toggle not available for this device', 'info');
        return;
    }
    
    state.currentOrientation = state.currentOrientation === 'portrait' ? 'landscape' : 'portrait';
    
    // Update button appearance
    if (state.currentOrientation === 'landscape') {
        elements.orientationBtn.classList.add('landscape');
        elements.orientationBtn.title = 'Switch to Portrait';
    } else {
        elements.orientationBtn.classList.remove('landscape');
        elements.orientationBtn.title = 'Switch to Landscape';
    }
    
    // Apply orientation to device frame
    elements.deviceFrame.classList.toggle('landscape', state.currentOrientation === 'landscape');
    
    updatePreviewInfo();
    showStatus(`Switched to ${state.currentOrientation} orientation`, 'info');
}

function toggleDevice() {
    const devices = ['responsive', 'mobile-s', 'mobile-m', 'mobile-l', 'tablet', 'laptop', 'laptop-l', 'desktop'];
    const currentIndex = devices.indexOf(elements.deviceSelect.value);
    const nextIndex = (currentIndex + 1) % devices.length;
    
    elements.deviceSelect.value = devices[nextIndex];
    changeDevice();
}

function getDeviceDisplayName(device) {
    const deviceNames = {
        'responsive': 'Responsive',
        'mobile-s': 'Mobile S (320px)',
        'mobile-m': 'Mobile M (375px)',
        'mobile-l': 'Mobile L (425px)',
        'tablet': 'Tablet (768px)',
        'laptop': 'Laptop (1024px)',
        'laptop-l': 'Laptop L (1440px)',
        'desktop': 'Desktop (2560px)'
    };
    return deviceNames[device] || device;
}

function updatePreviewInfo() {
    const selectedDevice = elements.deviceSelect.value;
    const deviceName = getDeviceDisplayName(selectedDevice);
    const orientationText = selectedDevice !== 'responsive' && selectedDevice !== 'laptop' && selectedDevice !== 'laptop-l' && selectedDevice !== 'desktop' 
        ? ` - ${state.currentOrientation}` 
        : '';
    
    elements.previewInfo.querySelector('.current-size').textContent = `${deviceName}${orientationText}`;
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
    [elements.htmlEditor, elements.cssEditor, elements.jsEditor].forEach(editor => {
        autoResize(editor);
    });
    
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
        loadDefaultCode();
        updatePreview();
        showStatus('Code reset to default', 'success');
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