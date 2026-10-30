// うなずきマスター 本体。3D は three.js（vendor/）、文言は data.js、音は snd.js
import * as THREE from './vendor/three.module.js'

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t
const STEP = 1 / 60
const touchDev = (window.matchMedia && matchMedia('(pointer:coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0)
const S = { lang: 'ja', view: 'title', paused: false, firstPlay: true, time: 0 }
const T = k => UI[S.lang][k]
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const pick = (r, a) => a[Math.floor(r() * a.length)]

// ================= 3D =================
const canvas = $('#gl')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touchDev ? 1.75 : 2))
const scene = new THREE.Scene()
scene.background = new THREE.Color('#d9ddd2')
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60)
scene.add(new THREE.HemisphereLight('#ffffff', '#7d8597', 2.1))
const sun = new THREE.DirectionalLight('#fff6e8', 1.6); sun.position.set(2, 5, 4); scene.add(sun)

const matCache = {}
const M = (c, o) => { const k = c + (o ? JSON.stringify(o) : ''); return matCache[k] || (matCache[k] = new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...(o || {}) })) }
function add(parent, geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m }
const box = (p, w, h, d, c, x, y, z) => add(p, new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c) : c, x, y, z)
const sph = (p, r, c, x, y, z, det = 1) => add(p, new THREE.IcosahedronGeometry(r, det), typeof c === 'string' ? M(c) : c, x, y, z)
const cyl = (p, rt, rb, h, c, x, y, z, seg = 8) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === 'string' ? M(c) : c, x, y, z)
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t }

// ---------- 会議室
const room = new THREE.Group(); scene.add(room)
;(() => {
  const floorTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#76839a'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke() } })
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(7, 5)
  const floor = add(room, new THREE.PlaneGeometry(14, 10), new THREE.MeshLambertMaterial({ map: floorTex }), 0, 0, -1); floor.rotation.x = -Math.PI / 2
  add(room, new THREE.PlaneGeometry(14, 6), M('#ebe6d8'), 0, 3, -3.4)
  const lw = add(room, new THREE.PlaneGeometry(10, 6), M('#e2dccb'), -3.8, 3, 1.6); lw.rotation.y = Math.PI / 2
  const rw = add(room, new THREE.PlaneGeometry(10, 6), M('#e2dccb'), 3.8, 3, 1.6); rw.rotation.y = -Math.PI / 2
  box(room, 14, 0.12, 0.04, '#b9b1a0', 0, 0.06, -3.38)
  // 窓（ビルの景色）
  const sky = canvasTex(512, 160, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fc6ef'); g.addColorStop(1, '#d6ecfa'); x.fillStyle = g; x.fillRect(0, 0, w, h)
    const r = rng(7); let px = 0
    while (px < w) { const bw = 24 + r() * 40, bh = 40 + r() * 100, c = ['#8a9bb3', '#9fb0c4', '#7d8ea8', '#b1bccb'][Math.floor(r() * 4)]; x.fillStyle = c; x.fillRect(px, h - bh, bw, bh)
      x.fillStyle = 'rgba(255,255,255,.45)'; for (let yy = h - bh + 6; yy < h - 4; yy += 10) for (let xx = px + 4; xx < px + bw - 4; xx += 8) if (r() > 0.3) x.fillRect(xx, yy, 4, 5); px += bw + 2 }
  })
  add(room, new THREE.PlaneGeometry(5.6, 1.7), new THREE.MeshBasicMaterial({ map: sky }), -0.6, 2.05, -3.37)
  for (let i = 0; i <= 4; i++) box(room, 0.06, 1.8, 0.06, '#c9ccd2', -3.4 + i * 1.4, 2.05, -3.34)
  box(room, 5.7, 0.07, 0.08, '#c9ccd2', -0.6, 2.93, -3.34); box(room, 5.7, 0.1, 0.14, '#c9ccd2', -0.6, 1.17, -3.32)
  // 机
  box(room, 1.35, 0.07, 3.8, '#c08a55', 0.05, 0.74, -1.0)
  box(room, 0.12, 0.7, 3.2, '#5a5f6a', 0.05, 0.36, -1.0)
  box(room, 0.9, 0.04, 0.5, '#5a5f6a', 0.05, 0.02, 0.5); box(room, 0.9, 0.04, 0.5, '#5a5f6a', 0.05, 0.02, -2.5)
  // 机の上の小物
  const cup = cyl(room, 0.045, 0.038, 0.1, '#ffffff', -0.38, 0.83, 0.42, 10); cyl(room, 0.04, 0.04, 0.005, '#5b3a1f', -0.38, 0.876, 0.42, 10)
  const nb = add(room, new THREE.BoxGeometry(0.3, 0.012, 0.22), [M('#ddd'), M('#ddd'), new THREE.MeshLambertMaterial({ map: canvasTex(128, 96, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#9cc3e6'; x.lineWidth = 1; for (let y = 12; y < h; y += 10) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke() }
    x.strokeStyle = '#333'; x.lineWidth = 2; x.beginPath(); x.arc(60, 50, 22, 0, 7); x.stroke(); x.beginPath(); x.moveTo(48, 46); x.lineTo(56, 46); x.moveTo(64, 46); x.lineTo(72, 46); x.stroke(); x.beginPath(); x.arc(60, 60, 6, 0, 3.14); x.stroke()
    x.beginPath(); for (let k = 0; k < 6; k++) { x.moveTo(90, 20 + k * 6); x.lineTo(118, 22 + k * 6) } x.stroke()
  }) }), M('#ddd'), M('#ddd'), M('#ddd')], -0.36, 0.785, 0.05)
  nb.rotation.y = 0.25
  box(room, 0.16, 0.012, 0.012, '#1d4fd8', -0.3, 0.8, 0.12).rotation.y = -0.6
  cyl(room, 0.035, 0.035, 0.2, M('#bfe3ff', { transparent: true, opacity: 0.7 }), 0.5, 0.88, 0.25, 8); cyl(room, 0.02, 0.02, 0.03, '#2a6fd8', 0.5, 0.995, 0.25, 8)
  // 植木
  cyl(room, 0.22, 0.17, 0.4, '#a0603a', -3.1, 0.2, -2.6); for (let i = 0; i < 6; i++) sph(room, 0.28 - i * 0.02, '#3f8f4f', -3.1 + Math.sin(i * 2) * 0.12, 0.6 + i * 0.16, -2.6 + Math.cos(i * 2) * 0.12, 0)
})()
// 空いている椅子
function makeChair(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  box(g, 0.46, 0.08, 0.44, '#2b2d34', 0, 0.48, 0); box(g, 0.44, 0.55, 0.07, '#2b2d34', 0, 0.82, -0.22); cyl(g, 0.03, 0.03, 0.4, '#777', 0, 0.26, 0, 6)
  for (let i = 0; i < 5; i++) { const l = box(g, 0.05, 0.03, 0.3, '#444', Math.sin(i * 1.256) * 0.14, 0.04, Math.cos(i * 1.256) * 0.14); l.rotation.y = i * 1.256 }
  return g
}
makeChair(room, -0.98, -1.25, Math.PI / 2); makeChair(room, -0.98, -2.2, Math.PI / 2); makeChair(room, 1.08, -1.25, -Math.PI / 2); makeChair(room, 1.08, -2.2, -Math.PI / 2)
// ホワイトボード（言語で描き直す）
const wbMat = new THREE.MeshLambertMaterial({ color: '#ffffff' })
;(() => {
  const g = new THREE.Group(); g.position.set(2.35, 0, -1.25); g.rotation.y = -0.62; room.add(g)
  box(g, 2.1, 1.3, 0.05, '#aeb3ba', 0, 1.55, 0); add(g, new THREE.PlaneGeometry(2.0, 1.2), wbMat, 0, 1.55, 0.03)
  box(g, 0.05, 0.9, 0.05, '#888', -0.9, 0.45, 0); box(g, 0.05, 0.9, 0.05, '#888', 0.9, 0.45, 0); box(g, 2.0, 0.05, 0.12, '#aeb3ba', 0, 0.9, 0.05)
})()
function drawBoard() {
  const ja = S.lang === 'ja'
  if (wbMat.map) wbMat.map.dispose()
  wbMat.map = canvasTex(640, 384, (x, w, h) => {
    x.fillStyle = '#fbfbf8'; x.fillRect(0, 0, w, h)
    x.font = '900 40px ' + getComputedStyle(document.body).fontFamily; x.fillStyle = '#1d4fd8'; x.fillText(ja ? '第4四半期 バリュー戦略' : 'Q4 VALUE STRATEGY', 26, 56)
    x.strokeStyle = '#222'; x.lineWidth = 4; x.beginPath(); x.moveTo(40, 320); x.lineTo(40, 100); x.moveTo(40, 320); x.lineTo(330, 320); x.stroke()
    x.strokeStyle = '#d7263d'; x.lineWidth = 7; x.beginPath(); x.moveTo(50, 300); x.lineTo(120, 280); x.lineTo(170, 295); x.lineTo(230, 240); x.lineTo(270, 250); x.lineTo(330, 80); x.stroke()
    x.fillStyle = '#d7263d'; x.beginPath(); x.moveTo(345, 50); x.lineTo(310, 82); x.lineTo(345, 96); x.fill()
    x.font = '900 28px sans-serif'; x.fillStyle = '#222'; x.fillText(ja ? '気合' : 'GRIT', 250, 160)
    x.fillStyle = '#ffe36e'; x.fillRect(390, 90, 210, 120); x.fillStyle = '#222'; x.font = '900 30px ' + getComputedStyle(document.body).fontFamily
    x.fillText(ja ? 'シナジー' : 'SYNERGY', 410, 140); x.fillText(ja ? '×∞' : 'x INFINITY', 410, 185)
    x.font = '900 30px ' + getComputedStyle(document.body).fontFamily; x.fillStyle = '#1d4fd8'
    x.fillText(ja ? '売上 = 気合 × 根性' : 'SALES = GRIT x HUSTLE', 360, 270)
    x.strokeStyle = '#d7263d'; x.lineWidth = 4; x.beginPath(); x.ellipse(490, 325, 110, 36, 0, 0, 7); x.stroke()
    x.fillStyle = '#d7263d'; x.fillText(ja ? '全集中！' : 'FOCUS!!', 420, 336)
  })
  wbMat.needsUpdate = true
}
// 壁の時計（会議中は長針が回る）
const clock = new THREE.Group(); clock.position.set(-2.6, 2.55, -3.36); room.add(clock)
cyl(clock, 0.24, 0.24, 0.05, '#ffffff', 0, 0, 0, 16).rotation.x = Math.PI / 2
add(clock, new THREE.TorusGeometry(0.24, 0.025, 6, 16), M('#333'))
const hourH = new THREE.Group(); clock.add(hourH); box(hourH, 0.025, 0.12, 0.01, '#222', 0, 0.06, 0.035)
const minH = new THREE.Group(); clock.add(minH); box(minH, 0.018, 0.19, 0.01, '#222', 0, 0.095, 0.04)

// ---------- 上司（立って話す）
function buildBoss() {
  const g = new THREE.Group(); g.position.set(1.15, 0, 0); g.rotation.y = -Math.PI / 2 + 0.7; scene.add(g)
  const skin = new THREE.MeshLambertMaterial({ color: '#f0bf98', flatShading: true })
  const suit = '#4a4f5c'
  box(g, 0.17, 0.86, 0.2, '#3a3e48', -0.12, 0.43, 0); box(g, 0.17, 0.86, 0.2, '#3a3e48', 0.12, 0.43, 0)
  box(g, 0.2, 0.08, 0.3, '#1b1b1f', -0.12, 0.04, 0.05); box(g, 0.2, 0.08, 0.3, '#1b1b1f', 0.12, 0.04, 0.05)
  const body = new THREE.Group(); body.position.y = 0.86; g.add(body)
  cyl(body, 0.32, 0.36, 0.72, suit, 0, 0.36, 0, 10)
  const belly = sph(body, 0.34, new THREE.MeshLambertMaterial({ color: '#f4f7ff' }), 0, 0.2, 0.1, 3); belly.scale.set(1, 0.9, 1)
  box(body, 0.6, 0.06, 0.4, '#222', 0, 0.02, 0.06)
  box(body, 0.06, 0.06, 0.02, '#c9a227', 0, 0.02, 0.27)
  // ネクタイ（腹の丸みに沿う）
  const tie = new THREE.Group(); tie.position.set(0, 0.66, 0.31); body.add(tie)
  box(tie, 0.09, 0.07, 0.05, '#b51d31', 0, 0, 0)
  const t1 = box(tie, 0.08, 0.28, 0.02, '#d7263d', 0, -0.16, 0.03); t1.rotation.x = -0.25
  const t2 = box(tie, 0.11, 0.2, 0.02, '#d7263d', 0, -0.39, 0.12); t2.rotation.x = -0.55
  const t3 = box(tie, 0.08, 0.08, 0.02, '#d7263d', 0, -0.5, 0.19); t3.rotation.set(-0.55, 0, Math.PI / 4)
  box(body, 0.2, 0.08, 0.2, '#ffffff', 0, 0.7, 0.18)
  // 腕
  const arm = side => {
    const sh = new THREE.Group(); sh.position.set(side * 0.38, 0.62, 0); body.add(sh)
    cyl(sh, 0.085, 0.075, 0.52, suit, 0, -0.24, 0, 6)
    sph(sh, 0.075, skin, 0, -0.52, 0, 0)
    sh.rotation.z = side * 0.15
    return sh
  }
  const armL = arm(1), armR = arm(-1)
  // 頭
  const head = new THREE.Group(); head.position.set(0, 0.74, 0.02); body.add(head)
  const hm = sph(head, 0.27, skin, 0, 0.26, 0, 1); hm.scale.set(1, 1.07, 1)
  const F = new THREE.Group(); F.position.y = 0.26; head.add(F)
  // バーコード頭
  for (const s of [-1, 1]) { const h = sph(F, 0.09, '#7a7a7a', s * 0.235, 0.03, -0.08, 1); h.scale.set(0.55, 0.9, 1.3) }
  const bh = sph(F, 0.2, '#7a7a7a', 0, -0.02, -0.12, 1); bh.scale.set(1.15, 0.6, 0.8)
  for (let i = 0; i < 4; i++) { const zz = -0.1 + i * 0.065, rr = Math.sqrt(0.27 * 0.27 - zz * zz) + 0.008; const s = add(F, new THREE.TorusGeometry(rr, 0.009, 3, 14, Math.PI * 0.84), M('#555'), 0, 0, zz); s.rotation.z = Math.PI * 0.08; s.scale.y = 1.07 }
  sph(F, 0.06, skin, -0.27, 0, 0, 0); sph(F, 0.06, skin, 0.27, 0, 0, 0)
  // 顔
  const z0 = (x, y) => Math.sqrt(Math.max(0, 0.27 * 0.27 - x * x - y * y)) + 0.01
  for (const s of [-1, 1]) {
    const ring = add(F, new THREE.TorusGeometry(0.06, 0.012, 5, 10), M('#1b1b1f'), s * 0.09, 0.04, z0(0.09, 0.04) + 0.02)
    sph(F, 0.022, '#111', s * 0.09, 0.04, z0(0.09, 0.04) - 0.005, 0)
    void ring
  }
  box(F, 0.06, 0.012, 0.012, '#1b1b1f', 0, 0.05, z0(0, 0.05) + 0.02)
  const browL = box(F, 0.1, 0.03, 0.03, '#555', 0.09, 0.13, z0(0.09, 0.13)), browR = box(F, 0.1, 0.03, 0.03, '#555', -0.09, 0.13, z0(0.09, 0.13))
  sph(F, 0.05, '#e59c7c', 0, -0.03, z0(0, -0.03), 0)
  const must = box(F, 0.16, 0.04, 0.04, '#555', 0, -0.09, z0(0, -0.09)); must.rotation.x = -0.3
  const mouth = new THREE.Group(); mouth.position.set(0, -0.15, z0(0, -0.15) - 0.01); F.add(mouth)
  box(mouth, 0.12, 0.02, 0.03, '#6e1420', 0, 0, 0); box(mouth, 0.1, 0.006, 0.032, '#fff', 0, 0.006, 0.002)
  const cheekM = M('#f08f86')
  sph(F, 0.04, cheekM, 0.17, -0.06, z0(0.17, -0.06) - 0.02, 0).scale.z = 0.4; sph(F, 0.04, cheekM, -0.17, -0.06, z0(0.17, -0.06) - 0.02, 0).scale.z = 0.4
  // 怒りマーク・汗・湯気
  const vein = new THREE.Group(); vein.position.set(0.12, 0.2, z0(0.12, 0.2)); F.add(vein); vein.visible = false
  for (let i = 0; i < 4; i++) { const b = box(vein, 0.06, 0.015, 0.015, '#d7263d', 0, 0, 0); b.rotation.z = i * Math.PI / 2 + Math.PI / 4; b.position.set(Math.cos(i * Math.PI / 2) * 0.03, Math.sin(i * Math.PI / 2) * 0.03, 0) }
  const sweatM = new THREE.MeshLambertMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.9 })
  const sweat = [0, 1, 2, 3].map(i => { const d = sph(F, 0.03, sweatM, 0, 0, 0, 0); d.scale.set(0.8, 1.3, 0.8); d.userData.ph = i * 0.27; d.userData.side = i % 2 ? 1 : -1; return d })
  const steamM = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 })
  const steam = [0, 1, 2, 3, 4].map(i => { const d = sph(F, 0.07, steamM, 0, 0.3, 0, 0); d.userData.ph = i / 5; d.visible = false; return d })
  return { g, body, head, F, mouth, browL, browR, armL, armR, tie, skin, vein, sweat, steam }
}
// ---------- 部下（自分。座って聞く）
function buildSub() {
  const g = new THREE.Group(); g.position.set(-0.95, 0, 0.02); g.rotation.y = Math.PI / 2 - 0.55; scene.add(g)
  makeChair(g, 0, -0.04, 0)
  const skin = '#f6cba8', suit = '#22305a'
  const body = new THREE.Group(); body.position.y = 0.52; g.add(body)
  box(body, 0.34, 0.14, 0.42, '#1b2444', 0, 0.02, 0.12)
  for (const s of [-1, 1]) { box(body, 0.13, 0.46, 0.13, '#1b2444', s * 0.09, -0.25, 0.34); box(body, 0.14, 0.07, 0.24, '#111', s * 0.09, -0.48, 0.4) }
  const torso = new THREE.Group(); body.add(torso)
  cyl(torso, 0.2, 0.22, 0.52, suit, 0, 0.3, 0, 8)
  box(torso, 0.13, 0.36, 0.02, '#ffffff', 0, 0.36, 0.2).rotation.x = -0.05
  box(torso, 0.05, 0.3, 0.02, '#2b67c9', 0, 0.34, 0.215)
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.24, 0.5, 0); torso.add(sh); sh.rotation.x = -0.95
    cyl(sh, 0.065, 0.06, 0.42, suit, 0, -0.2, 0, 6); sph(sh, 0.055, skin, 0, -0.42, 0.02, 0)
  }
  const head = new THREE.Group(); head.position.set(0, 0.58, 0.02); torso.add(head)
  const hm = sph(head, 0.2, skin, 0, 0.2, 0, 1); void hm
  const F = new THREE.Group(); F.position.y = 0.2; head.add(F)
  // 髪
  const hair = sph(F, 0.215, '#1a1a22', 0, 0.05, -0.03, 1); hair.scale.set(1, 0.85, 1)
  const fr = box(F, 0.36, 0.08, 0.1, '#1a1a22', 0, 0.13, 0.13); fr.rotation.x = 0.35
  sph(F, 0.045, skin, -0.2, -0.01, 0, 0); sph(F, 0.045, skin, 0.2, -0.01, 0, 0)
  const z0 = (x, y) => Math.sqrt(Math.max(0, 0.2 * 0.2 - x * x - y * y))
  const eyes = [], lids = [], pupils = []
  const lidM = M('#ecbd98')
  for (const s of [-1, 1]) {
    const ex = s * 0.075, ey = 0.01, ez = z0(ex, ey) - 0.022
    const piv = new THREE.Group(); piv.position.set(ex, ey, ez); F.add(piv)
    sph(piv, 0.048, '#ffffff', 0, 0, 0, 1)
    const p = sph(piv, 0.022, '#15151a', 0, 0, 0.04, 0); p.scale.z = 0.5; pupils.push(p)
    const lid = add(F, new THREE.SphereGeometry(0.053, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lidM, ex, ey, ez)
    eyes.push(piv); lids.push(lid)
  }
  const brows = [-1, 1].map(s => box(F, 0.08, 0.018, 0.02, '#1a1a22', s * 0.075, 0.085, z0(0.075, 0.085)))
  const mouth = new THREE.Group(); mouth.position.set(0, -0.09, z0(0, -0.09) - 0.005); F.add(mouth)
  box(mouth, 0.07, 0.016, 0.02, '#7a2430', 0, 0, 0)
  sph(F, 0.025, '#eab48f', 0, -0.03, z0(0, -0.03), 0)
  // 鼻ちょうちん・よだれ・汗
  const snot = sph(F, 0.06, new THREE.MeshLambertMaterial({ color: '#cfefff', transparent: true, opacity: 0.55 }), 0.02, -0.06, z0(0, -0.04) + 0.04, 1); snot.visible = false
  const drool = sph(F, 0.018, new THREE.MeshLambertMaterial({ color: '#9fdcff', transparent: true, opacity: 0.85 }), 0.03, -0.12, z0(0.03, -0.12), 0); drool.visible = false
  const sw = sph(F, 0.03, new THREE.MeshLambertMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.9 }), 0.17, 0.1, 0.08, 0); sw.scale.set(0.8, 1.3, 0.8); sw.visible = false
  return { g, body, torso, head, F, eyes, lids, pupils, brows, mouth, snot, drool, sw }
}
const B = buildBoss(), U = buildSub()

// ---------- アニメの状態
const A = {
  t: 0, talking: false, talkAmt: 0, anger: 0, happy: 0, expect: 0, lean: 0,
  nodT: -1, nodBig: 0, startle: -1, smile: 0, blinkT: 2, blink: 0, sleepVis: 0, asleep: false, pose: 'none', mash: 0, slam: -1,
}
const SKIN = new THREE.Color('#f0bf98'), RED = new THREE.Color('#ff5b4a'), tmpC = new THREE.Color()
function animate(dt) {
  A.t += dt; const t = A.t
  // ---- 上司
  A.talkAmt = lerp(A.talkAmt, A.talking ? 1 : 0, 0.25)
  A.anger = Math.max(0, A.anger - dt * 0.45); A.happy = Math.max(0, A.happy - dt * 0.5)
  const ang = A.anger, mad = A.bossPose === 'mad' ? 1 : 0, glad = A.bossPose === 'glad' ? 1 : 0
  const angry = Math.max(ang, mad)
  const flap = A.talkAmt * Math.abs(Math.sin(t * 17)) * (1 + Math.sin(t * 5.3) * 0.3)
  B.mouth.scale.y = 1 + flap * 5 + angry * 6 + glad * 1.5
  B.mouth.scale.x = 1 + angry * 0.4 + (A.happy + glad) * 0.4
  B.head.rotation.x = A.talkAmt * Math.sin(t * 6.5) * 0.06 - A.expect * 0.12 - angry * 0.1
  B.head.rotation.z = A.expect * 0.22 + A.talkAmt * Math.sin(t * 2.3) * 0.04
  B.head.rotation.y = -0.12 + Math.sin(t * 0.7) * 0.05
  B.body.rotation.x = A.expect * 0.12 + angry * 0.08 + Math.sin(t * 1.8) * 0.01
  B.body.position.y = 0.86 + Math.abs(Math.sin(t * 3.2)) * 0.012 * A.talkAmt
  const gest = A.talkAmt * (0.5 + 0.5 * Math.sin(t * 2.7))
  B.armR.rotation.x = -0.2 - gest * 1.1 - angry * 1.6 - glad * 2.6
  B.armR.rotation.z = -0.15 - gest * 0.3 - glad * 0.3
  B.armL.rotation.x = -0.1 - A.talkAmt * (0.3 + 0.3 * Math.sin(t * 2.1 + 1)) - angry * 1.6 - A.expect * 0.5
  B.armL.rotation.z = 0.15 + A.expect * 0.5
  if (A.slam >= 0) { A.slam += dt; const k = A.slam < 0.12 ? A.slam / 0.12 : Math.max(0, 1 - (A.slam - 0.12) / 0.5); B.armR.rotation.x = lerp(B.armR.rotation.x, -1.3, k); B.armL.rotation.x = lerp(B.armL.rotation.x, -1.3, k); if (A.slam > 0.7) A.slam = -1 }
  B.browL.rotation.z = -angry * 0.5 + A.expect * 0.25; B.browR.rotation.z = angry * 0.5 - A.expect * 0.25
  B.browL.position.y = B.browR.position.y = 0.13 + A.expect * 0.03
  B.skin.color.copy(tmpC.copy(SKIN).lerp(RED, clamp(angry * 0.85, 0, 0.85)))
  B.vein.visible = angry > 0.25; B.vein.scale.setScalar(1 + Math.sin(t * 20) * 0.15)
  B.tie.rotation.x = angry * Math.sin(t * 25) * 0.25 - glad * 0.1
  const sweatRate = 0.5 + A.talkAmt * 0.6 + angry
  for (const d of B.sweat) {
    const p = (t * 0.55 * sweatRate + d.userData.ph) % 1, s = d.userData.side
    d.position.set(s * (0.22 + p * 0.04), 0.12 - p * 0.3, 0.12 - p * 0.03); d.scale.set(0.8, 1.3, 0.8).multiplyScalar(Math.sin(p * Math.PI) * 1.1)
  }
  for (const d of B.steam) {
    d.visible = angry > 0.3; if (!d.visible) continue
    const p = (t * 1.3 + d.userData.ph) % 1; d.position.set(Math.sin(d.userData.ph * 9) * 0.15 + Math.sin(t * 3 + d.userData.ph * 6) * 0.04, 0.3 + p * 0.45, -0.02); d.scale.setScalar(0.5 + p * 1.4); d.material.opacity = 0.85 * (1 - p)
  }
  // ---- 部下
  let headX = 0, headZ = 0, bodyZ = 0, bodyY = 0.52
  if (A.nodT >= 0) { A.nodT += dt; const p = A.nodT / 0.34; if (p >= 1) A.nodT = -1; else headX += Math.sin(p * Math.PI) * (0.42 + A.nodBig * 0.2) * (p < 0.5 ? 1 : 1 + Math.sin(p * 9) * 0.1) }
  A.smile = Math.max(0, A.smile - dt * 1.4)
  A.blinkT -= dt; if (A.blinkT < 0) { A.blink = 0.14; A.blinkT = 2 + Math.random() * 3 } if (A.blink > 0) A.blink -= dt
  let lidC = A.asleep ? 0.45 : clamp(A.sleepVis, 0, 0.92), roll = 0
  if (!A.asleep && A.sleepVis > 0.55) lidC = clamp(lidC + Math.sin(t * 2.6) * 0.06, 0, 0.95)
  if (A.blink > 0 && !A.asleep) lidC = 1
  if (A.asleep) {
    roll = 1
    headX += 0.22 + Math.sin(t * 2.4) * 0.2; headZ += Math.sin(t * 1.2) * 0.18; bodyZ += Math.sin(t * 1.2) * 0.06
    if (A.mash > 0) { headX -= 0.25 * Math.min(1, A.mash / 3); A.mash = Math.max(0, A.mash - dt * 1.5) }
  }
  if (A.pose === 'sleepy') { roll = 1; lidC = 0.4; headX += 0.5 + Math.sin(t * 2.4) * 0.15; headZ += Math.sin(t * 1.2) * 0.15 }
  if (A.pose === 'proud') { headX -= 0.15; A.smile = 1; lidC = 0.25 }
  if (A.startle >= 0) { A.startle += dt; const k = Math.max(0, 1 - A.startle / 0.9); headX -= 0.35 * k; bodyY += Math.sin(Math.min(1, A.startle / 0.25) * Math.PI) * 0.06; lidC = Math.min(lidC, -0.3 * k); if (A.startle > 0.9) A.startle = -1 }
  U.head.rotation.x = headX; U.head.rotation.z = headZ; U.torso.rotation.z = bodyZ; U.body.position.y = bodyY
  for (const l of U.lids) l.rotation.x = lerp(-1.3, Math.PI / 2, clamp(lidC, -0.15, 1))
  for (const e of U.eyes) e.rotation.x = lerp(0, -1.15, roll)
  U.mouth.scale.set(1 + A.smile * 0.6, 1 + (A.asleep || A.pose === 'sleepy' ? 2.5 + Math.sin(t * 2.4) : 0) + (A.startle >= 0 ? 3 : 0), 1)
  U.brows.forEach((b, i) => { b.position.y = 0.085 + (A.startle >= 0 ? 0.03 : 0) - A.sleepVis * 0.012; b.rotation.z = (i ? -1 : 1) * (A.asleep ? -0.2 : A.sleepVis * 0.25) })
  const sn = A.asleep || A.pose === 'sleepy'
  U.snot.visible = sn; if (sn) U.snot.scale.setScalar(0.35 + (0.5 + 0.5 * Math.sin(t * 2.4)) * 0.9)
  U.drool.visible = sn; if (sn) { const p = (t * 0.4) % 1; U.drool.position.y = -0.12 - p * 0.06; U.drool.scale.set(1, 1 + p * 2, 1) }
  U.sw.visible = A.startle >= 0 || (!A.asleep && A.sleepVis > 0.75)
  // 時計
  minH.rotation.z = -(S.view === 'play' ? G.t : 0) * 0.6; hourH.rotation.z = minH.rotation.z / 12 - 1
}

// ---------- カメラ（画面の空いている所に2人が収まるよう距離とずらしを解く）
const KEYS = [[-0.95, 1.6, 0.02], [-0.95, 0.9, 0.02], [-1.2, 1.2, 0.02], [1.15, 2.15, 0], [1.15, 1.15, 0], [1.45, 1.6, 0], [0.8, 1.5, 0]].map(a => new THREE.Vector3(...a))
const CENTER = new THREE.Vector3(0.1, 1.3, 0), tv = new THREE.Vector3()
let frameRect = null
function frameCamera(over, keys = KEYS) {
  const W = innerWidth, H = innerHeight
  renderer.setSize(W, H, false)
  camera.aspect = W / H; camera.clearViewOffset(); camera.updateProjectionMatrix()
  let r = { x0: W * 0.04, y0: H * 0.3, x1: W * 0.96, y1: H * 0.78 }
  const sb = $('#stageBox')
  if (S.view === 'play' && sb && sb.offsetParent) { const b = sb.getBoundingClientRect(); r = { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom } }
  else if (S.view === 'title') {
    const l = $('.logo').getBoundingClientRect(), bt = $('.tBottom').getBoundingClientRect()
    if (W / H > 1.2 && H < 560) r = { x0: W * 0.47, y0: H * 0.16, x1: W * 0.99, y1: H * 0.98 }
    else r = { x0: W * 0.03, y0: l.bottom - 10, x1: W * 0.97, y1: bt.top + 30 }
  } else if (S.view === 'result') {
    const rb = $('#vResult .resWrap').getBoundingClientRect()
    if (W / H > 1.2 && H < 560) r = { x0: rb.right + 10, y0: H * 0.04, x1: W * 0.99, y1: H * 0.98 }
    else r = { x0: W * 0.03, y0: Math.max(54, H * 0.06), x1: W * 0.97, y1: rb.top - 6 }
  } else if (S.view === 'how') r = { x0: 0, y0: H * 0.05, x1: W, y1: H * 0.95 }
  if (over) r = over
  if (r.y1 - r.y0 < 80) { r.y0 = H * 0.25; r.y1 = H * 0.8 }
  frameRect = r
  const rw = r.x1 - r.x0, rh = r.y1 - r.y0, ar = rw / rh
  const k = clamp((ar - 0.7) / (1.9 - 0.7), 0, 1)
  U.g.rotation.y = Math.PI / 2 - lerp(1.05, 0.6, k); U.head.rotation.y = lerp(-0.35, -0.1, k); A.subTurn = U.head.rotation.y
  const az = lerp(-0.68, -0.1, k), el = lerp(0.2, 0.1, k)
  const place = R => { camera.position.set(CENTER.x + Math.sin(az) * Math.cos(el) * R, CENTER.y + Math.sin(el) * R, CENTER.z + Math.cos(az) * Math.cos(el) * R); camera.lookAt(CENTER); camera.updateMatrixWorld() }
  const bounds = () => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const p of keys) { tv.copy(p).project(camera); const x = (tv.x + 1) / 2 * W, y = (1 - tv.y) / 2 * H; a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y) } return { a, b, c, d } }
  let lo = 1.5, hi = 30
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; place(m); const q = bounds(); if (q.b - q.a <= rw * 0.92 && q.d - q.c <= rh * 0.9) hi = m; else lo = m }
  place(hi); const q = bounds()
  camera.setViewOffset(W, H, (q.a + q.b) / 2 - (r.x0 + r.x1) / 2, (q.c + q.d) / 2 - (r.y0 + r.y1) / 2, W, H); camera.updateProjectionMatrix()
}
function toScreen(x, y, z) { tv.set(x, y, z).project(camera); return [(tv.x + 1) / 2 * innerWidth, (1 - tv.y) / 2 * innerHeight] }
const SUB_HEAD = () => { U.head.getWorldPosition(tv); return toScreen(tv.x, tv.y + 0.45, tv.z) }
const BOSS_HEAD = () => { B.head.getWorldPosition(tv); return toScreen(tv.x, tv.y + 0.62, tv.z) }

// ================= ゲーム =================
let G = null
function makeScript(seed, lang) {
  const r = rng(seed), L = TALK[lang], Q = ASKS[lang], ja = lang === 'ja'
  const ev = []; let t = 0
  const cps = tt => ja ? 11 + tt / 60 * 8 : 23 + tt / 60 * 16
  const gap = tt => lerp(0.75, 0.42, clamp(tt / 55, 0, 1))
  const line = (body, end, cue, trap = false) => {
    const c = cps(t), len = [...body + end].length, cueAt = 0.2 + (len - 1) / c
    const e = { type: 'line', body, end, cue, cps: c, len, cueAt, dur: cue ? cueAt + gap(t) : 0.2 + len / c + 0.45, at: t, trap }
    ev.push(e); t += e.dur
  }
  line(UI[lang].startLine, '', false)
  const pairs = Q.pairs.slice().sort(() => r() - 0.5)
  const askAt = [11 + r() * 4, 27 + r() * 4, 42 + r() * 4]; let ai = 0, lastTail = false
  const usedMid = new Set()
  const mid = () => { let m; for (let k = 0; k < 8; k++) { m = pick(r, L.mid); if (!usedMid.has(m)) break } usedMid.add(m); if (usedMid.size > L.mid.length - 4) usedMid.clear(); return m }
  while (t < 57) {
    if (ai < 3 && t >= askAt[ai]) { const e = { type: 'ask', q: pick(r, Q.q), pair: pairs[ai], swap: r() < 0.5, at: t, good: pick(r, Q.good), bad: pick(r, Q.bad) }; ev.push(e); t += ASK_EST; ai++; continue }
    const roll = r(), cue = lastTail || roll < 0.62, trap = !cue && roll < 0.9
    const nMid = t > 30 ? 3 : 2
    const op = r() < 0.55 ? pick(r, L.open) : '', mids = []; for (let k = 0; k < nMid; k++) mids.push(mid())
    const end = cue ? pick(r, L.cue) : trap ? pick(r, L.trap) : pick(r, L.tail), lim = ja ? 38 : 84
    let body = op + mids.join(''); if ([...body + end].length > lim) body = mids.join(''); if ([...body + end].length > lim) body = mids.slice(0, 2).join('')
    if (ja) body = body.replace(/(て|を|で|に)$/, '$1、')
    line(body, end, cue, trap); lastTail = !cue && !trap
  }
  // 「〜ね？」が少ない台本は、ぼやき行を「〜ね？」に替えて8回以上にする（時刻は引き直す）
  let nc = ev.filter(e => e.cue).length
  for (const e of ev) { if (nc >= 8) break; if (e.type === 'line' && !e.cue && e.at > 0) { e.cue = true; e.trap = false; e.end = pick(r, L.cue); e.len = [...e.body + e.end].length; nc++ } }
  t = 0
  for (const e of ev) { e.at = t; if (e.type === 'line') { e.cueAt = 0.2 + (e.len - 1) / e.cps; e.dur = e.cue ? e.cueAt + gap(t) : 0.2 + e.len / e.cps + 0.45; t += e.dur } else t += ASK_EST }
  ev.push({ type: 'end', at: t })
  return ev
}
const ringDur = t => lerp(0.9, 0.6, clamp(t / 55, 0, 1))
// 難しさの数値（2026-10-30 本人「もっとむづかしく」で締めた）
const W_PERFECT = 0.07, W_GOOD = 0.18, W_LATE = 0.32, NOTICE = 1.5, WAKE_TAPS = 7, ASK_TIME = 2.0, ASK_EST = 5.0
function startGame(seed = (Date.now() & 0xffffff)) {
  const ev = makeScript(seed, S.lang)
  G = { seed, ev, i: 0, et: 0, t: 0, total: ev[ev.length - 1].at + 2.2, sleep: 18, mood: 60, asleep: false, sleepT: 0, mash: 0, snoreT: 0, inter: null, cue: 'pending', judgedAt: -9, ask: null, over: false, bot: null, botR: rng(seed ^ 0x55),
    st: { perfect: 0, good: 0, early: 0, late: 0, miss: 0, extra: 0, trap: 0, shirome: 0, askGood: 0, askBad: 0, askTimeout: 0, notice: 0, cues: ev.filter(e => e.cue).length }, shown: '', result: null, rt: -1 }
  A.pose = 'none'; A.asleep = false; A.anger = 0; A.sleepVis = 0
  $('#ask').hidden = true; $('#wake').hidden = true
  go('play')
  Snd.setTrack('play')
  return G
}
function curEv() { return G && G.ev[G.i] }
function nextEv() {
  G.i++; G.et = 0; G.cue = 'pending'; G.ask = null; $('#ask').hidden = true
  const e = curEv(); if (!e) return
  if (e.type === 'ask') { G.ask = { phase: 'q', t: 0 }; if (G.asleep) notice() }
}
function judge(kind) {
  const s = G.st; s[kind]++
  const P = POP[S.lang], r = G.botR
  const md = { perfect: 2, good: 1, early: -5, late: -4, miss: -6, extra: -3, trap: -7 }[kind], sd = { perfect: -18, good: -10, early: -4, late: -4, miss: 0, extra: -3, trap: -3 }[kind]
  G.mood = clamp(G.mood + md, 0, 100); G.sleep = clamp(G.sleep + sd, 0, 100)
  if (kind !== 'extra' && kind !== 'trap') { G.cue = 'done'; G.judgedAt = G.t }
  if (kind === 'perfect') { Snd.sfx('perfect'); A.smile = 1; A.happy = 0.6; pop(SUB_HEAD(), pick(r, P.perfect), 'perfect'); pop(BOSS_HEAD(), 'PERFECT', 'judge perfect') }
  else if (kind === 'good') { Snd.sfx('good'); pop(SUB_HEAD(), pick(r, P.good), 'good'); pop(BOSS_HEAD(), 'GOOD', 'judge good') }
  else {
    Snd.sfx('miss'); pop(SUB_HEAD(), pick(r, P[kind]), 'bad')
    const bp = BOSS_POP[S.lang][kind === 'late' ? 'miss' : kind]
    if (kind === 'trap') Snd.sfx('boo')
    if (bp) { A.anger = Math.max(A.anger, kind === 'extra' ? 0.25 : kind === 'trap' ? 0.6 : 0.45); pop(BOSS_HEAD(), pick(r, bp), 'boss') }
  }
}
function nod() {
  if (!G || G.over || S.view !== 'play' || G.inter) return
  if (G.ask && G.ask.phase === 'choose') return
  if (G.asleep) { G.mash++; A.mash += 1; Snd.sfx('tap', 0.6); if (G.mash >= WAKE_TAPS) wake(); return }
  A.nodT = 0; A.nodBig = 0; Snd.sfx('nod'); hitBtn()
  const e = curEv()
  if (e && e.type === 'line' && e.cue && G.cue === 'pending') {
    const d = G.et - e.cueAt
    if (d < -(ringDur(G.t) + 0.25)) judge('extra')
    else if (d < -W_GOOD) judge('early')
    else if (Math.abs(d) <= W_PERFECT) { A.nodBig = 1; judge('perfect') }
    else if (d <= W_GOOD) judge('good')
    else if (d <= W_LATE) judge('late')
    else judge('extra')
  } else if (e && e.type === 'line' && e.trap && G.et > e.len / e.cps - 0.6) judge('trap')
  else if (G.t - G.judgedAt > 0.3) judge('extra')
  else G.sleep = clamp(G.sleep - 2, 0, 100)
}
function fallAsleep() {
  G.asleep = true; G.sleepT = 0; G.mash = 0; G.snoreT = 0; G.st.shirome++; A.asleep = true; A.mash = 0
  Snd.sfx('snore'); Snd.sfx('bubble'); $('#wake').hidden = false
  pop(SUB_HEAD(), POP[S.lang].snore, 'bad')
}
function wake() {
  G.asleep = false; G.sleep = 55; A.asleep = false; A.startle = 0; $('#wake').hidden = true
  Snd.sfx('pop'); Snd.sfx('startle'); pop(SUB_HEAD(), pick(G.botR, POP[S.lang].wake), 'good')
}
function notice() {
  G.inter = { t: 0, dur: 1.9, text: T('noticeLine') }
  G.mood = clamp(G.mood - 20, 0, 100); G.st.notice++
  G.asleep = false; G.sleep = 40; A.asleep = false; A.startle = 0.05; A.anger = 1; A.slam = 0; $('#wake').hidden = true
  Snd.sfx('angry'); Snd.sfx('slam'); Snd.sfx('pop'); shake(0.5); flash()
  pop(SUB_HEAD(), pick(G.botR, POP[S.lang].wake), 'good')
}
function choose(i) {
  if (!G || !G.ask || G.ask.phase !== 'choose') return
  const e = curEv(), good = (i === 0) !== e.swap
  G.ask = { phase: 'react', t: 0, good, text: good ? e.good : e.bad }
  $('#ask').hidden = true
  if (good) { G.st.askGood++; G.mood = clamp(G.mood + 10, 0, 100); A.happy = 1.4; Snd.sfx('ding'); pop(SUB_HEAD(), e.pair[0], 'good') }
  else { G.st.askBad++; G.mood = clamp(G.mood - 12, 0, 100); A.anger = 0.8; Snd.sfx('boo'); pop(SUB_HEAD(), e.pair[1], 'bad') }
}
function update(dt) {
  animate(dt)
  if (S.view === 'title' || S.view === 'how') { titleIdle(dt); return }
  if (S.view === 'result') { resultStep(dt); return }
  if (S.view !== 'play' || !G || G.over) return
  if (G.bot) botStep()
  if (G.inter) { G.inter.t += dt; A.talking = true; if (G.inter.t >= G.inter.dur) G.inter = null; renderBubble(); return }
  G.t += dt
  const e = curEv()
  A.expect = 0; A.talking = false
  if (e.type === 'line') {
    G.et += dt
    const n = clamp(Math.floor((G.et - 0.2) * e.cps) + 1, 0, e.len)
    if (n > (G.shownN || 0)) { Snd.babble(false) } G.shownN = n
    A.talking = n < e.len
    if (e.cue) { const d = G.et - e.cueAt; if (d > -0.6 && d < 0.5) A.expect = clamp(1 - Math.abs(d) / 0.6, 0, 1) }
    if (e.cue && G.cue === 'pending' && G.et > e.cueAt + W_LATE) { G.cue = 'done'; G.st.miss++; G.mood = clamp(G.mood - 6, 0, 100); if (!G.asleep) { Snd.sfx('miss'); pop(SUB_HEAD(), pick(G.botR, POP[S.lang].miss), 'bad'); A.anger = Math.max(A.anger, 0.45); pop(BOSS_HEAD(), pick(G.botR, BOSS_POP[S.lang].miss), 'boss') } }
    if (G.et >= e.dur) { G.shownN = 0; nextEv() }
  } else if (e.type === 'ask') {
    const a = G.ask; a.t += dt
    if (a.phase === 'q') {
      const len = [...e.q].length, n = clamp(Math.floor(a.t * 12) + 1, 0, len); if (n > (G.shownN || 0)) Snd.babble(false); G.shownN = n; A.talking = n < len; A.expect = n >= len ? 1 : 0
      if (a.t > len / 12 + 0.25) { a.phase = 'choose'; a.t = 0; G.shownN = 0; showAsk(e) }
    } else if (a.phase === 'choose') {
      A.expect = 1; const left = ASK_TIME - a.t; $('#askBar').style.width = clamp(left / ASK_TIME * 100, 0, 100) + '%'
      if (left < 1.5 && Math.floor(left * 2) !== Math.floor((left + dt) * 2)) Snd.sfx('tick')
      if (left <= 0) { G.ask = { phase: 'react', t: 0, good: false, timeout: true, text: T('askTimeout') }; $('#ask').hidden = true; G.st.askTimeout++; G.mood = clamp(G.mood - 14, 0, 100); A.anger = 0.7; Snd.sfx('cricket') }
    } else if (a.phase === 'react') {
      A.talking = a.t < 1.0 && !a.timeout
      if (a.timeout && a.t > 1.1 && !a.t2) { a.t2 = 1; a.text = T('bossAfterTimeout'); Snd.sfx('miss') }
      if (a.t > (a.timeout ? 2.4 : 1.8)) nextEv()
    }
  } else if (e.type === 'end') {
    G.et += dt; const len = [...T('endLine')].length, n = clamp(Math.floor(G.et * 12) + 1, 0, len); if (n > (G.shownN || 0)) Snd.babble(false); G.shownN = n; A.talking = n < len
    if (G.et > len / 12 + 1.0) finish()
  }
  // 眠気
  const frozen = G.ask && G.ask.phase !== 'q'
  if (!G.asleep && !frozen) { G.sleep += (2.8 + 3.2 * clamp(G.t / 55, 0, 1)) * dt; if (G.sleep >= 100) { G.sleep = 100; fallAsleep() } }
  if (G.asleep) { G.sleepT += dt; G.snoreT += dt; if (G.snoreT > 1.5) { G.snoreT = 0; Snd.sfx('snore') } if (G.sleepT >= NOTICE) notice() }
  A.sleepVis = clamp((G.sleep - 30) / 70, 0, 1)
  const asking = !!(G.ask && G.ask.phase === 'choose'); if (asking !== S.asking) { S.asking = asking; document.body.classList.toggle('asking', asking) }
  renderBubble()
}
function botStep() {
  const e = curEv(), r = G.botR
  // 白目中の連打は人の速さ（1秒に約8回）
  if (G.asleep) { if (G.bot !== 'none' && G.bot !== 'sleeper') { G.botMash = (G.botMash || 0) + 1; if (G.botMash % 7 === 0) nod() } return }
  if (G.ask && G.ask.phase === 'choose') {
    if (G.bot === 'perfect') choose(e.swap ? 1 : 0)
    else if (G.bot === 'skilled' && G.ask.t > 0.9) { if (e.botPick === undefined) e.botPick = r() < 0.85; choose(e.botPick !== e.swap ? 0 : 1) }
    else if (G.bot === 'random' && G.ask.t > 1.1) choose(r() < 0.5 ? 0 : 1)
    return }
  if (G.bot === 'random' && e && e.type === 'line' && e.trap) { if (e.botTrap === undefined) e.botTrap = r() < 0.35; if (e.botTrap && G.et > e.len / e.cps) { e.botTrap = false; nod() } }
  if (!e || e.type !== 'line' || !e.cue || G.cue !== 'pending') return
  if (G.bot === 'perfect' && G.et >= e.cueAt) nod()
  // 上手い人: ずれは正規分布（標準偏差0.05秒）、返事は85%正解
  if (G.bot === 'skilled') { if (e.botOff === undefined) { const u = Math.max(1e-6, r()), v = r(); e.botOff = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * 0.05 } if (G.et >= e.cueAt + e.botOff) nod() }
  if (G.bot === 'random') { if (e.botOff === undefined) e.botOff = (r() - 0.45) * 0.7; if (G.et >= e.cueAt + e.botOff) nod() }
}
// ---------- 結果
function computeResult(st, mood) {
  // うなずきは回数で割って100点満点にする（台本ごとの「〜ね？」の数の差を消す）
  const nodPts = (st.perfect * 10 + st.good * 6 - (st.early + st.late + st.miss) * 4 - st.extra * 2 - (st.trap || 0) * 5) / Math.max(1, st.cues) * 10
  const score = Math.round(nodPts + st.askGood * 8 - st.askBad * 3 - st.askTimeout * 5 + (mood - 50) * 0.4 - st.shirome * 15)
  const grade = GRADES.find(g => score >= g.min && st.shirome <= g.shiromeMax)
  const X = EXTRA_CMT[S.lang], nods = st.perfect + st.good + st.early + st.late + st.extra + (st.trap || 0)
  let cmt = S.lang === 'ja' ? grade.cja : grade.cen
  if (nods === 0) cmt = X.noNod
  else if (st.shirome >= 3) cmt = X.manyShirome
  else if (mood < 15) cmt = X.angry
  else if (st.perfect === st.cues && st.cues >= 6) cmt = X.perfectRun
  return { score, grade, cmt, mood: Math.round(mood) }
}
function finish() {
  G.over = true; A.talking = false; $('#ask').hidden = true; $('#wake').hidden = true
  G.result = computeResult(G.st, G.mood)
  const gi = GRADES.indexOf(G.result.grade)
  A.pose = gi <= 2 ? 'proud' : gi >= 4 ? 'sleepy' : 'none'
  A.bossPose = gi <= 2 ? 'glad' : gi >= 4 || G.result.mood < 20 ? 'mad' : 'none'
  A.asleep = false
  S.firstPlay = false
  go('result')
  Snd.setTrack(null); Snd.sfx('roll')
}
function resultStep(dt) {
  if (!G || !G.result) return
  const prev = G.rt; G.rt += dt
  if (prev < 2.3 && G.rt >= 2.3) { $('#announce').hidden = true; $('#vResult .resWrap').style.visibility = 'visible' }
  if (prev < 2.9 && G.rt >= 2.9) {
    $('#hanko').classList.add('on'); Snd.sfx('stamp'); shake(0.25)
    const good = GRADES.indexOf(G.result.grade) <= 2
    setTimeout(() => { Snd.sfx(good ? 'cheer' : 'sad'); Snd.setTrack(good ? 'win' : 'lose') }, 350)
  }
  if (A.bossPose === 'mad') A.anger = Math.max(A.anger, 0.6)
  A.talking = G.rt > 2.9 && G.rt < 4.2
}
function fillResult() {
  const R = G.result, st = G.st, g = R.grade, ja = S.lang === 'ja'
  $('#rTitle').textContent = ja ? `「${g.tja}」` : `"${g.ten}"`
  const tm = T('times'), miss = st.early + st.late + st.miss + (st.trap || 0)
  $('#rStats').innerHTML = [
    [T('sPerfect'), `${st.perfect}${tm}`], [T('sGood'), `${st.good}${tm}`], [T('sMiss'), `${miss}${tm}`, miss > 0],
    [T('sShirome'), `${st.shirome}${tm}`, st.shirome > 0], [T('sAnswer'), `${st.askGood} / 3`], [T('sMood'), `${R.mood}%`, R.mood < 30],
  ].map(([a, b, n]) => `<span>${a}</span><b class="${n ? 'neg' : ''}">${b}</b>`).join('')
  $('#hanko').innerHTML = hankoSVG(g)
  $('#hanko').classList.remove('on')
  $('#rFace').innerHTML = bossFace(R.mood)
  $('#rCmt').textContent = R.cmt
}
function hankoSVG(g) {
  const ja = S.lang === 'ja', big = ja ? g.ja : g.en
  const fs = ja ? (big.length > 2 ? 52 : 64) : (big.length > 7 ? 26 : 32)
  return `<defs><filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter></defs>
  <g filter="url(#rough)" fill="${g.color}" stroke="${g.color}"><circle cx="100" cy="100" r="88" fill="none" stroke-width="10"/><circle cx="100" cy="100" r="72" fill="none" stroke-width="3"/>
  <text x="100" y="62" font-size="${ja ? 22 : 15}" font-weight="900" text-anchor="middle" stroke="none" font-family="sans-serif">${ja ? '社畜検定' : 'OFFICE DRONE'}</text>
  <text x="100" y="${ja ? 124 : 116}" font-size="${fs}" font-weight="900" text-anchor="middle" stroke="none" font-family="sans-serif">${esc(big)}</text>
  <text x="100" y="158" font-size="${ja ? 20 : 15}" font-weight="900" text-anchor="middle" stroke="none" font-family="sans-serif">${ja ? '認定' : 'CERTIFIED'}</text></g>`
}
// 上司の顔アイコン（機嫌で表情と顔色が変わる）
function bossFace(mood) {
  const m = clamp(mood, 0, 100) / 100
  const skin = m > 0.35 ? '#f0bf98' : m > 0.18 ? '#f59a7c' : '#ff6a55'
  const mouth = m > 0.6 ? 'M24 44q8 7 16 0' : m > 0.35 ? 'M24 45h16' : 'M24 47q8-7 16 0'
  const brow = m > 0.35 ? 'M17 22l9 1M38 23l9-1' : 'M17 19l10 5M37 24l10-5'
  return `<circle cx="32" cy="32" r="24" fill="${skin}" stroke="#16161d" stroke-width="3"/>
  <path d="M12 28q-2-6 2-10M52 28q2-6-2-10" stroke="#7a7a7a" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M18 12q14-6 28 0M17 16q15-6 30 0" stroke="#5c5c5c" stroke-width="2" fill="none"/>
  <path d="${brow}" stroke="#16161d" stroke-width="3" stroke-linecap="round"/>
  <circle cx="24" cy="30" r="6" fill="#fff" stroke="#16161d" stroke-width="2.5"/><circle cx="40" cy="30" r="6" fill="#fff" stroke="#16161d" stroke-width="2.5"/><path d="M30 30h4" stroke="#16161d" stroke-width="2.5"/>
  <circle cx="24" cy="30" r="2" fill="#16161d"/><circle cx="40" cy="30" r="2" fill="#16161d"/>
  <path d="M23 40q9-4 18 0" stroke="#5c5c5c" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="${mouth}" stroke="#16161d" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${m <= 0.35 ? '<path d="M44 12l6 6M50 12l-6 6" stroke="#d7263d" stroke-width="3" stroke-linecap="round"/>' : ''}`
}

// ---------- 画面の更新
let lastBubble = ''
function renderBubble() {
  if (S.view !== 'play' || !G) return
  const e = curEv(); let html = '', cls = ''
  if (G.inter) { html = esc(G.inter.text); cls = 'angry' }
  else if (!e) html = ''
  else if (e.type === 'line') {
    const chars = [...e.body + e.end], n = G.shownN || 0, bl = [...e.body].length
    const b = chars.slice(0, Math.min(n, bl)).join(''), c = chars.slice(bl, n).join('')
    html = esc(b) + (e.end ? `<span class="cue${n >= e.len && e.cue ? ' done' : ''}">${esc(e.cue ? c : c)}</span>` : '')
    if (!e.cue && e.end) html = esc(b + c)
  } else if (e.type === 'ask') {
    const a = G.ask
    if (a.phase === 'q') { html = `<span class="cue">${esc([...e.q].slice(0, G.shownN || 0).join(''))}</span>`; cls = 'ask' }
    else if (a.phase === 'choose') { html = `<span class="cue">${esc(e.q)}</span>`; cls = 'ask' }
    else { html = esc(a.text); cls = a.good ? '' : 'angry' }
  } else if (e.type === 'end') html = esc([...T('endLine')].slice(0, G.shownN || 0).join(''))
  const key = cls + '|' + html
  if (key !== lastBubble) { lastBubble = key; $('#btext').innerHTML = html; $('#bubble').className = 'bubble ' + cls }
}
function showAsk(e) {
  const opts = e.swap ? [e.pair[1], e.pair[0]] : [e.pair[0], e.pair[1]]
  $('#bA0 span:last-child').textContent = opts[0]; $('#bA1 span:last-child').textContent = opts[1]
  $('#askBar').style.width = '100%'; $('#ask').hidden = false; Snd.sfx('whoosh')
}
let hitTO = 0
function hitBtn() { const b = $('#bNod'); b.classList.add('hit'); clearTimeout(hitTO); hitTO = setTimeout(() => b.classList.remove('hit'), 90) }
function pop([x, y], text, cls) {
  if (S.view !== 'play') return
  const d = document.createElement('div'); d.className = 'pop ' + cls; d.textContent = text
  d.style.left = clamp(x, 70, innerWidth - 70) + 'px'; d.style.top = clamp(y, 60, innerHeight - 40) + 'px'
  document.body.appendChild(d); const hw = d.offsetWidth / 2 + 8; d.style.left = clamp(x, hw, innerWidth - hw) + 'px'; setTimeout(() => d.remove(), 1150)
}
let shakeT = 0, shakeAmt = 0
function shake(s) { shakeT = s; shakeAmt = 10 }
function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on') }
function renderHud() {
  if (S.view === 'play' && G) {
    $('#timeBar i').style.width = clamp(100 - G.t / G.total * 100, 0, 100) + '%'
    const mb = $('#moodBar'); mb.querySelector('i').style.width = G.mood + '%'; mb.className = 'bar' + (G.mood < 30 ? ' low' : G.mood < 55 ? ' mid' : '')
    const mk = G.mood > 60 ? 2 : G.mood > 35 ? 1 : 0; if (renderHud.mk !== mk) { renderHud.mk = mk; $('#moodFace').innerHTML = bossFace(G.mood) }
    const sb = $('#sleepBar'); sb.querySelector('i').style.width = G.sleep + '%'; sb.className = 'bar' + (G.sleep > 75 ? ' hot' : '')
    // 輪
    const e = curEv(), ring = $('#ring')
    if (e && e.type === 'line' && e.cue && G.cue === 'pending' && !G.inter) {
      const d = e.cueAt - G.et, R = ringDur(G.t)
      if (d <= R && d > -W_LATE) { ring.style.opacity = 1; ring.style.transform = `scale(${1 + Math.max(0, d) / R * 0.55})`; ring.classList.toggle('near', Math.abs(d) <= W_PERFECT) }
      else { ring.style.opacity = 0; ring.style.transform = '' }
    } else { ring.style.opacity = 0; ring.style.transform = '' }
    // まぶた
    const lid = G.asleep ? 0.2 + Math.sin(performance.now() / 400) * 0.03 : clamp((G.sleep - 55) / 45, 0, 1) * 0.26 + (G.sleep > 80 ? Math.sin(performance.now() / 300) * 0.03 : 0)
    $('#lids .t').style.height = $('#lids .b').style.height = Math.max(0, lid) * 100 + 'vh'
    $('#nodHint').style.opacity = G.t < 7 ? 1 : 0
    // しっぽを上司の方へ
    const [bx] = BOSS_HEAD(), br = $('#bubble').getBoundingClientRect()
    $('#bubble').style.setProperty('--tail', clamp(bx - br.left - 10, 30, br.width - 60) + 'px')
  } else { $('#lids .t').style.height = $('#lids .b').style.height = '0' }
  if (shakeT > 0) { const k = shakeAmt * shakeT * 2; $('#shake').style.transform = `translate(${(Math.random() - 0.5) * k}px,${(Math.random() - 0.5) * k}px)` } else $('#shake').style.transform = ''
}
// タイトルの小芝居: 上司はしゃべり続け、部下はうなずいたり寝かけたり
const TI = { t: 0, nodAt: 1.5, doze: 0 }
function titleIdle(dt) {
  TI.t += dt; A.talking = (TI.t % 5) < 3.8; A.expect = 0; A.pose = 'none'
  const cyc = TI.t % 14
  A.asleep = cyc > 9.5 && cyc < 12.5
  A.sleepVis = cyc < 9.5 ? clamp((cyc - 5) / 4.5, 0, 0.85) : 0
  if (cyc > 12.5 && cyc - dt <= 12.5) { A.startle = 0; A.anger = 1; A.slam = 0 }
  if (!A.asleep && cyc < 5 && TI.t > TI.nodAt) { A.nodT = 0; TI.nodAt = TI.t + 1.6 + Math.random() }
}

// ---------- 画面遷移
function go(v) {
  S.view = v
  for (const id of ['vTitle', 'vHow', 'vPlay', 'vResult']) $('#' + id).hidden = id !== 'v' + v[0].toUpperCase() + v.slice(1)
  $('#bLang').hidden = v === 'play'
  $('#announce').hidden = v !== 'result'
  if (v === 'result') { fillResult(); $('#vResult .resWrap').style.visibility = 'hidden'; G.rt = 0 }
  if (v === 'title') { Snd.setTrack('title'); A.anger = 0; A.pose = 'none'; A.bossPose = 'none' }
  if (v !== 'play') { $('#ask').hidden = true; $('#wake').hidden = true }
  if (v === 'play') { lastBubble = ''; renderHud.mk = -1 }
  for (const d of $$('.pop')) d.remove()
  document.body.classList.remove('asking'); S.asking = false
  requestAnimationFrame(() => frameCamera()); frameCamera()
}
function applyLang() {
  document.documentElement.lang = S.lang
  for (const el of $$('[data-t]')) { const v = T(el.dataset.t); if (el.dataset.html) el.innerHTML = v; else el.textContent = v }
  $('#how1').innerHTML = touchDev ? T('how1sp') : T('how1pc')
  $('#nodLab').textContent = touchDev ? T('nodSp') : T('nodPc')
  $('#nodHint').textContent = touchDev ? T('tapAnywhere') : T('pcHint')
  $('#langLab').textContent = S.lang === 'ja' ? 'EN' : 'JA'
  document.title = S.lang === 'ja' ? 'うなずきマスター' : 'NOD MASTER'
  drawBoard()
  if (S.view === 'result' && G && G.result) { G.result = computeResult(G.st, G.mood); fillResult(); if (G.rt >= 2.9) $('#hanko').classList.add('on') }
  frameCamera()
}

// ---------- 結果を1枚の画像に
function makeCard() {
  const R = G.result, st = G.st, g = R.grade, ja = S.lang === 'ja'
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d')
  const ff = getComputedStyle(document.body).fontFamily
  const bg = x.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#2a3a66'); bg.addColorStop(1, '#0e1630'); x.fillStyle = bg; x.fillRect(0, 0, 1080, 1350)
  x.save(); x.globalAlpha = 0.07; x.fillStyle = '#fff'; for (let i = -1350; i < 1080; i += 60) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 30, 0); x.lineTo(i + 30 + 1350, 1350); x.lineTo(i + 1350, 1350); x.fill() } x.restore()
  // タイトル
  x.textAlign = 'center'; x.lineJoin = 'round'
  const outl = (s, px, py, size, fill, sw = 12) => { x.font = `900 ${size}px ${ff}`; x.lineWidth = sw; x.strokeStyle = '#16161d'; x.strokeText(s, px, py); x.fillStyle = fill; x.fillText(s, px, py) }
  outl(ja ? 'うなずきマスター' : 'NOD MASTER', 540, 104, 76, '#ffd23f')
  // 3Dの場面
  const sw = 1000, sh = 600, oldW = innerWidth, oldH = innerHeight
  renderer.setPixelRatio(1); renderer.setSize(sw, sh, false)
  const cam = camera.clone(); cam.aspect = sw / sh; cam.clearViewOffset()
  const pos = new THREE.Vector3(-0.9, 1.75, 3.9); cam.position.copy(pos); cam.lookAt(0.12, 1.32, 0); cam.fov = 36; cam.updateProjectionMatrix()
  renderer.render(scene, cam)
  x.save(); roundRect(x, 40, 140, sw, sh, 28); x.clip(); x.drawImage(renderer.domElement, 40, 140, sw, sh); x.restore()
  x.lineWidth = 8; x.strokeStyle = '#16161d'; roundRect(x, 40, 140, sw, sh, 28); x.stroke()
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touchDev ? 1.75 : 2)); renderer.setSize(oldW, oldH, false); frameCamera()
  // 上司の一言
  x.font = `900 36px ${ff}`; const lines = wrapText(x, R.cmt, 860).slice(0, 2)
  const bh = 40 + lines.length * 48
  x.fillStyle = '#fff'; roundRect(x, 70, 170, 940, bh, 24); x.fill(); x.lineWidth = 6; x.strokeStyle = '#16161d'; x.stroke()
  x.fillStyle = '#16161d'; x.textAlign = 'left'; lines.forEach((l, i) => x.fillText(l, 110, 222 + i * 48))
  // 認定証
  x.fillStyle = '#fffdf6'; roundRect(x, 40, 780, 1000, 470, 28); x.fill(); x.lineWidth = 8; x.strokeStyle = '#16161d'; x.stroke()
  x.lineWidth = 3; x.strokeStyle = '#b89a4a'; roundRect(x, 58, 798, 964, 434, 18); x.stroke()
  x.textAlign = 'center'; x.fillStyle = '#6b4e12'; x.font = `900 40px ${ff}`; x.fillText(T('resultHead'), 540, 856)
  x.textAlign = 'left'; x.fillStyle = '#16161d'; x.font = `900 ${ja ? 58 : 50}px ${ff}`; x.fillText(ja ? `「${g.tja}」` : `"${g.ten}"`, 86, 940)
  x.font = `700 34px ${ff}`; const miss = st.early + st.late + st.miss + (st.trap || 0), tm = T('times')
  const rows = [[T('sPerfect'), st.perfect + tm], [T('sShirome'), st.shirome + tm], [T('sMiss'), miss + tm], [T('sMood'), R.mood + '%']]
  rows.forEach(([a, b], i) => { x.fillStyle = '#333'; x.textAlign = 'left'; x.fillText(a, 96, 1012 + i * 54); x.textAlign = 'right'; x.font = `900 36px ${ff}`; x.fillStyle = '#16161d'; x.fillText(b, 640, 1012 + i * 54); x.font = `700 34px ${ff}` })
  // ハンコ
  x.save(); x.translate(850, 1060); x.rotate(-0.24); x.strokeStyle = x.fillStyle = g.color; x.globalAlpha = 0.92
  x.lineWidth = 16; x.beginPath(); x.arc(0, 0, 150, 0, 7); x.stroke(); x.lineWidth = 5; x.beginPath(); x.arc(0, 0, 124, 0, 7); x.stroke()
  x.textAlign = 'center'; x.font = `900 ${ja ? 36 : 24}px ${ff}`; x.fillText(ja ? '社畜検定' : 'OFFICE DRONE', 0, -62)
  const big = ja ? g.ja : g.en; x.font = `900 ${ja ? (big.length > 2 ? 84 : 104) : (big.length > 7 ? 44 : 54)}px ${ff}`; x.fillText(big, 0, ja ? 36 : 20)
  x.font = `900 ${ja ? 32 : 24}px ${ff}`; x.fillText(ja ? '認定' : 'CERTIFIED', 0, 100)
  x.restore()
  x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.8)'; x.font = `700 28px ${ff}`; x.fillText('tom3games.github.io/nod-master', 540, 1306)
  return c
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath() }
function wrapText(x, s, w) {
  const out = []; let cur = ''
  const tokens = S.lang === 'ja' ? [...s] : s.split(/(\s+)/)
  for (const ch of tokens) { if (x.measureText(cur + ch).width > w && cur) { out.push(cur.trim()); cur = ch.trimStart() } else cur += ch }
  if (cur) out.push(cur.trim()); return out
}
async function saveImage() {
  const c = makeCard(), blob = await new Promise(r => c.toBlob(r, 'image/png'))
  const name = 'nod-master.png', g = G.result.grade
  try {
    const file = new File([blob], name, { type: 'image/png' })
    if (navigator.canShare && navigator.canShare({ files: [file] }) && touchDev) {
      await navigator.share({ files: [file], text: T('shareText').replace('{g}', S.lang === 'ja' ? g.ja : g.en), url: 'https://tom3games.github.io/nod-master/' }); toast(T('shared')); return blob
    }
  } catch (e) { if (e && e.name === 'AbortError') return blob }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(T('saved')); return blob
}
const PUBLIC_URL = 'https://tom3games.github.io/nod-master/'
function xPost() {
  const g = G.result.grade, text = T('xText').replace('{g}', S.lang === 'ja' ? g.ja : g.en).replace('{t}', S.lang === 'ja' ? g.tja : g.ten)
  return { text, url: PUBLIC_URL, href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(PUBLIC_URL)}` }
}
function openX() { if (!G || !G.result) return; window.open(xPost().href, '_blank', 'noopener') }
function toast(s) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = s; document.body.appendChild(d); setTimeout(() => d.remove(), 1600) }

// ---------- ループ（固定60Hz）
let acc = 0, lastT = performance.now(), frames = 0, fpsT = performance.now(), fps = 0
function loop() {
  const now = performance.now(); let dt = (now - lastT) / 1000; lastT = now; if (dt > 0.25) dt = 0.25
  if (!S.paused) { acc += dt; let n = 0; while (acc >= STEP && n < 8) { update(STEP); acc -= STEP; n++ } if (n >= 8) acc = 0 }
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
  renderHud(); renderer.render(scene, camera); Snd.tick()
  frames++; if (now - fpsT > 1000) { fps = frames * 1000 / (now - fpsT); frames = 0; fpsT = now }
  requestAnimationFrame(loop)
}

// ---------- 起動
function boot() {
  try { const l = localStorage.getItem('nm.lang'); S.lang = l || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en') } catch (e) { S.lang = (navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en' }
  try { if (localStorage.getItem('nm.mute') === '1') { Snd.muted = true; $('#icOn').hidden = true; $('#icOff').hidden = false } } catch (e) {}
  try { S.firstPlay = localStorage.getItem('nm.played') !== '1' } catch (e) {}
  applyLang()
  const on = (id, fn) => $(id).addEventListener('click', e => { Snd.init(); fn(e) })
  on('#bStart', () => { Snd.sfx('tap'); if (S.firstPlay) go('how'); else startGame() })
  on('#bHow', () => { Snd.sfx('tap'); go('how') })
  on('#bHowBack', () => { Snd.sfx('tap'); go('title') })
  on('#bHowGo', () => { Snd.sfx('tap'); try { localStorage.setItem('nm.played', '1') } catch (e) {} S.firstPlay = false; startGame() })
  on('#bAgain', () => { Snd.sfx('tap'); startGame() })
  on('#bSave', () => saveImage())
  on('#bX', () => { Snd.sfx('tap'); openX() })
  on('#bTitle', () => { Snd.sfx('tap'); go('title') })
  on('#bA0', () => choose(0)); on('#bA1', () => choose(1))
  on('#bLang', () => { S.lang = S.lang === 'ja' ? 'en' : 'ja'; try { localStorage.setItem('nm.lang', S.lang) } catch (e) {} applyLang() })
  on('#bMute', () => { Snd.setMute(!Snd.muted); $('#icOn').hidden = Snd.muted; $('#icOff').hidden = !Snd.muted; try { localStorage.setItem('nm.mute', Snd.muted ? '1' : '0') } catch (e) {} })
  $('#vPlay').addEventListener('pointerdown', e => { if (e.target.closest('#ask,#corner')) return; e.preventDefault(); Snd.init(); nod() })
  window.addEventListener('keydown', e => {
    if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return }
    if (S.view === 'play') {
      if (G && G.ask && G.ask.phase === 'choose') { if (e.key === '1' || e.key === 'ArrowLeft') choose(0); if (e.key === '2' || e.key === 'ArrowRight') choose(1); if (e.code === 'Space') e.preventDefault(); return }
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); Snd.init(); nod() }
    } else if (S.view === 'result' && G && G.rt > 2.9 && (e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); startGame() }
  })
  window.addEventListener('resize', () => frameCamera())
  document.addEventListener('visibilitychange', () => { lastT = performance.now(); acc = 0 })
  go('title')
  requestAnimationFrame(loop)
  window.__nmReady = true
}

// 検証用の窓口
window.nm = {
  S, A, get G() { return G }, B, U, camera, renderer, scene, Snd, GRADES,
  start: seed => startGame(seed), frameTo: (r, k) => frameCamera(r, k && k.map(a => new THREE.Vector3(...a))), nod, choose, makeScript, computeResult, makeCard, saveImage, xPost, openX, frameCamera, go, finish,
  setBot: b => { if (G) G.bot = b },
  fps: () => fps, frameRect: () => frameRect,
  project: () => ({ sub: SUB_HEAD(), boss: BOSS_HEAD() }),
  dbg: { pause: v => { S.paused = v }, step: n => { for (let i = 0; i < n; i++) update(STEP) }, render: () => { renderHud(); renderer.render(scene, camera) } },
}
boot()
