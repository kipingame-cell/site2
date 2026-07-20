import { calcMatrix, calcCompat, yearForecast } from './core/matrixCore.js';
import { ARCANA, findKarmicTail } from './data/arcana.js';

/* ================= DOM ================= */
const $ = (id) => document.getElementById(id);
const els = {
  modeSingle: $('modeSingle'),
  modeCompat: $('modeCompat'),
  date1: $('date1'),
  date2: $('date2'),
  date2Group: $('date2Group'),
  btnCalc: $('btnCalc'),
  errorBox: $('errorBox'),
  matrixSection: $('matrixSection'),
  svg: $('matrixSvg'),
  tip: $('pointTip'),
  tabsRow: $('tabsRow'),
  slides: $('slides'),
};

let mode = 'single';
let lastResult = null;

/* ================= Подписи точек ================= */
const POINT_LABELS = {
  day: 'День рождения — портрет личности',
  month: 'Месяц — Ангел-хранитель, таланты',
  year: 'Год — материальная карма, здоровье',
  tail: 'Кармический хвост — главный урок',
  center: 'Центр — зона комфорта, душа',
  leftTop: 'Род отца — духовная линия',
  rightTop: 'Род матери — духовная линия',
  rightBottom: 'Род отца — материальная линия',
  leftBottom: 'Род матери — материальная линия',
  'left.inner': 'Эмоции — сердечная чакра',
  'left.mid': 'Талант от Бога',
  'top.inner': 'Связь с Духом — корона',
  'top.mid': 'Интуиция — третий глаз',
  'right.inner': 'Социум — горловая чакра',
  'right.mid': 'Материальная карма — денежный вход',
  'bottom.inner': 'Физическое тело — муладхара',
  'bottom.mid': 'Вход в отношения',
  entry: 'Точка входа — деньги и отношения',
  money: 'Денежный ключ',
  relations: 'Ключ отношений',
};

/* ================= Геометрия схемы ================= */
const CX = 320;
const CY = 320;
const R = 260;

const DIRS = {
  left: [-1, 0],
  top: [0, -1],
  right: [1, 0],
  bottom: [0, 1],
  leftTop: [-0.7071, -0.7071],
  rightTop: [0.7071, -0.7071],
  rightBottom: [0.7071, 0.7071],
  leftBottom: [-0.7071, 0.7071],
};

function at(dir, frac) {
  const [dx, dy] = DIRS[dir];
  return { x: CX + dx * R * frac, y: CY + dy * R * frac };
}

/* ================= SVG ================= */
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function drawFrame(svg) {
  const c = {
    left: at('left', 1), top: at('top', 1), right: at('right', 1), bottom: at('bottom', 1),
    lt: at('leftTop', 1), rt: at('rightTop', 1), rb: at('rightBottom', 1), lb: at('leftBottom', 1),
  };
  const diag = [c.left, c.top, c.right, c.bottom].map((p) => `${p.x},${p.y}`).join(' ');
  const straight = [c.lt, c.rt, c.rb, c.lb].map((p) => `${p.x},${p.y}`).join(' ');
  svg.appendChild(svgEl('polygon', { points: straight, class: 'frame' }));
  svg.appendChild(svgEl('polygon', { points: diag, class: 'frame diag' }));
  // Лучи к центру
  for (const key of Object.keys(DIRS)) {
    const p = at(key, 1);
    svg.appendChild(svgEl('line', { x1: CX, y1: CY, x2: p.x, y2: p.y, class: 'spoke' }));
  }
}

function addNode(svg, pos, value, { key = false, center = false, label = '' } = {}) {
  const g = svgEl('g', { class: `node${key ? ' key' : ''}${center ? ' center' : ''}` });
  g.appendChild(svgEl('circle', { cx: pos.x, cy: pos.y, r: center ? 24 : 19 }));
  const t = svgEl('text', { x: pos.x, y: pos.y + 1 });
  t.textContent = value;
  g.appendChild(t);
  g.addEventListener('click', (e) => {
    e.stopPropagation();
    showTip(e.clientX, e.clientY, value, label);
  });
  g.addEventListener('mouseenter', (e) => showTip(e.clientX, e.clientY, value, label, true));
  g.addEventListener('mouseleave', hideTip);
  svg.appendChild(g);
}

function showTip(x, y, value, label) {
  const a = ARCANA[value];
  els.tip.innerHTML = `<b>${label || 'Точка'}</b>Аркан ${value} — ${a ? a.name : ''}`;
  els.tip.hidden = false;
  const pad = 14;
  const w = 260;
  els.tip.style.left = `${Math.min(x + pad, window.innerWidth - w - 8)}px`;
  els.tip.style.top = `${Math.max(y - 20, 8)}px`;
}

function hideTip() { els.tip.hidden = true; }
document.addEventListener('click', hideTip);

function drawMatrix(svg, m) {
  svg.innerHTML = '';
  drawFrame(svg);

  const p = m.points;
  addNode(svg, at('left', 1), p.day, { label: POINT_LABELS.day });
  addNode(svg, at('top', 1), p.month, { label: POINT_LABELS.month });
  addNode(svg, at('right', 1), p.year, { label: POINT_LABELS.year });
  addNode(svg, at('bottom', 1), p.tail, { label: POINT_LABELS.tail });
  addNode(svg, { x: CX, y: CY }, p.center, { center: true, label: POINT_LABELS.center });

  addNode(svg, at('leftTop', 1), p.diagonal.leftTop, { label: POINT_LABELS.leftTop });
  addNode(svg, at('rightTop', 1), p.diagonal.rightTop, { label: POINT_LABELS.rightTop });
  addNode(svg, at('rightBottom', 1), p.diagonal.rightBottom, { label: POINT_LABELS.rightBottom });
  addNode(svg, at('leftBottom', 1), p.diagonal.leftBottom, { label: POINT_LABELS.leftBottom });

  // Подточки осей (inner — 0.34, mid — 0.64)
  const axisDirs = ['left', 'top', 'right', 'bottom'];
  for (const dir of axisDirs) {
    const ax = m.axes[dir];
    addNode(svg, at(dir, 0.34), ax.inner, { label: POINT_LABELS[`${dir}.inner`] });
    addNode(svg, at(dir, 0.64), ax.mid, { label: POINT_LABELS[`${dir}.mid`] });
  }

  // Ключи: между нижней и правой внутренними точками, отодвинуты от центра
  const bi = at('bottom', 0.34);
  const ri = at('right', 0.34);
  const pushOut = (p, f) => ({ x: CX + (p.x - CX) * f, y: CY + (p.y - CY) * f });
  const entry0 = { x: (bi.x + ri.x) / 2, y: (bi.y + ri.y) / 2 };
  const entry = pushOut(entry0, 1.55);
  const rel = pushOut({ x: (bi.x + entry0.x) / 2, y: (bi.y + entry0.y) / 2 }, 1.55);
  const mon = pushOut({ x: (ri.x + entry0.x) / 2, y: (ri.y + entry0.y) / 2 }, 1.55);
  addNode(svg, entry, m.keys.entry, { key: true, label: POINT_LABELS.entry });
  addNode(svg, rel, m.keys.relations, { key: true, label: POINT_LABELS.relations });
  addNode(svg, mon, m.keys.money, { key: true, label: POINT_LABELS.money });
}

/* ================= Карточки ================= */
function arcanaCard(value, titleSuffix = '', blocks = ['positive', 'negative', 'advice']) {
  const a = ARCANA[value];
  if (!a) return '';
  const block = (key, cls, label) => {
    const txt = a[key];
    return txt ? `<span class="block-label ${cls}">${label}</span><p>${txt}</p>` : '';
  };
  const parts = [];
  for (const b of blocks) {
    if (b === 'positive') parts.push(block('positive', 'plus', 'Плюсовое проявление'));
    if (b === 'negative') parts.push(block('negative', 'minus', 'Минусовое проявление'));
    if (b === 'advice') parts.push(block('advice', 'tip', 'Совет'));
    if (b === 'money') parts.push(block('money', 'money', 'Деньги'));
    if (b === 'relations') parts.push(block('relations', 'rel', 'Отношения'));
    if (b === 'compat') parts.push(block('compat', 'rel', 'В паре'));
  }
  return `
    <div class="arcana-card">
      <div class="arcana-head">
        <div class="arcana-num">${value}</div>
        <div>
          <div class="arcana-name">${a.name} — ${a.archetype}${titleSuffix}</div>
          <div class="arcana-keywords">${a.keywords}</div>
        </div>
      </div>
      ${parts.join('')}
    </div>`;
}

function section(key, title, inner) {
  return `<section class="slide-page" id="sec-${key}" data-key="${key}">
    <h2 class="zone-title">— ${title} —</h2>${inner}</section>`;
}

/* ================= Секции: личная ================= */
function buildSingleSections(m) {
  const p = m.points;
  const pr = m.purposes;
  const tailProg = findKarmicTail(m.karmicTail);
  const tailHTML = `
    ${tailProg ? `<div class="arcana-card"><div class="arcana-name">${tailProg.title}</div><p>${tailProg.text}</p></div>` : ''}
    <p style="color:var(--text-dim);margin-bottom:10px">Триада хвоста: <b>${m.karmicTail.join(' — ')}</b></p>
    ${m.karmicTail.map((v) => arcanaCard(v)).join('')}`;

  const nowYear = new Date().getFullYear();
  const forecast = yearForecast(
    `${m.input.year}-${String(m.input.month).padStart(2, '0')}-${String(m.input.day).padStart(2, '0')}`,
    nowYear, 10,
  );
  const forecastHTML = `<div class="forecast-grid">${forecast.map((f, i) => `
    <div class="forecast-cell${i === 0 ? ' current' : ''}">
      <div class="f-year">${f.year}</div>
      <div class="f-val">${f.energy}</div>
      <div class="f-name">${ARCANA[f.energy].name}</div>
    </div>`).join('')}</div>`;

  const healthHTML = `
    <table class="health-table">
      <thead><tr><th>Чакра</th><th>Физика</th><th>Энергия</th><th>Итог</th></tr></thead>
      <tbody>${m.health.rows.map((r) => `
        <tr>
          <td><span class="ch-name">${r.name}</span><span class="ch-note">${r.note}</span></td>
          <td>${r.phys}</td><td>${r.energy}</td><td><b>${r.emotion}</b></td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr><td>ИТОГО</td><td>${m.health.totals.phys}</td><td>${m.health.totals.energy}</td><td>${m.health.totals.emotion}</td></tr></tfoot>
    </table>
    <p style="color:var(--text-dim);margin-top:12px;font-size:.85rem">
      Итог каждой чакры — аркан эмоционального фона: смотрите его трактовку в разделе «Портрет» по номеру.</p>`;

  return [
    ['portrait', 'Портрет личности', arcanaCard(p.day)],
    ['talents', 'Таланты и Ангел-хранитель',
      arcanaCard(p.month) + arcanaCard(m.axes.top.mid, ' — талант от Бога') + arcanaCard(m.axes.top.inner, ' — связь с Духом')],
    ['material', 'Материальная карма',
      arcanaCard(p.year, '', ['positive', 'negative', 'money', 'advice'])],
    ['tail', 'Кармический хвост', tailHTML],
    ['purpose', 'Предназначения',
      `<p style="color:var(--text-dim);margin-bottom:12px">Личное (20–40 лет): <b>${pr.personal}</b> ·
       Социальное (40–60): <b>${pr.social}</b> · Общее: <b>${pr.general}</b> · Планетарное: <b>${pr.planetary}</b></p>`
      + arcanaCard(pr.personal, ' — личное')
      + arcanaCard(pr.social, ' — социальное')
      + arcanaCard(pr.general, ' — общее')],
    ['money', 'Деньги',
      arcanaCard(m.keys.money, ' — денежный ключ', ['positive', 'negative', 'money', 'advice'])
      + arcanaCard(m.keys.entry, ' — точка входа', ['money', 'advice'])],
    ['relations', 'Отношения',
      arcanaCard(m.keys.relations, ' — ключ отношений', ['positive', 'negative', 'relations', 'advice'])
      + arcanaCard(m.axes.bottom.mid, ' — вход в отношения', ['relations', 'advice'])],
    ['rod', 'Род',
      `<p style="color:var(--text-dim);margin-bottom:12px">Линия отца: <b>${pr.fatherLine}</b> · Линия матери: <b>${pr.motherLine}</b></p>`
      + arcanaCard(p.diagonal.leftTop, ' — род отца, духовное')
      + arcanaCard(p.diagonal.rightTop, ' — род матери, духовное')
      + arcanaCard(p.diagonal.rightBottom, ' — род отца, материя')
      + arcanaCard(p.diagonal.leftBottom, ' — род матери, материя')],
    ['health', 'Матрица здоровья', healthHTML],
    ['forecast', 'Прогноз по годам', forecastHTML],
  ];
}

/* ================= Секции: совместимость ================= */
function buildCompatSections(c) {
  const p = c.points;
  const tailProg = findKarmicTail(c.karmicTail);
  const compatCard = (v, suffix = '') => {
    const a = ARCANA[v];
    if (!a) return '';
    return `
      <div class="arcana-card">
        <div class="arcana-head">
          <div class="arcana-num">${v}</div>
          <div>
            <div class="arcana-name">${a.name} — ${a.archetype}${suffix}</div>
            <div class="arcana-keywords">${a.keywords}</div>
          </div>
        </div>
        <span class="block-label rel">Энергия пары</span><p>${a.compat}</p>
        <span class="block-label tip">Совет</span><p>${a.advice}</p>
      </div>`;
  };

  const healthHTML = `
    <table class="health-table">
      <thead><tr><th>Чакра</th><th>Физика</th><th>Энергия</th><th>Итог</th></tr></thead>
      <tbody>${c.health.rows.map((r) => `
        <tr>
          <td><span class="ch-name">${r.name}</span><span class="ch-note">${r.note}</span></td>
          <td>${r.phys}</td><td>${r.energy}</td><td><b>${r.emotion}</b></td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr><td>ИТОГО</td><td>${c.health.totals.phys}</td><td>${c.health.totals.energy}</td><td>${c.health.totals.emotion}</td></tr></tfoot>
    </table>`;

  return [
    ['essence', 'Суть пары', compatCard(p.center, ' — центр')],
    ['portrait', 'Портрет отношений', compatCard(p.day)],
    ['money', 'Деньги в паре', compatCard(c.keys.money, ' — денежный ключ') + compatCard(p.year, ' — материальная карма')],
    ['relations', 'Отношения и чувства', compatCard(c.keys.relations, ' — ключ отношений')],
    ['tail', 'Кармическая задача пары',
      `${tailProg ? `<div class="arcana-card"><div class="arcana-name">${tailProg.title}</div><p>${tailProg.text}</p></div>` : ''}
       <p style="color:var(--text-dim);margin-bottom:10px">Триада: <b>${c.karmicTail.join(' — ')}</b></p>
       ${c.karmicTail.map((v) => compatCard(v)).join('')}`],
    ['purpose', 'Совместные задачи',
      compatCard(c.purposes.personal, ' — до 40 лет') + compatCard(c.purposes.social, ' — после 40') + compatCard(c.purposes.general, ' — общее')],
    ['health', 'Здоровье пары', healthHTML],
  ];
}

/* ================= Рендер ================= */
function renderSections(sections) {
  els.slides.innerHTML = sections.map(([key, title, html]) => section(key, title, html)).join('');
  els.tabsRow.innerHTML = '';
  for (const [key, title] of sections) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab-item';
    b.textContent = title;
    b.dataset.key = key;
    b.addEventListener('click', () => {
      document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    els.tabsRow.appendChild(b);
  }
  // Подсветка активного таба при скролле
  const pages = els.slides.querySelectorAll('.slide-page');
  const tabs = els.tabsRow.querySelectorAll('.tab-item');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        tabs.forEach((t) => t.classList.toggle('active', t.dataset.key === en.target.dataset.key));
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  pages.forEach((pg) => io.observe(pg));
  els.slides.hidden = false;
  els.tabsRow.hidden = false;
}

function showError(msg) {
  els.errorBox.textContent = msg;
  els.errorBox.hidden = false;
}

function clearError() {
  els.errorBox.hidden = true;
  els.errorBox.textContent = '';
}

/* ================= События ================= */
function setMode(next) {
  mode = next;
  els.modeSingle.classList.toggle('active', mode === 'single');
  els.modeCompat.classList.toggle('active', mode === 'compat');
  els.date2Group.hidden = mode !== 'compat';
}

els.modeSingle.addEventListener('click', () => setMode('single'));
els.modeCompat.addEventListener('click', () => setMode('compat'));

els.btnCalc.addEventListener('click', () => {
  clearError();
  hideTip();
  const d1 = els.date1.value;
  if (!d1) { showError('Укажите дату рождения.'); return; }

  try {
    let result;
    if (mode === 'compat') {
      const d2 = els.date2.value;
      if (!d2) { showError('Укажите дату рождения партнёра.'); return; }
      result = calcCompat(d1, d2);
      drawMatrix(els.svg, result);
      renderSections(buildCompatSections(result));
    } else {
      result = calcMatrix(d1);
      drawMatrix(els.svg, result);
      renderSections(buildSingleSections(result));
    }
    lastResult = result;
    localStorage.setItem('dm_date1', d1);
    if (mode === 'compat') localStorage.setItem('dm_date2', els.date2.value);
    localStorage.setItem('dm_mode', mode);
    els.matrixSection.hidden = false;
    els.matrixSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showError(err.message);
  }
});

// Восстановление прошлого ввода
(function restore() {
  const d1 = localStorage.getItem('dm_date1');
  const d2 = localStorage.getItem('dm_date2');
  const m = localStorage.getItem('dm_mode');
  if (d1) els.date1.value = d1;
  if (d2) els.date2.value = d2;
  if (m === 'compat' && d2) setMode('compat');
})();
