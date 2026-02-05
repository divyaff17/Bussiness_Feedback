import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import ElectricBorder from '../components/ElectricBorder'
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
    const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0 })
    const [feedbacks, setFeedbacks] = useState([])
    const [filter, setFilter] = useState('today')
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(new Date())

    // Initial fetch and auto-refresh every 10 seconds
    useEffect(() => {
        fetchData()

        // Auto-refresh every 10 seconds for real-time updates
        const interval = setInterval(() => {
            fetchData(false) // false = don't show loading spinner on refresh
        }, 10000)

        return () => clearInterval(interval)
    }, [filter])

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        try {
            const token = getToken()
            if (!token || !user?.businessId) {
                setLoading(false)
                return
            }

            const headers = { 'Authorization': `Bearer ${token}` }

            // Fetch stats
            const statsRes = await fetch(`${API_URL}/api/business/${user.businessId}/stats?filter=${filter}`, { headers })
            if (statsRes.ok) {
                const statsData = await statsRes.json()
                setStats(statsData)
            } else if (statsRes.status === 403 || statsRes.status === 404) {
                console.log('Session invalid, please login again')
                return
            }

            // Fetch negative feedbacks
            const feedbackRes = await fetch(`${API_URL}/api/feedback/${user.businessId}?filter=${filter}&type=negative`, { headers })
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
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'Last 7 days' },
        { value: 'month', label: 'Last 30 days' }
    ]

    const formatTime = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    }

    const getFilterLabel = () => {
        switch (filter) {
            case 'today': return 'today'
            case 'week': return 'this week'
            case 'month': return 'this month'
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
                <ElectricBorder color="#667eea" speed={1} chaos={0.12} borderRadius={24} className="mb-6">
                <div 
                    className="p-6 overflow-hidden relative"
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
                </ElectricBorder>

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
                            Live updates • Last updated: {lastUpdated.toLocaleTimeString()}
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
                        <ElectricBorder color="#22c55e" speed={0.8} chaos={0.1} borderRadius={24} className="mb-8">
                        <div className="p-6" style={glassCard}>
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
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-blue-400">{stats.total}</p>
                                    <p className="text-sm text-white/60">Total feedback {getFilterLabel()}</p>
                                </div>
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-green-400">{stats.positive}</p>
                                    <p className="text-sm text-white/60">Positive feedbacks</p>
                                </div>
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                    }}
                                >
                                    <p className="text-3xl font-bold text-red-400">{stats.negative}</p>
                                    <p className="text-sm text-white/60">Negative feedbacks</p>
                                </div>
                            </div>
                        </div>
                        </ElectricBorder>

                        {/* Recent Negative Feedback List */}
                        <ElectricBorder color="#f43f5e" speed={1.2} chaos={0.15} borderRadius={24}>
                        <div className="p-6" style={glassCard}>
                            <h2 
                                className="text-lg font-bold mb-4"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Recent Negative Feedback
                            </h2>

                            {feedbacks.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="text-4xl block mb-2">🎉</span>
                                    <p className="text-white/60">No negative feedback {getFilterLabel()}!</p>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {feedbacks.map((feedback) => (
                                        <li
                                            key={feedback.id}
                                            className="flex items-start justify-between p-4 rounded-xl"
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                borderLeft: '4px solid rgba(248, 113, 113, 0.6)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                            }}
                                        >
                                            <div className="flex-1">
                                                <p className="text-white/90">
                                                    "{feedback.message || 'No message provided'}"
                                                </p>
                                            </div>
                                            <span className="text-sm text-white/50 ml-4 whitespace-nowrap">
                                                – {formatTime(feedback.createdAt)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        </ElectricBorder>
                    </>
                )}
            </div>
        </Layout>
    )
}

