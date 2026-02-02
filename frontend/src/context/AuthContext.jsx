import { createContext, useState, useEffect, useCallback } from 'react'

const API_URL = '/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            // Verify token and get user info
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
                // Token invalid, remove it
                localStorage.removeItem('token')
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error)
            localStorage.removeItem('token')
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Login failed')
        }

        localStorage.setItem('token', data.token)
        setUser(data.user)
        return data
    }

    const signup = async (userData) => {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Signup failed')
        }

        localStorage.setItem('token', data.token)
        setUser(data.user)
        return data
    }

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        setUser(null)
    }, [])

    const getToken = () => localStorage.getItem('token')

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
