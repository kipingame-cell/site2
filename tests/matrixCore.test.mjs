import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  reduceArcana,
  parseDate,
  basePoints,
  calcMatrix,
  calcCompat,
  yearForecast,
  lifeRing,
  programKeys,
} from '../public/js/core/matrixCore.js';
import { composeExtra } from '../public/db/programsExtra.js';

test('reduceArcana: свёртка до 1..22', () => {
  assert.equal(reduceArcana(3), 3);
  assert.equal(reduceArcana(22), 22);
  assert.equal(reduceArcana(23), 5);
  assert.equal(reduceArcana(34), 7);
  assert.equal(reduceArcana(72), 9);
  assert.equal(reduceArcana(87), 15);
  assert.equal(reduceArcana(0), 22);
  assert.equal(reduceArcana(100), 1);
});

test('parseDate: форматы и валидация', () => {
  assert.deepEqual(parseDate('1974-10-03'), { day: 3, month: 10, year: 1974 });
  assert.deepEqual(parseDate('03.10.1974'), { day: 3, month: 10, year: 1974 });
  assert.throws(() => parseDate('31.02.2000'), /не существует/);
  assert.throws(() => parseDate('13.13.2000'), /Месяц/);
  assert.throws(() => parseDate('hello'), /формат/);
});

test('эталон 03.10.1974: углы, центр, хвост', () => {
  const m = calcMatrix('03.10.1974');
  assert.equal(m.points.day, 3);
  assert.equal(m.points.month, 10);
  assert.equal(m.points.year, 21);
  assert.equal(m.points.tail, 7);
  assert.equal(m.points.center, 5);
  assert.deepEqual(m.karmicTail, [12, 19, 7]);
});

test('эталон 25.11.2002: полная схема подточек и ключей', () => {
  const m = calcMatrix('25.11.2002');
  assert.deepEqual(
    [m.points.day, m.points.month, m.points.year, m.points.tail, m.points.center],
    [7, 11, 4, 22, 8],
  );
  // диагонали
  assert.equal(m.points.diagonal.leftTop, 18);   // 7+11
  assert.equal(m.points.diagonal.rightTop, 15);  // 11+4
  assert.equal(m.points.diagonal.rightBottom, 8); // 4+22=26→8
  assert.equal(m.points.diagonal.leftBottom, 11); // 22+7=29→11
  // оси: inner = угол+центр, mid = угол+inner
  assert.deepEqual(m.axes.left, { corner: 7, inner: 15, mid: 22 });
  assert.deepEqual(m.axes.top, { corner: 11, inner: 19, mid: 3 });
  assert.deepEqual(m.axes.right, { corner: 4, inner: 12, mid: 16 });
  assert.deepEqual(m.axes.bottom, { corner: 22, inner: 3, mid: 7 });
  // ключи денег/отношений
  assert.equal(m.keys.entry, 15);      // 3+12
  assert.equal(m.keys.relations, 18);  // 3+15
  assert.equal(m.keys.money, 9);       // 15+12=27→9
});

test('эталон 08.03.1960: столбец физики здоровья = 72 → 9', () => {
  const m = calcMatrix('08.03.1960');
  const phys = m.health.rows.map((r) => r.phys);
  assert.deepEqual(phys, [8, 7, 17, 8, 9, 7, 16]);
  assert.equal(phys.reduce((a, b) => a + b, 0), 72);
  assert.equal(m.health.totals.phys, 9);
});

test('эталон 07.03.1946: предназначения', () => {
  const m = calcMatrix('07.03.1946');
  assert.equal(m.purposes.sky, 6);         // 3+3
  assert.equal(m.purposes.earth, 9);       // 7+20=27→9
  assert.equal(m.purposes.personal, 15);   // 6+9
  assert.equal(m.purposes.fatherLine, 15); // 10+5
  assert.equal(m.purposes.motherLine, 15); // 5+10
  assert.equal(m.purposes.social, 3);      // 15+15=30→3
  assert.equal(m.purposes.general, 18);    // 15+3
  assert.equal(m.purposes.planetary, 21);  // 18+3
});

test('эталон 19.08.1883 (Коко Шанель): центр и диагонали', () => {
  const m = calcMatrix('19.08.1883');
  assert.deepEqual(
    [m.points.day, m.points.month, m.points.year, m.points.tail, m.points.center],
    [19, 8, 20, 11, 13],
  );
  assert.equal(m.points.diagonal.leftTop, 9);    // 19+8=27→9
  assert.equal(m.points.diagonal.rightTop, 10);  // 8+20=28→10
  assert.equal(m.points.diagonal.rightBottom, 4); // 20+11=31→4
  assert.equal(m.points.diagonal.leftBottom, 3);  // 19+11=30→3
});

test('совместимость: поузловая сумма и хвост пары', () => {
  // партнёр 1: 03.10.1974 (хвост [12,19,7], центр 5)
  // партнёр 2: подбираем так, чтобы нижний угол = 9, центр = 9 (пример из источника)
  const c = calcCompat('03.10.1974', '25.11.2002');
  assert.equal(c.points.day, reduceArcana(3 + 7));
  assert.equal(c.points.center, reduceArcana(5 + 8));
  assert.deepEqual(c.karmicTail, [
    reduceArcana(12 + 3),  // 15
    reduceArcana(19 + 7),  // 26 → 8
    reduceArcana(7 + 22),  // 29 → 11
  ]);
  // структура совпадает с личной
  assert.equal(c.health.rows.length, 7);
  assert.ok(c.purposes.planetary >= 1 && c.purposes.planetary <= 22);
});

test('прогноз: энергии года в диапазоне 1..22', () => {
  const f = yearForecast('25.11.2002', 2026, 10);
  assert.equal(f.length, 10);
  assert.equal(f[0].year, 2026);
  for (const { energy } of f) {
    assert.ok(energy >= 1 && energy <= 22);
  }
});

test('прогноз: кольцо возрастов (эталон 10.06.2006 → 2026 = 6)', () => {
  const f = yearForecast('10.06.2006', 2026, 1);
  assert.equal(f[0].age, 20);
  assert.equal(f[0].energy, 6); // 20 лет = верхняя точка кольца (месяц)
  // кольцо из 64 позиций: угол + 7 рекурсивных сумм-середин на декаду,
  // сверено попиксельно с эталонной схемой (matricasudbi-kalkulator.ru)
  const ring = lifeRing(calcMatrix('10.06.2006'));
  assert.equal(ring.length, 64);
  assert.deepEqual(ring, [
    8, 11, 3, 7, 22, 4, 9, 5,     // 8 → 14
    14, 21, 7, 9, 20, 10, 8, 14,  // 14 → 6
    6, 16, 10, 5, 22, 6, 11, 9,   // 6 → 16
    16, 22, 6, 14, 8, 8, 18, 10,  // 16 → 10
    10, 10, 18, 8, 8, 14, 6, 22,  // 10 → 16
    16, 9, 11, 6, 22, 5, 10, 16,  // 16 → 6
    6, 14, 8, 10, 20, 9, 7, 21,   // 6 → 14
    14, 5, 9, 4, 22, 7, 3, 11,    // 14 → 8
  ]);
  // по годам: 2026..2031 → 6, 6, 16, 10, 5, 22 (возраст × 0,8)
  const ys = yearForecast('10.06.2006', 2026, 6).map((f) => f.energy);
  assert.deepEqual(ys, [6, 6, 16, 10, 5, 22]);
});

test('все точки матрицы всегда в 1..22 (фузз по датам)', () => {
  const dates = ['01.01.1900', '29.02.2000', '31.12.1999', '23.11.1987', '08.07.2026'];
  for (const d of dates) {
    const m = calcMatrix(d);
    const vals = [
      ...Object.values(m.axes).flatMap((a) => [a.corner, a.inner, a.mid]),
      ...Object.values(m.rod).flatMap((a) => [a.corner, a.inner, a.mid]),
      ...Object.values(m.points.diagonal),
      ...Object.values(m.keys),
      ...m.karmicTail,
      ...Object.values(m.purposes),
      ...m.health.rows.flatMap((r) => [r.phys, r.energy, r.emotion]),
    ];
    for (const v of vals) {
      assert.ok(v >= 1 && v <= 22, `${d}: значение ${v} вне диапазона`);
    }
  }
});

test('programKeys: структура триад по Ладини (каналы и оси)', () => {
  for (const ds of ['03.10.1974', '10.06.2006', '25.12.1990', '01.01.2000']) {
    const m = calcMatrix(ds);
    const E = m.points.center;
    const pk = programKeys(m);
    const link = (x) => reduceArcana(x + E);       // вход (у центра)
    const mid = (x) => reduceArcana(x + link(x));  // середина луча

    // таланты / деньги / роды — от большого кружка: угол — серед — вход
    for (const [sec, corner] of [
      ['talents', m.points.month], ['money', m.points.year],
      ['father', m.points.diagonal.leftTop], ['mother', m.points.diagonal.rightTop],
    ]) {
      const [a, b, c] = pk[sec].split('-').map(Number);
      assert.equal(a, corner, `${sec}: угол`);
      assert.equal(b, mid(corner), `${sec}: середина`);
      assert.equal(c, link(corner), `${sec}: вход`);
    }
    // хвост — от центра вниз: вход — серед — угол
    {
      const [a, b, c] = pk.tail.split('-').map(Number);
      assert.equal(a, link(m.points.tail), 'tail: вход');
      assert.equal(b, mid(m.points.tail), 'tail: середина');
      assert.equal(c, m.points.tail, 'tail: нижний угол');
    }
    // отношения: вход — «под сердцем» — серед
    {
      const relIn = link(m.points.tail);
      const heart = reduceArcana(relIn + reduceArcana(link(m.points.year) + relIn));
      const [a, b, c] = pk.relations.split('-').map(Number);
      assert.equal(a, relIn, 'relations: вход');
      assert.equal(b, heart, 'relations: под сердцем');
      assert.equal(c, mid(m.points.tail), 'relations: середина');
    }
    // предназначения
    const [s, pers, e] = pk.purposePers.split('-').map(Number);
    assert.equal(s, m.purposes.sky);
    assert.equal(pers, m.purposes.personal);
    assert.equal(e, m.purposes.earth);
    const [ml, fl, soc] = pk.purposeSoc.split('-').map(Number);
    assert.equal(ml, m.purposes.fatherLine);
    assert.equal(fl, m.purposes.motherLine);
    assert.equal(soc, m.purposes.social);
    assert.equal(soc, reduceArcana(ml + fl), 'соц = муж + жен');
  }
});

test('programKeys: эталон 10.06.2006 — таланты и хвост зеркальны', () => {
  const pk = programKeys(calcMatrix('10.06.2006'));
  assert.equal(pk.tail, '9-15-6');      // вход 9 (6+3), серед 15 (6+9), угол 6
  assert.equal(pk.talents, '6-15-9');   // те же энергии, но от большого кружка
  assert.notEqual(pk.talents, pk.tail); // ключи разных типов не совпадают
  assert.equal(pk.money, '8-19-11');    // год 8, проф 19 (8+11=19), вход 11 (8+3)
  assert.equal(pk.relations, '9-11-15'); // вход 9, под сердцем 11 (9+20=29→11), близость 15
  assert.equal(pk.father, '16-8-19');
  assert.equal(pk.mother, '14-4-17');
});

test('programKeys: все триады реальных дат покрыты базой программ', async () => {
  const FILES = {
    talents: 'talents', tail: 'tail', money: 'money', relations: 'relations',
    father: 'father', mother: 'mother', purposePers: 'purpose_pers', purposeSoc: 'purpose_soc',
  };
  const tables = {};
  for (const [sec, f] of Object.entries(FILES)) {
    const mod = await import(`../public/db/programs/${f}.js`);
    tables[sec] = Object.values(mod)[0];
  }
  const missed = [];
  for (let y = 1950; y <= 2030; y += 3) {
    for (let mo = 1; mo <= 12; mo++) {
      for (let d = 1; d <= 28; d += 3) {
        const ds = `${String(d).padStart(2, '0')}.${String(mo).padStart(2, '0')}.${y}`;
        const pk = programKeys(calcMatrix(ds));
        for (const [sec, key] of Object.entries(pk)) {
          if (!tables[sec]?.[key] && !composeExtra(sec, key)) missed.push(`${sec}:${key}`);
        }
      }
    }
  }
  assert.deepEqual(missed, []);
});
