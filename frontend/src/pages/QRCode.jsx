import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ElectricBorder from '../components/ElectricBorder'
import { useAuth } from '../hooks/useAuth'
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

            const response = await fetch(`${API_URL}/api/business/${user.businessId}/qr`, {
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
                    <ElectricBorder color="#8b5cf6" speed={0.8} chaos={0.1} borderRadius={24}>
                    <div className="p-6 text-center py-16" style={glassCard}>
                        <div 
                            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto"
                            style={{ borderColor: '#667eea', borderTopColor: 'transparent' }}
                        ></div>
                        <p className="mt-4 text-white/60">Generating your QR code...</p>
                    </div>
                    </ElectricBorder>
                </div>
            </Layout>
        )
    }

    // Error state
    if (error) {
        return (
            <Layout>
                <div className="max-w-2xl mx-auto animate-fadeIn">
                    <ElectricBorder color="#ef4444" speed={1} chaos={0.15} borderRadius={24}>
                    <div className="p-6 text-center py-12" style={glassCard}>
                        <div className="text-6xl mb-4">⚠️</div>
                        <h2 
                            className="text-xl font-bold mb-2"
                            style={{
                                background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            Something went wrong
                        </h2>
                        <p className="text-white/60 mb-6">{error}</p>
                        <div className="space-x-4">
                            <button
                                onClick={fetchQRCode}
                                className="px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                }}
                            >
                                🔄 Try Again
                            </button>
                            <button
                                onClick={handleLogoutAndSignup}
                                className="px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                    border: '1px solid rgba(102, 126, 234, 0.5)',
                                    color: '#a5b4fc',
                                }}
                            >
                                📝 Sign Up Again
                            </button>
                        </div>
                    </div>
                    </ElectricBorder>
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
                    <h1 
                        className="text-3xl font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        📱 Your QR Code
                    </h1>
                    <p className="text-white/60 mt-2">
                        Print this QR code and place it where customers can scan
                    </p>
                </div>

                {qrData ? (
                    <ElectricBorder color="#3b82f6" speed={1} chaos={0.12} borderRadius={24}>
                    <div className="p-6" style={glassCard}>
                        {/* Business Info */}
                        <div className="text-center mb-6">
                            <h2 
                                className="text-xl font-bold"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {qrData.businessName}
                            </h2>
                        </div>

                        {/* QR Code Image */}
                        <div 
                            className="p-8 rounded-2xl text-center mb-6"
                            style={{
                                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <div 
                                className="p-6 rounded-xl inline-block"
                                style={{
                                    background: 'white',
                                    boxShadow: '0 0 40px rgba(102, 126, 234, 0.4)',
                                }}
                            >
                                <img
                                    src={qrData.qrCode}
                                    alt="Feedback QR Code"
                                    className="w-64 h-64 mx-auto"
                                />
                            </div>
                            <p className="mt-4 text-white/70 font-medium">
                                📱 Scan to give feedback
                            </p>
                        </div>

                        {/* Feedback URL */}
                        <div 
                            className="p-4 rounded-xl mb-6"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <p className="text-sm text-white/50 mb-2 text-center">🔗 Feedback Link</p>
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                <code 
                                    className="px-3 py-2 rounded-lg text-sm font-mono break-all"
                                    style={{
                                        background: 'rgba(102, 126, 234, 0.2)',
                                        border: '1px solid rgba(102, 126, 234, 0.3)',
                                        color: '#a5b4fc',
                                    }}
                                >
                                    {qrData.feedbackUrl}
                                </code>
                                <button
                                    onClick={copyLink}
                                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                                    style={copied ? {
                                        background: 'rgba(34, 197, 94, 0.3)',
                                        border: '1px solid rgba(34, 197, 94, 0.5)',
                                        color: '#4ade80',
                                    } : {
                                        background: 'rgba(102, 126, 234, 0.2)',
                                        border: '1px solid rgba(102, 126, 234, 0.3)',
                                        color: '#a5b4fc',
                                    }}
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                        </div>

                        {/* Download Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={downloadQR}
                                className="text-lg px-8 py-4 rounded-xl font-semibold transition-all duration-300"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                    border: '1px solid rgba(102, 126, 234, 0.5)',
                                    color: 'white',
                                    boxShadow: '0 0 30px rgba(102, 126, 234, 0.3)',
                                }}
                            >
                                📥 Download QR Code
                            </button>
                        </div>
                    </div>
                    </ElectricBorder>
                ) : (
                    <ElectricBorder color="#06b6d4" speed={0.9} chaos={0.1} borderRadius={24}>
                    <div className="p-6 text-center py-12" style={glassCard}>
                        <div className="text-6xl mb-4">📱</div>
                        <h2 
                            className="text-xl font-bold mb-2"
                            style={{
                                background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            No QR Code Available
                        </h2>
                        <p className="text-white/60 mb-6">
                            Please sign up to create your business QR code.
                        </p>
                        <button
                            onClick={handleLogoutAndSignup}
                            className="px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                            style={{
                                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                border: '1px solid rgba(102, 126, 234, 0.5)',
                                color: '#a5b4fc',
                            }}
                        >
                            📝 Sign Up Now
                        </button>
                    </div>
                    </ElectricBorder>
                )}
            </div>
        </Layout>
    )
}
