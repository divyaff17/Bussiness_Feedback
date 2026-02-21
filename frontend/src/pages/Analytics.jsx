import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import API_URL from '../config/api'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts'

// Glass card style helper
const glassCard = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    borderRadius: '1.5rem',
}

const COLORS = {
    positive: '#22c55e',
    negative: '#ef4444',
    total: '#667eea',
    rating: '#f59e0b'
}

export default function Analytics() {
    const { user, getToken } = useAuth()
    const [loading, setLoading] = useState(true)
    const [analyticsData, setAnalyticsData] = useState(null)
    const [range, setRange] = useState('month')
    const [startDate, setStartDate] = useState(null)
    const [endDate, setEndDate] = useState(null)
    const [showCustom, setShowCustom] = useState(false)
    const [chartType, setChartType] = useState('area') // 'line', 'bar', 'area'

    useEffect(() => {
        fetchAnalytics()
    }, [range, startDate, endDate])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const token = getToken()
            if (!token || !user?.businessId) {
                setLoading(false)
                return
            }

            let url = `${API_URL}/api/business/${user.businessId}/analytics?range=${range}`
            
            if (range === 'custom' && startDate && endDate) {
                url += `&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setAnalyticsData(data)
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    const rangeOptions = [
        { value: 'week', label: 'Last 7 Days' },
        { value: 'month', label: 'Last 30 Days' },
        { value: 'year', label: 'This Year' },
        { value: 'custom', label: 'Custom Range' }
    ]

    const handleRangeChange = (value) => {
        setRange(value)
        if (value === 'custom') {
            setShowCustom(true)
            // Default to last 30 days for custom
            const end = new Date()
            const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
            setStartDate(start)
            setEndDate(end)
        } else {
            setShowCustom(false)
            setStartDate(null)
            setEndDate(null)
        }
    }

    // Pie chart data
    const pieData = analyticsData ? [
        { name: 'Positive', value: analyticsData.summary.positive, color: COLORS.positive },
        { name: 'Negative', value: analyticsData.summary.negative, color: COLORS.negative },
    ] : []

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'white'
                }}>
                    <p className="font-medium mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    const renderChart = () => {
        if (!analyticsData?.chartData?.length) return null

        const chartProps = {
            data: analyticsData.chartData,
            margin: { top: 10, right: 30, left: 0, bottom: 0 }
        }

        if (chartType === 'bar') {
            return (
                <BarChart {...chartProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="positive" name="Positive" fill={COLORS.positive} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="negative" name="Negative" fill={COLORS.negative} radius={[4, 4, 0, 0]} />
                </BarChart>
            )
        } else if (chartType === 'line') {
            return (
                <LineChart {...chartProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="positive" name="Positive" stroke={COLORS.positive} strokeWidth={2} dot={{ fill: COLORS.positive }} />
                    <Line type="monotone" dataKey="negative" name="Negative" stroke={COLORS.negative} strokeWidth={2} dot={{ fill: COLORS.negative }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke={COLORS.total} strokeWidth={2} dot={{ fill: COLORS.total }} />
                </LineChart>
            )
        } else {
            return (
                <AreaChart {...chartProps}>
                    <defs>
                        <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.positive} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={COLORS.positive} stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.negative} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={COLORS.negative} stopOpacity={0.1}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="positive" name="Positive" stroke={COLORS.positive} fillOpacity={1} fill="url(#positiveGradient)" />
                    <Area type="monotone" dataKey="negative" name="Negative" stroke={COLORS.negative} fillOpacity={1} fill="url(#negativeGradient)" />
                </AreaChart>
            )
        }
    }

    return (
        <Layout>
            <div className="animate-fadeIn">
                {/* Header */}
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
                            📈 Analytics
                        </h1>
                        <p className="text-white/60">Track your feedback trends and performance</p>
                    </div>

                    {/* Range Filter */}
                    <div className="flex gap-2 flex-wrap">
                        {rangeOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleRangeChange(opt.value)}
                                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300"
                                style={range === opt.value ? {
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

                {/* Custom Date Picker */}
                {showCustom && (
                    <div className="p-4 mb-6" style={glassCard}>
                            <div className="flex flex-wrap items-center gap-4">
                                <div>
                                    <label className="block text-xs text-white/60 mb-1">From Date</label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date) => setStartDate(date)}
                                        selectsStart
                                        startDate={startDate}
                                        endDate={endDate}
                                        maxDate={new Date()}
                                        className="px-3 py-2 rounded-lg text-white text-sm"
                                        style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                                        dateFormat="MMM d, yyyy"
                                        showYearDropdown
                                        scrollableYearDropdown
                                        yearDropdownItemNumber={5}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/60 mb-1">To Date</label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date) => setEndDate(date)}
                                        selectsEnd
                                        startDate={startDate}
                                        endDate={endDate}
                                        minDate={startDate}
                                        maxDate={new Date()}
                                        className="px-3 py-2 rounded-lg text-white text-sm"
                                        style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                                        dateFormat="MMM d, yyyy"
                                        showYearDropdown
                                        scrollableYearDropdown
                                        yearDropdownItemNumber={5}
                                    />
                                </div>
                                <button
                                    onClick={fetchAnalytics}
                                    className="px-4 py-2 rounded-xl text-sm font-medium mt-5 transition-all duration-300"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                    }}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div 
                            className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent"
                            style={{ borderColor: '#667eea', borderTopColor: 'transparent' }}
                        ></div>
                    </div>
                ) : analyticsData ? (
                    <>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <div className="p-4 text-center" style={glassCard}>
                                    <p className="text-3xl font-bold text-blue-400">{analyticsData.summary.total}</p>
                                    <p className="text-xs text-white/60">Total Feedback</p>
                                </div>
                            <div className="p-4 text-center" style={glassCard}>
                                    <p className="text-3xl font-bold text-green-400">{analyticsData.summary.positive}</p>
                                    <p className="text-xs text-white/60">Positive</p>
                                </div>
                            <div className="p-4 text-center" style={glassCard}>
                                    <p className="text-3xl font-bold text-red-400">{analyticsData.summary.negative}</p>
                                    <p className="text-xs text-white/60">Negative</p>
                                </div>
                            <div className="p-4 text-center" style={glassCard}>
                                    <p className="text-3xl font-bold text-yellow-400">⭐ {analyticsData.summary.avgRating}</p>
                                    <p className="text-xs text-white/60">Avg Rating</p>
                                </div>
                            <div className="p-4 text-center" style={glassCard}>
                                    <p className="text-3xl font-bold text-teal-400">{analyticsData.summary.positiveRate}%</p>
                                    <p className="text-xs text-white/60">Positive Rate</p>
                                </div>
                        </div>

                        {/* Main Chart */}
                        <div className="p-6 mb-6" style={glassCard}>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 
                                        className="text-lg font-bold"
                                        style={{
                                            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                        }}
                                    >
                                        Feedback Trend
                                    </h2>
                                    
                                    {/* Chart Type Toggle */}
                                    <div className="flex gap-2">
                                        {[
                                            { type: 'area', icon: '📊' },
                                            { type: 'line', icon: '📈' },
                                            { type: 'bar', icon: '📉' }
                                        ].map(({ type, icon }) => (
                                            <button
                                                key={type}
                                                onClick={() => setChartType(type)}
                                                className="w-8 h-8 rounded-lg text-sm transition-all duration-300"
                                                style={chartType === type ? {
                                                    background: 'rgba(102, 126, 234, 0.4)',
                                                    border: '1px solid rgba(102, 126, 234, 0.5)',
                                                } : {
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                }}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ height: '300px' }}>
                                    {analyticsData.chartData?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            {renderChart()}
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-white/50">
                                            No data available for this period
                                        </div>
                                    )}
                                </div>
                            </div>

                        {/* Pie Chart & Rating Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Pie Chart */}
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
                                        Feedback Distribution
                                    </h2>
                                    <div style={{ height: '250px' }}>
                                        {analyticsData.summary.total > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-white/50">
                                                No data available
                                            </div>
                                        )}
                                    </div>
                            </div>

                            {/* Average Rating Trend */}
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
                                        Average Rating Trend
                                    </h2>
                                    <div style={{ height: '250px' }}>
                                        {analyticsData.chartData?.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={analyticsData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                                                    <YAxis domain={[0, 5]} stroke="rgba(255,255,255,0.6)" fontSize={12} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Line 
                                                        type="monotone" 
                                                        dataKey="avgRating" 
                                                        name="Avg Rating" 
                                                        stroke={COLORS.rating} 
                                                        strokeWidth={3}
                                                        dot={{ fill: COLORS.rating, r: 4 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-white/50">
                                                No data available
                                            </div>
                                        )}
                                    </div>
                                </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-white/60">
                        Failed to load analytics data
                    </div>
                )}
            </div>
        </Layout>
    )
}
