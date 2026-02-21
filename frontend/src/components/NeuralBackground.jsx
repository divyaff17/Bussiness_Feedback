import { useEffect, useRef } from 'react'

export default function NeuralBackground() {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        let animationFrameId
        let particles = []
        let waveLines = []
        let faceParticles = []
        let time = 0

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            initParticles()
        }

        // Face silhouette points (normalized 0-1, will be scaled)
        const getFacePoints = () => {
            const centerX = canvas.width * 0.35
            const centerY = canvas.height * 0.5
            const scale = Math.min(canvas.width, canvas.height) * 0.4
            const points = []

            // Head outline
            for (let i = 0; i < 80; i++) {
                const angle = (i / 80) * Math.PI * 2
                const r = scale * (0.35 + Math.sin(angle * 2) * 0.05 + Math.sin(angle * 3) * 0.03)
                points.push({
                    x: centerX + Math.cos(angle) * r * 0.8,
                    y: centerY + Math.sin(angle) * r,
                    baseX: centerX + Math.cos(angle) * r * 0.8,
                    baseY: centerY + Math.sin(angle) * r,
                })
            }

            // Eye area (left)
            for (let i = 0; i < 15; i++) {
                const angle = (i / 15) * Math.PI * 2
                points.push({
                    x: centerX - scale * 0.12 + Math.cos(angle) * scale * 0.08,
                    y: centerY - scale * 0.08 + Math.sin(angle) * scale * 0.04,
                    baseX: centerX - scale * 0.12 + Math.cos(angle) * scale * 0.08,
                    baseY: centerY - scale * 0.08 + Math.sin(angle) * scale * 0.04,
                })
            }

            // Eye area (right)
            for (let i = 0; i < 15; i++) {
                const angle = (i / 15) * Math.PI * 2
                points.push({
                    x: centerX + scale * 0.12 + Math.cos(angle) * scale * 0.08,
                    y: centerY - scale * 0.08 + Math.sin(angle) * scale * 0.04,
                    baseX: centerX + scale * 0.12 + Math.cos(angle) * scale * 0.08,
                    baseY: centerY - scale * 0.08 + Math.sin(angle) * scale * 0.04,
                })
            }

            // Nose
            for (let i = 0; i < 8; i++) {
                points.push({
                    x: centerX + (Math.random() - 0.5) * scale * 0.05,
                    y: centerY + i * scale * 0.03,
                    baseX: centerX,
                    baseY: centerY + i * scale * 0.03,
                })
            }

            // Additional scatter particles around face
            for (let i = 0; i < 150; i++) {
                const angle = Math.random() * Math.PI * 2
                const dist = Math.random() * scale * 0.45
                points.push({
                    x: centerX + Math.cos(angle) * dist,
                    y: centerY + Math.sin(angle) * dist,
                    baseX: centerX + Math.cos(angle) * dist,
                    baseY: centerY + Math.sin(angle) * dist,
                })
            }

            return points.map(p => ({
                ...p,
                size: Math.random() * 2 + 1,
                brightness: Math.random() * 0.5 + 0.5,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.01,
            }))
        }

        // Wave lines flowing from the face
        const getWaveLines = () => {
            const lines = []
            const startX = canvas.width * 0.1
            const endX = canvas.width * 0.35
            const numLines = 25

            for (let i = 0; i < numLines; i++) {
                const y = canvas.height * (0.2 + (i / numLines) * 0.6)
                const points = []
                const numPoints = 50

                for (let j = 0; j < numPoints; j++) {
                    points.push({
                        x: startX + (j / numPoints) * (endX - startX),
                        baseY: y,
                        phase: Math.random() * Math.PI * 2,
                    })
                }

                lines.push({
                    points,
                    amplitude: 15 + Math.random() * 20,
                    frequency: 0.02 + Math.random() * 0.02,
                    speed: 0.02 + Math.random() * 0.02,
                    opacity: 0.2 + Math.random() * 0.3,
                })
            }

            return lines
        }

        // Network particles
        const getNetworkParticles = () => {
            const pts = []
            const count = 80

            for (let i = 0; i < count; i++) {
                pts.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1,
                })
            }

            return pts
        }

        const initParticles = () => {
            faceParticles = getFacePoints()
            waveLines = getWaveLines()
            particles = getNetworkParticles()
        }

        const drawFace = () => {
            // Draw face particles with glow
            faceParticles.forEach(p => {
                // Animate particle position
                p.x = p.baseX + Math.sin(time * p.speed + p.phase) * 3
                p.y = p.baseY + Math.cos(time * p.speed + p.phase) * 3

                // Pulsing brightness
                const brightness = p.brightness * (0.7 + Math.sin(time * 0.05 + p.phase) * 0.3)

                // Glow effect
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
                gradient.addColorStop(0, `rgba(0, 212, 255, ${brightness})`)
                gradient.addColorStop(0.5, `rgba(0, 150, 200, ${brightness * 0.3})`)
                gradient.addColorStop(1, 'rgba(0, 100, 150, 0)')

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
                ctx.fillStyle = gradient
                ctx.fill()

                // Core particle
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(200, 240, 255, ${brightness})`
                ctx.fill()
            })

            // Draw connections between nearby face particles
            ctx.strokeStyle = 'rgba(0, 180, 220, 0.1)'
            ctx.lineWidth = 0.5
            for (let i = 0; i < faceParticles.length; i++) {
                for (let j = i + 1; j < faceParticles.length; j++) {
                    const dx = faceParticles[i].x - faceParticles[j].x
                    const dy = faceParticles[i].y - faceParticles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < 40) {
                        ctx.beginPath()
                        ctx.moveTo(faceParticles[i].x, faceParticles[i].y)
                        ctx.lineTo(faceParticles[j].x, faceParticles[j].y)
                        ctx.globalAlpha = (1 - dist / 40) * 0.3
                        ctx.stroke()
                        ctx.globalAlpha = 1
                    }
                }
            }
        }

        const drawWaves = () => {
            waveLines.forEach(line => {
                ctx.beginPath()
                ctx.strokeStyle = `rgba(0, 180, 220, ${line.opacity})`
                ctx.lineWidth = 1

                line.points.forEach((point, index) => {
                    const y = point.baseY + Math.sin(time * line.speed + point.x * line.frequency + point.phase) * line.amplitude

                    if (index === 0) {
                        ctx.moveTo(point.x, y)
                    } else {
                        ctx.lineTo(point.x, y)
                    }
                })

                ctx.stroke()
            })
        }

        const drawNetworkParticles = () => {
            // Update positions
            particles.forEach(p => {
                p.x += p.vx
                p.y += p.vy

                // Bounce off edges
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1
            })

            // Draw connections
            ctx.strokeStyle = 'rgba(100, 80, 180, 0.15)'
            ctx.lineWidth = 0.5
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x
                    const dy = particles[i].y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < 150) {
                        ctx.beginPath()
                        ctx.moveTo(particles[i].x, particles[i].y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.globalAlpha = (1 - dist / 150) * 0.3
                        ctx.stroke()
                        ctx.globalAlpha = 1
                    }
                }
            }

            // Draw particles
            particles.forEach(p => {
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
                gradient.addColorStop(0, 'rgba(140, 100, 220, 0.8)')
                gradient.addColorStop(1, 'rgba(100, 60, 180, 0)')

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
                ctx.fillStyle = gradient
                ctx.fill()

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(180, 160, 255, 0.9)'
                ctx.fill()
            })
        }

        const animate = () => {
            // Dark gradient background
            const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
            bgGradient.addColorStop(0, '#0a0a12')
            bgGradient.addColorStop(0.5, '#0d0d1a')
            bgGradient.addColorStop(1, '#0a0a12')
            ctx.fillStyle = bgGradient
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw elements
            drawNetworkParticles()
            drawWaves()
            drawFace()

            time += 1
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
