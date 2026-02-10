import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LightRays from './LightRays'

// Inject layout animations
const LAYOUT_KEYFRAMES_ID = 'layout-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(LAYOUT_KEYFRAMES_ID)) {
    const style = document.createElement('style');
    style.id = LAYOUT_KEYFRAMES_ID;
    style.textContent = `
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes glassShine {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes borderGlow {
            0%, 100% { border-color: rgba(255, 255, 255, 0.1); }
            50% { border-color: rgba(255, 255, 255, 0.25); }
        }
        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
            50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.5); }
        }
        @keyframes dropdownFadeIn {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoGlow {
            0%, 100% { 
                filter: drop-shadow(0 0 10px rgba(102, 126, 234, 0.5));
                transform: scale(1);
            }
            50% { 
                filter: drop-shadow(0 0 20px rgba(118, 75, 162, 0.7));
                transform: scale(1.02);
            }
        }
        @keyframes logoShimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
        }
        @keyframes navItemFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
        }
        @keyframes iconBounce {
            0%, 100% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(1.2) rotate(-5deg); }
            75% { transform: scale(1.1) rotate(5deg); }
        }
        @keyframes activeGlow {
            0%, 100% { box-shadow: 0 0 15px rgba(102, 126, 234, 0.4), inset 0 0 10px rgba(102, 126, 234, 0.1); }
            50% { box-shadow: 0 0 25px rgba(118, 75, 162, 0.6), inset 0 0 15px rgba(118, 75, 162, 0.2); }
        }
        @keyframes navbarShine {
            0% { left: -100%; }
            50%, 100% { left: 100%; }
        }
        @keyframes profileRing {
            0%, 100% { 
                box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
            }
            50% { 
                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0);
            }
        }
        @keyframes slideInNav {
            0% { opacity: 0; transform: translateX(-20px); }
            100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes anchorSway {
            0%, 100% { transform: rotate(-3deg); }
            50% { transform: rotate(3deg); }
        }
        @keyframes dockWave {
            0% { transform: translateX(-100%); opacity: 0; }
            50% { opacity: 0.06; }
            100% { transform: translateX(100%); opacity: 0; }
        }
        .nav-item-hover:hover .nav-icon {
            animation: iconBounce 0.5s ease-in-out;
        }
        .nav-item-hover:hover {
            animation: navItemFloat 0.5s ease-in-out;
        }
    `;
    document.head.appendChild(style);
}

export default function Layout({ children }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)
    const profileDropdownRef = useRef(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    // Generate default avatar with initials
    const getDefaultAvatar = (name) => {
        const initial = (name || 'U').charAt(0).toUpperCase()
        return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#667eea" width="100" height="100"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40" font-family="Arial">${initial}</text></svg>`)}`
    }

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/analytics', label: 'Analytics', icon: '📈' },
        { path: '/qr-code', label: 'QR Code', icon: '📱' },
        { path: '/pricing', label: 'Pricing', icon: '💎' },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
    ]

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* LightRays Background */}
            <div className="fixed inset-0 z-0">
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#ffffff"
                    raysSpeed={1}
                    lightSpread={0.5}
                    rayLength={3}
                    followMouse={true}
                    mouseInfluence={0.1}
                    noiseAmount={0}
                    distortion={0}
                    pulsating={false}
                    fadeDistance={1}
                    saturation={1}
                />
            </div>
            
            {/* Top Navigation - Glass Effect */}
            <nav 
                className="fixed top-0 left-0 right-0 z-50"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
                    overflow: 'visible',
                }}
            >
                {/* Animated shine effect across navbar */}
                <div 
                    className="absolute top-0 h-full w-1/3 pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
                        animation: 'navbarShine 4s ease-in-out infinite',
                        zIndex: 0,
                    }}
                />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ overflow: 'visible', zIndex: 10 }}>
                    <div className="flex justify-between h-16" style={{ overflow: 'visible' }}>
                        {/* Logo */}
                        <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 20 }}>
                            {/* Anchor icon */}
                            <span 
                                className="text-2xl"
                                style={{
                                    filter: 'drop-shadow(0 0 8px rgba(102, 126, 234, 0.6))',
                                    animation: 'logoGlow 2s ease-in-out infinite',
                                    display: 'inline-block',
                                }}
                            >
                                ⚓
                            </span>
                            <span 
                                className="text-2xl font-bold cursor-pointer relative"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #a5b4fc 50%, #764ba2 75%, #667eea 100%)',
                                    backgroundSize: '200% auto',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    animation: 'logoShimmer 3s linear infinite, logoGlow 2s ease-in-out infinite',
                                }}
                            >
                                ReviewDock
                            </span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-2" style={{ overflow: 'visible', position: 'relative', zIndex: 20 }}>
                            {navItems.map((item, index) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-item-hover px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center ${isActive
                                            ? ''
                                            : 'hover:bg-white/10'
                                        }`
                                    }
                                    style={({ isActive }) => ({
                                        ...(isActive ? {
                                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                                            border: '1px solid rgba(102, 126, 234, 0.4)',
                                            color: '#a5b4fc',
                                            animation: 'activeGlow 2s ease-in-out infinite',
                                        } : {
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            border: '1px solid transparent',
                                        }),
                                        animationDelay: `${index * 0.1}s`,
                                    })}
                                >
                                    <span className="nav-icon mr-2" style={{ fontSize: '1.1rem', display: 'inline-block', lineHeight: 1 }}>{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}

                            <div className="h-6 w-px bg-white/20 mx-2"></div>

                            {/* User Profile Section with Dropdown */}
                            <div className="relative" ref={profileDropdownRef} style={{ zIndex: 100 }}>
                                <button
                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                    className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-300 group"
                                    style={{
                                        background: showProfileDropdown ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        border: showProfileDropdown ? '1px solid rgba(102, 126, 234, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                        animation: showProfileDropdown ? 'activeGlow 2s ease-in-out infinite' : 'none',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!showProfileDropdown) {
                                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)'
                                            e.currentTarget.style.border = '1px solid rgba(102, 126, 234, 0.3)'
                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!showProfileDropdown) {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)'
                                            e.currentTarget.style.transform = 'translateY(0)'
                                        }
                                    }}
                                >
                                    <img
                                        src={user?.profilePictureUrl || getDefaultAvatar(user?.ownerName || user?.businessName)}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full object-cover"
                                        style={{
                                            border: '2px solid rgba(102, 126, 234, 0.5)',
                                            boxShadow: '0 0 10px rgba(102, 126, 234, 0.3)',
                                            animation: 'profileRing 2s ease-in-out infinite',
                                        }}
                                        onError={(e) => {
                                            e.target.src = getDefaultAvatar(user?.ownerName || user?.businessName)
                                        }}
                                    />
                                    <span className="text-sm text-white/80 font-medium group-hover:text-white transition-colors duration-300">
                                        {user?.ownerName || user?.businessName}
                                    </span>
                                    <svg 
                                        className={`w-4 h-4 text-white/60 transition-all duration-300 group-hover:text-white/80 ${showProfileDropdown ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Profile Dropdown */}
                                {showProfileDropdown && (
                                    <div 
                                        className="absolute right-0 mt-2 w-56 rounded-xl"
                                        style={{
                                            zIndex: 9999,
                                            background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.98) 0%, rgba(20, 20, 40, 0.98) 100%)',
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                            animation: 'dropdownFadeIn 0.2s ease-out',
                                        }}
                                    >
                                        {/* Profile Info */}
                                        <div 
                                            className="px-4 py-3"
                                            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
                                        >
                                            <p className="text-white font-medium truncate">{user?.ownerName || user?.businessName}</p>
                                            <p className="text-white/50 text-sm truncate">{user?.email}</p>
                                        </div>

                                        {/* Dropdown Items */}
                                        <div className="py-2">
                                            <button
                                                onClick={() => {
                                                    setShowProfileDropdown(false)
                                                    handleLogout()
                                                }}
                                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-300 group"
                                                style={{ color: '#f87171' }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'
                                                    e.currentTarget.style.paddingLeft = '20px'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent'
                                                    e.currentTarget.style.paddingLeft = '16px'
                                                }}
                                            >
                                                <span className="transition-transform duration-300 group-hover:scale-110">🚪</span>
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden flex items-center">
                            <button
                                className="text-white/80 hover:text-white p-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'
                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(102, 126, 234, 0.3)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                                    e.currentTarget.style.boxShadow = 'none'
                                }}
                                onClick={() => document.getElementById('mobile-menu').classList.toggle('hidden')}
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div 
                    id="mobile-menu" 
                    className="hidden md:hidden"
                    style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <div className="px-4 py-3 space-y-2">
                        {/* Mobile Profile Section */}
                        <div 
                            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-3"
                            style={{
                                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <img
                                src={user?.profilePictureUrl || getDefaultAvatar(user?.ownerName || user?.businessName)}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover"
                                style={{
                                    border: '2px solid rgba(102, 126, 234, 0.5)',
                                }}
                                onError={(e) => {
                                    e.target.src = getDefaultAvatar(user?.ownerName || user?.businessName)
                                }}
                            />
                            <div>
                                <p className="text-white font-medium">{user?.ownerName || user?.businessName}</p>
                                <p className="text-white/50 text-sm">{user?.email}</p>
                            </div>
                        </div>

                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="block px-4 py-3 rounded-xl font-medium transition-all"
                                style={({ isActive }) => isActive ? {
                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                                    border: '1px solid rgba(102, 126, 234, 0.4)',
                                    color: '#a5b4fc',
                                } : {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                }}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 rounded-xl font-medium mt-2"
                            style={{
                                color: '#f87171',
                                background: 'rgba(248, 113, 113, 0.1)',
                                border: '1px solid rgba(248, 113, 113, 0.2)',
                            }}
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-20">
                <div style={{ animation: 'fadeInUp 0.6s ease-out' }}>
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer 
                className="relative z-10 border-t overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
            >
                {/* Animated wave line across footer top */}
                <div 
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.6), rgba(118, 75, 162, 0.6), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'logoShimmer 4s linear infinite',
                    }}
                />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        {/* Brand */}
                        <div className="flex flex-col items-center md:items-start gap-2">
                            <div className="flex items-center gap-2">
                                <span 
                                    className="text-xl font-bold"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #a5b4fc 100%)',
                                        backgroundSize: '200% auto',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        animation: 'logoShimmer 3s linear infinite',
                                    }}
                                >
                                    ⚓ ReviewDock
                                </span>
                            </div>
                            <p className="text-white/40 text-sm text-center md:text-left">
                                Smart review management for modern businesses
                            </p>
                        </div>

                        {/* Links */}
                        <div className="flex items-center gap-6 text-sm">
                            <NavLink to="/dashboard" className="text-white/50 hover:text-white/90 transition-colors duration-300">
                                Dashboard
                            </NavLink>
                            <NavLink to="/analytics" className="text-white/50 hover:text-white/90 transition-colors duration-300">
                                Analytics
                            </NavLink>
                            <NavLink to="/pricing" className="text-white/50 hover:text-white/90 transition-colors duration-300">
                                Pricing
                            </NavLink>
                        </div>

                        {/* Copyright */}
                        <div className="text-center md:text-right">
                            <p className="text-white/30 text-xs">
                                © {new Date().getFullYear()} ReviewDock. All rights reserved.
                            </p>
                            <p className="text-white/20 text-xs mt-1">
                                Built with 💜 for businesses that care
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
