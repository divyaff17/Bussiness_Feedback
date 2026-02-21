import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Threads from '../components/Threads'
import API_URL from '../config/api'

// Inject glass animations
const GLASS_KEYFRAMES_ID = 'glass-auth-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(GLASS_KEYFRAMES_ID)) {
    const style = document.createElement('style');
    style.id = GLASS_KEYFRAMES_ID;
    style.textContent = `
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(30px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glassShine {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes borderGlow {
            0%, 100% { border-color: rgba(255, 255, 255, 0.1); }
            50% { border-color: rgba(255, 255, 255, 0.25); }
        }
        @keyframes pulseRing {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.3); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

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

export default function Signup() {
    const [formData, setFormData] = useState({
        ownerName: '',
        businessName: '',
        category: '',
        customCategory: '',
        logoUrl: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    
    // Review platforms state (multiple platforms)
    const [reviewPlatforms, setReviewPlatforms] = useState([
        { url: '', valid: null, validating: false, message: '', platform: '', label: '' }
    ])
    
    const [profileImage, setProfileImage] = useState(null)
    const [profileImagePreview, setProfileImagePreview] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const fileInputRef = useRef(null)
    
    // Google OAuth states
    const [googleData, setGoogleData] = useState(null)
    const [googleLoading, setGoogleLoading] = useState(false)
    
    // OTP verification states
    const [showOtpStep, setShowOtpStep] = useState(false)
    const [otp, setOtp] = useState('')
    const [otpVerified, setOtpVerified] = useState(false)
    const [sendingOtp, setSendingOtp] = useState(false)
    const [verifyingOtp, setVerifyingOtp] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otpCountdown, setOtpCountdown] = useState(0)

    const { signup, getApiUrl, updateUser, magicLinkAuth, sendMagicLink } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // Handle data passed from auth callback (magic link)
    useEffect(() => {
        if (location.state?.googleData) {
            const gData = location.state.googleData
            setGoogleData(gData)
            setFormData(prev => ({
                ...prev,
                ownerName: gData.name || '',
                email: gData.email || '',
            }))
            // Set profile picture if available
            if (gData.picture) {
                setProfileImagePreview(gData.picture)
            }
            // Email is verified via magic link
            setOtpVerified(true)
        }
    }, [location.state])

    const [magicEmail, setMagicEmail] = useState('')
    const [magicSuccess, setMagicSuccess] = useState('')

    const handleMagicLinkSignUp = async () => {
        const emailToSend = magicEmail || formData.email
        if (!emailToSend) {
            setError('Please enter your email address')
            return
        }
        setGoogleLoading(true)
        setError('')
        setMagicSuccess('')

        try {
            await sendMagicLink(emailToSend)
            setMagicSuccess('Magic link sent! Check your email inbox and click the link to continue sign up.')
        } catch (err) {
            setError(err.message)
        } finally {
            setGoogleLoading(false)
        }
    }
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        // Reset OTP verification if email changes
        if (e.target.name === 'email') {
            setOtpVerified(false)
            setShowOtpStep(false)
            setOtp('')
            setOtpSent(false)
        }
    }

    // Handle platform URL change
    const handlePlatformChange = (index, value) => {
        const updated = [...reviewPlatforms]
        updated[index] = { ...updated[index], url: value, valid: null, message: '', platform: '', label: '' }
        setReviewPlatforms(updated)
    }

    // Add new platform
    const addPlatform = () => {
        if (reviewPlatforms.length < 5) {
            setReviewPlatforms([...reviewPlatforms, { url: '', valid: null, validating: false, message: '', platform: '', label: '' }])
        }
    }

    // Remove platform
    const removePlatform = (index) => {
        if (reviewPlatforms.length > 1) {
            setReviewPlatforms(reviewPlatforms.filter((_, i) => i !== index))
        }
    }

    // Validate Review URL (any platform)
    const validateReviewUrl = async (index) => {
        const platform = reviewPlatforms[index]
        if (!platform.url) {
            setError('Please enter a URL')
            return
        }

        const updated = [...reviewPlatforms]
        updated[index] = { ...updated[index], validating: true, message: '' }
        setReviewPlatforms(updated)
        setError('')

        try {
            const response = await fetch(`${API_URL}/api/business/validate-review-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: platform.url })
            })

            const data = await response.json()

            updated[index] = { 
                ...updated[index], 
                validating: false,
                valid: data.valid,
                message: data.message || data.error || '',
                platform: data.platform || 'custom',
                label: data.label || 'Custom'
            }
            setReviewPlatforms([...updated])
            
            if (!data.valid) {
                setError(data.error || 'Invalid URL')
            }
        } catch (err) {
            updated[index] = { ...updated[index], validating: false, valid: false, message: 'Failed to validate URL' }
            setReviewPlatforms([...updated])
            setError('Failed to validate URL')
        }
    }

    // Get platform icon
    const getPlatformIcon = (platform) => {
        const icons = {
            google: 'Google',
            google_forms: 'Form',
            yelp: 'Review',
            tripadvisor: 'Trip',
            facebook: 'FB',
            trustpilot: 'Review',
            zomato: 'Zomato',
            swiggy: 'Swiggy',
            surveymonkey: 'Survey',
            typeform: 'Form',
            jotform: 'Form',
            amazon: 'Amazon',
            booking: 'Booking',
            airbnb: 'Airbnb',
            custom: 'Link'
        }
        return icons[platform] || 'Link'
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

    // Send OTP to email
    const handleSendOtp = async () => {
        if (!formData.email) {
            setError('Please enter your email address')
            return
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address')
            return
        }

        setSendingOtp(true)
        setError('')

        try {
            const response = await fetch(`${API_URL}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: formData.email,
                    businessName: formData.businessName 
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP')
            }

            setOtpSent(true)
            setShowOtpStep(true)
            setOtpCountdown(60) // 60 second countdown for resend

            // Start countdown
            const interval = setInterval(() => {
                setOtpCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (err) {
            setError(err.message)
        } finally {
            setSendingOtp(false)
        }
    }

    // Verify OTP
    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            setError('Please enter the 6-digit code')
            return
        }

        setVerifyingOtp(true)
        setError('')

        try {
            const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, otp })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Invalid verification code')
            }

            setOtpVerified(true)
            setShowOtpStep(false)
        } catch (err) {
            setError(err.message)
        } finally {
            setVerifyingOtp(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Check if email is verified (skip for Google users - already verified)
        if (!otpVerified && !googleData) {
            setError('Please verify your email address first')
            return
        }

        // Password validation only for non-Google signups
        if (!googleData) {
            // Validation
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match')
                return
            }

            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters')
                return
            }
        }

        // Validate custom category if Other is selected
        if (formData.category === 'Other' && !formData.customCategory.trim()) {
            setError('Please specify your business type')
            return
        }

        setLoading(true)

        try {
            // Create signup data - use customCategory if Other is selected
            const finalCategory = formData.category === 'Other' 
                ? formData.customCategory.trim() 
                : formData.category

            const signupData = {
                businessName: formData.businessName,
                category: finalCategory,
                googleReviewUrl: '',
                logoUrl: formData.logoUrl || null,
                email: formData.email,
                password: googleData ? null : formData.password,
                ownerName: formData.ownerName || null,
                profilePictureUrl: googleData?.picture || null,
                reviewPlatforms: [],
                googleId: googleData?.googleId || googleData?.sub || null
            }

            // Sign up the user first
            await signup(signupData)

            // Upload profile picture if selected
            if (profileImage) {
                setUploadingImage(true)
                try {
                    const token = sessionStorage.getItem('token')
                    const API_URL = getApiUrl()

                    const uploadResponse = await fetch(`${API_URL}/api/upload/avatar`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            imageData: profileImage
                        })
                    })

                    if (uploadResponse.ok) {
                        const uploadData = await uploadResponse.json()
                        // Update the user context with the new profile picture URL
                        updateUser({ profilePictureUrl: uploadData.url })
                    } else {
                        console.error('Failed to upload profile picture')
                    }
                } catch (uploadError) {
                    console.error('Upload error:', uploadError)
                } finally {
                    setUploadingImage(false)
                }
            }

            navigate('/welcome')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden bg-black">
            {/* Animated Threads Background */}
            <div className="absolute inset-0 z-0">
                <Threads
                    amplitude={1}
                    distance={0}
                    enableMouseInteraction
                    color={[0.4, 0.3, 0.9]}
                />
            </div>

            {/* Glass Card Container */}
            <div 
                className="w-full max-w-md relative z-10"
                style={{
                    animation: 'fadeInUp 0.8s ease-out',
                }}
            >
                {/* Glow Effect Behind Card */}
                <div 
                    className="absolute inset-0 -z-10 blur-3xl opacity-50"
                    style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.2) 50%, transparent 70%)',
                        transform: 'scale(1.2)',
                    }}
                />

                {/* Glass Card */}
                <div 
                    className="relative overflow-hidden rounded-3xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        animation: 'borderGlow 4s ease-in-out infinite',
                    }}
                >
                    {/* Shine Effect */}
                    <div 
                        className="absolute inset-0 pointer-events-none opacity-30"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                            animation: 'glassShine 8s ease-in-out infinite',
                        }}
                    />

                    {/* Header */}
                    <div className="text-center mb-6 relative">
                        <div 
                            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{
                                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 6px rgba(165, 180, 252, 0.5))' }}>⚓</span>
                        </div>
                        <h1 
                            className="text-3xl font-bold mb-2"
                            style={{
                                background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            Join ReviewDock
                        </h1>
                        <p className="text-white/60">Set up your review system in minutes</p>
                    </div>

                    {/* Magic Link Sign-Up Option - only show if not already using magic link */}
                    {!googleData && (
                        <>
                            <div className="relative mb-4">
                                <input
                                    type="email"
                                    value={magicEmail}
                                    onChange={(e) => setMagicEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(10px)',
                                    }}
                                    placeholder="Enter email for magic link"
                                    disabled={googleLoading}
                                />
                            </div>
                            <div className="relative mb-2">
                                <button
                                    type="button"
                                    onClick={handleMagicLinkSignUp}
                                    disabled={googleLoading}
                                    className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        backdropFilter: 'blur(10px)',
                                        opacity: googleLoading ? 0.7 : 1,
                                    }}
                                >
                                    {googleLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                                            Sending...
                                        </span>
                                    ) : (
                                        <>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                            </svg>
                                            Sign up with Magic Link
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-white/40 text-center mt-2">We'll email you a sign-in link — no password needed</p>
                            </div>

                            {magicSuccess && (
                                <div 
                                    className="mb-4 p-3 rounded-xl text-sm text-center"
                                    style={{
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        color: '#86efac',
                                    }}
                                >
                                    {magicSuccess}
                                </div>
                            )}

                            {/* Divider */}
                            <div className="flex items-center mb-6 mt-4">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="px-4 text-sm text-white/40">or fill out the form</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>
                        </>
                    )}

                    <form onSubmit={handleSubmit} className="relative">
                        {/* Profile Picture Upload */}
                        <div className="mb-6 flex flex-col items-center">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 overflow-hidden relative"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '2px dashed rgba(255, 255, 255, 0.2)',
                                }}
                            >
                                {profileImagePreview ? (
                                    <img
                                        src={profileImagePreview}
                                        alt="Profile preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center">
                                        <span className="text-3xl">📷</span>
                                        <p className="text-xs text-white/50 mt-1">Add Photo</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                disabled={loading}
                            />
                            <p className="text-xs text-white/40 mt-2">Click to upload profile picture</p>
                        </div>

                        {/* Owner Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Your Name
                            </label>
                            <input
                                type="text"
                                name="ownerName"
                                value={formData.ownerName}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                                placeholder="John Doe"
                                disabled={loading}
                            />
                        </div>

                        {/* Business Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Business Name *
                            </label>
                            <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                                placeholder="Your Business Name"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Category */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Business Category *
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl text-white transition-all duration-300 focus:outline-none appearance-none cursor-pointer"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                                required
                                disabled={loading}
                            >
                                <option value="" className="bg-gray-900 text-white">Select a category</option>
                                {BUSINESS_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat} className="bg-gray-900 text-white">{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Custom Category - shown when Other is selected */}
                        {formData.category === 'Other' && (
                            <div className="mb-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Specify Your Business Type *
                                </label>
                                <input
                                    type="text"
                                    name="customCategory"
                                    value={formData.customCategory}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                    placeholder="e.g., Bakery, Pet Shop, Laundry..."
                                    required
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {/* Logo URL (Optional) */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Logo URL (optional)
                            </label>
                            <input
                                type="url"
                                name="logoUrl"
                                value={formData.logoUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                                placeholder="https://example.com/your-logo.png"
                                disabled={loading}
                            />
                            <p className="text-xs text-white/40 mt-1">
                                Link to your business logo image (shows on feedback page)
                            </p>
                        </div>

                        <hr className="my-6 border-white/10" />

                        {/* Email with OTP Verification */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Email Address *
                                {otpVerified && (
                                    <span className="ml-2 text-green-400 text-xs">✓ Verified</span>
                                )}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="flex-1 px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: otpVerified 
                                            ? '1px solid rgba(34, 197, 94, 0.5)' 
                                            : '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                    placeholder="you@business.com"
                                    required
                                    disabled={loading || otpVerified}
                                />
                                {!otpVerified && (
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp || !formData.email || otpCountdown > 0}
                                        className="px-4 py-3 rounded-xl font-medium text-white text-sm transition-all duration-300 whitespace-nowrap"
                                        style={{
                                            background: sendingOtp || !formData.email || otpCountdown > 0
                                                ? 'rgba(255, 255, 255, 0.1)'
                                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            opacity: sendingOtp || !formData.email || otpCountdown > 0 ? 0.6 : 1,
                                        }}
                                    >
                                        {sendingOtp ? '...' : otpCountdown > 0 ? `${otpCountdown}s` : otpSent ? 'Resend' : 'Verify'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* OTP Input - shown after sending OTP */}
                        {showOtpStep && !otpVerified && (
                            <div className="mb-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Enter Verification Code
                                </label>
                                <p className="text-xs text-white/50 mb-2">
                                    We sent a 6-digit code to {formData.email}
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="flex-1 px-4 py-3 rounded-xl text-white text-center text-xl tracking-[0.5em] placeholder-white/40 transition-all duration-300 focus:outline-none font-mono"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(102, 126, 234, 0.5)',
                                        }}
                                        placeholder="000000"
                                        maxLength={6}
                                        disabled={verifyingOtp}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVerifyOtp}
                                        disabled={verifyingOtp || otp.length !== 6}
                                        className="px-6 py-3 rounded-xl font-medium text-white transition-all duration-300"
                                        style={{
                                            background: verifyingOtp || otp.length !== 6
                                                ? 'rgba(255, 255, 255, 0.1)'
                                                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            opacity: verifyingOtp || otp.length !== 6 ? 0.6 : 1,
                                        }}
                                    >
                                        {verifyingOtp ? (
                                            <span className="animate-spin">⏳</span>
                                        ) : (
                                            '✓'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Password - only for non-Google signups */}
                        {!googleData && (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                        }}
                                        placeholder="At least 6 characters"
                                        required={!googleData}
                                        disabled={loading}
                                    />
                                </div>

                                {/* Confirm Password */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Confirm Password *
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                        }}
                                        placeholder="Repeat your password"
                                        required={!googleData}
                                        disabled={loading}
                                    />
                                </div>
                            </>
                        )}

                        {/* Google signup notice */}
                        {googleData && (
                            <div 
                                className="mb-6 p-3 rounded-xl text-sm text-center"
                                style={{
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    color: '#86efac',
                                }}
                            >
                                <span className="mr-2">✓</span>
                                Signing up with Google ({formData.email})
                            </div>
                        )}

                        {error && (
                            <div 
                                className="mb-4 p-3 rounded-xl text-sm text-center"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#fca5a5',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                boxShadow: '0 10px 30px -10px rgba(102, 126, 234, 0.5)',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {/* Button Shine */}
                            <span 
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                    animation: 'glassShine 2s ease-in-out infinite',
                                }}
                            />
                            <span className="relative z-10">
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></span>
                                        {uploadingImage ? 'Uploading photo...' : 'Creating account...'}
                                    </span>
                                ) : (
                                    'Create Account'
                                )}
                            </span>
                        </button>
                    </form>

                    <p className="text-center text-white/50 mt-6">
                        Already have an account?{' '}
                        <Link 
                            to="/login" 
                            className="font-medium transition-colors"
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
