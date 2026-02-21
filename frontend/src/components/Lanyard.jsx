import React, { useRef, useEffect, useState, useMemo } from 'react'

// Inject keyframes for card animations
const LANYARD_KEYFRAMES_ID = 'lanyard-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(LANYARD_KEYFRAMES_ID)) {
    const style = document.createElement('style');
    style.id = LANYARD_KEYFRAMES_ID;
    style.textContent = `
        @keyframes lanyard-shimmer {
            0% { transform: translateX(-100%) rotate(45deg); }
            100% { transform: translateX(100%) rotate(45deg); }
        }
        @keyframes lanyard-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3), inset 0 0 20px rgba(102, 126, 234, 0.1); }
            50% { box-shadow: 0 0 30px rgba(118, 75, 162, 0.5), inset 0 0 30px rgba(118, 75, 162, 0.15); }
        }
    `;
    document.head.appendChild(style);
}

// Stretchable Lanyard component with physics-based ribbon rope
export default function Lanyard({ 
    name = "Welcome",
    title = "Business Owner",
    avatarUrl = "",
    handle = "user",
    status = "Online",
    className = "",
    style = {}
}) {
    const containerRef = useRef(null)
    const [cardPos, setCardPos] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [ropePoints, setRopePoints] = useState([])
    const lastPos = useRef({ x: 0, y: 0 })
    const velocity = useRef({ x: 0, y: 0 })
    const animationRef = useRef(null)
    
    // Fixed anchor point at top
    const anchorY = -200
    
    // Number of rope segments
    const numSegments = 12
    
    // Initialize rope points
    useEffect(() => {
        const points = []
        for (let i = 0; i <= numSegments; i++) {
            points.push({ 
                x: 0, 
                y: anchorY + (i * 18),
                vx: 0,
                vy: 0
            })
        }
        setRopePoints(points)
    }, [])
    
    // Default avatar placeholder
    const defaultAvatar = useMemo(() => {
        const initial = (name || 'U').charAt(0).toUpperCase()
        return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#667eea"/><stop offset="100%" style="stop-color:#764ba2"/></linearGradient></defs><rect fill="url(#bg)" width="100" height="100"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="45" font-family="Arial, sans-serif" font-weight="bold">${initial}</text></svg>`)}`
    }, [name])

    // Physics simulation for rope
    useEffect(() => {
        const gravity = 0.4
        const damping = 0.97
        const springStrength = 0.25
        const segmentLength = 18
        
        const animate = () => {
            setRopePoints(prevPoints => {
                if (prevPoints.length === 0) return prevPoints
                
                const newPoints = prevPoints.map((p, i) => {
                    if (i === 0) {
                        return { ...p, x: 0, y: anchorY }
                    }
                    
                    if (i === prevPoints.length - 1) {
                        return { 
                            ...p, 
                            x: cardPos.x, 
                            y: cardPos.y + 20,
                            vx: 0,
                            vy: 0
                        }
                    }
                    
                    let vy = p.vy + gravity
                    let vx = p.vx
                    
                    const prev = prevPoints[i - 1]
                    const dx1 = prev.x - p.x
                    const dy1 = prev.y - p.y
                    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
                    if (dist1 > segmentLength) {
                        const force = (dist1 - segmentLength) * springStrength
                        vx += (dx1 / dist1) * force
                        vy += (dy1 / dist1) * force
                    }
                    
                    const next = prevPoints[i + 1]
                    const dx2 = next.x - p.x
                    const dy2 = next.y - p.y
                    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
                    if (dist2 > segmentLength) {
                        const force = (dist2 - segmentLength) * springStrength
                        vx += (dx2 / dist2) * force
                        vy += (dy2 / dist2) * force
                    }
                    
                    vx *= damping
                    vy *= damping
                    
                    return {
                        x: p.x + vx,
                        y: p.y + vy,
                        vx,
                        vy
                    }
                })
                
                return newPoints
            })
            
            if (!isDragging) {
                const springBack = 0.04
                const cardDamping = 0.9
                
                velocity.current.x += (-cardPos.x) * springBack
                velocity.current.y += (-cardPos.y) * springBack
                velocity.current.x *= cardDamping
                velocity.current.y *= cardDamping
                
                setCardPos(prev => ({
                    x: prev.x + velocity.current.x,
                    y: prev.y + velocity.current.y
                }))
            }
            
            animationRef.current = requestAnimationFrame(animate)
        }
        
        animationRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animationRef.current)
    }, [isDragging, cardPos])

    const handleMouseDown = (e) => {
        e.preventDefault()
        setIsDragging(true)
        const rect = containerRef.current.getBoundingClientRect()
        lastPos.current = { 
            x: e.clientX - rect.left - rect.width / 2, 
            y: e.clientY - rect.top - rect.height / 2 
        }
    }

    const handleMouseMove = (e) => {
        if (!isDragging || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2 + 80
        
        velocity.current.x = (x - cardPos.x) * 0.3
        velocity.current.y = (y - cardPos.y) * 0.3
        
        setCardPos({ x: Math.max(-180, Math.min(180, x)), y: Math.max(-120, Math.min(180, y)) })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        setIsDragging(true)
        const rect = containerRef.current.getBoundingClientRect()
        lastPos.current = { 
            x: touch.clientX - rect.left - rect.width / 2, 
            y: touch.clientY - rect.top - rect.height / 2 
        }
    }

    const handleTouchMove = (e) => {
        if (!isDragging || !containerRef.current) return
        const touch = e.touches[0]
        const rect = containerRef.current.getBoundingClientRect()
        const x = touch.clientX - rect.left - rect.width / 2
        const y = touch.clientY - rect.top - rect.height / 2 + 80
        
        velocity.current.x = (x - cardPos.x) * 0.3
        velocity.current.y = (y - cardPos.y) * 0.3
        
        setCardPos({ x: Math.max(-180, Math.min(180, x)), y: Math.max(-120, Math.min(180, y)) })
    }

    // Calculate ribbon segments for flat lanyard look
    const ribbonSegments = useMemo(() => {
        if (ropePoints.length < 2) return []
        
        const segments = []
        for (let i = 0; i < ropePoints.length - 1; i++) {
            const p1 = ropePoints[i]
            const p2 = ropePoints[i + 1]
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
            const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
            
            segments.push({
                x: p1.x,
                y: p1.y,
                angle,
                length
            })
        }
        return segments
    }, [ropePoints])

    const centerX = containerRef.current?.offsetWidth / 2 || 200
    const centerY = containerRef.current?.offsetHeight / 2 || 280

    return (
        <div 
            ref={containerRef}
            className={`w-full h-full flex flex-col items-center justify-center relative ${className}`}
            style={{ 
                minHeight: '600px',
                ...style 
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
        >
            {/* Ribbon Lanyard Strap */}
            <div 
                className="absolute inset-0 pointer-events-none overflow-visible"
                style={{ zIndex: 5 }}
            >
                {ribbonSegments.map((seg, i) => (
                    <div
                        key={i}
                        className="absolute"
                        style={{
                            left: centerX + seg.x - 12,
                            top: centerY + seg.y,
                            width: seg.length + 4,
                            height: '24px',
                            background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 50%, #1a1a2e 100%)',
                            transform: `rotate(${seg.angle}deg)`,
                            transformOrigin: 'left center',
                            borderRadius: '2px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}
                    >
                        {/* Lanyard logo pattern */}
                        {i % 2 === 0 && (
                            <div 
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.5)" />
                                    <path 
                                        d="M12 4C9 7 6 9 6 12s3 5 6 8c3-3 6-5 6-8s-3-5-6-8z" 
                                        stroke="rgba(255,255,255,0.4)" 
                                        strokeWidth="1.5" 
                                        fill="none"
                                    />
                                </svg>
                            </div>
                        )}
                        {/* Ribbon edge highlight */}
                        <div 
                            className="absolute top-0 left-0 right-0 h-px"
                            style={{ background: 'rgba(255,255,255,0.15)' }}
                        />
                    </div>
                ))}
            </div>

            {/* Card Container */}
            <div 
                className="absolute cursor-grab active:cursor-grabbing select-none"
                style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${cardPos.x}px), calc(-50% + ${cardPos.y}px))`,
                    transition: isDragging ? 'none' : 'transform 0.05s linear',
                    zIndex: 10,
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                {/* Metal Clip */}
                <div className="flex justify-center mb-1">
                    <div 
                        style={{
                            width: '20px',
                            height: '30px',
                            background: 'linear-gradient(135deg, #e0e0e0 0%, #707070 30%, #909090 50%, #606060 70%, #808080 100%)',
                            borderRadius: '4px',
                            boxShadow: '0 3px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                        }}
                    />
                </div>

                {/* Card Glow */}
                <div 
                    className="absolute inset-0 rounded-3xl mt-8"
                    style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(125, 190, 255, 0.5) 0%, transparent 70%)',
                        filter: 'blur(30px)',
                        transform: 'scale(1.2)',
                    }}
                />
                
                {/* Main Card - ProfileCard Style */}
                <div 
                    className="relative rounded-3xl overflow-hidden"
                    style={{
                        width: '320px',
                        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        animation: 'lanyard-glow 3s ease-in-out infinite',
                    }}
                >
                    {/* Shimmer Effect */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                            animation: 'lanyard-shimmer 3s ease-in-out infinite',
                            zIndex: 20,
                        }}
                    />

                    {/* Holographic Shine */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-30"
                        style={{
                            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                            zIndex: 10
                        }}
                    />

                    {/* Card hole for lanyard */}
                    <div 
                        className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-5 rounded-full"
                        style={{
                            background: 'linear-gradient(180deg, #0a0a15 0%, #1a1a2e 100%)',
                            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1)',
                        }}
                    />

                    {/* Card Content */}
                    <div className="flex flex-col pt-10">
                        {/* Top Section - Name & Title */}
                        <div className="text-center pb-4 px-4">
                            <h2
                                className="text-2xl sm:text-3xl font-bold mb-1"
                                style={{
                                    background: 'linear-gradient(to bottom, #ffffff 0%, #a5b4fc 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {name}
                            </h2>
                            <p
                                className="text-sm sm:text-base font-medium"
                                style={{
                                    background: 'linear-gradient(to bottom, #c7d2fe 0%, #818cf8 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {title}
                            </p>
                        </div>

                        {/* Middle Section - Photo */}
                        <div className="px-4 flex justify-center">
                            <div
                                className="relative overflow-hidden"
                                style={{
                                    width: '100%',
                                    maxWidth: '240px',
                                    aspectRatio: '1',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(102, 126, 234, 0.3)',
                                    border: '2px solid rgba(255, 255, 255, 0.15)',
                                }}
                            >
                                {/* Photo Shimmer */}
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
                                        animation: 'lanyard-shimmer 4s ease-in-out infinite',
                                        animationDelay: '1s',
                                        zIndex: 5,
                                    }}
                                />
                                <img
                                    src={avatarUrl || defaultAvatar}
                                    alt={`${name} profile`}
                                    className="w-full h-full object-cover"
                                    onError={e => { e.target.src = defaultAvatar }}
                                />
                            </div>
                        </div>

                        {/* Bottom Section - User Info Bar */}
                        <div className="p-4 mt-4">
                            <div
                                className="flex items-center justify-center p-3 rounded-2xl"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="rounded-full overflow-hidden flex-shrink-0"
                                        style={{
                                            width: '44px',
                                            height: '44px',
                                            border: '2px solid rgba(255, 255, 255, 0.2)',
                                        }}
                                    >
                                        <img
                                            src={avatarUrl || defaultAvatar}
                                            alt="Mini avatar"
                                            className="w-full h-full object-cover"
                                            onError={e => { e.target.src = defaultAvatar }}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white/90 text-sm font-medium">
                                            @{handle}
                                        </span>
                                        <span className="text-white/60 text-xs flex items-center gap-1">
                                            <span 
                                                className="w-2 h-2 rounded-full inline-block animate-pulse"
                                                style={{ background: status === 'Online' ? '#4ade80' : '#9ca3af' }}
                                            />
                                            {status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
