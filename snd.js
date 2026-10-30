// 音のエンジン（素材なし・WebAudio）。bakage テンプレートの snd.js から。曲(p_*)と効果音(sfx)はこのゲーム用
const Snd = {
  ctx: null, muted: false, next: 0, step: 0, track: null, want: null, switchAt: 0, played: {}, lastBrush: 0,
  TEMPO: { title: 116, play: 104, win: 132, lose: 70 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return
    try {
      this.ctx = new AC()
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7
      this.an = this.ctx.createAnalyser(); this.an.fftSize = 2048; this.master.connect(this.an); this.an.connect(this.ctx.destination)
      this.bgm = this.ctx.createGain(); this.bgm.gain.value = 0.0001; this.bgm.connect(this.master)
      const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, len)
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      if (this.want) { const w = this.want; this.want = null; this.setTrack(w) }
    } catch (e) { this.ctx = null }
  },
  setMute(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.7 },
  tone(f, t0, dur, type = 'square', vol = 0.2, dest, f2) {
    if (!this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g); g.connect(dest || this.master); o.start(t0); o.stop(t0 + dur + 0.02)
  },
  noise(t0, dur, vol, freq, type = 'highpass', dest, q) {
    if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02)
  },
  now() { return this.ctx ? this.ctx.currentTime : 0 },
  level() { if (!this.an) return 0; const d = new Float32Array(this.an.fftSize); this.an.getFloatTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m },
  mtof: m => 440 * Math.pow(2, (m - 69) / 12),
  mark(n) { this.played[n] = (this.played[n] || 0) + 1 },
  setTrack(name) {
    if (this.want === name) return
    this.want = name; if (!this.ctx) return
    const now = this.ctx.currentTime, g = this.bgm.gain
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(0.0001, now + 0.25)
    this.switchAt = now + 0.27
  },
  tick() {
    if (!this.ctx) return; const c = this.ctx
    if (this.switchAt && c.currentTime >= this.switchAt) {
      this.track = this.want; this.step = 0; this.next = c.currentTime + 0.05; this.switchAt = 0
      const g = this.bgm.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(0.0001, c.currentTime); g.linearRampToValueAtTime(0.26, c.currentTime + 0.35)
      if (this.track) this.mark('bgm:' + this.track)
    }
    if (!this.track || this.switchAt) return
    const spb = 60 / this.TEMPO[this.track] / 4
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05
    while (this.next < c.currentTime + 0.25) { this['p_' + this.track](this.step, this.next); this.next += spb; this.step++ }
  },
  kick(t, v = 0.7) { this.tone(150, t, 0.16, 'sine', v, this.bgm, 42) },
  clap(t, v = 0.2) { for (const d of [0, 0.012, 0.024]) this.noise(t + d, 0.09, v, 1500, 'bandpass', this.bgm) },
  hat(t, v = 0.06, open) { this.noise(t, open ? 0.12 : 0.03, v, 8000, 'highpass', this.bgm) },
  bass(n, t, dur = 0.18, vol = 0.45, type = 'triangle') { this.tone(this.mtof(n), t, dur, type, vol, this.bgm) },
  pad(n, t, dur, vol = 0.04) { this.tone(this.mtof(n), t, dur, 'sine', vol, this.bgm); this.tone(this.mtof(n) * 2.005, t, dur * 0.6, 'sine', vol * 0.3, this.bgm) },
  stab(ns, t, dur = 0.14, vol = 0.04) {
    if (!this.ctx) return; const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain()
    f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + dur)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    for (const n of ns) for (const d of [-8, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.mtof(n); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + 0.02) }
    f.connect(g); g.connect(this.bgm)
  },
  // タイトル: のんきなオフィスのジングル（C - Am - F - G）
  p_title(i, t) {
    const bar = Math.floor(i / 16) % 4, s = i % 16
    const root = [36, 33, 41, 43][bar], ch = [[60, 64, 67], [57, 60, 64], [57, 60, 65], [59, 62, 67]][bar]
    if (s === 0 || s === 8) this.kick(t, 0.45); if (s === 4 || s === 12) this.clap(t, 0.08); if (s % 2 === 0) this.hat(t, 0.03)
    if (s === 0 || s === 6 || s === 8 || s === 14) this.bass(root + (s === 6 || s === 14 ? 7 : 0), t, 0.2, 0.34)
    if (s === 4 || s === 12) this.stab(ch, t, 0.12, 0.03)
    const mel = [[72, -1, 76, 79, -1, 76, 74, -1], [72, -1, 69, -1, 72, 74, 76, -1], [77, -1, 76, 74, -1, 72, 69, -1], [71, 72, 74, -1, 79, -1, -1, -1]]
    if (s % 2 === 0) { const n = mel[bar][s / 2]; if (n > 0) this.tone(this.mtof(n), t, 0.16, 'square', 0.035, this.bgm) }
  },
  // 会議中: エレベーターのボサノバ風（Dm7 - G7 - Cmaj7 - A7）。眠くなる
  p_play(i, t) {
    const bar = Math.floor(i / 16) % 4, s = i % 16
    const root = [38, 43, 36, 45][bar], ch = [[62, 65, 69, 72], [59, 62, 65, 69], [59, 64, 67, 71], [61, 64, 67, 70]][bar]
    if ([0, 3, 8, 11].includes(s)) this.tone(this.mtof(root + (s === 3 || s === 11 ? 7 : 0)), t, 0.28, 'sine', 0.34, this.bgm)
    if ([2, 5, 10, 13].includes(s)) for (const n of ch) this.tone(this.mtof(n), t, 0.18, 'triangle', 0.018, this.bgm)
    if (s % 2 === 0) this.noise(t, 0.04, 0.025, 6000, 'highpass', this.bgm)
    if (s === 0 || s === 8) this.tone(1800, t, 0.02, 'sine', 0.03, this.bgm)
    const mel = [[74, -1, 72, -1, 69, -1, -1, -1], [71, -1, 69, 67, -1, -1, 65, -1], [64, -1, 67, -1, 71, -1, -1, -1], [73, -1, 70, -1, 67, -1, 64, -1]]
    if (Math.floor(i / 64) % 2 === 1 && s % 2 === 0) { const n = mel[bar][s / 2]; if (n > 0) this.tone(this.mtof(n), t, 0.4, 'sine', 0.05, this.bgm) }
  },
  // 合格: にぎやかなファンファーレ（C - F - G - C）
  p_win(i, t) {
    const bar = Math.floor(i / 16) % 4, s = i % 16
    const root = [36, 41, 43, 36][bar], ch = [[64, 67, 72], [65, 69, 72], [67, 71, 74], [64, 67, 72]][bar]
    if (s % 4 === 0) this.kick(t, 0.6); if (s === 4 || s === 12) this.clap(t, 0.14); if (s % 2 === 1) this.hat(t, 0.04)
    if (s % 2 === 0) this.bass(root + (s % 4 === 2 ? 12 : 0), t, 0.12, 0.38, 'sawtooth')
    if (s === 0 || s === 6 || s === 10) this.stab(ch, t, 0.18, 0.04)
    const mel = [[72, 72, 76, 79, -1, 76, 79, -1], [81, -1, 79, 77, -1, 76, 77, -1], [79, -1, 77, 76, -1, 74, 71, -1], [72, -1, -1, -1, 84, -1, -1, -1]]
    if (s % 2 === 0) { const n = mel[bar][s / 2]; if (n > 0) this.tone(this.mtof(n), t, 0.18, 'square', 0.04, this.bgm) }
  },
  // 不合格: とぼとぼ（Am - Dm - E - Am）
  p_lose(i, t) {
    const bar = Math.floor(i / 12) % 4, s = i % 12
    const ch = [[57, 60, 64], [57, 62, 65], [56, 59, 64], [57, 60, 64]][bar], root = [33, 38, 40, 33][bar]
    if (s === 0) this.bass(root, t, 0.8, 0.3, 'sine'); if (s === 4 || s === 8) for (const n of ch) this.tone(this.mtof(n), t, 0.4, 'triangle', 0.02, this.bgm)
    const mel = [[76, 74, 72], [74, 72, 69], [71, 69, 68], [69, -1, -1]][bar]
    if (s % 4 === 0) { const n = mel[s / 4]; if (n > 0) this.tone(this.mtof(n), t, 0.5, 'sine', 0.06, this.bgm) }
  },
  // 上司のモゴモゴ声（1文字ごとに呼ぶ。高さをばらす）
  babble(ang) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime
    if (t - (this.lastBab || 0) < 0.055) return; this.lastBab = t; this.mark('babble')
    const f = (ang ? 200 : 125) + Math.random() * (ang ? 120 : 70), o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), t + 0.07)
    fl.type = 'bandpass'; fl.frequency.value = 600 + Math.random() * 900; fl.Q.value = 3
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ang ? 0.5 : 0.32, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    o.connect(fl); fl.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.1)
  },
  // 効果音
  sfx(name, v = 1) {
    if (!this.ctx) return; const t = this.ctx.currentTime; this.mark(name)
    switch (name) {
      case 'tap': this.tone(880, t, 0.06, 'triangle', 0.12 * v); break
      case 'nod': this.tone(190, t, 0.13, 'sine', 0.45, null, 140); this.tone(380, t, 0.1, 'triangle', 0.06, null, 280); break
      case 'perfect': this.tone(1320, t, 0.12, 'square', 0.06); this.tone(1980, t + 0.06, 0.18, 'triangle', 0.08); break
      case 'good': this.tone(990, t, 0.1, 'triangle', 0.08); break
      case 'miss': this.tone(160, t, 0.25, 'square', 0.08, null, 110); break
      case 'snore': this.noise(t, 1.1, 0.12, 400, 'lowpass'); this.tone(85, t, 0.9, 'sawtooth', 0.06, null, 70); this.tone(240, t + 1.0, 0.5, 'sine', 0.04, null, 600); break
      case 'bubble': this.tone(500, t, 0.2, 'sine', 0.05, null, 900); break
      case 'pop': this.noise(t, 0.05, 0.3, 2500, 'bandpass', null, 2); this.tone(900, t, 0.06, 'sine', 0.15, null, 300); break
      case 'startle': this.tone(500, t, 0.25, 'square', 0.08, null, 1400); this.tone(1200, t + 0.05, 0.2, 'triangle', 0.06, null, 1800); break
      case 'angry': this.tone(70, t, 0.6, 'sine', 0.8, null, 35); this.noise(t, 0.45, 0.35, 900, 'lowpass'); for (let k = 0; k < 5; k++) this.tone(130 + k * 9, t + 0.05, 0.6, 'sawtooth', 0.05, null, 90); break
      case 'slam': this.tone(90, t, 0.35, 'sine', 0.7, null, 40); this.noise(t, 0.25, 0.4, 1200, 'lowpass'); break
      case 'tick': this.tone(2200, t, 0.03, 'square', 0.04 * v); break
      case 'ding': this.tone(880, t, 0.45, 'triangle', 0.25); this.tone(1320, t + 0.08, 0.4, 'sine', 0.15); break
      case 'boo': this.tone(220, t, 0.25, 'sawtooth', 0.08, null, 180); this.tone(165, t + 0.25, 0.5, 'sawtooth', 0.08, null, 120); break
      case 'cricket': for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) this.tone(4200, t + k * 0.5 + j * 0.05, 0.03, 'sine', 0.05); break
      case 'roll': for (let k = 0; k < 45; k++) this.noise(t + k * 0.04, 0.05, 0.05 + k * 0.004, 1800, 'bandpass'); break
      case 'stamp': this.tone(110, t, 0.3, 'sine', 0.9, null, 45); this.noise(t, 0.2, 0.45, 2000, 'lowpass'); break
      case 'cheer': this.noise(t, 2.0, 0.14, 1200, 'bandpass', null, 0.6); for (let k = 0; k < 4; k++) this.tone(1800, t + k * 0.3, 0.3, 'sine', 0.05, null, 2600); break
      case 'sad': this.tone(392, t, 0.35, 'triangle', 0.15); this.tone(370, t + 0.35, 0.35, 'triangle', 0.15); this.tone(349, t + 0.7, 0.35, 'triangle', 0.15); this.tone(330, t + 1.05, 0.9, 'triangle', 0.15, null, 300); break
      case 'whoosh': this.noise(t, 0.3, 0.06, 900, 'bandpass', null, 2); break
    }
  },
}
