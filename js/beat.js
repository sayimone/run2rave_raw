/* 비트 엔진: Web Audio로 드럼·베이스를 직접 합성해 정확한 시각에 예약한다 (저작권 음원 없음).
 * 코스마다 groove가 다르다. 패턴은 한 마디 16스텝 문자열: x = 연주, . = 쉼
 */
const GROOVES = {
  // EASY · 하우스: 포 온 더 플로어 + 오프비트 오픈햇 + 2·4박 클랩
  house: {
    kick: 'x...x...x...x...',
    ohat: '..x...x...x...x.',
    clap: '....x.......x...',
    bass: null
  },
  // NORMAL · UK 개러지: 스윙 16비트 하이햇, 엇박 킥, 베이스
  garage: {
    kick: 'x......x..x.....',
    hat:  'x.xxx.x.x.xxx.x.',
    clap: '....x.......x...',
    bass: 'x..x..x...x..x..',
    swing: 0.12
  },
  // HARD · 테크노: 킥 + 럼블, 16비트 하이햇, 오픈햇, 마디 끝 클랩
  techno: {
    kick: 'x...x...x...x...',
    rumble: '.xx..xx..xx..xx.',
    hat:  'xxxxxxxxxxxxxxxx',
    ohat: '..x...x...x...x.',
    clap: '............x...',
    bass: null
  }
};
const BASS_NOTES = [55, 55, 65.4, 49];   // 마디마다 바뀌는 베이스 음 (Hz)

class BeatEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.timer = null;
    this.muted = false;
  }

  /* 사용자 탭 안에서 호출해야 브라우저가 소리를 허락한다 */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.noise = this._makeNoise();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  now() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }

  /* 소리가 실제로 귀에 닿는 지연 */
  latency() {
    if (!this.ctx) return 0;
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0) * 0.5;
  }

  start(bpm, groove = 'house', countIn = 4) {
    this.stop();
    this.interval = 60 / bpm;
    this.countIn = countIn;
    this.groove = GROOVES[groove] || GROOVES.house;
    this.startTime = this.now() + 0.25;
    this.nextStep = 0;           // 16분음표 단위
    this._schedule();
    this.timer = setInterval(() => this._schedule(), 25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  beatTime(i) { return this.startTime + i * this.interval; }

  _schedule() {
    const ahead = this.now() + 0.12;
    const step = this.interval / 4;
    while (this.startTime + this.nextStep * step < ahead) {
      const n = this.nextStep++;
      const beat = Math.floor(n / 4);
      let t = this.startTime + n * step;
      if (!this.ctx) continue;
      if (beat < this.countIn) {                         // 카운트인: 박마다 클릭
        if (n % 4 === 0) this._click(t, beat === this.countIn - 1 ? 1600 : 1100);
        continue;
      }
      const g = this.groove, s = n % 16, bar = Math.floor((beat - this.countIn) / 4);
      if (g.swing && s % 2 === 1) t += step * g.swing;
      if (g.kick && g.kick[s] === 'x') this._kick(t);
      if (g.rumble && g.rumble[s] === 'x') this._rumble(t);
      if (g.hat && g.hat[s] === 'x') this._hat(t, s % 4 === 0 ? 0.09 : 0.05, 0.035);
      if (g.ohat && g.ohat[s] === 'x') this._hat(t, 0.1, 0.12);
      if (g.clap && g.clap[s] === 'x') this._clap(t);
      if (g.bass && g.bass[s] === 'x') this._bass(t, BASS_NOTES[bar % BASS_NOTES.length], step * 1.6);
    }
  }

  _kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.35);
  }

  _rumble(t) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 46;
    f.type = 'lowpass'; f.frequency.value = 140;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(f).connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.16);
  }

  _hat(t, vol, len) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise;
    f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + len + 0.02);
  }

  _clap(t) {
    const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.012, 0.024].forEach((d) => g.gain.setValueAtTime(0.35, t + d));
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + 0.18);
  }

  _bass(t, freq, len) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + len);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(f).connect(g).connect(this.master);
    o.start(t); o.stop(t + len + 0.02);
  }

  _click(t, freq) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.1);
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 0.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* 베뉴 도착 */
  finale() {
    if (!this.ctx) return;
    const t = this.now() + 0.05;
    for (let i = 0; i < 4; i++) this._kick(t + i * 0.12);
    this._clap(t + 0.48);
  }
}
