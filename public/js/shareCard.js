export async function shareMatrixCard(result, d1, d2, mode) {
  const blob = await buildShareCard(result, d1, d2, mode);
  const file = new File([blob], 'matrica-sudby.png', { type: 'image/png' });

  // ссылка с готовыми датами — получатель открывает сразу посчитанный расчёт
  const u = new URL(location.origin + location.pathname);
  u.searchParams.set('mode', mode);
  u.searchParams.set('d1', d1);
  if (mode === 'compat') u.searchParams.set('d2', d2);
  const link = u.toString();
  const text = (mode === 'compat'
    ? 'Наша совместимость по Матрице Судьбы — полный разбор пары'
    : 'Моя Матрица Судьбы — полный разбор') + `\n${link}`;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      // часть клиентов игнорирует url при файлах — дублируем ссылку в тексте
      await navigator.share({ files: [file], title: 'Матрица Судьбы', text, url: link });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  // запасной вариант: скачать png + ссылку в буфер
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'matrica-sudby.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  try { await navigator.clipboard.writeText(link); } catch { /* буфер недоступен — не страшно */ }
  return 'downloaded';
}
