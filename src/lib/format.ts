const time = new Intl.DateTimeFormat('es-US', { hour: 'numeric', minute: '2-digit' });
const day = new Intl.DateTimeFormat('es-US', { day: 'numeric', month: 'short' });

/** "hoy, 6:15 p.m." · "ayer, 6:15 p.m." · "3 oct, 6:15 p.m." */
export function formatSavedAt(savedAt: number, now = Date.now()): string {
  const saved = new Date(savedAt);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startOfSaved = new Date(saved);
  startOfSaved.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - startOfSaved.getTime()) / 86_400_000);
  const prefix = days === 0 ? 'hoy' : days === 1 ? 'ayer' : day.format(saved).replace('.', '');
  return `${prefix}, ${time.format(saved)}`;
}
