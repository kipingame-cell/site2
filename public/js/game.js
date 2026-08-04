/**
 * game.js — «Аркан дня»: мини-игра с вытягиванием карты.
 * 22 карты рубашкой вверх → выбор → переворот → имя, архетип, совет дня.
 */
import { ARCANA } from './data/arcana.js';

/* Те же изображения Райдера–Уэйта, что и на витрине (Wikimedia Commons, public domain). */
const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';
const ARC_IMG = {
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
  22: `${W}/9/90/RWS_Tarot_00_Fool.jpg/500px-RWS_Tarot_00_Fool.jpg`,
};

const $ = (id) => document.getElementById(id);
const deck = $('deck');
const result = $('cardResult');

function shuffled() {
  const a = Array.from({ length: 22 }, (_, i) => i + 1);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck() {
  deck.innerHTML = '';
  result.hidden = true;
  for (const n of shuffled()) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gcard';
    card.setAttribute('aria-label', 'Вытянуть карту');
    card.innerHTML = `
      <span class="gcard-inner">
        <span class="gcard-face gcard-back" aria-hidden="true">
          <svg viewBox="0 0 60 100" class="gcard-orn">
            <rect x="4" y="4" width="52" height="92" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
            <rect x="17" y="35" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.2"/>
            <rect x="17" y="35" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.2"
                  transform="rotate(45 30 48)"/>
            <circle cx="30" cy="48" r="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </span>
        <span class="gcard-face gcard-front"><img src="${ARC_IMG[n]}" alt="" loading="lazy" /></span>
      </span>`;
    card.addEventListener('click', () => pick(card, n), { once: true });
    deck.appendChild(card);
  }
}

function pick(card, n) {
  card.classList.add('flipped');
  deck.classList.add('deck-done');
  // остальные карты гасим
  for (const c of deck.querySelectorAll('.gcard')) if (c !== card) c.classList.add('dim');

  const a = ARCANA[n];
  $('cardImg').src = ARC_IMG[n];
  $('cardImg').alt = `Аркан ${n} — ${a.name}`;
  $('cardNum').textContent = n;
  $('cardName').textContent = a.name;
  $('cardArch').textContent = a.archetype;
  $('cardAdvice').textContent = a.advice;

  setTimeout(() => {
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 700);
}

$('btnAgain').addEventListener('click', () => {
  result.hidden = true;
  deck.classList.remove('deck-done');
  buildDeck();
  deck.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

buildDeck();
