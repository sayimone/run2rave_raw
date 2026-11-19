/* 실제 경로(위도·경도) → 화면 좌표(미터) 변환과 지도 그리기 */
const Route = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  function make(latlon) {
    const lat0 = latlon.reduce((a, p) => a + p[0], 0) / latlon.length;
    const lon0 = latlon.reduce((a, p) => a + p[1], 0) / latlon.length;
    const kx = Math.cos(lat0 * Math.PI / 180) * 111320, ky = 110540;
    const pts = latlon.map(([la, lo]) => ({ x: (lo - lon0) * kx, y: -(la - lat0) * ky }));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return {
      pts, cum, total: cum[cum.length - 1],
      bbox: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) },
      d: 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')
    };
  }

  /* 경로 위 f(0~1) 지점의 좌표와 진행 방향 */
  function at(r, f) {
    const d = Math.max(0, Math.min(1, f)) * r.total;
    let i = 1;
    while (i < r.cum.length - 1 && r.cum[i] < d) i++;
    const a = r.pts[i - 1], b = r.pts[i];
    const seg = r.cum[i] - r.cum[i - 1] || 1;
    const t = (d - r.cum[i - 1]) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: b.x - a.x, dy: b.y - a.y };
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* 큰 지도(따라가는 카메라)와 미니맵을 그린다. u = 1px이 몇 미터인지 */
  function draw(view, mini, r, course, u) {
    view.innerHTML = '';
    const cam = el('g', { id: 'cam' }, view);
    const b = r.bbox, pad = 2000;
    const defs = el('defs', {}, view);
    const pat = el('pattern', { id: 'grid', width: 60, height: 60, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M60 0H0V60', fill: 'none', stroke: '#222', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }, pat);
    el('rect', { x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2, fill: 'url(#grid)' }, cam);
    el('path', { d: r.d, class: 'route-bg', 'stroke-width': 16 * u }, cam);
    const done = el('path', { d: r.d, class: 'route-done', 'stroke-width': 8 * u, 'stroke-dasharray': `${r.total} ${r.total}`, 'stroke-dashoffset': r.total }, cam);

    // 출발점
    const s = r.pts[0];
    el('circle', { cx: s.x, cy: s.y, r: 7 * u, class: 'mk-start' }, cam);
    label(cam, s.x, s.y + 24 * u, course.from, u, 'mk-label');
    // 체크포인트
    course.checkpoints.forEach((cp) => {
      const p = at(r, cp.at);
      el('circle', { cx: p.x, cy: p.y, r: 6 * u, class: 'mk-cp' }, cam);
      label(cam, p.x, p.y - 14 * u, cp.name, u, 'mk-label');
    });
    // 도착 베뉴
    const e = r.pts[r.pts.length - 1];
    el('rect', { x: e.x - 30 * u, y: e.y - 16 * u, width: 60 * u, height: 32 * u, rx: 6 * u, class: 'mk-venue' }, cam);
    label(cam, e.x, e.y + 6 * u, 'R2R', u, 'mk-venue-t', 18);
    label(cam, e.x, e.y + 36 * u, course.venue.name, u, 'mk-label');

    // 미니맵
    const m = 0.12 * Math.max(b.w, b.h);
    mini.setAttribute('viewBox', `${b.x - m} ${b.y - m} ${b.w + m * 2} ${b.h + m * 2}`);
    mini.innerHTML = '';
    el('path', { d: r.d, class: 'mini-route' }, mini);
    el('circle', { cx: e.x, cy: e.y, r: Math.max(b.w, b.h) * 0.04, class: 'mini-end' }, mini);
    const dot = el('circle', { cx: s.x, cy: s.y, r: Math.max(b.w, b.h) * 0.045, class: 'mini-dot' }, mini);
    return { cam, done, dot };
  }

  function label(parent, x, y, text, u, cls, px = 13) {
    const t = el('text', { x, y, class: cls, 'font-size': px * u, 'text-anchor': 'middle' }, parent);
    t.textContent = text;
    return t;
  }

  return { make, at, draw };
})();
