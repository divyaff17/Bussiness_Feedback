import { useState } from 'react'
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
        @keyframes floatCard {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
        }
        @keyframes inputFocus {
            0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
            100% { box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3); }
        }
    `;
    document.head.appendChild(style);
}

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password)
            navigate('/welcome')
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
                            <span className="text-3xl">👋</span>
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
                            Welcome Back
                        </h1>
                        <p className="text-white/60">Sign in to manage your feedback</p>
                    </div>

                    <form onSubmit={handleSubmit} className="relative">
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(10px)',
                                }}
                                placeholder="you@business.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/40 transition-all duration-300 focus:outline-none"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(10px)',
                                }}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="mb-6 text-right">
                            <Link 
                                to="/forgot-password" 
                                className="text-sm text-white/60 hover:text-white/90 transition-colors"
                            >
                                Forgot password?
                            </Link>
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
                                        Signing in...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </span>
                        </button>
                    </form>

                    <p className="text-center text-white/50 mt-6">
                        Don't have an account?{' '}
                        <Link 
                            to="/signup" 
                            className="text-white/90 hover:text-white font-medium transition-colors"
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
