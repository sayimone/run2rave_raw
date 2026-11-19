/* RUN2RAVE 메인 로직: 화면 전환, 배경 음악, 코스 선택, 게임 루프, 결과 */
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const NS = 'http://www.w3.org/2000/svg';
  const params = new URLSearchParams(location.search);
  const FAST = Math.max(1, Number(params.get('fast')) || 1);   // 테스트용: ?fast=5
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svg(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  /* <svg data-fig="fig-run"> 를 스프라이트 심볼로 채운다 (viewBox 복사로 비율 유지) */
  function hydrateFigs(root = document) {
    root.querySelectorAll('svg[data-fig]').forEach((el) => {
      const sym = document.getElementById(el.dataset.fig);
      if (!sym || el.firstChild) return;
      el.setAttribute('viewBox', sym.getAttribute('viewBox'));
      svg('use', { href: `#${el.dataset.fig}` }, el);
    });
  }
  hydrateFigs();

  const engine = new BeatEngine();
  let course = COURSES[0];
  let run = null;        // 진행 중인 게임 상태
  let result = null;     // 마지막 결과

  /* ---------- 배경 음악: 달리는 화면(TO)에서는 끈다 ---------- */
  const bgm = $('#bgm');
  let musicOn = true;
  try { musicOn = localStorage.getItem('r2r-music') !== 'off'; } catch (e) { /* 저장소 없음 */ }
  let fadeTimer = null;
  function fadeTo(target, then) {
    clearInterval(fadeTimer);
    fadeTimer = setInterval(() => {
      const v = bgm.volume + (target > bgm.volume ? 0.05 : -0.05);
      bgm.volume = Math.max(0, Math.min(1, v));
      if (Math.abs(bgm.volume - target) < 0.06) { bgm.volume = target; clearInterval(fadeTimer); then && then(); }
    }, 40);
  }
  function musicPlay() {
    if (!musicOn || document.body.dataset.screen === 'to') return;
    if (bgm.paused) { bgm.volume = 0; bgm.play().then(() => fadeTo(0.7)).catch(() => {}); }
    else fadeTo(0.7);
  }
  function musicStop() { if (!bgm.paused) fadeTo(0, () => bgm.pause()); }
  function syncMusicBtn() {
    const b = $('#music-btn');
    b.setAttribute('aria-pressed', String(musicOn));
    b.textContent = musicOn ? '♪ ON' : '♪ OFF';
  }
  $('#music-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    musicOn = !musicOn;
    try { localStorage.setItem('r2r-music', musicOn ? 'on' : 'off'); } catch (err) { /* 무시 */ }
    syncMusicBtn();
    musicOn ? musicPlay() : musicStop();
  });
  // 브라우저는 첫 클릭 전에는 소리를 막으므로, 첫 입력 때 시작한다
  document.addEventListener('pointerdown', (e) => {
    if (bgm.paused && !e.target.closest('#music-btn')) musicPlay();
  }, { capture: true });
  syncMusicBtn();

  /* ---------- 화면 전환 ---------- */
  function go(id) {
    if (id === 'to' && !course) id = 'run';
    if (id === 'rave' && !result) id = 'run';
    if (document.body.dataset.screen === 'to' && id !== 'to') stopRun();
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    document.body.dataset.screen = id;
    $$('.steps button').forEach((b) => b.setAttribute('aria-current', b.dataset.go === id ? 'step' : 'false'));
    if (id === 'to') { musicStop(); prepareRun(); } else musicPlay();
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b && !b.disabled) go(b.dataset.go);
  });

  /* ---------- 고도 프로필 그래프 (path d) ---------- */
  function elevArea(c, w, h) {
    const p = c.elevation.profile, lo = c.elevation.min - 5, hi = c.elevation.max + 5;
    const pts = p.map((v, i) => `${(i / (p.length - 1) * w).toFixed(1)} ${(h - (v - lo) / (hi - lo) * h).toFixed(1)}`);
    return `M0 ${h}L${pts.join('L')}L${w} ${h}Z`;
  }

  /* ---------- 1. 코스 선택: 실제 위치에 실제 경로 모양 ---------- */
  // 서울 개략도(700x560)에 위도·경도를 대략 맞춘다
  const toMap = ([la, lo]) => ({ x: (lo - 126.76) / 0.42 * 700, y: (37.70 - la) / 0.27 * 560 });
  function buildMap() {
    const pins = $('#pins');
    COURSES.forEach((c) => {
      const g = svg('g', { class: 'pin', 'data-id': c.id, tabindex: 0, role: 'button', 'aria-label': `${c.level} ${c.name}` }, pins);
      const pts = c.route.map(toMap);
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const k = 2.2;   // 코스가 너무 작아 보이지 않게 확대
      const d = 'M' + pts.map((p) => `${(cx + (p.x - cx) * k).toFixed(1)} ${(cy + (p.y - cy) * k).toFixed(1)}`).join('L');
      svg('circle', { cx, cy, r: 46, class: 'pin-hit' }, g);
      svg('path', { d, class: 'pin-route' }, g);
      const e = pts[pts.length - 1];
      svg('circle', { cx: cx + (e.x - cx) * k, cy: cy + (e.y - cy) * k, r: 7, class: 'pin-core' }, g);
      // 한강 남쪽 코스는 라벨을 아래에 둬서 강과 겹치지 않게
      const below = c.route[0][0] < 37.53;
      const t = svg('text', { x: cx, y: below ? cy + 50 : cy - 34, class: 'pin-label', 'text-anchor': 'middle' }, g);
      t.textContent = c.level;
      g.addEventListener('click', () => selectCourse(c.id));
      g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectCourse(c.id); } });
    });
  }

  function selectCourse(id) {
    course = COURSES.find((c) => c.id === id);
    $$('.pin').forEach((p) => p.classList.toggle('on', p.dataset.id === id));
    document.documentElement.style.setProperty('--accent', course.color);
    $('#course-panel').innerHTML = `
      <div class="tabs" role="tablist">${COURSES.map((c) => `<button role="tab" data-pick="${c.id}" aria-selected="${c.id === id}">${c.level}</button>`).join('')}</div>
      <h3>${course.name}</h3>
      <p class="panel-route">${course.from} → ${course.venue.name}</p>
      <svg class="panel-elev" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><path d="${elevArea(course, 300, 70)}"/></svg>
      <p class="panel-nums"><span><b>${course.distanceKm.toFixed(1)}</b>KM</span><span><b>${course.bpm}</b>BPM</span><span><b>+${course.elevation.gain}</b>M</span></p>
      <button class="btn big" data-go="to">출발 →</button>`;
    $$('[data-pick]').forEach((b) => b.addEventListener('click', () => selectCourse(b.dataset.pick)));
    $('.steps [data-go="to"]').disabled = false;
  }

  /* ---------- 2. 게임: 실제 경로 지도 ---------- */
  const stage = $('#stage');
  let map = null;
  function viewWidth() { return Math.max(stage.clientWidth * 0.5, 380); }   // 화면에 보이는 폭(미터)
  function setupMap() {
    const r = Route.make(course.route);
    const u = viewWidth() / stage.clientWidth;
    map = { r, face: -1, ...Route.draw($('#map-view'), $('#mini'), r, course, u) };
    drawMap(0);
  }
  function drawMap(f) {
    if (!map) return;
    const p = Route.at(map.r, f);
    const vw = viewWidth(), vh = vw * stage.clientHeight / stage.clientWidth;
    $('#map-view').setAttribute('viewBox', `${p.x - vw / 2} ${p.y - vh / 2} ${vw} ${vh}`);
    map.done.setAttribute('stroke-dashoffset', map.r.total * (1 - f));
    map.dot.setAttribute('cx', p.x); map.dot.setAttribute('cy', p.y);
    map.face = p.dx > 0 ? -1 : 1;     // 피규어 원본이 왼쪽을 보므로 오른쪽으로 갈 땐 뒤집는다
  }
  window.addEventListener('resize', () => { if (document.body.dataset.screen === 'to' && map) setupMap(); });

  function prepareRun() {
    stopRun();
    const c = course;
    $('#to').dataset.course = c.id;
    $('#ready-name').textContent = `${c.level} · ${c.name}`;
    setupMap();
    $('#progress-venue').textContent = c.venue.name.replace('R2R ', '');
    $('#elev-bg').setAttribute('d', elevArea(c, 1000, 60));
    $('#elev-fg').setAttribute('d', elevArea(c, 1000, 60));
    $('#ready').hidden = false;
    $('#count').textContent = '';
    $('#judge').textContent = '';
    $('#cue').textContent = '';
    setHoldArc(0, false);
    $('#runner').style.transform = `translate(-50%, -50%) scaleX(${map.face})`;
    updateHud(0, 0, 'flat');
    setProgress(0);
  }

  function startRun() {
    engine.unlock();
    $('#ready').hidden = true;
    const c = course;
    run = {
      km: 0, elapsed: 0, speedTime: 0, speed: 0,
      scores: [], judged: new Set(), cpPassed: 0,
      compress: (c.distanceKm / (c.baseKmh * c.duration / 3600)) * FAST,
      last: performance.now(), done: false,
      chart: [], covered: -1, hold: null
    };
    engine.start(c.bpm, c.groove, 4);
    requestAnimationFrame(loop);
  }

  function stopRun() {
    engine.stop();
    if (run) run.done = true;
    run = null;
  }

  function terrainAt(frac) {
    const seg = course.terrain.find((s) => frac >= s.from && frac < s.to) || course.terrain[course.terrain.length - 1];
    return seg.type;
  }

  /* ---------- 노트 차트: 기본은 탭, 오르막에서는 '홀드'(누르고 버티기) ---------- */
  const HOLD_LEN = 2;   // 박
  function note(i) {
    if (i < engine.countIn) return { type: 'rest' };
    while (run.chart.length <= i) {
      const j = run.chart.length;
      if (j < engine.countIn || j <= run.covered) { run.chart.push({ type: 'rest' }); continue; }
      const up = terrainAt(run.km / course.distanceKm) === 'up';
      if (up && (j - engine.countIn) % 4 === 0) {
        run.chart.push({ type: 'hold', len: HOLD_LEN });
        run.covered = j + HOLD_LEN;
      } else run.chart.push({ type: 'tap' });
    }
    return run.chart[i];
  }

  function nowT() { return engine.now() - engine.latency(); }

  /* 누르기: 가까운 박의 노트를 판정. 홀드면 누르고 있는 상태로 */
  function press() {
    if (!run || run.done || run.hold) return;
    const t = nowT();
    const i0 = Math.round((t - engine.startTime) / engine.interval);
    let best = null;
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      if (i < engine.countIn || run.judged.has(i) || note(i).type === 'rest') continue;
      const diff = Math.abs(t - engine.beatTime(i));
      if (diff <= course.window && (!best || diff < best.diff)) best = { i, diff };
    }
    if (!best) return;
    const n = note(best.i);
    const perfect = best.diff <= course.window / 2;
    run.judged.add(best.i);
    if (n.type === 'hold') {
      run.hold = { i: best.i, end: engine.beatTime(best.i + n.len), score: perfect ? 1 : 0.6, label: perfect ? 'PERFECT' : 'GOOD' };
      showJudge('HOLD', 'hold');
    } else {
      record(perfect ? 1 : 0.6, perfect ? 'PERFECT' : 'GOOD');
    }
    pulse();
  }

  /* 떼기: 홀드를 끝까지 버텼는지 */
  function release() {
    if (!run || !run.hold) return;
    const h = run.hold;
    run.hold = null;
    setHoldArc(0, false);
    if (nowT() >= h.end - course.window) record(h.score, h.label);
    else record(0.3, 'BREAK');
  }

  function record(score, label) {
    run.scores.push(score);
    showJudge(label, label.toLowerCase());
  }
  function showJudge(label, cls) {
    const j = $('#judge');
    j.textContent = label;
    j.className = `judge show ${cls}`;
    clearTimeout(showJudge.t);
    showJudge.t = setTimeout(() => (j.className = 'judge'), 380);
  }
  function pulse() {
    stage.classList.remove('hit'); void stage.offsetWidth; stage.classList.add('hit');
  }
  const ARC = 2 * Math.PI * 64;
  function setHoldArc(f, on) {
    const a = $('#hold-arc');
    a.classList.toggle('on', on);
    a.style.strokeDashoffset = String(ARC * (1 - f));
  }

  function loop(now) {
    if (!run || run.done) return;
    const dt = Math.min(0.1, (now - run.last) / 1000);
    run.last = now;
    const at = nowT();
    const first = engine.beatTime(engine.countIn);
    const cur = Math.floor((at - engine.startTime) / engine.interval);
    note(cur + 2);   // 차트를 미리 채운다

    drawApproach(at, cur);

    // 카운트인 표시
    if (at < first) {
      $('#count').textContent = cur >= 0 ? String(engine.countIn - cur) : '';
      requestAnimationFrame(loop);
      return;
    }
    if ($('#count').textContent) {
      $('#count').textContent = 'GO';
      setTimeout(() => ($('#count').textContent = ''), 400);
    }

    // 놓친 노트
    for (let i = engine.countIn; i <= cur; i++) {
      const n = note(i);
      if (n.type !== 'rest' && !run.judged.has(i) && at > engine.beatTime(i) + course.window) {
        run.judged.add(i);
        record(0, 'MISS');
      }
    }
    // 홀드 진행: 끝까지 누르고 있으면 자동 성공
    if (run.hold) {
      const h = run.hold, st = engine.beatTime(h.i);
      setHoldArc(Math.min(1, (at - st) / (h.end - st)), true);
      if (at >= h.end + 0.05) { run.hold = null; setHoldArc(0, false); record(h.score, h.label); }
    }

    // 속도 계산
    const recent = run.scores.slice(-8);
    const acc8 = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0.6;
    const frac = run.km / course.distanceKm;
    const ter = terrainAt(frac);
    const target = course.baseKmh * (0.7 + 0.5 * acc8) * TERRAIN_FACTOR[ter];
    run.speed += (target - run.speed) * Math.min(1, dt * 3);

    run.elapsed += dt;
    run.speedTime += run.speed * dt;
    run.km = Math.min(course.distanceKm, run.km + run.speed * dt / 3600 * run.compress);

    // 체크포인트
    const cp = course.checkpoints[run.cpPassed];
    if (cp && run.km / course.distanceKm >= cp.at) {
      run.cpPassed++;
      toast(cp.name);
    }

    const totalAcc = run.scores.length ? run.scores.reduce((a, b) => a + b, 0) / run.scores.length : null;
    updateHud(run.speed, run.km, ter);
    setProgress(run.km / course.distanceKm);
    drawMap(run.km / course.distanceKm);
    const phase = ((at - engine.startTime) / engine.interval) % 1;
    const hop = reduceMotion || run.hold ? 0 : Math.abs(Math.sin(phase * Math.PI)) * 10;
    $('#runner').style.transform = `translate(-50%, calc(-50% - ${hop}px)) scaleX(${map.face})`;

    if (run.km >= course.distanceKm) return finish(totalAcc || 0);
    requestAnimationFrame(loop);
  }

  /* 다가오는 링: 다음 노트까지 한 박 동안 줄어든다. 홀드면 굵은 링 + HOLD 표시 */
  function drawApproach(at, cur) {
    let i = Math.max(engine.countIn, cur);
    while (note(i).type === 'rest' || run.judged.has(i) || engine.beatTime(i) < at - course.window) i++;
    const p = Math.max(0, Math.min(1, (engine.beatTime(i) - at) / engine.interval));
    const el = $('#approach');
    const isHold = note(i).type === 'hold';
    el.classList.toggle('hold', isHold);
    el.style.transform = `translate(-50%,-50%) scale(${1 + p * 1.6})`;
    el.style.opacity = String(1 - p * 0.7);
    $('#cue').textContent = isHold && p < 1 && !run.hold ? 'HOLD' : '';
  }

  function updateHud(kmh, km, ter) {
    $('#hud-kmh').textContent = kmh.toFixed(1);
    const t = $('#hud-terrain');
    t.hidden = ter === 'flat';
    t.textContent = TERRAIN_LABEL[ter];
    t.dataset.t = ter;
    $('#prog-km').textContent = `${km.toFixed(1)} / ${course.distanceKm.toFixed(1)} KM`;
  }

  function setProgress(f) {
    $('#elev-clip-rect').setAttribute('width', String(f * 1000));
    $('#elev-dot').setAttribute('x1', String(f * 1000));
    $('#elev-dot').setAttribute('x2', String(f * 1000));
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 1400);
  }

  function finish(acc) {
    run.done = true;
    engine.stop();
    engine.finale();
    const avg = run.speedTime / run.elapsed;
    result = { course, avgKmh: avg, pace: pace(avg), acc: Math.round(acc * 100) };
    $('.steps [data-go="rave"]').disabled = false;
    toast(`${course.venue.name}`);
    setTimeout(() => { showResult(); go('rave'); }, 900);
  }

  /* ---------- 3. 결과와 입장권 ---------- */
  function showResult() {
    const v = result.course.venue;
    $('#rave').dataset.venue = v.id;
    $('#rave-kicker').textContent = v.name;
    $('#res-kmh').textContent = result.avgKmh.toFixed(1);
    $('#res-acc').textContent = `${result.acc}%`;
    $('#venue-art').innerHTML = venueArt(v.id);
    hydrateFigs($('#venue-art'));
    makeTicket();
  }

  function venueArt(id) {
    let lines = '';
    if (id === 'loop') lines = [1, 2, 3, 4].map((k) => `<circle class="va va${k}" cx="300" cy="300" r="${k * 70}"/>`).join('');
    else if (id === 'ripple') lines = [0, 1, 2, 3, 4].map((k) => `<path class="va va${k}" d="M-50 ${200 + k * 70} q50 -40 100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0"/>`).join('');
    else lines = `<polyline class="va va1" points="-20,420 60,260 140,400 220,180 300,380 380,220 460,400 540,280 620,420"/>`;
    return `<svg class="va-bg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">${lines}</svg>
      <svg class="vf vf1" data-fig="fig-jump"></svg>
      <svg class="vf vf2" data-fig="fig-dance"></svg>`;
  }

  function ticketNo() {
    let n = Math.floor(Math.random() * 900) + 100;
    try {
      n = (Number(localStorage.getItem('r2r-no')) || 0) + 1;
      localStorage.setItem('r2r-no', String(n));
    } catch (e) { /* 저장소를 못 쓰면 임의 번호 */ }
    return String(n).padStart(3, '0');
  }

  function makeTicket() {
    const d = new Date();
    drawTicket($('#ticket'), {
      ...result,
      name: ($('#runner-name').value.trim() || 'RUNNER'),
      no: result.no || (result.no = ticketNo()),
      date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    });
  }

  $('#runner-name').addEventListener('input', () => result && makeTicket());
  $('#save-btn').addEventListener('click', () => {
    try {
      const a = document.createElement('a');
      a.download = `run2rave-ticket-${result.course.venue.id}.png`;
      a.href = $('#ticket').toDataURL('image/png');
      a.click();
    } catch (e) {
      alert('이 환경에서는 이미지 저장이 막혀 있어요. 로컬 서버나 GitHub Pages 주소에서 열어 주세요.');
    }
  });
  $('#again-btn').addEventListener('click', () => go('to'));

  /* ---------- 입력: 화면 누르기/떼기, Space 누르기/떼기 ---------- */
  $('#start-btn').addEventListener('click', (e) => { e.stopPropagation(); startRun(); });
  $('#to').addEventListener('pointerdown', (e) => {
    if (e.target.closest('.overlay, .nav')) return;
    e.preventDefault();
    press();
  });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.screen !== 'to') return;
    if (e.code !== 'Space' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    if (!$('#ready').hidden) startRun(); else press();
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.key === ' ') release();
  });

  /* ---------- 유틸 ---------- */
  function pace(kmh) {
    const m = 60 / kmh;
    let mm = Math.floor(m), ss = Math.round((m - mm) * 60);
    if (ss === 60) { mm++; ss = 0; }
    return `${mm}'${String(ss).padStart(2, '0')}"`;
  }

  if (params.has('debug')) window.R2R = { engine, note: (i) => note(i), get map() { return map; }, get run() { return run; }, get course() { return course; } };

  buildMap();
  selectCourse('easy');
  if (params.get('screen')) go(params.get('screen'));
})();
