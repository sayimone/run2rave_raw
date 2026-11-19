/* 리스트밴드형 입장권을 캔버스에 그린다 (1200 x 480) */
const TicketImages = {};
['wordmark-white', 'symbol-green'].forEach((n) => {
  const img = new Image();
  img.src = `assets/img/${n}.png`;
  TicketImages[n] = img;
});

function drawTicket(canvas, d) {
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const accent = d.course.color;
  c.clearRect(0, 0, W, H);

  // 바탕
  roundRect(c, 0, 0, W, H, 36); c.fillStyle = '#000'; c.fill();

  // 왼쪽 스텁
  c.save(); roundRect(c, 0, 0, 300, H, 36); c.clip();
  c.fillStyle = '#EAFE50'; c.fillRect(0, 0, 300, H); c.restore();
  c.fillStyle = '#000';
  c.font = '700 22px Oswald, sans-serif';
  c.fillText('ADMIT ONE', 36, 64);
  c.font = '700 96px Oswald, sans-serif';
  c.fillText('R2R', 36, 190);
  c.fillText(d.no, 36, 300);
  // 절취선
  c.strokeStyle = '#000'; c.setLineDash([10, 10]); c.lineWidth = 3;
  c.beginPath(); c.moveTo(300, 20); c.lineTo(300, H - 20); c.stroke();
  c.setLineDash([]);

  // 본문
  c.fillStyle = '#fff';
  c.font = '700 96px Oswald, sans-serif';
  c.fillText(d.name.toUpperCase(), 350, 150);

  // 기록
  const stats = [[d.avgKmh.toFixed(1), 'KM/H'], [`${d.acc}%`, 'BEAT']];
  stats.forEach(([v, l], i) => {
    const x = 350 + i * 290;
    c.fillStyle = accent; c.font = '700 110px Oswald, sans-serif';
    c.fillText(v, x, 330);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '700 30px Oswald, sans-serif';
    c.fillText(l, x, 372);
  });

  // 워드마크
  const wm = TicketImages['wordmark-white'];
  if (wm.complete && wm.naturalWidth) c.drawImage(wm, 350, 400, 220, 220 * wm.naturalHeight / wm.naturalWidth);

  // 베뉴 도장
  drawStamp(c, d.course.venue.id, 1040, 230, accent);

}

function drawStamp(c, id, x, y, color) {
  c.save(); c.translate(x, y);
  c.strokeStyle = color; c.lineWidth = 6;
  if (id === 'loop') {
    [24, 48, 72].forEach((r, i) => { c.globalAlpha = 1 - i * 0.3; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); });
  } else if (id === 'ripple') {
    for (let k = 0; k < 3; k++) {
      c.globalAlpha = 1 - k * 0.3; c.beginPath();
      for (let i = -80; i <= 80; i += 4) c.lineTo(i, -30 + k * 30 + Math.sin(i / 14) * 10);
      c.stroke();
    }
  } else {
    c.beginPath();
    const pts = [-80, 20, -55, -30, -30, 20, -5, -50, 20, 20, 45, -30, 80, 10];
    for (let i = 0; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.stroke();
  }
  c.globalAlpha = 1;
  c.fillStyle = color; c.font = '700 34px Oswald, sans-serif'; c.textAlign = 'center';
  c.fillText(id.toUpperCase(), 0, 120);
  c.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
