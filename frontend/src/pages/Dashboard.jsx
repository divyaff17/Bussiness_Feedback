import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import API_URL from '../config/api'

// Glass card style helper
const glassCard = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    borderRadius: '1.5rem',
}

export default function Dashboard() {
    const { user, getToken } = useAuth()
    const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0, avgRating: 0, positiveRate: 0 })
    const [feedbacks, setFeedbacks] = useState([])
    const [filter, setFilter] = useState('all')
    const [feedbackType, setFeedbackType] = useState('all') // 'all', 'positive', 'negative'
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(new Date())

    // AI Summary state
    const [aiSummary, setAiSummary] = useState(null)
    const [aiLoading, setAiLoading] = useState(false)

    // External feedback state
    const [externalText, setExternalText] = useState('')
    const [externalSource, setExternalSource] = useState('Google Form')
    const [externalSubmitting, setExternalSubmitting] = useState(false)
    const [externalSuccess, setExternalSuccess] = useState('')

    // Saved review platforms from Settings
    const [savedPlatforms, setSavedPlatforms] = useState([])
    const [selectedPlatform, setSelectedPlatform] = useState(null)
    const [showManualInput, setShowManualInput] = useState(false)

    // URL analysis state
    const [urlAnalysis, setUrlAnalysis] = useState(null)
    const [urlAnalyzing, setUrlAnalyzing] = useState(false)
    const [urlError, setUrlError] = useState('')

    // Quick URL input (paste any review link)
    const [quickUrl, setQuickUrl] = useState('')

    // Platform icons mapping
    const platformIcons = {
        google: '�', google_maps: '📍', yelp: '⭐', tripadvisor: '🦉', facebook: '📘',
        trustpilot: '⭐', google_forms: '📋', surveymonkey: '🐵',
        typeform: '📝', zomato: '🍽️', swiggy: '🍔', amazon: '📦',
        booking: '🏨', airbnb: '🏠', jotform: '📝', custom: '🔗'
    }

    // Fetch saved review platforms from settings
    useEffect(() => {
        const fetchPlatforms = async () => {
            try {
                const token = getToken()
                if (!token || !user?.businessId) return
                const res = await fetch(`${API_URL}/api/business/${user.businessId}/platforms`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setSavedPlatforms(data.platforms || [])
                }
            } catch (err) {
                console.error('Failed to fetch platforms:', err)
            }
        }
        fetchPlatforms()
    }, [user?.businessId])

    // Initial fetch and auto-refresh every 5 seconds for real-time updates
    useEffect(() => {
        fetchData()

        const interval = setInterval(() => {
            fetchData(false) // false = don't show loading spinner on refresh
        }, 5000)

        return () => clearInterval(interval)
    }, [filter, feedbackType])

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        try {
            const token = getToken()
            if (!token || !user?.businessId) {
                setLoading(false)
                return
            }

            const headers = { 'Authorization': `Bearer ${token}` }

            // Fetch stats and feedbacks in parallel for speed
            const typeParam = feedbackType === 'all' ? '' : `&type=${feedbackType}`
            const [statsRes, feedbackRes] = await Promise.all([
                fetch(`${API_URL}/api/business/${user.businessId}/stats?filter=${filter}`, { headers }),
                fetch(`${API_URL}/api/feedback/${user.businessId}?filter=${filter}${typeParam}`, { headers })
            ])

            if (statsRes.ok) {
                const statsData = await statsRes.json()
                setStats(statsData)
            } else if (statsRes.status === 403 || statsRes.status === 404) {
                console.log('Session invalid, please login again')
                return
            }

            if (feedbackRes.ok) {
                const feedbackData = await feedbackRes.json()
                setFeedbacks(feedbackData.feedbacks || [])
            }

            setLastUpdated(new Date())
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const filterOptions = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'Last 7 Days' },
        { value: 'month', label: 'Last 30 Days' },
        { value: 'year', label: 'This Year' }
    ]

    // Fetch AI summary
    const fetchAiSummary = async () => {
        setAiLoading(true)
        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/feedback/${user.businessId}/ai-summary?filter=${filter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setAiSummary(data)
            }
        } catch (error) {
            console.error('Failed to fetch AI summary:', error)
        } finally {
            setAiLoading(false)
        }
    }

    // Submit external feedback for AI analysis
    const submitExternalFeedback = async () => {
        if (!externalText.trim()) return
        setExternalSubmitting(true)
        setExternalSuccess('')
        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/feedback/${user.businessId}/external`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: externalText.trim(), source: externalSource })
            })
            if (res.ok) {
                const data = await res.json()
                setExternalText('')
                setExternalSuccess(`Analyzed as ${data.feedback.analysis.sentiment} (${data.feedback.analysis.confidence}% confidence) — Rating: ${data.feedback.analysis.rating}/5`)
                setTimeout(() => setExternalSuccess(''), 5000)
                fetchData(false) // Refresh feed
            }
        } catch (error) {
            console.error('External feedback error:', error)
        } finally {
            setExternalSubmitting(false)
        }
    }

    // Check if a URL is a protected platform that can't be scraped
    const isProtectedPlatform = (url) => {
        if (!url) return false
        const protectedPatterns = [
            /docs\.google\.com\/forms/i,
            /forms\.gle/i,
        ]
        return protectedPatterns.some(p => p.test(url))
    }

    // Check if URL is a Google Maps business link
    const isGoogleMapsUrl = (url) => {
        if (!url) return false
        const l = url.toLowerCase()
        return l.includes('google.com/maps') || l.includes('maps.google.com') ||
               l.includes('g.page') || l.includes('goo.gl/maps') ||
               l.includes('search.google.com/local')
    }

    // Analyze a quick-pasted URL (no need to save in Settings)
    const analyzeQuickUrl = async () => {
        if (!quickUrl.trim()) return
        const url = quickUrl.trim()

        // Detect platform label
        let platformLabel = 'Review Page'
        if (isGoogleMapsUrl(url)) platformLabel = 'Google Maps'
        else if (url.includes('yelp.com')) platformLabel = 'Yelp'
        else if (url.includes('tripadvisor')) platformLabel = 'TripAdvisor'
        else if (url.includes('trustpilot')) platformLabel = 'Trustpilot'
        else if (url.includes('facebook.com')) platformLabel = 'Facebook'
        else if (url.includes('zomato.com')) platformLabel = 'Zomato'
        else if (url.includes('swiggy.com')) platformLabel = 'Swiggy'
        else if (url.includes('amazon.')) platformLabel = 'Amazon'

        const fakePlatform = { id: 'quick', url, platform_label: platformLabel, platform_name: platformLabel.toLowerCase().replace(/\s/g, '_') }
        setSelectedPlatform(fakePlatform)
        setUrlAnalysis(null)
        setUrlError('')
        setShowManualInput(false)

        // Google Forms — can't scrape
        if (isProtectedPlatform(url)) {
            setShowManualInput(true)
            setExternalSource('Google Form')
            setUrlError('google_forms_guide')
            return
        }

        // Google Maps — try to scrape, but reviews are mostly JS-rendered
        // so also offer manual paste option
        if (isGoogleMapsUrl(url)) {
            setShowManualInput(true)
            setExternalSource('Google Maps')
            setUrlError('google_maps_guide')
            return
        }

        // Other URLs — try direct scrape via backend
        setUrlAnalyzing(true)
        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/feedback/${user.businessId}/analyze-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url, platformLabel, platformName: fakePlatform.platform_name })
            })
            const data = await res.json()
            if (res.ok) {
                setUrlAnalysis(data)
                fetchData(false)
            } else {
                setUrlError(data.error || 'Failed to analyze URL')
            }
        } catch (error) {
            console.error('URL analysis error:', error)
            setUrlError('Failed to connect to server')
        } finally {
            setUrlAnalyzing(false)
        }
    }

    // One-click analyze a platform URL
    const analyzeUrl = async (platform) => {
        setSelectedPlatform(platform)
        setUrlAnalysis(null)
        setUrlError('')
        setShowManualInput(false)

        // Google Forms & similar: can't scrape, show manual paste with export guide
        if (isProtectedPlatform(platform.url)) {
            setShowManualInput(true)
            setExternalSource(platform.platform_label || 'Google Form')
            setUrlError('google_forms_guide')
            return
        }

        // Google Maps: reviews are JS-rendered, show paste guide
        if (isGoogleMapsUrl(platform.url)) {
            setShowManualInput(true)
            setExternalSource('Google Maps')
            setUrlError('google_maps_guide')
            return
        }

        setUrlAnalyzing(true)
        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/feedback/${user.businessId}/analyze-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: platform.url,
                    platformLabel: platform.platform_label,
                    platformName: platform.platform_name
                })
            })
            const data = await res.json()
            if (res.ok) {
                setUrlAnalysis(data)
                fetchData(false) // Refresh dashboard data
            } else {
                setUrlError(data.error || 'Failed to analyze URL')
            }
        } catch (error) {
            console.error('URL analysis error:', error)
            setUrlError('Failed to connect to server')
        } finally {
            setUrlAnalyzing(false)
        }
    }

    const formatTime = (dateString) => {
        if (!dateString) return 'Unknown time'
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Invalid time'
        return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date'
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Invalid date'
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today'
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday'
        } else if (date.getFullYear() === today.getFullYear()) {
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        } else {
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        }
    }

    const getFilterLabel = () => {
        switch (filter) {
            case 'all': return '(all time)'
            case 'today': return 'today'
            case 'week': return 'this week'
            case 'month': return 'this month'
            case 'year': return 'this year'
            default: return ''
        }
    }

    // Generate default avatar with initials
    const getDefaultAvatar = (name) => {
        const initial = (name || 'U').charAt(0).toUpperCase()
        return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#667eea" width="100" height="100"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40" font-family="Arial">${initial}</text></svg>`)}`
    }

    return (
        <Layout>
            <div className="animate-fadeIn">
                {/* Profile Card Header */}
                <div 
                    className="p-6 overflow-hidden relative mb-6"
                    style={{
                        ...glassCard,
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 50%, rgba(236, 72, 153, 0.2) 100%)',
                    }}
                >
                    <div className="absolute inset-0 opacity-20" style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'glassShine 8s ease-in-out infinite',
                    }}></div>
                    <div className="relative flex items-center gap-4">
                        <div 
                            className="w-16 h-16 rounded-full shadow-lg overflow-hidden flex-shrink-0"
                            style={{
                                border: '3px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 0 20px rgba(102, 126, 234, 0.4)',
                            }}
                        >
                            <img
                                src={user?.profilePictureUrl || getDefaultAvatar(user?.ownerName || user?.businessName)}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.src = getDefaultAvatar(user?.ownerName || user?.businessName)
                                }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 
                                className="text-xl font-bold truncate"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Welcome back, {user?.ownerName || user?.businessName || 'Owner'}!
                            </h2>
                            <p className="text-white/70 text-sm truncate">{user?.businessName}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span className="text-xs text-white/60">Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header with Filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 
                            className="text-2xl font-bold"
                            style={{
                                background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            📊 Dashboard
                        </h1>
                        <p className="text-white/60">View feedback for your business</p>
                        <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Real-time updates every 5s • Last: {lastUpdated.toLocaleTimeString()}
                        </p>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        {filterOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setFilter(opt.value)}
                                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300"
                                style={filter === opt.value ? {
                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                    border: '1px solid rgba(102, 126, 234, 0.5)',
                                    color: '#a5b4fc',
                                    boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
                                } : {
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'rgba(255, 255, 255, 0.7)',
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div 
                            className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent"
                            style={{ borderColor: '#667eea', borderTopColor: 'transparent' }}
                        ></div>
                    </div>
                ) : (
                    <>
                        {/* Feedback Summary */}
                        <div className="p-6 mb-8" style={glassCard}>
                            <h2 
                                className="text-lg font-bold mb-4"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Feedback Summary
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-blue-400">{stats.total}</p>
                                    <p className="text-sm text-white/60">Total {getFilterLabel()}</p>
                                </div>
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-green-400">{stats.positive}</p>
                                    <p className="text-sm text-white/60">Positive</p>
                                </div>
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-red-400">{stats.negative}</p>
                                    <p className="text-sm text-white/60">Negative</p>
                                </div>
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)',
                                        border: '1px solid rgba(234, 179, 8, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-yellow-400">⭐ {stats.avgRating || 0}</p>
                                    <p className="text-sm text-white/60">Avg Rating</p>
                                </div>
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(20, 184, 166, 0.1) 100%)',
                                        border: '1px solid rgba(20, 184, 166, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-teal-400">{stats.positiveRate || 0}%</p>
                                    <p className="text-sm text-white/60">Positive Rate</p>
                                </div>
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)',
                                        border: '1px solid rgba(234, 179, 8, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-yellow-400">{stats.mismatches || 0}</p>
                                    <p className="text-sm text-white/60">⚠️ AI Mismatches</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Feedback List with Type Filter */}
                        <div className="p-6" style={glassCard}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                <h2 
                                    className="text-lg font-bold"
                                    style={{
                                        background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}
                                >
                                    {feedbackType === 'all' ? 'All Feedback' : feedbackType === 'positive' ? 'Positive Feedback' : 'Negative Feedback'}
                                </h2>
                                
                                {/* Feedback Type Filter */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFeedbackType('all')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                                        style={feedbackType === 'all' ? {
                                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                            border: '1px solid rgba(102, 126, 234, 0.5)',
                                            color: '#a5b4fc',
                                        } : {
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                        }}
                                    >
                                        All ({stats.total})
                                    </button>
                                    <button
                                        onClick={() => setFeedbackType('positive')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                                        style={feedbackType === 'positive' ? {
                                            background: 'rgba(34, 197, 94, 0.3)',
                                            border: '1px solid rgba(34, 197, 94, 0.5)',
                                            color: '#4ade80',
                                        } : {
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                        }}
                                    >
                                        ⭐ Positive ({stats.positive})
                                    </button>
                                    <button
                                        onClick={() => setFeedbackType('negative')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                                        style={feedbackType === 'negative' ? {
                                            background: 'rgba(239, 68, 68, 0.3)',
                                            border: '1px solid rgba(239, 68, 68, 0.5)',
                                            color: '#f87171',
                                        } : {
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                        }}
                                    >
                                        ⚠️ Negative ({stats.negative})
                                    </button>
                                </div>
                            </div>

                            {feedbacks.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="text-4xl block mb-2">{feedbackType === 'negative' ? '🎉' : '📭'}</span>
                                    <p className="text-white/60">
                                        {feedbackType === 'negative' 
                                            ? `No negative feedback ${getFilterLabel()}!` 
                                            : feedbackType === 'positive'
                                            ? `No positive feedback ${getFilterLabel()}`
                                            : `No feedback ${getFilterLabel()}`}
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-3 max-h-96 overflow-y-auto">
                                    {feedbacks.map((feedback) => (
                                        <li
                                            key={feedback.id}
                                            className="flex items-start justify-between p-4 rounded-xl"
                                            style={feedback.sentiment_mismatch ? {
                                                background: 'rgba(234, 179, 8, 0.1)',
                                                borderLeft: '4px solid rgba(250, 204, 21, 0.7)',
                                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                            } : feedback.is_positive ? {
                                                background: 'rgba(34, 197, 94, 0.1)',
                                                borderLeft: '4px solid rgba(74, 222, 128, 0.6)',
                                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                            } : {
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                borderLeft: '4px solid rgba(248, 113, 113, 0.6)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                            }}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="text-yellow-400">
                                                        {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        feedback.is_positive 
                                                            ? 'bg-green-500/20 text-green-400' 
                                                            : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {feedback.is_positive ? 'Positive' : 'Negative'}
                                                    </span>
                                                    {/* AI Sentiment Badge */}
                                                    {feedback.ai_sentiment && (
                                                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                                            feedback.ai_sentiment === 'positive' 
                                                                ? 'bg-emerald-500/20 text-emerald-300' 
                                                                : feedback.ai_sentiment === 'negative'
                                                                ? 'bg-rose-500/20 text-rose-300'
                                                                : 'bg-gray-500/20 text-gray-300'
                                                        }`}>
                                                            🤖 AI: {feedback.ai_sentiment}
                                                            {feedback.ai_confidence && (
                                                                <span className="text-white/40">({feedback.ai_confidence}%)</span>
                                                            )}
                                                        </span>
                                                    )}
                                                    {/* Mismatch Warning */}
                                                    {feedback.sentiment_mismatch && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 flex items-center gap-1">
                                                            ⚠️ Mismatch
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Mismatch explanation */}
                                                {feedback.sentiment_mismatch && (
                                                    <p className="text-xs text-yellow-400/80 mb-1 italic">
                                                        ⚠️ Rating is {feedback.rating}★ but AI detected {feedback.ai_sentiment} sentiment in the review text
                                                    </p>
                                                )}
                                                <p className="text-white/90">
                                                    "{feedback.message || 'No message provided'}"
                                                </p>
                                            </div>
                                            <span className="text-sm text-white/50 ml-4 whitespace-nowrap">
                                                {formatDate(feedback.created_at)} {formatTime(feedback.created_at)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* External Feedback Input (AI Analysis) */}
                        <div className="p-6 mt-6" style={glassCard}>
                            <h2 
                                className="text-lg font-bold mb-1"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                🤖 AI Feedback Analyzer
                            </h2>
                            <p className="text-xs text-white/50 mb-4">
                                Paste any review page URL below, or click "Analyze" on a saved platform.
                            </p>

                            {/* Quick URL Input */}
                            <div className="mb-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={quickUrl}
                                        onChange={(e) => setQuickUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && analyzeQuickUrl()}
                                        placeholder="Paste any review link (Google Maps, Yelp, TripAdvisor...)"
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                        }}
                                    />
                                    <button
                                        onClick={analyzeQuickUrl}
                                        disabled={!quickUrl.trim() || urlAnalyzing}
                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex-shrink-0"
                                        style={{
                                            background: (!quickUrl.trim() || urlAnalyzing)
                                                ? 'rgba(139, 92, 246, 0.15)'
                                                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(118, 75, 162, 0.5) 100%)',
                                            border: '1px solid rgba(139, 92, 246, 0.5)',
                                            color: 'white',
                                            opacity: (!quickUrl.trim() || urlAnalyzing) ? 0.5 : 1,
                                            cursor: (!quickUrl.trim() || urlAnalyzing) ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {urlAnalyzing && !selectedPlatform?.id !== 'quick' ? (
                                            <span className="flex items-center gap-2">
                                                <span className="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></span>
                                                Analyzing...
                                            </span>
                                        ) : '🤖 Analyze'}
                                    </button>
                                </div>
                                <p className="text-xs text-white/30 mt-1.5 ml-1">Supports Google Maps, Yelp, TripAdvisor, Trustpilot, Zomato, Swiggy & more</p>
                            </div>

                            {/* Saved Platform Cards with Analyze button */}
                            {savedPlatforms.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs font-medium text-white/60 mb-2">📌 Your Saved Platforms</p>
                                    <div className="space-y-2">
                                        {savedPlatforms.map((platform) => (
                                            <div
                                                key={platform.id}
                                                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200"
                                                style={selectedPlatform?.id === platform.id && (urlAnalyzing || urlAnalysis) ? {
                                                    background: 'rgba(139, 92, 246, 0.15)',
                                                    border: '1px solid rgba(139, 92, 246, 0.4)',
                                                } : {
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                }}
                                            >
                                                <span className="text-xl">
                                                    {platformIcons[platform.platform_name] || platformIcons.custom}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium text-white/90 block">
                                                        {platform.platform_label}
                                                    </span>
                                                    <span className="text-xs text-white/40 truncate block">
                                                        {platform.url}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => analyzeUrl(platform)}
                                                    disabled={urlAnalyzing && selectedPlatform?.id === platform.id}
                                                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex-shrink-0"
                                                    style={{
                                                        background: (urlAnalyzing && selectedPlatform?.id === platform.id)
                                                            ? 'rgba(139, 92, 246, 0.2)'
                                                            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                                        border: '1px solid rgba(139, 92, 246, 0.5)',
                                                        color: 'white',
                                                        cursor: (urlAnalyzing && selectedPlatform?.id === platform.id) ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    {urlAnalyzing && selectedPlatform?.id === platform.id ? (
                                                        <span className="flex items-center gap-2">
                                                            <span className="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></span>
                                                            Analyzing...
                                                        </span>
                                                    ) : isProtectedPlatform(platform.url) ? '📋 Paste & Analyze' : isGoogleMapsUrl(platform.url) ? '📍 Paste Reviews' : '🤖 Analyze'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* URL Analysis Results */}
                            {urlAnalysis && selectedPlatform && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-purple-300">
                                            {platformIcons[selectedPlatform.platform_name] || '🔗'} {urlAnalysis.platformName} — Analysis Results
                                        </span>
                                        <button
                                            onClick={() => { setUrlAnalysis(null); setSelectedPlatform(null); setUrlError(''); }}
                                            className="text-xs text-white/40 hover:text-white/70 transition-all"
                                        >
                                            ✕ Close
                                        </button>
                                    </div>

                                    {/* Overall Summary */}
                                    <div 
                                        className="p-4 rounded-xl mb-3"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(118, 75, 162, 0.08) 100%)',
                                            border: '1px solid rgba(139, 92, 246, 0.25)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-purple-300">Overall</span>
                                            {urlAnalysis.overallSentiment && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    urlAnalysis.overallSentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                                                    urlAnalysis.overallSentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                    {urlAnalysis.overallSentiment}
                                                </span>
                                            )}
                                            {urlAnalysis.overallScore > 0 && (
                                                <span className="text-xs text-white/50">Score: {urlAnalysis.overallScore}/100</span>
                                            )}
                                            <span className="text-xs text-white/40 ml-auto">
                                                {urlAnalysis.totalFound} feedback(s) found • {urlAnalysis.savedCount || 0} saved
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/80">{urlAnalysis.overallSummary}</p>
                                    </div>

                                    {/* Positive / Negative counts */}
                                    {(urlAnalysis.positiveCount > 0 || urlAnalysis.negativeCount > 0) && (
                                        <div className="flex gap-3 mb-3">
                                            <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                                <span className="text-lg font-bold text-green-400">{urlAnalysis.positiveCount}</span>
                                                <p className="text-xs text-green-400/70">Positive</p>
                                            </div>
                                            <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                <span className="text-lg font-bold text-red-400">{urlAnalysis.negativeCount}</span>
                                                <p className="text-xs text-red-400/70">Negative</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        {/* Positive Points */}
                                        {urlAnalysis.topPositivePoints?.length > 0 && (
                                            <div className="p-3 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                                                <h4 className="text-xs font-semibold text-green-400 mb-1">👍 Positive</h4>
                                                <ul className="space-y-1">
                                                    {urlAnalysis.topPositivePoints.map((p, i) => (
                                                        <li key={i} className="text-xs text-white/70 flex items-start gap-1">
                                                            <span className="text-green-400 mt-0.5">•</span> {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {/* Negative Points */}
                                        {urlAnalysis.topNegativePoints?.length > 0 && (
                                            <div className="p-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                                <h4 className="text-xs font-semibold text-red-400 mb-1">👎 Needs Improvement</h4>
                                                <ul className="space-y-1">
                                                    {urlAnalysis.topNegativePoints.map((p, i) => (
                                                        <li key={i} className="text-xs text-white/70 flex items-start gap-1">
                                                            <span className="text-red-400 mt-0.5">•</span> {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Recommendations */}
                                    {urlAnalysis.recommendations?.length > 0 && (
                                        <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                                            <h4 className="text-xs font-semibold text-blue-400 mb-1">💡 Recommendations</h4>
                                            <ul className="space-y-1">
                                                {urlAnalysis.recommendations.map((r, i) => (
                                                    <li key={i} className="text-xs text-white/70 flex items-start gap-1">
                                                        <span className="text-blue-400 mt-0.5">{i + 1}.</span> {r}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Individual feedbacks */}
                                    {urlAnalysis.feedbacks?.length > 0 && (
                                        <div className="p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                            <h4 className="text-xs font-semibold text-white/70 mb-2">📝 Individual Feedbacks ({urlAnalysis.feedbacks.length})</h4>
                                            <div className="space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                                {urlAnalysis.feedbacks.map((fb, i) => (
                                                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                        <span className={`text-xs mt-0.5 ${
                                                            fb.sentiment === 'positive' ? 'text-green-400' :
                                                            fb.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'
                                                        }`}>
                                                            {fb.sentiment === 'positive' ? '👍' : fb.sentiment === 'negative' ? '👎' : '😐'}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-white/70 line-clamp-2">{fb.text || fb.summary}</p>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className={`text-xs ${
                                                                    fb.sentiment === 'positive' ? 'text-green-400/70' :
                                                                    fb.sentiment === 'negative' ? 'text-red-400/70' : 'text-yellow-400/70'
                                                                }`}>{fb.sentiment}</span>
                                                                {fb.rating && <span className="text-xs text-white/40">{'⭐'.repeat(fb.rating)}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* URL Error */}
                            {urlError && urlError !== 'google_forms_guide' && urlError !== 'google_maps_guide' && (
                                <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                    <p className="text-xs text-red-400">⚠️ {urlError}</p>
                                    <p className="text-xs text-white/40 mt-1">Some pages require login or have dynamic content. Try the manual paste option below.</p>
                                </div>
                            )}

                            {/* Google Forms Export Guide */}
                            {urlError === 'google_forms_guide' && (
                                <div className="p-4 rounded-xl mb-4" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                                    <h4 className="text-sm font-semibold text-blue-400 mb-2">📋 How to export Google Forms responses</h4>
                                    <p className="text-xs text-white/60 mb-3">Google Forms responses require login to access. Follow these quick steps to copy them:</p>
                                    <ol className="space-y-2 text-xs text-white/70">
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-400 font-bold mt-0.5">1.</span>
                                            <span>Open your Google Form → click the <strong className="text-white/90">Responses</strong> tab</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-400 font-bold mt-0.5">2.</span>
                                            <span>Click <strong className="text-white/90">Summary</strong> to see all responses, then <strong className="text-white/90">Select All (Ctrl+A)</strong> and <strong className="text-white/90">Copy (Ctrl+C)</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-400 font-bold mt-0.5">3.</span>
                                            <span><strong className="text-white/90">Paste below (Ctrl+V)</strong> — our AI will analyze all your responses instantly!</span>
                                        </li>
                                    </ol>
                                    <div className="mt-3 flex items-center gap-2">
                                        <a
                                            href={selectedPlatform?.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                            style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#93c5fd' }}
                                        >
                                            🔗 Open Google Form
                                        </a>
                                        <span className="text-xs text-white/30">→ Copy responses → Paste below</span>
                                    </div>
                                </div>
                            )}

                            {/* Google Maps Review Guide */}
                            {urlError === 'google_maps_guide' && (
                                <div className="p-4 rounded-xl mb-4" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                                    <h4 className="text-sm font-semibold text-green-400 mb-2">📍 How to copy Google Maps reviews</h4>
                                    <p className="text-xs text-white/60 mb-3">Google Maps reviews are loaded dynamically and can't be directly scraped. Here's how to copy them:</p>
                                    <ol className="space-y-2 text-xs text-white/70">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 font-bold mt-0.5">1.</span>
                                            <span>Open the Google Maps link → click <strong className="text-white/90">Reviews</strong> to see all reviews</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 font-bold mt-0.5">2.</span>
                                            <span>Scroll down to load more reviews, then <strong className="text-white/90">Select All (Ctrl+A)</strong> and <strong className="text-white/90">Copy (Ctrl+C)</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 font-bold mt-0.5">3.</span>
                                            <span><strong className="text-white/90">Paste below (Ctrl+V)</strong> — AI will identify each review and analyze sentiment!</span>
                                        </li>
                                    </ol>
                                    <div className="mt-3 flex items-center gap-2">
                                        <a
                                            href={selectedPlatform?.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                            style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#86efac' }}
                                        >
                                            📍 Open Google Maps
                                        </a>
                                        <span className="text-xs text-white/30">→ Go to Reviews → Select All → Copy → Paste below</span>
                                    </div>
                                </div>
                            )}

                            {/* Manual Input Fallback */}
                            <div className="mt-3">
                                {!showManualInput ? (
                                    <button
                                        onClick={() => { setShowManualInput(true); setSelectedPlatform(null); setUrlAnalysis(null); setUrlError(''); }}
                                        className="w-full py-3 rounded-xl text-sm text-white/50 transition-all"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px dashed rgba(255, 255, 255, 0.15)',
                                        }}
                                    >
                                        ✏️ Or paste feedback manually
                                    </button>
                                ) : (
                                    <div>
                                        <div className="flex gap-2 mb-3">
                                            {['Google Maps', 'Google Form', 'Survey', 'Email', 'Other'].map(src => (
                                                <button
                                                    key={src}
                                                    onClick={() => setExternalSource(src)}
                                                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                                                    style={externalSource === src ? {
                                                        background: 'rgba(139, 92, 246, 0.3)',
                                                        border: '1px solid rgba(139, 92, 246, 0.5)',
                                                        color: '#c4b5fd',
                                                    } : {
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        color: 'rgba(255, 255, 255, 0.5)',
                                                    }}
                                                >
                                                    {src}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={externalText}
                                            onChange={(e) => setExternalText(e.target.value)}
                                            placeholder={urlError === 'google_forms_guide' 
                                                ? "Paste your Google Forms responses here...\n\nGo to your form → Responses tab → Summary → Select All (Ctrl+A) → Copy (Ctrl+C) → Paste here (Ctrl+V)"
                                                : urlError === 'google_maps_guide'
                                                ? "Paste Google Maps reviews here...\n\nOpen the Maps link → Click Reviews → Scroll to load reviews → Select All (Ctrl+A) → Copy (Ctrl+C) → Paste here (Ctrl+V)"
                                                : "Paste feedback text here... e.g. 'The food was amazing but the wait time was too long'"
                                            }
                                            autoFocus={urlError === 'google_forms_guide' || urlError === 'google_maps_guide'}
                                            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none resize-none"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: (urlError === 'google_forms_guide' || urlError === 'google_maps_guide')
                                                    ? `1px solid ${urlError === 'google_maps_guide' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}` 
                                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                                minHeight: (urlError === 'google_forms_guide' || urlError === 'google_maps_guide') ? '120px' : '80px',
                                            }}
                                            rows={(urlError === 'google_forms_guide' || urlError === 'google_maps_guide') ? 5 : 3}
                                        />
                                        <div className="flex items-center gap-3 mt-3">
                                            <button
                                                onClick={submitExternalFeedback}
                                                disabled={!externalText.trim() || externalSubmitting}
                                                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
                                                style={{
                                                    background: externalSubmitting ? 'rgba(139, 92, 246, 0.2)' : 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                                    border: '1px solid rgba(139, 92, 246, 0.5)',
                                                    color: 'white',
                                                    opacity: (!externalText.trim() || externalSubmitting) ? 0.5 : 1,
                                                    cursor: (!externalText.trim() || externalSubmitting) ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                {externalSubmitting ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></span>
                                                        Analyzing...
                                                    </span>
                                                ) : '🤖 Analyze & Save'}
                                            </button>
                                            <button
                                                onClick={() => { setShowManualInput(false); setExternalText(''); setExternalSuccess(''); }}
                                                className="px-3 py-2 rounded-xl text-xs text-white/50 transition-all"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                }}
                                            >
                                                ✕ Cancel
                                            </button>
                                            {externalSuccess && (
                                                <p className="text-xs text-green-400">{externalSuccess}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* No platforms saved hint */}
                            {savedPlatforms.length === 0 && !showManualInput && (
                                <p className="text-xs text-white/30 mt-3 text-center">
                                    💡 Tip: Save your review platform links in <a href="/settings" className="text-purple-400 underline">Settings</a> → Review Platforms to see them here.
                                </p>
                            )}
                        </div>

                    </>
                )}
            </div>
        </Layout>
    )
}

