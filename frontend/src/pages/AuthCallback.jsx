import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AuthCallback() {
    const [status, setStatus] = useState('Processing sign-in...')
    const navigate = useNavigate()
    const { magicLinkAuth, user } = useAuth()

    useEffect(() => {
        handleCallback()
    }, [])

    // Watch for user state change and redirect when authenticated
    useEffect(() => {
        if (user) {
            setStatus('Welcome back! Redirecting to dashboard...')
            setTimeout(() => {
                window.location.href = '/dashboard'
            }, 500)
        }
    }, [user])

    const handleCallback = async () => {
        try {
            if (!supabase) {
                setStatus('Supabase not configured')
                setTimeout(() => navigate('/login'), 2000)
                return
            }

            // Supabase will automatically pick up the auth tokens from the URL hash
            const { data, error } = await supabase.auth.getSession()

            if (error) {
                console.error('Auth callback error:', error)
                setStatus('Authentication failed. Redirecting...')
                setTimeout(() => navigate('/login'), 2000)
                return
            }

            if (data.session) {
                const sessionUser = data.session.user
                const userData = {
                    email: sessionUser.email,
                    name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email.split('@')[0],
                    picture: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || null,
                    googleId: sessionUser.user_metadata?.sub || sessionUser.id,
                }

                setStatus('Signing you in...')

                try {
                    const result = await magicLinkAuth(userData)

                    if (result.needsSignup) {
                        // New user - redirect to signup with data prefilled
                        navigate('/signup', { state: { googleData: userData } })
                    }
                    // For existing users, the useEffect watching 'user' will handle redirect
                } catch (err) {
                    console.error('Backend auth error:', err)
                    setStatus('Failed to complete sign-in. Redirecting...')
                    setTimeout(() => navigate('/login'), 2000)
                }
            } else {
                setStatus('No session found. Redirecting...')
                setTimeout(() => navigate('/login'), 2000)
            }
        } catch (err) {
            console.error('Callback error:', err)
            setStatus('Something went wrong. Redirecting...')
            setTimeout(() => navigate('/login'), 2000)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center">
                <div 
                    className="w-16 h-16 rounded-full animate-spin mx-auto mb-6"
                    style={{
                        border: '3px solid rgba(102, 126, 234, 0.2)',
                        borderTopColor: '#667eea',
                    }}
                />
                <p className="text-white/70 text-lg">{status}</p>
            </div>
        </div>
    )
}
