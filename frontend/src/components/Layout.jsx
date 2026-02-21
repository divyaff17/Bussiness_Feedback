import { useState, useEffect, useRef, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import API_URL from '../config/api'
import MeteorShower from './MeteorShower'
import FlyingButterfly from './FlyingButterfly'
import CrackEffect from './CrackEffect'
import { IconDashboard, IconChart, IconQR, IconDiamond, IconSettings } from './Icons'

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
            0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
            50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.5); }
        }
        @keyframes dropdownFadeIn {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoGlow {
            0%, 100% { 
                filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.5));
                transform: scale(1);
            }
            50% { 
                filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.7));
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
            0%, 100% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.4), inset 0 0 10px rgba(139, 92, 246, 0.1); }
            50% { box-shadow: 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.2); }
        }
        @keyframes navbarShine {
            0% { left: -100%; }
            50%, 100% { left: 100%; }
        }
        @keyframes profileRing {
            0%, 100% { 
                box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4);
            }
            50% { 
                box-shadow: 0 0 0 4px rgba(139, 92, 246, 0);
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
        .nav-item-hover .nav-icon {
            transition: transform 0.3s ease, filter 0.3s ease;
        }
        .nav-item-hover:hover .nav-icon {
            animation: iconBounce 0.5s ease-in-out;
            filter: drop-shadow(0 0 6px rgba(165, 180, 252, 0.7));
        }
        .nav-item-hover:hover {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(168, 85, 247, 0.14) 50%, rgba(192, 132, 252, 0.10) 100%) !important;
            border-color: rgba(139, 92, 246, 0.35) !important;
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.15), 0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.08);
            transform: translateY(-1px);
            color: #e0e7ff !important;
            text-shadow: 0 0 12px rgba(165, 180, 252, 0.5);
        }
        @keyframes anchorSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes footerOrb1 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
            33% { transform: translate(30px, -20px) scale(1.2); opacity: 0.25; }
            66% { transform: translate(-20px, 15px) scale(0.9); opacity: 0.1; }
        }
        @keyframes footerOrb2 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.1; }
            50% { transform: translate(-40px, -10px) scale(1.3); opacity: 0.2; }
        }
        @keyframes footerShimmerLine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        @keyframes footerGlowPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255,255,255,0.05); }
            50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.12), inset 0 1px 0 rgba(255,255,255,0.1); }
        }
        @keyframes footerLinkGlow {
            0%, 100% { text-shadow: 0 0 0px transparent; }
            50% { text-shadow: 0 0 8px rgba(139, 92, 246, 0.5); }
        }
        .footer-link {
            position: relative;
            transition: all 0.3s ease;
            text-shadow: 0 0 6px rgba(255,255,255,0.15), 0 0 20px rgba(255,255,255,0.05);
        }
        .footer-link::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 50%;
            width: 0;
            height: 1px;
            background: linear-gradient(90deg, #8b5cf6, #a855f7);
            transition: all 0.3s ease;
            transform: translateX(-50%);
        }
        .footer-link:hover::after {
            width: 100%;
        }
        .footer-link:hover {
            color: rgba(255,255,255,1) !important;
            text-shadow: 0 0 12px rgba(255,255,255,0.6), 0 0 30px rgba(139, 92, 246, 0.5);
        }
    `;
    document.head.appendChild(style);
}

export default function Layout({ children }) {
    const { user, logout, getToken } = useAuth()
    const navigate = useNavigate()
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)
    const profileDropdownRef = useRef(null)
    const [newFeedbackCount, setNewFeedbackCount] = useState(0)

    // Fetch new feedback count (last 24h unreplied) — poll every 60s, pause when tab hidden
    useEffect(() => {
        const fetchNewCount = async () => {
            try {
                const token = getToken?.()
                if (!token || !user?.businessId) return
                const res = await fetch(`${API_URL}/api/business/${user.businessId}/alerts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setNewFeedbackCount(data.unreadCount || 0)
                }
            } catch (err) { /* silent */ }
        }
        fetchNewCount()

        let interval = null
        const startPolling = () => {
            if (interval) clearInterval(interval)
            interval = setInterval(fetchNewCount, 60000)
        }
        const stopPolling = () => {
            if (interval) { clearInterval(interval); interval = null }
        }
        const handleVisibility = () => {
            if (document.hidden) { stopPolling() }
            else { fetchNewCount(); startPolling() }
        }

        startPolling()
        document.addEventListener('visibilitychange', handleVisibility)
        return () => {
            stopPolling()
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [user?.businessId])

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
        return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#8b5cf6" width="100" height="100"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40" font-family="Arial">${initial}</text></svg>`)}`
    }

    const navItems = useMemo(() => [
        { path: '/dashboard', label: 'Dashboard', Icon: IconDashboard, badge: newFeedbackCount },
        { path: '/analytics', label: 'Analytics', Icon: IconChart },
        { path: '/qr-code', label: 'QR Code', Icon: IconQR },
        { path: '/pricing', label: 'Pricing', Icon: IconDiamond },
        { path: '/settings', label: 'Settings', Icon: IconSettings },
    ], [newFeedbackCount])

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Meteor Shower Background */}
            <MeteorShower />

            {/* Flying Butterflies */}
            <FlyingButterfly />

            {/* Crack Effect on Button Click */}
            <CrackEffect />
            
            {/* Top Navigation - Glass Effect */}
            <nav 
                className="fixed top-0 left-0 right-0 z-50"
                style={{
                    background: 'rgba(10, 20, 40, 0.6)',
                    backdropFilter: 'blur(20px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                    borderBottom: '1px solid rgba(100, 200, 255, 0.15)',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(100, 200, 255, 0.05)',
                    overflow: 'visible',
                }}
            >
                {/* Animated shine effect across navbar */}
                <div 
                    className="absolute top-0 h-full w-1/3 pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.08), transparent)',
                        animation: 'navbarShine 8s ease-in-out infinite',
                        zIndex: 0,
                    }}
                />
                {/* Bottom glow line */}
                <div 
                    className="absolute bottom-0 left-0 right-0 h-[1px] pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.4), rgba(150, 220, 255, 0.4), transparent)',
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
                                    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))',
                                    animation: 'anchorSpin 12s linear infinite',
                                    display: 'inline-block',
                                }}
                            >
                                ⚓
                            </span>
                            <span 
                                className="text-2xl font-bold cursor-pointer relative"
                                style={{
                                    background: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 50%, #e879f9 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5))',
                                    letterSpacing: '-0.02em',
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
                                        `nav-item-hover px-4 py-2 rounded-xl font-medium flex items-center ${isActive ? '' : ''}`
                                    }
                                    style={({ isActive }) => ({
                                        transition: 'all 0.25s ease',
                                        ...(isActive ? {
                                            color: '#ffffff',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                        } : {
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            border: '1px solid transparent',
                                        }),
                                    })}
                                >
                                    <span className="nav-icon mr-2 flex items-center" style={{ display: 'inline-flex' }}>{item.Icon && <item.Icon className="w-5 h-5" />}</span>
                                    <span className="font-semibold tracking-wide relative" style={{ letterSpacing: '0.02em' }}>
                                        {item.label}
                                        {item.badge > 0 && (
                                            <span 
                                                className="absolute -top-2 -right-5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white animate-pulse"
                                                style={{
                                                    background: 'linear-gradient(135deg, #ef4444, #f87171)',
                                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                                                    padding: '0 4px',
                                                }}
                                            >
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                    </span>
                                </NavLink>
                            ))}

                            <div className="h-6 w-px bg-white/20 mx-2"></div>

                            {/* User Profile Section with Dropdown */}
                            <div className="relative" ref={profileDropdownRef} style={{ zIndex: 100 }}>
                                <button
                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                    className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-300 group"
                                    style={{
                                        background: showProfileDropdown ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        border: showProfileDropdown ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                        animation: showProfileDropdown ? 'activeGlow 2s ease-in-out infinite' : 'none',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!showProfileDropdown) {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'
                                            e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.3)'
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
                                            border: '2px solid rgba(139, 92, 246, 0.5)',
                                            boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
                                            animation: 'profileRing 4s ease-in-out infinite',
                                        }}
                                        onError={(e) => {
                                            e.target.src = getDefaultAvatar(user?.ownerName || user?.businessName)
                                        }}
                                    />
                                    <span className="text-sm text-white/90 font-semibold group-hover:text-white transition-colors duration-300">
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
                                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'
                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(139, 92, 246, 0.3)'
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
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <img
                                src={user?.profilePictureUrl || getDefaultAvatar(user?.ownerName || user?.businessName)}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover"
                                style={{
                                    border: '2px solid rgba(139, 92, 246, 0.5)',
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
                                className="block px-4 py-3 rounded-xl font-medium transition-all duration-300"
                                style={({ isActive }) => isActive ? {
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(236, 72, 153, 0.15) 100%)',
                                    border: '1px solid rgba(139, 92, 246, 0.4)',
                                    color: '#e0e7ff',
                                    boxShadow: '0 0 15px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                                } : {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid transparent',
                                }}
                            >
                                <span className="mr-2 inline-flex">{item.Icon && <item.Icon className="w-5 h-5" />}</span>
                                {item.label}
                                {item.badge > 0 && (
                                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold"
                                        style={{
                                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                            color: 'white',
                                            minWidth: '20px',
                                            boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                                        }}
                                    >
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
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
                        background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.6), rgba(168, 85, 247, 0.6), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'logoShimmer 4s linear infinite',
                    }}
                />
                {/* Shimmer sweep */}
                <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
                    <div style={{ width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: 'footerShimmerLine 3s ease-in-out infinite' }} />
                </div>

                {/* Subtle floating orbs */}
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', animation: 'footerOrb1 12s ease-in-out infinite' }} />
                <div className="absolute -bottom-12 right-10 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', animation: 'footerOrb2 10s ease-in-out infinite' }} />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        {/* Brand */}
                        <div className="flex flex-col items-center md:items-start gap-2">
                            <div className="flex items-center gap-2">
                                <span
                                    style={{
                                        display: 'inline-block',
                                        animation: 'anchorSpin 12s linear infinite',
                                        fontSize: '1.35rem',
                                    }}
                                >
                                    ⚓
                                </span>
                                <span 
                                    className="text-xl font-bold"
                                    style={{
                                        background: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 35%, #f472b6 65%, #fb7185 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        filter: 'drop-shadow(0 0 10px rgba(192, 132, 252, 0.4))',
                                    }}
                                >
                                    ReviewDock
                                </span>
                            </div>
                            <p 
                                className="text-white/80 text-sm text-center md:text-left"
                                style={{
                                    textShadow: '0 0 8px rgba(255,255,255,0.2), 0 0 25px rgba(255,255,255,0.08)',
                                }}
                            >
                                Smart review management for modern businesses
                            </p>
                        </div>

                        {/* Links */}
                        <div className="flex items-center gap-6 text-sm">
                            <NavLink to="/dashboard" className="footer-link text-white/80">
                                Dashboard
                            </NavLink>
                            <NavLink to="/analytics" className="footer-link text-white/80">
                                Analytics
                            </NavLink>
                            <NavLink to="/pricing" className="footer-link text-white/80">
                                Pricing
                            </NavLink>
                        </div>

                        {/* Copyright */}
                        <div className="text-center md:text-right">
                            <p 
                                className="text-white/70 text-xs"
                                style={{
                                    textShadow: '0 0 6px rgba(255,255,255,0.15), 0 0 20px rgba(255,255,255,0.06)',
                                }}
                            >
                                © {new Date().getFullYear()} ReviewDock. All rights reserved.
                            </p>
                            <p 
                                className="text-white/60 text-xs mt-1"
                                style={{
                                    textShadow: '0 0 8px rgba(255,255,255,0.2), 0 0 25px rgba(255,255,255,0.08)',
                                }}
                            >
                                Built with 💜 from 100xSolutions
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
