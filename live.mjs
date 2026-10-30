// 公開URLの確認。node live.mjs（ログインしていないブラウザで見る）。SKIPGH=1 で GitHub ページの確認を省く
// 公開URLの確認。node live.mjs（ログインしていないブラウザで見る）。SKIPGH=1 で GitHub ページの確認を省く
import { chromium, webkit } from 'playwright'
const URL0 = 'https://tom3games.github.io/nod-master/'
const out = []
for (const [name, bt, opts] of [['chromium', chromium, {}], ['webkit', webkit, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const b = await bt.launch(), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts }), p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('requestfailed', r => errs.push('fail ' + r.url()))
  await ctx.addInitScript(() => { try { localStorage.setItem('nm.played', '1') } catch (e) {} })
  await p.goto(URL0 + '?t=' + Date.now(), { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__nmReady, null, { timeout: 15000 })
  // 遊びの通し: タイトル → 会議 → 結果
  await p.evaluate(() => { try { localStorage.setItem('nm.played', '1') } catch (e) {} })
  if (bt === webkit) await p.tap('#bStart'); else await p.click('#bStart')
  const res = await p.evaluate(() => { nm.dbg.pause(true); const g = nm.G; g.bot = 'random'; while (!g.over) nm.dbg.step(1); nm.dbg.step(60 * 3.3); nm.dbg.render(); return nm.G.result.grade.ja + ' ' + nm.makeCard().width })
  await p.waitForTimeout(600)
  out.push(name + ': result=' + res)
  await p.screenshot({ path: `shots/live-${name}.png` })
  const og = await p.evaluate(async () => { const r = await fetch(document.querySelector('meta[property="og:image"]').content); return r.status + ' ' + r.headers.get('content-type') })
  out.push(`${name}: og=${og} errors=${errs.length ? errs.join(' | ') : 'none'}`)
  await b.close()
}
if (process.env.SKIPGH) { console.log(out.join('\n')); process.exit(0) }
// ログアウト状態でリポジトリ・更新履歴に個人のIDが出ていないか（公開リポジトリに文字列そのものを残さないよう分けて持つ）
const ID = ['tmk', '4men'].join('')
const b = await chromium.launch(), p = await b.newPage()
for (const u of ['https://github.com/tom3games/nod-master', 'https://github.com/tom3games/nod-master/commits/main']) {
  const res = await p.goto(u, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
  out.push(`${u} status=${res.status()} personalId=${new RegExp(ID, 'i').test(await p.content()) ? 'FOUND' : 'none'}`)
}
await b.close()
console.log(out.join('\n'))
