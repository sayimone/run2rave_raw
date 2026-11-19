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
        <tr><th>비트</th><td><b>${course.bpm} BPM</b></td></tr>
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
    $('#ready-name').textContent = `${c.level} · ${c.name}`;
    $('#stage-bg').className = `stage-bg ${c.stage}`;
    $('#progress-venue').textContent = c.venue.name.replace('R2R ', '');
    const bar = $('#progress-bar');
    bar.querySelectorAll('.cp').forEach((n) => n.remove());
    c.checkpoints.forEach((p) => {
      const m = document.createElement('div');
      m.className = 'cp'; m.style.left = `${p.at * 100}%`; m.title = p.name;
      bar.appendChild(m);
    });
    $('#ready').hidden = false;
    $('#count').textContent = '';
    clearNotes();
    $('#runner').style.transform = `translate(${stage.clientWidth * 0.14}px, ${stage.clientHeight * 0.72}px) translate(-50%, -100%) scaleX(-1)`;
    updateHud(0, 0, 'flat');
    setProgress(0);
  }

  /* ---------- 노트(원) 배치: osu처럼 화면 곳곳에 박자마다 원이 뜬다 ---------- */
  const stage = $('#stage');
  const notesEl = $('#notes');
  const linksEl = $('#links');

  function noteR() { return parseFloat(getComputedStyle(stage).getPropertyValue('--note')) / 2 || 48; }

  // i번째 박자의 원 위치(0~1 비율). 이전 위치에서 부드럽게 이어지는 랜덤 워크
  function point(i) {
    const P = run.points;
    if (P[i]) return P[i];
    if (i < engine.countIn) return P[engine.countIn - 1];
    const prev = point(i - 1);
    const w = stage.clientWidth, h = stage.clientHeight, r = noteR();
    const mx = (r + 16) / w, my = (r + 16) / h;
    const d = r * 2;
    const step = Math.max(d * 1.25, Math.min(d * (2 + Math.random() * 1.5), Math.min(w, h) * 0.9));
    const prev2 = i - 2 >= engine.countIn ? point(i - 2) : null;
    let ang = run.angle + (Math.random() - 0.5) * 2.2;
    let x, y;
    for (let k = 0; k < 16; k++) {
      x = prev.x + Math.cos(ang) * step / w;
      y = prev.y + Math.sin(ang) * step / h;
      const inside = x > mx && x < 1 - mx && y > my + 0.04 && y < 1 - my;
      const clear = !prev2 || Math.hypot((x - prev2.x) * w, (y - prev2.y) * h) > d * 1.1;
      if (inside && clear) break;
      ang += Math.PI / 3 + Math.random();
    }
    x = Math.min(1 - mx, Math.max(mx, x));
    y = Math.min(1 - my, Math.max(my + 0.04, y));
    run.angle = ang;
    return (P[i] = { x, y });
  }

  function spawnNote(i) {
    const p = point(i);
    const el = document.createElement('div');
    el.className = 'note';
    el.style.left = `${p.x * 100}%`;
    el.style.top = `${p.y * 100}%`;
    el.innerHTML = `<span class="note-ring"></span><b>${((i - engine.countIn) % 4) + 1}</b>`;
    notesEl.appendChild(el);
    // 다음 원으로 이어지는 선
    let link = null;
    if (run.notes.has(i - 1)) {
      const q = point(i - 1);
      link = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      link.setAttribute('x1', q.x * 100); link.setAttribute('y1', q.y * 100);
      link.setAttribute('x2', p.x * 100); link.setAttribute('y2', p.y * 100);
      linksEl.appendChild(link);
    }
    run.notes.set(i, { el, ring: el.firstChild, link });
  }

  function retireNote(i, cls) {
    const n = run.notes.get(i);
    if (!n) return;
    n.el.classList.add('out', cls);
    if (n.link) n.link.classList.add('out');
    setTimeout(() => { n.el.remove(); n.link && n.link.remove(); }, 320);
    run.notes.delete(i);
  }

  function clearNotes() {
    notesEl.innerHTML = '';
    linksEl.innerHTML = '';
  }

  function startRun() {
    engine.unlock();
    $('#ready').hidden = true;
    const c = course;
    run = {
      km: 0, elapsed: 0, speedTime: 0, speed: 0,
      scores: [], judged: new Set(), cpPassed: 0,
      compress: (c.distanceKm / (c.baseKmh * c.duration / 3600)) * FAST,
      last: performance.now(), scroll: 0, done: false,
      points: [], angle: -0.4, notes: new Map(), spawned: 0
    };
    engine.start(c.bpm, 4);
    run.points[engine.countIn - 1] = { x: 0.14, y: 0.72 };
    run.spawned = engine.countIn;
    run.approach = Math.max(engine.interval * 2, 0.8);   // 원이 나타나서 박자까지 걸리는 시간
    requestAnimationFrame(loop);
  }

  function stopRun() {
    engine.stop();
    if (run) run.done = true;
    run = null;
    clearNotes();
  }

  /* 탭 판정. pos가 있으면(마우스·터치) 원 안을 눌렀는지도 본다. 키보드는 박자만 본다 */
  function tap(pos) {
    if (!run || run.done) return;
    const t = engine.now() - engine.latency();
    let best = null;
    run.notes.forEach((n, i) => {
      if (run.judged.has(i)) return;
      const diff = Math.abs(t - engine.beatTime(i));
      if (diff > course.window) return;
      if (pos) {
        const p = point(i), r = noteR() * 1.35;
        const dx = (pos.x - p.x) * stage.clientWidth, dy = (pos.y - p.y) * stage.clientHeight;
        if (dx * dx + dy * dy > r * r) return;
      }
      if (best === null || i < best.i) best = { i, diff };
    });
    if (!best) return;
    if (best.diff <= course.window / 2) judge(best.i, 1, 'PERFECT');
    else judge(best.i, 0.6, 'GOOD');
  }

  function judge(i, score, label) {
    run.judged.add(i);
    run.scores.push(score);
    const p = point(i);
    retireNote(i, score > 0 ? 'hit' : 'miss');
    const pop = document.createElement('div');
    pop.className = `judge-pop ${label.toLowerCase()}`;
    pop.textContent = label;
    pop.style.left = `${p.x * 100}%`;
    pop.style.top = `${p.y * 100}%`;
    notesEl.appendChild(pop);
    setTimeout(() => pop.remove(), 520);
  }

  function terrainAt(frac) {
    const seg = course.terrain.find((s) => frac >= s.from && frac < s.to) || course.terrain[course.terrain.length - 1];
    return seg.type;
  }

  /* 러너: 박자 i에 원 i 위에 착지하고, 다음 박자까지 원 i+1로 뛰어간다 */
  function moveRunner(at) {
    const s = Math.max(engine.countIn - 1, (at - engine.startTime) / engine.interval);
    const i = Math.floor(s), f = s - i;
    const a = point(i), b = point(i + 1);
    const w = stage.clientWidth, h = stage.clientHeight;
    const e = f * f * (3 - 2 * f);
    const x = (a.x + (b.x - a.x) * e) * w;
    const hop = reduceMotion ? 0 : Math.sin(f * Math.PI) * Math.min(60, h * 0.08);
    const y = (a.y + (b.y - a.y) * e) * h - noteR() - 4 - hop;
    const face = b.x >= a.x ? -1 : 1;     // 원본 피규어가 왼쪽을 보므로 오른쪽으로 갈 땐 뒤집는다
    $('#runner').style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scaleX(${face})`;
  }

  function loop(now) {
    if (!run || run.done) return;
    const dt = Math.min(0.1, (now - run.last) / 1000);
    run.last = now;
    const at = engine.now() - engine.latency();
    const first = engine.beatTime(engine.countIn);

    // 원 생성: 박자 시각보다 approach초 먼저 나타난다
    while (engine.beatTime(run.spawned) - at <= run.approach) spawnNote(run.spawned++);

    // 다가오는 링
    run.notes.forEach((n, i) => {
      const p = Math.max(0, Math.min(1, (engine.beatTime(i) - at) / run.approach));
      n.ring.style.transform = `scale(${1 + p * 1.8})`;
      n.ring.style.opacity = String(0.35 + (1 - p) * 0.65);
    });
    moveRunner(at);

    // 카운트인 표시
    if (at < first) {
      const k = Math.floor((at - engine.startTime) / engine.interval);
      $('#count').textContent = k >= 0 ? String(engine.countIn - k) : '';
      requestAnimationFrame(loop);
      return;
    }
    if ($('#count').textContent) {
      $('#count').textContent = 'GO';
      setTimeout(() => ($('#count').textContent = ''), 400);
    }

    // 놓친 박자 처리
    run.notes.forEach((n, i) => {
      if (!run.judged.has(i) && at > engine.beatTime(i) + course.window) judge(i, 0, 'MISS');
    });

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

    const totalAcc = run.scores.length ? run.scores.reduce((a, b) => a + b, 0) / run.scores.length : null;
    updateHud(run.speed, run.km, ter);
    setProgress(run.km / course.distanceKm);
    if (!reduceMotion) {
      run.scroll += run.speed * dt * 14;
      $('#stage-bg').style.backgroundPositionX = `${-run.scroll}px`;
    }

    if (run.km >= course.distanceKm) return finish(totalAcc || 0);
    requestAnimationFrame(loop);
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
    clearNotes();
    const avg = run.speedTime / run.elapsed;
    result = {
      course,
      avgKmh: avg,
      pace: pace(avg),
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
    $('#res-acc').textContent = `${result.acc}%`;
    $('#venue-art').innerHTML = venueArt(v.id, c.figure);
    hydrateFigs($('#venue-art'));
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

  /* ---------- 입력 ---------- */
  $('#start-btn').addEventListener('click', (e) => { e.stopPropagation(); startRun(); });
  // 원을 눌러서 탭 (마우스·터치)
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.overlay')) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    tap({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  });
  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.screen !== 'to') return;
    if (!['Space', 'KeyZ', 'KeyX'].includes(e.code) && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    if (!$('#ready').hidden) startRun(); else tap();
  });

  /* ---------- 유틸 ---------- */
  function pace(kmh) {
    const m = 60 / kmh;
    let mm = Math.floor(m), ss = Math.round((m - mm) * 60);
    if (ss === 60) { mm++; ss = 0; }
    return `${mm}'${String(ss).padStart(2, '0')}"`;
  }

  if (params.has('debug')) window.R2R = { engine, point: (i) => point(i), get run() { return run; }, get course() { return course; } };

  buildMap();
  selectCourse('easy');
  if (params.get('screen')) go(params.get('screen'));
})();
