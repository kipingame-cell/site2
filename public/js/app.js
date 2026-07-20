import { calcMatrix, calcCompat, yearForecast, CHAKRAS } from './core/matrixCore.js';
import { ARCANA, findKarmicTail } from './data/arcana.js';
import * as db from './db.js';
import { renderOctagram, LEGEND, ZONE_COLORS } from './octagram.js';

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

function entryCard(num, entry, { open = false } = {}) {
  if (!entry) return '';
  const a = ARCANA[num];
  return `
  <details class="card" ${open ? 'open' : ''}>
    <summary>
      <span class="card-num">${num}</span>
      <span class="card-head">
        <span class="card-title">${entry.title || (a ? `${a.name} — ${a.archetype}` : `Аркан ${num}`)}</span>
        <span class="card-sub">${a ? a.keywords : ''}</span>
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

function healthTable(rows, totals) {
  return `
  <table class="health-table">
    <thead><tr><th>Чакра</th><th>Физика</th><th>Энергия</th><th>Итог</th></tr></thead>
    <tbody>${rows.map((r, i) => `
      <tr>
        <td><span class="ch-dot" style="background:${CHAKRA_COLORS[i]}"></span><span class="ch-name">${r.name}</span></td>
        <td>${r.phys}</td><td>${r.energy}</td><td><b>${r.emotion}</b></td>
      </tr>`).join('')}
    </tbody>
    <tfoot><tr><td>ИТОГО</td><td>${totals.phys}</td><td>${totals.energy}</td><td>${totals.emotion}</td></tr></tfoot>
  </table>`;
}

/* ================= Личные секции ================= */
async function buildSingleSections(m) {
  const p = m.points;
  const pr = m.purposes;
  const tailProg = findKarmicTail(m.karmicTail);

  const [
    portrait, talents, destiny, money, relations, tail,
    purpPers, purpSoc, father, mother,
  ] = await Promise.all([
    db.lichnZone('portrait', p.day),
    db.lichnZone('talents', p.month),
    db.lichnZone('destiny', p.center),
    db.lichnZone('money', m.keys.money),
    db.lichnZone('relations', m.keys.relations),
    db.lichnZone('tail', p.tail),
    db.lichnZone('purposePers', pr.personal),
    db.lichnZone('purposeSoc', pr.social),
    db.lichnZone('father', p.diagonal.leftTop),
    db.lichnZone('mother', p.diagonal.rightTop),
  ]);

  const healthCards = await Promise.all(
    m.health.rows.map(async (r, i) => {
      const e = await db.lichnHealth(r.id, r.emotion);
      return { ...r, i, e };
    }),
  );

  const healthHTML = healthTable(m.health.rows, m.health.totals) + `
    <div class="chakra-cards">${healthCards.map((c) => `
      <details class="card">
        <summary>
          <span class="card-num" style="border-color:${CHAKRA_COLORS[c.i]};color:${CHAKRA_COLORS[c.i]}">${c.emotion}</span>
          <span class="card-head">
            <span class="card-title">${c.name}</span>
            <span class="card-sub">${c.note} · физ ${c.phys} · эн ${c.energy}</span>
          </span>
          <span class="card-chevron">▾</span>
        </summary>
        <div class="card-body">
          ${block('Плюс', 'plus', c.e?.positive)}
          ${block('Минус', 'minus', c.e?.negative)}
          ${block('Совет', 'tip', c.e?.advice)}
        </div>
      </details>`).join('')}
    </div>`;

  const tailHTML = `
    ${tailProg ? `<div class="program-banner"><b>${tailProg.title}</b><p>${tailProg.text}</p></div>` : ''}
    <p class="hint">Триада хвоста: <b>${m.karmicTail.join(' — ')}</b></p>
    ${entryCard(p.tail, tail, { open: true })}
    ${entryCard(m.karmicTail[0], await db.lichnZone('tail', m.karmicTail[0]))}
    ${entryCard(m.karmicTail[1], await db.lichnZone('tail', m.karmicTail[1]))}`;

  const nowYear = new Date().getFullYear();
  const years = yearForecast(`${m.input.year}-${String(m.input.month).padStart(2, '0')}-${String(m.input.day).padStart(2, '0')}`, nowYear, 10);
  const forecastHTML = `
    <div class="year-chips" id="yearChips">${years.map((f, i) => `
      <button type="button" class="chip${i === 0 ? ' active' : ''}" data-year="${f.year}" data-energy="${f.energy}">${f.year} · ${f.energy}</button>`).join('')}
    </div>
    <div id="forecastCard">${skeleton(1)}</div>`;

  return [
    ['portrait', 'Портрет личности', entryCard(p.day, portrait, { open: true })],
    ['talents', 'Таланты', entryCard(p.month, talents, { open: true })],
    ['destiny', 'Задача души', entryCard(p.center, destiny)],
    ['money', 'Деньги', `<p class="hint">Денежный ключ: <b>${m.keys.money}</b> · точка входа: <b>${m.keys.entry}</b></p>` + entryCard(m.keys.money, money, { open: true })],
    ['relations', 'Отношения', `<p class="hint">Ключ отношений: <b>${m.keys.relations}</b></p>` + entryCard(m.keys.relations, relations, { open: true })],
    ['tail', 'Кармический хвост', tailHTML],
    ['purpose', 'Предназначения',
      `<p class="hint">Личное (20–40): <b>${pr.personal}</b> · Социальное (40–60): <b>${pr.social}</b> · Общее: <b>${pr.general}</b> · Планетарное: <b>${pr.planetary}</b></p>`
      + entryCard(pr.personal, purpPers, { open: true })
      + entryCard(pr.social, purpSoc)],
    ['father', 'Род отца', entryCard(p.diagonal.leftTop, father, { open: true }) + entryCard(p.diagonal.rightBottom, await db.lichnZone('father', p.diagonal.rightBottom))],
    ['mother', 'Род матери', entryCard(p.diagonal.rightTop, mother, { open: true }) + entryCard(p.diagonal.leftBottom, await db.lichnZone('mother', p.diagonal.leftBottom))],
    ['health', 'Матрица здоровья', healthHTML],
    ['forecast', 'Прогноз по годам', forecastHTML],
  ];
}

/* ================= Секции совместимости ================= */
async function buildCompatSections(c) {
  const p = c.points;
  const tailProg = findKarmicTail(c.karmicTail);

  const [arcCenter, arcRel, arcMoney, arcDay, arcYear, arcTail] = await Promise.all([
    db.compatArcana(p.center),
    db.compatArcana(c.keys.relations),
    db.compatArcana(c.keys.money),
    db.compatArcana(p.day),
    db.compatArcana(p.year),
    db.compatArcana(p.tail),
  ]);

  const healthRows = await Promise.all(
    c.health.rows.map(async (r, i) => ({ ...r, i, e: await db.compatHealth(r.id, r.emotion) })),
  );
  const healthHTML = healthTable(c.health.rows, c.health.totals) + `
    <div class="chakra-cards">${healthRows.map((r) => `
      <details class="card">
        <summary>
          <span class="card-num" style="border-color:${CHAKRA_COLORS[r.i]};color:${CHAKRA_COLORS[r.i]}">${r.emotion}</span>
          <span class="card-head">
            <span class="card-title">${r.name}</span>
            <span class="card-sub">физ ${r.phys} · эн ${r.energy}</span>
          </span>
          <span class="card-chevron">▾</span>
        </summary>
        <div class="card-body">
          ${block('Плюс', 'plus', r.e?.positive)}
          ${block('Минус', 'minus', r.e?.negative)}
          ${block('Совет', 'tip', r.e?.advice)}
        </div>
      </details>`).join('')}
    </div>`;

  return [
    ['essence', 'Суть пары', compatBlockCard(p.center, 'general', 'Общая энергия пары', arcCenter)],
    ['love', 'Любовь и чувства', compatBlockCard(c.keys.relations, 'love', 'Любовь в паре', arcRel)],
    ['finance', 'Финансы', compatBlockCard(c.keys.money, 'finance', 'Деньги в паре', arcMoney)],
    ['family', 'Семья и быт', compatBlockCard(p.day, 'family', 'Семейная жизнь', arcDay)],
    ['social', 'Социум', compatBlockCard(p.year, 'social', 'Пара в социуме', arcYear)],
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
  for (const [key, title] of sections) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip tab-item';
    b.textContent = title;
    b.addEventListener('click', () => {
      document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    els.tabsRow.appendChild(b);
  }

  // подсветка активного таба
  const tabs = els.tabsRow.querySelectorAll('.tab-item');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        tabs.forEach((t, i) => t.classList.toggle('active', sections[i][0] === en.target.dataset.key));
      }
    });
  }, { rootMargin: '-25% 0px -65% 0px' });
  els.slides.querySelectorAll('.slide').forEach((s) => io.observe(s));

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
  const d1 = els.date1.value;
  if (!d1) { showError('Укажите дату рождения.'); return; }

  els.btnCalc.disabled = true;
  try {
    let result;
    if (mode === 'compat') {
      const d2 = els.date2.value;
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

els.btnPrint.addEventListener('click', () => window.print());

function showError(msg) {
  els.errorBox.textContent = msg;
  els.errorBox.hidden = false;
}

/* ================= Инициализация ================= */
(async function init() {
  const d1 = localStorage.getItem('dm_date1');
  const d2 = localStorage.getItem('dm_date2');
  const m = localStorage.getItem('dm_mode');
  if (d1) els.date1.value = d1;
  if (d2) els.date2.value = d2;
  if (m === 'compat' && d2) setMode('compat');

  const status = await db.dbStatus();
  els.dbBadge.hidden = false;
  els.dbBadge.textContent = status.full ? 'Полная база трактовок' : 'Краткая база (полная — после импорта)';
  els.dbBadge.classList.toggle('ok', status.full);
})();
