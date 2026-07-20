/**
 * matrixCore.js — расчётное ядро Матрицы Судьбы (метод 22 арканов).
 *
 * Чистый ES-модуль: работает и в браузере, и в Node (для тестов).
 * Все формулы сверены с эталонными ручными расчётами:
 *   - 03.10.1974 → A=3, B=10, C=21, D=7, E=5, хвост 12-19-7
 *   - 25.11.2002 → A=7, B=11, C=4, D=22, E=8, все подточки и ключи
 *   - 08.03.1960 → столбец «Физика» здоровья: 8+7+17+8+9+7+16 = 72 → 9
 *   - 07.03.1946 → Небо=6, Земля=9, М=15, Ж=15, Соц=3, Общее=18, Планетарное=21
 *
 * Обозначения:
 *   A — день рождения (левый угол)
 *   B — месяц рождения (верхний угол)
 *   C — сумма цифр года (правый угол)
 *   D — кармический хвост, A+B+C (нижний угол)
 *   E — центр, A+B+C+D
 */

/** Сумма цифр числа. */
export function digitSum(n) {
  return String(Math.abs(n))
    .split('')
    .reduce((acc, ch) => acc + Number(ch), 0);
}

/**
 * Свёртка числа до аркана (1..22).
 * Пока число > 22 — складываем его цифры. 0 трактуем как 22 (Шут).
 */
export function reduceArcana(n) {
  if (!Number.isFinite(n)) throw new TypeError(`reduceArcana: не число (${n})`);
  let x = Math.abs(Math.trunc(n));
  if (x === 0) return 22;
  while (x > 22) x = digitSum(x);
  return x === 0 ? 22 : x;
}

/** Разбор даты 'YYYY-MM-DD' / 'DD.MM.YYYY' → { day, month, year }. */
export function parseDate(input) {
  if (typeof input !== 'string') throw new TypeError('Дата должна быть строкой');
  const s = input.trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    return validate(+m[3], +m[2], +m[1]);
  }
  if ((m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/))) {
    return validate(+m[1], +m[2], +m[3]);
  }
  throw new Error(`Неверный формат даты: «${input}». Ожидается YYYY-MM-DD или DD.MM.YYYY`);
}

function validate(day, month, year) {
  if (month < 1 || month > 12) throw new Error(`Месяц вне диапазона: ${month}`);
  if (day < 1 || day > 31) throw new Error(`День вне диапазона: ${day}`);
  if (year < 1800 || year > 2200) throw new Error(`Год вне диапазона: ${year}`);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCDate() !== day || d.getUTCMonth() !== month - 1) {
    throw new Error(`Такой даты не существует: ${day}.${month}.${year}`);
  }
  return { day, month, year };
}

/** Сумма цифр года, сведённая к аркану. */
export function yearArcana(year) {
  return reduceArcana(digitSum(year));
}

/* ------------------------------------------------------------------ */
/*  Базовые точки                                                      */
/* ------------------------------------------------------------------ */

/**
 * Пять главных точек матрицы.
 * @returns {{A:number,B:number,C:number,D:number,E:number}}
 */
export function basePoints(dateStr) {
  const { day, month, year } = parseDate(dateStr);
  const A = reduceArcana(day);          // день — портрет личности
  const B = reduceArcana(month);        // месяц — ангел-хранитель / таланты
  const C = yearArcana(year);           // год — материальная карма
  const D = reduceArcana(A + B + C);    // кармический хвост (нижний угол)
  const E = reduceArcana(A + B + C + D);// центр — зона комфорта
  return { A, B, C, D, E };
}

/* ------------------------------------------------------------------ */
/*  Полная матрица                                                     */
/* ------------------------------------------------------------------ */

/** Точки одной оси: угол → внутренняя (угол+центр) → средняя (угол+внутр.). */
function axis(corner, center) {
  const inner = reduceArcana(corner + center);
  const mid = reduceArcana(corner + inner);
  return { corner, inner, mid };
}

/**
 * Полный расчёт личной матрицы.
 * Структура возврата описана в README (раздел «Формулы»).
 */
export function calcMatrix(dateStr) {
  const { day, month, year } = parseDate(dateStr);
  const { A, B, C, D, E } = basePoints(dateStr);

  // Родовые диагонали (углы прямого квадрата)
  const LT = reduceArcana(A + B); // верх-лево  — род отца, духовное
  const RT = reduceArcana(B + C); // верх-право — род матери, духовное
  const RB = reduceArcana(C + D); // низ-право  — род отца, материя
  const LB = reduceArcana(D + A); // низ-лево   — род матери, материя

  // Оси личного квадрата (по 3 точки на луч)
  const axes = {
    left: axis(A, E),   // день: портрет / талант от Бога / эмоции
    top: axis(B, E),    // месяц: ангел-хранитель / интуиция / связь с духом
    right: axis(C, E),  // год: материя / денежный вход / социум
    bottom: axis(D, E), // хвост: главный урок / вход в отношения / тело
  };

  // Родовые лучи (по 3 точки)
  const rod = {
    fatherTop: axis(LT, E),
    motherTop: axis(RT, E),
    fatherBottom: axis(RB, E),
    motherBottom: axis(LB, E),
  };

  // Канал денег и отношений (между нижним и правым лучами)
  const keyInn = reduceArcana(axes.bottom.inner + axes.right.inner); // точка входа
  const keyRel = reduceArcana(axes.bottom.inner + keyInn);           // ключ отношений
  const keyMoney = reduceArcana(keyInn + axes.right.inner);          // денежный ключ

  // Кармический хвост (триада)
  const tail1 = reduceArcana(E + D);
  const tail2 = reduceArcana(tail1 + D);
  const tail = [tail1, tail2, D];

  // Предназначения
  const sky = reduceArcana(B + D);       // небо — духовные задачи
  const earth = reduceArcana(A + C);     // земля — материальные задачи
  const personal = reduceArcana(sky + earth);        // личное (20–40 лет)
  const fatherLine = reduceArcana(LT + RB);          // мужской род
  const motherLine = reduceArcana(RT + LB);          // женский род
  const social = reduceArcana(fatherLine + motherLine); // социальное (40–60)
  const general = reduceArcana(personal + social);   // общее
  const planetary = reduceArcana(general + social);  // планетарное

  return {
    input: { day, month, year },
    points: {
      day: A, month: B, year: C, tail: D, center: E,
      diagonal: { leftTop: LT, rightTop: RT, rightBottom: RB, leftBottom: LB },
    },
    axes,
    rod,
    keys: { entry: keyInn, relations: keyRel, money: keyMoney },
    karmicTail: tail,
    purposes: {
      sky, earth, personal,
      fatherLine, motherLine, social,
      general, planetary,
    },
    health: calcHealth({ A, B, C, D, E }),
  };
}

/* ------------------------------------------------------------------ */
/*  Матрица здоровья (7 чакр: физика / энергия / эмоции)               */
/* ------------------------------------------------------------------ */

export const CHAKRAS = [
  { id: 'sahasrara',    name: 'Сахасрара',    note: 'теменная — дух, связь с высшим' },
  { id: 'ajna',         name: 'Аджна',        note: 'лобная — разум, интуиция' },
  { id: 'vishudha',     name: 'Вишудха',      note: 'горловая — коммуникация, творчество' },
  { id: 'anahata',      name: 'Анахата',      note: 'сердечная — любовь, чувства' },
  { id: 'manipura',     name: 'Манипура',     note: 'солнечное сплетение — воля, деньги' },
  { id: 'svadhisthana', name: 'Свадхистана',  note: 'пупочная — сексуальность, удовольствие' },
  { id: 'muladhara',    name: 'Муладхара',    note: 'крестцовая — опора, выживание' },
];

/**
 * Физика — по горизонтальной линии Земли (A … C через E).
 * Энергия — по вертикальной линии Неба (B … D через E).
 * Эмоции (итог чакры) = физика + энергия.
 */
export function calcHealth({ A, B, C, D, E }) {
  // Линия Земли (физика)
  const aInner = reduceArcana(A + E);          // внутренняя точка дня
  const aMid = reduceArcana(A + aInner);       // средняя точка дня
  const phys = {
    sahasrara: A,
    ajna: aMid,
    vishudha: aInner,
    anahata: reduceArcana(aInner + E),
    manipura: E,
    svadhisthana: reduceArcana(C + E),
    muladhara: C,
  };
  // Линия Неба (энергия)
  const bInner = reduceArcana(B + E);
  const bMid = reduceArcana(B + bInner);
  const en = {
    sahasrara: B,
    ajna: bMid,
    vishudha: bInner,
    anahata: reduceArcana(bInner + E),
    manipura: E,
    svadhisthana: reduceArcana(D + E),
    muladhara: D,
  };

  const rows = CHAKRAS.map((c) => {
    const p = phys[c.id];
    const e = en[c.id];
    return { ...c, phys: p, energy: e, emotion: reduceArcana(p + e) };
  });

  const colSum = (key) => rows.reduce((acc, r) => acc + r[key], 0);
  const totals = {
    phys: reduceArcana(colSum('phys')),
    energy: reduceArcana(colSum('energy')),
    emotion: reduceArcana(colSum('emotion')),
  };

  return { rows, totals };
}

/* ------------------------------------------------------------------ */
/*  Совместимость: поузловая сумма двух матриц                         */
/* ------------------------------------------------------------------ */

function sumAxis(x, y) {
  return {
    corner: reduceArcana(x.corner + y.corner),
    inner: reduceArcana(x.inner + y.inner),
    mid: reduceArcana(x.mid + y.mid),
  };
}

export function calcCompat(dateStr1, dateStr2) {
  const m1 = calcMatrix(dateStr1);
  const m2 = calcMatrix(dateStr2);

  const A = reduceArcana(m1.points.day + m2.points.day);
  const B = reduceArcana(m1.points.month + m2.points.month);
  const C = reduceArcana(m1.points.year + m2.points.year);
  const D = reduceArcana(m1.points.tail + m2.points.tail);
  const E = reduceArcana(m1.points.center + m2.points.center);

  const healthRows = CHAKRAS.map((c, i) => {
    const r1 = m1.health.rows[i];
    const r2 = m2.health.rows[i];
    const p = reduceArcana(r1.phys + r2.phys);
    const e = reduceArcana(r1.energy + r2.energy);
    return { ...c, phys: p, energy: e, emotion: reduceArcana(p + e) };
  });
  const colSum = (key) => healthRows.reduce((acc, r) => acc + r[key], 0);

  const tail1 = reduceArcana(m1.karmicTail[0] + m2.karmicTail[0]);
  const tail2 = reduceArcana(m1.karmicTail[1] + m2.karmicTail[1]);
  const tailD = reduceArcana(m1.karmicTail[2] + m2.karmicTail[2]);

  return {
    partners: [m1.input, m2.input],
    points: {
      day: A, month: B, year: C, tail: D, center: E,
      diagonal: {
        leftTop: reduceArcana(m1.points.diagonal.leftTop + m2.points.diagonal.leftTop),
        rightTop: reduceArcana(m1.points.diagonal.rightTop + m2.points.diagonal.rightTop),
        rightBottom: reduceArcana(m1.points.diagonal.rightBottom + m2.points.diagonal.rightBottom),
        leftBottom: reduceArcana(m1.points.diagonal.leftBottom + m2.points.diagonal.leftBottom),
      },
    },
    axes: {
      left: sumAxis(m1.axes.left, m2.axes.left),
      top: sumAxis(m1.axes.top, m2.axes.top),
      right: sumAxis(m1.axes.right, m2.axes.right),
      bottom: sumAxis(m1.axes.bottom, m2.axes.bottom),
    },
    rod: {
      fatherTop: sumAxis(m1.rod.fatherTop, m2.rod.fatherTop),
      motherTop: sumAxis(m1.rod.motherTop, m2.rod.motherTop),
      fatherBottom: sumAxis(m1.rod.fatherBottom, m2.rod.fatherBottom),
      motherBottom: sumAxis(m1.rod.motherBottom, m2.rod.motherBottom),
    },
    keys: {
      entry: reduceArcana(m1.keys.entry + m2.keys.entry),
      relations: reduceArcana(m1.keys.relations + m2.keys.relations),
      money: reduceArcana(m1.keys.money + m2.keys.money),
    },
    karmicTail: [tail1, tail2, tailD],
    purposes: {
      sky: reduceArcana(m1.purposes.sky + m2.purposes.sky),
      earth: reduceArcana(m1.purposes.earth + m2.purposes.earth),
      personal: reduceArcana(m1.purposes.personal + m2.purposes.personal),
      fatherLine: reduceArcana(m1.purposes.fatherLine + m2.purposes.fatherLine),
      motherLine: reduceArcana(m1.purposes.motherLine + m2.purposes.motherLine),
      social: reduceArcana(m1.purposes.social + m2.purposes.social),
      general: reduceArcana(m1.purposes.general + m2.purposes.general),
      planetary: reduceArcana(m1.purposes.planetary + m2.purposes.planetary),
    },
    health: {
      rows: healthRows,
      totals: {
        phys: reduceArcana(colSum('phys')),
        energy: reduceArcana(colSum('energy')),
        emotion: reduceArcana(colSum('emotion')),
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Прогноз: энергия года (персональный год в системе 22 арканов)      */
/* ------------------------------------------------------------------ */

/**
 * Прогноз по годам — классическое «кольцо возрастов».
 * Кольцо из 64 позиций: 8 углов октаграммы (по 10 лет, начиная с точки года = 0 лет),
 * каждый отрезок между углами делится на 8 частей — 7 промежуточных точек,
 * рассчитанных рекурсивными суммами-серединами (как подточки осей матрицы).
 * 1 позиция ≈ 1,25 года; энергия года = кольцо[floor(возраст × 0,8) mod 64].
 * Сверено попиксельно с эталоном (matricasudbi-kalkulator.ru), в т.ч.
 * 10.06.2006 → 2026 год (20 лет) = верхняя точка = 6.
 */
export function lifeRing(m) {
  const p = m.points;
  const d = p.diagonal;
  const corners = [p.year, d.rightTop, p.month, d.leftTop, p.day, d.leftBottom, p.tail, d.rightBottom];
  // Каждый 10-летний отрезок между соседними углами делится на 8 частей (7 точек).
  // Точки — рекурсивные суммы-середины (проверено по эталонному калькулятору):
  // mid = c1+c2; v2 = c1+mid; v6 = mid+c2; v1 = c1+v2; v3 = v2+mid; v5 = mid+v6; v7 = v6+c2
  const ring = [];
  for (let i = 0; i < 8; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % 8];
    const mid = reduceArcana(c1 + c2);
    const v2 = reduceArcana(c1 + mid);
    const v6 = reduceArcana(mid + c2);
    const v1 = reduceArcana(c1 + v2);
    const v3 = reduceArcana(v2 + mid);
    const v5 = reduceArcana(mid + v6);
    const v7 = reduceArcana(v6 + c2);
    ring.push(c1, v1, v2, v3, mid, v5, v6, v7);
  }
  return ring; // 64 значения, позиция = возраст × 0,8 (1 позиция ≈ 1,25 года)
}

export function yearForecast(dateStr, fromYear, count = 10) {
  const m = calcMatrix(dateStr);
  const ring = lifeRing(m);
  const { year: birthYear } = parseDate(dateStr);
  const out = [];
  for (let y = fromYear; y < fromYear + count; y++) {
    const age = y - birthYear;
    const idx = Math.floor((((age % 80) + 80) % 80) * 0.8) % 64;
    out.push({ year: y, age, energy: ring[idx] });
  }
  return out;
}
