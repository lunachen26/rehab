import { test } from 'node:test';
import assert from 'node:assert/strict';
import { treatmentProgress, treatmentStatus, treatmentCounts, treatmentUnits, canCompleteTreatment } from '../../src/lib/treatments.js';
import { get } from 'svelte/store';
import { patients, schedule, currentDate, copyYesterday, setTreatmentStatus, patientProgress } from '../../src/lib/store.js';

const patient = { id: 'test', treatmentDate: '2026-11-24', totalSessions: 5 };
const head = { patientId: 'test', isHead: true, duration: 30 };
const now = new Date('2026-11-25T12:00:00');

test('30 minutes counts once and 60 minutes counts twice across all treatment totals', () => {
  assert.equal(treatmentUnits(head), 1);
  assert.equal(treatmentUnits({ ...head, duration: 60 }), 2);
  const data = { '2026-11-24': { '09:00': { ...head, duration: 60 }, '09:30': { ...head, duration: 60, isHead: false, headTime: '09:00' } } };
  assert.equal(treatmentProgress(patient, data, now).remaining, 3);
  assert.deepEqual(treatmentCounts('test', data, '2026-11-24', now), { completed: 2, dailyCompleted: 2 });
  data['2026-11-24']['09:00'].status = 'missed';
  assert.equal(treatmentProgress(patient, data, now).remaining, 5);
  assert.equal(treatmentProgress(patient, data, now).missed, 2);
});

test('future and ongoing appointments ignore legacy completed flags', () => {
  const completed = { ...head, duration: 60, status: 'completed' };
  assert.equal(canCompleteTreatment('2026-11-25', '11:30', completed, now), false);
  assert.equal(treatmentStatus('2026-11-25', '11:30', completed, now), 'scheduled');
  assert.equal(treatmentStatus('2026-11-26', '09:00', completed, now), 'scheduled');
  assert.equal(treatmentStatus('2026-11-25', '11:00', completed, now), 'completed');
});

test('store rejects premature completion from both a head and its continuation', () => {
  const data = { '2100-01-01': { '09:00': { ...head, status: 'missed' }, '09:30': { ...head, isHead: false, headTime: '09:00' } } };
  schedule.set(data);
  assert.equal(setTreatmentStatus('2100-01-01', '09:00', 'completed'), false);
  assert.equal(setTreatmentStatus('2100-01-01', '09:30', 'completed'), false);
  assert.deepEqual(get(schedule), data);
});

test('unlimited patients count completed heads daily and in total without counting missed or future bookings', () => {
  const data = {
    '2026-11-24': { '09:00': head },
    '2026-11-25': {
      '09:00': head,
      '09:30': { ...head, isHead: false, headTime: '09:00' },
      '10:00': { ...head, status: 'missed' },
      '13:00': head,
      '08:00': { ...head, patientId: 'other' },
    },
  };
  assert.deepEqual(treatmentCounts('test', data, '2026-11-25', now), { completed: 2, dailyCompleted: 1 });
  assert.deepEqual(treatmentCounts('test', data, '2026-11-26', now), { completed: 2, dailyCompleted: 0 });
});

test('five prescribed sessions minus one completed treatment leaves four', () => {
  const data = { '2026-11-24': { '09:00': head, '09:30': { ...head, isHead: false, headTime: '09:00' } } };
  assert.deepEqual(treatmentProgress(patient, data, now), { total: 5, completed: 1, missed: 0, remaining: 4 });
  assert.equal(treatmentProgress(patient, data, now).remaining, 4, 'repeated reads do not deduct twice');
});

test('future and ongoing bookings do not deduct; exact appointment end does', () => {
  assert.equal(treatmentStatus('2026-11-25', '11:30', { ...head, duration: 60 }, now), 'scheduled');
  assert.equal(treatmentStatus('2026-11-25', '11:00', { ...head, duration: 60 }, now), 'completed');
  assert.equal(treatmentStatus('2026-11-26', '09:00', head, now), 'scheduled');
});

test('missed bookings and other patients are excluded', () => {
  const data = { '2026-11-24': { '09:00': { ...head, status: 'missed' }, '10:00': { ...head, patientId: 'other' } } };
  assert.deepEqual(treatmentProgress(patient, data, now), { total: 5, completed: 0, missed: 1, remaining: 5 });
});

test('completion at the appointment end counts and older courses do not count', () => {
  const data = { '2026-11-23': { '09:00': head }, '2026-11-25': { '11:30': { ...head, status: 'completed' } } };
  assert.equal(treatmentProgress(patient, data, now).remaining, 4);
});

test('missing legacy course remains unmodified and zero never becomes negative', () => {
  assert.equal(treatmentProgress({ id: 'test', frequency: '2025.12.01开了5次' }, {}, now), null);
  assert.equal(treatmentProgress({ ...patient, totalSessions: null }, {}, now), null);
  const data = { '2026-11-24': { '09:00': head, '11:00': head } };
  assert.equal(treatmentProgress({ ...patient, totalSessions: 1 }, data, now).remaining, 0);
});

test('same-day multiple treatments each count once; midnight completion uses end time', () => {
  const data = { '2026-11-24': { '09:00': head, '11:00': head } };
  assert.equal(treatmentProgress(patient, data, now).remaining, 3);
  assert.equal(treatmentStatus('2026-11-24', '23:30', { ...head, duration: 60 }, new Date('2026-11-25T00:00:00')), 'scheduled');
  assert.equal(treatmentStatus('2026-11-24', '23:30', { ...head, duration: 60 }, new Date('2026-11-25T00:30:00')), 'completed');
});

test('marking a continuation missed restores exactly one session and can be reversed', () => {
  patients.set([{ ...patient, treatmentDate: '2000-01-01' }]);
  schedule.set({ '2000-01-01': { '09:00': head, '09:30': { ...head, isHead: false, headTime: '09:00' } } });
  assert.equal(get(patientProgress).test.remaining, 4);
  setTreatmentStatus('2000-01-01', '09:30', 'missed');
  assert.equal(get(patientProgress).test.remaining, 5);
  assert.equal(get(schedule)['2000-01-01']['09:00'].status, 'missed');
  setTreatmentStatus('2000-01-01', '09:00', 'scheduled');
  assert.equal(get(patientProgress).test.remaining, 4);
});

test('copy yesterday resets completed and missed statuses without changing the source', () => {
  currentDate.set('2026-11-25');
  schedule.set({ '2026-11-24': { '09:00': { ...head, status: 'completed' }, '11:00': { ...head, status: 'missed' } } });
  copyYesterday();
  const data = get(schedule);
  assert.equal(data['2026-11-25']['09:00'].status, undefined);
  assert.equal(data['2026-11-25']['11:00'].status, undefined);
  assert.equal(data['2026-11-24']['09:00'].status, 'completed');
  assert.equal(data['2026-11-24']['11:00'].status, 'missed');
});

test('deleting a treatment restores a session on the next calculation', () => {
  const data = { '2026-11-24': { '09:00': head } };
  assert.equal(treatmentProgress(patient, data, now).remaining, 4);
  delete data['2026-11-24']['09:00'];
  assert.equal(treatmentProgress(patient, data, now).remaining, 5);
});
