import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Threads from '../components/Threads'
import Lanyard from '../components/Lanyard'

// Inject welcome page animations
const WELCOME_KEYFRAMES_ID = 'welcome-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(WELCOME_KEYFRAMES_ID)) {
    const style = document.createElement('style');
    style.id = WELCOME_KEYFRAMES_ID;
    style.textContent = `
        @keyframes slideDown {
            0% { opacity: 0; transform: translateY(-30px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes textGlow {
            0%, 100% { text-shadow: 0 0 30px rgba(125, 190, 255, 0.5), 0 0 60px rgba(125, 190, 255, 0.3); }
            50% { text-shadow: 0 0 40px rgba(167, 139, 250, 0.7), 0 0 80px rgba(167, 139, 250, 0.4); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.1); }
        }
        @keyframes colorShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1); }
        }
        @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
        }
    `;
    document.head.appendChild(style);
}

export default function Welcome() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [shouldRedirect, setShouldRedirect] = useState(false)

    useEffect(() => {
        if (!user) {
            setShouldRedirect(true)
        }
    }, [user])

    useEffect(() => {
        if (shouldRedirect) {
            navigate('/login')
        }
    }, [shouldRedirect, navigate])

    if (!user) return null

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Animated Threads Background */}
            <div className="absolute inset-0 z-0">
                <Threads
                    amplitude={1}
                    distance={0}
                    enableMouseInteraction
                    color={[0.4, 0.3, 0.9]}
                />
            </div>

            {/* Welcome Content */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                {/* 3D Lanyard Card */}
                <div className="w-full max-w-lg" style={{ height: '600px' }}>
                    <Lanyard 
                        name={user.ownerName || user.businessName || 'Welcome'}
                        title={user.businessName || 'Business Owner'}
                        handle={user.email?.split('@')[0] || 'user'}
                        status="Online"
                        avatarUrl={user.profilePictureUrl || ''}
                    />
                </div>

                {/* Quick Features Preview */}
                <div 
                    className="flex flex-wrap justify-center gap-3 mt-2"
                    style={{ animation: 'slideUp 1s ease-out 0.8s both' }}
                >
                    {[
                        { text: 'Analytics' },
                        { text: 'Reviews' },
                        { text: 'QR Codes' },
                    ].map((item, i) => (
                        <div 
                            key={i}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/70"
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <span>{item.text}</span>
                        </div>
                    ))}
                </div>

                {/* Dashboard Button - Professional */}
                <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="group mt-6 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3"
                    style={{
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 4px 24px rgba(102, 126, 234, 0.2)',
                        animation: 'slideUp 1s ease-out 1s both',
                    }}
                >
                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Go to Dashboard</span>
                    <svg className="w-4 h-4 text-white/60 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
