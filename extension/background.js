// Feedback System Alerts - Background Service Worker

// Configuration
const CONFIG = {
    // Change this to your production backend URL after deployment
    API_URL: 'http://localhost:8080',
    POLL_INTERVAL_MINUTES: 1,  // Check every minute
    DASHBOARD_URL: 'http://localhost:8000/dashboard'
};

// Initialize alarm for periodic polling
chrome.runtime.onInstalled.addListener(() => {
    console.log('Feedback System Alerts installed');
    chrome.alarms.create('checkFeedback', { periodInMinutes: CONFIG.POLL_INTERVAL_MINUTES });
    updateBadge();
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkFeedback') {
        checkForNewFeedback();
    }
});

// Check for new feedback
async function checkForNewFeedback() {
    const auth = await getAuth();
    if (!auth || !auth.token || !auth.businessId) {
        // Not logged in
        chrome.action.setBadgeText({ text: '' });
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/business/${auth.businessId}/alerts`, {
            headers: {
                'Authorization': `Bearer ${auth.token}`
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch alerts');
            return;
        }

        const data = await response.json();

        // Update badge
        updateBadge(data.unreadCount);

        // Send notification for new negative feedback
        if (data.newNegative && data.newNegative.length > 0) {
            for (const feedback of data.newNegative) {
                showNotification(feedback);
            }

            // Mark as notified
            await markAsNotified(auth, data.newNegative.map(f => f.id));
        }

    } catch (error) {
        console.error('Error checking feedback:', error);
    }
}

// Update extension badge
function updateBadge(count = 0) {
    if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Red
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Show notification
function showNotification(feedback) {
    const rating = '⭐'.repeat(feedback.rating);
    chrome.notifications.create(`feedback-${feedback.id}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '⚠️ New Negative Feedback',
        message: `${rating}\n${feedback.message || 'No message provided'}`,
        priority: 2,
        requireInteraction: true
    });
}

// Handle notification click - open dashboard
chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.tabs.create({ url: CONFIG.DASHBOARD_URL });
    chrome.notifications.clear(notificationId);
});

// Get auth from storage
async function getAuth() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['token', 'businessId', 'businessName'], (result) => {
            resolve(result);
        });
    });
}

// Save auth to storage
async function saveAuth(token, businessId, businessName) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ token, businessId, businessName }, resolve);
    });
}

// Clear auth
async function clearAuth() {
    return new Promise((resolve) => {
        chrome.storage.local.remove(['token', 'businessId', 'businessName'], () => {
            updateBadge(0);
            resolve();
        });
    });
}

// Mark feedback as notified
async function markAsNotified(auth, feedbackIds) {
    try {
        await fetch(`${CONFIG.API_URL}/api/business/${auth.businessId}/alerts/mark-notified`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ feedbackIds })
        });
    } catch (error) {
        console.error('Error marking as notified:', error);
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'LOGIN') {
        saveAuth(message.token, message.businessId, message.businessName)
            .then(() => {
                checkForNewFeedback();
                sendResponse({ success: true });
            });
        return true;
    }

    if (message.type === 'LOGOUT') {
        clearAuth().then(() => sendResponse({ success: true }));
        return true;
    }

    if (message.type === 'CHECK_NOW') {
        checkForNewFeedback().then(() => sendResponse({ success: true }));
        return true;
    }

    if (message.type === 'GET_STATS') {
        getStats().then(sendResponse);
        return true;
    }
});

// Get current stats
async function getStats() {
    const auth = await getAuth();
    if (!auth || !auth.token || !auth.businessId) {
        return { loggedIn: false };
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/business/${auth.businessId}/stats?filter=today`, {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                await clearAuth();
                return { loggedIn: false };
            }
            throw new Error('Failed to fetch stats');
        }

        const stats = await response.json();
        return {
            loggedIn: true,
            businessName: auth.businessName,
            ...stats
        };
    } catch (error) {
        console.error('Error fetching stats:', error);
        return { loggedIn: true, businessName: auth.businessName, error: true };
    }
}
