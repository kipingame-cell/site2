import { calcMatrix, calcCompat, yearForecast, CHAKRAS } from './core/matrixCore.js';
import { ARCANA, findKarmicTail } from './data/arcana.js';
import * as db from './db.js';
import { renderOctagram, LEGEND, ZONE_COLORS } from './octagram.js?v=7';
import { createDrums } from './drums.js?v=7';

/* ================= DOM ================= */
const $ = (id) => document.getElementById(id);
const els = {
  modeSingle: $('modeSingle'),
  modeCompat: $('modeCompat'),
  date2Group: $('date2Group'),
  btnCalc: $('btnCalc'),
  errorBox: $('errorBox'),
  result: $('result'),
  svg: $('matrixSvg'),
  tip: $('pointTip'),
  legend: $('legend'),
  chakraSide: $('chakraSide'),
  tabsRow: $('tabsRow'),
  slides: $('slides'),
  dbBadge: $('dbBadge'),
  btnPrint: $('btnPrint'),
};

let mode = 'single';

/* ================= Тултип точек ================= */
function onPoint(node, e) {
  if (!node) { els.tip.hidden = true; return; }
  const a = ARCANA[node.value];
  els.tip.innerHTML = `<b>${node.label}</b>Аркан ${node.value} — ${a ? `${a.name} · ${a.archetype}` : ''}`;
  els.tip.hidden = false;
  const x = e.clientX ?? 0;
  const y = e.clientY ?? 0;
  els.tip.style.left = `${Math.min(x + 16, window.innerWidth - 280)}px`;
  els.tip.style.top = `${Math.max(y - 24, 8)}px`;
}
document.addEventListener('click', () => { els.tip.hidden = true; });

/* ================= Карточки ================= */
function block(label, cls, text) {
  if (!text) return '';
  return `<div class="blk"><span class="blk-label ${cls}">${label}</span><p>${text}</p></div>`;
}

function entryCard(num, entry, { open = false, caption = '' } = {}) {
  if (!entry) return '';
  const a = ARCANA[num];
  const sub = [caption, a ? a.keywords : ''].filter(Boolean).join(' · ');
  return `
  <details class="card" ${open ? 'open' : ''}>
    <summary>
      <span class="card-num">${num}</span>
      <span class="card-head">
        <span class="card-title">${entry.title || (a ? `${a.name} — ${a.archetype}` : `Аркан ${num}`)}</span>
        <span class="card-sub">${sub}</span>
      </span>
      <span class="card-chevron">▾</span>
    </summary>
    <div class="card-body">
      ${block('Плюсовое проявление', 'plus', entry.positive)}
      ${block('Минусовое проявление', 'minus', entry.negative)}
      ${block('Совет', 'tip', entry.advice)}
      ${block('Важно', 'warn', entry.warning)}
    </div>
  </details>`;
}

/** Карточки всех арканов зоны: [[число, подпись], ...] → HTML */
async function zoneCards(zone, nums, openFirst = true) {
  const out = [];
  for (const [i, [num, caption]] of nums.entries()) {
    const entry = await db.lichnZone(zone, num);
    out.push(entryCard(num, entry, { open: openFirst && i === 0, caption }));
  }
  return out.join('');
}

function compatBlockCard(num, blockName, title, data) {
  const b = data?.[blockName];
  if (!b) return '';
  const a = ARCANA[num];
  return `
  <details class="card">
    <summary>
      <span class="card-num">${num}</span>
      <span class="card-head">
        <span class="card-title">${title}</span>
        <span class="card-sub">${data.name || (a ? a.name : '')} · ${data.archetype || ''}</span>
      </span>
      <span class="card-chevron">▾</span>
    </summary>
    <div class="card-body">
      ${block('Плюс', 'plus', b.positive)}
      ${block('Минус', 'minus', b.negative)}
      ${block('Совет', 'tip', b.advice)}
      ${block('Важно', 'warn', b.warning)}
    </div>
  </details>`;
}

function section(key, title, inner) {
  return `<section class="slide" id="sec-${key}" data-key="${key}">
    <h2 class="zone-title">${title}</h2>${inner}</section>`;
}

function skeleton(n = 2) {
  return Array.from({ length: n }, () => '<div class="card skel"><div class="skel-line w60"></div><div class="skel-line"></div><div class="skel-line w80"></div></div>').join('');
}

/* ================= Здоровье ================= */
const CHAKRA_COLORS = ['#b388ff', '#7c9aff', '#4fc3f7', '#5ce8a0', '#ffd166', '#ff9e66', '#ff6b6b'];

/** Таблица чакр с раскрывающимися строками: клик по строке — пояснение под ней. */
async function healthAccordion(rows, totals, getEntry) {
  const bodyRows = [];
  for (const [i, r] of rows.entries()) {
    const e = await getEntry(r);
    bodyRows.push(`
      <tr class="hrow" data-i="${i}" tabindex="0" role="button" aria-expanded="false">
        <td><span class="ch-dot" style="background:${CHAKRA_COLORS[i]}"></span><span class="ch-name">${r.name}</span><span class="h-arrow">▾</span></td>
        <td>${r.phys}</td><td>${r.energy}</td><td><b>${r.emotion}</b></td>
      </tr>
      <tr class="hrow-detail" hidden>
        <td colspan="4"><div class="hdetail">
          <p class="hdetail-title">${r.note}</p>
          ${block('Плюс', 'plus', e?.positive)}
          ${block('Минус', 'minus', e?.negative)}
          ${block('Совет', 'tip', e?.advice)}
        </div></td>
      </tr>`);
  }
  return `
  <table class="health-table health-accordion">
    <thead><tr><th>Чакра</th><th>Физика</th><th>Энергия</th><th>Итог</th></tr></thead>
    <tbody>${bodyRows.join('')}</tbody>
    <tfoot><tr><td>ИТОГО</td><td>${totals.phys}</td><td>${totals.energy}</td><td>${totals.emotion}</td></tr></tfoot>
  </table>
  <p class="hint">Нажми на строку чакры — откроется пояснение.</p>`;
}

/* ================= Личные секции ================= */
async function buildSingleSections(m) {
  const p = m.points;
  const pr = m.purposes;
  const ax = m.axes;
  const tailProg = findKarmicTail(m.karmicTail);

  const healthHTML = await healthAccordion(m.health.rows, m.health.totals, (r) => db.lichnHealth(r.id, r.emotion));

  const tailHTML = `
    ${tailProg ? `<div class="program-banner"><b>${tailProg.title}</b><p>${tailProg.text}</p></div>` : ''}
    <p class="hint">Триада хвоста: <b>${m.karmicTail.join(' — ')}</b></p>
    ${await zoneCards('tail', [
      [p.tail, 'Главный урок'],
      [m.karmicTail[0], 'Программа хвоста'],
      [m.karmicTail[1], 'Программа хвоста'],
    ])}`;

  const nowYear = new Date().getFullYear();
  const years = yearForecast(`${m.input.year}-${String(m.input.month).padStart(2, '0')}-${String(m.input.day).padStart(2, '0')}`, nowYear, 10);
  const forecastHTML = `
    <p class="hint">Кольцо возрастов: энергия года = позиция кольца, на которую приходится возраст.</p>
    <div class="year-chips" id="yearChips">${years.map((f, i) => `
      <button type="button" class="chip${i === 0 ? ' active' : ''}" data-year="${f.year}" data-age="${f.age}" data-energy="${f.energy}">${f.year} · ${f.energy}</button>`).join('')}
    </div>
    <div id="forecastCard">${skeleton(1)}</div>`;

  return [
    ['portrait', 'Портрет личности', await zoneCards('portrait', [
      [p.day, 'День рождения — кто ты'],
      [ax.left.inner, 'Эмоции — сердечная чакра'],
      [ax.left.mid, 'Талант от Бога'],
    ])],
    ['talents', 'Таланты', await zoneCards('talents', [
      [p.month, 'Месяц — Ангел-хранитель'],
      [ax.top.inner, 'Связь с Духом — корона'],
      [ax.top.mid, 'Интуиция — третий глаз'],
    ])],
    ['destiny', 'Задача души', await zoneCards('destiny', [
      [p.center, 'Центр — зона комфорта, душа'],
    ])],
    ['money', 'Деньги', `<p class="hint">Денежный ключ: <b>${m.keys.money}</b> · точка входа: <b>${m.keys.entry}</b></p>` + await zoneCards('money', [
      [m.keys.money, 'Денежный ключ'],
      [m.keys.entry, 'Точка входа в канал'],
      [ax.right.inner, 'Социум — горловая чакра'],
      [ax.right.mid, 'Денежный вход'],
    ])],
    ['relations', 'Отношения', `<p class="hint">Ключ отношений: <b>${m.keys.relations}</b></p>` + await zoneCards('relations', [
      [m.keys.relations, 'Ключ отношений'],
      [m.keys.entry, 'Точка входа в канал'],
      [ax.bottom.inner, 'Физическое тело — муладхара'],
      [ax.bottom.mid, 'Вход в отношения'],
    ])],
    ['tail', 'Кармический хвост', tailHTML],
    ['purpose', 'Предназначения',
      `<p class="hint">Личное (20–40): <b>${pr.personal}</b> · Социальное (40–60): <b>${pr.social}</b> · Общее: <b>${pr.general}</b> · Планетарное: <b>${pr.planetary}</b></p>`
      + await zoneCards('purposePers', [
        [pr.sky, 'Небо — духовные задачи'],
        [pr.earth, 'Земля — материальные задачи'],
        [pr.personal, 'Личное (20–40 лет)'],
        [pr.general, 'Общее предназначение'],
        [pr.planetary, 'Планетарное'],
      ])
      + await zoneCards('purposeSoc', [
        [pr.social, 'Социальное (40–60 лет)'],
      ])],
    ['father', 'Род отца', await zoneCards('father', [
      [p.diagonal.leftTop, 'Духовная линия рода'],
      [p.diagonal.rightBottom, 'Материальная линия рода'],
      [m.rod.fatherTop.inner, 'Связь с родом (дух)'],
      [m.rod.fatherTop.mid, 'Программа рода (дух)'],
      [m.rod.fatherBottom.inner, 'Связь с родом (материя)'],
      [m.rod.fatherBottom.mid, 'Программа рода (материя)'],
    ])],
    ['mother', 'Род матери', await zoneCards('mother', [
      [p.diagonal.rightTop, 'Духовная линия рода'],
      [p.diagonal.leftBottom, 'Материальная линия рода'],
      [m.rod.motherTop.inner, 'Связь с родом (дух)'],
      [m.rod.motherTop.mid, 'Программа рода (дух)'],
      [m.rod.motherBottom.inner, 'Связь с родом (материя)'],
      [m.rod.motherBottom.mid, 'Программа рода (материя)'],
    ])],
    ['health', 'Матрица здоровья', healthHTML],
    ['forecast', 'Прогноз по годам', forecastHTML],
  ];
}

/* ================= Секции совместимости ================= */
async function buildCompatSections(c) {
  const p = c.points;
  const tailProg = findKarmicTail(c.karmicTail);

  const arc = (n) => db.compatArcana(n);
  const [
    arcCenter, arcRel, arcMoney, arcDay, arcYear, arcTail,
    arcBottomInner, arcRightInner, arcLeftInner, arcTopInner, arcEntry,
  ] = await Promise.all([
    arc(p.center), arc(c.keys.relations), arc(c.keys.money), arc(p.day), arc(p.year), arc(p.tail),
    arc(c.axes.bottom.inner), arc(c.axes.right.inner), arc(c.axes.left.inner), arc(c.axes.top.inner), arc(c.keys.entry),
  ]);

  const healthHTML = await healthAccordion(c.health.rows, c.health.totals, (r) => db.compatHealth(r.id, r.emotion));

  return [
    ['essence', 'Суть пары', compatBlockCard(p.center, 'general', 'Общая энергия пары', arcCenter)],
    ['love', 'Любовь и чувства',
      compatBlockCard(c.keys.relations, 'love', 'Ключ отношений', arcRel)
      + compatBlockCard(c.keys.entry, 'love', 'Точка входа в канал', arcEntry)
      + compatBlockCard(c.axes.bottom.inner, 'love', 'Тело и близость', arcBottomInner)],
    ['finance', 'Финансы',
      compatBlockCard(c.keys.money, 'finance', 'Денежный ключ', arcMoney)
      + compatBlockCard(c.keys.entry, 'finance', 'Точка входа в канал', arcEntry)
      + compatBlockCard(c.axes.right.inner, 'finance', 'Социум и деньги', arcRightInner)],
    ['family', 'Семья и быт',
      compatBlockCard(p.day, 'family', 'Семейная жизнь', arcDay)
      + compatBlockCard(c.axes.left.inner, 'family', 'Эмоции в быту', arcLeftInner)],
    ['social', 'Социум',
      compatBlockCard(p.year, 'social', 'Пара в социуме', arcYear)
      + compatBlockCard(c.axes.top.inner, 'social', 'Духовная связь', arcTopInner)],
    ['karma', 'Кармическая задача',
      `${tailProg ? `<div class="program-banner"><b>${tailProg.title}</b><p>${tailProg.text}</p></div>` : ''}
       <p class="hint">Триада: <b>${c.karmicTail.join(' — ')}</b></p>`
      + compatBlockCard(p.tail, 'karma', 'Карма пары', arcTail)],
    ['crisis', 'Кризисы и выход', compatBlockCard(p.center, 'crisis', 'Как пара проходит кризисы', arcCenter)],
    ['advice', 'Совет паре', compatBlockCard(p.center, 'advice', 'Главный совет', arcCenter)],
    ['health', 'Здоровье пары', healthHTML],
  ];
}

/* ================= Рендер ================= */
async function renderAll(result) {
  // схема
  renderOctagram(els.svg, result, { onPointClick: onPoint });
  els.legend.innerHTML = LEGEND.map(([k, label]) =>
    `<span class="legend-item"><i style="background:${ZONE_COLORS[k]}"></i>${label}</span>`).join('');

  // боковая панель чакр
  els.chakraSide.innerHTML = `
    <h3>Чакры</h3>
    ${result.health.rows.map((r, i) => `
      <div class="chakra-row">
        <span class="ch-dot" style="background:${CHAKRA_COLORS[i]}"></span>
        <span class="ch-name">${r.name}</span>
        <span class="ch-vals">${r.phys} · ${r.energy} · <b>${r.emotion}</b></span>
      </div>`).join('')}`;

  // секции
  els.slides.innerHTML = '';
  els.tabsRow.innerHTML = '';
  const build = mode === 'compat' ? buildCompatSections : buildSingleSections;
  els.slides.innerHTML = skeleton(4);

  const sections = await build(result);
  els.slides.innerHTML = sections.map(([key, title, html]) => section(key, title, html)).join('');

  // левая колонка табов: переключаем панели, не скроллим простыню
  const activate = (key) => {
    els.slides.querySelectorAll('.slide').forEach((s) => s.classList.toggle('active', s.dataset.key === key));
    els.tabsRow.querySelectorAll('.tab-item').forEach((t) => t.classList.toggle('active', t.dataset.key === key));
  };
  for (const [key, title] of sections) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip tab-item';
    b.dataset.key = key;
    b.textContent = title;
    b.addEventListener('click', () => activate(key));
    els.tabsRow.appendChild(b);
  }
  activate(sections[0][0]);

  // прогноз: клики по годам
  const chips = $('yearChips');
  if (chips) {
    chips.addEventListener('click', async (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const card = $('forecastCard');
      card.innerHTML = skeleton(1);
      const entry = await db.lichnZone('forecast', Number(btn.dataset.energy));
      card.innerHTML = `<h3 class="forecast-title">${btn.dataset.year} год — аркан ${btn.dataset.energy}</h3>` + entryCard(Number(btn.dataset.energy), entry, { open: true });
    });
    // сразу показать текущий год
    const first = chips.querySelector('.chip');
    if (first) {
      const entry = await db.lichnZone('forecast', Number(first.dataset.energy));
      $('forecastCard').innerHTML = `<h3 class="forecast-title">${first.dataset.year} год — аркан ${first.dataset.energy}</h3>` + entryCard(Number(first.dataset.energy), entry, { open: true });
    }
  }
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

els.btnCalc.addEventListener('click', async () => {
  els.errorBox.hidden = true;
  els.tip.hidden = true;
  const d1 = drums1.getValue();
  if (!d1) { showError('Укажите дату рождения.'); return; }

  els.btnCalc.disabled = true;
  try {
    let result;
    if (mode === 'compat') {
      const d2 = drums2.getValue();
      if (!d2) { showError('Укажите дату рождения партнёра.'); return; }
      result = calcCompat(d1, d2);
      localStorage.setItem('dm_date2', d2);
    } else {
      result = calcMatrix(d1);
    }
    localStorage.setItem('dm_date1', d1);
    localStorage.setItem('dm_mode', mode);

    els.result.hidden = false;
    els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await renderAll(result);
  } catch (err) {
    showError(err.message);
  } finally {
    els.btnCalc.disabled = false;
  }
});

// раскрытие строк в матрице здоровья (делегирование)
els.slides.addEventListener('click', (e) => {
  const row = e.target.closest('.hrow');
  if (!row) return;
  const detail = row.nextElementSibling;
  const open = detail.hidden;
  detail.hidden = !open;
  row.classList.toggle('open', open);
  row.setAttribute('aria-expanded', open ? 'true' : 'false');
});
els.slides.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('.hrow');
  if (row) { e.preventDefault(); row.click(); }
});

els.btnPrint.addEventListener('click', () => window.print());

function showError(msg) {
  els.errorBox.textContent = msg;
  els.errorBox.hidden = false;
}

/* ================= Инициализация ================= */
const drums1 = createDrums($('date1Drums'), { value: localStorage.getItem('dm_date1') });
const drums2 = createDrums($('date2Drums'), { value: localStorage.getItem('dm_date2') });

(async function init() {
  const d2 = localStorage.getItem('dm_date2');
  const m = localStorage.getItem('dm_mode');
  if (m === 'compat' && d2) setMode('compat');

  const status = await db.dbStatus();
  els.dbBadge.hidden = false;
  els.dbBadge.textContent = status.full ? 'Полная база трактовок' : 'Краткая база (полная — после импорта)';
  els.dbBadge.classList.toggle('ok', status.full);
})();
