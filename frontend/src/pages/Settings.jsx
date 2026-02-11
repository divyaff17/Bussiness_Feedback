import { useState, useEffect, useRef } from 'react'
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

// Glass input style helper
const glassInput = {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    borderRadius: '0.75rem',
}

export default function Settings() {
    const { user, getToken, updateUser } = useAuth()
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        logoUrl: ''
    })
    const [profileImage, setProfileImage] = useState(null)
    const [profileImagePreview, setProfileImagePreview] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

    // Change Password state
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [changingPassword, setChangingPassword] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })

    // External Summaries state
    const [externalSummaries, setExternalSummaries] = useState([])
    const [newSummary, setNewSummary] = useState({ sourceType: 'google_form', title: '', rawText: '' })
    const [savingSummary, setSavingSummary] = useState(false)
    const [summarySuccess, setSummarySuccess] = useState('')
    const [showSummaryForm, setShowSummaryForm] = useState(false)

    const BUSINESS_CATEGORIES = [
        'Restaurant',
        'Café',
        'Gym',
        'Clinic',
        'Salon',
        'Spa',
        'Hotel',
        'Retail Store',
        'Other'
    ]

    useEffect(() => {
        if (user?.businessId) {
            fetchBusinessInfo()
            fetchExternalSummaries()
        }
    }, [user?.businessId])

    const fetchBusinessInfo = async () => {
        if (!user?.businessId) return
        try {
            const response = await fetch(`${API_URL}/api/business/${user.businessId}`)
            const data = await response.json()
            // Map snake_case from backend to camelCase for form
            setFormData({
                name: data.name || '',
                category: data.category || '',
                logoUrl: data.logo_url || data.logoUrl || ''
            })
        } catch (error) {
            console.error('Failed to fetch business info:', error)
        } finally {
            setLoading(false)
        }
    }

    // ==================== External Summaries ====================
    const fetchExternalSummaries = async () => {
        if (!user?.businessId) return
        try {
            const token = getToken()
            const response = await fetch(`${API_URL}/api/business/${user.businessId}/external-summaries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setExternalSummaries(data.summaries || [])
            }
        } catch (err) {
            console.error('Failed to fetch external summaries:', err)
        }
    }

    const saveExternalSummary = async () => {
        if (!newSummary.rawText.trim()) return
        setSavingSummary(true)
        setSummarySuccess('')
        setError('')

        try {
            const token = getToken()
            const response = await fetch(`${API_URL}/api/business/${user.businessId}/external-summaries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sourceType: newSummary.sourceType,
                    title: newSummary.title || undefined,
                    rawText: newSummary.rawText
                })
            })

            if (response.ok) {
                await fetchExternalSummaries()
                setNewSummary({ sourceType: 'google_form', title: '', rawText: '' })
                setShowSummaryForm(false)
                setSummarySuccess('✓ Feedback summary saved! Go to Dashboard to analyze it.')
                setTimeout(() => setSummarySuccess(''), 5000)
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to save summary')
            }
        } catch (err) {
            setError('Failed to save summary')
        } finally {
            setSavingSummary(false)
        }
    }

    const deleteExternalSummary = async (summaryId) => {
        if (!confirm('Remove this saved feedback summary?')) return
        try {
            const token = getToken()
            await fetch(`${API_URL}/api/business/${user.businessId}/external-summaries/${summaryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            await fetchExternalSummaries()
            setSummarySuccess('Summary removed')
            setTimeout(() => setSummarySuccess(''), 3000)
        } catch (err) {
            setError('Failed to remove summary')
        }
    }

    const sourceTypeLabels = {
        google_form: { label: 'Google Form', icon: '📋', color: 'rgba(59, 130, 246, 0.3)' },
        google_review: { label: 'Google Review', icon: '⭐', color: 'rgba(245, 158, 11, 0.3)' },
        survey: { label: 'Survey', icon: '📝', color: 'rgba(139, 92, 246, 0.3)' },
        email: { label: 'Email', icon: '📧', color: 'rgba(34, 197, 94, 0.3)' },
        other: { label: 'Other', icon: '🔗', color: 'rgba(156, 163, 175, 0.3)' }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setSuccess(false)
        setError('')
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB')
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                setProfileImage(reader.result)
                setProfileImagePreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleAvatarUpload = async () => {
        if (!profileImage) return

        setUploadingAvatar(true)
        setError('')
        setSuccess(false)

        try {
            const token = getToken()
            const response = await fetch(`${API_URL}/api/upload/avatar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    imageData: profileImage
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload avatar')
            }

            // Update user context with new profile picture URL
            updateUser({ profilePictureUrl: data.url })
            setProfileImage(null)
            setProfileImagePreview(null)
            setSuccess(true)
        } catch (err) {
            setError(err.message)
        } finally {
            setUploadingAvatar(false)
        }
    }

    // Generate default avatar with initials
    const getDefaultAvatar = (name) => {
        const initial = (name || 'U').charAt(0).toUpperCase()
        return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#667eea" width="100" height="100"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40" font-family="Arial">${initial}</text></svg>`)}`
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        setSuccess(false)

        try {
            const token = getToken()
            const response = await fetch(`${API_URL}/api/business/${user.businessId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update settings')
            }

            setSuccess(true)
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')

        if (passwordData.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters')
            return
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match')
            return
        }

        setChangingPassword(true)
        try {
            const token = getToken()
            const response = await fetch(`${API_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to change password')
            }

            setPasswordSuccess('✓ Password changed successfully!')
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
            setTimeout(() => setPasswordSuccess(''), 5000)
        } catch (err) {
            setPasswordError(err.message)
        } finally {
            setChangingPassword(false)
        }
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto animate-fadeIn">
                <div className="mb-8">
                    <h1 
                        className="text-2xl font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        ⚙️ Settings
                    </h1>
                    <p className="text-white/60">Manage your business information</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div 
                            className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent"
                            style={{ borderColor: '#667eea', borderTopColor: 'transparent' }}
                        ></div>
                    </div>
                ) : (
                    <div className="p-6" style={glassCard}>
                        {/* Profile Picture Section */}
                        <div 
                            className="mb-8 pb-6"
                            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
                        >
                            <h3 
                                className="font-semibold mb-4"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Profile Picture
                            </h3>
                            <div className="flex items-center gap-6">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden"
                                    style={{
                                        border: '2px dashed rgba(102, 126, 234, 0.5)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.8)';
                                        e.currentTarget.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {profileImagePreview ? (
                                        <img
                                            src={profileImagePreview}
                                            alt="New profile preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={user?.profilePictureUrl || getDefaultAvatar(user?.ownerName || user?.businessName)}
                                            alt="Current profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = getDefaultAvatar(user?.ownerName || user?.businessName)
                                            }}
                                        />
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    disabled={uploadingAvatar}
                                />
                                <div className="flex-1">
                                    <p className="text-sm text-white/60 mb-2">
                                        Click on the image to change your profile picture
                                    </p>
                                    {profileImage && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleAvatarUpload}
                                                disabled={uploadingAvatar}
                                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                                    border: '1px solid rgba(102, 126, 234, 0.5)',
                                                    color: 'white',
                                                }}
                                            >
                                                {uploadingAvatar ? (
                                                    <span className="flex items-center">
                                                        <span 
                                                            className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent mr-2"
                                                            style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                                                        ></span>
                                                        Uploading...
                                                    </span>
                                                ) : (
                                                    'Save Photo'
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setProfileImage(null)
                                                    setProfileImagePreview(null)
                                                }}
                                                disabled={uploadingAvatar}
                                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    color: 'white',
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Business Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Business Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none placeholder-white/40"
                                    style={{
                                        ...glassInput,
                                    }}
                                    placeholder="Your Business Name"
                                    required
                                    disabled={saving}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                                        e.target.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.2)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            {/* Category */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Business Category
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none"
                                    style={{
                                        ...glassInput,
                                    }}
                                    required
                                    disabled={saving}
                                >
                                    {BUSINESS_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat} style={{ background: '#1a1a2e', color: 'white' }}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* External Feedback Summaries Section */}
                            <div 
                                className="mb-6 p-4 rounded-xl"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(139, 92, 246, 0.15)',
                                }}
                            >
                                <h4 className="text-sm font-medium text-white/80 mb-1">
                                    🤖 External Feedback Summaries
                                </h4>
                                <p className="text-xs text-white/40 mb-4">
                                    Paste Google Form responses, Google Reviews, or any survey feedback here. Go to Dashboard → click "Analyze" to get AI-powered sentiment analysis.
                                </p>

                                {/* Saved Summaries List */}
                                {externalSummaries.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {externalSummaries.map((summary) => {
                                            const st = sourceTypeLabels[summary.source_type] || sourceTypeLabels.other
                                            return (
                                                <div 
                                                    key={summary.id}
                                                    className="flex items-center gap-3 p-3 rounded-lg"
                                                    style={{
                                                        background: summary.is_analyzed 
                                                            ? 'rgba(34, 197, 94, 0.08)' 
                                                            : 'rgba(255, 255, 255, 0.05)',
                                                        border: summary.is_analyzed 
                                                            ? '1px solid rgba(34, 197, 94, 0.2)' 
                                                            : '1px solid rgba(255, 255, 255, 0.1)',
                                                    }}
                                                >
                                                    <span className="text-xl">{st.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-white/90 truncate">
                                                                {summary.title}
                                                            </span>
                                                            {summary.is_analyzed ? (
                                                                <span 
                                                                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
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
                                                            ) : (
                                                                <span 
                                                                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                                                    style={{
                                                                        background: 'rgba(245, 158, 11, 0.15)',
                                                                        color: '#fbbf24'
                                                                    }}
                                                                >
                                                                    Not analyzed yet
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-white/40 mt-0.5">
                                                            {st.label} • Saved {new Date(summary.created_at).toLocaleDateString()}
                                                            {summary.is_analyzed && ` • ${summary.total_reviews_found} reviews (👍${summary.positive_count} 👎${summary.negative_count})`}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteExternalSummary(summary.id)}
                                                        className="text-xs px-2 py-1 rounded-lg transition-all flex-shrink-0"
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#f87171',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)'
                                                        }}
                                                        title="Remove summary"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Add New Summary */}
                                {!showSummaryForm ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowSummaryForm(true)}
                                        className="w-full py-3 rounded-xl text-sm text-white/50 transition-all hover:text-white/70"
                                        style={{
                                            background: 'rgba(139, 92, 246, 0.05)',
                                            border: '1px dashed rgba(139, 92, 246, 0.3)',
                                        }}
                                    >
                                        + Paste Google Form / Review Summary
                                    </button>
                                ) : (
                                    <div 
                                        className="p-4 rounded-xl"
                                        style={{
                                            background: 'rgba(139, 92, 246, 0.05)',
                                            border: '1px solid rgba(139, 92, 246, 0.2)',
                                        }}
                                    >
                                        {/* Source Type */}
                                        <div className="flex gap-2 mb-3 flex-wrap">
                                            {Object.entries(sourceTypeLabels).map(([key, val]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setNewSummary(prev => ({ ...prev, sourceType: key }))}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                                    style={newSummary.sourceType === key ? {
                                                        background: val.color,
                                                        border: '1px solid rgba(139, 92, 246, 0.5)',
                                                        color: 'white',
                                                    } : {
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        color: 'rgba(255, 255, 255, 0.5)',
                                                    }}
                                                >
                                                    {val.icon} {val.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Title */}
                                        <input
                                            type="text"
                                            value={newSummary.title}
                                            onChange={(e) => setNewSummary(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg transition-all duration-300 focus:outline-none placeholder-white/30 text-sm mb-3"
                                            style={glassInput}
                                            placeholder="Title (optional) — e.g. 'January Customer Survey'"
                                        />

                                        {/* Paste Area */}
                                        <textarea
                                            value={newSummary.rawText}
                                            onChange={(e) => setNewSummary(prev => ({ ...prev, rawText: e.target.value }))}
                                            placeholder={
                                                newSummary.sourceType === 'google_form'
                                                    ? "Paste your Google Form responses here...\n\nGo to Form → Responses → Summary → Select All (Ctrl+A) → Copy (Ctrl+C) → Paste here"
                                                    : newSummary.sourceType === 'google_review'
                                                    ? "Paste Google Reviews here...\n\nCopy all reviews including star ratings and text, then paste here"
                                                    : "Paste all your feedback/reviews text here...\n\nInclude star ratings if available for better accuracy"
                                            }
                                            className="w-full px-3 py-3 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none resize-none"
                                            style={{
                                                ...glassInput,
                                                minHeight: '120px',
                                            }}
                                            rows={5}
                                        />
                                        <p className="text-xs text-white/30 mt-1 mb-3">
                                            {newSummary.rawText.length > 0 
                                                ? `${newSummary.rawText.length} characters pasted` 
                                                : 'Paste feedback text with star ratings for maximum accuracy'}
                                        </p>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={saveExternalSummary}
                                                disabled={!newSummary.rawText.trim() || savingSummary}
                                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                                style={{
                                                    background: (!newSummary.rawText.trim() || savingSummary)
                                                        ? 'rgba(139, 92, 246, 0.15)'
                                                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                                    border: '1px solid rgba(139, 92, 246, 0.5)',
                                                    color: 'white',
                                                    opacity: (!newSummary.rawText.trim() || savingSummary) ? 0.5 : 1,
                                                }}
                                            >
                                                {savingSummary ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></span>
                                                        Saving...
                                                    </span>
                                                ) : '💾 Save for Analysis'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowSummaryForm(false)
                                                    setNewSummary({ sourceType: 'google_form', title: '', rawText: '' })
                                                }}
                                                className="px-3 py-2 rounded-lg text-sm text-white/50 transition-all"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {summarySuccess && (
                                    <p className="text-xs text-green-400 mt-2">{summarySuccess}</p>
                                )}

                                {externalSummaries.length > 0 && (
                                    <p className="text-xs text-white/30 mt-3 text-center">
                                        💡 Go to <a href="/dashboard" className="text-purple-400 underline">Dashboard</a> → "Saved Analyses" to analyze these summaries with AI
                                    </p>
                                )}
                            </div>

                            {/* Logo URL */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Logo URL (optional)
                                </label>
                                <input
                                    type="url"
                                    name="logoUrl"
                                    value={formData.logoUrl}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none placeholder-white/40"
                                    style={{
                                        ...glassInput,
                                    }}
                                    placeholder="https://example.com/logo.png"
                                    disabled={saving}
                                />
                                <p className="text-xs text-white/40 mt-1">
                                    Direct link to your business logo image
                                </p>
                            </div>

                            {/* Logo Preview */}
                            {formData.logoUrl && (
                                <div 
                                    className="mb-6 p-4 rounded-xl"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    <p className="text-sm text-white/50 mb-2">Logo Preview:</p>
                                    <img
                                        src={formData.logoUrl}
                                        alt="Logo preview"
                                        className="w-20 h-20 rounded-full object-cover"
                                        style={{
                                            border: '2px solid rgba(102, 126, 234, 0.5)',
                                        }}
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                </div>
                            )}

                            {error && (
                                <div 
                                    className="mb-4 p-3 rounded-xl text-sm"
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#f87171',
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div 
                                    className="mb-4 p-3 rounded-xl text-sm"
                                    style={{
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        color: '#4ade80',
                                    }}
                                >
                                    ✓ Settings saved successfully!
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                    border: '1px solid rgba(102, 126, 234, 0.5)',
                                    color: 'white',
                                    boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
                                    opacity: saving ? 0.5 : 1,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {saving ? (
                                    <span className="flex items-center justify-center">
                                        <span 
                                            className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent mr-2"
                                            style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                                        ></span>
                                        Saving...
                                    </span>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </form>

                        {/* Account Info */}
                        <div 
                            className="mt-8 pt-6"
                            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                        >
                            <h3 
                                className="font-semibold mb-4"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Account Information
                            </h3>
                            <div className="space-y-2 text-sm">
                                {user?.ownerName && (
                                    <p className="flex justify-between">
                                        <span className="text-white/50">Owner Name:</span>
                                        <span className="text-white/90">{user.ownerName}</span>
                                    </p>
                                )}
                                <p className="flex justify-between">
                                    <span className="text-white/50">Email:</span>
                                    <span className="text-white/90">{user?.email}</span>
                                </p>
                                <p className="flex justify-between">
                                    <span className="text-white/50">Business ID:</span>
                                    <code 
                                        className="px-2 py-0.5 rounded"
                                        style={{
                                            background: 'rgba(102, 126, 234, 0.2)',
                                            color: '#a5b4fc',
                                        }}
                                    >
                                        {user?.businessId}
                                    </code>
                                </p>
                            </div>
                        </div>

                        {/* Change Password Section */}
                        <div 
                            className="mt-8 pt-6"
                            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                        >
                            <h3 
                                className="font-semibold mb-4"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                🔒 Change Password
                            </h3>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                {/* Current Password */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.current ? 'text' : 'password'}
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                            className="w-full px-4 py-3 pr-12 rounded-xl transition-all duration-300 focus:outline-none placeholder-white/40"
                                            style={glassInput}
                                            placeholder="Enter current password"
                                            required
                                            disabled={changingPassword}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                                                e.target.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.2)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors text-sm"
                                        >
                                            {showPasswords.current ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.new ? 'text' : 'password'}
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                            className="w-full px-4 py-3 pr-12 rounded-xl transition-all duration-300 focus:outline-none placeholder-white/40"
                                            style={glassInput}
                                            placeholder="Enter new password (min 6 chars)"
                                            required
                                            minLength={6}
                                            disabled={changingPassword}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                                                e.target.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.2)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors text-sm"
                                        >
                                            {showPasswords.new ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    {passwordData.newPassword && passwordData.newPassword.length < 6 && (
                                        <p className="text-xs text-amber-400/80 mt-1">Password must be at least 6 characters</p>
                                    )}
                                </div>

                                {/* Confirm New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.confirm ? 'text' : 'password'}
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            className="w-full px-4 py-3 pr-12 rounded-xl transition-all duration-300 focus:outline-none placeholder-white/40"
                                            style={glassInput}
                                            placeholder="Re-enter new password"
                                            required
                                            disabled={changingPassword}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                                                e.target.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.2)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors text-sm"
                                        >
                                            {showPasswords.confirm ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                        <p className="text-xs text-red-400/80 mt-1">Passwords do not match</p>
                                    )}
                                </div>

                                {passwordError && (
                                    <div 
                                        className="p-3 rounded-xl text-sm"
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#f87171',
                                        }}
                                    >
                                        {passwordError}
                                    </div>
                                )}

                                {passwordSuccess && (
                                    <div 
                                        className="p-3 rounded-xl text-sm"
                                        style={{
                                            background: 'rgba(34, 197, 94, 0.15)',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            color: '#4ade80',
                                        }}
                                    >
                                        {passwordSuccess}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                                    className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                        border: '1px solid rgba(139, 92, 246, 0.5)',
                                        color: 'white',
                                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
                                        opacity: (changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) ? 0.5 : 1,
                                        cursor: (changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {changingPassword ? (
                                        <span className="flex items-center justify-center">
                                            <span 
                                                className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent mr-2"
                                                style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                                            ></span>
                                            Changing...
                                        </span>
                                    ) : (
                                        '🔐 Change Password'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}
