// SNS用サムネ og.png（1200x630）。node og.mjs
// 場面: 上司が「わかる？」と詰め寄る横で、部下は白目で鼻ちょうちん
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = import.meta.dirname
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: '5472' } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, locale: 'ja-JP' })
await p.addInitScript(() => { try { localStorage.setItem('nm.played', '1'); localStorage.setItem('nm.lang', 'ja') } catch (e) {} })
await p.goto('http://localhost:5472/'); await p.waitForFunction(() => window.__nmReady)
await p.evaluate(() => {
  nm.dbg.pause(true); const g = nm.start(7)
  const ci = g.ev.findIndex(e => e.type === 'line' && e.cue && e.at > 6); g.bot = 'perfect'; while (g.i < ci) nm.dbg.step(1); g.bot = null
  const e = g.ev[ci]; while (g.et < e.cueAt - 0.6) nm.dbg.step(1)
  g.sleep = 99.99; nm.dbg.step(30)
  for (const d of document.querySelectorAll('.pop')) d.remove()
  nm.A.t = 1.05; nm.A.expect = 1; nm.A.talking = true; nm.A.talkAmt = 1
})
await p.addStyleTag({ content: `main,#corner,#wake,#lids,#flash,.pop{display:none!important}
  body::after{content:'';position:fixed;inset:0 0 0 54%;background:linear-gradient(90deg,rgba(29,42,74,0),rgba(29,42,74,.94) 16%);z-index:30}` })
await p.waitForTimeout(300)
await p.evaluate(() => { nm.frameTo({ x0: 30, y0: 200, x1: 690, y1: 650 }, [[-0.95, 1.62, 0.02], [-1.3, 1.1, 0.02], [-0.95, 0.95, 0.02], [1.15, 2.2, 0], [1.15, 1.2, 0], [1.45, 1.7, 0]]); nm.dbg.render() })
await p.evaluate(() => {
  const [bx, by] = nm.project().boss, [sx, sy] = nm.project().sub
  const ff = getComputedStyle(document.body).fontFamily
  const d = document.createElement('div'); d.style.cssText = `position:fixed;right:34px;top:0;bottom:0;width:470px;z-index:31;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:26px;text-align:center;font-family:${ff}`
  d.innerHTML = `<div style="transform:rotate(-4deg);line-height:.95;font-weight:900"><div style="font-size:92px;color:#ffd23f;-webkit-text-stroke:9px #16161d;paint-order:stroke fill">うなずき</div><div style="font-size:112px;color:#fff;-webkit-text-stroke:9px #16161d;paint-order:stroke fill;text-shadow:7px 7px 0 #d7263d">マスター</div></div>
  <div style="font-weight:900;font-size:30px;line-height:1.45;background:#fffdf6;color:#16161d;border:4px solid #16161d;border-radius:14px;padding:12px 18px;transform:rotate(1.5deg);box-shadow:0 6px 0 #16161d">上司の長〜い話を、<br>聞いてるフリでうなずき切れ。</div>`
  document.body.appendChild(d)
  const q = document.createElement('div'); q.style.cssText = `position:fixed;left:${Math.max(30, bx - 330)}px;top:26px;z-index:31;background:#fff;border:5px solid #16161d;border-radius:24px;padding:12px 22px;font:900 36px/1.35 ${ff};color:#16161d;box-shadow:0 6px 0 #16161d;max-width:520px`
  q.innerHTML = `アジェンダをバリューで<br>コミットして…<span style="color:#d7263d;font-size:44px">わかる？</span>`
  document.body.appendChild(q)
  const z = document.createElement('div'); z.style.cssText = `position:fixed;left:${sx - 70}px;top:${sy - 90}px;z-index:31;font:900 54px ${ff};color:#b9a7ff;-webkit-text-stroke:7px #16161d;paint-order:stroke fill;transform:rotate(-10deg)`
  z.textContent = 'ぐぅ…'; document.body.appendChild(z)
})
await p.waitForTimeout(300)
await p.screenshot({ path: ROOT + '/og.png' })
await b.close(); server.kill()
console.log('ok')
