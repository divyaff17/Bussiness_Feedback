import { createContext, useState, useEffect, useCallback } from 'react'

const API_URL = '/api'

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
            const response = await fetch(`${API_URL}/auth/me`, {
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
        const response = await fetch(`${API_URL}/auth/login`, {
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
        const response = await fetch(`${API_URL}/auth/signup`, {
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

    const value = {
        user,
        loading,
        login,
        signup,
        logout,
        getToken
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
