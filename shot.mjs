// 手早く撮る: node shot.mjs <w> <h> <name> [js]
import './mute-auto.mjs'  // テスト中は絶対に音を出さない（playwright を無音に差し替え）
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = import.meta.dirname
const [w, h, name, js] = process.argv.slice(2)
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: '5473' } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: +w, height: +h }, locale: 'ja-JP' })
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto('http://localhost:5473/'); await p.waitForFunction(() => window.__nmReady, null, { timeout: 10000 }).catch(e => errs.push('notready'))
if (js) await p.evaluate(js)
await p.waitForTimeout(500)
await p.screenshot({ path: `${ROOT}/shots/${name}.png` })
console.log('errors:', errs.join(' | ') || 'none')
await b.close(); server.kill()
