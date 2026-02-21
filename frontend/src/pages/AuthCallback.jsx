import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AuthCallback() {
    const [status, setStatus] = useState('Processing sign-in...')
    const navigate = useNavigate()
    const { magicLinkAuth } = useAuth()

    useEffect(() => {
        handleCallback()
    }, [])

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
                const user = data.session.user
                const userData = {
                    email: user.email,
                    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
                    picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                    googleId: user.user_metadata?.sub || user.id,
                }

                setStatus('Signing you in...')

                try {
                    const result = await magicLinkAuth(userData)

                    if (result.needsSignup) {
                        // New user - redirect to signup with data prefilled
                        navigate('/signup', { state: { googleData: userData } })
                    } else {
                        // Existing user - go directly to dashboard
                        navigate('/dashboard')
                    }
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
