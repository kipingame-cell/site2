/**
 * landing.js — витрина: статичная матрица (10.06.2006) + галерея 22 арканов.
 */
import { calcMatrix } from './core/matrixCore.js?v=14';
import { renderOctagram, LEGEND, ZONE_COLORS } from './octagram.js?v=20';
import { ARCANA } from './data/arcana.js';

/* Классические карты Райдера–Уэйта (Wikimedia Commons, public domain).
   В методе Матрицы Судьбы 8 = Справедливость, 11 = Сила (зеркально Уэйту), 22 = Шут. */
const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';
export const ARC_IMG = {
  1: `${W}/d/de/RWS_Tarot_01_Magician.jpg/500px-RWS_Tarot_01_Magician.jpg`,
  2: `${W}/8/88/RWS_Tarot_02_High_Priestess.jpg/500px-RWS_Tarot_02_High_Priestess.jpg`,
  3: `${W}/d/d2/RWS_Tarot_03_Empress.jpg/500px-RWS_Tarot_03_Empress.jpg`,
  4: `${W}/c/c3/RWS_Tarot_04_Emperor.jpg/500px-RWS_Tarot_04_Emperor.jpg`,
  5: `${W}/8/8d/RWS_Tarot_05_Hierophant.jpg/500px-RWS_Tarot_05_Hierophant.jpg`,
  6: `${W}/d/db/RWS_Tarot_06_Lovers.jpg/500px-RWS_Tarot_06_Lovers.jpg`,
  7: `${W}/9/9b/RWS_Tarot_07_Chariot.jpg/500px-RWS_Tarot_07_Chariot.jpg`,
  8: `${W}/e/e0/RWS_Tarot_11_Justice.jpg/500px-RWS_Tarot_11_Justice.jpg`,
  9: `${W}/4/4d/RWS_Tarot_09_Hermit.jpg/500px-RWS_Tarot_09_Hermit.jpg`,
  10: `${W}/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg/500px-RWS_Tarot_10_Wheel_of_Fortune.jpg`,
  11: `${W}/f/f5/RWS_Tarot_08_Strength.jpg/500px-RWS_Tarot_08_Strength.jpg`,
  12: `${W}/2/2b/RWS_Tarot_12_Hanged_Man.jpg/500px-RWS_Tarot_12_Hanged_Man.jpg`,
  13: `${W}/d/d7/RWS_Tarot_13_Death.jpg/500px-RWS_Tarot_13_Death.jpg`,
  14: `${W}/f/f8/RWS_Tarot_14_Temperance.jpg/500px-RWS_Tarot_14_Temperance.jpg`,
  15: `${W}/5/55/RWS_Tarot_15_Devil.jpg/500px-RWS_Tarot_15_Devil.jpg`,
  16: `${W}/5/53/RWS_Tarot_16_Tower.jpg/500px-RWS_Tarot_16_Tower.jpg`,
  17: `${W}/d/db/RWS_Tarot_17_Star.jpg/500px-RWS_Tarot_17_Star.jpg`,
  18: `${W}/7/7f/RWS_Tarot_18_Moon.jpg/500px-RWS_Tarot_18_Moon.jpg`,
  19: `${W}/1/17/RWS_Tarot_19_Sun.jpg/500px-RWS_Tarot_19_Sun.jpg`,
  20: `${W}/d/dd/RWS_Tarot_20_Judgement.jpg/500px-RWS_Tarot_20_Judgement.jpg`,
  21: `${W}/f/ff/RWS_Tarot_21_World.jpg/500px-RWS_Tarot_21_World.jpg`,
  22: `${W}/9/9b/RWS_Tarot_00_Fool.jpg/500px-RWS_Tarot_00_Fool.jpg`,
};

/* ---- статичная матрица 10.06.2006 ---- */
const svg = document.getElementById('matrixSvg');
if (svg) {
  const m = calcMatrix('2006-06-10');
  const tip = document.getElementById('pointTip');
  const onPoint = (node, e) => {
    if (!tip) return;
    if (!node) { tip.hidden = true; return; }
    const a = ARCANA[node.value];
    tip.innerHTML = `<b>${node.label}</b>Аркан ${node.value} — ${a ? `${a.name} · ${a.archetype}` : ''}`;
    tip.hidden = false;
    const x = e.clientX ?? 0;
    const y = e.clientY ?? 0;
    tip.style.left = `${Math.min(x + 16, window.innerWidth - 280)}px`;
    tip.style.top = `${Math.max(y - 24, 8)}px`;
  };
  document.addEventListener('click', () => { tip.hidden = true; });
  renderOctagram(svg, m, { onPointClick: onPoint });
  const legend = document.getElementById('landingLegend');
  if (legend) {
    legend.innerHTML = LEGEND.map(([k, label]) =>
      `<span class="legend-item"><i style="background:${ZONE_COLORS[k]}"></i>${label}</span>`).join('');
  }
}

/* ---- галерея 22 арканов ---- */
const grid = document.getElementById('arcanaGrid');
if (grid) {
  grid.innerHTML = Object.entries(ARCANA).map(([n, a]) => `
    <article class="arc-card">
      <div class="arc-img"><img src="${ARC_IMG[n]}" alt="Аркан ${n} — ${a.name}" loading="lazy"
        onerror="this.closest('.arc-img').classList.add('arc-noimg');this.remove()" /></div>
      <div class="arc-body">
        <div class="arc-title"><span class="arc-num">${n}</span><b>${a.name}</b></div>
        <div class="arc-arch">${a.archetype} · ${a.keywords}</div>
        <p>${a.positive}</p>
      </div>
    </article>`).join('');
}
