// Counts are derived from appointments, never subtracted from the patient record.
// Refreshing, copying a day, or opening a patient therefore cannot deduct twice.
export function hasTreatmentCourse(patient) {
  return Boolean(patient?.treatmentDate) && Number.isInteger(patient?.totalSessions) && patient.totalSessions >= 0;
}

export function canCompleteTreatment(date, time, slot, now = new Date()) {
  const end = new Date(`${date}T${time}:00`).getTime() + (Number(slot.duration) || 30) * 60000;
  return Number.isFinite(end) && end <= now.getTime();
}

export function treatmentUnits(slot) {
  return Math.max(1, Math.ceil((Number(slot.duration) || 30) / 30));
}

// One charge per completed treatment unit; calculate in cents to avoid drift.
export function treatmentFee(price, completed) {
  const amount = Number(price);
  const count = Number(completed);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(count) || count < 0) return 0;
  return Math.round(amount * 100) * count / 100;
}

export function treatmentStatus(date, time, slot, now = new Date()) {
  if (slot.status === 'missed') return 'missed';
  // Ignore premature completion flags saved by older versions as well.
  return canCompleteTreatment(date, time, slot, now) ? 'completed' : 'scheduled';
}

export const statusLabels = { scheduled: '待治疗', completed: '已完成', missed: '未做' };

// Completed treatments can be counted even without a prescribed course limit.
export function treatmentCounts(patientId, schedule, selectedDate, now = new Date()) {
  let completed = 0;
  let dailyCompleted = 0;
  for (const [date, day] of Object.entries(schedule)) {
    for (const [time, slot] of Object.entries(day)) {
      if (slot.patientId !== patientId || !slot.isHead || treatmentStatus(date, time, slot, now) !== 'completed') continue;
      const units = treatmentUnits(slot);
      completed += units;
      if (date === selectedDate) dailyCompleted += units;
    }
  }
  return { completed, dailyCompleted };
}

export function monthlyTreatmentCount(patientId, schedule, selectedDate, now = new Date()) {
  const month = selectedDate.slice(0, 7);
  const monthlySchedule = Object.fromEntries(Object.entries(schedule).filter(([date]) => date.slice(0, 7) === month));
  return treatmentCounts(patientId, monthlySchedule, selectedDate, now).completed;
}

export function treatmentProgress(patient, schedule, now = new Date()) {
  if (!hasTreatmentCourse(patient)) return null;
  let completed = 0;
  let missed = 0;
  for (const [date, day] of Object.entries(schedule)) {
    if (date < patient.treatmentDate) continue;
    for (const [time, slot] of Object.entries(day)) {
      if (!slot.isHead || slot.patientId !== patient.id) continue;
      const status = treatmentStatus(date, time, slot, now);
      if (status === 'completed') completed += treatmentUnits(slot);
      if (status === 'missed') missed += treatmentUnits(slot);
    }
  }
  return { total: patient.totalSessions, completed, missed, remaining: Math.max(0, patient.totalSessions - completed) };
}
