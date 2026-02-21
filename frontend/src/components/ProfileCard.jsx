import { memo, useMemo, useRef, useCallback, useEffect } from 'react';

// Inject keyframes for animations
const KEYFRAMES_ID = 'pc-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
    const style = document.createElement('style');
    style.id = KEYFRAMES_ID;
    style.textContent = `
        @keyframes shimmer {
            0% { transform: translateX(-100%) rotate(45deg); }
            100% { transform: translateX(100%) rotate(45deg); }
        }
        @keyframes glow-pulse {
            0%, 100% { opacity: 0.6; transform: scale(1.2); }
            50% { opacity: 0.8; transform: scale(1.3); }
        }
        @keyframes border-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3), inset 0 0 20px rgba(102, 126, 234, 0.1); }
            50% { box-shadow: 0 0 30px rgba(118, 75, 162, 0.5), inset 0 0 30px rgba(118, 75, 162, 0.15); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }
    `;
    document.head.appendChild(style);
}

const clamp = (v, min = 0, max = 100) => Math.min(Math.max(v, min), max);

function ProfileCardComponent({
    avatarUrl = '',
    name = 'Welcome',
    title = 'Business Owner',
    handle = 'user',
    status = 'Online',
    contactText = 'Go to Dashboard',
    showUserInfo = true,
    onContactClick,
    enableTilt = true,
    behindGlowColor = 'rgba(125, 190, 255, 0.67)',
    innerGradient = 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
}) {
    const cardRef = useRef(null);
    const glowRef = useRef(null);

    // Handle mouse move for tilt effect
    const handleMouseMove = useCallback((e) => {
        if (!enableTilt || !cardRef.current) return;
        
        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        
        // Move glow with cursor
        if (glowRef.current) {
            const percentX = (x / rect.width) * 100;
            const percentY = (y / rect.height) * 100;
            glowRef.current.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.15) 0%, transparent 50%)`;
        }
    }, [enableTilt]);

    const handleMouseLeave = useCallback(() => {
        if (!cardRef.current) return;
        cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
        if (glowRef.current) {
            glowRef.current.style.background = 'transparent';
        }
    }, []);

    // Default avatar placeholder
    const defaultAvatar = useMemo(() => {
        const initial = (name || 'U').charAt(0).toUpperCase();
        return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#667eea"/><stop offset="100%" style="stop-color:#764ba2"/></linearGradient></defs><rect fill="url(#bg)" width="400" height="400"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="180" font-family="Arial, sans-serif" font-weight="bold">${initial}</text></svg>`)}`;
    }, [name]);

    return (
        <div 
            className="relative"
            style={{
                perspective: '1000px',
                animation: 'float 6s ease-in-out infinite',
            }}
        >
            {/* Behind Glow Effect */}
            <div
                className="absolute inset-0 -z-10 blur-3xl"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${behindGlowColor} 0%, transparent 70%)`,
                    transform: 'scale(1.3)',
                    animation: 'glow-pulse 4s ease-in-out infinite',
                }}
            />

            {/* Main Card */}
            <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative overflow-hidden cursor-pointer"
                style={{
                    width: 'min(340px, 90vw)',
                    borderRadius: '24px',
                    background: innerGradient,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
                    animation: 'border-glow 3s ease-in-out infinite',
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* Shimmer Effect */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                        animation: 'shimmer 3s ease-in-out infinite',
                        zIndex: 20,
                    }}
                />

                {/* Mouse Glow Follower */}
                <div
                    ref={glowRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 15 }}
                />

                {/* Holographic Shine Overlay */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                        background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                        zIndex: 10
                    }}
                />

                {/* Card Content - Flex Column Layout */}
                <div className="flex flex-col">
                    
                    {/* Top Section - Name & Title */}
                    <div className="text-center pt-6 pb-4 px-4">
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
                                maxWidth: '280px',
                                aspectRatio: '1',
                                borderRadius: '16px',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(102, 126, 234, 0.3)',
                                border: '2px solid rgba(255, 255, 255, 0.15)',
                                transition: 'box-shadow 0.3s ease',
                            }}
                        >
                            {/* Photo Shimmer */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
                                    animation: 'shimmer 4s ease-in-out infinite',
                                    animationDelay: '1s',
                                    zIndex: 5,
                                }}
                            />
                            <img
                                src={avatarUrl || defaultAvatar}
                                alt={`${name} profile`}
                                className="w-full h-full"
                                style={{
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    imageRendering: 'auto',
                                }}
                                onError={e => {
                                    e.target.src = defaultAvatar;
                                }}
                            />
                        </div>
                    </div>

                    {/* Bottom Section - User Info Bar */}
                    {showUserInfo && (
                        <div className="p-4 mt-4">
                            <div
                                className="flex items-center justify-center p-3 rounded-2xl"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                            >
                                {/* Mini Avatar & Info */}
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
                                            onError={e => {
                                                e.target.src = defaultAvatar;
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white/90 text-sm font-medium">
                                            @{handle}
                                        </span>
                                        <span className="text-white/60 text-xs flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
                                            {status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const ProfileCard = memo(ProfileCardComponent);
export default ProfileCard;
