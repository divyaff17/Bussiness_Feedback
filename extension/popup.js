// Popup Script for Feedback System Alerts

// Configuration - must match background.js
const CONFIG = {
    API_URL: 'http://localhost:8080',
    DASHBOARD_URL: 'http://localhost:8000/dashboard'
};

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loadingSection = document.getElementById('loadingSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const businessName = document.getElementById('businessName');
const totalCount = document.getElementById('totalCount');
const positiveCount = document.getElementById('positiveCount');
const negativeCount = document.getElementById('negativeCount');
const openDashboardBtn = document.getElementById('openDashboard');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
});

// Check if user is logged in
async function checkLoginStatus() {
    showSection('loading');

    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
        if (response && response.loggedIn) {
            showDashboard(response);
        } else {
            showSection('login');
        }
    });
}

// Show specific section
function showSection(section) {
    loginSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    loadingSection.classList.add('hidden');

    if (section === 'login') loginSection.classList.remove('hidden');
    if (section === 'dashboard') dashboardSection.classList.remove('hidden');
    if (section === 'loading') loadingSection.classList.remove('hidden');
}

// Show dashboard with stats
function showDashboard(stats) {
    showSection('dashboard');

    businessName.textContent = stats.businessName || 'Your Business';
    totalCount.textContent = stats.total ?? '-';
    positiveCount.textContent = stats.positive ?? '-';
    negativeCount.textContent = stats.negative ?? '-';
}

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    loginError.classList.add('hidden');

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Save auth to extension
        chrome.runtime.sendMessage({
            type: 'LOGIN',
            token: data.token,
            businessId: data.user.businessId,
            businessName: data.user.businessName
        }, () => {
            checkLoginStatus();
        });

    } catch (error) {
        loginError.textContent = error.message;
        loginError.classList.remove('hidden');
    }
});

// Open dashboard
openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: CONFIG.DASHBOARD_URL });
});

// Refresh stats
refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Refreshing...';

    chrome.runtime.sendMessage({ type: 'CHECK_NOW' }, () => {
        chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
            if (response && response.loggedIn) {
                showDashboard(response);
            }
            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 Refresh';
        });
    });
});

// Logout
logoutBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
        showSection('login');
    });
});
