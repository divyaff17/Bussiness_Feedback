import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'

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
            const headers = { 'Authorization': `Bearer ${token}` }

            // Fetch stats
            const statsRes = await fetch(`/api/business/${user.businessId}/stats?filter=${filter}`, { headers })
            const statsData = await statsRes.json()
            setStats(statsData)

            // Fetch negative feedbacks
            const feedbackRes = await fetch(`/api/feedback/${user.businessId}?filter=${filter}&type=negative`, { headers })
            const feedbackData = await feedbackRes.json()
            setFeedbacks(feedbackData.feedbacks || [])

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

    return (
        <Layout>
            <div className="animate-fadeIn">
                {/* Header with Filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                        <p className="text-gray-500">View feedback for your business</p>
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live updates • Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        {filterOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setFilter(opt.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === opt.value
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <>
                        {/* Feedback Summary - Matching Prompt Exactly */}
                        <div className="card mb-8">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">Feedback Summary</h2>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-blue-50 rounded-xl">
                                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                                    <p className="text-sm text-gray-600">Total feedback {getFilterLabel()}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl">
                                    <p className="text-3xl font-bold text-green-600">{stats.positive}</p>
                                    <p className="text-sm text-gray-600">Positive feedbacks</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-xl">
                                    <p className="text-3xl font-bold text-red-600">{stats.negative}</p>
                                    <p className="text-sm text-gray-600">Negative feedbacks</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Negative Feedback List - Matching Prompt Format */}
                        <div className="card">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Negative Feedback</h2>

                            {feedbacks.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <span className="text-4xl block mb-2">🎉</span>
                                    No negative feedback {getFilterLabel()}!
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {feedbacks.map((feedback) => (
                                        <li
                                            key={feedback.id}
                                            className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-red-400"
                                        >
                                            <div className="flex-1">
                                                <p className="text-gray-800">
                                                    "{feedback.message || 'No message provided'}"
                                                </p>
                                            </div>
                                            <span className="text-sm text-gray-400 ml-4 whitespace-nowrap">
                                                – {formatTime(feedback.createdAt)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    )
}

