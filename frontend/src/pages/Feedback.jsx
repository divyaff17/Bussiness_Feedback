import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import StarRating from '../components/StarRating'
import API_URL from '../config/api'

export default function Feedback() {
    const { businessId } = useParams()
    const [business, setBusiness] = useState(null)
    const [loading, setLoading] = useState(true)
    const [rating, setRating] = useState(0)
    const [message, setMessage] = useState('')
    const [customerEmail, setCustomerEmail] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [errorType, setErrorType] = useState(null) // 'network' | 'not_found' | 'server'

    useEffect(() => {
        fetchBusiness()
    }, [businessId])

    const fetchBusiness = async () => {
        setLoading(true)
        setError(null)
        setErrorType(null)
        try {
            const response = await fetch(`${API_URL}/api/business/${businessId}`)
            if (response.status === 404) {
                setError('This business was not found.')
                setErrorType('not_found')
                return
            }
            if (!response.ok) {
                setError(`Server error (${response.status}). Please try again.`)
                setErrorType('server')
                return
            }
            const data = await response.json()
            setBusiness(data)
        } catch (err) {
            console.error('Feedback page fetch error:', err)
            setError('Could not connect to the server. Please check your internet connection and try again.')
            setErrorType('network')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (rating === 0) {
            setError('Please select a rating')
            return
        }

        // For 1-3 stars, require message
        if (rating <= 3 && !message.trim()) {
            setError('Please tell us what went wrong')
            return
        }

        setSubmitting(true)
        setError(null)

        try {
            const response = await fetch(`${API_URL}/api/feedback/${businessId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating,
                    message: message.trim(),
                    customerEmail: customerEmail.trim() || undefined
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit feedback')
            }

            setSubmitted(true)
            setResult(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    // Auto-redirect for positive feedback
    useEffect(() => {
        if (submitted && result?.isPositive && result?.googleReviewUrl) {
            const timer = setTimeout(() => {
                window.location.href = result.googleReviewUrl
            }, 5000) // Redirect after 5 seconds
            return () => clearTimeout(timer)
        }
    }, [submitted, result])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
        )
    }

    if (!business) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card text-center max-w-md animate-fadeIn">
                    <div className="text-5xl mb-4 text-yellow-400 font-bold">{errorType === 'network' ? '!' : errorType === 'server' ? '!' : '?'}</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        {errorType === 'network' ? 'Connection Error' : errorType === 'server' ? 'Server Error' : 'Page Not Found'}
                    </h1>
                    <p className="text-gray-600 mb-4">{error || 'This feedback page is not available.'}</p>
                    {errorType !== 'not_found' && (
                        <button
                            onClick={fetchBusiness}
                            className="btn-primary inline-block"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Show success screen after submission
    if (submitted && result) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card text-center max-w-md animate-fadeIn">
                    {result.isPositive ? (
                        <>
                            <div className="text-5xl mb-4 text-green-400 font-bold">✓</div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-4">
                                Thanks for your review!
                            </h1>
                            <p className="text-gray-600 mb-6">
                                Would you like to leave a Google review?
                            </p>
                            <a
                                href={result.googleReviewUrl}
                                className="btn-primary inline-block mb-4"
                            >
                                Leave Google Review
                            </a>
                            <p className="text-sm text-gray-400">
                                Redirecting automatically in a few seconds...
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="text-6xl mb-4">🙏</div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-4">
                                We're sorry about your experience
                            </h1>
                            <p className="text-gray-600">
                                Thank you for telling us what went wrong. Your feedback has been recorded
                                and we will work to improve.
                            </p>
                        </>
                    )}
                    <p className="text-center text-xs text-gray-400 mt-6">
                        Powered by <span className="font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">ReviewDock</span>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-md animate-fadeIn">
                {/* Business Logo & Name */}
                <div className="text-center mb-8">
                    {business.logoUrl ? (
                        <img
                            src={business.logoUrl}
                            alt={business.name}
                            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover shadow-soft"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-soft">
                            {business.name.charAt(0)}
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-800">{business.name}</h1>
                    <p className="text-gray-500 text-sm">{business.category}</p>
                </div>

                {/* Feedback Form */}
                <form onSubmit={handleSubmit}>
                    <div className="mb-8">
                        <label className="block text-lg font-medium text-gray-700 text-center mb-4">
                            How was your experience?
                        </label>
                        <StarRating rating={rating} setRating={setRating} disabled={submitting} />
                    </div>

                    {/* Show message field - required for low ratings */}
                    {rating > 0 && (
                        <div className="mb-6 animate-fadeIn">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {rating <= 3 ? (
                                    <span className="text-red-600">We're sorry about your experience. Please tell us what went wrong. *</span>
                                ) : (
                                    'Any additional comments? (optional)'
                                )}
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={rating <= 3 ? 'Your feedback helps us improve...' : 'Share your thoughts...'}
                                className="input min-h-[100px] resize-none"
                                disabled={submitting}
                            />
                        </div>
                    )}

                    {/* Optional email field */}
                    {rating > 0 && (
                        <div className="mb-6 animate-fadeIn">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your email <span className="text-gray-400">(optional — to receive a response)</span>
                            </label>
                            <input
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="input"
                                disabled={submitting}
                            />
                            <p className="text-xs text-gray-400 mt-1">We'll only use this to respond to your feedback.</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={rating === 0 || submitting}
                        className={`w-full btn-primary ${(rating === 0 || submitting) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center">
                                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></span>
                                Submitting...
                            </span>
                        ) : (
                            'Submit Feedback'
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Powered by <span className="font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">ReviewDock</span>
                </p>
            </div>
        </div>
    )
}
