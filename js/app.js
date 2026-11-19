/* RUN2RAVE 메인 로직: 화면 전환, 코스 선택, 게임 루프, 결과 */
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const params = new URLSearchParams(location.search);
  const FAST = Math.max(1, Number(params.get('fast')) || 1);   // 테스트용: ?fast=5
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* <svg data-fig="fig-run"> 를 스프라이트 심볼로 채운다 (viewBox 복사로 비율 유지) */
  function hydrateFigs(root = document) {
    root.querySelectorAll('svg[data-fig]').forEach((el) => {
      const sym = document.getElementById(el.dataset.fig);
      if (!sym || el.firstChild) return;
      el.setAttribute('viewBox', sym.getAttribute('viewBox'));
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `#${el.dataset.fig}`);
      el.appendChild(use);
    });
  }
  hydrateFigs();

  const engine = new BeatEngine();
  let course = COURSES[0];
  let run = null;        // 진행 중인 게임 상태
  let result = null;     // 마지막 결과

  /* ---------- 화면 전환 ---------- */
  function go(id) {
    if (id === 'to' && !course) id = 'run';
    if (id === 'rave' && !result) id = 'run';
    if (document.body.dataset.screen === 'to' && id !== 'to') stopRun();
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    document.body.dataset.screen = id;
    $$('.steps button').forEach((b) => b.setAttribute('aria-current', b.dataset.go === id ? 'step' : 'false'));
    if (id === 'to') prepareRun();
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b && !b.disabled) go(b.dataset.go);
  });

  /* ---------- 1. 코스 선택 ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  function buildMap() {
    const pins = $('#pins');
    COURSES.forEach((c) => {
      const g = svg('g', { class: 'pin', 'data-id': c.id, tabindex: 0, role: 'button', 'aria-label': `${c.level} ${c.name}` }, pins);
      const { x, y } = c.map;
      if (c.venue.id === 'loop') {
        svg('circle', { cx: x, cy: y, r: 44, class: 'pin-ring' }, g);
        svg('circle', { cx: x, cy: y, r: 28, class: 'pin-ring' }, g);
        svg('circle', { cx: x, cy: y, r: 16, class: 'pin-core' }, g);
      } else if (c.venue.id === 'ripple') {
        for (let k = 0; k < 3; k++) svg('path', { d: `M${x - 40} ${y - 26 + k * 13} q10 -10 20 0 t20 0 t20 0 t20 0`, class: 'pin-ring' }, g);
        svg('circle', { cx: x, cy: y + 18, r: 16, class: 'pin-core' }, g);
      } else {
        svg('polygon', { points: `${x},${y - 30} ${x + 30},${y + 22} ${x - 30},${y + 22}`, class: 'pin-core' }, g);
        svg('polyline', { points: `${x - 46},${y + 40} ${x - 23},${y + 26} ${x},${y + 40} ${x + 23},${y + 26} ${x + 46},${y + 40}`, class: 'pin-ring' }, g);
      }
      const t = svg('text', { x: x + c.map.labelDx, y: y + c.map.labelDy, class: 'pin-label' }, g);
      t.textContent = c.level;
      const t2 = svg('text', { x: x + c.map.labelDx, y: y + c.map.labelDy + 20, class: 'pin-sub' }, g);
      t2.textContent = `${c.name} → ${c.venue.name}`;
      g.addEventListener('click', () => selectCourse(c.id));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCourse(c.id); } });
    });
  }

  function selectCourse(id) {
    course = COURSES.find((c) => c.id === id);
    $$('.pin').forEach((p) => p.classList.toggle('on', p.dataset.id === id));
    document.documentElement.style.setProperty('--accent', course.color);
    $('#course-panel').innerHTML = `
      <div class="tabs" role="tablist">${COURSES.map((c) => `<button role="tab" data-pick="${c.id}" aria-selected="${c.id === id}">${c.level}</button>`).join('')}</div>
      <p class="panel-key">${course.keyword}</p>
      <h3>${course.name}</h3>
      <p class="panel-tag">${course.tagline}</p>
      <table>
        <tr><th>코스(편도)</th><td>${course.from} → ${course.to}</td></tr>
        <tr><th>거리</th><td><b>${course.distanceLabel}</b> · ${course.terrainLabel}</td></tr>
        <tr><th>비트</th><td><b>${course.bpm} BPM</b> · 판정 ±${course.window.toFixed(2)}초</td></tr>
        <tr><th>기준 속도</th><td><b>${course.baseKmh} KM/H</b></td></tr>
        <tr><th>도착 베뉴</th><td><b>${course.venue.name}</b> · ${course.venue.kr}<br><small>가상 베뉴 · ${course.venue.place}</small></td></tr>
      </table>
      <button class="btn big" data-go="to">이 코스로 출발 →</button>`;
    $$('[data-pick]').forEach((b) => b.addEventListener('click', () => selectCourse(b.dataset.pick)));
    $('.steps [data-go="to"]').disabled = false;
  }

  /* ---------- 2. 게임 ---------- */
  function prepareRun() {
    stopRun();
    const c = course;
    $('#to').dataset.course = c.id;
    $('#hud-level').textContent = c.level;
    $('#hud-name').textContent = `${c.name} → ${c.venue.name}`;
    $('#ready-level').textContent = `${c.level} · ${c.bpm} BPM`;
    $('#ready-name').textContent = c.name;
    $('#prog-from').textContent = c.from;
    $('#prog-to').textContent = `${c.venue.name} (가상)`;
    $('#stage-bg').className = `stage-bg ${c.stage}`;
    const bar = $('#progress-bar');
    bar.querySelectorAll('.cp').forEach((n) => n.remove());
    c.checkpoints.forEach((p) => {
      const m = document.createElement('div');
      m.className = 'cp'; m.style.left = `${p.at * 100}%`; m.title = p.name;
      bar.appendChild(m);
    });
    $('#ready').hidden = false;
    $('#count').textContent = '';
    $('#judge').textContent = '';
    updateHud(0, 0, null, 0, 'flat');
    setProgress(0);
  }

  function startRun() {
    engine.unlock();
    engine.setMuted($('#mute').checked);
    $('#ready').hidden = true;
    const c = course;
    run = {
      km: 0, elapsed: 0, speedTime: 0, speed: 0,
      scores: [], judged: new Set(), cpPassed: 0,
      compress: (c.distanceKm / (c.baseKmh * c.duration / 3600)) * FAST,
      last: performance.now(), scroll: 0, done: false
    };
    engine.start(c.bpm, 4);
    requestAnimationFrame(loop);
  }

  function stopRun() {
    engine.stop();
    if (run) run.done = true;
    run = null;
  }

  function tap() {
    if (!run || run.done) return;
    const t = engine.now() - engine.latency();
    const first = engine.beatTime(engine.countIn);
    if (t < first - course.window) return;           // 카운트인 중
    const i = Math.round((t - engine.startTime) / engine.interval);
    if (i < engine.countIn || run.judged.has(i)) return;
    const diff = Math.abs(t - engine.beatTime(i));
    if (diff <= course.window / 2) judge(i, 1, 'PERFECT');
    else if (diff <= course.window) judge(i, 0.6, 'GOOD');
    pulse();
  }

  function judge(i, score, label) {
    run.judged.add(i);
    run.scores.push(score);
    const j = $('#judge');
    j.textContent = label;
    j.className = `judge show ${label.toLowerCase()}`;
    clearTimeout(judge.t);
    judge.t = setTimeout(() => (j.className = 'judge'), 380);
  }

  function pulse() {
    const s = $('#stage');
    s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit');
  }

  function terrainAt(frac) {
    const seg = course.terrain.find((s) => frac >= s.from && frac < s.to) || course.terrain[course.terrain.length - 1];
    return seg.type;
  }

  function loop(now) {
    if (!run || run.done) return;
    const dt = Math.min(0.1, (now - run.last) / 1000);
    run.last = now;
    const at = engine.now() - engine.latency();
    const first = engine.beatTime(engine.countIn);

    // 카운트인 표시
    if (at < first) {
      const k = Math.floor((at - engine.startTime) / engine.interval);
      $('#count').textContent = k >= 0 ? String(engine.countIn - k) : '';
      drawApproach(at);
      requestAnimationFrame(loop);
      return;
    }
    if ($('#count').textContent) {
      $('#count').textContent = 'GO';
      setTimeout(() => ($('#count').textContent = ''), 400);
    }

    // 놓친 박자 처리
    const last = Math.floor((at - engine.startTime) / engine.interval);
    for (let i = engine.countIn; i <= last; i++) {
      if (!run.judged.has(i) && at > engine.beatTime(i) + course.window) judge(i, 0, 'MISS');
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
      toast(`${cp.name} 통과`);
    }

    // 화면 갱신
    const totalAcc = run.scores.length ? run.scores.reduce((a, b) => a + b, 0) / run.scores.length : null;
    updateHud(run.speed, run.elapsed, totalAcc, run.km, ter);
    setProgress(run.km / course.distanceKm);
    drawApproach(at);
    if (!reduceMotion) {
      run.scroll += run.speed * dt * 14;
      $('#stage-bg').style.backgroundPositionX = `${-run.scroll}px`;
      const phase = ((at - engine.startTime) / engine.interval) % 1;
      $('#runner').style.transform = `translateY(${-Math.abs(Math.sin(phase * Math.PI)) * 14}px) rotate(${ter === 'up' ? -6 : ter === 'down' ? 5 : 0}deg)`;
    }

    if (run.km >= course.distanceKm) return finish(totalAcc || 0);
    requestAnimationFrame(loop);
  }

  function drawApproach(at) {
    const i = Math.max(0, Math.ceil((at - engine.startTime) / engine.interval));
    const p = Math.max(0, Math.min(1, (engine.beatTime(i) - at) / engine.interval));
    const el = $('#approach');
    el.style.transform = `translate(-50%,-50%) scale(${1 + p * 1.6})`;
    el.style.opacity = String(1 - p * 0.7);
  }

  function updateHud(kmh, sec, acc, km, ter) {
    $('#hud-kmh').textContent = kmh.toFixed(1);
    $('#hud-pace').textContent = kmh > 0 ? pace(kmh) : `--'--"`;
    $('#hud-acc').textContent = acc == null ? '--%' : `${Math.round(acc * 100)}%`;
    $('#hud-time').textContent = clock(sec);
    const t = $('#hud-terrain');
    t.textContent = TERRAIN_LABEL[ter];
    t.dataset.t = ter;
    $('#prog-km').textContent = `${km.toFixed(1)} / ${course.distanceKm.toFixed(1)} KM`;
  }

  function setProgress(f) {
    $('#progress-fill').style.width = `${f * 100}%`;
    $('#progress-dot').style.left = `${f * 100}%`;
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
    result = {
      course,
      avgKmh: avg,
      pace: pace(avg),
      realSec: course.distanceKm / avg * 3600,
      acc: Math.round(acc * 100)
    };
    $('.steps [data-go="rave"]').disabled = false;
    toast(`${course.venue.name} 도착!`);
    setTimeout(() => { showResult(); go('rave'); }, 900);
  }

  /* ---------- 3. 결과와 입장권 ---------- */
  function showResult() {
    const c = result.course, v = c.venue;
    const sec = $('#rave');
    sec.dataset.venue = v.id;
    $('#rave-kicker').textContent = `FINISH · ${v.name} ${v.kr}`;
    $('#venue-line').textContent = `${v.place}(가상) — ${v.line}`;
    $('#res-kmh').textContent = result.avgKmh.toFixed(1);
    $('#res-time').textContent = clock(result.realSec);
    $('#res-acc').textContent = `${result.acc}%`;
    $('#programs').innerHTML = `<li class="pv">코어 밸류 · ${v.value}</li>` + v.programs.map((p) => `<li>${p}</li>`).join('');
    $('#venue-art').innerHTML = venueArt(v.id, c.figure);
    hydrateFigs($('#venue-art'));
    $('#save-btn').disabled = true;
    makeTicket();
  }

  function venueArt(id, fig) {
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

  $('#ticket-form').addEventListener('submit', (e) => {
    e.preventDefault();
    makeTicket();
    $('#save-btn').disabled = false;
  });

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

  /* ---------- 입력 ---------- */
  $('#start-btn').addEventListener('click', (e) => { e.stopPropagation(); startRun(); });
  $('#stage').addEventListener('pointerdown', (e) => {
    if (e.target.closest('.overlay')) return;
    tap();
  });
  $('#tap-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.screen !== 'to') return;
    if (e.code !== 'Space' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    if (!$('#ready').hidden) startRun(); else tap();
  });
  $('#mute').addEventListener('change', (e) => engine.setMuted(e.target.checked));

  /* ---------- 유틸 ---------- */
  function pace(kmh) {
    const m = 60 / kmh;
    let mm = Math.floor(m), ss = Math.round((m - mm) * 60);
    if (ss === 60) { mm++; ss = 0; }
    return `${mm}'${String(ss).padStart(2, '0')}"`;
  }
  function clock(sec) {
    const s = Math.round(sec);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  if (params.has('debug')) window.R2R = { engine, get run() { return run; }, get course() { return course; } };

  buildMap();
  selectCourse('easy');
  if (params.get('screen')) go(params.get('screen'));
})();
