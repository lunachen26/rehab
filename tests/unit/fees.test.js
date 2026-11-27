import { test } from 'node:test';
import assert from 'node:assert/strict';
import { treatmentCounts, treatmentFee } from '../../src/lib/treatments.js';

test('inpatient and outpatient fees follow lifetime completed units, excluding missed, future and continuation slots', () => {
  for (const category of ['Inpatient', 'Outpatient']) {
    const patient = { id: category, category, price: 80.25 };
    const slot = { patientId: patient.id, isHead: true, duration: 30 };
    const schedule = {
      '2026-11-24': {
        '09:00': slot,
        '10:00': { ...slot, duration: 60 },
        '10:30': { ...slot, isHead: false, headTime: '10:00' },
        '11:00': { ...slot, status: 'missed' }
      },
      '2026-11-26': { '09:00': { ...slot, status: 'completed' } }
    };
    const now = new Date('2026-11-25T12:00:00');
    assert.equal(treatmentFee(patient.price, treatmentCounts(patient.id, schedule, '2026-11-25', now).completed), 240.75);
    schedule['2026-11-24']['10:00'].status = 'missed';
    assert.equal(treatmentFee(patient.price, treatmentCounts(patient.id, schedule, '2026-11-24', now).completed), 80.25);
  }
});

test('fees keep cent precision and handle empty or invalid imported prices', () => {
  assert.equal(treatmentFee(0.1, 3), 0.3);
  assert.equal(treatmentFee('25.50', 2), 51);
  assert.equal(treatmentFee(50, 0), 0);
  for (const price of [undefined, '', 'invalid', -1, Infinity]) assert.equal(treatmentFee(price, 3), 0);
});
