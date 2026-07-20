/**
 * db.js — загрузчик базы трактовок.
 *
 * Источники (по приоритету):
 *  1. ../db/... — полная база из репозитория (ES-модули, как в проекте site)
 *  2. встроенная краткая база arcana.js — фолбэк, если файлов нет
 *
 * Кэширует модули, не падает при отсутствии файлов.
 */

import { ARCANA } from './data/arcana.js';

const cache = new Map();

async function loadModule(path) {
  if (cache.has(path)) return cache.get(path);
  let data = null;
  try {
    const mod = await import(path);
    data = mod.default ?? Object.values(mod)[0] ?? null;
  } catch {
    data = null; // файла нет — молча уходим в фолбэк
  }
  cache.set(path, data);
  return data;
}

/** Проверка доступности полной базы (для бейджа в UI). */
export async function dbStatus() {
  const probe = await loadModule('../db/lichn/arcanas/general.js');
  return { full: !!probe };
}

/** Запись зоны для аркана: { title?, positive, negative, advice, warning? } | null */
function pick(table, arcana) {
  if (!table) return null;
  return table[arcana] ?? table[String(arcana)] ?? null;
}

/* ---------- личная матрица ---------- */

const LICHN_FILES = {
  portrait: 'general',
  talents: 'talents',
  destiny: 'destiny',
  money: 'money',
  relations: 'relations',
  tail: 'tail',
  purposePers: 'purpose_pers',
  purposeSoc: 'purpose_soc',
  father: 'father',
  mother: 'mother',
  forecast: 'forecast',
};

export async function lichnZone(zone, arcana) {
  const file = LICHN_FILES[zone];
  if (!file) return null;
  const table = await loadModule(`../db/lichn/arcanas/${file}.js`);
  const entry = pick(table, arcana);
  if (entry) return normalizeEntry(entry);
  return fallbackEntry(arcana);
}

const HEALTH_CHAKRA_FILE = {
  sahasrara: 'Sahasrara', ajna: 'Ajna', vishudha: 'Vishudha', anahata: 'Anahata',
  manipura: 'Manipura', svadhisthana: 'Svadhisthana', muladhara: 'Muladhara',
};

export async function lichnHealth(chakraId, arcana) {
  const name = HEALTH_CHAKRA_FILE[chakraId];
  const table = await loadModule(`../db/lichn/health/lichn-${name}.js`);
  const entry = pick(table, arcana);
  if (entry) return normalizeEntry(entry);
  return fallbackEntry(arcana);
}

/* ---------- совместимость ---------- */

const COMPAT_ARCANA_FILES = {
  1: '1_magician', 2: '2_high_priestess', 3: '3_empress', 4: '4_emperor',
  5: '5_hierophant', 6: '6_lovers', 7: '7_chariot', 8: '8_justice',
  9: '9_hermit', 10: '10_wheel_of_fortune', 11: '11_strength', 12: '12_hanged_man',
  13: '13_death', 14: '14_temperance', 15: '15_devil', 16: '16_tower',
  17: '17_star', 18: '18_moon', 19: '19_sun', 20: '20_judgment',
  21: '21_world', 22: '22_fool',
};

/** Полная карточка аркана совместимости: { name, archetype, general, love, finance, ... } */
export async function compatArcana(arcana) {
  const file = COMPAT_ARCANA_FILES[arcana];
  const data = await loadModule(`../db/compat/arcanas/${file}.js`);
  if (data) return data;
  const a = ARCANA[arcana];
  return {
    name: a.name.toUpperCase(),
    archetype: a.archetype.toUpperCase(),
    general: { positive: a.compat, negative: a.negative, advice: a.advice, warning: '' },
  };
}

export async function compatHealth(chakraId, arcana) {
  const name = HEALTH_CHAKRA_FILE[chakraId];
  const table = await loadModule(`../db/compat/health/compat-${name}.js`);
  const entry = pick(table, arcana);
  if (entry) return normalizeEntry(entry);
  return fallbackEntry(arcana);
}

export async function compatForecast(arcana) {
  const table = await loadModule('../db/compat/arcanas/forecast.js');
  const entry = pick(table, arcana);
  if (entry) return normalizeEntry(entry);
  return fallbackEntry(arcana);
}

/* ---------- программы (пары арканов, опционально) ---------- */

export async function programTitle(pairKey) {
  const titles = await loadModule('../db/programs/program_titles.js');
  if (!titles) return null;
  const [a, b] = pairKey.split('-');
  return titles[pairKey] ?? titles[`${b}-${a}`] ?? null;
}

/* ---------- helpers ---------- */

function normalizeEntry(e) {
  return {
    title: e.title || e.header || '',
    positive: e.positive || '',
    negative: e.negative || '',
    advice: e.advice || '',
    warning: e.warning || '',
  };
}

function fallbackEntry(arcana) {
  const a = ARCANA[arcana];
  if (!a) return null;
  return {
    title: `${a.name} — ${a.archetype}`,
    positive: a.positive,
    negative: a.negative,
    advice: a.advice,
    warning: '',
  };
}
