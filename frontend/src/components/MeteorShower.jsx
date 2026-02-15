import { useEffect, useRef } from 'react'

export default function MeteorShower() {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        let animationFrameId

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        // Meteor class
        class Meteor {
            constructor() {
                this.reset()
            }

            reset() {
                // Start from top-right area, moving to bottom-left
                this.x = Math.random() * canvas.width + canvas.width * 0.3
                this.y = -50 - Math.random() * 200
                
                // Length and speed
                this.length = 80 + Math.random() * 120
                this.speed = 8 + Math.random() * 6
                
                // Angle (diagonal from top-right to bottom-left, roughly 225 degrees)
                this.angle = (Math.PI / 4) + (Math.random() * 0.3 - 0.15) // ~45 degrees with slight variation
                
                // Opacity and thickness
                this.opacity = 0.4 + Math.random() * 0.5
                this.thickness = 1 + Math.random() * 1.5
                
                // Trail particles
                this.trail = []
                this.maxTrailLength = 8
            }

            update() {
                // Move meteor
                this.x -= Math.cos(this.angle) * this.speed
                this.y += Math.sin(this.angle) * this.speed

                // Add current position to trail
                this.trail.unshift({ x: this.x, y: this.y, opacity: this.opacity })
                
                // Limit trail length
                if (this.trail.length > this.maxTrailLength) {
                    this.trail.pop()
                }

                // Reset if off screen
                if (this.y > canvas.height + 100 || this.x < -100) {
                    this.reset()
                }
            }

            draw() {
                // Calculate end point of meteor
                const endX = this.x + Math.cos(this.angle) * this.length
                const endY = this.y - Math.sin(this.angle) * this.length

                // Create gradient for meteor
                const gradient = ctx.createLinearGradient(endX, endY, this.x, this.y)
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
                gradient.addColorStop(0.3, `rgba(100, 200, 255, ${this.opacity * 0.3})`)
                gradient.addColorStop(0.7, `rgba(150, 220, 255, ${this.opacity * 0.7})`)
                gradient.addColorStop(1, `rgba(200, 240, 255, ${this.opacity})`)

                // Draw meteor line
                ctx.beginPath()
                ctx.moveTo(endX, endY)
                ctx.lineTo(this.x, this.y)
                ctx.strokeStyle = gradient
                ctx.lineWidth = this.thickness
                ctx.lineCap = 'round'
                ctx.stroke()

                // Draw bright head
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.thickness + 1, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(200, 240, 255, ${this.opacity})`
                ctx.fill()

                // Draw glow around head
                const glowGradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, 8
                )
                glowGradient.addColorStop(0, `rgba(100, 200, 255, ${this.opacity * 0.5})`)
                glowGradient.addColorStop(1, 'rgba(100, 200, 255, 0)')
                ctx.beginPath()
                ctx.arc(this.x, this.y, 8, 0, Math.PI * 2)
                ctx.fillStyle = glowGradient
                ctx.fill()
            }
        }

        // Create meteors
        const meteors = []
        const meteorCount = 12

        for (let i = 0; i < meteorCount; i++) {
            const meteor = new Meteor()
            // Stagger initial positions
            meteor.y = Math.random() * canvas.height * 1.5 - canvas.height * 0.5
            meteor.x = Math.random() * canvas.width * 1.5
            meteors.push(meteor)
        }

        const animate = () => {
            // Dark navy/black gradient background
            const bgGradient = ctx.createRadialGradient(
                canvas.width * 0.5, canvas.height * 0.7, 0,
                canvas.width * 0.5, canvas.height * 0.7, canvas.width * 0.8
            )
            bgGradient.addColorStop(0, '#0a1628')
            bgGradient.addColorStop(0.5, '#06101c')
            bgGradient.addColorStop(1, '#020810')
            ctx.fillStyle = bgGradient
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Update and draw meteors
            meteors.forEach(meteor => {
                meteor.update()
                meteor.draw()
            })

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
