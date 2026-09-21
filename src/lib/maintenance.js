const STEP = {
  weekly: (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7),
  monthly: (d) => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
  yearly: (d) => new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()),
}

export const FREQUENCY_LABELS = {
  weekly: 'Kvar veke',
  monthly: 'Kvar månad',
  yearly: 'Kvart år',
  custom: 'Eigendefinert',
}

export function computeNextDueDate(frequency, fromDateStr) {
  const step = STEP[frequency]
  if (!step) return null
  const from = new Date(fromDateStr)
  return step(from).toISOString().slice(0, 10)
}
