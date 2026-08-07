/* ================= PDF-экспорт (pdfmake) =================
   Вынесено из app.js: вся сборка PDF-документа — шрифты, QR, декор,
   таблицы и раскладка разделов. app.js только вызывает ensurePdfFonts()
   и buildPdfDef() по кнопке «Скачать PDF». */
import { yearForecast } from './core/matrixCore.js?v=14';
import { ARCANA } from './data/arcana.js';
import { LEGEND } from './octagram.js?v=20';

const $ = (id) => document.getElementById(id);

const SITE_URL = 'https://kipingame-cell.github.io/site2/';

// PT Serif с кириллицей для заголовков PDF: ttf лежат в /vendor, один раз
// добавляем их в виртуальную ФС pdfmake и регистрируем семейство Serif
let pdfFontsReady = null;
export function ensurePdfFonts() {
  if (pdfFontsReady) return pdfFontsReady;
  pdfFontsReady = (async () => {
    const toB64 = (buf) => {
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    const load = async (url) => toB64(await (await fetch(url)).arrayBuffer());
    const [reg, bold] = await Promise.all([
      load('./vendor/PT_Serif-Web-Regular.ttf'),
      load('./vendor/PT_Serif-Web-Bold.ttf'),
    ]);
    pdfMake.vfs['PT_Serif-Web-Regular.ttf'] = reg;
    pdfMake.vfs['PT_Serif-Web-Bold.ttf'] = bold;
    pdfMake.fonts = {
      ...(pdfMake.fonts || {}),
      Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' },
      Serif: { normal: 'PT_Serif-Web-Regular.ttf', bold: 'PT_Serif-Web-Bold.ttf' },
    };
  })();
  return pdfFontsReady;
}

// QR-код сайта → png dataURL (библиотека qrcode-generator из /vendor)
function qrDataUrl(text) {
  if (typeof qrcode !== 'function') return null;
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const cell = 6, padCells = 3;
  const cv = document.createElement('canvas');
  cv.width = cv.height = (n + padCells * 2) * cell;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((c + padCells) * cell, (r + padCells) * cell, cell, cell);
    }
  }
  return cv.toDataURL('image/png');
}

/* ---- эзотерический декор для PDF (вектор, ч/б) ---- */
// восьмиконечная звезда из двух квадратов — фирменный знак
const STAR_SVG = (size, sw = 1) => {
  const c = size / 2, a = size * 0.14, b = size - a;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
    + `<rect x="${a}" y="${a}" width="${b - a}" height="${b - a}" fill="none" stroke="#000" stroke-width="${sw}"/>`
    + `<rect x="${a}" y="${a}" width="${b - a}" height="${b - a}" fill="none" stroke="#000" stroke-width="${sw}" transform="rotate(45 ${c} ${c})"/>`
    + `<circle cx="${c}" cy="${c}" r="${size * 0.07}" fill="#000"/></svg>`;
};
// разделитель: линия — ромб — линия
const RULE_SVG = (w = 120, h = 9) => {
  const mid = w / 2, y = h / 2, d = 3.4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<line x1="0" y1="${y}" x2="${mid - 9}" y2="${y}" stroke="#888" stroke-width="0.6"/>`
    + `<line x1="${mid + 9}" y1="${y}" x2="${w}" y2="${y}" stroke="#888" stroke-width="0.6"/>`
    + `<polyline points="${mid},${y - d} ${mid + d},${y} ${mid},${y + d} ${mid - d},${y} ${mid},${y - d}" fill="none" stroke="#000" stroke-width="0.8"/>`
    + `<circle cx="${mid}" cy="${y}" r="1" fill="#000"/></svg>`;
};
// рамка страницы: двойная линия + ромбы по углам и серединам сторон
function pdfPageFrame() {
  const W = 595.28, H = 841.89, m = 26, m2 = 30.5;
  const lozenge = (cx, cy, s2) => ({
    type: 'polyline',
    points: [{ x: cx, y: cy - s2 }, { x: cx + s2, y: cy }, { x: cx, y: cy + s2 }, { x: cx - s2, y: cy }],
    closePath: true, lineWidth: 0.8, lineColor: '#000',
  });
  return {
    canvas: [
      { type: 'rect', x: m, y: m, w: W - 2 * m, h: H - 2 * m, lineWidth: 0.9, lineColor: '#000' },
      { type: 'rect', x: m2, y: m2, w: W - 2 * m2, h: H - 2 * m2, lineWidth: 0.35, lineColor: '#555' },
      lozenge(m, m, 4), lozenge(W - m, m, 4), lozenge(m, H - m, 4), lozenge(W - m, H - m, 4),
      lozenge(W / 2, m, 3), lozenge(W / 2, H - m, 3), lozenge(m, H / 2, 3), lozenge(W - m, H / 2, 3),
    ],
  };
}

// инлайн-разметка (b/i/prog-codes) → pdfmake text-массив
function pdfInline(el) {
  const parts = [];
  const walk = (node, st) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent.replace(/\s+/g, ' ');
      if (t) parts.push(Object.keys(st).length ? { text: t, ...st } : t);
      return;
    }
    if (node.tagName === 'BR') { parts.push('\n'); return; }
    const s2 = { ...st };
    if (node.tagName === 'B' || node.tagName === 'STRONG') s2.bold = true;
    if (node.tagName === 'I' || node.tagName === 'EM') s2.italics = true;
    if (node.classList?.contains('prog-codes')) { s2.fontSize = 8; s2.color = '#555'; }
    node.childNodes.forEach((ch) => walk(ch, s2));
  };
  el.childNodes.forEach((ch) => walk(ch, {}));
  return parts.every((p) => typeof p === 'string') ? parts.join('') : parts;
}

function pdfPar(p) {
  return { text: pdfInline(p), style: p.classList.contains('prog-plain') ? 'plain' : 'par', unbreakable: true };
}

// текстовые блоки внутри карточки (.blk с метками, p, ul, h3)
function pdfBlk(container) {
  const out = [];
  for (const node of container.children) {
    if (node.classList?.contains('blk')) {
      const lab = node.querySelector('.blk-label')?.textContent.trim() || '';
      const ps = [...node.querySelectorAll('p')];
      if (lab && ps.length) {
        // метка + первый абзац — единым неразрывным блоком, чтобы метка
        // не оставалась одна внизу страницы (keepWithNext + unbreakable конфликтуют)
        out.push({ stack: [{ text: lab.toUpperCase(), style: 'lab' }, pdfPar(ps[0])], unbreakable: true });
        for (const p of ps.slice(1)) out.push(pdfPar(p));
      } else {
        if (lab) out.push({ text: lab.toUpperCase(), style: 'lab', keepWithNext: true });
        for (const p of ps) out.push(pdfPar(p));
      }
    } else if (node.tagName === 'P') {
      out.push(pdfPar(node));
    } else if (node.tagName === 'UL') {
      out.push({ ul: [...node.children].map((li) => pdfInline(li)), style: 'list', unbreakable: true });
    } else if (node.tagName === 'H3') {
      out.push({ text: pdfInline(node), style: 'h3', keepWithNext: true });
    }
  }
  return out;
}

function pdfDivider() {
  return { svg: RULE_SVG(150, 9), alignment: 'center', margin: [0, 8, 0, 3] };
}

function pdfCard(card) {
  const num = card.querySelector('.card-num')?.textContent.trim() || '';
  const title = card.querySelector('.card-title')?.textContent.trim() || '';
  const sub = card.querySelector('.card-sub')?.textContent.trim() || '';
  const body = card.querySelector('.card-body');
  const head = {
    columns: [
      { width: 34, text: num, style: 'cardNum' },
      {
        width: '*',
        stack: [
          { text: title, style: 'cardTitle' },
          ...(sub ? [{ text: sub, style: 'cardSub' }] : []),
        ],
      },
    ],
    columnGap: 12,
    margin: [0, 12, 0, 4],
  };
  const bodyItems = body ? pdfBlk(body) : [];
  if (bodyItems.length) {
    // шапка карточки + первый элемент тела — вместе, без разрыва
    return [{ stack: [head, bodyItems[0]], unbreakable: true }, ...bodyItems.slice(1), pdfDivider()];
  }
  return [head, pdfDivider()];
}

function pdfBanner(el) {
  const titleEl = el.querySelector('b');
  const rest = [];
  for (const node of el.children) {
    if (node === titleEl) continue;
    if (node.tagName === 'P') rest.push(pdfPar(node));
    else if (node.tagName === 'UL') rest.push({ ul: [...node.children].map((li) => pdfInline(li)), style: 'list', unbreakable: true });
    else if (node.tagName === 'H3') rest.push({ text: pdfInline(node), style: 'h3', keepWithNext: true });
  }
  if (titleEl && rest.length) {
    // заголовок баннера + первый абзац — вместе, без разрыва
    return [{ stack: [{ text: pdfInline(titleEl), style: 'bannerTitle' }, rest[0]], unbreakable: true }, ...rest.slice(1)];
  }
  const out = [];
  if (titleEl) out.push({ text: pdfInline(titleEl), style: 'bannerTitle' });
  return [...out, ...rest];
}

const PDF_TABLE_LAYOUT = {
  hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.9 : 0.4),
  vLineWidth: () => 0,
  hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? '#000' : '#bbb'),
  paddingTop: () => 4,
  paddingBottom: () => 4,
  paddingLeft: () => 2,
  paddingRight: () => 2,
};

function pdfHealthRow(name, a, b, c, bold) {
  const t = (v) => ({ text: String(v), alignment: 'center', ...(bold ? { bold: true } : {}) });
  return [bold ? { text: name, bold: true } : name, t(a), t(b), t(c)];
}

// компактная таблица чакр из матрицы здоровья (без раскрывающихся строк)
function pdfHealth(table) {
  const body = [pdfHealthRow('Чакра', 'Физика', 'Энергия', 'Итог', true)];
  for (const tr of table.querySelectorAll('tbody tr.hrow')) {
    const name = tr.querySelector('.ch-name')?.textContent.trim() || '';
    const tds = tr.querySelectorAll('td');
    body.push(pdfHealthRow(name, tds[1].textContent.trim(), tds[2].textContent.trim(), tds[3].textContent.trim(), false));
  }
  const tf = table.querySelectorAll('tfoot td');
  if (tf.length) body.push(pdfHealthRow('Итого', tf[1].textContent.trim(), tf[2].textContent.trim(), tf[3].textContent.trim(), true));
  return { table: { headerRows: 1, widths: ['*', 55, 55, 55], body }, layout: PDF_TABLE_LAYOUT, margin: [0, 6, 0, 10] };
}

function pdfSlide(slide, first, forecastTable = null) {
  const title = slide.querySelector('.zone-title')?.textContent.trim() || '';
  const out = [
    { text: title.toUpperCase(), style: 'h2', keepWithNext: true, ...(first ? {} : { pageBreak: 'before' }) },
    { svg: RULE_SVG(90, 8), margin: [0, 0, 0, 8] },
  ];
  for (const node of slide.children) {
    if (node.classList.contains('zone-title')) continue;
    if (node.matches('details.card')) out.push(...pdfCard(node));
    else if (node.classList.contains('program-banner') || node.classList.contains('plus-banner')) out.push(...pdfBanner(node));
    else if (node.classList.contains('health-table')) out.push(pdfHealth(node));
    else if (node.classList.contains('subhead')) out.push({ text: pdfInline(node), style: 'h3', keepWithNext: true });
    else if (node.classList.contains('hint')) out.push({ text: pdfInline(node), style: 'hint' });
    else if (node.classList.contains('year-chips')) {
      if (forecastTable) out.push(forecastTable);
    }
    else if (node.id === 'forecastCard') {
      for (const c of node.children) {
        if (c.matches('details.card')) out.push(...pdfCard(c));
        else if (c.classList.contains('forecast-title')) out.push({ text: pdfInline(c), style: 'h3', keepWithNext: true });
      }
    }
  }
  return out;
}

// октаграмма → ч/б SVG с инлайн-атрибутами (pdfmake не читает CSS-классы)
function matrixSvgBW() {
  const src = $('matrixSvg');
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  const sEls = [src, ...src.querySelectorAll('*')];
  const cEls = [clone, ...clone.querySelectorAll('*')];
  sEls.forEach((s, i) => {
    const c = cEls[i];
    const tag = s.tagName.toLowerCase();
    const cls = s.classList;
    c.removeAttribute('class');
    c.removeAttribute('tabindex');
    c.removeAttribute('role');
    const cs = getComputedStyle(s);
    if (tag === 'text') {
      const fs = parseFloat(cs.fontSize) || 12;
      c.setAttribute('fill', cls.contains('og-num') ? '#000' : '#333');
      c.setAttribute('font-size', fs);
      c.setAttribute('font-weight', cs.fontWeight);
      const anchor = cs.textAnchor;
      if (anchor && anchor !== 'start') c.setAttribute('text-anchor', anchor);
      c.removeAttribute('opacity');
      if ((cs.dominantBaseline || '') === 'central') {
        c.removeAttribute('dominant-baseline');
        c.setAttribute('y', parseFloat(c.getAttribute('y')) + fs * 0.35);
      }
      return;
    }
    if (tag === 'polygon' || tag === 'line' || tag === 'circle') {
      const sw = parseFloat(cs.strokeWidth) || 1;
      if (cls.contains('og-frame')) {
        c.setAttribute('fill', 'none');
        c.setAttribute('stroke', '#000');
        c.setAttribute('stroke-width', sw);
      } else if (cls.contains('og-spoke') || cls.contains('og-center-ring')) {
        c.setAttribute('fill', 'none');
        c.setAttribute('stroke', '#8a8a8a');
        c.setAttribute('stroke-width', sw);
        if (cs.strokeDasharray && cs.strokeDasharray !== 'none') c.setAttribute('stroke-dasharray', cs.strokeDasharray.replace(/\s+/g, ' '));
      } else if (tag === 'circle') {
        c.setAttribute('fill', '#fff');
        c.setAttribute('stroke', '#000');
        c.setAttribute('stroke-width', sw);
      }
    }
  });
  return clone.outerHTML;
}

export function buildPdfDef(result, d1, d2, mode) {
  const ru = (iso) => iso.split('-').reverse().join('.');
  const subtitle = mode === 'compat' ? `Совместимость · ${ru(d1)} + ${ru(d2)}` : `Личный разбор · ${ru(d1)}`;
  const ht = result.health;
  const chakraBody = [pdfHealthRow('Чакра', 'Физика', 'Энергия', 'Итог', true)];
  for (const r of ht.rows) chakraBody.push(pdfHealthRow(r.name, r.phys, r.energy, r.emotion, false));
  chakraBody.push(pdfHealthRow('Сумма', ht.totals.phys, ht.totals.energy, ht.totals.emotion, true));

  // прогноз: текущий год + 5 следующих (таблица в разделе «Прогноз по годам»)
  let forecastTable = null;
  if (mode !== 'compat' && result.input) {
    const iso = `${result.input.year}-${String(result.input.month).padStart(2, '0')}-${String(result.input.day).padStart(2, '0')}`;
    const rows = yearForecast(iso, new Date().getFullYear(), 6);
    const body = [
      [{ text: 'Год', style: 'th' }, { text: 'Возраст', style: 'th', alignment: 'center' }, { text: 'Аркан', style: 'th', alignment: 'center' }, { text: 'Энергия года', style: 'th' }],
      ...rows.map((f) => {
        const a = ARCANA[f.energy];
        return [
          { text: String(f.year), bold: true },
          { text: `${f.age} лет`, alignment: 'center' },
          { text: String(f.energy), alignment: 'center', bold: true },
          a ? `${a.name} — ${a.archetype}` : '',
        ];
      }),
    ];
    forecastTable = { table: { headerRows: 1, widths: [50, 60, 45, '*'], body }, layout: PDF_TABLE_LAYOUT, margin: [0, 4, 0, 10] };
  }

  const qr = qrDataUrl(SITE_URL);
  const slides = [...$('slides').querySelectorAll('.slide')];
  const content = [
    // обложка
    { svg: STAR_SVG(46), alignment: 'center', margin: [0, 24, 0, 10] },
    { text: 'М А Т Р И Ц А   С У Д Ь Б Ы', style: 'coverTitle', alignment: 'center' },
    { svg: RULE_SVG(170, 10), alignment: 'center', margin: [0, 12, 0, 12] },
    { text: subtitle, style: 'coverSub', alignment: 'center', margin: [0, 0, 0, 20] },
    { svg: matrixSvgBW(), width: 400, alignment: 'center' },
    { text: LEGEND.map(([, l]) => l).join('   ·   '), style: 'legend', alignment: 'center', margin: [0, 12, 0, 0], pageBreak: 'after' },
    // сводка чакр
    { text: 'ЧАКРЫ', style: 'h2', keepWithNext: true },
    { svg: RULE_SVG(90, 8), margin: [0, 0, 0, 8] },
    { text: 'Сводная карта энергий по семи чакрам: физическое тело, энергетический потенциал и эмоциональный итог. Подробный разбор каждой чакры — в разделе «Здоровье».', style: 'hint', margin: [0, 0, 0, 10] },
    { table: { headerRows: 1, widths: ['*', 55, 55, 55], body: chakraBody }, layout: PDF_TABLE_LAYOUT },
    // разделы
    ...slides.flatMap((sl) => pdfSlide(sl, false, forecastTable)),
    // задняя страница: ссылка + QR
    { svg: STAR_SVG(40), alignment: 'center', margin: [0, 90, 0, 14], pageBreak: 'before' },
    { text: 'М А Т Р И Ц А   С У Д Ь Б Ы', style: 'backTitle', alignment: 'center' },
    { text: 'бесплатный расчёт онлайн', style: 'backSub', alignment: 'center', margin: [0, 4, 0, 0] },
    { svg: RULE_SVG(150, 9), alignment: 'center', margin: [0, 16, 0, 16] },
    { text: 'Понравился разбор? Рассчитайте матрицу себе, партнёру или подруге — это бесплатно и без регистрации:', style: 'backText', alignment: 'center', margin: [70, 0, 70, 18] },
    ...(qr ? [{ image: qr, width: 118, alignment: 'center', margin: [0, 0, 0, 14] }] : []),
    { text: SITE_URL, link: SITE_URL, style: 'backLink', alignment: 'center' },
    { text: 'Наведите камеру телефона на код — откроется калькулятор', style: 'backNote', alignment: 'center', margin: [0, 8, 0, 0] },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [56, 64, 56, 58],
    background: (cur) => pdfPageFrame(),
    info: {
      title: `Матрица Судьбы — ${subtitle}`,
      author: 'Матрица Судьбы · бесплатный расчёт онлайн',
      subject: 'Персональный разбор по методу Матрица Судьбы',
    },
    defaultStyle: { fontSize: 10, lineHeight: 1.45, color: '#111' },
    content,
    styles: {
      coverTitle: { font: 'Serif', fontSize: 22, bold: true, characterSpacing: 4, color: '#000' },
      coverSub: { fontSize: 11.5, characterSpacing: 1, color: '#333' },
      legend: { fontSize: 8, color: '#555', characterSpacing: 0.5 },
      h2: { font: 'Serif', fontSize: 16, bold: true, characterSpacing: 2, color: '#000', margin: [0, 0, 0, 10] },
      backTitle: { font: 'Serif', fontSize: 17, bold: true, characterSpacing: 4, color: '#000' },
      backSub: { fontSize: 10, characterSpacing: 1, color: '#444' },
      backText: { fontSize: 10.5, lineHeight: 1.5, color: '#222' },
      backLink: { fontSize: 12, bold: true, color: '#000' },
      backNote: { fontSize: 8.5, italics: true, color: '#666' },
      h3: { fontSize: 11.5, bold: true, color: '#000', margin: [0, 10, 0, 4] },
      par: { margin: [0, 0, 0, 5] },
      plain: { margin: [0, 4, 0, 6], paddingLeft: 8, color: '#000', background: '#f0f0f0' },
      list: { margin: [14, 0, 0, 6] },
      lab: { fontSize: 8, bold: true, characterSpacing: 2, color: '#555', margin: [0, 8, 0, 3] },
      hint: { fontSize: 9, color: '#444', italics: true, margin: [0, 2, 0, 8] },
      bannerTitle: { fontSize: 11, bold: true, color: '#000', margin: [0, 10, 0, 4] },
      cardNum: { fontSize: 20, bold: true, color: '#000', alignment: 'center', margin: [0, 2, 0, 0] },
      cardTitle: { fontSize: 12.5, bold: true, color: '#000' },
      cardSub: { fontSize: 8.5, color: '#555', characterSpacing: 1, margin: [0, 2, 0, 0] },
      headL: { fontSize: 8, bold: true, characterSpacing: 2, color: '#555' },
      headR: { fontSize: 8, characterSpacing: 1, color: '#777' },
      foot: { fontSize: 7.5, characterSpacing: 2, color: '#555' },
    },
    header: (cur) => (cur > 1
      ? {
          stack: [
            { columns: [{ text: 'МАТРИЦА СУДЬБЫ', style: 'headL' }, { text: subtitle, style: 'headR', alignment: 'right' }] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.5, lineColor: '#999' }], margin: [0, 4, 0, 0] },
          ],
          margin: [56, 40, 56, 0],
        }
      : null),
    footer: (cur, total) => ({
      columns: [
        { text: '•  Матрица Судьбы · бесплатный расчёт онлайн  •', style: 'foot', alignment: 'right', width: '*', margin: [0, 0, 8, 0] },
        { text: `${cur} / ${total}`, style: 'foot', width: 'auto' },
      ],
      margin: [56, 6, 56, 0],
    }),
  };
}
