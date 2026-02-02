# Feedback System Alerts - Chrome Extension

Real-time notifications for customer feedback. Never miss a negative review!

## Features

- 🔔 **Real-time Notifications** - Get browser alerts when new negative feedback arrives
- 🔴 **Badge Counter** - See unread negative feedback count on extension icon
- 📊 **Quick Stats** - View today's feedback summary in popup
- 🚀 **One-click Dashboard** - Jump straight to full dashboard

## Installation

### For Development (Unpacked)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this project

### After Installation

1. Click the extension icon in Chrome toolbar
2. Login with your business account (same credentials as web app)
3. The extension will now monitor for new feedback!

## Configuration

Edit `background.js` to change settings:

```javascript
const CONFIG = {
    // Your backend URL (change for production)
    API_URL: 'http://localhost:8080',
    
    // How often to check for new feedback (in minutes)
    POLL_INTERVAL_MINUTES: 1,
    
    // Dashboard URL (change for production)
    DASHBOARD_URL: 'http://localhost:8000/dashboard'
};
```

For production, update these to your deployed URLs:
```javascript
API_URL: 'https://your-backend.railway.app',
DASHBOARD_URL: 'https://your-app.vercel.app/dashboard'
```

## How It Works

1. **Polling**: Every minute, the extension checks for new negative feedbacks
2. **Badge Update**: Shows count of unread negative feedbacks on icon
3. **Notifications**: Browser notifications for each new negative feedback
4. **Mark as Read**: Once notified, feedbacks are marked so you don't get repeated alerts

## Permissions

- `storage` - Save login credentials locally
- `alarms` - Periodic polling for new feedback
- `notifications` - Show browser notifications
- `host_permissions` - Access your backend API

## Troubleshooting

**Badge not updating?**
- Make sure you're logged in (click extension to check)
- Verify backend is running and accessible

**Notifications not showing?**
- Check Chrome notification settings
- Ensure notifications are allowed for Chrome

**Can't login?**
- Verify backend URL in `background.js`
- Check browser console for errors
