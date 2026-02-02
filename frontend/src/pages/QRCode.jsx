import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'

export default function QRCode() {
    const { user, getToken } = useAuth()
    const [qrData, setQrData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        fetchQRCode()
    }, [])

    const fetchQRCode = async () => {
        try {
            const token = getToken()
            const response = await fetch(`/api/business/${user.businessId}/qr`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            setQrData(data)
        } catch (error) {
            console.error('Failed to fetch QR code:', error)
        } finally {
            setLoading(false)
        }
    }

    const copyLink = () => {
        if (qrData?.feedbackUrl) {
            navigator.clipboard.writeText(qrData.feedbackUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const downloadQR = () => {
        if (qrData?.qrCode) {
            const link = document.createElement('a')
            link.download = `${qrData.businessName.replace(/\s+/g, '-')}-feedback-qr.png`
            link.href = qrData.qrCode
            link.click()
        }
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto animate-fadeIn">
                <div className="text-center mb-8 no-print">
                    <h1 className="text-2xl font-bold text-gray-800">Your QR Code</h1>
                    <p className="text-gray-500">Print this and place it where customers can scan</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : qrData ? (
                    <div className="card text-center">
                        {/* QR Code Image - Printable Area */}
                        <div id="print-area" className="bg-white p-6 rounded-2xl inline-block mb-6 shadow-soft print-only-content">
                            <img
                                src={qrData.qrCode}
                                alt="Feedback QR Code"
                                className="w-64 h-64 mx-auto"
                            />
                            <p className="mt-4 text-lg font-semibold text-gray-800">
                                {qrData.businessName}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Scan to give feedback</p>
                        </div>

                        {/* Feedback URL */}
                        <div className="mb-6 space-y-4">
                            {/* Main URL */}
                            <div>
                                <p className="text-sm text-gray-500 mb-2">🔗 Feedback Link:</p>
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    <code className="bg-green-50 border border-green-200 px-4 py-2 rounded-lg text-sm text-green-700 break-all">
                                        {qrData.feedbackUrl}
                                    </code>
                                    <button
                                        onClick={copyLink}
                                        className="px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {copied ? '✓ Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            {/* Show localhost alternative only in development */}
                            {qrData.feedbackUrl.includes('192.168') && (
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 mb-1">💻 For testing on this computer:</p>
                                    <code className="text-xs text-blue-600">
                                        {qrData.feedbackUrl.replace(/192\.168\.\d+\.\d+/, 'localhost')}
                                    </code>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-center">
                            <button
                                onClick={downloadQR}
                                className="btn-primary"
                            >
                                📥 Download QR Code
                            </button>
                        </div>

                        {/* Tips */}
                        <div className="mt-8 p-4 bg-blue-50 rounded-xl text-left">
                            <h3 className="font-semibold text-blue-800 mb-2">💡 Tips for best results</h3>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Print on a size that's easy to scan (at least 3x3 inches)</li>
                                <li>• Place near checkout counter or exit</li>
                                <li>• Add text like "Share your feedback" above the QR</li>
                                <li>• Consider laminating for durability</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="card text-center py-12 text-gray-500">
                        Failed to load QR code. Please try again.
                    </div>
                )}
            </div>
        </Layout>
    )
}
