// ============================================
// RoboHelper - Chatbot Frontend Logic
// ============================================

const API_BASE = 'http://127.0.0.1:8000/api';
let sessionId = null;
let isLoading = false;

// Quick component chips data will be fetched from API
let groupedComponents = {};

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    await fetchComponents();
    renderQuickChips();
    addWelcomeMessage();
    setupTextareaAutoResize();
    setupKeyboardShortcuts();
    await fetchStats();
}

// ============ CHAT FUNCTIONS ============

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || isLoading) return;

    // Add user message to chat
    addMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    showTyping();
    isLoading = true;
    updateSendButton();

    try {
        const response = await fetch(`${API_BASE}/chat/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                session_id: sessionId
            })
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        sessionId = data.session_id;

        // Remove typing indicator
        hideTyping();

        // Render bot response with rich content
        renderBotResponse(data.response);

    } catch (error) {
        console.error('Error:', error);
        hideTyping();
        addMessage('bot', formatErrorMessage());
    } finally {
        isLoading = false;
        updateSendButton();
    }
}

function sendSuggestion(text) {
    const input = document.getElementById('messageInput');
    input.value = text;
    sendMessage();
    // Close sidebar on mobile
    closeSidebar();
}

function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    sessionId = null;
    addWelcomeMessage();
}

// ============ MESSAGE RENDERING ============

function addMessage(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const avatarContent = role === 'bot'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.5"/><circle cx="15.5" cy="16" r="1.5"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    messageEl.innerHTML = `
        <div class="message-avatar">${avatarContent}</div>
        <div class="message-content">
            <div class="message-bubble">${content}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    chatMessages.appendChild(messageEl);
    scrollToBottom();
}

function renderBotResponse(response) {
    const chatMessages = document.getElementById('chatMessages');
    const messageEl = document.createElement('div');
    messageEl.className = 'message bot';

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let content = '';

    // Build rich response based on type
    if (response.type === 'recommendation') {
        // Component tags
        if (response.components && response.components.length > 0) {
            content += '<div class="component-tags">';
            response.components.forEach(comp => {
                content += `<span class="component-tag">${escapeHtml(titleCase(comp))}</span>`;
            });
            content += '</div>';
        }

        // Ready to build section
        if (response.projects && response.projects.length > 0) {
            content += `<p style="margin: 10px 0; color: var(--success); font-weight: 600;">✅ Ready to Build:</p>`;
            content += '<div class="project-cards">';
            response.projects.forEach((project, index) => {
                content += renderProjectCard(project, index + 1, false);
            });
            content += '</div>';
        }

        // Suggestions/Next Steps section
        if (response.suggested_projects && response.suggested_projects.length > 0) {
            content += `<p style="margin: 20px 0 10px; color: var(--accent-secondary); font-weight: 600;">🚀 Next Steps (If you get a few more parts):</p>`;
            content += '<div class="project-cards">';
            response.suggested_projects.forEach((project, index) => {
                content += renderProjectCard(project, index + 1, true);
            });
            content += '</div>';
        }

        if (!response.projects?.length && !response.suggested_projects?.length) {
            content += `<p style="margin: 10px 0;">${formatMarkdown(response.message)}</p>`;
        }

        content += `<p style="margin-top: 14px; font-size: 13px; color: var(--text-muted);">Want more ideas? Add or change components and ask again!</p>`;
    } else {
        // Simple text response (greeting, help, farewell, etc.)
        content = formatMarkdown(response.message);
    }

    messageEl.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="8.5" cy="16" r="1.5"/>
                <circle cx="15.5" cy="16" r="1.5"/>
                <path d="M12 11V7"/>
                <circle cx="12" cy="5" r="2"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-bubble">${content}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    chatMessages.appendChild(messageEl);
    scrollToBottom();
}

function addWelcomeMessage() {
    const welcome = `
        <strong style="font-size: 16px;">Welcome to RoboHelper!</strong>
        <br><br>
        I'm your AI-powered robotics project assistant. Tell me what electronic components you have, and I'll suggest awesome project ideas!
        <br><br>
        <strong>Try saying:</strong>
        <br>
        <em>"I have an Arduino Uno, ultrasonic sensor, and servo motor"</em>
        <br>
        <em>"What can I build with IR sensors and DC motors?"</em>
        <br><br>
        Type <strong>help</strong> to see all the components I know about.
    `;
    addMessage('bot', welcome);
}

// ============ TYPING INDICATOR ============

function showTyping() {
    const chatMessages = document.getElementById('chatMessages');
    const indicator = document.createElement('div');
    indicator.className = 'message bot';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="8.5" cy="16" r="1.5"/>
                <circle cx="15.5" cy="16" r="1.5"/>
                <path d="M12 11V7"/>
                <circle cx="12" cy="5" r="2"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(indicator);
    scrollToBottom();
}

function hideTyping() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// ============ SIDEBAR & UI ============

function renderQuickChips() {
    const container = document.getElementById('quickChips');
    if (!Object.keys(groupedComponents).length) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 11px;">Loading components...</p>';
        return;
    }

    let html = '';
    const categoryNames = {
        'microcontroller': 'Microcontrollers',
        'sensor': 'Sensors',
        'actuator': 'Actuators',
        'module': 'Modules',
        'display': 'Displays',
        'power': 'Power',
        'other': 'Others'
    };

    // Define order
    const order = ['microcontroller', 'sensor', 'actuator', 'module', 'display', 'power', 'other'];

    order.forEach(cat => {
        if (groupedComponents[cat] && groupedComponents[cat].length > 0) {
            html += `<div class="sidebar-category-header">${categoryNames[cat] || cat}</div>`;
            html += '<div class="quick-chips">';
            groupedComponents[cat].forEach(comp => {
                html += `<button class="quick-chip" onclick="addChipToInput('${comp.name}')">${comp.name}</button>`;
            });
            html += '</div>';
        }
    });

    container.innerHTML = html;
}

async function fetchComponents() {
    try {
        const response = await fetch(`${API_BASE}/components/`);
        if (response.ok) {
            const components = await response.json();
            
            // Group by category
            groupedComponents = components.reduce((acc, comp) => {
                const cat = comp.category || 'other';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(comp);
                return acc;
            }, {});
        }
    } catch (error) {
        console.error('Error fetching components:', error);
    }
}

function renderProjectCard(project, index, isSuggestion) {
    const diffClass = `badge-${project.difficulty}`;
    const matchedComps = project.matched_components || [];
    const missingComps = project.missing_components || [];

    return `
        <div class="project-card ${isSuggestion ? 'suggestion' : ''}">
            <div class="project-card-header">
                <span class="project-card-title">${index}. ${escapeHtml(project.title)}</span>
                <div class="project-card-badges">
                    <span class="badge badge-score">${project.score}% Match</span>
                    <span class="badge ${diffClass}">${project.difficulty}</span>
                </div>
            </div>
            <p class="project-card-desc">${escapeHtml(project.description)}</p>
            
            <div class="project-card-components">
                ${project.components.map(c => {
                    const isMatched = matchedComps.some(mc =>
                        c.toLowerCase().includes(mc.toLowerCase()) ||
                        mc.toLowerCase().includes(c.toLowerCase())
                    );
                    const isMissing = missingComps.some(mc =>
                        c.toLowerCase().includes(mc.toLowerCase()) ||
                        mc.toLowerCase().includes(c.toLowerCase())
                    );
                    
                    let chipClass = '';
                    if (isMatched) chipClass = 'matched';
                    else if (isMissing) chipClass = 'missing';

                    return `<span class="project-comp-chip ${chipClass}">${escapeHtml(c)}</span>`;
                }).join('')}
            </div>
            
            ${isSuggestion && missingComps.length > 0 ? `
                <div class="missing-alert">
                    ⚠️ Missing: ${missingComps.map(m => `<strong>${escapeHtml(m)}</strong>`).join(', ')}
                </div>
            ` : ''}

            ${project.instructions ? `
                <div class="project-card-tips">
                    <strong>Build Tips:</strong> ${escapeHtml(project.instructions)}
                </div>
            ` : ''}
        </div>
    `;
}

function addChipToInput(component) {
    const input = document.getElementById('messageInput');
    const currentText = input.value.trim();

    if (currentText) {
        // Check if component is already mentioned
        if (!currentText.toLowerCase().includes(component.toLowerCase())) {
            input.value = currentText + ', ' + component;
        }
    } else {
        input.value = 'I have ' + component;
    }

    input.focus();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');

    // Add/remove overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        document.body.appendChild(overlay);
    }
    overlay.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('show');
}

async function fetchStats() {
    try {
        const [compRes, projRes] = await Promise.all([
            fetch(`${API_BASE}/components/`),
            fetch(`${API_BASE}/projects/`)
        ]);

        if (compRes.ok) {
            const components = await compRes.json();
            document.getElementById('compCount').textContent = components.length;
        }

        if (projRes.ok) {
            const projects = await projRes.json();
            document.getElementById('projCount').textContent = projects.length;
        }
    } catch (error) {
        console.error('Could not fetch stats:', error);
    }
}

// ============ TEXTAREA AUTO-RESIZE ============

function setupTextareaAutoResize() {
    const textarea = document.getElementById('messageInput');
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
}

function setupKeyboardShortcuts() {
    const textarea = document.getElementById('messageInput');
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// ============ UTILITIES ============

function updateSendButton() {
    const btn = document.getElementById('sendBtn');
    btn.disabled = isLoading;
}

function scrollToBottom() {
    const container = document.getElementById('chatContainer');
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function titleCase(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function formatMarkdown(text) {
    // Convert basic markdown to HTML
    let html = escapeHtml(text);

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Headers: ### text
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');

    // Horizontal rules: ---
    html = html.replace(/^---$/gm, '<hr>');

    // Bullet points
    html = html.replace(/^[•] (.*)$/gm, '<li>$1</li>');

    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
}

function formatErrorMessage() {
    return `
        <strong style="color: var(--danger);">Connection Error</strong>
        <br><br>
        Could not connect to the server. Please make sure:
        <br>
        1. The Django backend is running on <code>http://127.0.0.1:8000</code>
        <br>
        2. Run: <code>python manage.py runserver</code> in the backend folder
        <br><br>
        <em>Then try sending your message again.</em>
    `;
}
