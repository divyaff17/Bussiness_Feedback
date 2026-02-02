import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

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
        businessName: '',
        category: '',
        googleReviewUrl: '',
        logoUrl: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { signup } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
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
            await signup({
                businessName: formData.businessName,
                category: formData.category,
                googleReviewUrl: formData.googleReviewUrl,
                logoUrl: formData.logoUrl || null,
                email: formData.email,
                password: formData.password
            })
            navigate('/dashboard')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            <div className="card w-full max-w-md animate-fadeIn">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Create Account</h1>
                    <p className="text-gray-600">Set up your feedback system in minutes</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Business Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Name *
                        </label>
                        <input
                            type="text"
                            name="businessName"
                            value={formData.businessName}
                            onChange={handleChange}
                            className="input"
                            placeholder="Your Business Name"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Category */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Category *
                        </label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="input"
                            required
                            disabled={loading}
                        >
                            <option value="">Select a category</option>
                            {BUSINESS_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Google Review URL */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Google Review URL *
                        </label>
                        <input
                            type="url"
                            name="googleReviewUrl"
                            value={formData.googleReviewUrl}
                            onChange={handleChange}
                            className="input"
                            placeholder="https://g.page/r/..."
                            required
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Get this from your Google Business Profile
                        </p>
                    </div>

                    {/* Logo URL (Optional) */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo URL (optional)
                        </label>
                        <input
                            type="url"
                            name="logoUrl"
                            value={formData.logoUrl}
                            onChange={handleChange}
                            className="input"
                            placeholder="https://example.com/your-logo.png"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Link to your business logo image (shows on feedback page)
                        </p>
                    </div>

                    <hr className="my-6 border-gray-200" />

                    {/* Email */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="input"
                            placeholder="you@business.com"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password *
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="input"
                            placeholder="At least 6 characters"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="input"
                            placeholder="Repeat your password"
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></span>
                                Creating account...
                            </span>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <p className="text-center text-gray-600 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
