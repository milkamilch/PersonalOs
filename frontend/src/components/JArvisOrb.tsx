import { useEffect, useRef } from 'react'

interface Props {
  size?: number
  pulsing?: boolean
}

interface Spark {
  x: number; y: number; vx: number; vy: number; life: number; size: number
}

interface Node3D {
  ox: number; oy: number; oz: number  // original on sphere
  x: number; y: number; z: number    // projected
  size: number; brightness: number; flicker: number
}

export default function JArvisOrb({ size = 200, pulsing = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pulsingRef = useRef(pulsing)
  const animRef = useRef(0)

  pulsingRef.current = pulsing

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = size, H = size
    canvas.width = W
    canvas.height = H
    const cx = W / 2, cy = H / 2
    const R = size * 0.35   // sphere radius

    // ── Sphere nodes ──────────────────────────────────────────────────────
    const nodes: Node3D[] = []
    // latitude/longitude grid intersections
    const LATS = 7, LONS = 12
    for (let i = 1; i < LATS; i++) {
      const phi = (Math.PI * i) / LATS
      for (let j = 0; j < LONS; j++) {
        const theta = (2 * Math.PI * j) / LONS
        nodes.push({
          ox: Math.sin(phi) * Math.cos(theta),
          oy: Math.cos(phi),
          oz: Math.sin(phi) * Math.sin(theta),
          x: 0, y: 0, z: 0,
          size: Math.random() * 1.5 + 0.5,
          brightness: Math.random(),
          flicker: Math.random() * Math.PI * 2,
        })
      }
    }
    // some random surface points for extra sparks
    for (let i = 0; i < 20; i++) {
      const u = Math.random() * 2 - 1
      const t = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      nodes.push({
        ox: s * Math.cos(t), oy: u, oz: s * Math.sin(t),
        x: 0, y: 0, z: 0,
        size: Math.random() * 1 + 0.3,
        brightness: Math.random(),
        flicker: Math.random() * Math.PI * 2,
      })
    }

    // ── Sparks ────────────────────────────────────────────────────────────
    const sparks: Spark[] = []
    const spawnSpark = () => {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 2 + 1
      sparks.push({
        x: cx + Math.cos(angle) * R * (0.9 + Math.random() * 0.2),
        y: cy + Math.sin(angle) * R * (0.9 + Math.random() * 0.2),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: Math.random() * 1.5 + 0.5,
      })
    }

    // ── Rotation state ────────────────────────────────────────────────────
    let rotY = 0, rotX = 0.25

    const project = (nx: number, ny: number, nz: number) => {
      // rotate Y
      const x1 = nx * Math.cos(rotY) + nz * Math.sin(rotY)
      const z1 = -nx * Math.sin(rotY) + nz * Math.cos(rotY)
      // rotate X
      const y2 = ny * Math.cos(rotX) - z1 * Math.sin(rotX)
      const z2 = ny * Math.sin(rotX) + z1 * Math.cos(rotX)
      return { px: cx + x1 * R, py: cy + y2 * R, pz: z2 }
    }

    let t = 0

    const draw = () => {
      t += 0.008
      rotY = t * 0.4
      const pulse = pulsingRef.current

      ctx.clearRect(0, 0, W, H)

      // ── Outer glow ───────────────────────────────────────────────────
      const outerGrad = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.5)
      outerGrad.addColorStop(0, `rgba(255,160,0,${pulse ? 0.18 : 0.10})`)
      outerGrad.addColorStop(0.5, `rgba(255,100,0,${pulse ? 0.08 : 0.04})`)
      outerGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = outerGrad
      ctx.fill()

      // ── Update & project nodes ───────────────────────────────────────
      nodes.forEach(n => {
        const { px, py, pz } = project(n.ox, n.oy, n.oz)
        n.x = px; n.y = py; n.z = pz
        n.flicker += 0.05
        n.brightness = 0.5 + 0.5 * Math.sin(n.flicker)
      })

      // ── Draw latitude rings (back half, dimmer) ───────────────────────
      for (let i = 1; i < LATS; i++) {
        const phi = (Math.PI * i) / LATS
        const pts: { x: number; y: number; z: number }[] = []
        for (let j = 0; j <= 60; j++) {
          const theta = (2 * Math.PI * j) / 60
          const { px, py, pz } = project(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
          )
          pts.push({ x: px, y: py, z: pz })
        }
        drawRing(ctx, pts)
      }

      // ── Draw longitude rings ──────────────────────────────────────────
      for (let j = 0; j < LONS; j++) {
        const theta = (2 * Math.PI * j) / LONS
        const pts: { x: number; y: number; z: number }[] = []
        for (let i = 0; i <= 40; i++) {
          const phi = (Math.PI * i) / 40
          const { px, py, pz } = project(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
          )
          pts.push({ x: px, y: py, z: pz })
        }
        drawRing(ctx, pts)
      }

      // ── Electric connections between nearby front nodes ───────────────
      const frontNodes = nodes.filter(n => n.z > -0.1).sort((a, b) => b.z - a.z)
      for (let i = 0; i < frontNodes.length; i++) {
        for (let j = i + 1; j < frontNodes.length; j++) {
          const a = frontNodes[i], b = frontNodes[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = R * 0.55
          if (dist < maxDist) {
            const strength = (1 - dist / maxDist) * ((a.z + b.z) / 2 + 1) / 2
            const flicker = Math.random() > 0.92 ? Math.random() * 0.6 : 0
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            // slight arc for electric feel
            const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 4
            const my = (a.y + b.y) / 2 + (Math.random() - 0.5) * 4
            ctx.quadraticCurveTo(mx, my, b.x, b.y)
            ctx.strokeStyle = `rgba(255,${160 + Math.floor(flicker * 60)},0,${strength * 0.5 + flicker})`
            ctx.lineWidth = flicker > 0 ? 0.8 : 0.4
            ctx.stroke()
          }
        }
      }

      // ── Draw nodes ────────────────────────────────────────────────────
      frontNodes.forEach(n => {
        const depth = (n.z + 1) / 2  // 0-1
        const alpha = 0.4 + depth * 0.6
        const r = n.size * (0.5 + depth)

        // glow
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4)
        g.addColorStop(0, `rgba(255,200,50,${alpha * n.brightness * 0.8})`)
        g.addColorStop(1, 'rgba(255,100,0,0)')
        ctx.beginPath()
        ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()

        // core dot
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,230,100,${alpha})`
        ctx.fill()
      })

      // ── Center core / eye ─────────────────────────────────────────────
      const coreR = R * 0.22
      const pulseFactor = pulse ? 1 + 0.15 * Math.sin(t * 6) : 1 + 0.05 * Math.sin(t * 2)

      // outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * 1.6 * pulseFactor, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,180,0,0.4)`
      ctx.lineWidth = 0.8
      ctx.stroke()

      // inner ring
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * 1.1 * pulseFactor, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,220,50,0.7)`
      ctx.lineWidth = 1
      ctx.stroke()

      // dark eye
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * pulseFactor, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(10,5,0,0.85)'
      ctx.fill()

      // core glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5 * pulseFactor)
      cg.addColorStop(0, `rgba(255,240,180,${pulse ? 0.9 : 0.7})`)
      cg.addColorStop(0.3, `rgba(255,160,0,${pulse ? 0.5 : 0.35})`)
      cg.addColorStop(0.7, `rgba(200,80,0,0.15)`)
      cg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * 2.5 * pulseFactor, 0, Math.PI * 2)
      ctx.fillStyle = cg
      ctx.fill()

      // pupil glint
      ctx.beginPath()
      ctx.arc(cx - coreR * 0.15, cy - coreR * 0.15, coreR * 0.25, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,200,${pulse ? 0.9 : 0.6})`
      ctx.fill()

      // ── Sparks ────────────────────────────────────────────────────────
      if (Math.random() < (pulse ? 0.4 : 0.15)) spawnSpark()
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx; s.y += s.vy
        s.vx *= 0.93; s.vy *= 0.93
        s.life -= 0.045
        if (s.life <= 0) { sparks.splice(i, 1); continue }
        const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3)
        sg.addColorStop(0, `rgba(255,240,150,${s.life})`)
        sg.addColorStop(1, 'rgba(255,100,0,0)')
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = sg
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  return <canvas ref={canvasRef} width={size} height={size} />
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number; z: number }[]
) {
  if (pts.length < 2) return
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const avgZ = (a.z + b.z) / 2
    if (avgZ < -0.5) continue  // skip far back
    const alpha = Math.max(0, (avgZ + 1) / 2) * 0.35
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = `rgba(255,160,0,${alpha})`
    ctx.lineWidth = avgZ > 0 ? 0.6 : 0.25
    ctx.stroke()
  }
}
