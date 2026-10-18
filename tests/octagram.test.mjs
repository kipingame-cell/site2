import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcMatrix } from '../public/js/core/matrixCore.js';
import { renderOctagram } from '../public/js/octagram.js';

test('SVG: возрастные подписи и точки соответствуют расчёту, центры не подменены предназначениями', () => {
  const original = globalThis.document;
  const element = () => ({
    attrs: {}, children: [], listeners: {}, textContent: '',
    setAttribute(k,v) { this.attrs[k] = v; },
    appendChild(child) { this.children.push(child); },
    addEventListener(k,fn) { this.listeners[k] = fn; },
  });
  globalThis.document = {createElementNS: element};
  try {
    const svg = element(), nodes = [];
    renderOctagram(svg, calcMatrix('10.06.2006'), {onPointClick: node => nodes.push(node)});
    for (const e of svg.children) e.listeners.mouseenter?.({});
    const ages = svg.children.filter(e => e.attrs.class === 'og-age');
    assert.ok(Number(ages.find(e => e.textContent === '0 лет').attrs.x) < 340);
    assert.ok(Number(ages.find(e => e.textContent === '40 лет').attrs.x) > 340);
    assert.ok(Number(ages.find(e => e.textContent === '10 лет').attrs.x) < 340);
    assert.ok(Number(ages.find(e => e.textContent === '30 лет').attrs.x) > 340);
    assert.equal(nodes.find(n => n.label === 'Самовыражение — Вишудха').value, 13);
    assert.equal(nodes.find(n => n.label === 'Таланты — Вишудха').value, 9);
    assert.equal(nodes.find(n => n.label.startsWith('Родовой центр')).value, 6);
    assert.equal(nodes.find(n => n.label.startsWith('Общий центр силы')).value, 9);
    assert.equal(nodes.find(n => n.label === 'Род отца — духовная линия · связь с родом').value, 22);
  } finally {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  }
});
