import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import API_URL from '../config/api'
import { IconDashboard, IconList, IconChart, IconStar, IconTarget, IconMail, IconReply, IconSearch, IconExport, IconCheck, IconEdit, IconInbox, IconLink, IconDoc, IconAlert, IconEye, IconHide, IconCelebrate, IconBot } from '../components/Icons'

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

    // Search
    const [searchQuery, setSearchQuery] = useState('')

    // Reply state
    const [replyingTo, setReplyingTo] = useState(null)
    const [replyText, setReplyText] = useState('')
    const [replySending, setReplySending] = useState(false)

    // Delete state
    const [deletingId, setDeletingId] = useState(null)

    // Track which replies are collapsed
    const [hiddenReplies, setHiddenReplies] = useState(new Set())

    // Export state
    const [exporting, setExporting] = useState(false)

    // AI Summary state
    const [aiSummary, setAiSummary] = useState(null)
    const [aiLoading, setAiLoading] = useState(false)

    // Saved external summaries from Settings
    const [savedSummaries, setSavedSummaries] = useState([])
    const [selectedSummary, setSelectedSummary] = useState(null)
    const [summaryAnalysis, setSummaryAnalysis] = useState(null)
    const [summaryAnalyzing, setSummaryAnalyzing] = useState(false)
    const [summaryError, setSummaryError] = useState('')

    // Fetch saved external summaries from settings
    useEffect(() => {
        const fetchSummaries = async () => {
            try {
                const token = getToken()
                if (!token || !user?.businessId) return
                const res = await fetch(`${API_URL}/api/business/${user.businessId}/external-summaries`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setSavedSummaries(data.summaries || [])
                }
            } catch (err) {
                console.error('Failed to fetch summaries:', err)
            }
        }
        fetchSummaries()
    }, [user?.businessId])

    // Mark alerts as notified when user visits Dashboard (clears nav badge)
    useEffect(() => {
        const markAlertsRead = async () => {
            try {
                const token = getToken()
                if (!token || !user?.businessId) return
                const headers = { 'Authorization': `Bearer ${token}` }
                // Get unread alert IDs
                const alertRes = await fetch(`${API_URL}/api/business/${user.businessId}/alerts`, { headers })
                if (alertRes.ok) {
                    const alertData = await alertRes.json()
                    if (alertData.newNegative?.length > 0) {
                        const feedbackIds = alertData.newNegative.map(f => f.id)
                        await fetch(`${API_URL}/api/business/${user.businessId}/alerts/mark-notified`, {
                            method: 'POST',
                            headers: { ...headers, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ feedbackIds })
                        })
                    }
                }
            } catch (err) { /* silent */ }
        }
        markAlertsRead()
    }, [user?.businessId])

    // Initial fetch and auto-refresh every 30 seconds (pauses when tab not visible)
    useEffect(() => {
        fetchData()

        let interval = null
        const startPolling = () => {
            if (interval) clearInterval(interval)
            interval = setInterval(() => {
                fetchData(false)
            }, 30000)
        }
        const stopPolling = () => {
            if (interval) { clearInterval(interval); interval = null }
        }
        const handleVisibility = () => {
            if (document.hidden) { stopPolling() }
            else { fetchData(false); startPolling() }
        }

    }, [filter, feedbackType]); // Added missing semicolon

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const token = getToken();
            if (!token || !user?.businessId) {
                setLoading(false);
                return;
            }

            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch stats and feedbacks in parallel for speed
            const typeParam = feedbackType === 'all' ? '' : `&type=${feedbackType}`;
            const [statsRes, feedbackRes] = await Promise.all([
                fetch(`${API_URL}/api/business/${user.businessId}/stats?filter=${filter}`, { headers }),
                fetch(`${API_URL}/api/feedback/${user.businessId}?filter=${filter}${typeParam}`, { headers })
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            } else if (statsRes.status === 403 || statsRes.status === 404) {
                console.log('Session expired, please login again');
                return;
            }

            if (feedbackRes.ok) {
                const feedbackData = await feedbackRes.json();
                setFeedbacks(feedbackData.feedbacks || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterOptions = useMemo(() => [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'Last  7 Days' },
        { value: 'month', label: 'Last 30 Days' },
        { value: 'year', label: 'This Year' }
    ], [])

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

    // Analyze a saved external summary from Settings
    const analyzeSavedSummary = async (summary) => {
        setSelectedSummary(summary)
        setSummaryAnalysis(null)
        setSummaryError('')
        setSummaryAnalyzing(true)

        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/business/${user.businessId}/external-summaries/${summary.id}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await res.json()
            if (res.ok) {
                setSummaryAnalysis(data.analysis)
                // Refresh summaries list to show updated status
                const listRes = await fetch(`${API_URL}/api/business/${user.businessId}/external-summaries`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (listRes.ok) {
                    const listData = await listRes.json()
                    setSavedSummaries(listData.summaries || [])
                }
                fetchData(false) // Refresh dashboard data since feedbacks were added
            } else {
                setSummaryError(data.error || 'Failed to analyze summary')
            }
        } catch (error) {
            console.error('Summary analysis error:', error)
            setSummaryError('Failed to connect to server')
        } finally {
            setSummaryAnalyzing(false)
        }
    }

    // View a previously analyzed summary
    const viewSummaryAnalysis = async (summary) => {
        setSelectedSummary(summary)
        setSummaryAnalysis(null)
        setSummaryError('')

        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/business/${user.businessId}/external-summaries/${summary.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                if (data.summary?.analysis_result) {
                    setSummaryAnalysis(data.summary.analysis_result)
                } else {
                    setSummaryError('No analysis data found. Click "Analyze" to run analysis.')
                }
            }
        } catch (error) {
            console.error('View analysis error:', error)
            setSummaryError('Failed to load analysis')
        }
    }

    // reply to feedback
    const replyToFeedback = async (feedbackId) => {
        if (!replyText.trim()) return
        setReplySending(true)
        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/feedback/${user.businessId}/${feedbackId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ reply: replyText.trim() })
            })
            if (res.ok) {
                const data = await res.json()
                setReplyingTo(null)
                setReplyText('')
                fetchData(false)
                if (data.emailSent) {
                    alert('Reply saved! Email will be sent to customer.')
                }
            } else {
                const errData = await res.json().catch(() => ({}))
                alert(`Failed to send reply: ${errData.error || res.statusText}`)
            }
        } catch (err) {
            console.error('Reply error:', err)
            alert('Failed to send reply. Please try again.')
        } finally {
            setReplySending(false)
        }
    }

    // Delete feedback
    const deleteFeedback = async (feedbackId) => {
        if (!confirm('Delete this feedback permanently?')) return
        setDeletingId(feedbackId)
        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/feedback/${user.businessId}/${feedbackId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) fetchData(false)
        } catch (err) {
            console.error('Delete error:', err)
        } finally {
            setDeletingId(null)
        }
    }

    // Pin/bookmark feedback
    const pinFeedback = async ( feedbackId) => {
        try {
            const token = getToken()
            const res = await fetch(`${API_URL}/api/feedback/${user.businessId}/${feedbackId}/pin`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) fetchData(false)
        } catch (err) {
            console.error('Pin error:', err)
        }
    }

    // Export CSV
    const exportCSV = async () => {
        setExporting(true)
        try {
            const token = getToken()
            if (!token) {
                alert('Please log in again to export')
                setExporting(false)
                return
            }
            const typeParam = feedbackType === 'all' ? '' : `&type=${feedbackType}`
            const res = await fetch(`${API_URL}/api/feedback/${user.businessId}/export?filter=${filter}${typeParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                alert(errData.error || `Export failed (${res.status})`)
                return
            }
            const csvText = await res.text()
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = url
            a.download = `feedbacks_${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            setTimeout(() => {
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
            }, 100)
        } catch (err) {
            console.error('ExportError:', err)
            alert('Failed to export CSV. Please try again.')
        } finally {
            setExporting(false)
        }
    }

    // Generate AI reply suggestion
    const generateReplyTemplate = (feedback) => {
        if (feedback.is_positive) {
            const templates = [
                `Thank you so much for your wonderful ${feedback.rating}-star review! We're thrilled that you had a great experience. Your kind words mean the world to us. We look forward to serving you again! 😊`,
                `We really appreciate you taking the time to share your feedback! It makes our day to know you enjoyed your experience. Thank you for choosing us! ⭐`,
                `Wow, thank you for the amazing review! We're so glad you loved it. Your support means everything to our team. See you again soon! 🙏`
            ]
            return templates[Math.floor(Math.random() * templates.length)]
        } else {
            const templates = [
                `Thank you for your honest feedback. We sincerely apologize that your experience didn't meet expectations. We take every concern seriously and are working to improve. Would you be open to giving us another chance? We'd love to make it right. 🙏`,
                `We're sorry to hear about your experience. Your feedback is valuable to us, and we're taking steps to address the issues you mentioned. Please reach out to us directly so we can resolve this for you.`,
                `Thank you for bringing this to our attention. We're truly sorry for the inconvenience. We've shared your feedback with our team to ensure this doesn't happen again. We hope to earn back your trust. 💙`
            ]
            return templates[Math.floor(Math.random() * templates.length)]
        }
    }

    // Filtered feedbacks by search, pinned first (memoized)
    const filteredFeedbacks = useMemo(() => {
        return feedbacks.filter(fb => {
            if (!searchQuery.trim()) return true
            const q = searchQuery.toLowerCase()
            return (fb.message || '').toLowerCase().includes(q) ||
                   (fb.owner_reply || '').toLowerCase().includes(q) ||
                   (fb.ai_sentiment || '').toLowerCase().includes(q)
        }).sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
    }, [feedbacks, searchQuery])

    const formatTime = useCallback((dateString) => {
        if (!dateString) return 'Unknown time'
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Invalid time'
        return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    }, [])

    const formatDate = useCallback((dateString) => {
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
    }, [])

    const getFilterLabel = useCallback(() => {
        switch (filter) {
            case 'all': return '( all time)'
            case 'today': return 'today'
            case 'week': return 'this week'
            case 'month': return 'this month'
            case 'year': return 'this year'
            default: return ''
        }
    }, [filter])

    // Generate default avatar with initials
    const getDefaultAvatar = useCallback((name) => {
        const initial = (name || 'U').charAt(0).toUpperCase()
        return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#667eea" width="100" height="100"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40" font-family="Arial">${initial}</text></svg>`)}`
    }, [])

    return (
        <Layout>
            <div className="animate-fadeIn">
                {/* Profile Card Header */}
                <div 
                    className="p-6 overflow-hidden relative mb-6"
                    style={{
                        ...glassCard,
                        background: 'rgba(10,  0, 40, 0.6)',
                        backdropFilter: 'blur(20px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                        border: '1px solid rgba(100, 200, 255, 0.15)',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(100, 200, 255, 0.05)',
                    }}
                >
                    <div className="absolute inset-0 opacity-20" style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(100, 200, 255, 0.1) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'glassShine 8s ease-in-out infinite',
                    }}></div>
                    <div className="relative flex items-center gap-4">
                        <div 
                            className="w-16 h-16 rounded-full shadow-lg overflow-hidden flex-shrink-0"
                            style={{
                                border: '3px solid rgba(100, 200, 255, 0.3)',
                                boxShadow: '0 0 20px rgba(100, 200, 255, 0.4)',
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
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-white/80"><IconDashboard className="w-7 h-7" /></span>
                            <span
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Dashboard
                            </span>
                        </h1>
                        <p className="text-white/60">View feedback for your business</p>
                        <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Real-time updates • Last: {lastUpdated.toLocaleTimeString()}
                        </p>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        {filterOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setFilter(opt.value)}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                                style={filter === opt.value ? {
                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                    border: '2px solid rgba(102, 126, 234, 0.6)',
                                    color: '#a5b4fc',
                                    boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
                                } : {
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '2px solid rgba(255, 255, 255, 0.15)',
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
                            <div className="flex items-center justify-between mb-6">
                                <h2 
                                    className="text-lg font-bold tracking-wide"
                                    style={{
                                        background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}
                                >
                                    Feedback Summary
                                </h2>
                                <span className="text-xs text-white/40 font-medium uppercase tracking-widest">{getFilterLabel() || 'All Time'}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {[
                                    { label: 'Total', Icon: IconList, value: stats.total, color: '99, 102, 241', hex: '#818cf8', changeKey: 'totalChange' },
                                    { label: 'Positive', Icon: IconChart, value: stats.positive, color: '34, 197, 94', hex: '#4ade80', changeKey: 'positiveChange' },
                                    { label: 'Negative', Icon: IconChart, value: stats.negative, color: '239, 68, 68', hex: '#f87171', changeKey: 'negativeChange', invertArrow: true },
                                    { label: 'Avg Rating', Icon: IconStar, value: stats.avgRating || 0, suffix: '/5', color: '245, 158, 11', hex: '#fbbf24', changeKey: 'ratingChange', isRating: true },
                                    { label: 'Success', Icon: IconChart, value: stats.positiveRate || 0, suffix: '%', color: '20, 184, 166', hex: '#2dd4bf' },
                                ].map((card, i) => {
                                    const change = stats.comparison?.[card.changeKey]
                                    return (
                                        <div key={i}
                                            className="group relative p-5 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                                            style={{
                                                background: `linear-gradient(145deg, rgba(${card.color}, 0.15) 0%, rgba(${card.color}, 0.05) 100%)`,
                                                border: `1px solid rgba(${card.color}, 0.2)`,
                                                boxShadow: `0 4px 20px rgba(${card.color}, 0.08)`,
                                            }}
                                        >
                                            <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10" style={{ background: `rgba(${card.color}, 0.5)` }} />
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgba(${card.color}, 0.2)`, color: card.hex }}>{card.Icon && <card.Icon className="w-5 h-5" />}</div>
                                                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{card.label}</span>
                                            </div>
                                            <p className="text-3xl font-extrabold" style={{ color: card.hex }}>{card.value}{card.suffix && <span className="text-lg" style={{ color: card.hex, opacity: 0.6 }}>{card.suffix}</span>}</p>
                                            {change !== undefined && change !== null && filter !== 'all' && (
                                                <p className={`text-xs mt-1 ${(card.invertArrow ? change <= 0 : change >= 0) ? 'text-green-400' : 'text-red-400'}`}>
                                                    {card.isRating ? (
                                                        <>{change >= 0 ? '↑' : '↓'} {Math.abs(change)} vs prev</>
                                                    ) : (
                                                        <>{(card.invertArrow ? change <= 0 : change >= 0) ? '↑' : '↓'} {Math.abs(change)}% vs prev</>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* NPS, Response Rate, Avg Response Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            {/* NPS Score */}
                            <div className="p-5 rounded-2xl" style={{
                                background: 'linear-gradient(145deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 227, 0.05) 100%)',
                                border: '1px solid solid(168, 85, 247, 0.2)',
                            }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-purple-400"><IconTarget className="w-5 h-5" /></span>
                                    <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">NPS Score</span>
                                </div>
                                <p className="text-3xl font-extrabold" style={{ color: (stats.npsScore || 0) >= 50 ? '#4ade80' : (stats.npsScore || 0) < 0 ? '#fbbf24' : '#f87171' }}>
                                    {stats.npsScore || 0}
                                </p>
                                <p className="text-xs text-white/40 mt-1">
                                    {(stats.npsScore || 0) >= 50 ? 'Excellent' : (stats.npsScore || 0) >= 0 ? 'Good' : 'Needs Improvement'}
                                </p>
                            </div>

                            {/* Response Rate */}
                            <div className="p-5 rounded-2xl" style={{
                                background: 'linear-gradient(144deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                            }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-blue-400"><IconChart className="w-5 h-5" /></span>
                                    <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Response Rate</span>
                                </div>
                                <p className="text-3xl font-extrabold text-blue-400">{stats.responseRate || 0}<span className="text-lg text-blue-400/60">%</span></p>
                                <p className="text-xs text-white/40 mt-1">{stats.replied || 0} of {stats.total || 0} replied</p>
                            </div>

                            {/* Avg Response Time */}
                            <div className="p-5 rounded-2xl" style={{
                                background: 'linear-gradient(144deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%)',
                                border: '1px solid rgba(236, 72, 153, 0.2)',
                            }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-pink-400"><IconChart className="w-5 h-5" /></span>
                                    <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Avg Response Time</span>
                                </div>
                                <p className="text-3xl font-extrabold text-pink-400">
                                    {stats.avgResponseTime != null ? (
                                        stats.avgResponseTime < 1 ? '<1' : stats.avgResponseTime
                                    ) : '—'}
                                    {stats.avgResponseTime != null && <span className="text-lg text-pink-400/60">h</span>}
                                </p>
                                <p className="text-xs text-white/40 mt-1">
                                    {stats.avgResponseTime != null ? ( stats.avgResponseTime < 24 ? 'Great response time!' : 'Try to respond faster') : 'No replies yet'}
                                </p>
                            </div>
                        </div>

                        {/* Rating Distribution + Top Keywords */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Rating Distribution Bars */}
                            <div className="p-6 rounded-2xl" style={glassCard}>
                                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                                    <span className="text-yellow-400"><IconStar className="w-5 h-5 inline" /></span> Rating
                                </h3>
                                <div className="space-y-3">
                                    {[5, 4, 3, 2, 1].map(star => {
                                        const dist = stats.ratingDistribution?.find(d => d.star === star)
                                        const pct = dist?.percentage || 0
                                        const count = dist?.count || 0
                                        return (
                                            <div key={star} className="flex items-center gap-3">
                                                <span className="text-sm text-white/70 w-12 font-medium">{star} <IconStar className="w-4 h-4 inline text-yellow-400" /></span>
                                                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                                        style={{
                                                            width: `${pct}%`,
                                                            background: star >= 4 ? 'linear-gradient(90deg, #22c55e, #4ade80)' :
                                                                         star === 3 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                                                                                                                 'linear-gradient(90deg, #ef4444, #f87171)',
                                                            minWidth: count > 0 ? '8px' : '0',
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-white/50 w-16 text-right">{count} ({pct}%)</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Top Keywords */}
                            <div className="p-6 rounded-2xl" style={glassCard}>
                                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                                    <span className="text-white/70"><IconDoc className="w-5 h-5 inline" /></span> Top Keywords
                                </h3>
                                {stats.topKeywords?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {stats.topKeywords.map((kw, i) => {
                                            const maxCount = stats.topKeywords[0]?.count || 1
                                            const opacity = 0.3 + (kw.count / maxCount) * 0.7
                                            const size = 0.7 + (kw.count / maxCount) * 0.4
                                            return (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1.5 rounded-full transition-all duration-300 hover:scale-105 cursor-default"
                                                    style={{
                                                        background: `rgba(102, 126, 234, ${opacity * 0.3})`,
                                                        border: `1px solid rgba(102, 126, 234, ${opacity * 0.5})`,
                                                        color: `rgba(165, 180, 252, ${opacity + 0.2})`,
                                                        fontSize: `${size}rem`,
                                                    }}
                                                    title={`Mentioned ${kw.count} times`}
                                                >
                                                    {kw.word} <span className="text-white/30 text-xs">×{kw.count}</span>
                                                </span>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-white/40 text-sm text-center py-6">Not enough feedback data for keywords</p>
                                )}
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
                                
                                {/* Feedback Type Filter + Export */}
                                <div className="flex gap-2 flex-wrap">
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
                                        Positive ({stats.positive})
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
                                        Negative ({stats.negative})
                                    </button>
                                    <button
                                        onClick={exportCSV}
                                        disabled={exporting || feedbacks.length === 0}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                                        style={{
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            border: '1px solid rgba(59, 130, 246, 0.4)',
                                            color: '#93c5fd',
                                            opacity: (exporting || feedbacks.length === 0) ? 0.5 : 1,
                                        }}
                                    >
                                        {exporting ? 'Exporting...' : <><IconExport className="w-4 h-4 inline mr-1" /> Export CSV</>}
                                    </button>
                                </div>
                            </div>

                            {/* Search Bar */}
                            {feedbacks.length > 0 && (
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search feedback messages..."
                                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                        }}
                                    />
                                    {searchQuery && (
                                        <p className="text-xs text-white/40 mt-1 ml-1">
                                            Showing {filteredFeedbacks.length} of {feedbacks.length} feedbacks
                                        </p>
                                    )}
                                </div>
                            )}

                            {feedbacks.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="block mb-2 text-white/50">{feedbackType === 'negative' ? <IconCelebrate className="w-12 h-12 mx-auto" /> : <IconInbox className="w-12 h-12 mx-auto" />}</span>
                                    <p className="text-white/60">
                                        {feedbackType === 'negative' 
                                            ? `No negative feedback ${getFilterLabel()}`
                                            : feedbackType === 'positive'
                                            ? `No positive feedback ${getFilterLabel()}`
                                            : `No feedback ${getFilterLabel()}`}
                                    </p>
                                </div>
                            ) : filteredFeedbacks.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="block mb-2 text-white/50"><IconSearch className="w-10 h-10 mx-auto" /></span>
                                    <p className="text-white/60">No feedback matches "{searchQuery}"</p>
                                </div>
                            ) : (
                                <ul className="space-y-3 max-h-[550px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                    {filteredFeedbacks.map((feedback) => (
                                        <li
                                            key={feedback.id}
                                            className="p-4 rounded-xl transition-all duration-200"
                                            style={feedback.is_positive ? {
                                                background: feedback.is_pinned ? 'rgba(34, 197, 94, 0.18)' : 'rgba(34, 197, 99, 0.1)',
                                                borderLeft: '4px solid rgba(74, 222, 128, 0.6)',
                                                border: `1px solid rgba(34, 197, 94, ${feedback.is_pinned ? '0.4' : '0.2'})`,
                                                boxShadow: feedback.is_pinned ? '0 0 12px rgba(245, 158, 11, 0.15)' : 'none',
                                            } : {
                                                background: feedback.is_pinned ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.1)',
                                                borderLeft: '4px solid rgba(248, 113, 113, 0.6)',
                                                border: `1px solid rgba(239, 68, 68, ${feedback.is_pinned ? '0.4' : '0.2'})`,
                                                boxShadow: feedback.is_pinned ? '0 0 12px rgba(225, 158, 11, 0.15)' : 'none',
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        {feedback.is_pinned && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                                                                📌 pined
                                                            </span>
                                                        )}
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
                                                        {feedback.owner_reply && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                                                <><IconCheck className="w-3.5 h-3.5 inline mr-0.5" /> Replied</>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-white/90 text-sm">
                                                        "{feedback.message || 'No message provided'}"
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                                    <span className="text-xs text-white/40 whitespace-nowrap">
                                                        {formatDate(feedback.created_at)} {formatTime(feedback.created_at)}
                                                    </span>
                                                    <button
                                                        onClick={() => pinFeedback(feedback.id)}
                                                        className="text-xs px-1.5 py-1 rounded-lg transition-all hover:bg-amber-500/20"
                                                        style={{ color: feedback.is_pinned ? '#fbbf24' : '#ffffff60', opacity: feedback.is_pinned ? 1 : 0.5 }}
                                                        title={feedback.is_pinned ? 'Unpin feedback' : 'Pin feedback'}
                                                    >
                                                        📌
                                                    </button>
                                                    <button
                                                        onClick={() => deleteFeedback(feedback.id)}
                                                        disabled={deletingId === feedback.id}
                                                        className="text-xs px-1.5 py-1 rounded-lg transition-all hover:bg-red-500/20"
                                                        style={{ color: '#f87171', opacity: deletingId === feedback.id ? 0.3 : 0.5 }}
                                                        title="Delete feedback"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Owner Reply Display */}
                                            {feedback.owner_reply && replyingTo !== feedback.id && !hiddenReplies.has(feedback.id) && (
                                                <div 
                                                    className="mt-3 p-3 rounded-lg ml-4"
                                                    style={{
                                                        background: 'rgba(59, 130, 246, 0.08)',
                                                        border: '1px solid rgba(59, 130, 246, 0.15)',
                                                        borderLeft: '3px solid rgba(96, 165, 250, 0.5)',
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-semibold text-blue-400"><IconReply className="w-3.5 h-3.5 inline mr-0.5" /> Your Reply</span>
                                                        <span className="text-xs text-white/30">
                                                            {feedback.replied_at && formatDate(feedback.replied_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-white/70">{feedback.owner_reply}</p>
                                                </div>
                                            )}

                                            {/* Reply Actions */}
                                            <div className="mt-2 flex gap-2">
                                                {replyingTo !== feedback.id ? (
                                                    <>
                                                    {feedback.has_email ? (
                                                        <button
                                                            onClick={() => {
                                                                setReplyingTo(feedback.id)
                                                                setReplyText(feedback.owner_reply || '')
                                                            }}
                                                            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all font-medium"
                                                            style={{
                                                                background: 'rgba(59, 130, 244, 0.15)',
                                                                border: '1px solid rgba(59, 110, 246, 0.3)',
                                                                color: '#93c5fd',
                                                            }}
                                                        >
                                                            {feedback.owner_reply ? <><IconEdit className="w-4 h-4 shrink-0" /> Edit Reply</> : <><IconReply className="w-4 h-4 shrink-0" /> Reply</>}
                                                            <span title="Reply will be emailed to customer"><IconMail className="w-3.5 h-3.5 shrink-0 opacity-80" /></span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs px-3 py-2 text-white/40 italic">
                                                            No email provided
                                                        </span>
                                                    )}
                                                    {feedback.owner_reply && (
                                                        <button
                                                            onClick={() => {
                                                                setHiddenReplies(prev => {
                                                                    const next = new Set(prev)
                                                                    if (next.has(feedback.id)) {
                                                                        next.delete(feedback.id)
                                                                    } else {
                                                                        next.add(feedback.id)
                                                                    }
                                                                    return next
                                                                })
                                                            }}
                                                            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all font-medium"
                                                            style={{
                                                                background: hiddenReplies.has(feedback.id) ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.06)',
                                                                border: `1px solid ${hiddenReplies.has(feedback.id) ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                                color: hiddenReplies.has(feedback.id) ? '#93c5fd' : 'rgba(255, 255, 255, 0.5)',
                                                            }}
                                                        >
                                                            {hiddenReplies.has(feedback.id) ? <><IconEye className="w-4 h-4 shrink-0" /> Show Reply</> : <><IconHide className="w-4 h-4 shrink-0" /> Hide Reply</>}
                                                        </button>
                                                    )}
                                                    </>
                                                ) : (
                                                    <div className="flex-1">
                                                        <textarea
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            placeholder="Write your reply..."
                                                            rows={3}
                                                            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none resize-none"
                                                            style={{
                                                                background: 'rgba(255, 255, 255, 0.06)',
                                                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                                            }}
                                                        />
                                                        {feedback.has_email && (
                                                            <p className="text-xs text-blue-100">
                                                                <IconMail className="w-3.5 h-3.5 inline mr-1" /> This reply will be emailed to the customer from ReviewDock
                                                            </p>
                                                        )}
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={() => replyToFeedback(feedback.id)}
                                                                disabled={!replyText.trim() || replySending}
                                                                className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all"
                                                                style={{
                                                                    background: 'rgba(84, 197, 94, 0.2)',
                                                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                                                    color: '#4ade80',
                                                                    opacity: (!replyText.trim() || replySending) ? 0.5 : 1,
                                                                }}
                                                            >
                                                                {replySending ? 'Sending...' : 'Send Reply'}
                                                            </button>
                                                            <button
                                                                onClick={() => { setReplyingTo(null); setReplyText('') }}
                                                                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                                                                style={{
                                                                    background: 'rgba(255, 225, 255, 0.08)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                    color: 'rgba(255, 255, 255, 0.6)',
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Saved External Feedback Analyses from Settings */}
                        {savedSummaries.length > 0 && (
                            <div className="p-6 mt-6" style={glassCard}>
                                <h2 
                                    className="text-lg font-bold mb-1"
                                    style={{
                                        background: 'linear-gradient(135deg, #ffffff 0%, #c084fc 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}
                                >
                                    <><IconChart className="w-5 h-5 inline mr-1" /> Saved Feedback Analyses</>
                                </h2>
                                <p className="text-xs text-white/50 mb-4">
                                    Summaries saved in Settings. Click "Analyze" to run AI sentiment analysis.
                                </p>

                                {/* Summary Cards */}
                                <div className="space-y-3 mb-4">
                                    {savedSummaries.map((summary) => {
                                        const sourceLabels = {
                                            google_form: 'Google Form', google_review: 'Google Review', survey: 'Survey', email: 'Email', other: 'Other'
                                        }
                                        const isSelected = selectedSummary?.id === summary.id
                                        
                                        return (
                                            <div key={summary.id}>
                                                <div
                                                    className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 cursor-pointer"
                                                    style={isSelected ? {
                                                        background: 'rgba(139, 92, 246, 0.15)',
                                                        border: '1px solid rgba(139, 92, 246, 0.4)',
                                                    } : {
                                                        background: summary.is_analyzed 
                                                            ? 'rgba(34, 199, 94, 0.06)' 
                                                            : 'rgba(255, 255, 255, 0.04)',
                                                        border: summary.is_analyzed 
                                                            ? '1px solid rgba(34, 197, 94, 0.15)' 
                                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                                    }}
                                                    onClick={() => summary.is_analyzed ? viewSummaryAnalysis(summary) : null}
                                                >
                                                    <span 
                                                        className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
                                                        style={{
                                                            background: 'rgba(139, 92, 246, 0.2)',
                                                            color: '#c4b5fd',
                                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                                        }}
                                                    >
                                                        {sourceLabels[summary.source_type] || 'External'}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-medium text-white/90">
                                                                {summary.title}
                                                            </span>
                                                            {summary.is_analyzed && (
                                                                <span 
                                                                    className="text-xs px-2 py-0.5 rounded-full"
                                                                    style={{
                                                                        background: summary.overall_sentiment === 'positive' 
                                                                            ? 'rgba(34, 197, 94, 0.2)' 
                                                                            : summary.overall_sentiment === 'negative'
                                                                            ? 'rgba(239, 68, 68, 0.2)'
                                                                            : 'rgba(245, 158, 11, 0.2)',
                                                                        color: summary.overall_sentiment === 'positive' 
                                                                            ? '#4ade80' 
                                                                            : summary.overall_sentiment === 'negative'
                                                                            ? '#f87171'
                                                                            : '#fbbf24'
                                                                    }}
                                                                >
                                                                    {summary.overall_sentiment} ({summary.overall_score}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-white/40 mt-0.5">
                                                            Saved {new Date(summary.created_at).toLocaleDateString()}
                                                            {summary.is_analyzed && ` • ${summary.total_reviews_found} reviews found • +${summary.positive_count} −${summary.negative_count}`}
                                                            {summary.analyzed_at && ` • Analyzed ${new Date(summary.analyzed_at).toLocaleDateString()}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        {summary.is_analyzed && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); viewSummaryAnalysis(summary); }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300"
                                                                style={{
                                                                    background: 'rgba(59, 130, 246, 0.2)',
                                                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                                                    color: '#93c5fd',
                                                                }}
                                                            >
                                                                <IconEye className="w-4 h-4 shrink-0" /> View
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); analyzeSavedSummary(summary); }}
                                                            disabled={summaryAnalyzing && selectedSummary?.id === summary.id}
                                                            className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300"
                                                            style={{
                                                                background: (summaryAnalyzing && selectedSummary?.id === summary.id)
                                                                    ? 'rgba(139, 92, 246, 0.2)'
                                                                    : 'linear-gradient(135deg, rgba(139, 42, 246, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                                                border: '1px solid rgba(139, 92, 246, 0.5)',
                                                                color: 'white',
                                                                cursor: (summaryAnalyzing && selectedSummary?.id === summary.id) ? 'not-allowed' : 'pointer',
                                                            }}
                                                        >
                                                            {summaryAnalyzing && selectedSummary?.id === summary.id ? (
                                                                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                                                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent shrink-0" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></span>
                                                                    Analyzing...
                                                                </span>
                                                            ) : summary.is_analyzed ? <><IconBot className="w-4 h-4 shrink-0" /> Re-Analyze</> : <><IconBot className="w-4 h-4 shrink-0" /> Analyze</>}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Summary Analysis Results */}
                                {summaryAnalysis && selectedSummary && (
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-semibold text-purple-300">
                                                <><IconChart className="w-5 h-5 inline mr-1" /> Analysis Results — {selectedSummary.title}</>
                                            </span>
                                            <button
                                                onClick={() => { setSummaryAnalysis(null); setSelectedSummary(null); setSummaryError(''); }}
                                                className="text-xs text-white/40 hover:text-white/70 transition-all"
                                            >
                                                ✕ Close
                                            </button>
                                        </div>

                                        {/* Overall Summary Card */}
                                        <div 
                                            className="p-4 rounded-xl mb-3"
                                            style={{
                                                background: 'linear-gradient(115deg, rgba(139, 92, 246, 0.12) 0%, rgba(118, 75, 162, 0.08) 100%)',
                                                border: '1px solid rgba(139, 92, 246, 0.25)',
                                            }}
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="text-xs font-semibold text-purple-300">Overall Verdict</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                                    summaryAnalysis.overallSentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                                                    summaryAnalysis.overallSentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                    {summaryAnalysis.overallSentiment === 'positive' ? 'POSITIVE' : 
                                                     summaryAnalysis.overallSentiment === 'negative' ? 'NEGATIVE' : 'MIXED'}
                                                </span>
                                                <span className=" text-xs text-white/50">Score: {summaryAnalysis.overallScore}/100</span>
                                                {summaryAnalysis.accuracy && (
                                                    <span className="text-xs text-white/40 ml-auto"><IconTarget className="w-3.5 h-3.5 inline mr-0.5" /> {summaryAnalysis.accuracy}% accuracy</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-white/80">{summaryAnalysis.overallSummary}</p>
                                            {summaryAnalysis.averageRating && (
                                                <p className="text-xs text-white/50 mt-2">
                                                    <><IconStar className="w-3.5 h-3.5 inline mr-0.5 text-yellow-400" /> Average Rating: {summaryAnalysis.averageRating}/5</> • {summaryAnalysis.totalFound} reviews found
                                                </p>
                                            )}
                                        </div>

                                        {/* Positive / Negative Counts */}
                                        <div className="flex gap-3 mb-3">
                                            <div className="flex-1 p-4 rounded-xl text-center" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                                <span className="text-2xl font-bold text-green-400">{summaryAnalysis.positiveCount}</span>
                                                <p className="text-xs text-green-400/70">Positive</p>
                                            </div>
                                            <div className="flex-1 p-4 rounded-xl text-center" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                <span className="text-2xl font-bold text-red-400">{summaryAnalysis.negativeCount}</span>
                                                <p className="text-xs text-red-400/70">Negative</p>
                                            </div>
                                            {summaryAnalysis.neutralCount > 0 && (
                                                <div className="flex-1 p-4 rounded-xl text-center" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                    <span className="text-2xl font-bold text-yellow-400">{summaryAnalysis.neutralCount}</span>
                                                    <p className="text-xs text-yellow-400/70">Neutral</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Sentiment Distribution */}
                                        {summaryAnalysis.sentimentDistribution && (
                                            <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                <h4 className="text-xs font-semibold text-white/60 mb-2"><IconChart className="w-4 h-4 inline mr-0.5" /> Rating Distribution</h4>
                                                <div className="space-y-1.5">
                                                    {[
                                                        { label: '5 ★', key: 'veryPositive', color: '#22c55e' },
                                                        { label: '4 ★', key: 'positive', color: '#4ade80' },
                                                        { label: '3 ★', key: 'neutral', color: '#fbbf24' },
                                                        { label: '2 ★', key: 'negative', color: '#f87171' },
                                                        { label: '1 ★', key: 'veryNegative', color: '#ef4444' },
                                                    ].map(({ label, key, color }) => {
                                                        const count = summaryAnalysis.sentimentDistribution[key] || 0
                                                        const maxCount = Math.max(...Object.values(summaryAnalysis.sentimentDistribution).map(Number).filter(n => !isNaN(n)), 1)
                                                        const width = maxCount > 0 ? (count / maxCount) * 100 : 0
                                                        return (
                                                            <div key={key} className="flex items-center gap-2">
                                                                <span className="text-xs text-white/50 w-8">{label}</span>
                                                                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                                    <div 
                                                                        className="h-full rounded-full transition-all duration-500"
                                                                        style={{ width: `${width}%`, background: color, minWidth: count > 0 ? '8px' : '0' }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-white/40 w-6 text-right">{count}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Key Themes */}
                                        {summaryAnalysis.keyThemes?.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {summaryAnalysis.keyThemes.map((theme, i) => (
                                                    <span 
                                                        key={i}
                                                        className="text-xs px-3 py-1 rounded-full"
                                                        style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 99, 246, 0.25)' }}
                                                    >
                                                        {theme}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            {/* Positive Points */}
                                            {summaryAnalysis.topPositivePoints?.length > 0 && (
                                                <div className="p-3 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 99, 0.15)' }}>
                                                    <h4 className="text-xs font-semibold text-green-400 mb-2">Strengths</h4>
                                                    <ul className="space-y-1">
                                                        {summaryAnalysis.topPositivePoints.map((p, i) => (
                                                            <li key={i} className="text-xs text-white/70 flex items-start gap-1">
                                                                <span className="text-green-400 mt-0.5">•</span> {p}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {/* Negative Points */}
                                            {summaryAnalysis.topNegativePoints?.length > 0 && (
                                                <div className="p-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                                    <h4 className="text-xs font-semibold text-red-400 mb-2">Needs Improvement</h4>
                                                    <ul className="space-y-1">
                                                        {summaryAnalysis.topNegativePoints.map((p, i) => (
                                                            <li key={i} className="text-xs text-white/70 flex items-start gap-1">
                                                                <span className="text-red-400 mt-0.5">•</span> {p}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recommendations */}
                                        {summaryAnalysis.recommendations?.length > 0 && (
                                            <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                                                <h4 className="text-xs font-semibold text-blue-400 mb-2">💡 AI Recommendations</h4>
                                                <ul className="space-y-1">
                                                    {summaryAnalysis.recommendations.map((r, i) => (
                                                        <li key={i} className="text-xs text-white/70 flex items-start gap-1">
                                                            <span className="text-blue-400 mt-0.5">{i + 1}.</span> {r}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Individual Feedbacks */}
                                        {summaryAnalysis.feedbacks?.length > 0 && (
                                            <div className="p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                <h4 className="text-xs font-semibold text-white/70 mb-2"><IconDoc className="w-4 h-4 inline mr-0.5" /> Individual Reviews ({summaryAnalysis.feedbacks.length})</h4>
                                                <div className="space-y-2 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                                    {summaryAnalysis.feedbacks.map((fb, i) => (
                                                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                            <span className={`text-sm mt-0.5 ${
                                                                fb.sentiment === 'positive' ? 'text-green-400' :
                                                                fb.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'
                                                            }`}>
                                                                {fb.sentiment === 'positive' ? '+' : fb.sentiment === 'negative' ? '−' : '·'}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs text-white/70 line-clamp-2">{fb.text || fb.summary}</p>
                                                                <div className="flex gap-3 mt-1">
                                                                    <span className={`text-xs ${
                                                                        fb.sentiment === 'positive' ? 'text-green-400/70' :
                                                                        fb.sentiment === 'negative' ? 'text-red-400/70' : 'text-yellow-400/70'
                                                                    }`}>{fb.sentiment}</span>
                                                                    {fb.rating && <span className="text-xs text-yellow-400/60 inline-flex"><IconStar className="w-3 h-3" /><span className="ml-0.5">{fb.rating}/5</span></span>}
                                                                    {fb.confidence && <span className="text-xs text-white/30">{fb.confidence}% confidence</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Note if fallback was used */}
                                        {summaryAnalysis.note && (
                                            <p className="text-xs text-yellow-400/60 mt-3">{summaryAnalysis.note}</p>
                                        )}
                                    </div>
                                )}

                                {/* Summary Error */}
                                {summaryError && (
                                    <div className="p-3 rounded-xl mt-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                        <p className="text-xs text-red-400"><IconAlert className="w-3.5 h-3.5 inline mr-0.5" /> {summaryError}</p>
                                    </div>
                                )}

                                <p className="text-xs text-white/30 mt-3 text-center">
                                    💡 Add more feedback summaries in <a href="/settings" className="text-purple-400 underline">Settings</a> → External Feedback Summaries
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    )
}

