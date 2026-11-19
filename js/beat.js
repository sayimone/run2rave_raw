/* 비트 엔진: Web Audio로 킥·하이햇을 직접 만들어 정확한 시각에 예약한다.
 * 저작권 걱정 없는 합성음만 쓴다.
 */
class BeatEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.timer = null;
    this.beats = [];       // 예약된 박자 시각(오디오 시계 기준, 초)
    this.nextIndex = 0;
    this.muted = false;
  }

  /* 사용자 탭 안에서 호출해야 브라우저가 소리를 허락한다 */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
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

  start(bpm, countIn = 4) {
    this.stop();
    this.bpm = bpm;
    this.interval = 60 / bpm;
    this.countIn = countIn;
    this.beats = [];
    this.startTime = this.now() + 0.25;
    this.nextIndex = 0;
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
    while (this.beatTime(this.nextIndex) < ahead) {
      const i = this.nextIndex;
      const t = this.beatTime(i);
      this.beats.push(t);
      if (this.ctx) {
        if (i < this.countIn) this._click(t, i === this.countIn - 1 ? 1600 : 1100);
        else {
          this._kick(t);
          this._hat(t + this.interval / 2);
          if ((i - this.countIn) % 4 === 3) this._hat(t + this.interval * 0.75, 0.05);
        }
      }
      this.nextIndex++;
    }
  }

  _kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.35);
  }

  _hat(t, vol = 0.12) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + 0.06);
  }

  _click(t, freq) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.1);
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* 소리 크게 한 번: 베뉴 도착 */
  finale() {
    if (!this.ctx) return;
    const t = this.now() + 0.05;
    for (let i = 0; i < 4; i++) this._kick(t + i * 0.12);
    this._hat(t + 0.5, 0.2);
  }
}
