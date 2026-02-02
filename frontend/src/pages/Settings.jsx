import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'

export default function Settings() {
    const { user, getToken } = useAuth()
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        googleReviewUrl: '',
        logoUrl: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

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
        fetchBusinessInfo()
    }, [])

    const fetchBusinessInfo = async () => {
        try {
            const response = await fetch(`/api/business/${user.businessId}`)
            const data = await response.json()
            setFormData({
                name: data.name || '',
                category: data.category || '',
                googleReviewUrl: data.googleReviewUrl || '',
                logoUrl: data.logoUrl || ''
            })
        } catch (error) {
            console.error('Failed to fetch business info:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setSuccess(false)
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        setSuccess(false)

        try {
            const token = getToken()
            const response = await fetch(`/api/business/${user.businessId}`, {
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
                    <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
                    <p className="text-gray-500">Manage your business information</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="card">
                        <form onSubmit={handleSubmit}>
                            {/* Business Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Business Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Your Business Name"
                                    required
                                    disabled={saving}
                                />
                            </div>

                            {/* Category */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Business Category
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                    disabled={saving}
                                >
                                    {BUSINESS_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Google Review URL */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Google Review URL
                                </label>
                                <input
                                    type="url"
                                    name="googleReviewUrl"
                                    value={formData.googleReviewUrl}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="https://g.page/r/..."
                                    required
                                    disabled={saving}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This is where happy customers will be redirected
                                </p>
                            </div>

                            {/* Logo URL */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Logo URL (optional)
                                </label>
                                <input
                                    type="url"
                                    name="logoUrl"
                                    value={formData.logoUrl}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="https://example.com/logo.png"
                                    disabled={saving}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Direct link to your business logo image
                                </p>
                            </div>

                            {/* Logo Preview */}
                            {formData.logoUrl && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-2">Logo Preview:</p>
                                    <img
                                        src={formData.logoUrl}
                                        alt="Logo preview"
                                        className="w-20 h-20 rounded-full object-cover"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                </div>
                            )}

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl text-sm">
                                    ✓ Settings saved successfully!
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className={`w-full btn-primary ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {saving ? (
                                    <span className="flex items-center justify-center">
                                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></span>
                                        Saving...
                                    </span>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </form>

                        {/* Account Info */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="font-semibold text-gray-800 mb-4">Account Information</h3>
                            <div className="space-y-2 text-sm">
                                <p className="flex justify-between">
                                    <span className="text-gray-500">Email:</span>
                                    <span className="text-gray-800">{user?.email}</span>
                                </p>
                                <p className="flex justify-between">
                                    <span className="text-gray-500">Business ID:</span>
                                    <code className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
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
