import { createContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'

// Use environment variable for production, empty string for development (Vite proxy)
const API_URL = import.meta.env.VITE_API_URL || ''

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // On mount: Check for existing session
    useEffect(() => {
        // First, clear any old localStorage data from SQLite era
        localStorage.clear()

        // Check sessionStorage for current session token
        const token = sessionStorage.getItem('token')
        if (token) {
            fetchUserInfo(token)
        } else {
            setLoading(false)
        }
    }, [])

    const fetchUserInfo = async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const userData = await response.json()
                setUser(userData)
            } else {
                // Invalid session - clear and redirect
                console.log('Session invalid, clearing...')
                sessionStorage.clear()
                setUser(null)
            }
        } catch (error) {
            console.error('Auth error:', error)
            sessionStorage.clear()
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Login failed')
        }

        // Store token in sessionStorage (not localStorage)
        sessionStorage.setItem('token', data.token)
        setUser(data.user)
        return data
    }

    const signup = async (userData) => {
        const response = await fetch(`${API_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Signup failed')
        }

        // Store token in sessionStorage (not localStorage)
        sessionStorage.setItem('token', data.token)
        setUser(data.user)
        return data
    }

    const logout = useCallback(() => {
        sessionStorage.clear()
        localStorage.clear() // Also clear any old data
        setUser(null)
    }, [])

    const getToken = () => sessionStorage.getItem('token')

    const getApiUrl = () => API_URL

    const updateUser = (updates) => {
        setUser(prev => prev ? { ...prev, ...updates } : null)
    }

    // Magic link login - handle callback from Supabase
    const magicLinkAuth = async (userData) => {
        const body = {
            email: userData.email,
            name: userData.name,
            picture: userData.picture || null,
            googleId: userData.googleId || null,
        }

        const response = await fetch(`${API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Authentication failed')
        }

        // If user needs to complete signup, return the data for the signup form
        if (data.needsSignup) {
            return { needsSignup: true, googleData: { ...data, ...userData } }
        }

        // Store token and set user
        sessionStorage.setItem('token', data.token)
        setUser(data.user)
        return data
    }

    // Send magic link email via Supabase
    const sendMagicLink = async (email) => {
        if (!supabase) {
            throw new Error('Supabase not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
        }

        // Always use production URL for magic link so it works on all devices (phone, tablet, etc.)
        const productionUrl = 'https://bussiness-feedback-ap8e.vercel.app'
        const redirectUrl = productionUrl + '/auth/callback'

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: redirectUrl,
            }
        })

        if (error) {
            throw new Error(error.message || 'Failed to send magic link')
        }

        return { success: true }
    }

    const value = {
        user,
        loading,
        login,
        signup,
        magicLinkAuth,
        sendMagicLink,
        logout,
        getToken,
        getApiUrl,
        updateUser
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
