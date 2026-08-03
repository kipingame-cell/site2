import { calcMatrix, calcCompat, yearForecast, programKeys, CHAKRAS, reduceArcana } from './core/matrixCore.js?v=13';
import { ARCANA, findKarmicTail } from './data/arcana.js';
import * as db from './db.js';
import { renderOctagram, LEGEND, ZONE_COLORS } from './octagram.js?v=14';
import { createDrums } from './drums.js?v=13';
import { ARC_PROFILES } from '../db/programsExtra.js?v=13';

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

/** Таблица чакр + полный разбор по каждой чакре + итоговая энергия. */
async function healthAccordion(rows, totals, getEntry, getTotalEntry) {
  const bodyRows = [];
  const detailCards = [];
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
    const a = ARCANA[r.emotion];
    detailCards.push(`
      <details class="card chakra-card">
        <summary><span class="card-num" style="border-color:${CHAKRA_COLORS[i]};color:${CHAKRA_COLORS[i]}">${r.emotion}</span><span class="card-head"><span class="card-title">${r.name} <span class="prog-codes">физ ${r.phys} · эне ${r.energy} · итог ${r.emotion}</span></span><span class="card-sub">${r.note}${a ? ` · ${a.name}` : ''}</span></span><span class="card-chevron">▾</span></summary>
        <div class="card-body">
          <p class="hdetail-title">Итоговая энергия чакры — аркан ${r.emotion}${a ? ` (${a.name})` : ''}: складывается из физики (${r.phys}) и энергии (${r.energy}). Она показывает, как эта сфера организма и психики работает у вас по умолчанию.</p>
          ${block('В плюсе', 'plus', e?.positive)}
          ${block('В минусе', 'minus', e?.negative)}
          ${block('Как гармонизировать', 'tip', e?.advice)}
        </div>
      </details>`);
  }
  const te = getTotalEntry ? await getTotalEntry(totals.emotion) : null;
  const ta = ARCANA[totals.emotion];
  return `
  <table class="health-table health-accordion">
    <thead><tr><th>Чакра</th><th>Физика</th><th>Энергия</th><th>Итог</th></tr></thead>
    <tbody>${bodyRows.join('')}</tbody>
    <tfoot><tr><td>ИТОГО</td><td>${totals.phys}</td><td>${totals.energy}</td><td>${totals.emotion}</td></tr></tfoot>
  </table>
  <div class="program-banner">
    <b>Итоговая энергия здоровья — ${totals.emotion}${ta ? ` (${ta.name})` : ''} <span class="prog-codes">строка ИТОГО</span></b>
    <p>Это сумма всех семи чакр: физика сошлась в <b>${totals.phys}</b>, энергия — в <b>${totals.energy}</b>, а общий итог организма и психики — в аркан <b>${totals.emotion}</b>. Она описывает ваш базовый фон самочувствия и главный способ восстановления.</p>
    ${te ? `${block('Как проявляется в ресурсе', 'plus', te.positive)}${block('Когда организм сигналит', 'minus', te.negative)}${block('Главный рецепт восстановления', 'tip', te.advice)}` : ''}
  </div>
  <h3 class="subhead">Разбор по каждой чакре</h3>
  ${detailCards.join('')}`;
}

/* ================= Личные секции ================= */

/** Баннер комбинированной программы (триада). */
function programBanner(prog, key) {
  if (!prog) return '';
  return `<div class="program-banner">
    <b>${prog.title} <span class="prog-codes">${key.replace(/-/g, ' · ')}</span></b>
    ${plainTriad(key)}
    ${prog.text ? `<p>${prog.text}</p>` : ''}
    ${prog.advice ? `<p class="prog-advice"><b>Совет:</b> ${prog.advice}</p>` : ''}
  </div>`;
}

/** Расшифровка триады простыми словами — чтобы поняла и бабка. */
function plainTriad(key) {
  const parts = String(key).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !ARC_PROFILES[n])) return '';
  const names = parts.map((n) => `${n} (${ARC_PROFILES[n].nm})`).join(' + ');
  const meaning = parts.map((n) => ARC_PROFILES[n].syn).join(', ');
  return `<p class="prog-plain"><b>Простыми словами:</b> это сочетание энергий ${names}. Вместе они дают ${meaning}.</p>`;
}

/** Сводная карта каналов матрицы: [[значение, название канала], ...] */
function channelMap(m) {
  const p = m.points, pr = m.purposes;
  return [
    [p.day, 'портрет личности'],
    [p.month, 'таланты'],
    [p.year, 'социум и материя'],
    [p.tail, 'кармический хвост'],
    [p.center, 'центр матрицы'],
    [m.keys.money, 'денежный ключ'],
    [m.keys.relations, 'ключ отношений'],
    [m.keys.entry, 'точка входа в канал'],
    [pr.personal, 'личное предназначение'],
    [pr.social, 'социальное предназначение'],
    [pr.general, 'общее предназначение'],
  ];
}

/** Повторяющиеся энергии: [[значение, [каналы]]] — только те, что встречаются 2+ раза. */
function duplicatedEnergies(m) {
  const byVal = new Map();
  for (const [v, name] of channelMap(m)) {
    if (!byVal.has(v)) byVal.set(v, []);
    byVal.get(v).push(name);
  }
  return [...byVal.entries()].filter(([, ch]) => ch.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
}

/** Прозрачность расчёта: цепочка формул с реальными числами. */
function calcTransparencyHTML(m) {
  const { day, month, year } = m.input;
  const p = m.points;
  const redSteps = (n, v) => n > 22 || n !== v ? `${n} → ${v}` : `${v}`;
  const A0 = day, C0 = String(year).split('').reduce((s, c) => s + Number(c), 0);
  const D0 = p.day + p.month + p.year;
  const E0 = D0 + p.tail;
  return `<div class="program-banner">
    <b>Откуда берутся энергии <span class="prog-codes">полная прозрачность расчёта</span></b>
    <p>Каждая цифра в вашей матрице — это сумма других цифр, сведённая к аркану (если сумма больше 22, её цифры складываются снова). Проверьте сами:</p>
    <ul class="calc-list">
      <li><b>${p.day}</b> — день рождения: ${redSteps(A0, p.day)}</li>
      <li><b>${p.month}</b> — месяц рождения</li>
      <li><b>${p.year}</b> — год: ${year} → ${C0}${C0 !== p.year ? ` → ${p.year}` : ''}</li>
      <li><b>${p.tail}</b> — кармический хвост: ${p.day} + ${p.month} + ${p.year} = ${D0}${D0 !== p.tail ? ` → ${p.tail}` : ''}</li>
      <li><b>${p.center}</b> — центр: ${p.day} + ${p.month} + ${p.year} + ${p.tail} = ${E0}${E0 !== p.center ? ` → ${p.center}` : ''}</li>
      <li><b>${p.diagonal.leftTop}</b> — род отца (дух): ${p.day} + ${p.month}</li>
      <li><b>${p.diagonal.rightTop}</b> — род матери (дух): ${p.month} + ${p.year}</li>
      <li><b>${p.diagonal.rightBottom}</b> — род отца (материя): ${p.year} + ${p.tail}</li>
      <li><b>${p.diagonal.leftBottom}</b> — род матери (материя): ${p.tail} + ${p.day}</li>
    </ul>
    <p class="prog-advice">Все остальные точки — промежуточные суммы на лучах между этими углами и центром. Никакой магии в вычислениях: только сложение и сведение к 22 арканам.</p>
  </div>`;
}

/** Блок «Визитка»: соцмаска, детство/родители, прозрачность расчёта. */
async function vizitkaHTML(m) {
  const p = m.points, ax = m.axes;
  const mainVals = channelMap(m).map(([v]) => v);
  const has = (n) => mainVals.includes(n);
  const childhood = [];
  if (has(6)) childhood.push(`<b>Аркан 6 (Влюблённые)</b> присутствует в вашей матрице — тема отношений с матерью и первого опыта любви сильно влияет на сценарии взрослой жизни: вы ищете в партнёрах тепло и принятие, знакомые с детства.`);
  if (has(10)) childhood.push(`<b>Аркан 10 (Колесо Фортуны)</b> в матрице — влияние отца или отцовской линии: с детства усвоен урок «удача любит смелых»; во взрослой жизни это даёт лёгкость, а в минусе — ожидание, что всё решится само.`);
  if (!childhood.length) childhood.push('Арканов 6 и 10 нет в главных точках — детские сценарии влияют мягче, вы больше опираетесь на собственный опыт, чем на родительские модели.');
  const mask = await db.lichnZone('money', ax.right.inner);
  const self = await db.lichnZone('portrait', p.day);
  const card = (num, cap, e) => e ? `
    <details class="card" open>
      <summary><span class="card-num">${num}</span><span class="card-head"><span class="card-title">${cap}</span><span class="card-sub">${e.title}</span></span><span class="card-chevron">▾</span></summary>
      <div class="card-body">${block('Плюс', 'plus', e.positive)}${block('Минус', 'minus', e.negative)}${block('Совет', 'tip', e.advice)}</div>
    </details>` : '';
  return `
    ${card(ax.right.inner, 'Социальная маска — как вас видят коллеги и знакомые', mask)}
    ${card(p.day, 'Ваше «я» — как вы видите себя изнутри', self)}
    <div class="program-banner"><b>Детство и родители</b>${childhood.map((t) => `<p>${t}</p>`).join('')}</div>
    ${calcTransparencyHTML(m)}`;
}

/** Блок «Синтез энергий»: дубли, связки хвоста, пересечения родовых линий. */
function synthesisHTML(m) {
  const p = m.points, pr = m.purposes;
  const out = [];

  // 1. Повторяющиеся энергии
  const dups = duplicatedEnergies(m);
  if (dups.length) {
    const items = dups.map(([v, ch]) => {
      const a = ARCANA[v];
      return `<p><b>Энергия ${v}${a ? ` (${a.name})` : ''}</b> звучит сразу в нескольких местах: <b>${ch.join(', ')}</b>. Это не ошибка расчёта и не «задвоение» — повтор означает, что тема аркана усилена: она работает одновременно во всех этих сферах и требует особого внимания.${a ? ` Ключ к гармонизации: ${a.advice}` : ''}</p>`;
    });
    out.push(`<div class="program-banner"><b>Повторяющиеся энергии <span class="prog-codes">усиленные темы</span></b>${items.join('')}</div>`);
  } else {
    out.push('<div class="program-banner"><b>Повторяющиеся энергии</b><p>В главных каналах нет повторов — темы распределены равномерно, каждая сфера живёт своей энергией.</p></div>');
  }

  // 2. Хвост ↔ деньги и призвание
  const tailVals = new Set(m.karmicTail);
  const moneyCh = [[m.keys.money, 'денежный ключ'], [m.keys.entry, 'точка входа'], [m.axes.right.inner, 'социум'], [m.axes.right.mid, 'денежный вход']]
    .filter(([v]) => tailVals.has(v));
  const talentCh = [[p.month, 'талант'], [m.axes.top.inner, 'связь с Духом'], [m.axes.top.mid, 'интуиция']]
    .filter(([v]) => tailVals.has(v));
  if (moneyCh.length || talentCh.length) {
    const parts = [];
    if (moneyCh.length) parts.push(`<p>Кармический хвост пересекается с денежным каналом (<b>${moneyCh.map(([, n]) => n).join(', ')}</b>): финансы для вас — способ проработки кармы. Деньги приходят ровно тогда, когда закрывается урок хвоста; саботаж в деньгах — сигнал вернуться к кармической задаче.</p>`);
    if (talentCh.length) parts.push(`<p>Кармический хвост связан с талантами (<b>${talentCh.map(([, n]) => n).join(', ')}</b>): ваше призвание рождается из проработки кармы — то, что было слабостью в прошлом, в этой жизни становится даром. Развивая талант, вы автоматически закрываете урок хвоста.</p>`);
    out.push(`<div class="program-banner"><b>Хвост ↔ деньги и призвание</b>${parts.join('')}</div>`);
  }

  // 3. Пересечения родовых линий
  const fatherVals = new Set([p.diagonal.leftTop, p.diagonal.rightBottom,
    m.rod.fatherTop.inner, m.rod.fatherTop.mid, m.rod.fatherBottom.inner, m.rod.fatherBottom.mid]);
  const motherVals = new Set([p.diagonal.rightTop, p.diagonal.leftBottom,
    m.rod.motherTop.inner, m.rod.motherTop.mid, m.rod.motherBottom.inner, m.rod.motherBottom.mid]);
  const cross = [...fatherVals].filter((v) => motherVals.has(v));
  if (cross.length) {
    const items = cross.map((v) => {
      const a = ARCANA[v];
      return `<b>${v}${a ? ` (${a.name})` : ''}</b>`;
    }).join(', ');
    out.push(`<div class="program-banner"><b>Пересечение родовых программ</b>
      <p>Род отца и род матери встречаются в энергиях: ${items}. Эти темы даны вам от обеих линий рода — они самые сильные в вашем родовом наследии.</p>
      <p class="prog-advice"><b>Практическая польза:</b> пересекающиеся энергии — ваш родовой ресурс. Работая с ними (живя их в плюсе), вы гармонизируете сразу обе линии рода и снимаете повторяющиеся семейные сценарии.</p>
    </div>`);
  }

  // 4. Род → предназначение
  const purposeCh = [[pr.personal, 'личное предназначение'], [pr.social, 'социальное предназначение'], [pr.general, 'общее предназначение']];
  const fromFather = purposeCh.filter(([v]) => fatherVals.has(v)).map(([, n]) => n);
  const fromMother = purposeCh.filter(([v]) => motherVals.has(v)).map(([, n]) => n);
  if (fromFather.length || fromMother.length) {
    const parts = [];
    if (fromFather.length) parts.push(`<p><b>${fromFather.join(', ')}</b> питается энергией рода отца: ресурс отцовской линии напрямую работает на вашу реализацию.</p>`);
    if (fromMother.length) parts.push(`<p><b>${fromMother.join(', ')}</b> питается энергией рода матери: поддержка и сценарии материнской линии влияют на вашу миссию.</p>`);
    out.push(`<div class="program-banner"><b>Род → предназначение</b>${parts.join('')}</div>`);
  }

  return out.join('');
}

/** Углублённый разбор центра матрицы. */
function centerDeepHTML(m) {
  const c = m.points.center;
  const a = ARCANA[c];
  const repeats = channelMap(m).filter(([v, name]) => v === c && name !== 'центр матрицы').map(([, n]) => n);
  return `<div class="program-banner">
    <b>Центр матрицы — внутренний стержень <span class="prog-codes">аркан ${c}${a ? ` · ${a.name}` : ''}</span></b>
    <p>Центр — это зона комфорта, ресурс и точка сборки всей матрицы. Когда вы живёте в плюсе этой энергии, остальные каналы наполняются сами; когда в минусе — перекос идёт по всем сферам сразу.</p>
    ${repeats.length ? `<p>Центральная энергия повторяется ещё и в каналах: <b>${repeats.join(', ')}</b> — значит, её тема для вас главная в жизни, и проработка центра меняет сразу несколько сфер.</p>` : ''}
    <p class="prog-advice"><b>Как ресурситься:</b> ${a ? a.advice : ''}</p>
  </div>`;
}
async function buildSingleSections(m) {
  const p = m.points;
  const pr = m.purposes;
  const ax = m.axes;
  const tailProg = findKarmicTail(m.karmicTail);

  // линия благополучия: центр = вход денег + вход отношений,
  // «под долларом» = вход денег + центр, «под сердцем» = вход отношений + центр
  const moneyIn = ax.right.inner;
  const relIn = ax.bottom.inner;
  const balance = reduceArcana(moneyIn + relIn);
  const dollar = reduceArcana(moneyIn + balance);
  const heart = reduceArcana(relIn + balance);

  const healthHTML = await healthAccordion(m.health.rows, m.health.totals, (r) => db.lichnHealth(r.id, r.emotion), (v) => db.lichnZone('destiny', v));

  const pk = programKeys(m);
  const [progTalents, progTail, progMoney, progRelations, progFather, progMother, progPers, progSoc] =
    await Promise.all([
      db.programCombo('talents', pk.talents),
      db.programCombo('tail', pk.tail),
      db.programCombo('money', pk.money),
      db.programCombo('relations', pk.relations),
      db.programCombo('father', pk.father),
      db.programCombo('mother', pk.mother),
      db.programCombo('purposePers', pk.purposePers),
      db.programCombo('purposeSoc', pk.purposeSoc),
    ]);

  const tailHTML = `
    ${programBanner(progTail, pk.tail)}
    ${tailProg ? `<div class="program-banner"><b>${tailProg.title}</b><p>${tailProg.text}</p></div>` : ''}
    <p class="hint">Триада хвоста читается от центра вниз: <b>${pk.tail.replace(/-/g, ' — ')}</b> (вход — опыт прошлого → усиление-привычка → главный урок)</p>
    ${await zoneCards('tail', [
      [ax.bottom.inner, 'Вход в хвост — опыт прошлого'],
      [ax.bottom.mid, 'Усиление — закрепившаяся привычка'],
      [p.tail, 'Главный урок — нижняя точка'],
    ])}`;

  const nowYear = new Date().getFullYear();
  const years = yearForecast(`${m.input.year}-${String(m.input.month).padStart(2, '0')}-${String(m.input.day).padStart(2, '0')}`, nowYear, 10);
  const forecastHTML = `
    <p class="hint">Кольцо возрастов: 64 позиции по ~1,25 года, энергия года = позиция кольца для возраста.</p>
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
    ['talents', 'Таланты', programBanner(progTalents, pk.talents) + `<p class="hint">Триада талантов читается от большого кружка: <b>${pk.talents.replace(/-/g, ' — ')}</b> (духовный талант → интеллект → самовыражение)</p>` + await zoneCards('talents', [
      [p.month, 'Духовный талант — месяц, Ангел-хранитель'],
      [ax.top.mid, 'Талант интеллекта и типа мышления'],
      [ax.top.inner, 'Талант самовыражения и коммуникации'],
    ])],
    ['destiny', 'Задача души', centerDeepHTML(m) + await zoneCards('destiny', [
      [p.center, 'Центр — зона комфорта, душа'],
    ])],
    ['vizitka', 'Визитка', await vizitkaHTML(m)],
    ['money', 'Деньги', programBanner(progMoney, pk.money) + `<p class="hint">Денежный канал: <b>${pk.money.replace(/-/g, ' — ')}</b> (год → профессия и род деятельности → вход в канал). Центр линии благополучия: <b>${balance}</b>, точка «под долларом»: <b>${dollar}</b></p>` + await zoneCards('money', [
      [p.year, 'Год — якорь денежного канала'],
      [ax.right.mid, 'Профессия и род деятельности'],
      [ax.right.inner, 'Вход в денежный канал'],
      [dollar, 'Точка «под долларом» — материальный потенциал'],
      [balance, 'Центр линии благополучия'],
    ])],
    ['relations', 'Отношения', programBanner(progRelations, pk.relations) + `<p class="hint">Канал отношений: <b>${pk.relations.replace(/-/g, ' — ')}</b> (вход в канал → «под сердцем», образ идеального партнёра → программа близости)</p>` + await zoneCards('relations', [
      [ax.bottom.inner, 'Вход в канал отношений'],
      [heart, '«Под сердцем» — идеальный партнёр'],
      [ax.bottom.mid, 'Программа близости'],
      [p.tail, 'Карма в отношениях — якорь канала'],
    ])],
    ['tail', 'Кармический хвост', tailHTML],
    ['purpose', 'Предназначения',
      programBanner(progPers, pk.purposePers)
      + programBanner(progSoc, pk.purposeSoc)
      + `<p class="hint">Личное (20–40): <b>${pr.personal}</b> · Социальное (40–60): <b>${pr.social}</b> · Общее: <b>${pr.general}</b> · Планетарное: <b>${pr.planetary}</b></p>`
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
    ['father', 'Род отца', programBanner(progFather, pk.father) + `<p class="hint">Духовная программа рода (от большого кружка): <b>${pk.father.replace(/-/g, ' — ')}</b> (угол → середина → связь с родом у центра)</p>` + await zoneCards('father', [
      [p.diagonal.leftTop, 'Духовная линия рода — 1 колено'],
      [m.rod.fatherTop.mid, 'Середина духовной линии'],
      [m.rod.fatherTop.inner, 'Связь с родом — таланты по отцу'],
      [p.diagonal.rightBottom, 'Материальная линия рода'],
      [m.rod.fatherBottom.inner, 'Связь с родом (материя)'],
    ])],
    ['mother', 'Род матери', programBanner(progMother, pk.mother) + `<p class="hint">Духовная программа рода (от большого кружка): <b>${pk.mother.replace(/-/g, ' — ')}</b> (угол → середина → связь с родом у центра)</p>` + await zoneCards('mother', [
      [p.diagonal.rightTop, 'Духовная линия рода — 1 колено'],
      [m.rod.motherTop.mid, 'Середина духовной линии'],
      [m.rod.motherTop.inner, 'Связь с родом — таланты по матери'],
      [p.diagonal.leftBottom, 'Материальная линия рода'],
      [m.rod.motherBottom.inner, 'Связь с родом (материя)'],
    ])],
    ['synthesis', 'Синтез энергий', synthesisHTML(m)],
    ['health', 'Матрица здоровья', healthHTML],
    ['forecast', 'Прогноз по годам', forecastHTML],
  ];
}

/* ================= Секции совместимости ================= */
async function buildCompatSections(c) {
  const p = c.points;
  const tailProg = findKarmicTail(c.karmicTail);

  const arc = (n) => db.compatArcana(n);
  const pk = programKeys(c);
  const [progRelC, progMoneyC, progTailC, progSocC] = await Promise.all([
    db.programCombo('relations', pk.relations),
    db.programCombo('money', pk.money),
    db.programCombo('tail', pk.tail),
    db.programCombo('purposeSoc', pk.purposeSoc),
  ]);
  const [
    arcCenter, arcRel, arcMoney, arcDay, arcYear, arcTail,
    arcBottomInner, arcRightInner, arcLeftInner, arcTopInner, arcEntry,
  ] = await Promise.all([
    arc(p.center), arc(c.keys.relations), arc(c.keys.money), arc(p.day), arc(p.year), arc(p.tail),
    arc(c.axes.bottom.inner), arc(c.axes.right.inner), arc(c.axes.left.inner), arc(c.axes.top.inner), arc(c.keys.entry),
  ]);

  const healthHTML = await healthAccordion(c.health.rows, c.health.totals, (r) => db.compatHealth(r.id, r.emotion), (v) => db.compatArcana(v).then((a) => a?.general ?? a));

  return [
    ['essence', 'Суть пары', compatBlockCard(p.center, 'general', 'Общая энергия пары', arcCenter)],
    ['love', 'Любовь и чувства',
      programBanner(progRelC, pk.relations)
      + compatBlockCard(c.keys.relations, 'love', 'Ключ отношений', arcRel)
      + compatBlockCard(c.keys.entry, 'love', 'Точка входа в канал', arcEntry)
      + compatBlockCard(c.axes.bottom.inner, 'love', 'Тело и близость', arcBottomInner)],
    ['finance', 'Финансы',
      programBanner(progMoneyC, pk.money)
      + compatBlockCard(c.keys.money, 'finance', 'Денежный ключ', arcMoney)
      + compatBlockCard(c.keys.entry, 'finance', 'Точка входа в канал', arcEntry)
      + compatBlockCard(c.axes.right.inner, 'finance', 'Социум и деньги', arcRightInner)],
    ['family', 'Семья и быт',
      compatBlockCard(p.day, 'family', 'Семейная жизнь', arcDay)
      + compatBlockCard(c.axes.left.inner, 'family', 'Эмоции в быту', arcLeftInner)],
    ['social', 'Социум',
      programBanner(progSocC, pk.purposeSoc)
      + compatBlockCard(p.year, 'social', 'Пара в социуме', arcYear)
      + compatBlockCard(c.axes.top.inner, 'social', 'Духовная связь', arcTopInner)],
    ['karma', 'Кармическая задача',
      programBanner(progTailC, pk.tail)
      + `${tailProg ? `<div class="program-banner"><b>${tailProg.title}</b><p>${tailProg.text}</p></div>` : ''}
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

  // боковая панель чакр (+ строка «Сумма» со всеми тремя итогами)
  const ht = result.health.totals;
  els.chakraSide.innerHTML = `
    <h3>Чакры</h3>
    ${result.health.rows.map((r, i) => `
      <div class="chakra-row">
        <span class="ch-dot" style="background:${CHAKRA_COLORS[i]}"></span>
        <span class="ch-name">${r.name}</span>
        <span class="ch-vals"><i>${r.phys}</i><i>${r.energy}</i><b>${r.emotion}</b></span>
      </div>`).join('')}
    <div class="chakra-row chakra-total">
      <span class="ch-dot ch-dot-sum"></span>
      <span class="ch-name">Сумма</span>
      <span class="ch-vals"><i>${ht.phys}</i><i>${ht.energy}</i><b>${ht.emotion}</b></span>
    </div>`;

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