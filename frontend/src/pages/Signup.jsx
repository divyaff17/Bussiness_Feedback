import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Threads from '../components/Threads'

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
        googleReviewUrl: '',
        logoUrl: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [profileImage, setProfileImage] = useState(null)
    const [profileImagePreview, setProfileImagePreview] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const fileInputRef = useRef(null)

    const { signup, getApiUrl, updateUser } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        // Validate custom category if Other is selected
        if (formData.category === 'Other' && !formData.customCategory.trim()) {
            setError('Please specify your business type')
            return
        }

        // Validate Google Review URL - accept various formats
        const googleUrl = formData.googleReviewUrl.toLowerCase()
        const isValidGoogleUrl = googleUrl.includes('google.com') ||
            googleUrl.includes('g.page') ||
            googleUrl.includes('goo.gl') ||
            googleUrl.startsWith('https://')

        if (!isValidGoogleUrl) {
            setError('Please enter a valid URL (e.g., https://g.page/r/... or your Google Maps link)')
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
                googleReviewUrl: formData.googleReviewUrl,
                logoUrl: formData.logoUrl || null,
                email: formData.email,
                password: formData.password,
                ownerName: formData.ownerName || null,
                profilePictureUrl: null
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
                            <span className="text-3xl">✨</span>
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
                            Create Account
                        </h1>
                        <p className="text-white/60">Set up your feedback system in minutes</p>
                    </div>

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

                        {/* Google Review URL */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Google Review URL *
                            </label>
                            <input
                                type="url"
                                name="googleReviewUrl"
                                value={formData.googleReviewUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                                placeholder="https://g.page/r/..."
                                required
                                disabled={loading}
                            />
                            <p className="text-xs text-white/40 mt-1">
                                Get this from your Google Business Profile
                            </p>
                        </div>

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

                        {/* Email */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                                placeholder="you@business.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Password */}
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
                                required
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
                                required
                                disabled={loading}
                            />
                        </div>

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
