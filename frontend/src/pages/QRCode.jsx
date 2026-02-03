import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'

export default function QRCode() {
    const { user, getToken, logout } = useAuth()
    const navigate = useNavigate()
    const [qrData, setQrData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        // Wait for user to be loaded
        if (user?.businessId) {
            fetchQRCode()
        } else if (!user && !getToken()) {
            // No user and no token - redirect to signup
            navigate('/signup')
        }
    }, [user])

    const fetchQRCode = async () => {
        try {
            setLoading(true)
            setError(null)

            const token = getToken()
            if (!token) {
                navigate('/signup')
                return
            }

            const response = await fetch(`/api/business/${user.businessId}/qr`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.status === 403 || response.status === 404) {
                // Business doesn't exist in Supabase - session is invalid
                // Clear everything and redirect to signup
                sessionStorage.clear()
                localStorage.clear()
                alert('Your session has expired. Please sign up again.')
                window.location.href = '/signup'
                return
            }

            if (!response.ok) {
                setError('Failed to generate QR code')
                setLoading(false)
                return
            }

            const data = await response.json()
            setQrData(data)
        } catch (err) {
            console.error('QR fetch error:', err)
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const downloadQR = () => {
        if (!qrData?.qrCode) return

        const link = document.createElement('a')
        link.download = `${qrData.businessName || 'business'}-feedback-qr.png`
        link.href = qrData.qrCode
        link.click()
    }

    const copyLink = () => {
        if (!qrData?.feedbackUrl) return

        navigator.clipboard.writeText(qrData.feedbackUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleLogoutAndSignup = () => {
        logout()
        navigate('/signup')
    }

    // Loading state
    if (loading) {
        return (
            <Layout>
                <div className="max-w-2xl mx-auto animate-fadeIn">
                    <div className="card text-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                        <p className="mt-4 text-gray-600">Generating your QR code...</p>
                    </div>
                </div>
            </Layout>
        )
    }

    // Error state
    if (error) {
        return (
            <Layout>
                <div className="max-w-2xl mx-auto animate-fadeIn">
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <div className="space-x-4">
                            <button
                                onClick={fetchQRCode}
                                className="btn-secondary"
                            >
                                🔄 Try Again
                            </button>
                            <button
                                onClick={handleLogoutAndSignup}
                                className="btn-primary"
                            >
                                📝 Sign Up Again
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        )
    }

    // Success state - QR Code Display
    return (
        <Layout>
            <div className="max-w-2xl mx-auto animate-fadeIn">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Your QR Code</h1>
                    <p className="text-gray-500 mt-2">
                        Print this QR code and place it where customers can scan
                    </p>
                </div>

                {qrData ? (
                    <div className="card">
                        {/* Business Info */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">
                                {qrData.businessName}
                            </h2>
                        </div>

                        {/* QR Code Image */}
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl text-center mb-6">
                            <div className="bg-white p-6 rounded-xl inline-block shadow-lg">
                                <img
                                    src={qrData.qrCode}
                                    alt="Feedback QR Code"
                                    className="w-64 h-64 mx-auto"
                                />
                            </div>
                            <p className="mt-4 text-gray-600 font-medium">
                                📱 Scan to give feedback
                            </p>
                        </div>

                        {/* Feedback URL */}
                        <div className="bg-gray-50 p-4 rounded-xl mb-6">
                            <p className="text-sm text-gray-500 mb-2 text-center">🔗 Feedback Link</p>
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                <code className="px-3 py-2 bg-white rounded-lg text-sm font-mono text-blue-600 border break-all">
                                    {qrData.feedbackUrl}
                                </code>
                                <button
                                    onClick={copyLink}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${copied
                                            ? 'bg-green-500 text-white'
                                            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                        }`}
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                        </div>

                        {/* Download Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={downloadQR}
                                className="btn-primary text-lg px-8 py-4"
                            >
                                📥 Download QR Code
                            </button>
                        </div>

                        {/* Tips */}
                        <div className="mt-8 p-4 bg-green-50 rounded-xl">
                            <h3 className="font-semibold text-green-800 mb-3">💡 Tips for best results</h3>
                            <ul className="text-sm text-green-700 space-y-2">
                                <li>✓ Print on a size that's easy to scan (at least 3x3 inches)</li>
                                <li>✓ Place near checkout counter or exit</li>
                                <li>✓ Add text like "Share your feedback" above the QR</li>
                                <li>✓ Consider laminating for durability</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📱</div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">No QR Code Available</h2>
                        <p className="text-gray-600 mb-6">
                            Please sign up to create your business QR code.
                        </p>
                        <button
                            onClick={handleLogoutAndSignup}
                            className="btn-primary"
                        >
                            📝 Sign Up Now
                        </button>
                    </div>
                )}
            </div>
        </Layout>
    )
}
