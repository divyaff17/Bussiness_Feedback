import { useEffect, useRef } from 'react'

export default function FluidWave() {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        let animationFrameId
        let time = 0

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        // Create smooth curve points for the ribbon
        const createRibbonPath = (yOffset, amplitude, frequency, phase, width) => {
            const points = []
            const steps = 100
            
            for (let i = 0; i <= steps; i++) {
                const t = i / steps
                const x = t * (canvas.width + 400) - 200
                
                // Multiple sine waves for organic movement
                const y = yOffset + 
                    Math.sin(t * frequency + phase) * amplitude +
                    Math.sin(t * frequency * 2 + phase * 1.5) * (amplitude * 0.3) +
                    Math.sin(t * frequency * 0.5 + phase * 0.7) * (amplitude * 0.5)
                
                points.push({ x, y })
            }
            
            return points
        }

        // Draw a 3D ribbon effect
        const drawRibbon = (points, width, colors, shadowColor) => {
            if (points.length < 2) return

            // Draw shadow
            ctx.save()
            ctx.shadowColor = shadowColor
            ctx.shadowBlur = 50
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 20

            // Create gradient along the ribbon
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
            gradient.addColorStop(0, colors[0])
            gradient.addColorStop(0.3, colors[1])
            gradient.addColorStop(0.5, colors[2])
            gradient.addColorStop(0.7, colors[1])
            gradient.addColorStop(1, colors[0])

            // Draw the ribbon as a thick curved shape
            ctx.beginPath()
            
            // Top edge
            for (let i = 0; i < points.length; i++) {
                const p = points[i]
                if (i === 0) {
                    ctx.moveTo(p.x, p.y - width / 2)
                } else {
                    // Smooth curve using quadratic bezier
                    const prev = points[i - 1]
                    const cpX = (prev.x + p.x) / 2
                    const cpY = (prev.y + p.y) / 2 - width / 2
                    ctx.quadraticCurveTo(prev.x, prev.y - width / 2, cpX, cpY)
                }
            }
            
            // Connect to bottom edge at the end
            const lastPoint = points[points.length - 1]
            ctx.lineTo(lastPoint.x, lastPoint.y + width / 2)
            
            // Bottom edge (reverse)
            for (let i = points.length - 1; i >= 0; i--) {
                const p = points[i]
                if (i === points.length - 1) {
                    // Already at this point
                } else {
                    const next = points[i + 1]
                    const cpX = (next.x + p.x) / 2
                    const cpY = (next.y + p.y) / 2 + width / 2
                    ctx.quadraticCurveTo(next.x, next.y + width / 2, cpX, cpY)
                }
            }
            
            ctx.closePath()
            ctx.fillStyle = gradient
            ctx.fill()
            
            ctx.restore()

            // Add highlight on top edge
            ctx.beginPath()
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
            ctx.lineWidth = 2
            for (let i = 0; i < points.length; i++) {
                const p = points[i]
                if (i === 0) {
                    ctx.moveTo(p.x, p.y - width / 2 + 5)
                } else {
                    ctx.lineTo(p.x, p.y - width / 2 + 5)
                }
            }
            ctx.stroke()

            // Add secondary highlight
            ctx.beginPath()
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
            ctx.lineWidth = 1
            for (let i = 0; i < points.length; i++) {
                const p = points[i]
                if (i === 0) {
                    ctx.moveTo(p.x, p.y - width / 4)
                } else {
                    ctx.lineTo(p.x, p.y - width / 4)
                }
            }
            ctx.stroke()
        }

        const animate = () => {
            // Gradient background matching site theme
            const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
            bgGradient.addColorStop(0, '#1a0a2e')
            bgGradient.addColorStop(0.3, '#16082a')
            bgGradient.addColorStop(0.5, '#2d1b4e')
            bgGradient.addColorStop(0.7, '#1a0a2e')
            bgGradient.addColorStop(1, '#0d0515')
            ctx.fillStyle = bgGradient
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Add subtle radial glow
            const glowGradient = ctx.createRadialGradient(
                canvas.width * 0.3, canvas.height * 0.4, 0,
                canvas.width * 0.3, canvas.height * 0.4, canvas.width * 0.6
            )
            glowGradient.addColorStop(0, 'rgba(147, 51, 234, 0.15)')
            glowGradient.addColorStop(0.5, 'rgba(126, 34, 206, 0.08)')
            glowGradient.addColorStop(1, 'transparent')
            ctx.fillStyle = glowGradient
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw multiple ribbons with different animations
            
            // Main ribbon - large flowing wave
            const ribbon1Points = createRibbonPath(
                canvas.height * 0.5,
                canvas.height * 0.15,
                Math.PI * 2.5,
                time * 0.5,
                80
            )
            drawRibbon(
                ribbon1Points,
                120,
                ['#7c3aed', '#a855f7', '#c084fc'],
                'rgba(139, 92, 246, 0.5)'
            )

            // Secondary ribbon - thinner, different phase
            const ribbon2Points = createRibbonPath(
                canvas.height * 0.45,
                canvas.height * 0.12,
                Math.PI * 3,
                time * 0.4 + Math.PI,
                50
            )
            drawRibbon(
                ribbon2Points,
                60,
                ['#581c87', '#7e22ce', '#9333ea'],
                'rgba(126, 34, 206, 0.4)'
            )

            // Third ribbon - subtle background wave
            const ribbon3Points = createRibbonPath(
                canvas.height * 0.55,
                canvas.height * 0.1,
                Math.PI * 2,
                time * 0.3 + Math.PI * 0.5,
                40
            )
            drawRibbon(
                ribbon3Points,
                40,
                ['#4c1d95', '#6b21a8', '#7c3aed'],
                'rgba(107, 33, 168, 0.3)'
            )

            // Add floating particles
            for (let i = 0; i < 30; i++) {
                const px = (Math.sin(time * 0.3 + i * 0.5) * 0.5 + 0.5) * canvas.width
                const py = (Math.cos(time * 0.2 + i * 0.7) * 0.5 + 0.5) * canvas.height
                const size = 2 + Math.sin(time + i) * 1.5
                
                const particleGradient = ctx.createRadialGradient(px, py, 0, px, py, size * 3)
                particleGradient.addColorStop(0, 'rgba(196, 181, 253, 0.6)')
                particleGradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.2)')
                particleGradient.addColorStop(1, 'transparent')
                
                ctx.beginPath()
                ctx.arc(px, py, size * 3, 0, Math.PI * 2)
                ctx.fillStyle = particleGradient
                ctx.fill()
            }

            time += 0.008
            animationFrameId = requestAnimationFrame(animate)
        }

        resize()
        window.addEventListener('resize', resize)
        animate()

        return () => {
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0"
            style={{ zIndex: 0 }}
        />
    )
}
