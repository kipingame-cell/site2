/**
 * octagram.js — классическая октаграмма Матрицы Судьбы (SVG).
 * Рисует: восьмиконечную звезду, 8 внешних точек с возрастами,
 * подточки осей и родовых диагоналей, ключи денег/отношений, центр.
 * Ядро расчёта не трогает.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const CX = 340;
const CY = 340;
const R = 265;

const DIRS = {
  top: [0, -1],
  rightTop: [Math.SQRT1_2, -Math.SQRT1_2],
  right: [1, 0],
  rightBottom: [Math.SQRT1_2, Math.SQRT1_2],
  bottom: [0, 1],
  leftBottom: [-Math.SQRT1_2, Math.SQRT1_2],
  left: [-1, 0],
  leftTop: [-Math.SQRT1_2, -Math.SQRT1_2],
};

/** Возрасты на внешнем кольце (классическая схема: 0 лет — справа). */
const AGES = {
  right: '0', rightTop: '10', top: '20', leftTop: '30',
  left: '40', leftBottom: '50', bottom: '60', rightBottom: '70',
};

const ZONE_COLORS = {
  personal: '#8f7bff',  // личный квадрат (день/месяц/год/хвост)
  rod: '#4fd1c5',       // родовые диагонали
  key: '#ffd166',       // ключи денег/отношений
  center: '#5ce8a0',
  sub: '#9aa0c3',
};

function at(dir, frac) {
  const [dx, dy] = DIRS[dir];
  return { x: CX + dx * R * frac, y: CY + dy * R * frac };
}

/** Приведение к аркану (1..22) — как в ядре. */
const red = (v) => { while (v > 22) v = String(v).split('').reduce((s, c) => s + Number(c), 0); return v === 0 ? 22 : v; };

/* Радиальные доли подточек — вымерены по эталонной схеме
   (matricasudbi-kalkulator.ru): mid 0.81, inner 0.67, inner2 0.37. */
const F_MID = 0.81;
const F_INNER = 0.67;
const F_INNER2 = 0.37;

function el(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

export function renderOctagram(svg, m, { onPointClick } = {}) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 680 680');

  /* ---- фоновая звезда ---- */
  const corners = Object.fromEntries(Object.keys(DIRS).map((d) => [d, at(d, 1)]));
  const diagSquare = ['top', 'right', 'bottom', 'left'].map((d) => `${corners[d].x},${corners[d].y}`).join(' ');
  const straightSquare = ['rightTop', 'rightBottom', 'leftBottom', 'leftTop'].map((d) => `${corners[d].x},${corners[d].y}`).join(' ');

  svg.appendChild(el('polygon', { points: straightSquare, class: 'og-frame og-rod-frame' }));
  svg.appendChild(el('polygon', { points: diagSquare, class: 'og-frame og-pers-frame' }));

  // лучи к центру
  for (const d of Object.keys(DIRS)) {
    const p = corners[d];
    svg.appendChild(el('line', { x1: CX, y1: CY, x2: p.x, y2: p.y, class: 'og-spoke' }));
  }

  // кольцо вокруг центра (декор)
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: 46, class: 'og-center-ring' }));

  /* ---- узлы ---- */
  const nodes = [];
  const p = m.points;

  // внешние точки
  const outer = [
    ['left', p.day, 'personal', 'День рождения — портрет личности'],
    ['top', p.month, 'personal', 'Месяц — Ангел-хранитель, таланты'],
    ['right', p.year, 'personal', 'Год — материальная карма'],
    ['bottom', p.tail, 'personal', 'Кармический хвост — главный урок'],
    ['leftTop', p.diagonal.leftTop, 'rod', 'Род отца — духовная линия'],
    ['rightTop', p.diagonal.rightTop, 'rod', 'Род матери — духовная линия'],
    ['rightBottom', p.diagonal.rightBottom, 'rod', 'Род отца — материальная линия'],
    ['leftBottom', p.diagonal.leftBottom, 'rod', 'Род матери — материальная линия'],
  ];
  for (const [dir, val, zone, label] of outer) {
    nodes.push({ pos: at(dir, 1), value: val, r: 24, zone, label, age: AGES[dir], dir });
  }

  // подточки осей
  const axisDirs = ['left', 'top', 'right', 'bottom'];
  const subLabels = {
    'left.inner': 'Эмоции — сердечная чакра', 'left.mid': 'Талант от Бога',
    'top.inner': 'Связь с Духом — корона', 'top.mid': 'Интуиция — третий глаз',
    'right.inner': 'Социум — горловая чакра', 'right.mid': 'Денежный вход',
    'bottom.inner': 'Физическое тело — муладхара', 'bottom.mid': 'Вход в отношения',
  };
  for (const dir of axisDirs) {
    const ax = m.axes[dir];
    nodes.push({ pos: at(dir, F_MID), value: ax.mid, r: 15, zone: 'sub', label: subLabels[`${dir}.mid`] });
    nodes.push({ pos: at(dir, F_INNER), value: ax.inner, r: 15, zone: 'sub', label: subLabels[`${dir}.inner`] });
    // третья точка оси (inner + центр) — как на эталонной схеме
    nodes.push({ pos: at(dir, F_INNER2), value: red(ax.inner + p.center), r: 13, zone: 'sub', label: `${subLabels[`${dir}.inner`]} · гармонизация с центром` });
  }

  // подточки родовых диагоналей (прямой квадрат)
  const rodDirs = { fatherTop: 'leftTop', motherTop: 'rightTop', fatherBottom: 'rightBottom', motherBottom: 'leftBottom' };
  const rodLabels = {
    fatherTop: 'Род отца — духовная линия', motherTop: 'Род матери — духовная линия',
    fatherBottom: 'Род отца — материальная линия', motherBottom: 'Род матери — материальная линия',
  };
  for (const [rodKey, dir] of Object.entries(rodDirs)) {
    const ax = m.rod[rodKey];
    nodes.push({ pos: at(dir, F_MID), value: ax.mid, r: 14, zone: 'sub', label: `${rodLabels[rodKey]} · программа рода` });
    nodes.push({ pos: at(dir, F_INNER), value: ax.inner, r: 14, zone: 'sub', label: `${rodLabels[rodKey]} · связь с родом` });
  }

  // ключи денег/отношений — золотой треугольник в нижне-правом секторе,
  // как на эталонной схеме: точка входа ближе к центру (0.42R по диагонали),
  // денежный ключ смещён к правому лучу, ключ отношений — к нижнему (0.48R ± сдвиг)
  const kEntry = at('rightBottom', 0.42);
  const kBase = at('rightBottom', 0.48);
  const kOff = 33 * Math.SQRT1_2;
  nodes.push({ pos: kEntry, value: m.keys.entry, r: 13, zone: 'key', label: 'Точка входа — деньги и отношения' });
  nodes.push({ pos: { x: kBase.x - kOff, y: kBase.y + kOff }, value: m.keys.relations, r: 13, zone: 'key', label: 'Ключ отношений' });
  nodes.push({ pos: { x: kBase.x + kOff, y: kBase.y - kOff }, value: m.keys.money, r: 13, zone: 'key', label: 'Денежный ключ' });

  // центр
  nodes.push({ pos: { x: CX, y: CY }, value: p.center, r: 27, zone: 'center', label: 'Центр — зона комфорта, душа' });

  /* ---- отрисовка ---- */
  for (const n of nodes) {
    const g = el('g', { class: `og-node og-${n.zone}`, tabindex: '0', role: 'button' });
    g.appendChild(el('circle', { cx: n.pos.x, cy: n.pos.y, r: n.r, fill: 'var(--og-fill)', stroke: ZONE_COLORS[n.zone] }));
    const t = el('text', { x: n.pos.x, y: n.pos.y + 1, class: 'og-num' });
    t.textContent = n.value;
    g.appendChild(t);

    if (n.age) {
      // возраст — снаружи октаграммы
      const [dx, dy] = DIRS[n.dir];
      const a = el('text', {
        x: n.pos.x + dx * 40, y: n.pos.y + dy * 40 + 4, class: 'og-age',
      });
      a.textContent = n.age;
      svg.appendChild(a);
    }

    const show = (e) => onPointClick?.(n, e);
    g.addEventListener('click', (e) => { e.stopPropagation(); show(e); });
    g.addEventListener('mouseenter', (e) => show(e));
    g.addEventListener('mouseleave', () => onPointClick?.(null));
    svg.appendChild(g);
  }
}

/** Подписи зон для легенды. */
export const LEGEND = [
  ['personal', 'Личный квадрат'],
  ['rod', 'Родовой квадрат'],
  ['key', 'Ключи денег и отношений'],
  ['center', 'Центр матрицы'],
];

export { ZONE_COLORS };
