/**
 * drums.js — кастомный выбор даты тремя «барабанами» (день / месяц / год).
 * Скролл со снапом + клик по пункту. Без зависимостей.
 */

const MONTHS = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
  'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

const ITEM_H = 32;
const VISIBLE = 3; // нечётное: выбранный — по центру

function pad(n) { return String(n).padStart(2, '0'); }

function buildColumn(labelText, items, initialIdx) {
  const col = document.createElement('div');
  col.className = 'drum-col';
  col.innerHTML = `<div class="drum-label">${labelText}</div>
    <div class="drum-wrap">
      <div class="drum" tabindex="0" role="listbox" aria-label="${labelText}">
        <div class="drum-pad"></div>
        ${items.map(([v, t], i) => `<div class="drum-item" role="option" data-i="${i}" data-v="${v}">${t}</div>`).join('')}
        <div class="drum-pad"></div>
      </div>
      <div class="drum-band" aria-hidden="true"></div>
    </div>`;
  const drum = col.querySelector('.drum');
  const state = { idx: initialIdx, items };

  const apply = () => {
    drum.querySelectorAll('.drum-item').forEach((el, i) => {
      el.classList.toggle('sel', i === state.idx);
      el.setAttribute('aria-selected', i === state.idx ? 'true' : 'false');
    });
  };
  // флаг программного скролла: пока он активен, scroll-события игнорируем,
  // иначе плавная прокрутка сама себя перехватывает и «золотая окантовка» не едет
  let prog = false, pt;
  const scrollTo = (smooth = true) => {
    prog = true;
    clearTimeout(pt);
    drum.scrollTo({ top: state.idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
    pt = setTimeout(() => { prog = false; drum.scrollTop = state.idx * ITEM_H; }, smooth ? 380 : 60);
  };

  let t;
  drum.addEventListener('scroll', () => {
    if (prog) return;
    clearTimeout(t);
    t = setTimeout(() => {
      const i = Math.round(drum.scrollTop / ITEM_H);
      state.idx = Math.max(0, Math.min(items.length - 1, i));
      scrollTo();
      apply();
      drum.dispatchEvent(new CustomEvent('drum-change', { bubbles: true }));
    }, 90);
  }, { passive: true });

  drum.addEventListener('click', (e) => {
    const item = e.target.closest('.drum-item');
    if (!item) return;
    state.idx = Number(item.dataset.i);
    scrollTo();
    apply();
    drum.dispatchEvent(new CustomEvent('drum-change', { bubbles: true }));
  });

  drum.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    state.idx = Math.max(0, Math.min(items.length - 1, state.idx + (e.key === 'ArrowDown' ? 1 : -1)));
    scrollTo();
    apply();
    drum.dispatchEvent(new CustomEvent('drum-change', { bubbles: true }));
  });

  requestAnimationFrame(() => { scrollTo(false); apply(); });
  return { col, state };
}

export function createDrums(root, { value } = {}) {
  // value: 'YYYY-MM-DD' | null
  let init = { d: 15, m: 6, y: 1995 };
  if (value) {
    const [y, m, d] = value.split('-').map(Number);
    if (y && m && d) init = { d, m, y };
  }

  const nowYear = new Date().getFullYear();
  const years = [];
  for (let y = 1930; y <= nowYear; y++) years.push([y, String(y)]);
  const days = Array.from({ length: 31 }, (_, i) => [i + 1, pad(i + 1)]);
  const months = MONTHS.map((t, i) => [i + 1, t]);

  root.classList.add('drums');
  root.innerHTML = '';
  const dc = buildColumn('День', days, init.d - 1);
  const mc = buildColumn('Месяц', months, init.m - 1);
  const yc = buildColumn('Год', years, years.findIndex(([v]) => v === init.y));
  root.append(dc.col, mc.col, yc.col);

  // корректировка числа дней в месяце
  const clampDay = () => {
    const dim = new Date(yc.state.items[yc.state.idx][0], mc.state.idx + 1, 0).getDate();
    if (dc.state.idx > dim - 1) {
      dc.state.idx = dim - 1;
      dc.col.querySelector('.drum').dispatchEvent(new Event('drum-change', { bubbles: true }));
    }
  };
  root.addEventListener('drum-change', clampDay);

  return {
    getValue() {
      const y = yc.state.items[yc.state.idx][0];
      const m = mc.state.idx + 1;
      const d = dc.state.idx + 1;
      return `${y}-${pad(m)}-${pad(d)}`;
    },
    setValue(v) {
      if (!v) return;
      const [y, m, d] = v.split('-').map(Number);
      if (!y || !m || !d) return;
      dc.state.idx = d - 1;
      mc.state.idx = m - 1;
      const yi = years.findIndex(([val]) => val === y);
      if (yi >= 0) yc.state.idx = yi;
      for (const c of [dc, mc, yc]) {
        c.col.querySelector('.drum').scrollTo({ top: c.state.idx * ITEM_H });
        c.col.querySelectorAll('.drum-item').forEach((el, i) => el.classList.toggle('sel', i === c.state.idx));
      }
    },
  };
}
