/* ================= Карточка для шеринга (сторис 9:16) =================
   Рисует PNG 1080×1920 с октаграммой и ключевыми числами расчёта,
   затем отдаёт через navigator.share (с файлом) или скачивает. */

const SITE = 'kipingame-cell.github.io/site2';

// октаграмма → SVG-строка с инлайн-стилями (сохраняем цвета сайта)
function matrixSvgInline() {
  const src = document.getElementById('matrixSvg');
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  // Chrome не растит SVG-<img> без явных размеров на корне
  const vb = (clone.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  if (!clone.getAttribute('width')) clone.setAttribute('width', vb[2] || 800);
  if (!clone.getAttribute('height')) clone.setAttribute('height', vb[3] || 800);
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const sEls = [src, ...src.querySelectorAll('*')];
  const cEls = [clone, ...clone.querySelectorAll('*')];
  sEls.forEach((s, i) => {
    const c = cEls[i];
    c.removeAttribute('class');
    c.removeAttribute('tabindex');
    c.removeAttribute('role');
    const cs = getComputedStyle(s);
    const tag = s.tagName.toLowerCase();
    if (tag === 'text') {
      c.setAttribute('fill', cs.fill);
      c.setAttribute('font-size', parseFloat(cs.fontSize) || 12);
      c.setAttribute('font-weight', cs.fontWeight);
      c.setAttribute('font-family', 'Georgia, serif');
      const anchor = cs.textAnchor;
      if (anchor && anchor !== 'start') c.setAttribute('text-anchor', anchor);
      c.removeAttribute('opacity');
      if ((cs.dominantBaseline || '') === 'central') {
        c.removeAttribute('dominant-baseline');
        c.setAttribute('y', parseFloat(c.getAttribute('y')) + (parseFloat(cs.fontSize) || 12) * 0.35);
      }
      return;
    }
    if (tag === 'polygon' || tag === 'line' || tag === 'circle') {
      c.setAttribute('fill', cs.fill === 'none' ? 'none' : cs.fill);
      c.setAttribute('stroke', cs.stroke);
      c.setAttribute('stroke-width', parseFloat(cs.strokeWidth) || 1);
      if (cs.strokeDasharray && cs.strokeDasharray !== 'none') c.setAttribute('stroke-dasharray', cs.strokeDasharray.replace(/\s+/g, ' '));
      if (tag === 'circle' && cs.fill === 'none') c.setAttribute('fill', '#1a1e3d');
    }
  });
  return clone.outerHTML;
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

async function svgToImage(svgStr) {
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

const STAR = (cx, cy, r, rot, ctx, color, lw) => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.restore();
};

export async function buildShareCard(result, d1, d2, mode) {
  const W = 1080, H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // фон
  const bg = ctx.createRadialGradient(W * 0.85, -H * 0.05, 100, W * 0.85, -H * 0.05, 900);
  bg.addColorStop(0, '#232047');
  bg.addColorStop(1, '#0a0c16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const bg2 = ctx.createRadialGradient(-100, H * 0.9, 50, -100, H * 0.9, 700);
  bg2.addColorStop(0, 'rgba(255,209,102,0.10)');
  bg2.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = bg2;
  ctx.fillRect(0, 0, W, H);

  // фирменная звезда
  STAR(W / 2, 150, 26, 0, ctx, '#ffd166', 3);
  STAR(W / 2, 150, 26, Math.PI / 4, ctx, '#ffd166', 3);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(W / 2, 150, 7, 0, 7); ctx.fill();

  // заголовок
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = '700 54px Georgia, serif';
  ctx.fillText('М А Т Р И Ц А   С У Д Ь Б Ы', W / 2, 245);

  const ru = (iso) => iso.split('-').reverse().join('.');
  ctx.fillStyle = '#eceefb';
  ctx.font = '400 36px Georgia, serif';
  const sub = mode === 'compat' ? `Совместимость  ·  ${ru(d1)} + ${ru(d2)}` : `Личный разбор  ·  ${ru(d1)}`;
  ctx.fillText(sub, W / 2, 310);

  // октаграмма
  const svgImg = await svgToImage(matrixSvgInline());
  const size = 880;
  // тёмная подложка под схему
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.strokeStyle = 'rgba(255,209,102,0.25)';
  ctx.lineWidth = 2;
  const rx = (W - size) / 2, ry = 360;
  ctx.beginPath();
  ctx.roundRect(rx - 24, ry - 24, size + 48, size + 48, 32);
  ctx.fill(); ctx.stroke();
  ctx.drawImage(svgImg, rx, ry, size, size);

  // ключевые числа
  const p = result.points;
  const chips = [
    ['Характер', p.day],
    ['Талант', p.month],
    ['Задача года', p.year],
    ['Кармический хвост', p.tail],
    ['Зона комфорта', p.center],
  ];
  const cw = 196, ch = 150, gap = 12;
  const totalW = chips.length * cw + (chips.length - 1) * gap;
  let x = (W - totalW) / 2;
  const y = ry + size + 70;
  for (const [label, val] of chips) {
    ctx.fillStyle = 'rgba(143,123,255,0.14)';
    ctx.strokeStyle = 'rgba(143,123,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, 20);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = '800 56px Georgia, serif';
    ctx.fillText(String(val), x + cw / 2, y + 72);
    ctx.fillStyle = '#9aa0c3';
    ctx.font = '400 22px Georgia, serif';
    ctx.fillText(label, x + cw / 2, y + 118);
    x += cw + gap;
  }

  // призыв + адрес
  ctx.fillStyle = '#eceefb';
  ctx.font = '400 34px Georgia, serif';
  ctx.fillText('Рассчитай свою — бесплатно и без регистрации', W / 2, H - 190);
  ctx.fillStyle = '#ffd166';
  ctx.font = '700 40px Georgia, serif';
  ctx.fillText(SITE, W / 2, H - 120);

  // рамка
  ctx.strokeStyle = 'rgba(255,209,102,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  return new Promise((res) => cv.toBlob(res, 'image/png'));
}

export async function shareMatrixCard(result, d1, d2, mode) {
  const blob = await buildShareCard(result, d1, d2, mode);
  const file = new File([blob], 'matrica-sudby.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Матрица Судьбы' });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  // запасной вариант: скачать png
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'matrica-sudby.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}
