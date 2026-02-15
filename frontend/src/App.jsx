import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'

// Loading spinner component
function LoadingSpinner() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="relative">
                {/* Outer ring */}
                <div 
                    className="w-16 h-16 rounded-full animate-spin"
                    style={{
                        border: '3px solid rgba(102, 126, 234, 0.2)',
                        borderTopColor: '#667eea',
                    }}
                />
                {/* Inner pulse */}
                <div 
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <div 
                        className="w-8 h-8 rounded-full animate-pulse"
                        style={{
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

// Lazy load heavy pages
const Welcome = lazy(() => import('./pages/Welcome'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const QRCode = lazy(() => import('./pages/QRCode'))
const Settings = lazy(() => import('./pages/Settings'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Analytics = lazy(() => import('./pages/Analytics'))

// Regular imports for lighter pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ThankYou from './pages/ThankYou'
import AuthCallback from './pages/AuthCallback'

// Protected Route wrapper
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}

// Public Route wrapper (redirect if logged in)
function PublicRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
        )
    }

    if (user) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}

function AppRoutes() {
    return (
        <Routes>
            {/* Public Feedback Routes */}
            <Route path="/b/:businessId" element={<Feedback />} />
            <Route path="/thank-you" element={<ThankYou />} />

            {/* Auth Routes */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            } />
            <Route path="/signup" element={
                <PublicRoute>
                    <Signup />
                </PublicRoute>
            } />
            <Route path="/forgot-password" element={
                <PublicRoute>
                    <ForgotPassword />
                </PublicRoute>
            } />
            <Route path="/reset-password" element={
                <PublicRoute>
                    <ResetPassword />
                </PublicRoute>
            } />

            {/* Protected Dashboard Routes */}
            <Route path="/welcome" element={
                <ProtectedRoute>
                    <Welcome />
                </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } />
            <Route path="/qr-code" element={
                <ProtectedRoute>
                    <QRCode />
                </ProtectedRoute>
            } />
            <Route path="/qr" element={
                <ProtectedRoute>
                    <QRCode />
                </ProtectedRoute>
            } />
            <Route path="/settings" element={
                <ProtectedRoute>
                    <Settings />
                </ProtectedRoute>
            } />
            <Route path="/pricing" element={
                <ProtectedRoute>
                    <Pricing />
                </ProtectedRoute>
            } />
            <Route path="/analytics" element={
                <ProtectedRoute>
                    <Analytics />
                </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    )
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <Suspense fallback={<LoadingSpinner />}>
                    <AppRoutes />
                </Suspense>
            </AuthProvider>
        </Router>
    )
}

export default App
