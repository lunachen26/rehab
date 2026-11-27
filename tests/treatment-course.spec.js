import { test, expect } from '@playwright/test';

const patient = { id: 'course-test', name: '次数测试患者', type: '术后康复', contact: '13800000000', duration: 60, color: 'bg-blue-500', price: 100, treatmentDate: '2026-11-24', totalSessions: 5, notes: '周二请假需核对' };
const slot = { patientId: patient.id, isHead: true, duration: 60 };

async function seed(page, data = patient, appointments = {}) {
  await page.clock.install({ time: new Date('2026-11-25T12:00:00') });
  await page.addInitScript(({ data, appointments }) => {
    if (!localStorage.getItem('test-seeded')) {
      localStorage.setItem('rehab_patients_v3', JSON.stringify([data]));
      localStorage.setItem('rehab_schedule_v2', JSON.stringify(appointments));
      localStorage.setItem('test-seeded', 'yes');
    }
  }, { data, appointments });
  await page.goto('/');
}

const chip = page => page.locator('button').filter({ has: page.locator('[aria-label="编辑 次数测试患者"]') });
const row = (page, time) => page.locator('div.group').filter({ has: page.getByText(time, { exact: true }) });

test('completion stays disabled before the appointment ends and ignores older premature flags', async ({ page }) => {
  await seed(page, patient, { '2026-11-25': { '13:00': { ...slot, status: 'completed' } } });
  await expect(chip(page)).toContainText('剩余 5 次');
  await row(page, '13:00').getByRole('button').click();
  await expect(page.getByText('治疗状态：待治疗')).toBeVisible();
  await expect(page.getByRole('button', { name: '标记已完成', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '标记未做（不扣次）', exact: true }).click();
  await row(page, '13:00').getByRole('button').click();
  await page.clock.fastForward(91 * 60000);
  await expect(page.getByRole('button', { name: '标记已完成', exact: true })).toBeDisabled();
  await page.clock.fastForward(30 * 60000);
  await expect(page.getByRole('button', { name: '标记已完成', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '标记已完成', exact: true }).click();
  await expect(chip(page)).toContainText('剩余 3 次');
  await expect(chip(page)).toContainText('累计已做 2 次');
});

test('inpatient can save a date without a total and still gets automatic daily and lifetime counts', async ({ page }) => {
  const { totalSessions, ...inpatient } = patient;
  await seed(page, { ...inpatient, category: 'Inpatient' }, {
    '2026-11-24': { '09:00': slot },
    '2026-11-25': { '09:00': slot, '09:30': { ...slot, isHead: false, headTime: '09:00' }, '10:00': { ...slot, status: 'missed' }, '13:00': slot },
  });
  await expect(chip(page)).toContainText('累计已做 4 次');
  await expect(chip(page)).not.toContainText('剩余');
  await page.getByLabel('编辑 次数测试患者', { exact: true }).click();
  await expect(page.getByLabel('次数', { exact: true })).toHaveValue('');
  await expect(page.getByRole('dialog').getByText('累计已做 4 次', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(chip(page)).toContainText('累计已做 4 次');
  await page.getByRole('button', { name: '前一天', exact: true }).click();
  await expect(chip(page)).toContainText('累计已做 4 次');
  await row(page, '09:00').getByRole('button').click();
  await page.getByRole('button', { name: '标记未做（不扣次）', exact: true }).click();
  await expect(chip(page)).toContainText('累计已做 2 次');
});

test('switching a new patient to inpatient allows leaving sessions blank', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: '添加患者', exact: true }).click();
  await page.getByLabel('姓名', { exact: true }).fill('新住院患者');
  await page.getByLabel('日期', { exact: true }).fill('2026-11-25');
  await page.getByRole('radio', { name: '住院', exact: true }).check();
  await expect(page.getByPlaceholder('住院可不填')).toBeVisible();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('button').filter({ has: page.locator('[aria-label="编辑 新住院患者"]') })).toContainText('累计已做 0 次');
});

test('shows three remaining after yesterday, marks missed and persists after refresh', async ({ page }) => {
  await seed(page, patient, { '2026-11-24': { '09:00': slot, '09:30': { ...slot, isHead: false, headTime: '09:00' } } });
  await expect(chip(page)).toContainText('剩余 3 次');
  await page.getByRole('button', { name: '前一天', exact: true }).click();
  await row(page, '09:00').getByRole('button').click();
  await page.getByRole('button', { name: '标记未做（不扣次）', exact: true }).click();
  await expect(chip(page)).toContainText('剩余 5 次');
  await page.reload();
  await expect(chip(page)).toContainText('剩余 5 次');
  await page.getByRole('button', { name: '前一天', exact: true }).click();
  await row(page, '09:00').getByRole('button').click();
  await expect(page.getByText('治疗状态：未做')).toBeVisible();
  await page.getByRole('button', { name: '标记已完成', exact: true }).click();
  await expect(chip(page)).toContainText('剩余 3 次');
});

test('form has requested order, separates notes and keeps total while showing remainder', async ({ page }) => {
  await seed(page, patient, { '2026-11-24': { '09:00': slot } });
  await page.getByLabel('编辑 次数测试患者', { exact: true }).click();
  const dialog = page.getByRole('dialog');
  const labels = await dialog.locator('label[for]').allTextContents();
  expect(labels.slice(0, 6)).toEqual(['姓名', '联系方式', '诊断', '日期', '次数', '备注']);
  await expect(page.getByLabel('次数', { exact: true })).toHaveValue('5');
  await expect(dialog.getByText('剩余 3 次', { exact: true })).toBeVisible();
  await page.getByLabel('备注', { exact: true }).fill('11月24日已做，之后按计划治疗');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.reload();
  await page.getByLabel('编辑 次数测试患者', { exact: true }).click();
  await expect(page.getByLabel('诊断', { exact: true })).toHaveValue('术后康复');
  await expect(page.getByLabel('备注', { exact: true })).toHaveValue('11月24日已做，之后按计划治疗');
  await expect(dialog.getByText('剩余 3 次', { exact: true })).toBeVisible();
});

test('automatically deducts only after appointment ends while page stays open', async ({ page }) => {
  await seed(page, patient, { '2026-11-25': { '12:00': slot, '12:30': { ...slot, isHead: false, headTime: '12:00' } } });
  await expect(chip(page)).toContainText('剩余 5 次');
  await page.clock.fastForward(61 * 60000);
  await expect(chip(page)).toContainText('剩余 3 次');
  await expect(row(page, '12:00')).toContainText('已完成');
});

test('legacy text survives editing and new course fields enable automatic counting', async ({ page }) => {
  const { treatmentDate, totalSessions, notes, ...legacy } = patient;
  await seed(page, { ...legacy, frequency: '2026.11.24开了5次' }, { '2026-11-24': { '09:00': slot } });
  await page.getByLabel('编辑 次数测试患者', { exact: true }).click();
  await expect(page.getByText(/原日期\/次数：2026.11.24开了5次/)).toBeVisible();
  await page.getByLabel('备注', { exact: true }).fill('原诊断保留');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(chip(page)).not.toContainText('剩余');
  await page.getByLabel('编辑 次数测试患者', { exact: true }).click();
  await page.getByLabel('日期', { exact: true }).fill('2026-11-24');
  await page.getByLabel('次数', { exact: true }).fill('5');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(chip(page)).toContainText('剩余 3 次');
});

test('history and workload exclude missed and future bookings consistently', async ({ page }) => {
  await seed(page, patient, {
    '2026-11-24': { '09:00': slot, '11:00': { ...slot, status: 'missed' } },
    '2026-11-25': { '13:00': slot },
  });
  await page.getByLabel('打开菜单', { exact: true }).click();
  await page.getByRole('button', { name: '患者统计', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /次数测试患者/ }).click();
  const history = page.getByRole('dialog');
  await expect(history.getByText('本疗程剩余 3 次 / 共 5 次（未做 2 次）')).toBeVisible();
  await expect(history.locator('.stat').filter({ hasText: '已完成治疗' }).locator('.stat-value')).toHaveText('2');
  await expect(history.getByText('未做', { exact: true })).toBeVisible();
  await expect(history.getByText('待治疗', { exact: true })).toBeVisible();
  await history.getByRole('button', { name: '✕', exact: true }).click();
  await page.getByLabel('打开菜单', { exact: true }).click();
  await page.getByRole('button', { name: '工作量统计', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('共 1 人次 · 2 次治疗')).toBeVisible();
  await expect(page.getByRole('dialog').locator('.stat-value')).toHaveText('¥100');
});

test('mobile form rejects incomplete courses and preserves the entered fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.getByRole('button', { name: '添加患者', exact: true }).click();
  await page.getByLabel('姓名', { exact: true }).fill('新患者');
  await page.getByLabel('次数', { exact: true }).fill('5');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText('门诊患者必须填写日期和次数')).toBeVisible();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('新患者');
  await page.getByLabel('日期', { exact: true }).fill('2026-11-25');
  await page.getByLabel('备注', { exact: true }).fill('首次开具5次');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('button').filter({ has: page.locator('[aria-label="编辑 新患者"]') })).toContainText('剩余 5 次');
});

test('outpatient requires sessions even when both course fields are empty or switched from inpatient', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: '添加患者', exact: true }).click();
  await page.getByLabel('姓名', { exact: true }).fill('门诊必填测试');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText('门诊患者必须填写日期和次数')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: '住院', exact: true }).check();
  await expect(page.getByLabel('次数', { exact: true })).not.toHaveAttribute('required');
  await page.getByRole('radio', { name: '门诊', exact: true }).check();
  await expect(page.getByLabel('次数', { exact: true })).toHaveAttribute('required', '');
  await page.getByLabel('日期', { exact: true }).fill('2026-11-25');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('次数', { exact: true }).fill('5');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
