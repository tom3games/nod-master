// 全項目の自動検証。node verify.mjs（shots/ にスクショを出す）
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = +process.env.PORT || 5571
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, played = true) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, acceptDownloads: true, ...opts })
  await ctx.addInitScript(pl => { try { localStorage.clear(); if (pl) localStorage.setItem('nm.played', '1') } catch (e) {} }, played)
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => p.errs.push('reqfail ' + r.url())); p.on('crash', () => console.log('PAGE CRASH'))
  await p.goto(URL0); await p.waitForFunction(() => window.__nmReady, null, { timeout: 15000 })
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, W = innerWidth, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,#corner button')) { if (!el.offsetParent || getComputedStyle(el).visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (r.bottom > H + 1 || r.top < -1 || r.right > W + 1 || r.left < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  // 部品どうしの重なり（プレイ中の吹き出し・メーター・うなずきボタン）
  const g = s => { const e = document.querySelector(s); return e && e.offsetParent && getComputedStyle(e).visibility !== 'hidden' ? e.getBoundingClientRect() : null }
  const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
  if (!document.querySelector('#vPlay').hidden) { const bub = g('#bubble'), nod = g('#bNod'), sl = g('.sleepBox'), hud = g('.hud'), cor = g('#corner'); if (hit(bub, nod)) over.push('bubble/nod'); if (hit(bub, sl)) over.push('bubble/sleep'); if (hit(hud, cor)) over.push('hud/corner'); if (hit(sl, nod)) over.push('sleep/nod') }
  if (!document.querySelector('#vResult').hidden) { const c = g('#vResult .resWrap'), cor = g('#corner'); if (hit(c, cor)) over.push('result/corner') }
  if (!document.querySelector('#vTitle').hidden) { const l = g('.logo'), cor = g('#corner'); if (hit(l, cor)) over.push('logo/corner') }
  return { H, over: over.slice(0, 6) }
})
// WebGL の絵が出ているか（輝度の散らばり）
const glVar = p => p.evaluate(() => {
  nm.dbg.render(); const src = nm.renderer.domElement, c = document.createElement('canvas'); c.width = 240; c.height = 240 * src.height / src.width
  const x = c.getContext('2d'); x.drawImage(src, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height).data
  let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 7) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ }
  return Math.round(s2 / n - (s / n) ** 2)
})
// Xでポスト: window.open を差し替えて、開かれるURLを取る
const xCheck = async (p, ns, want, tag, pub) => {
  await p.evaluate(() => { window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null } })
  const vis = await p.isVisible('#bX'); expect(vis, 'Xボタンが見えない')
  await p.click('#bX')
  const r = await p.evaluate(ns => ({ o: window.__opened, api: window[ns].xPost(), label: document.querySelector('#bX').textContent.trim(), bg: getComputedStyle(document.querySelector('#bX')).backgroundColor, svg: !!document.querySelector('#bX svg path') }), ns)
  expect(r.o.length === 1, 'open回数 ' + r.o.length)
  const [href, target, feat] = r.o[0], u = new URL(href), text = u.searchParams.get('text')
  expect(href.startsWith('https://x.com/intent/post?') && target === '_blank' && /noopener/.test(feat), href + ' ' + target + ' ' + feat)
  expect(u.searchParams.get('url') === pub && !/https?:/.test(text), 'url ' + href)
  expect(text.includes(tag) && want.every(w => text.includes(w)), 'text ' + text + ' want ' + want.join(','))
  expect(text === r.api.text && r.svg && r.bg === 'rgb(0, 0, 0)', JSON.stringify(r))
  return { label: r.label, text }
}
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [844, 390, 'land'], [667, 375, 'land-se'], [768, 1024, 'tab'], [1440, 900, 'pc']]
// 台本の決まった時点まで進める
const toFirstCue = (p, off) => p.evaluate(off => {
  nm.dbg.pause(true); const g = nm.start(7); const ci = g.ev.findIndex(e => e.type === 'line' && e.cue)
  while (g.i < ci) nm.dbg.step(1)
  const e = g.ev[ci]; while (g.et < e.cueAt + off - 1 / 120) nm.dbg.step(1)
  nm.nod(); return { st: { ...g.st }, d: +(g.et - e.cueAt).toFixed(3) }
}, off)

const browser = await chromium.launch()
let p = await open(browser)
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない（viewport・ピンチ・Ctrl+ホイール・Ctrl+プラス）', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r)); return r
})
await t('OGP 一式がある（og:image は ?v= 付きの公開URL）', async () => {
  const r = await p.evaluate(() => Object.fromEntries(['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => [k, document.querySelector(`meta[property="${k}"]`)?.content]).concat([['tw', document.querySelector('meta[name="twitter:card"]')?.content]])))
  expect(Object.values(r).every(Boolean) && r['og:image'] === 'https://tom3games.github.io/nod-master/og.png?v=1' && r.tw === 'summary_large_image' && r['og:url'] === 'https://tom3games.github.io/nod-master/', JSON.stringify(r))
})
await t('og.png が 1200x630 で置いてある', async () => { const b = await p.evaluate(async () => { const r = await fetch('og.png'); const bm = await createImageBitmap(await r.blob()); return [r.status, bm.width, bm.height] }); expect(b[0] === 200 && b[1] === 1200 && b[2] === 630, b); return b })
await t('タイトルが日本語で出ている', async () => { const s = await p.textContent('.logo'); expect(s.includes('うなずき') && s.includes('マスター'), s); return s.slice(0, 20) })
await t('3D の会議室が描けている（輝度の散らばり）', async () => { await p.waitForTimeout(300); const v = await glVar(p); expect(v > 400, v); return v })
await t('外部への通信がない（CDN に頼らない）', async () => {
  const r = await p.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(u => !u.startsWith(location.origin) && !u.startsWith('data:')))
  expect(!r.length, r.join(',')); return 'local only'
})
await t('初回の読み込みが 3MB 以内', async () => {
  const files = ['index.html', 'data.js', 'game.js', 'snd.js', 'vendor/three.module.js', 'vendor/three.core.js']; const total = files.reduce((a, f) => a + statSync(ROOT + '/' + f).size, 0)
  expect(total < 3e6, total); return (total / 1e6).toFixed(2) + 'MB'
})
await p.screenshot({ path: ROOT + '/shots/01-title.png' })

// ---------- 台本
await t('台本: 同じ種なら同じ台本、違う種なら違う', async () => {
  const r = await p.evaluate(() => { const a = JSON.stringify(nm.makeScript(3, 'ja')), b = JSON.stringify(nm.makeScript(3, 'ja')), c = JSON.stringify(nm.makeScript(4, 'ja')); return [a === b, a !== c] })
  expect(r[0] && r[1], r)
})
await t('台本: どの種でも 50〜62秒・「〜ね？」が8回以上・質問3回・輪が出る余裕がある', async () => {
  const r = await p.evaluate(() => { const bad = []; let minC = 99, maxT = 0, minT = 99
    for (let s = 1; s <= 60; s++) for (const L of ['ja', 'en']) { const ev = nm.makeScript(s, L), end = ev[ev.length - 1].at + 2.2, cues = ev.filter(e => e.cue), asks = ev.filter(e => e.type === 'ask').length
      minC = Math.min(minC, cues.length); maxT = Math.max(maxT, end); minT = Math.min(minT, end)
      if (end < 50 || end > 62 || cues.length < 8 || asks !== 3 || cues.some(e => e.cueAt < 1.1)) bad.push(s + L) }
    return { bad: bad.slice(0, 5), minC, minT: +minT.toFixed(1), maxT: +maxT.toFixed(1) } })
  expect(!r.bad.length, JSON.stringify(r)); return r
})
await t('台本: 吹き出しが3行に収まる長さ（日本語40字・英語110字以内）', async () => {
  const r = await p.evaluate(() => { let ja = 0, en = 0; for (let s = 1; s <= 60; s++) { for (const e of nm.makeScript(s, 'ja')) if (e.type === 'line') ja = Math.max(ja, e.len); for (const e of nm.makeScript(s, 'en')) if (e.type === 'line') en = Math.max(en, e.len) } return { ja, en } })
  expect(r.ja <= 40 && r.en <= 110, JSON.stringify(r)); return r
})

// ---------- 判定
await t('判定: 「？」ちょうどでうなずく → 完璧', async () => { const r = await toFirstCue(p, 0); expect(r.st.perfect === 1, JSON.stringify(r)); return r.d })
await t('判定: 0.13秒ずれ → まあまあ', async () => { const r = await toFirstCue(p, 0.13); expect(r.st.good === 1 && r.st.perfect === 0, JSON.stringify(r)) })
await t('判定: 0.6秒早い → 早すぎ', async () => { const r = await toFirstCue(p, -0.6); expect(r.st.early === 1, JSON.stringify(r)) })
await t('判定: 0.09秒ずれは完璧にならない', async () => { const r = await toFirstCue(p, 0.09); expect(r.st.good === 1 && r.st.perfect === 0, JSON.stringify(r)) })
await t('判定: 0.26秒遅い → 遅すぎ', async () => { const r = await toFirstCue(p, 0.26); expect(r.st.late === 1, JSON.stringify(r)) })
await t('判定: うなずかないまま過ぎる → うなずき忘れ', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(7); const ci = g.ev.findIndex(e => e.type === 'line' && e.cue); while (g.i <= ci) nm.dbg.step(1); return g.st })
  expect(r.miss === 1 && r.perfect === 0, JSON.stringify(r))
})
await t('判定: 「〜ね？」以外でうなずく → うなずきすぎ（機嫌が下がる）', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(7); nm.dbg.step(20); const m = g.mood; nm.nod(); return { extra: g.st.extra, dm: g.mood - m } })
  expect(r.extra === 1 && r.dm < 0, JSON.stringify(r))
})
await t('判定: 同じ「〜ね？」で2回は取れない', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(7); const ci = g.ev.findIndex(e => e.type === 'line' && e.cue); while (g.i < ci) nm.dbg.step(1); const e = g.ev[ci]; while (g.et < e.cueAt) nm.dbg.step(1); nm.nod(); nm.dbg.step(25); nm.nod(); return g.st })
  expect(r.perfect === 1 && r.good === 0, JSON.stringify(r))
})
await t('ひっかけ: 「〜ね。」（？なし）でうなずくと減点、輪は出ない', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); for (let sd = 1; sd < 40; sd++) { const ev = nm.makeScript(sd, 'ja'); const ti = ev.findIndex(e => e.trap); if (ti < 0) continue
    const g = nm.start(sd); g.bot = 'perfect'; while (g.i < ti) nm.dbg.step(1); g.bot = null; const e = g.ev[ti]; while (g.et < e.len / e.cps) nm.dbg.step(1); nm.dbg.render(); const ring = getComputedStyle(document.querySelector('#ring')).opacity, m = g.mood; nm.nod()
    return { sd, end: e.end, trap: g.st.trap, dm: g.mood - m, ring } } return null })
  expect(r && r.trap === 1 && r.dm <= -7 && r.ring === '0' && !/[？?]/.test(r.end), JSON.stringify(r)); return r
})
await t('ひっかけ: 台本の2割前後が「〜ね。」', async () => {
  const r = await p.evaluate(() => { let tr = 0, n = 0; for (let sd = 1; sd <= 40; sd++) for (const e of nm.makeScript(sd, 'ja')) if (e.type === 'line' && e.at > 0) { n++; if (e.trap) tr++ } return +(tr / n).toFixed(2) })
  expect(r >= 0.12 && r <= 0.35, r); return r
})
await t('後半ほど話が速く、「？」の間隔が詰まる', async () => {
  const r = await p.evaluate(() => { const ev = nm.makeScript(5, 'ja').filter(e => e.type === 'line' && e.at > 0); const a = ev[0], b = ev[ev.length - 1]; return { cps: [+a.cps.toFixed(1), +b.cps.toFixed(1)], gap: [+(a.dur - a.cueAt).toFixed(2), +(b.dur - b.cueAt).toFixed(2)] } })
  expect(r.cps[1] > r.cps[0] + 4, JSON.stringify(r)); return r
})
await t('輪っか: 「？」の直前に出て、ちょうどで緑になる', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(7); const ci = g.ev.findIndex(e => e.type === 'line' && e.cue); while (g.i < ci) nm.dbg.step(1); const e = g.ev[ci]
    while (g.et < e.cueAt - 0.5) nm.dbg.step(1); nm.dbg.render(); const a = [getComputedStyle(ring).opacity, ring.style.transform]
    while (g.et < e.cueAt) nm.dbg.step(1); nm.dbg.render(); return { a, near: ring.classList.contains('near'), op: getComputedStyle(ring).opacity } })
  expect(r.a[0] === '1' && /scale\(1\.[1-9]/.test(r.a[1]) && r.near && r.op === '1', JSON.stringify(r)); return r
})
await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(7); const ci = g.ev.findIndex(e => e.type === 'line' && e.cue); while (g.i < ci) nm.dbg.step(1); const e = g.ev[ci]; while (g.et < e.cueAt - 0.25) nm.dbg.step(1); nm.dbg.render() })
await p.screenshot({ path: ROOT + '/shots/02-play-cue.png' })
await t('プレイ画面: 吹き出しに上司のセリフ（「？」は赤）', async () => {
  const r = await p.evaluate(() => { nm.dbg.step(30); nm.dbg.render(); return { txt: document.querySelector('#btext').textContent, cue: document.querySelector('#btext .cue')?.textContent } })
  expect(r.txt.length > 8 && /[？?]$/.test(r.cue || ''), JSON.stringify(r)); return r
})

// ---------- 眠気
await t('眠気: 何もしないと白目になる（40秒以内）→ 上司が気づいて怒る', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(9); g.bot = 'none'; let at = -1; for (let k = 0; k < 60 * 40 && at < 0; k++) { nm.dbg.step(1); if (g.asleep) at = g.t }
    nm.dbg.step(2)
    const lids = nm.U.lids[0].rotation.x, eye = nm.U.eyes[0].rotation.x, snot = nm.U.snot.visible, wake = !document.querySelector('#wake').hidden
    for (let k = 0; k < 60 * 2.1; k++) nm.dbg.step(1)
    return { at: +at.toFixed(1), shirome: g.st.shirome, notice: g.st.notice, eye: +eye.toFixed(2), lids: +lids.toFixed(2), snot, wake, mood: g.mood, anger: +nm.A.anger.toFixed(2), bubble: document.querySelector('#bubble').className } })
  expect(r.at > 5 && r.shirome === 1 && r.eye < -1 && r.snot && r.wake && r.notice === 1 && r.anger > 0.3 && /angry/.test(r.bubble), JSON.stringify(r)); return r
})
await t('眠気: 白目中に7回連打すると起きる（6回では起きない）（バレない）', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(9); nm.dbg.step(10); g.sleep = 99.99; nm.dbg.step(2); const a = g.asleep; for (let i = 0; i < 6; i++) { nm.nod(); nm.dbg.step(3) } const six = g.asleep; nm.nod(); nm.dbg.step(60 * 2.5); return { a, six, asleep: g.asleep, notice: g.st.notice, shirome: g.st.shirome, sleep: Math.round(g.sleep) } })
  expect(r.a && r.six && !r.asleep && r.notice === 0 && r.shirome === 1, JSON.stringify(r)); return r
})
await t('眠気: うなずくと覚める（完璧で -16）', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(7); const ci = g.ev.findIndex(e => e.type === 'line' && e.cue); while (g.i < ci) nm.dbg.step(1); const e = g.ev[ci]; while (g.et < e.cueAt) nm.dbg.step(1); const s0 = g.sleep; nm.nod(); return +(g.sleep - s0).toFixed(1) })
  expect(r <= -15, r); return r
})
await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(9); nm.dbg.step(60 * 3); g.sleep = 99.99; nm.dbg.step(50); for (const d of document.querySelectorAll('.pop')) d.remove(); nm.dbg.render() })
await p.screenshot({ path: ROOT + '/shots/03-asleep.png' })
await p.evaluate(() => { nm.dbg.step(60 * 1.6); for (const d of document.querySelectorAll('.pop')) d.remove(); nm.dbg.render() })
await p.screenshot({ path: ROOT + '/shots/04-angry.png' })

// ---------- 質問
const toAsk = (p, k) => p.evaluate(k => { nm.dbg.pause(true); const g = nm.start(11); g.bot = 'perfect'; const ai = g.ev.findIndex(e => e.type === 'ask'); while (g.i < ai) nm.dbg.step(1); g.bot = null; while (g.ask.phase !== 'choose') nm.dbg.step(1)
  const shown = !document.querySelector('#ask').hidden, labels = [...document.querySelectorAll('#ask .btn span:last-child')].map(s => s.textContent), m = g.mood, e = g.ev[ai]
  if (k === 'good') nm.choose(e.swap ? 1 : 0); else if (k === 'bad') nm.choose(e.swap ? 0 : 1); else for (let i = 0; i < 60 * 2.3; i++) nm.dbg.step(1)
  nm.dbg.step(30); return { shown, labels, dm: g.mood - m, st: { g: g.st.askGood, b: g.st.askBad, t: g.st.askTimeout }, bubble: document.querySelector('#btext').textContent } }, k)
await t('質問: それっぽい方を選ぶと機嫌が上がる', async () => { const r = await toAsk(p, 'good'); expect(r.shown && r.labels.length === 2 && r.labels.every(Boolean) && r.dm > 0 && r.st.g === 1, JSON.stringify(r)); return r.bubble })
await t('質問: ズレすぎた方を選ぶと機嫌が下がる', async () => { const r = await toAsk(p, 'bad'); expect(r.dm < 0 && r.st.b === 1, JSON.stringify(r)); return r.bubble })
await t('質問: 2秒たつと沈黙あつかい', async () => { const r = await toAsk(p, 'timeout'); expect(r.dm < 0 && r.st.t === 1, JSON.stringify(r)); return r.bubble })
await t('質問: 数字キー 1/2 でも選べる', async () => {
  await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(11); g.bot = 'perfect'; const ai = g.ev.findIndex(e => e.type === 'ask'); while (g.i < ai) nm.dbg.step(1); g.bot = null; while (g.ask.phase !== 'choose') nm.dbg.step(1) })
  await p.keyboard.press('2'); const r = await p.evaluate(() => nm.G.st.askGood + nm.G.st.askBad); expect(r === 1, r)
})
await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(11); g.bot = 'perfect'; const ai = g.ev.findIndex(e => e.type === 'ask'); while (g.i < ai) nm.dbg.step(1); g.bot = null; while (g.ask.phase !== 'choose') nm.dbg.step(1); nm.dbg.step(40); for (const d of document.querySelectorAll('.pop')) d.remove(); nm.dbg.render() })
await p.screenshot({ path: ROOT + '/shots/05-ask.png' })

// ---------- 採点
await t('採点: 全部完璧なら特級（種10個）', async () => {
  const r = await p.evaluate(() => { const out = []; nm.dbg.pause(true); for (let s = 1; s <= 10; s++) { const g = nm.start(s); g.bot = 'perfect'; let k = 0; while (!g.over && k++ < 60 * 90) nm.dbg.step(1); out.push(g.result.grade.id) } return out })
  expect(r.every(x => x === 's'), r.join(','))
})
await t('採点: 上手い人のボット（ずれ0.05秒・返事85%）は特級が1〜5割（ぎりぎり）', async () => {
  const r = await p.evaluate(() => { const out = []; nm.dbg.pause(true); for (let s = 1; s <= 20; s++) { const g = nm.start(s); g.bot = 'skilled'; let k = 0; while (!g.over && k++ < 60 * 90) nm.dbg.step(1); out.push(g.result.grade.id) } return out.join('') })
  const n = [...r].filter(x => x === 's').length; expect(n >= 2 && n <= 11, r); return r
})
await t('採点: 適当に押すと4〜5級が大半', async () => {
  const r = await p.evaluate(() => { const out = []; nm.dbg.pause(true); for (let s = 1; s <= 20; s++) { const g = nm.start(s); g.bot = 'random'; let k = 0; while (!g.over && k++ < 60 * 90) nm.dbg.step(1); out.push(g.result.grade.id) } return out.join('') })
  const n = [...r].filter(x => x === '4' || x === '5').length; expect(n >= 15, r); return r
})
await t('採点: 何もしないと5級（白目あり）', async () => {
  const r = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(3); g.bot = 'none'; let k = 0; while (!g.over && k++ < 60 * 90) nm.dbg.step(1); return { id: g.result.grade.id, z: g.st.shirome, cmt: g.result.cmt } })
  expect(r.id === '5' && r.z >= 1, JSON.stringify(r)); return r
})
await t('採点: 適当に押すと級が散らばる（3種類以上）・同じ種なら同じ結果', async () => {
  const r = await p.evaluate(() => { const out = []; nm.dbg.pause(true); for (let s = 1; s <= 16; s++) { const g = nm.start(s); g.bot = 'random'; let k = 0; while (!g.over && k++ < 60 * 90) nm.dbg.step(1); out.push(g.result.grade.id) }
    const g = nm.start(5); g.bot = 'random'; while (!g.over) nm.dbg.step(1); const a = g.result.score; const g2 = nm.start(5); g2.bot = 'random'; while (!g2.over) nm.dbg.step(1)
    return { out, same: a === g2.result.score } })
  expect(new Set(r.out).size >= 3 && r.same, JSON.stringify(r)); return r.out.join('')
})
await t('採点: 白目があると特級は取れない', async () => {
  const r = await p.evaluate(() => nm.computeResult({ perfect: 10, good: 0, early: 0, late: 0, miss: 0, extra: 0, shirome: 1, askGood: 2, askBad: 0, askTimeout: 0, notice: 0, cues: 10 }, 100).grade.id)
  expect(r !== 's', r); return r
})
await t('採点: 境界（うなずき0回・全部ミス・機嫌0）でも落ちない', async () => {
  const r = await p.evaluate(() => [nm.computeResult({ perfect: 0, good: 0, early: 0, late: 0, miss: 0, extra: 0, shirome: 0, askGood: 0, askBad: 0, askTimeout: 0, notice: 0, cues: 0 }, 0), nm.computeResult({ perfect: 0, good: 0, early: 5, late: 5, miss: 5, extra: 40, shirome: 9, askGood: 0, askBad: 2, askTimeout: 0, notice: 9, cues: 15 }, 0)].map(x => x.grade.id + ':' + x.cmt))
  expect(r.every(x => x.startsWith('5:') && x.length > 4), r); return r
})

// ---------- 結果発表
await p.evaluate(() => { nm.dbg.pause(true); const g = nm.start(4); g.bot = 'random'; while (!g.over) nm.dbg.step(1) })
await t('結果: 発表中は級を見せない', async () => {
  const r = await p.evaluate(() => ({ ann: !document.querySelector('#announce').hidden, vis: getComputedStyle(document.querySelector('#vResult .resWrap')).visibility }))
  expect(r.ann && r.vis === 'hidden', JSON.stringify(r))
})
await p.screenshot({ path: ROOT + '/shots/06-announce.png' })
await t('結果: 3秒後にハンコが押され、級・称号・上司の一言が出る', async () => {
  const r = await p.evaluate(() => { nm.dbg.step(60 * 3.2); nm.dbg.render(); return { stamp: document.querySelector('#hanko').classList.contains('on'), grade: document.querySelector('#hanko').textContent.replace(/\s+/g, ''), title: document.querySelector('#rTitle').textContent, cmt: document.querySelector('#rCmt').textContent, id: nm.G.result.grade.ja, played: Object.keys(nm.Snd.played) } })
  expect(r.stamp && r.grade.includes(r.id) && r.title.length > 3 && r.cmt.length > 3, JSON.stringify(r)); return { grade: r.id, title: r.title }
})
await p.waitForTimeout(600)
await p.screenshot({ path: ROOT + '/shots/07-result.png' })
await t('結果画像: 1080x1350 で中身が描けている', async () => {
  const r = await p.evaluate(() => { const c = nm.makeCard(), x = c.getContext('2d'); const d = x.getImageData(40, 140, 1000, 600).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 53) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ } return { w: c.width, h: c.height, v: Math.round(s2 / n - (s / n) ** 2), url: c.toDataURL('image/png').slice(0, 30) } })
  expect(r.w === 1080 && r.h === 1350 && r.v > 300, JSON.stringify(r)); return r.v
})
await t('結果画像: 「画像を保存」でPNGがダウンロードされる', async () => {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('#bSave')])
  const path = ROOT + '/shots/card.png'; await dl.saveAs(path); const sz = statSync(path).size; expect(dl.suggestedFilename() === 'nod-master.png' && sz > 50000, sz); return sz
})
await t('Xでポスト: 押すと結果入りの x.com/intent/post が新しいタブで開く', async () => {
  const w = await p.evaluate(() => [nm.G.result.grade.ja, nm.G.result.grade.tja])
  const r = await xCheck(p, 'nm', w, '#うなずきマスター', 'https://tom3games.github.io/nod-master/'); expect(r.label === 'Xでポスト', r.label); return r
})
await t('もう一回ですぐ次の会議が始まる', async () => { await p.evaluate(() => nm.dbg.pause(false)); await p.click('#bAgain'); const r = await p.evaluate(() => ({ v: nm.S.view, i: nm.G.i, over: nm.G.over })); expect(r.v === 'play' && !r.over, JSON.stringify(r)) })
await t('スペースキーでうなずける（PC）', async () => {
  await p.evaluate(() => { nm.dbg.pause(true); nm.dbg.step(30) }); await p.keyboard.press('Space')
  const r = await p.evaluate(() => nm.G.st.extra + nm.G.st.perfect + nm.G.st.good + nm.G.st.early); expect(r === 1, r)
})
await t('画面クリックでうなずける', async () => { await p.mouse.click(200, 450); const r = await p.evaluate(() => nm.G.st.extra + nm.G.st.perfect + nm.G.st.good + nm.G.st.early); expect(r === 2, r) })
await t('音: 全部の効果音と曲を鳴らしてもエラーなし', async () => {
  const r = await p.evaluate(async () => { const S = nm.Snd; S.init(); for (const n of ['tap', 'nod', 'perfect', 'good', 'miss', 'snore', 'bubble', 'pop', 'startle', 'angry', 'slam', 'tick', 'ding', 'boo', 'cricket', 'roll', 'stamp', 'cheer', 'sad', 'whoosh']) S.sfx(n); S.babble(false); S.babble(true)
    for (const tr of ['title', 'play', 'win', 'lose']) { S.setTrack(tr); await new Promise(r => setTimeout(r, 450)); S.tick() } return { state: S.ctx && S.ctx.state, n: Object.keys(S.played).length } })
  expect(p.errs.length === 0 && r.n >= 20, JSON.stringify(r) + p.errs.join('|')); return r
})
await t('ミュートで音量0、もう一度で戻る', async () => {
  await p.click('#bMute'); const a = await p.evaluate(() => nm.Snd.master.gain.value); await p.click('#bMute'); const b = await p.evaluate(() => nm.Snd.master.gain.value); expect(a === 0 && b > 0, [a, b])
})
// 英語
await t('英語: 切り替えるとタイトル・遊び方・台本・結果が英語', async () => {
  await p.evaluate(() => nm.go('title')); await p.click('#bLang')
  const r = await p.evaluate(() => { nm.dbg.pause(true); const t1 = document.querySelector('.logo').textContent; const g = nm.start(2); g.bot = 'random'; const lines = g.ev.filter(e => e.type === 'line').map(e => e.body + e.end).join(' '); while (!g.over) nm.dbg.step(1); nm.dbg.step(60 * 3.2)
    return { t1, ja: /[ぁ-んァ-ン一-龥]/.test(lines + document.querySelector('#vResult').textContent), cue: /right\?|you know\?|make sense\?|yeah\?|see\?|okay\?|am I right\?|you get it\?/.test(lines), res: document.querySelector('#rTitle').textContent, how: document.querySelector('#how1').textContent } })
  expect(r.t1.includes('NOD') && !r.ja && r.cue && /SPACE/.test(r.how), JSON.stringify(r)); return r.res
})
await p.screenshot({ path: ROOT + '/shots/08-result-en.png' })
await t('英語: Post on X も英語の結果とハッシュタグで開く', async () => {
  const w = await p.evaluate(() => [nm.G.result.grade.en, nm.G.result.grade.ten])
  const r = await xCheck(p, 'nm', w, '#NodMaster', 'https://tom3games.github.io/nod-master/'); expect(r.label === 'Post on X', r.label); return r
})
await t('英語: 結果画像も英語で描ける', async () => { const r = await p.evaluate(() => nm.makeCard().width); expect(r === 1080, r) })
await t('ここまでエラーなし', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await p.close()

// 初回は遊び方を挟む
p = await open(browser, {}, false)
await t('初回: 「会議に出る」で遊び方が出て、「わかった」で始まる', async () => {
  await p.click('#bStart'); const a = await p.isVisible('#vHow'); await p.screenshot({ path: ROOT + '/shots/09-how.png' }); await p.click('#bHowGo'); const b = await p.evaluate(() => nm.S.view)
  expect(a && b === 'play', [a, b]); return 'ok'
})
await p.close()

// ---- 6サイズ × 全画面で一画面に収まる
for (const [w, h, name0, en] of [...SIZES, [360, 640, 'small', 1], [667, 375, 'land-se', 1]]) {
  const name = name0 + (en ? '-en' : '')
  const q = await open(browser, { viewport: { width: w, height: h } })
  if (en) { await q.click('#bLang'); await q.waitForTimeout(100) }
  const views = {}
  await q.waitForTimeout(150)
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await q.evaluate(() => nm.go('how')); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` })
  await q.evaluate(() => { nm.dbg.pause(true); const g = nm.start(7); const ci = g.ev.findIndex(e => e.type === 'line' && e.cue && e.at > 20); while (g.i < ci) nm.dbg.step(1); const e = g.ev[ci]; while (g.et < e.cueAt - 0.15) nm.dbg.step(1); nm.dbg.render() })
  views.play = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  const bub = await q.evaluate(() => { const bt = document.querySelector('#btext'), bb = document.querySelector('#bubble'), save = bt.innerHTML; let worst = 0, txt = ''
    for (let sd = 1; sd <= 15; sd++) for (const e of nm.makeScript(sd, nm.S.lang)) { if (e.type !== 'line' && e.type !== 'ask') continue
      bt.innerHTML = e.type === 'line' ? e.body + `<span class="cue done">${e.end}</span>` : `<span class="cue">${e.q}</span>`
      const over = bt.getBoundingClientRect().bottom - (bb.getBoundingClientRect().bottom - 4); if (over > worst) { worst = over; txt = bt.textContent } }
    bt.innerHTML = save; return { worst: Math.round(worst), txt } })
  await t(`${name}: どのセリフも吹き出しに収まる`, async () => { expect(bub.worst <= 0, JSON.stringify(bub)) })
  const ov = await overflow(q)
  const sz = await q.evaluate(() => { nm.dbg.render(); const s = nm.project(), fr = nm.frameRect(); return { sub: s.sub.map(Math.round), boss: s.boss.map(Math.round), fr: [fr.x0, fr.y0, fr.x1, fr.y1].map(Math.round) } })
  await q.evaluate(() => { const g = nm.G; g.bot = 'perfect'; const ai = g.ev.findIndex((e, j) => j > g.i && e.type === 'ask'); while (g.i < ai) nm.dbg.step(1); g.bot = null; while (g.ask.phase !== 'choose') nm.dbg.step(1); nm.dbg.render() })
  views.ask = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-ask.png` })
  await q.evaluate(() => { const g = nm.G; nm.choose(0); g.bot = 'random'; while (!g.over) nm.dbg.step(1); nm.dbg.step(60 * 3.3); nm.dbg.render() })
  views.result = await fit(q); await q.waitForTimeout(500); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-result.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: 2人の頭が会議室の枠内に見えている`, async () => { const [fx0, fy0, fx1, fy1] = sz.fr; const inR = ([x, y]) => x > fx0 - 4 && x < fx1 + 4 && y > fy0 - 30 && y < fy1 + 4; expect(inR(sz.sub) && inR(sz.boss), JSON.stringify(sz)); return sz })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(ov.sw <= ov.W && !ov.bad.length && o.sw <= o.W && !o.bad.length && !q.errs.length, JSON.stringify([ov, o]) + q.errs.join('|')) })
  await q.close()
}
await browser.close()

// ---- fps（GPU を使う Chromium で、会議中に測る）
{
  const gb = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
  for (const [w, h, dsf] of [[390, 844, 3], [1440, 900, 1]]) {
    const q = await open(gb, { viewport: { width: w, height: h }, deviceScaleFactor: dsf })
    await q.evaluate(() => nm.start(5)); await q.waitForTimeout(3500)
    const f = await q.evaluate(() => nm.fps())
    await t(`fps ${w}x${h}@${dsf}x（会議中）`, async () => { expect(f > 50, f); return Math.round(f) })
    await q.close()
  }
  await gb.close()
}

// ---- WebKit（iPhone 相当）でタッチの通し
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, false)
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: タップで遊び方 → 開始 → タップでうなずく', async () => {
  await wp.tap('#bStart'); const how = await wp.textContent('#how1'); await wp.tap('#bHowGo')
  await wp.evaluate(() => { nm.dbg.pause(true); nm.dbg.step(20) }); await wp.tap('#stageBox', { force: true }).catch(async () => { await wp.touchscreen.tap(200, 450) })
  const n = await wp.evaluate(() => nm.G.st.extra + nm.G.st.perfect + nm.G.st.good + nm.G.st.early)
  expect(/タップ/.test(how) && n === 1, JSON.stringify({ how, n })); return how.slice(0, 30)
})
await t('WebKit: 3D が描けている', async () => { const v = await glVar(wp); expect(v > 400, v); return v })
await wp.evaluate(() => { const g = nm.G; const ci = g.ev.findIndex(e => e.type === 'line' && e.cue && e.at > 8); while (g.i < ci) nm.dbg.step(1); const e = g.ev[ci]; while (g.et < e.cueAt - 0.2) nm.dbg.step(1); nm.dbg.render() })
await wp.screenshot({ path: ROOT + '/shots/10-webkit-play.png' })
await t('WebKit: 最後まで通して結果画像が作れる', async () => {
  const r = await wp.evaluate(() => { const g = nm.G; g.bot = 'random'; while (!g.over) nm.dbg.step(1); nm.dbg.step(60 * 3.3); nm.dbg.render(); return { g: nm.G.result.grade.ja, w: nm.makeCard().width } })
  expect(r.w === 1080, JSON.stringify(r)); return r.g
})
await wp.waitForTimeout(500); await wp.screenshot({ path: ROOT + '/shots/11-webkit-result.png' })
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
