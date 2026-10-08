import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcMatrix, calcCompat, programKeys } from '../public/js/core/matrixCore.js';
import { KARMIC_TAILS, findKarmicTail } from '../public/js/data/arcana.js';
import { TALENT_MEANINGS } from '../public/js/data/talents.js';
import { lichnZone, programCombo } from '../public/js/db.js';

// Closed catalogue from the published 26-tail list, independent of the lookup table.
const EXPECTED_TAILS = [
  '3-7-22','3-13-10','3-22-19','6-5-17','6-8-20','6-14-8','6-17-11','6-20-14',
  '9-3-21','9-9-18','9-12-3','9-15-6','9-18-9','12-16-4','12-19-7',
  '15-5-8','15-8-11','15-20-5','18-3-12','18-6-6','18-6-15','18-9-9',
  '21-4-10','21-7-13','21-10-7','21-10-16',
];

test('все допустимые даты 1800–2200: хвост покрыт каталогом, талант имеет трактовку', () => {
  const seen = new Set();
  let count = 0;
  for (let year = 1800; year <= 2200; year++) {
    for (let month = 1; month <= 12; month++) {
      const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
      for (let day = 1; day <= days; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const m = calcMatrix(date);
        const keys = programKeys(m);
        count++;
        seen.add(keys.tail);
        assert.ok(KARMIC_TAILS[keys.tail]?.text, `${date}: отсутствует точный хвост ${keys.tail}`);
        assert.strictEqual(findKarmicTail(m.karmicTail), KARMIC_TAILS[keys.tail]);
        assert.ok(TALENT_MEANINGS[m.axes.top.inner], `${date}: отсутствует талант`);
        // M–R1–R uses channel nodes; N, the bottom-ray midpoint, is not on this path.
        assert.equal(keys.relations, [m.axes.bottom.inner, m.keys.relations, m.keys.entry].join('-'));
      }
    }
  }
  assert.equal(count, 146462);
  assert.deepEqual([...seen].sort(), [...EXPECTED_TAILS].sort());
  assert.deepEqual(Object.keys(KARMIC_TAILS).sort(), [...EXPECTED_TAILS].sort());
});

test('18-9-9 и 9-9-18 не подменяют друг друга', async () => {
  assert.equal((await programCombo('tail', '18-9-9')).title, 'Отшельник');
  assert.equal((await programCombo('tail', '9-9-18')).title, 'Волшебник (Магические знания)');
  assert.notStrictEqual(findKarmicTail([18, 9, 9]), findKarmicTail([9, 9, 18]));
  assert.equal((await programCombo('tail', '9-12-3')).title, 'Одинокая женщина');
  assert.equal(await programCombo('tail', '3-9-12'), null);
  assert.equal(await programCombo('tail', '22-10-19'), null);
});

test('все 22 таланта используют собственную краткую запись, в том числе без legacy-базы', async () => {
  assert.deepEqual(Object.keys(TALENT_MEANINGS).map(Number), Array.from({ length: 22 }, (_, i) => i + 1));
  const seen = new Set();
  for (let arcana = 1; arcana <= 22; arcana++) {
    const entry = await lichnZone('talents', arcana);
    assert.equal(entry.positive, TALENT_MEANINGS[arcana]);
    assert.ok(entry.title && entry.advice);
    seen.add(entry.positive);
  }
  assert.equal(seen.size, 22);
});

test('коды пары используют уже рассчитанные точки, не новую матрицу по её углам', () => {
  for (const [a, b] of [
    ['10.06.2006', '12.02.1997'], ['29.02.2000', '31.12.1999'],
    ['01.01.1800', '31.12.2200'], ['08.03.1960', '07.03.1946'],
  ]) {
    const c = calcCompat(a, b), k = programKeys(c);
    assert.equal(k.money, [c.points.year, c.axes.right.mid, c.axes.right.inner].join('-'));
    assert.equal(k.tail, c.karmicTail.join('-'));
    assert.equal(k.relations, [c.axes.bottom.inner, c.keys.relations, c.keys.entry].join('-'));
    assert.equal(k.father, [c.points.diagonal.leftTop, c.rod.fatherTop.mid, c.rod.fatherTop.inner].join('-'));
  }
});
