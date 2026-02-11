import { useEffect } from 'react'

// Inject crack effect styles
const CRACK_STYLES_ID = 'crack-effect-styles';
if (typeof document !== 'undefined' && !document.getElementById(CRACK_STYLES_ID)) {
    const style = document.createElement('style');
    style.id = CRACK_STYLES_ID;
    style.textContent = `
        @keyframes dustFloat {
            0% {
                opacity: 1;
                transform: translate(var(--dx), var(--dy)) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(calc(var(--dx) * 3.5), calc(var(--dy) * 3.5 - 20px)) scale(0);
            }
        }
        @keyframes crackLine {
            0% { opacity: 0; stroke-dashoffset: 100; }
            30% { opacity: 0.8; }
            100% { opacity: 0.9; stroke-dashoffset: 0; }
        }
        @keyframes crackGlow {
            0%, 100% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.3)); }
            50% { filter: drop-shadow(0 0 6px rgba(167,139,250,0.6)); }
        }
        .crack-active {
            animation: crackGlow 0.4s ease-in-out !important;
        }
        .crack-left-piece {
            clip-path: polygon(0% 0%, 52% 0%, 54% 30%, 48% 50%, 53% 70%, 50% 100%, 0% 100%);
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
        }
        .crack-right-piece {
            clip-path: polygon(52% 0%, 100% 0%, 100% 100%, 50% 100%, 53% 70%, 48% 50%, 54% 30%);
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
        }
        .crack-left-piece.split {
            transform: translate(-4px, 1px) rotate(-1.5deg);
        }
        .crack-right-piece.split {
            transform: translate(4px, 1px) rotate(1.5deg);
        }
        .crack-left-piece.rejoin,
        .crack-right-piece.rejoin {
            transform: translate(0, 0) rotate(0deg);
        }
        .crack-svg-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 10;
        }
        .crack-wrapper {
            position: relative;
            display: inline-flex;
        }
    `;
    document.head.appendChild(style);
}

const DUST_COLORS = [
    'rgba(167, 139, 250, 0.9)',
    'rgba(129, 140, 248, 0.9)',
    'rgba(196, 181, 253, 0.85)',
    'rgba(255, 255, 255, 0.8)',
    'rgba(192, 132, 252, 0.85)',
    'rgba(165, 180, 252, 0.8)',
]

function spawnDust(container, rect) {
    const cx = rect.width / 2
    const cy = rect.height / 2
    const count = 16 + Math.floor(Math.random() * 8)

    for (let i = 0; i < count; i++) {
        const dot = document.createElement('div')
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8
        const dist = 12 + Math.random() * 30
        const dx = Math.cos(angle) * dist
        const dy = Math.sin(angle) * dist
        const size = 2 + Math.random() * 3

        dot.style.cssText = `
            position: absolute;
            left: ${cx}px;
            top: ${cy}px;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: ${DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)]};
            pointer-events: none;
            z-index: 20;
            --dx: ${dx}px;
            --dy: ${dy}px;
            animation: dustFloat ${0.5 + Math.random() * 0.4}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            animation-delay: ${Math.random() * 0.1}s;
        `
        container.appendChild(dot)

        setTimeout(() => dot.remove(), 1000)
    }
}

function createCrackSVG(w, h) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.setAttribute('class', 'crack-svg-overlay')
    svg.style.width = w + 'px'
    svg.style.height = h + 'px'

    // Main crack line down center with jagged path
    const cx = w / 2
    const points = []
    const steps = 6
    for (let i = 0; i <= steps; i++) {
        const y = (h / steps) * i
        const offset = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 12
        points.push(`${cx + offset},${y}`)
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', `M${points.join(' L')}`)
    path.setAttribute('stroke', 'rgba(255,255,255,0.7)')
    path.setAttribute('stroke-width', '1.5')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke-dasharray', '100')
    path.style.animation = 'crackLine 0.3s ease-out forwards'

    // Secondary smaller cracks branching off
    const branches = []
    for (let i = 1; i < steps; i++) {
        if (Math.random() > 0.4) {
            const [bx, by] = points[i].split(',').map(Number)
            const dir = Math.random() > 0.5 ? 1 : -1
            const len = 5 + Math.random() * 10
            const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            branch.setAttribute('d', `M${bx},${by} L${bx + dir * len},${by + (Math.random() - 0.5) * 8}`)
            branch.setAttribute('stroke', 'rgba(255,255,255,0.4)')
            branch.setAttribute('stroke-width', '0.8')
            branch.setAttribute('fill', 'none')
            branch.setAttribute('stroke-dasharray', '100')
            branch.style.animation = `crackLine 0.25s ease-out ${0.1 + i * 0.04}s forwards`
            branches.push(branch)
        }
    }

    svg.appendChild(path)
    branches.forEach(b => svg.appendChild(b))

    return svg
}

function applyCrackEffect(button) {
    if (button.dataset.cracking === 'true') return
    button.dataset.cracking = 'true'

    const rect = button.getBoundingClientRect()
    const computed = window.getComputedStyle(button)

    // Store original styles
    const originalPosition = computed.position
    const originalOverflow = computed.overflow

    // Make button a positioning context
    if (originalPosition === 'static') {
        button.style.position = 'relative'
    }
    button.style.overflow = 'visible'

    // Create the crack SVG overlay
    const crackSvg = createCrackSVG(rect.width, rect.height)
    button.appendChild(crackSvg)

    // Add class for glow animation
    button.classList.add('crack-active')

    // Create left and right piece overlays
    const leftPiece = document.createElement('div')
    const rightPiece = document.createElement('div')

    const pieceStyle = `
        position: absolute;
        inset: 0;
        background: inherit;
        border-radius: inherit;
        pointer-events: none;
        z-index: 5;
    `

    leftPiece.style.cssText = pieceStyle
    leftPiece.className = 'crack-left-piece'
    rightPiece.style.cssText = pieceStyle
    rightPiece.className = 'crack-right-piece'

    button.appendChild(leftPiece)
    button.appendChild(rightPiece)

    // Trigger split after a tiny delay
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            leftPiece.classList.add('split')
            rightPiece.classList.add('split')
        })
    })

    // Spawn dust particles
    spawnDust(button, rect)

    // Rejoin on mouse leave
    const handleLeave = () => {
        leftPiece.classList.remove('split')
        rightPiece.classList.remove('split')
        leftPiece.classList.add('rejoin')
        rightPiece.classList.add('rejoin')

        // Fade out crack
        crackSvg.style.transition = 'opacity 0.3s ease'
        crackSvg.style.opacity = '0'

        setTimeout(() => {
            crackSvg.remove()
            leftPiece.remove()
            rightPiece.remove()
            button.classList.remove('crack-active')
            button.style.position = originalPosition === 'static' ? '' : originalPosition
            button.style.overflow = originalOverflow
            button.dataset.cracking = 'false'
        }, 400)

        button.removeEventListener('mouseleave', handleLeave)
    }

    button.addEventListener('mouseleave', handleLeave)

    // Safety cleanup after 5s
    setTimeout(() => {
        if (button.dataset.cracking === 'true') {
            handleLeave()
        }
    }, 5000)
}

export default function CrackEffect() {
    useEffect(() => {
        const handleMouseDown = (e) => {
            // Find the closest button or clickable element
            const btn = e.target.closest('button, a, [role="button"]')
            if (btn && btn.dataset.cracking !== 'true') {
                applyCrackEffect(btn)
            }
        }

        document.addEventListener('mousedown', handleMouseDown, true)
        return () => document.removeEventListener('mousedown', handleMouseDown, true)
    }, [])

    return null
}
