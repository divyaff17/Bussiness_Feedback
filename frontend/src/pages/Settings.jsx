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

// Platform icons
const platformIcons = {
    google: '🔍',
    yelp: '⭐',
    tripadvisor: '🦉',
    facebook: '📘',
    trustpilot: '⭐',
    googleforms: '📋',
    surveymonkey: '🐵',
    typeform: '📝',
    zomato: '🍽️',
    swiggy: '🍔',
    amazon: '📦',
    booking: '🏨',
    airbnb: '🏠',
    custom: '🔗'
}

export default function Settings() {
    const { user, getToken, updateUser } = useAuth()
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        logoUrl: ''
    })
    // Review platforms state
    const [reviewPlatforms, setReviewPlatforms] = useState([])
    const [newPlatform, setNewPlatform] = useState({ url: '', valid: null, validating: false, message: '', platform: '', label: '' })
    const [savingPlatforms, setSavingPlatforms] = useState(false)
    const [platformSuccess, setPlatformSuccess] = useState('')
    
    const [profileImage, setProfileImage] = useState(null)
    const [profileImagePreview, setProfileImagePreview] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

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
            fetchPlatforms()
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

    const fetchPlatforms = async () => {
        if (!user?.businessId) return
        try {
            const token = getToken()
            const response = await fetch(`${API_URL}/api/business/${user.businessId}/platforms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.platforms) {
                setReviewPlatforms(data.platforms)
            }
        } catch (error) {
            console.error('Failed to fetch platforms:', error)
        }
    }

    // Validate a review platform URL
    const validatePlatformUrl = async () => {
        if (!newPlatform.url.trim()) return
        
        setNewPlatform(prev => ({ ...prev, validating: true, valid: null, message: '' }))
        
        try {
            const token = getToken()
            const response = await fetch(`${API_URL}/api/business/validate-review-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url: newPlatform.url })
            })
            
            const data = await response.json()
            
            if (response.ok && data.valid) {
                // URL is valid — now automatically add it as a platform
                const addResponse = await fetch(`${API_URL}/api/business/${user.businessId}/platforms`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        url: newPlatform.url,
                        platformName: data.platform || 'custom',
                        platformLabel: data.label || 'Custom',
                        isPrimary: reviewPlatforms.length === 0
                    })
                })
                
                if (addResponse.ok) {
                    await fetchPlatforms()
                    setNewPlatform({ url: '', valid: null, validating: false, message: '', platform: '', label: '' })
                    setPlatformSuccess(`✓ ${data.label || 'Platform'} added successfully!`)
                    setTimeout(() => setPlatformSuccess(''), 3000)
                } else {
                    const addData = await addResponse.json()
                    setNewPlatform(prev => ({
                        ...prev,
                        valid: false,
                        message: addData.error || 'Failed to add platform',
                        validating: false
                    }))
                }
            } else {
                setNewPlatform(prev => ({
                    ...prev,
                    valid: false,
                    message: data.error || 'Invalid URL',
                    validating: false
                }))
            }
        } catch (err) {
            setNewPlatform(prev => ({
                ...prev,
                valid: false,
                message: 'Failed to add platform',
                validating: false
            }))
        }
    }

    // Add a new platform (kept for manual add if needed)
    const addPlatform = async () => {
        if (!newPlatform.url.trim()) return
        
        setSavingPlatforms(true)
        setPlatformSuccess('')
        
        try {
            const token = getToken()
            const response = await fetch(`${API_URL}/api/business/${user.businessId}/platforms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: newPlatform.url,
                    platformName: newPlatform.platform,
                    platformLabel: newPlatform.label,
                    isPrimary: reviewPlatforms.length === 0
                })
            })
            
            if (response.ok) {
                await fetchPlatforms()
                setNewPlatform({ url: '', valid: null, validating: false, message: '', platform: '', label: '' })
                setPlatformSuccess('Platform added successfully!')
                setTimeout(() => setPlatformSuccess(''), 3000)
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to add platform')
            }
        } catch (err) {
            setError('Failed to add platform')
        } finally {
            setSavingPlatforms(false)
        }
    }

    // Delete a platform
    const deletePlatform = async (platformId) => {
        if (!confirm('Remove this review platform?')) return
        
        try {
            const token = getToken()
            await fetch(`${API_URL}/api/business/${user.businessId}/platforms/${platformId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            await fetchPlatforms()
            setPlatformSuccess('Platform removed')
            setTimeout(() => setPlatformSuccess(''), 3000)
        } catch (err) {
            setError('Failed to remove platform')
        }
    }

    // Set a platform as primary
    const setPrimaryPlatform = async (platformId) => {
        try {
            const token = getToken()
            await fetch(`${API_URL}/api/business/${user.businessId}/platforms/${platformId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isPrimary: true })
            })
            await fetchPlatforms()
            setPlatformSuccess('Primary platform updated')
            setTimeout(() => setPlatformSuccess(''), 3000)
        } catch (err) {
            setError('Failed to update platform')
        }
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

                            {/* Review Platforms Section */}
                            <div 
                                className="mb-6 p-4 rounded-xl"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                            >
                                <h4 className="text-sm font-medium text-white/80 mb-3">
                                    🔗 Review Platforms
                                </h4>
                                <p className="text-xs text-white/40 mb-4">
                                    Add your review platform links. The primary platform is where happy customers will be redirected.
                                </p>

                                {/* Existing Platforms */}
                                {reviewPlatforms.length > 0 && (
                                    <div className="space-y-3 mb-4">
                                        {reviewPlatforms.map((platform) => (
                                            <div 
                                                key={platform.id}
                                                className="flex items-center gap-3 p-3 rounded-lg"
                                                style={{
                                                    background: platform.is_primary ? 'rgba(102, 126, 234, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                    border: platform.is_primary ? '1px solid rgba(102, 126, 234, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                }}
                                            >
                                                <span className="text-xl">
                                                    {platformIcons[platform.platform_name] || platformIcons.custom}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-white/90">
                                                            {platform.platform_label}
                                                        </span>
                                                        {platform.is_primary && (
                                                            <span 
                                                                className="text-xs px-2 py-0.5 rounded-full"
                                                                style={{
                                                                    background: 'rgba(102, 126, 234, 0.3)',
                                                                    color: '#a5b4fc'
                                                                }}
                                                            >
                                                                Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-white/40 truncate">
                                                        {platform.url}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!platform.is_primary && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPrimaryPlatform(platform.id)}
                                                            className="text-xs px-2 py-1 rounded-lg transition-all"
                                                            style={{
                                                                background: 'rgba(102, 126, 234, 0.2)',
                                                                color: '#a5b4fc',
                                                                border: '1px solid rgba(102, 126, 234, 0.3)'
                                                            }}
                                                            title="Set as primary"
                                                        >
                                                            ⭐
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => deletePlatform(platform.id)}
                                                        className="text-xs px-2 py-1 rounded-lg transition-all"
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#f87171',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)'
                                                        }}
                                                        title="Remove platform"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add New Platform */}
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="url"
                                            value={newPlatform.url}
                                            onChange={(e) => setNewPlatform({ ...newPlatform, url: e.target.value, valid: null, message: '' })}
                                            className="w-full px-3 py-2 rounded-lg transition-all duration-300 focus:outline-none placeholder-white/40 text-sm"
                                            style={glassInput}
                                            placeholder="Paste review link (Google, Yelp, TripAdvisor...)"
                                        />
                                        {newPlatform.message && (
                                            <p className={`text-xs mt-1 ${newPlatform.valid !== false ? 'text-green-400' : 'text-red-400'}`}>
                                                {newPlatform.message}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={validatePlatformUrl}
                                        disabled={!newPlatform.url.trim() || newPlatform.validating}
                                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                        style={{
                                            background: 'rgba(34, 197, 94, 0.2)',
                                            border: '1px solid rgba(34, 197, 94, 0.4)',
                                            color: '#4ade80',
                                            opacity: (!newPlatform.url.trim() || newPlatform.validating) ? 0.5 : 1
                                        }}
                                    >
                                        {newPlatform.validating ? '...' : '+ Add'}
                                    </button>
                                </div>

                                {platformSuccess && (
                                    <p className="text-xs text-green-400 mt-2">{platformSuccess}</p>
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
                    </div>
                )}
            </div>
        </Layout>
    )
}
