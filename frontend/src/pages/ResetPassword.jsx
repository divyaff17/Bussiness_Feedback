import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
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
    `;
    document.head.appendChild(style);
}

export default function ResetPassword() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [validating, setValidating] = useState(true)
    const [tokenValid, setTokenValid] = useState(false)

    // Verify token on mount
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setValidating(false)
                setError('No reset token provided')
                return
            }

            try {
                const response = await fetch(`${API_URL}/api/auth/verify-reset-token?token=${token}`)
                const data = await response.json()
                
                if (data.valid) {
                    setTokenValid(true)
                } else {
                    setError(data.error || 'Invalid or expired token')
                }
            } catch (err) {
                setError('Failed to verify token')
            } finally {
                setValidating(false)
            }
        }

        verifyToken()
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password')
            }

            setSuccess(true)
            // Redirect to login after 3 seconds
            setTimeout(() => navigate('/login'), 3000)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
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
                    className="relative overflow-hidden rounded-3xl p-8"
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
                    <div className="text-center mb-8 relative">
                        <div 
                            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{
                                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <span className="text-3xl">{success ? '✓' : '🔑'}</span>
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
                            {success ? 'Password Reset!' : 'Reset Password'}
                        </h1>
                        <p className="text-white/60">
                            {success ? 'Redirecting to login...' : 'Enter your new password'}
                        </p>
                    </div>

                    {validating ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                            <span className="ml-3 text-white/60">Verifying token...</span>
                        </div>
                    ) : success ? (
                        <div className="relative">
                            <div 
                                className="p-4 rounded-xl text-center mb-6"
                                style={{
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                }}
                            >
                                <p className="text-green-400">Your password has been reset successfully!</p>
                                <p className="text-white/60 text-sm mt-2">Redirecting to login in 3 seconds...</p>
                            </div>

                            <Link 
                                to="/login"
                                className="block w-full py-3.5 rounded-xl font-semibold text-white text-center transition-all duration-300"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    boxShadow: '0 10px 30px -10px rgba(102, 126, 234, 0.5)',
                                }}
                            >
                                Go to Login
                            </Link>
                        </div>
                    ) : !tokenValid ? (
                        <div className="relative">
                            <div 
                                className="p-4 rounded-xl text-center mb-6"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                }}
                            >
                                <p className="text-red-400">{error || 'Invalid reset link'}</p>
                                <p className="text-white/60 text-sm mt-2">Please request a new password reset.</p>
                            </div>

                            <Link 
                                to="/forgot-password"
                                className="block w-full py-3.5 rounded-xl font-semibold text-white text-center transition-all duration-300 mb-3"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    boxShadow: '0 10px 30px -10px rgba(102, 126, 234, 0.5)',
                                }}
                            >
                                Request New Reset Link
                            </Link>
                            <Link 
                                to="/login"
                                className="block w-full py-3.5 rounded-xl font-semibold text-white text-center transition-all duration-300"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                }}
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="relative">
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(10px)',
                                    }}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(10px)',
                                    }}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
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
                                            Resetting...
                                        </span>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </span>
                            </button>
                        </form>
                    )}

                    {!success && tokenValid && (
                        <p className="text-center text-white/50 mt-6">
                            Remember your password?{' '}
                            <Link 
                                to="/login" 
                                className="text-white/90 hover:text-white font-medium transition-colors"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Sign in
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
