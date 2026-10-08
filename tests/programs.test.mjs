import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcMatrix, programKeys } from '../public/js/core/matrixCore.js';
import { findKarmicTail } from '../public/js/data/arcana.js';
import { programCombo, programTitle, lichnZone } from '../public/js/db.js';

test('10.06.2006: хвост имеет установленное название и ту же трактовку при чтении назад', async () => {
  const key = programKeys(calcMatrix('10.06.2006')).tail;
  const forward = await programCombo('tail', key);
  assert.equal(key, '9-15-6');
  assert.equal(forward.title, 'Мир страстей и сказок (Страсть или любовь)');
  assert.deepEqual(await programCombo('tail', '6-15-9'), forward);
  assert.equal(await programTitle(key), forward.title);
  assert.ok(forward.text.includes('близостью'));
});

test('перестановка средней энергии не подменяет хвост', () => {
  assert.equal(findKarmicTail([9, 6, 15]), null);
  assert.equal(findKarmicTail([15, 9, 6]), null);
  assert.equal(findKarmicTail([0, 15, 6]), null);
});

test('неизвестная или некорректная программа не получает сочинённое имя', async () => {
  assert.equal(await programCombo('tail', '1-2-3'), null);
  assert.equal(await programCombo('tail', '9-15'), null);
  assert.equal(await programCombo('tail', '9-15-23'), null);
  assert.equal(await programCombo('unknown', '9-15-6'), null);
  assert.equal(await programTitle('1-2-3'), null);
});

test('10.06.2006: личный талант — 9, верхняя линия — 6-15-9', async () => {
  const m = calcMatrix('10.06.2006');
  assert.equal(m.axes.top.inner, 9);
  assert.equal(programKeys(m).talents, '6-15-9');
  const talent = await lichnZone('talents', m.axes.top.inner);
  assert.equal(talent.title, 'Отшельник — знания, исследование и наставничество');
  assert.ok(talent.positive.includes('исследование'));
  assert.ok(!talent.positive.includes('страсть'));
});
