import { useEffect, useRef, useCallback } from 'react'

const BUTTERFLY_COLORS = [
    { wing1: '#667eea', wing2: '#764ba2', body: '#a5b4fc', accent: '#c084fc' },
    { wing1: '#f472b6', wing2: '#c084fc', body: '#e879f9', accent: '#a78bfa' },
    { wing1: '#34d399', wing2: '#2dd4bf', body: '#6ee7b7', accent: '#a7f3d0' },
    { wing1: '#fb923c', wing2: '#f472b6', body: '#fbbf24', accent: '#fcd34d' },
]

function Butterfly({ id, colorSet, delay }) {
    const elRef = useRef(null)
    const posRef = useRef({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 })
    const targetRef = useRef({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 })
    const timeRef = useRef(0)
    const animRef = useRef(null)

    const pickNewTarget = useCallback(() => {
        targetRef.current = {
            x: Math.random() * 85 + 5,
            y: Math.random() * 75 + 10,
        }
    }, [])

    // Animation loop with 30fps cap, direct DOM updates (no React re-renders)
    useEffect(() => {
        const fadeTimer = setTimeout(() => {
            if (elRef.current) elRef.current.style.opacity = '1'
        }, delay)

        let lastTime = performance.now()
        let lastFrameTime = 0
        const frameDuration = 1000 / 30

        const animate = (now) => {
            if (now - lastFrameTime < frameDuration) {
                animRef.current = requestAnimationFrame(animate)
                return
            }
            lastFrameTime = now

            const dt = (now - lastTime) / 1000
            lastTime = now
            timeRef.current += dt

            const pos = posRef.current
            const target = targetRef.current
            const dx = target.x - pos.x
            const dy = target.y - pos.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < 2) {
                pickNewTarget()
            } else {
                const speed = 8 + Math.sin(timeRef.current * 2) * 3
                const wobble = Math.sin(timeRef.current * 5) * 0.8
                const moveX = (dx / dist) * speed * dt + wobble * dt * (dy / dist)
                const moveY = (dy / dist) * speed * dt - wobble * dt * (dx / dist)

                pos.x = Math.max(2, Math.min(95, pos.x + moveX))
                pos.y = Math.max(2, Math.min(90, pos.y + moveY))
            }

            const angle = Math.atan2(dy, dx) * (180 / Math.PI)

            // Direct DOM update — no React state, no re-render
            if (elRef.current) {
                elRef.current.style.left = `${pos.x}%`
                elRef.current.style.top = `${pos.y}%`
                elRef.current.style.transform = `rotate(${angle * 0.3}deg)`
            }

            animRef.current = requestAnimationFrame(animate)
        }

        animRef.current = requestAnimationFrame(animate)
        return () => {
            clearTimeout(fadeTimer)
            cancelAnimationFrame(animRef.current)
        }
    }, [delay, pickNewTarget])

    const wingFlap = `wingFlap 0.15s ease-in-out infinite alternate`
    const bobbing = `butterflyBob 1.2s ease-in-out infinite`

    return (
        <div
            ref={elRef}
            style={{
                position: 'fixed',
                left: `${posRef.current.x}%`,
                top: `${posRef.current.y}%`,
                zIndex: 45,
                pointerEvents: 'none',
                transition: 'opacity 0.5s ease',
                transform: `rotate(0deg)`,
                opacity: 0,
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
                willChange: 'left, top, transform',
            }}
        >
            <div style={{ animation: bobbing }}>
                <svg
                    width="32"
                    height="28"
                    viewBox="0 0 60 50"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <radialGradient id={`bw1-${id}`} cx="40%" cy="40%">
                            <stop offset="0%" stopColor={colorSet.accent} stopOpacity="0.9" />
                            <stop offset="100%" stopColor={colorSet.wing1} stopOpacity="0.85" />
                        </radialGradient>
                        <radialGradient id={`bw2-${id}`} cx="40%" cy="40%">
                            <stop offset="0%" stopColor={colorSet.accent} stopOpacity="0.9" />
                            <stop offset="100%" stopColor={colorSet.wing2} stopOpacity="0.85" />
                        </radialGradient>
                        <filter id={`bglow-${id}`}>
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Left upper wing */}
                    <g style={{ transformOrigin: '30px 25px', animation: wingFlap }}>
                        <path
                            d="M30 25 C20 8, 2 5, 5 20 C7 28, 18 30, 30 25Z"
                            fill={`url(#bw1-${id})`}
                            filter={`url(#bglow-${id})`}
                        />
                        {/* Wing pattern */}
                        <circle cx="15" cy="17" r="3" fill={colorSet.body} opacity="0.5" />
                        <circle cx="11" cy="20" r="1.5" fill="white" opacity="0.3" />
                    </g>

                    {/* Left lower wing */}
                    <g style={{ transformOrigin: '30px 25px', animation: wingFlap, animationDelay: '0.05s' }}>
                        <path
                            d="M30 25 C22 30, 8 40, 12 30 C15 25, 24 24, 30 25Z"
                            fill={`url(#bw2-${id})`}
                            filter={`url(#bglow-${id})`}
                        />
                        <circle cx="17" cy="32" r="2" fill={colorSet.body} opacity="0.4" />
                    </g>

                    {/* Right upper wing */}
                    <g style={{ transformOrigin: '30px 25px', animation: wingFlap }}>
                        <path
                            d="M30 25 C40 8, 58 5, 55 20 C53 28, 42 30, 30 25Z"
                            fill={`url(#bw1-${id})`}
                            filter={`url(#bglow-${id})`}
                        />
                        <circle cx="45" cy="17" r="3" fill={colorSet.body} opacity="0.5" />
                        <circle cx="49" cy="20" r="1.5" fill="white" opacity="0.3" />
                    </g>

                    {/* Right lower wing */}
                    <g style={{ transformOrigin: '30px 25px', animation: wingFlap, animationDelay: '0.05s' }}>
                        <path
                            d="M30 25 C38 30, 52 40, 48 30 C45 25, 36 24, 30 25Z"
                            fill={`url(#bw2-${id})`}
                            filter={`url(#bglow-${id})`}
                        />
                        <circle cx="43" cy="32" r="2" fill={colorSet.body} opacity="0.4" />
                    </g>

                    {/* Body */}
                    <ellipse cx="30" cy="25" rx="2" ry="6" fill={colorSet.body} opacity="0.9" />
                    <ellipse cx="30" cy="25" rx="1.2" ry="5" fill="white" opacity="0.2" />

                    {/* Antennae */}
                    <path d="M29 19 C27 13, 24 10, 22 8" stroke={colorSet.body} strokeWidth="0.6" fill="none" opacity="0.7" />
                    <path d="M31 19 C33 13, 36 10, 38 8" stroke={colorSet.body} strokeWidth="0.6" fill="none" opacity="0.7" />
                    <circle cx="22" cy="8" r="1" fill={colorSet.accent} opacity="0.8" />
                    <circle cx="38" cy="8" r="1" fill={colorSet.accent} opacity="0.8" />
                </svg>

                {/* Sparkle trail */}
                <div style={{
                    position: 'absolute',
                    bottom: -2,
                    left: '50%',
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: colorSet.accent,
                    opacity: 0.6,
                    animation: 'sparkleTrail 0.6s ease-out infinite',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: -5,
                    left: '45%',
                    width: 2,
                    height: 2,
                    borderRadius: '50%',
                    background: colorSet.wing1,
                    opacity: 0.4,
                    animation: 'sparkleTrail 0.8s ease-out infinite 0.2s',
                }} />
            </div>
        </div>
    )
}

// Inject butterfly-specific keyframes
const BUTTERFLY_KEYFRAMES_ID = 'butterfly-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(BUTTERFLY_KEYFRAMES_ID)) {
    const style = document.createElement('style');
    style.id = BUTTERFLY_KEYFRAMES_ID;
    style.textContent = `
        @keyframes wingFlap {
            0% { transform: scaleX(1); }
            100% { transform: scaleX(0.3); }
        }
        @keyframes butterflyBob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }
        @keyframes sparkleTrail {
            0% { opacity: 0.6; transform: translate(0, 0) scale(1); }
            100% { opacity: 0; transform: translate(-4px, 8px) scale(0); }
        }
    `;
    document.head.appendChild(style);
}

export default function FlyingButterfly() {
    return (
        <>
            {BUTTERFLY_COLORS.map((colorSet, i) => (
                <Butterfly
                    key={i}
                    id={i}
                    colorSet={colorSet}
                    delay={i * 1500}
                />
            ))}
        </>
    )
}
