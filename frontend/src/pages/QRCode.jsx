import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import API_URL from '../config/api'
import QRCodeStyling from 'qr-code-styling'

// Glass card style helper
const glassCard = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    borderRadius: '1.5rem',
}

// ReviewDock "RD" logo as SVG data URI — bold stylized letters for QR center
const REVIEWDOCK_LOGO_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea"/><stop offset="50%" style="stop-color:#764ba2"/><stop offset="100%" style="stop-color:#a5b4fc"/></linearGradient></defs><rect width="200" height="200" rx="40" fill="url(#bg)"/><text x="100" y="135" font-family="Arial Black,Arial,sans-serif" font-size="110" font-weight="900" fill="white" text-anchor="middle" letter-spacing="-5" font-style="italic">RD</text></svg>`)}`

// Large watermark "RD" logo for premium style — semi-transparent, covers more area  
const REVIEWDOCK_LOGO_LARGE = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea"/><stop offset="50%" style="stop-color:#764ba2"/><stop offset="100%" style="stop-color:#a5b4fc"/></linearGradient></defs><rect width="200" height="200" rx="36" fill="url(#bg2)"/><text x="100" y="140" font-family="Arial Black,Arial,sans-serif" font-size="120" font-weight="900" fill="white" text-anchor="middle" letter-spacing="-5" font-style="italic">RD</text></svg>`)}`

// QR Code style presets
const QR_STYLES = [
    {
        id: 'classic',
        name: 'Classic',
        description: 'Clean & minimal square style',
        icon: null,
        getConfig: (url) => ({
            width: 300,
            height: 300,
            data: url,
            margin: 8,
            qrOptions: { errorCorrectionLevel: 'M' },
            dotsOptions: { type: 'square', color: '#000000' },
            cornersSquareOptions: { type: 'square', color: '#000000' },
            cornersDotOptions: { type: 'square', color: '#000000' },
            backgroundOptions: { color: '#ffffff' },
        }),
    },
    {
        id: 'dots',
        name: 'Rounded',
        description: 'Modern rounded dot pattern',
        icon: null,
        getConfig: (url) => ({
            width: 300,
            height: 300,
            data: url,
            margin: 8,
            qrOptions: { errorCorrectionLevel: 'M' },
            dotsOptions: { type: 'dots', color: '#1a1a2e' },
            cornersSquareOptions: { type: 'extra-rounded', color: '#667eea' },
            cornersDotOptions: { type: 'dot', color: '#764ba2' },
            backgroundOptions: { color: '#ffffff' },
        }),
    },
    {
        id: 'branded',
        name: 'Logo Center',
        description: 'Your brand logo in the center',
        icon: null,
        getConfig: (url) => ({
            width: 300,
            height: 300,
            data: url,
            margin: 8,
            qrOptions: { errorCorrectionLevel: 'H' },
            dotsOptions: { type: 'classy-rounded', color: '#16213e' },
            cornersSquareOptions: { type: 'extra-rounded', color: '#667eea' },
            cornersDotOptions: { type: 'dot', color: '#764ba2' },
            backgroundOptions: { color: '#ffffff' },
            image: REVIEWDOCK_LOGO_SVG,
            imageOptions: {
                crossOrigin: 'anonymous',
                margin: 4,
                imageSize: 0.4,
            },
        }),
    },
    {
        id: 'premium',
        name: 'Pro Gradient',
        description: 'Premium gradient branded style',
        icon: null,
        getConfig: (url) => ({
            width: 300,
            height: 300,
            data: url,
            margin: 8,
            qrOptions: { errorCorrectionLevel: 'H' },
            dotsOptions: {
                type: 'dots',
                gradient: {
                    type: 'linear',
                    rotation: Math.PI / 4,
                    colorStops: [
                        { offset: 0, color: '#667eea' },
                        { offset: 1, color: '#764ba2' },
                    ],
                },
            },
            cornersSquareOptions: {
                type: 'extra-rounded',
                gradient: {
                    type: 'linear',
                    rotation: 0,
                    colorStops: [
                        { offset: 0, color: '#667eea' },
                        { offset: 1, color: '#764ba2' },
                    ],
                },
            },
            cornersDotOptions: {
                type: 'dot',
                color: '#a5b4fc',
            },
            backgroundOptions: { color: '#ffffff' },
            image: REVIEWDOCK_LOGO_LARGE,
            imageOptions: {
                crossOrigin: 'anonymous',
                margin: 2,
                imageSize: 0.5,
            },
        }),
    },
]

export default function QRCode() {
    const { user, getToken, logout } = useAuth()
    const navigate = useNavigate()
    const [qrData, setQrData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)
    const [selectedStyle, setSelectedStyle] = useState('classic')
    const [downloading, setDownloading] = useState(false)

    // Refs for each QR code canvas
    const qrRefs = useRef({})
    const qrInstances = useRef({})

    useEffect(() => {
        if (user?.businessId) {
            fetchQRCode()
        } else if (!user && !getToken()) {
            navigate('/signup')
        }
    }, [user])

    // Generate all QR styles when feedbackUrl is available
    useEffect(() => {
        if (!qrData?.feedbackUrl) return

        // Small delay to ensure DOM refs are ready
        const timer = setTimeout(() => {
            QR_STYLES.forEach((style) => {
                const container = qrRefs.current[style.id]
                if (!container) return

                // Clear previous
                container.innerHTML = ''

                const config = style.getConfig(qrData.feedbackUrl)
                const qr = new QRCodeStyling(config)
                qrInstances.current[style.id] = qr
                qr.append(container)
            })
        }, 100)

        return () => clearTimeout(timer)
    }, [qrData?.feedbackUrl])

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

    const downloadQR = useCallback(async (styleId) => {
        const qr = qrInstances.current[styleId]
        if (!qr) return

        setDownloading(true)
        try {
            const styleName = QR_STYLES.find(s => s.id === styleId)?.name || styleId
            await qr.download({
                name: `${qrData.businessName || 'business'}-reviewdock-${styleId}`,
                extension: 'png',
            })
        } catch (err) {
            console.error('Download error:', err)
        } finally {
            setDownloading(false)
        }
    }, [qrData])

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
                <div className="max-w-4xl mx-auto animate-fadeIn">
                    <div className="p-6 text-center py-16" style={glassCard}>
                        <div 
                            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto"
                            style={{ borderColor: '#667eea', borderTopColor: 'transparent' }}
                        ></div>
                        <p className="mt-4 text-white/60">Generating your QR codes...</p>
                    </div>
                </div>
            </Layout>
        )
    }

    // Error state
    if (error) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto animate-fadeIn">
                    <div className="p-6 text-center py-12" style={glassCard}>
                        <div className="text-5xl mb-4 text-yellow-400 font-bold">!</div>
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
                                Try Again
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
                                Sign Up Again
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        )
    }

    // Success state - QR Code Display with Style Picker
    return (
        <Layout>
            <div className="max-w-4xl mx-auto animate-fadeIn">
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
                        ⚓ Your QR Codes
                    </h1>
                    <p className="text-white/60 mt-2">
                        Choose a design, download & print it for your customers
                    </p>
                </div>

                {qrData ? (
                    <>
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

                        {/* QR Style Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {QR_STYLES.map((style) => {
                                const isSelected = selectedStyle === style.id
                                return (
                                    <div
                                        key={style.id}
                                        onClick={() => setSelectedStyle(style.id)}
                                        className="cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                                        style={{
                                            ...glassCard,
                                            borderRadius: '1rem',
                                            border: isSelected
                                                ? '2px solid rgba(102, 126, 234, 0.7)'
                                                : '1px solid rgba(255, 255, 255, 0.1)',
                                            boxShadow: isSelected
                                                ? '0 0 30px rgba(102, 126, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                                                : glassCard.boxShadow,
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {/* Selected indicator */}
                                        {isSelected && (
                                            <div 
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                                                style={{
                                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                                    color: 'white',
                                                    fontSize: '10px',
                                                }}
                                            >
                                                ✓
                                            </div>
                                        )}

                                        {/* Style Label */}
                                        <div className="px-4 pt-4 pb-2 text-center">
                                            <h3 className="text-white font-semibold text-sm">{style.name}</h3>
                                            <p className="text-white/40 text-xs mt-0.5">{style.description}</p>
                                        </div>

                                        {/* QR Code Preview */}
                                        <div className="px-4 pb-4 flex justify-center">
                                            <div
                                                className="bg-white rounded-lg p-2 shadow-lg"
                                                style={{
                                                    boxShadow: isSelected 
                                                        ? '0 0 20px rgba(102, 126, 234, 0.3)' 
                                                        : '0 4px 12px rgba(0,0,0,0.2)',
                                                    width: 'fit-content',
                                                }}
                                            >
                                                <div 
                                                    ref={(el) => { qrRefs.current[style.id] = el }}
                                                    style={{ width: 140, height: 140 }}
                                                    className="flex items-center justify-center [&_canvas]:!w-full [&_canvas]:!h-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Download button for this style */}
                                        <div className="px-4 pb-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    downloadQR(style.id)
                                                }}
                                                disabled={downloading}
                                                className="w-full py-2 rounded-lg text-xs font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                                style={isSelected ? {
                                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5))',
                                                    border: '1px solid rgba(102, 126, 234, 0.6)',
                                                    color: 'white',
                                                } : {
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                }}
                                            >
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Bottom Section: Link + Selected Download */}
                        <div className="p-6" style={glassCard}>
                            {/* Feedback URL */}
                            <div 
                                className="p-4 rounded-xl mb-6"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                            >
                                <p className="text-sm text-white/50 mb-2 text-center">Feedback Link</p>
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
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            {/* Print All QR */}
                            <div className="flex justify-center">
                                <button
                                    onClick={() => {
                                        const printWindow = window.open('', '_blank')
                                        if (!printWindow) return
                                        const qrImages = QR_STYLES.map((style) => {
                                            const container = qrRefs.current[style.id]
                                            const canvas = container?.querySelector('canvas')
                                            if (canvas) {
                                                return `<div style="text-align:center;page-break-inside:avoid;margin-bottom:24px;">
                                                    <h2 style="margin:0 0 8px;font-size:18px;">${style.name}</h2>
                                                    <img src="${canvas.toDataURL('image/png')}" style="width:250px;height:250px;" />
                                                    <p style="margin:4px 0 0;font-size:12px;color:#666;">${style.description}</p>
                                                </div>`
                                            }
                                            return ''
                                        }).join('')
                                        printWindow.document.write(`<!DOCTYPE html><html><head><title>Print All QR Codes</title><style>body{font-family:Arial,sans-serif;display:flex;flex-wrap:wrap;justify-content:center;gap:32px;padding:24px;}@media print{body{gap:24px;}}</style></head><body>${qrImages}</body></html>`)
                                        printWindow.document.close()
                                        printWindow.focus()
                                        printWindow.print()
                                    }}
                                    className="text-lg px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
                                        border: '1px solid rgba(102, 126, 234, 0.5)',
                                        color: 'white',
                                        boxShadow: '0 0 30px rgba(102, 126, 234, 0.3)',
                                    }}
                                >
                                    🖨️ Print All QR
                                </button>
                            </div>

                            {/* Tip */}
                            <p className="text-center text-xs text-white/30 mt-4">
                                💡 Tip: "Logo Center" and "ReviewDock Pro" styles use higher error correction for reliability
                            </p>
                        </div>
                    </>
                ) : (
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
                            Sign Up Now
                        </button>
                    </div>
                )}
            </div>
        </Layout>
    )
}
