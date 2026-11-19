/* 음악 엔진: Web Audio로 테크노 곡(js/tracks.js)을 실시간 합성하고 정확한 시각에 예약한다.
 * 박자 판정은 이 엔진의 시계(ctx.currentTime)를 기준으로 하므로, 일시정지는 시계를 멈추는 방식(suspend)이다.
 */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class BeatEngine {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.paused = false;
  }

  /* 사용자 탭 안에서 호출해야 브라우저가 소리를 허락한다 */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      const c = this.ctx = new AC();
      this.master = c.createGain();
      this.master.gain.value = 0.7;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.15;
      this.master.connect(comp).connect(c.destination);
      // 딜레이(덥 에코)
      this.delay = c.createDelay(2);
      const fb = c.createGain(); fb.gain.value = 0.42;
      const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
      this.delayIn = c.createGain(); this.delayIn.gain.value = 0.5;
      this.delayIn.connect(this.delay); this.delay.connect(dl).connect(fb).connect(this.delay);
      dl.connect(this.master);
      // 리버브
      this.verb = c.createConvolver();
      this.verb.buffer = this._impulse(2.4);
      this.verbIn = c.createGain(); this.verbIn.gain.value = 0.35;
      this.verbIn.connect(this.verb).connect(this.master);
      this.noise = this._makeNoise();
      this.drive = c.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 4); }
      this.drive.curve = curve;
      const dg = c.createGain(); dg.gain.value = 0.55;
      this.drive.connect(dg).connect(this.master);
    }
    if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();
  }

  now() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }

  /* 소리가 실제로 귀에 닿는 지연 */
  latency() {
    if (!this.ctx) return 0;
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0) * 0.5;
  }

  /* opts: countIn(박), preview(모든 레이어 바로) */
  start(bpm, track, opts = {}) {
    this.stop();
    this.unlock();
    this.paused = false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.interval = 60 / bpm;
    this.countIn = opts.countIn || 0;
    this.preview = !!opts.preview;
    this.track = track;
    this.delay.delayTime.value = this.interval * 0.75;   // 점8분 딜레이
    this.startTime = this.now() + 0.15;
    this.nextStep = 0;           // 16분음표 단위
    this._schedule();
    this.timer = setInterval(() => this._schedule(), 25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  pause() {
    if (!this.ctx || this.paused) return;
    this.paused = true;
    this.ctx.suspend();
  }

  resume() {
    if (!this.ctx || !this.paused) return Promise.resolve();
    this.paused = false;
    return this.ctx.resume();
  }

  beatTime(i) { return this.startTime + i * this.interval; }

  _on(layer, bar) {
    if (this.preview) return true;
    const e = this.track.enter || {};
    return bar >= (e[layer] || 0);
  }

  _schedule() {
    if (!this.ctx || this.paused) return;
    const ahead = this.now() + 0.12;
    const step = this.interval / 4;
    const T = this.track;
    while (this.startTime + this.nextStep * step < ahead) {
      const n = this.nextStep++;
      const beat = Math.floor(n / 4);
      const t = this.startTime + n * step;
      if (beat < this.countIn) {                         // 카운트인: 박마다 클릭
        if (n % 4 === 0) this._click(t, beat === this.countIn - 1 ? 1600 : 1100);
        continue;
      }
      const s = n % 16;
      const bar = Math.floor((beat - this.countIn) / 4);
      const x = (p) => p && p[s] === 'x';
      if (x(T.kick)) this._kick(t, T.kickType);
      if (x(T.rumble) && this._on('rumble', bar)) this._rumble(t);
      if (x(T.hat)) this._hat(t, s % 4 === 0 ? 0.08 : 0.05, 0.035);
      if (x(T.ohat)) this._hat(t, 0.09, 0.14);
      if (x(T.ride) && this._on('ride', bar)) this._ride(t);
      if (x(T.clap)) this._clap(t);
      if (x(T.rim)) this._rim(t);
      if (x(T.tom) && this._on('tom', bar)) this._tom(t, s < 8 ? 110 : 82);

      if (T.bass && this._on('bass', bar)) {
        const v = T.bass.notes[s];
        if (v !== null && v !== undefined) this._bass(t, mtof(T.root + v), step * T.bass.len, T.bass.type, x(T.bass.accent));
      }
      if (T.stab && this._on('stab', bar) && x(T.stab.pattern)) {
        const ch = T.stab.chords[bar % T.stab.chords.length];
        this._stab(t, ch.map((m) => mtof(T.root + 24 + m)), step * T.stab.len);
      }
      if (T.arp && this._on('arp', bar)) {
        const v = T.arp.notes[s];
        if (v !== null && v !== undefined) this._lead(t, mtof(T.root + 24 + v), step * T.arp.len, 0.05, true);
      }
      if (T.lead && this._on('lead', bar)) {
        const v = T.lead.notes[s];
        if (v !== null && v !== undefined) this._lead(t, mtof(T.root + 24 + v), step * 1.5, 0.09, false);
      }
      if (T.blip && this._on('blip', bar)) {
        const v = T.blip.notes[s];
        if (v !== null && v !== undefined) this._blip(t, mtof(T.root + v + 24));
      }
      if (T.pad && this._on('pad', bar) && s === 0 && bar % 2 === 0) {
        const ch = T.pad.chords[(bar / 2) % T.pad.chords.length];
        this._pad(t, ch.map((m) => mtof(T.root + 24 + m)), this.interval * 8);
      }
    }
  }

  /* ---------- 악기 ---------- */
  _env(g, t, peak, a, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  _kick(t, type = 'punch') {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    const f0 = type === 'hard' ? 190 : type === 'deep' ? 120 : 150;
    const dec = type === 'deep' ? 0.5 : type === 'hard' ? 0.28 : 0.34;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(type === 'deep' ? 38 : 45, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dec);
    o.connect(g).connect(type === 'hard' ? this.drive : this.master);
    o.start(t); o.stop(t + dec + 0.02);
  }

  _rumble(t) {
    const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = 44;
    f.type = 'lowpass'; f.frequency.value = 130;
    this._env(g, t, 0.24, 0.02, 0.13);
    o.connect(f).connect(g); g.connect(this.master); g.connect(this.verbIn);
    o.start(t); o.stop(t + 0.18);
  }

  _hat(t, vol, len) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    f.type = 'highpass'; f.frequency.value = 7500;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.1); s.stop(t + len + 0.02);
  }

  _ride(t) {
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 5000;
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    f.connect(g).connect(this.master);
    [2, 3, 4.16, 5.43, 6.79, 8.21].forEach((r) => {
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 400 * r;
      o.connect(f); o.start(t); o.stop(t + 0.36);
    });
  }

  _clap(t) {
    const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain(), s = c.createBufferSource();
    f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.012, 0.024].forEach((d) => g.gain.setValueAtTime(0.32, t + d));
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    s.buffer = this.noise;
    s.connect(f).connect(g); g.connect(this.master); g.connect(this.verbIn);
    s.start(t); s.stop(t + 0.2);
  }

  _rim(t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = 1750;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.connect(g); g.connect(this.master); g.connect(this.delayIn);
    o.start(t); o.stop(t + 0.04);
  }

  _tom(t, freq) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(freq * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(this.master); g.connect(this.verbIn);
    o.start(t); o.stop(t + 0.26);
  }

  _bass(t, freq, len, type, accent) {
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass';
    const oscs = [];
    if (type === 'sub') {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq; oscs.push(o);
      f.frequency.value = 400; this._env(g, t, 0.5, 0.01, len);
    } else if (type === 'acid') {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; oscs.push(o);
      f.Q.value = 14;
      f.frequency.setValueAtTime(accent ? 2600 : 1200, t);
      f.frequency.exponentialRampToValueAtTime(180, t + len * 1.4);
      this._env(g, t, accent ? 0.22 : 0.15, 0.005, len * 1.2);
    } else if (type === 'reese') {
      [-8, 8].forEach((dt) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = dt; oscs.push(o); });
      f.frequency.value = 520; this._env(g, t, 0.16, 0.01, len);
    } else {   // rolling
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; oscs.push(o);
      f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(200, t + len);
      this._env(g, t, 0.24, 0.004, len);
    }
    oscs.forEach((o) => { o.connect(f); o.start(t); o.stop(t + len + 0.05); });
    f.connect(g).connect(this.master);
  }

  _stab(t, freqs, len) {
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(500, t + len + 0.1);
    this._env(g, t, 0.07, 0.005, len + 0.08);
    freqs.forEach((fr) => [-6, 6].forEach((dt) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt;
      o.connect(f); o.start(t); o.stop(t + len + 0.15);
    }));
    f.connect(g); g.connect(this.master); g.connect(this.delayIn); g.connect(this.verbIn);
  }

  _lead(t, freq, len, vol, echo) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'square'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = 2400;
    this._env(g, t, vol, 0.004, len);
    o.connect(f).connect(g); g.connect(this.master);
    if (echo) g.connect(this.delayIn);
    g.connect(this.verbIn);
    o.start(t); o.stop(t + len + 0.05);
  }

  _blip(t, freq) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    this._env(g, t, 0.14, 0.002, 0.09);
    o.connect(g); g.connect(this.master); g.connect(this.delayIn);
    o.start(t); o.stop(t + 0.12);
  }

  _pad(t, freqs, len) {
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + len * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    freqs.forEach((fr) => [-10, 0, 10].forEach((dt) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt;
      o.connect(f); o.start(t); o.stop(t + len + 0.05);
    }));
    f.connect(g); g.connect(this.master); g.connect(this.verbIn);
  }

  _click(t, freq) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.1);
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 0.4;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _impulse(sec) {
    const c = this.ctx, len = c.sampleRate * sec, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  /* 베뉴 도착 */
  finale() {
    if (!this.ctx) return;
    const t = this.now() + 0.05;
    for (let i = 0; i < 4; i++) this._kick(t + i * 0.12, 'punch');
    this._clap(t + 0.48);
  }
}
